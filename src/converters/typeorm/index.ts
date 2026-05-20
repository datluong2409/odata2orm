/**
 * Main OData → TypeORM converter.
 */

import { ConversionOptions, ODataNode, ComparisonNode } from '../../types';
import { preprocessODataFilter } from '../../utils/helpers';
import { NodeType } from '../../enums';
import { handleComparison } from './comparison';
import { handleMethod, handleInExpression } from './methods';
import { tryHandleYearMonth, tryHandleDateRange, tryHandleYear } from './date';
import { andWhere, orWhere, notWhere, optimizeOrToIn, TypeOrmWhere } from './logical';

// eslint-disable-next-line @typescript-eslint/no-var-requires
import * as odataParser from 'odata-v4-parser';

export function convertToTypeOrmWhere(
  odataFilterString: string,
  options: ConversionOptions = {}
): TypeOrmWhere {
  if (!odataFilterString || typeof odataFilterString !== 'string') {
    return {};
  }

  try {
    const preprocessed = preprocessODataFilter(odataFilterString);
    const ast = odataParser.filter(preprocessed);
    return optimizeOrToIn(convertNode(ast, options));
  } catch (error) {
    throw new Error(`Failed to parse OData filter: ${(error as Error).message}`);
  }
}

export function convertNode(node: ODataNode, options: ConversionOptions = {}): TypeOrmWhere {
  if (!node || !node.type) {
    throw new Error('Invalid AST node');
  }

  switch (node.type) {
    case NodeType.EQUALS_EXPRESSION:
    case NodeType.NOT_EQUALS_EXPRESSION:
    case NodeType.GREATER_THAN_EXPRESSION:
    case NodeType.GREATER_OR_EQUALS_EXPRESSION:
    case NodeType.LESSER_THAN_EXPRESSION:
    case NodeType.LESSER_OR_EQUALS_EXPRESSION: {
      const yearResult = tryHandleYear(node);
      if (yearResult) return yearResult;
      return handleComparison(node as ComparisonNode, options);
    }

    case NodeType.AND_EXPRESSION: {
      const left = node.value.left;
      const right = node.value.right;

      const yearMonth = tryHandleYearMonth(left, right) || tryHandleYearMonth(right, left);
      if (yearMonth) return yearMonth;

      const dateRange = tryHandleDateRange(left, right) || tryHandleDateRange(right, left);
      if (dateRange) return dateRange;

      return andWhere(convertNode(left, options), convertNode(right, options));
    }

    case NodeType.OR_EXPRESSION:
      return orWhere(convertNode(node.value.left, options), convertNode(node.value.right, options));

    case NodeType.NOT_EXPRESSION:
      return notWhere(convertNode(node.value, options));

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
