/**
 * Shared comparison-helpers used by every ORM `handleComparison` / `handleArithmeticComparison`.
 *
 * These cover the parts that are byte-identical across Prisma/TypeORM/Sequelize/Mongoose;
 * the ORM-specific shape (which operator object to build) stays in each adapter.
 */

import { ODataNode, ConversionOptions, ArithmeticOperator } from '../../types';
import { NodeType } from '../../enums';
import { getFieldName, getLiteralValue } from '../../utils/helpers';
import { extractFieldPath, normalizeFieldPath } from '../../utils/field-path';

/**
 * Strip a single layer of parenthesis nodes off `left`.
 */
export function unwrapParens(node: ODataNode): ODataNode {
  if (node.type === NodeType.PAREN_EXPRESSION || node.type === NodeType.BOOL_PAREN_EXPRESSION) {
    return node.value;
  }
  return node;
}

export function isArithmeticExpression(node: ODataNode): boolean {
  return (
    node.type === NodeType.MUL_EXPRESSION ||
    node.type === NodeType.DIV_EXPRESSION ||
    node.type === NodeType.ADD_EXPRESSION ||
    node.type === NodeType.SUB_EXPRESSION
  );
}

/**
 * Given `field [op] operand` on the left and a numeric `threshold` on the right of a
 * comparison, algebraically rearrange so the comparison becomes `field [cmp] adjusted`.
 * This is identical across every ORM.
 */
export function computeAdjustedThreshold(
  arithOp: ArithmeticOperator,
  operand: number,
  threshold: number
): number {
  switch (arithOp) {
    case NodeType.MUL_EXPRESSION:
      return threshold / operand;
    case NodeType.DIV_EXPRESSION:
      return threshold * operand;
    case NodeType.ADD_EXPRESSION:
      return threshold - operand;
    case NodeType.SUB_EXPRESSION:
      return threshold + operand;
    default:
      throw new Error(`Unsupported arithmetic operation: ${arithOp}`);
  }
}

/**
 * Extract `(field, operand, threshold)` from a `field [arith] operand [cmp] threshold`
 * comparison shape.
 */
export function readArithmeticOperands(
  left: ODataNode,
  right: ODataNode
): { field: string; operand: any; threshold: any } {
  return {
    field: getFieldName(left.value.left),
    operand: getLiteralValue(left.value.right),
    threshold: getLiteralValue(right),
  };
}

/**
 * Resolve the field path (nested → array of segments) for the left side of a comparison.
 * Falls back to a single-segment path using `getFieldName` when extractFieldPath returns nothing.
 */
export function resolveFieldPath(left: ODataNode, options: ConversionOptions): string[] {
  const raw = extractFieldPath(left);
  const normalized = normalizeFieldPath(raw, options);
  return normalized.length > 0 ? normalized : [getFieldName(left)];
}
