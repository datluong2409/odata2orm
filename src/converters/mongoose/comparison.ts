/**
 * Comparison handlers for Mongoose.
 */

import {
  ODataNode,
  ComparisonNode,
  ConversionOptions,
  ComparisonType,
  ArithmeticOperator,
} from '../../types';
import { getFieldName, getLiteralValue, getComparisonSymbol } from '../../utils/helpers';
import { NodeType, ODataMethod } from '../../enums';
import { MongoOps, escapeRegex } from './operators';
import { MongoWhere } from './logical';
import {
  unwrapParens,
  isArithmeticExpression,
  computeAdjustedThreshold,
  readArithmeticOperands,
  resolveFieldPath,
} from '../shared/comparison-prelude';

function comparisonOperatorKey(type: ComparisonType): string {
  switch (type) {
    case NodeType.EQUALS_EXPRESSION:
      return MongoOps.eq;
    case NodeType.NOT_EQUALS_EXPRESSION:
      return MongoOps.ne;
    case NodeType.GREATER_THAN_EXPRESSION:
      return MongoOps.gt;
    case NodeType.GREATER_OR_EQUALS_EXPRESSION:
      return MongoOps.gte;
    case NodeType.LESSER_THAN_EXPRESSION:
      return MongoOps.lt;
    case NodeType.LESSER_OR_EQUALS_EXPRESSION:
      return MongoOps.lte;
    default:
      throw new Error(`Unsupported comparison operator: ${type}`);
  }
}

function pathToKey(path: string[]): string {
  return path.length === 1 ? path[0] : path.join('.');
}

function handleNullComparison(key: string, type: ComparisonType): MongoWhere {
  if (type === NodeType.EQUALS_EXPRESSION) {
    return { [key]: null };
  }
  if (type === NodeType.NOT_EQUALS_EXPRESSION) {
    return { [key]: { [MongoOps.ne]: null } };
  }
  throw new Error(`Cannot use ${type} with null literal`);
}

export function handleComparison(node: ComparisonNode, options: ConversionOptions = {}): MongoWhere {
  const left = unwrapParens(node.value.left);
  const right = node.value.right;

  if (isArithmeticExpression(left)) {
    return handleArithmeticComparison(node, left, right, options);
  }

  if (left.type === NodeType.METHOD_CALL_EXPRESSION) {
    return handleFunctionComparison(node, left, right, options);
  }

  const key = pathToKey(resolveFieldPath(left, options));
  const value = getLiteralValue(right);

  if (value === null) {
    return handleNullComparison(key, node.type as ComparisonType);
  }

  if (node.type === NodeType.EQUALS_EXPRESSION) {
    return { [key]: value };
  }

  const opKey = comparisonOperatorKey(node.type as ComparisonType);
  return { [key]: { [opKey]: value } };
}

export function handleArithmeticComparison(
  node: ComparisonNode,
  left: ODataNode,
  right: ODataNode,
  _options: ConversionOptions
): MongoWhere {
  const { field, operand, threshold } = readArithmeticOperands(left, right);
  const adjusted = computeAdjustedThreshold(left.type as ArithmeticOperator, operand, threshold);

  if (node.type === NodeType.EQUALS_EXPRESSION) {
    return { [field]: adjusted };
  }
  const opKey = comparisonOperatorKey(node.type as ComparisonType);
  return { [field]: { [opKey]: adjusted } };
}

export function handleFunctionComparison(
  node: ComparisonNode,
  left: ODataNode,
  right: ODataNode,
  options: ConversionOptions
): MongoWhere {
  const { method, parameters } = left.value;

  switch (method) {
    case ODataMethod.YEAR:
      if (node.type === NodeType.EQUALS_EXPRESSION) {
        const field = getFieldName(parameters[0]);
        const year = getLiteralValue(right);
        const start = new Date(Date.UTC(year, 0, 1));
        const end = new Date(Date.UTC(year + 1, 0, 1));
        return { [field]: { [MongoOps.gte]: start, [MongoOps.lt]: end } };
      }
      throw new Error(`Unsupported year comparison: ${node.type}`);

    case ODataMethod.MONTH:
    case ODataMethod.DAY:
      throw new Error(`${method} extraction requires aggregation pipeline ($expr / $month / $dayOfMonth).`);

    case ODataMethod.INDEX_OF: {
      const field = getFieldName(parameters[0]);
      const searchValue = getLiteralValue(parameters[1]);
      const threshold = getLiteralValue(right);
      const flags = options.caseSensitive === false ? 'i' : '';
      const pattern = escapeRegex(searchValue);

      if (node.type === NodeType.GREATER_OR_EQUALS_EXPRESSION && threshold === 0) {
        return flags
          ? { [field]: { [MongoOps.regex]: pattern, [MongoOps.options]: flags } }
          : { [field]: { [MongoOps.regex]: pattern } };
      }
      if (node.type === NodeType.EQUALS_EXPRESSION && threshold === -1) {
        const inner = flags
          ? { [MongoOps.regex]: pattern, [MongoOps.options]: flags }
          : { [MongoOps.regex]: pattern };
        return { [field]: { [MongoOps.not]: inner } };
      }
      throw new Error(`Unsupported indexof comparison: ${node.type} with threshold ${threshold}`);
    }

    case ODataMethod.LENGTH: {
      const field = getFieldName(parameters[0]);
      const threshold = getLiteralValue(right);
      throw new Error(
        `Length comparison requires $expr / $strLenCP: { $expr: { ${getComparisonSymbol(
          node.type as ComparisonType
        )}: [{ $strLenCP: "$${field}" }, ${threshold}] } }`
      );
    }

    case ODataMethod.ROUND:
    case ODataMethod.FLOOR:
    case ODataMethod.CEILING:
      throw new Error(`Math function ${method} requires aggregation pipeline ($expr).`);

    default:
      throw new Error(`Unsupported function in comparison: ${method}`);
  }
}
