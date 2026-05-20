/**
 * Method-call handlers for Sequelize (contains, startsWith, etc.).
 */

import { ODataNode, ConversionOptions } from '../../types';
import { getFieldName, getLiteralValue } from '../../utils/helpers';
import { NodeType, ODataMethod } from '../../enums';
import { getSequelizeOps } from './operators';
import { SequelizeWhere } from './logical';

function likeSym(options: ConversionOptions) {
  const ops = getSequelizeOps();
  return options.caseSensitive === false ? ops.iLike : ops.like;
}

export function handleMethod(node: ODataNode, options: ConversionOptions = {}): SequelizeWhere {
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
  const sym = likeSym(options);

  switch (method) {
    case ODataMethod.CONTAINS: {
      const [fieldNode, searchNode] = parameters;
      const field = getFieldName(fieldNode);
      const value = getLiteralValue(searchNode);
      return { [field]: { [sym]: `%${value}%` } };
    }

    case ODataMethod.SUBSTRING_OF: {
      const [substrNode, fieldNode] = parameters;
      const field = getFieldName(fieldNode);
      const value = getLiteralValue(substrNode);
      return { [field]: { [sym]: `%${value}%` } };
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
      const ops = getSequelizeOps();
      const op = insensitive ? ops.iLike : ops.like;
      const field = getFieldName(fieldNode);
      const prefix = getLiteralValue(prefixNode);
      return { [field]: { [op]: `${prefix}%` } };
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
      const ops = getSequelizeOps();
      const op = insensitive ? ops.iLike : ops.like;
      const field = getFieldName(fieldNode);
      const suffix = getLiteralValue(suffixNode);
      return { [field]: { [op]: `%${suffix}` } };
    }

    case ODataMethod.INDEX_OF: {
      const [fieldNode, searchNode] = parameters;
      const field = getFieldName(fieldNode);
      const value = getLiteralValue(searchNode);
      return { [field]: { [sym]: `%${value}%` } };
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

export function handleInExpression(node: ODataNode, _options: ConversionOptions): SequelizeWhere {
  const ops = getSequelizeOps();
  const field = getFieldName(node.value.left);
  const values = node.value.right.value.items.map((item: ODataNode) => getLiteralValue(item));
  return { [field]: { [ops.in]: values } };
}
