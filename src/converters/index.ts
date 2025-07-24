/**
 * Main OData to Prisma converter
 */

import { ConversionOptions, PrismaWhereClause, ODataNode, ComparisonNode } from '../types';
import { preprocessODataFilter } from '../utils/helpers';
import { optimizeOrToIn } from '../utils/optimizer';
import { fallbackParser } from '../utils/fallback';
import { handleComparison } from './comparison';
import { handleMethod, handleInExpression } from './methods';
import { tryHandleYearMonth, tryHandleDateRange } from './date';
import { NodeType } from '../enums';

// Import the odata-v4-parser
import * as odataParser from 'odata-v4-parser';

/**
 * Convert OData filter string to Prisma where
 * @param odataFilterString - OData filter string
 * @param options - Conversion options
 * @returns Prisma where clause
 */
export function convert(odataFilterString: string, options: ConversionOptions = {}): PrismaWhereClause {
  if (!odataFilterString || typeof odataFilterString !== 'string') {
    return {};
  }
  
  try {
    // Pre-process the filter string
    const preprocessed = preprocessODataFilter(odataFilterString);
    const ast = odataParser.filter(preprocessed);
    const result = convertNode(ast, options);
    
    // Post-process to optimize OR conditions into IN operations
    return optimizeOrToIn(result);
  } catch (error) {
    // If parsing fails, try fallback parsing for special cases
    try {
      return fallbackParser(odataFilterString, options);
    } catch (fallbackError) {
      throw new Error(`Failed to parse OData filter: ${(error as Error).message}`);
    }
  }
}

/**
 * Recursively convert AST node to Prisma filter
 */
export function convertNode(node: ODataNode, options: ConversionOptions = {}): PrismaWhereClause {
  if (!node || !node.type) {
    throw new Error('Invalid AST node');
  }

  switch (node.type) {
    case NodeType.EQUALS_EXPRESSION:
    case NodeType.NOT_EQUALS_EXPRESSION:
    case NodeType.GREATER_THAN_EXPRESSION:
    case NodeType.GREATER_OR_EQUALS_EXPRESSION:
    case NodeType.LESSER_THAN_EXPRESSION:
    case NodeType.LESSER_OR_EQUALS_EXPRESSION:
      return handleComparison(node as ComparisonNode, options);

    case NodeType.AND_EXPRESSION: {
      const left = node.value.left;
      const right = node.value.right;
      
      // Handle special case: year + month
      const yearMonth = tryHandleYearMonth(left, right) || tryHandleYearMonth(right, left);
      if (yearMonth) return yearMonth;
      
      // Handle special case: date range
      const dateRange = tryHandleDateRange(left, right) || tryHandleDateRange(right, left);
      if (dateRange) return dateRange;
      
      return { AND: [convertNode(left, options), convertNode(right, options)] };
    }

    case NodeType.OR_EXPRESSION:
      return { OR: [convertNode(node.value.left, options), convertNode(node.value.right, options)] };

    case NodeType.NOT_EXPRESSION:
      return { NOT: convertNode(node.value, options) };

    case NodeType.METHOD_CALL_EXPRESSION:
    case NodeType.COMMON_EXPRESSION:
      return handleMethod(node, options);

    case NodeType.PAREN_EXPRESSION:
    case NodeType.BOOL_PAREN_EXPRESSION:
      return convertNode(node.value, options);

    case NodeType.IN_EXPRESSION:
      return handleInExpression(node, options);

    default:
      throw new Error(`Unsupported AST node type: ${node.type}`);
  }
}
