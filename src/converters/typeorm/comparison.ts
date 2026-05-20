/**
 * Comparison handlers for TypeORM.
 */

import {
  ODataNode,
  ComparisonNode,
  ConversionOptions,
  ComparisonType,
  ArithmeticOperator,
} from '../../types';
import { getFieldName, getLiteralValue, getComparisonSymbol } from '../../utils/helpers';
import { buildNestedWhere } from '../../utils/field-path';
import { NodeType, ODataMethod } from '../../enums';
import { getTypeOrmOperators } from './operators';
import { TypeOrmWhere } from './logical';
import {
  unwrapParens,
  isArithmeticExpression,
  computeAdjustedThreshold,
  readArithmeticOperands,
  resolveFieldPath,
} from '../shared/comparison-prelude';

type OperatorBuilder = (value: any) => any;

function comparisonOperatorBuilder(type: ComparisonType): OperatorBuilder {
  const ops = getTypeOrmOperators();
  switch (type) {
    case NodeType.EQUALS_EXPRESSION:
      return ops.Equal;
    case NodeType.NOT_EQUALS_EXPRESSION:
      return ops.Not;
    case NodeType.GREATER_THAN_EXPRESSION:
      return ops.MoreThan;
    case NodeType.GREATER_OR_EQUALS_EXPRESSION:
      return ops.MoreThanOrEqual;
    case NodeType.LESSER_THAN_EXPRESSION:
      return ops.LessThan;
    case NodeType.LESSER_OR_EQUALS_EXPRESSION:
      return ops.LessThanOrEqual;
    default:
      throw new Error(`Unsupported comparison operator: ${type}`);
  }
}

/**
 * Build a where clause for { field [op] value }, handling nested paths.
 */
function buildFieldWhere(path: string[], condition: any): TypeOrmWhere {
  if (path.length <= 1) {
    return { [path[0]]: condition };
  }
  return buildNestedWhere(path, condition);
}

/**
 * Handle null comparison (eq null / ne null).
 */
function handleNullComparison(path: string[], type: ComparisonType): TypeOrmWhere {
  const { IsNull, Not } = getTypeOrmOperators();
  if (type === NodeType.EQUALS_EXPRESSION) {
    return buildFieldWhere(path, IsNull());
  }
  if (type === NodeType.NOT_EQUALS_EXPRESSION) {
    return buildFieldWhere(path, Not(IsNull()));
  }
  throw new Error(`Cannot use ${type} with null literal`);
}

/**
 * Handle comparison operators
 */
export function handleComparison(node: ComparisonNode, options: ConversionOptions = {}): TypeOrmWhere {
  const left = unwrapParens(node.value.left);
  const right = node.value.right;

  if (isArithmeticExpression(left)) {
    return handleArithmeticComparison(node, left, right, options);
  }

  if (left.type === NodeType.METHOD_CALL_EXPRESSION) {
    return handleFunctionComparison(node, left, right, options);
  }

  const path = resolveFieldPath(left, options);
  const value = getLiteralValue(right);

  if (value === null) {
    return handleNullComparison(path, node.type as ComparisonType);
  }

  const opBuilder = comparisonOperatorBuilder(node.type as ComparisonType);
  return buildFieldWhere(path, opBuilder(value));
}

/**
 * Handle arithmetic expressions in comparison.
 */
export function handleArithmeticComparison(
  node: ComparisonNode,
  left: ODataNode,
  right: ODataNode,
  _options: ConversionOptions
): TypeOrmWhere {
  const { field, operand, threshold } = readArithmeticOperands(left, right);
  const adjusted = computeAdjustedThreshold(left.type as ArithmeticOperator, operand, threshold);
  const opBuilder = comparisonOperatorBuilder(node.type as ComparisonType);
  return { [field]: opBuilder(adjusted) };
}

/**
 * Handle function calls in comparison.
 */
export function handleFunctionComparison(
  node: ComparisonNode,
  left: ODataNode,
  right: ODataNode,
  options: ConversionOptions
): TypeOrmWhere {
  const ops = getTypeOrmOperators();
  const { method, parameters } = left.value;

  switch (method) {
    case ODataMethod.YEAR:
      if (node.type === NodeType.EQUALS_EXPRESSION) {
        const field = getFieldName(parameters[0]);
        const year = getLiteralValue(right);
        const start = new Date(Date.UTC(year, 0, 1));
        const end = new Date(Date.UTC(year + 1, 0, 1));
        return { [field]: ops.And(ops.MoreThanOrEqual(start), ops.LessThan(end)) };
      }
      throw new Error(`Unsupported year comparison: ${node.type}`);

    case ODataMethod.MONTH:
    case ODataMethod.DAY:
      throw new Error(`${method} extraction requires raw SQL (use Raw() in TypeORM).`);

    case ODataMethod.INDEX_OF: {
      const field = getFieldName(parameters[0]);
      const searchValue = getLiteralValue(parameters[1]);
      const threshold = getLiteralValue(right);
      const insensitive = options.caseSensitive === false;
      const likePattern = `%${searchValue}%`;
      const likeOp = insensitive ? ops.ILike(likePattern) : ops.Like(likePattern);

      if (node.type === NodeType.GREATER_OR_EQUALS_EXPRESSION && threshold === 0) {
        return { [field]: likeOp };
      }
      if (node.type === NodeType.EQUALS_EXPRESSION && threshold === -1) {
        return { [field]: ops.Not(likeOp) };
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
