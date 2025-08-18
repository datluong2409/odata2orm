/**
 * Utility functions for OData to Prisma conversion
 */

import { ODataNode, ComparisonType } from '../types';
import { NodeType, ODataMethod, ComparisonSymbol, LiteralType } from '../enums';

/**
 * Get field name from AST - with support for nested method calls and navigation paths
 */
export function getFieldName(expr: ODataNode): string {
  if (!expr || !expr.type) {
    throw new Error('Invalid field expression');
  }
  
  switch (expr.type) {
    case NodeType.FIRST_MEMBER_EXPRESSION:
    case NodeType.MEMBER_EXPRESSION:
    case NodeType.PROPERTY_PATH_EXPRESSION:
      // Handle nested navigation paths
      if (expr.value && expr.value.current) {
        const path: string[] = [];
        let current = expr.value.current;
        while (current) {
          if (current.type === NodeType.ODATA_IDENTIFIER) {
            path.unshift(current.value.name);
          } else if (current.value && current.value.name) {
            path.unshift(current.value.name);
          }
          current = current.value ? current.value.next : null;
        }
        return path.join('/');
      }
      return getFieldName(expr.value);
    case NodeType.ODATA_IDENTIFIER:
      return expr.value.name;
    case NodeType.METHOD_CALL_EXPRESSION:
      // For nested method calls like tolower(Name), extract the inner field
      if (expr.value.method === ODataMethod.TO_LOWER || 
          expr.value.method === ODataMethod.TO_UPPER || 
          expr.value.method === ODataMethod.TRIM) {
        return getFieldName(expr.value.parameters[0]);
      }
      throw new Error(`Cannot extract field name from method: ${expr.value.method}`);
    default:
      throw new Error(`Unsupported field expression type: ${expr.type}`);
  }
}

/**
 * Convert OData Literal to JS value
 */
export function getLiteralValue(literalNode: ODataNode): any {
  if (!literalNode || !literalNode.raw) {
    return null;
  }
  
  const raw = literalNode.raw;
  
  // String literals
  if (raw.startsWith("'") && raw.endsWith("'")) {
    return raw.slice(1, -1);
  }
  
  // Boolean literals
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  
  // Null literal
  if (raw === 'null') return null;
  
  // Date literals - improved parsing
  if (raw.startsWith('datetime')) {
    const dateStr = raw.replace(/datetime'(.+)'/, '$1');
    return new Date(dateStr);
  }
  
  // Alternative date format
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(raw)) {
    return new Date(raw);
  }
  
  // GUID literals
  if (raw.startsWith('guid')) {
    return raw.replace(/guid'(.+)'/, '$1');
  }
  
  // Numeric literals
  if (raw.includes('.')) {
    return parseFloat(raw);
  }
  
  const intValue = parseInt(raw, 10);
  if (!isNaN(intValue)) {
    return intValue;
  }
  
  // Fallback
  return raw;
}

/**
 * Get comparison symbol for error messages
 */
export function getComparisonSymbol(type: ComparisonType): string {
  const symbols: Record<ComparisonType, string> = {
    [NodeType.EQUALS_EXPRESSION]: ComparisonSymbol.EQUALS,
    [NodeType.NOT_EQUALS_EXPRESSION]: ComparisonSymbol.NOT_EQUALS,
    [NodeType.GREATER_THAN_EXPRESSION]: ComparisonSymbol.GREATER_THAN,
    [NodeType.GREATER_OR_EQUALS_EXPRESSION]: ComparisonSymbol.GREATER_OR_EQUALS,
    [NodeType.LESSER_THAN_EXPRESSION]: ComparisonSymbol.LESSER_THAN,
    [NodeType.LESSER_OR_EQUALS_EXPRESSION]: ComparisonSymbol.LESSER_OR_EQUALS
  };
  return symbols[type] || '?';
}

/**
 * Pre-process OData filter to handle unsupported syntax
 */
export function preprocessODataFilter(filterString: string): string {
  // Handle datetime literals: datetime'2023-01-01' -> '2023-01-01T00:00:00.000Z'
  let processed = filterString.replace(/datetime'([^']+)'/gi, (match, dateStr) => {
    try {
      const date = new Date(dateStr);
      return `'${date.toISOString()}'`;
    } catch {
      return match; // Return original if parsing fails
    }
  });
  
  // Handle IN operator more carefully to preserve proper grouping
  const inPattern = /(\w+)\s+in\s*\(([^)]+)\)/gi;
  processed = processed.replace(inPattern, (match, field, values) => {
    const valueList = values.split(',').map((v: string) => v.trim());
    // Instead of chaining ORs, try to preserve IN structure when possible
    if (valueList.length === 1) {
      return `${field} eq ${valueList[0]}`;
    } else if (valueList.length === 2) {
      return `(${field} eq ${valueList[0]} or ${field} eq ${valueList[1]})`;
    } else {
      // For 3+ values, create a structure that can be optimized
      const conditions = valueList.map((val: string) => `${field} eq ${val}`);
      return `(${conditions.join(' or ')})`;
    }
  });
  
  return processed;
}
