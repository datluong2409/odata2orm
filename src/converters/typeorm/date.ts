/**
 * Date helpers for TypeORM: year/month combos and date ranges.
 */

import { ODataNode } from '../../types';
import { getFieldName, getLiteralValue } from '../../utils/helpers';
import { NodeType, ODataMethod } from '../../enums';
import { getTypeOrmOperators } from './operators';
import { TypeOrmWhere } from './logical';

export function tryHandleYearMonth(a: ODataNode, b: ODataNode): TypeOrmWhere | null {
  if (a.type !== NodeType.EQUALS_EXPRESSION || b.type !== NodeType.EQUALS_EXPRESSION) return null;

  const al = a.value.left;
  const ar = a.value.right;
  const bl = b.value.left;
  const br = b.value.right;

  if (al.type !== NodeType.METHOD_CALL_EXPRESSION || bl.type !== NodeType.METHOD_CALL_EXPRESSION) {
    return null;
  }

  const am = al.value.method;
  const bm = bl.value.method;

  const yearMonth =
    (am === ODataMethod.YEAR && bm === ODataMethod.MONTH) ||
    (am === ODataMethod.MONTH && bm === ODataMethod.YEAR);
  if (!yearMonth) return null;

  const yearExpr = am === ODataMethod.YEAR ? al : bl;
  const yearValue = am === ODataMethod.YEAR ? getLiteralValue(ar) : getLiteralValue(br);
  const monthValue = am === ODataMethod.MONTH ? getLiteralValue(ar) : getLiteralValue(br);

  const field = getFieldName(yearExpr.value.parameters[0]);
  const start = new Date(Date.UTC(yearValue, monthValue - 1, 1));
  const end = new Date(Date.UTC(yearValue, monthValue, 1));

  const ops = getTypeOrmOperators();
  return { [field]: ops.And(ops.MoreThanOrEqual(start), ops.LessThan(end)) };
}

export function tryHandleYear(node: ODataNode): TypeOrmWhere | null {
  if (node.type !== NodeType.EQUALS_EXPRESSION) return null;
  const left = node.value.left;
  const right = node.value.right;
  if (left.type !== NodeType.METHOD_CALL_EXPRESSION || left.value.method !== ODataMethod.YEAR) {
    return null;
  }

  const field = getFieldName(left.value.parameters[0]);
  const yearValue = getLiteralValue(right);
  const start = new Date(Date.UTC(yearValue, 0, 1));
  const end = new Date(Date.UTC(yearValue + 1, 0, 1));

  const ops = getTypeOrmOperators();
  return { [field]: ops.And(ops.MoreThanOrEqual(start), ops.LessThan(end)) };
}

export function tryHandleDateRange(a: ODataNode, b: ODataNode): TypeOrmWhere | null {
  const aIsLower =
    a.type === NodeType.GREATER_OR_EQUALS_EXPRESSION || a.type === NodeType.GREATER_THAN_EXPRESSION;
  const bIsUpper =
    b.type === NodeType.LESSER_OR_EQUALS_EXPRESSION || b.type === NodeType.LESSER_THAN_EXPRESSION;
  if (!aIsLower || !bIsUpper) return null;

  const aField = getFieldName(a.value.left);
  const bField = getFieldName(b.value.left);
  if (aField !== bField) return null;

  const startValue = getLiteralValue(a.value.right);
  const endValue = getLiteralValue(b.value.right);

  const ops = getTypeOrmOperators();
  const startOp =
    a.type === NodeType.GREATER_OR_EQUALS_EXPRESSION
      ? ops.MoreThanOrEqual(startValue)
      : ops.MoreThan(startValue);
  const endOp =
    b.type === NodeType.LESSER_OR_EQUALS_EXPRESSION
      ? ops.LessThanOrEqual(endValue)
      : ops.LessThan(endValue);

  return { [aField]: ops.And(startOp, endOp) };
}
