/**
 * Method call handlers
 */

import { ODataNode, MethodCallNode, ConversionOptions, PrismaWhereClause } from '../types';
import { getFieldName, getLiteralValue } from '../utils/helpers';
import { NodeType, ODataMethod, PrismaStringMode } from '../enums';

/**
 * Handle MethodCallExpression
 */
export function handleMethod(node: ODataNode, options: ConversionOptions = {}): PrismaWhereClause {
  let expr = node;
  if (expr.type === NodeType.COMMON_EXPRESSION || 
      expr.type === NodeType.PAREN_EXPRESSION || 
      expr.type === NodeType.BOOL_PAREN_EXPRESSION) {
    expr = expr.value;
  }
  
  if (expr.type !== NodeType.METHOD_CALL_EXPRESSION) {
    throw new Error(`Expected MethodCallExpression, got: ${expr.type}`);
  }
  
  const { method, parameters } = expr.value;
  
  switch (method) {
    case ODataMethod.CONTAINS: {
      const [fieldNode, searchNode] = parameters;
      const field = getFieldName(fieldNode);
      const searchValue = getLiteralValue(searchNode);
      const filter: any = { contains: searchValue };
      
      if (options.caseSensitive !== undefined && !options.caseSensitive) {
        filter.mode = PrismaStringMode.INSENSITIVE;
      }
      
      return { [field]: filter };
    }
    
    case ODataMethod.SUBSTRING_OF: {
      const [substrNode, fieldNode] = parameters;
      const field = getFieldName(fieldNode);
      const searchValue = getLiteralValue(substrNode);
      const filter: any = { contains: searchValue };
      
      if (options.caseSensitive !== undefined && !options.caseSensitive) {
        filter.mode = PrismaStringMode.INSENSITIVE;
      }
      
      return { [field]: filter };
    }
    
    case ODataMethod.STARTS_WITH: {
      let [fieldNode, prefixNode] = parameters;
      let insensitive = false;
      
      // Handle tolower wrapper
      if (fieldNode.type === NodeType.METHOD_CALL_EXPRESSION && 
          fieldNode.value.method === ODataMethod.TO_LOWER) {
        insensitive = true;
        fieldNode = fieldNode.value.parameters[0];
      } else if (options.caseSensitive !== undefined && !options.caseSensitive) {
        insensitive = true;
      }
      
      const field = getFieldName(fieldNode);
      const prefix = getLiteralValue(prefixNode);
      const filter: any = { startsWith: prefix };
      
      if (insensitive) filter.mode = PrismaStringMode.INSENSITIVE;
      return { [field]: filter };
    }
    
    case ODataMethod.ENDS_WITH: {
      let [fieldNode, suffixNode] = parameters;
      let insensitive = false;
      
      // Handle tolower wrapper
      if (fieldNode.type === NodeType.METHOD_CALL_EXPRESSION && 
          fieldNode.value.method === ODataMethod.TO_LOWER) {
        insensitive = true;
        fieldNode = fieldNode.value.parameters[0];
      } else if (options.caseSensitive !== undefined && !options.caseSensitive) {
        insensitive = true;
      }
      
      const field = getFieldName(fieldNode);
      const suffix = getLiteralValue(suffixNode);
      const filter: any = { endsWith: suffix };
      
      if (insensitive) filter.mode = PrismaStringMode.INSENSITIVE;
      return { [field]: filter };
    }
    
    case ODataMethod.INDEX_OF: {
      const [fieldNode, searchNode] = parameters;
      const field = getFieldName(fieldNode);
      const searchValue = getLiteralValue(searchNode);
      // indexof returns >= 0 if found, -1 if not
      // When used with >= 0, it means "contains"
      const filter: any = { contains: searchValue };
      
      if (options.caseSensitive !== undefined && !options.caseSensitive) {
        filter.mode = PrismaStringMode.INSENSITIVE;
      }
      
      return { [field]: filter };
    }
    
    case ODataMethod.TO_LOWER:
    case ODataMethod.TO_UPPER:
    case ODataMethod.TRIM:
      // These functions are usually used in other contexts
      // We'll need to handle this in the main converter to avoid circular dependency
      throw new Error('String transformation functions should be handled in comparison context');
      
    case ODataMethod.CONCAT: {
      // concat is usually used in comparison context, not standalone
      throw new Error('concat function should be used in comparison context');
    }
    
    default:
      throw new Error(`Unsupported method: ${method}`);
  }
}

/**
 * Handle IN expression
 */
export function handleInExpression(node: ODataNode, options: ConversionOptions): PrismaWhereClause {
  const field = getFieldName(node.value.left);
  const values = node.value.right.value.items.map((item: ODataNode) => getLiteralValue(item));
  return { [field]: { in: values } };
}
