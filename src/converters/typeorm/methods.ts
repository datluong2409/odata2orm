/**
 * Method-call handlers for TypeORM (contains, startsWith, etc.).
 */

import { ODataNode, ConversionOptions } from '../../types';
import { getFieldName, getLiteralValue } from '../../utils/helpers';
import { NodeType, ODataMethod } from '../../enums';
import { getTypeOrmOperators } from './operators';
import { TypeOrmWhere } from './logical';

function likeOperator(value: string, options: ConversionOptions) {
  const ops = getTypeOrmOperators();
  return options.caseSensitive === false ? ops.ILike(value) : ops.Like(value);
}

/**
 * Handle MethodCallExpression.
 */
export function handleMethod(node: ODataNode, options: ConversionOptions = {}): TypeOrmWhere {
  let expr = node;
  if (
    expr.type === NodeType.COMMON_EXPRESSION ||
    expr.type === NodeType.PAREN_EXPRESSION ||
    expr.type === NodeType.BOOL_PAREN_EXPRESSION
  ) {
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
      const value = getLiteralValue(searchNode);
      return { [field]: likeOperator(`%${value}%`, options) };
    }

    case ODataMethod.SUBSTRING_OF: {
      const [substrNode, fieldNode] = parameters;
      const field = getFieldName(fieldNode);
      const value = getLiteralValue(substrNode);
      return { [field]: likeOperator(`%${value}%`, options) };
    }

    case ODataMethod.STARTS_WITH: {
      let [fieldNode, prefixNode] = parameters;
      let insensitive = options.caseSensitive === false;

      if (
        fieldNode.type === NodeType.METHOD_CALL_EXPRESSION &&
        fieldNode.value.method === ODataMethod.TO_LOWER
      ) {
        insensitive = true;
        fieldNode = fieldNode.value.parameters[0];
      }

      const field = getFieldName(fieldNode);
      const prefix = getLiteralValue(prefixNode);
      return { [field]: likeOperator(`${prefix}%`, { ...options, caseSensitive: !insensitive }) };
    }

    case ODataMethod.ENDS_WITH: {
      let [fieldNode, suffixNode] = parameters;
      let insensitive = options.caseSensitive === false;

      if (
        fieldNode.type === NodeType.METHOD_CALL_EXPRESSION &&
        fieldNode.value.method === ODataMethod.TO_LOWER
      ) {
        insensitive = true;
        fieldNode = fieldNode.value.parameters[0];
      }

      const field = getFieldName(fieldNode);
      const suffix = getLiteralValue(suffixNode);
      return { [field]: likeOperator(`%${suffix}`, { ...options, caseSensitive: !insensitive }) };
    }

    case ODataMethod.INDEX_OF: {
      const [fieldNode, searchNode] = parameters;
      const field = getFieldName(fieldNode);
      const value = getLiteralValue(searchNode);
      return { [field]: likeOperator(`%${value}%`, options) };
    }

    case ODataMethod.TO_LOWER:
    case ODataMethod.TO_UPPER:
    case ODataMethod.TRIM:
      throw new Error('String transformation functions should be handled in comparison context');

    case ODataMethod.CONCAT:
      throw new Error('concat function should be used in comparison context');

    default:
      throw new Error(`Unsupported method: ${method}`);
  }
}

/**
 * Handle IN expression: field in (a, b, c) → { field: In([a,b,c]) }
 */
export function handleInExpression(node: ODataNode, options: ConversionOptions): TypeOrmWhere {
  const ops = getTypeOrmOperators();
  const field = getFieldName(node.value.left);
  const values = node.value.right.value.items.map((item: ODataNode) => getLiteralValue(item));
  return { [field]: ops.In(values) };
}
