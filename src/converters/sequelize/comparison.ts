/**
 * Comparison handlers for Sequelize.
 */

import {
  ODataNode,
  ComparisonNode,
  ConversionOptions,
  ComparisonType,
  ArithmeticOperator,
} from '../../types';
import { getFieldName, getLiteralValue, getComparisonSymbol } from '../../utils/helpers';
import { extractFieldPath, normalizeFieldPath } from '../../utils/field-path';
import { NodeType, ODataMethod } from '../../enums';
import { getSequelizeOps } from './operators';
import { SequelizeWhere } from './logical';

type OperatorSymbol = symbol | string;

function comparisonOperatorSym(type: ComparisonType): OperatorSymbol {
  const ops = getSequelizeOps();
  switch (type) {
    case NodeType.EQUALS_EXPRESSION:
      return ops.eq;
    case NodeType.NOT_EQUALS_EXPRESSION:
      return ops.ne;
    case NodeType.GREATER_THAN_EXPRESSION:
      return ops.gt;
    case NodeType.GREATER_OR_EQUALS_EXPRESSION:
      return ops.gte;
    case NodeType.LESSER_THAN_EXPRESSION:
      return ops.lt;
    case NodeType.LESSER_OR_EQUALS_EXPRESSION:
      return ops.lte;
    default:
      throw new Error(`Unsupported comparison operator: ${type}`);
  }
}

/**
 * Resolve nested path → dot-notation key Sequelize can reference as a literal column
 * (use with `include` / `$assoc.col$` semantics if needed). For a single segment, returns just the name.
 */
function pathToKey(path: string[]): string {
  return path.length === 1 ? path[0] : path.join('.');
}

function handleNullComparison(key: string, type: ComparisonType): SequelizeWhere {
  const { is, not } = getSequelizeOps();
  if (type === NodeType.EQUALS_EXPRESSION) {
    return { [key]: { [is]: null } };
  }
  if (type === NodeType.NOT_EQUALS_EXPRESSION) {
    return { [key]: { [not]: null } };
  }
  throw new Error(`Cannot use ${type} with null literal`);
}

export function handleComparison(node: ComparisonNode, options: ConversionOptions = {}): SequelizeWhere {
  let { left, right } = node.value;

  if (left.type === NodeType.PAREN_EXPRESSION || left.type === NodeType.BOOL_PAREN_EXPRESSION) {
    left = left.value;
  }

  if (
    left.type === NodeType.MUL_EXPRESSION ||
    left.type === NodeType.DIV_EXPRESSION ||
    left.type === NodeType.ADD_EXPRESSION ||
    left.type === NodeType.SUB_EXPRESSION
  ) {
    return handleArithmeticComparison(node, left, right, options);
  }

  if (left.type === NodeType.METHOD_CALL_EXPRESSION) {
    return handleFunctionComparison(node, left, right, options);
  }

  const fieldPath = extractFieldPath(left);
  const normalizedPath = normalizeFieldPath(fieldPath, options);
  const path = normalizedPath.length > 0 ? normalizedPath : [getFieldName(left)];
  const key = pathToKey(path);
  const value = getLiteralValue(right);

  if (value === null) {
    return handleNullComparison(key, node.type as ComparisonType);
  }

  const opSym = comparisonOperatorSym(node.type as ComparisonType);
  return { [key]: { [opSym]: value } };
}

export function handleArithmeticComparison(
  node: ComparisonNode,
  left: ODataNode,
  right: ODataNode,
  _options: ConversionOptions
): SequelizeWhere {
  const field = getFieldName(left.value.left);
  const operand = getLiteralValue(left.value.right);
  const threshold = getLiteralValue(right);

  let adjusted: number;
  switch (left.type as ArithmeticOperator) {
    case NodeType.MUL_EXPRESSION:
      adjusted = threshold / operand;
      break;
    case NodeType.DIV_EXPRESSION:
      adjusted = threshold * operand;
      break;
    case NodeType.ADD_EXPRESSION:
      adjusted = threshold - operand;
      break;
    case NodeType.SUB_EXPRESSION:
      adjusted = threshold + operand;
      break;
    default:
      throw new Error(`Unsupported arithmetic operation: ${left.type}`);
  }

  const opSym = comparisonOperatorSym(node.type as ComparisonType);
  return { [field]: { [opSym]: adjusted } };
}

export function handleFunctionComparison(
  node: ComparisonNode,
  left: ODataNode,
  right: ODataNode,
  options: ConversionOptions
): SequelizeWhere {
  const ops = getSequelizeOps();
  const { method, parameters } = left.value;

  switch (method) {
    case ODataMethod.YEAR:
      if (node.type === NodeType.EQUALS_EXPRESSION) {
        const field = getFieldName(parameters[0]);
        const year = getLiteralValue(right);
        const start = new Date(Date.UTC(year, 0, 1));
        const end = new Date(Date.UTC(year + 1, 0, 1));
        return { [field]: { [ops.gte]: start, [ops.lt]: end } };
      }
      throw new Error(`Unsupported year comparison: ${node.type}`);

    case ODataMethod.MONTH:
    case ODataMethod.DAY:
      throw new Error(`${method} extraction requires raw SQL (use sequelize.literal).`);

    case ODataMethod.INDEX_OF: {
      const field = getFieldName(parameters[0]);
      const searchValue = getLiteralValue(parameters[1]);
      const threshold = getLiteralValue(right);
      const insensitive = options.caseSensitive === false;
      const likeOp = insensitive ? ops.iLike : ops.like;
      const pattern = `%${searchValue}%`;

      if (node.type === NodeType.GREATER_OR_EQUALS_EXPRESSION && threshold === 0) {
        return { [field]: { [likeOp]: pattern } };
      }
      if (node.type === NodeType.EQUALS_EXPRESSION && threshold === -1) {
        const notLike = insensitive ? ops.notLike : ops.notLike;
        return { [field]: { [notLike]: pattern } };
      }
      throw new Error(`Unsupported indexof comparison: ${node.type} with threshold ${threshold}`);
    }

    case ODataMethod.LENGTH: {
      const field = getFieldName(parameters[0]);
      const threshold = getLiteralValue(right);
      throw new Error(
        `Length comparison requires raw SQL: WHERE LENGTH(${field}) ${getComparisonSymbol(
          node.type as ComparisonType
        )} ${threshold}`
      );
    }

    case ODataMethod.ROUND:
    case ODataMethod.FLOOR:
    case ODataMethod.CEILING:
      throw new Error(`Math function ${method} requires raw SQL implementation`);

    default:
      throw new Error(`Unsupported function in comparison: ${method}`);
  }
}
