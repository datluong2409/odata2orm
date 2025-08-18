/**
 * Fallback parser for special OData cases including nested paths and collection expressions
 */

import { ConversionOptions, PrismaWhereClause } from '../types';
import { buildNestedWhere } from './field-path';

/**
 * Fallback parser for special cases
 */
export function fallbackParser(filterString: string, options: ConversionOptions = {}): PrismaWhereClause {
  // Handle collection expressions (any/all)
  const collectionPattern = /(\w+(?:\/\w+)*)\/(any|all)\((\w+):\s*(.+)\)/i;
  const collectionMatch = collectionPattern.exec(filterString);
  if (collectionMatch) {
    const [, pathStr, type, variable, condition] = collectionMatch;
    
    // Parse the condition recursively (simple case for now)
    const conditionWhere = parseSimpleCondition(condition.replace(new RegExp(`\\b${variable}\\/`, 'g'), ''));
    
    const path = pathStr.split('/');
    return buildNestedWhere(path, {
      [type === 'any' ? 'some' : 'every']: conditionWhere
    });
  }

  // Handle nested field paths
  const nestedFieldPattern = /(\w+(?:\/\w+)+)\s+(eq|ne|gt|ge|lt|le)\s+(.+)/i;
  const nestedMatch = nestedFieldPattern.exec(filterString);
  if (nestedMatch) {
    const [, fieldPath, comparison, valueStr] = nestedMatch;
    
    const value = parseValue(valueStr);
    const path = fieldPath.split('/');
    
    const prismaOp = {
      'eq': 'equals',
      'ne': 'not',
      'gt': 'gt',
      'ge': 'gte',
      'lt': 'lt',
      'le': 'lte'
    }[comparison];
    
    if (!prismaOp) {
      throw new Error(`Unsupported comparison operator: ${comparison}`);
    }
    
    return buildNestedWhere(path, { [prismaOp]: value });
  }

  // Handle arithmetic expressions
  const arithmeticPattern = /(\w+)\s*([*\/+-])\s*([\d.]+)\s+(eq|ne|gt|ge|lt|le)\s+([\d.]+)/i;
  const arithmeticMatch = arithmeticPattern.exec(filterString);
  if (arithmeticMatch) {
    const [, field, operator, operand, comparison, target] = arithmeticMatch;
    const operandNum = parseFloat(operand);
    const targetNum = parseFloat(target);
    
    let resultValue: number;
    switch (operator) {
      case '*':
        resultValue = targetNum / operandNum; // Price * 1.1 gt 100 => Price gt 90.91
        break;
      case '/':
        resultValue = targetNum * operandNum; // Total / 2 eq 50 => Total eq 100
        break;
      case '+':
        resultValue = targetNum - operandNum; // Quantity + 5 le 20 => Quantity le 15
        break;
      case '-':
        resultValue = targetNum + operandNum; // Quantity - 5 ge 10 => Quantity ge 15
        break;
      default:
        throw new Error(`Unsupported arithmetic operator: ${operator}`);
    }
    
    const prismaOp = {
      'eq': 'equals',
      'ne': 'not',
      'gt': 'gt',
      'ge': 'gte',
      'lt': 'lt',
      'le': 'lte'
    }[comparison];
    
    if (!prismaOp) {
      throw new Error(`Unsupported comparison operator: ${comparison}`);
    }
    
    return { [field]: { [prismaOp as string]: Math.round(resultValue * 100) / 100 } };
  }
  
  // Handle datetime literals that might not be properly quoted
  const datetimePattern = /(datetime)'([^']+)'/gi;
  let processed = filterString.replace(datetimePattern, "'$2'");
  
  // Handle IN operations manually
  const inPattern = /(\w+)\s+in\s*\(([^)]+)\)/gi;
  const inMatch = inPattern.exec(filterString);
  if (inMatch) {
    const [, field, values] = inMatch;
    const valueList = values.split(',').map(v => {
      const trimmed = v.trim();
      // Try to parse as number, otherwise keep as string
      const num = Number(trimmed);
      return isNaN(num) ? trimmed.replace(/['"]/g, '') : num;
    });
    return { [field]: { in: valueList } };
  }
  
  throw new Error('Fallback parsing failed');
}

/**
 * Parse simple condition for collection expressions
 */
function parseSimpleCondition(condition: string): PrismaWhereClause {
  const pattern = /(\w+)\s+(eq|ne|gt|ge|lt|le)\s+(.+)/i;
  const match = pattern.exec(condition);
  
  if (!match) {
    throw new Error(`Cannot parse condition: ${condition}`);
  }
  
  const [, field, comparison, valueStr] = match;
  const value = parseValue(valueStr);
  
  const prismaOp = {
    'eq': 'equals',
    'ne': 'not',
    'gt': 'gt',
    'ge': 'gte',
    'lt': 'lt',
    'le': 'lte'
  }[comparison];
  
  if (!prismaOp) {
    throw new Error(`Unsupported comparison operator: ${comparison}`);
  }
  
  return { [field]: { [prismaOp]: value } };
}

/**
 * Parse value from string
 */
function parseValue(valueStr: string): any {
  const trimmed = valueStr.trim();
  
  // String literal
  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1);
  }
  
  // Boolean
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  
  // Null
  if (trimmed === 'null') return null;
  
  // Number
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return parseFloat(trimmed);
  }
  
  // Default to string
  return trimmed;
}
