/**
 * Date-related operation handlers
 */

import { ODataNode, PrismaWhereClause } from '../types';
import { getFieldName, getLiteralValue } from '../utils/helpers';
import { NodeType, ODataMethod } from '../enums';

/**
 * Try to handle year + month combination
 */
export function tryHandleYearMonth(a: ODataNode, b: ODataNode): PrismaWhereClause | null {
  if (a.type === NodeType.EQUALS_EXPRESSION && b.type === NodeType.EQUALS_EXPRESSION) {
    const al = a.value.left;
    const ar = a.value.right;
    const bl = b.value.left;
    const br = b.value.right;
    
    if (al.type === NodeType.METHOD_CALL_EXPRESSION && bl.type === NodeType.METHOD_CALL_EXPRESSION) {
      const am = al.value.method;
      const bm = bl.value.method;
      
      if ((am === ODataMethod.YEAR && bm === ODataMethod.MONTH) || 
          (am === ODataMethod.MONTH && bm === ODataMethod.YEAR)) {
        const yearExpr = am === ODataMethod.YEAR ? al : bl;
        const monthExpr = am === ODataMethod.MONTH ? al : bl;
        const yearValue = am === ODataMethod.YEAR ? getLiteralValue(ar) : getLiteralValue(br);
        const monthValue = am === ODataMethod.MONTH ? getLiteralValue(ar) : getLiteralValue(br);
        
        const field = getFieldName(yearExpr.value.parameters[0]);
        const start = new Date(Date.UTC(yearValue, monthValue - 1, 1));
        const end = new Date(Date.UTC(yearValue, monthValue, 1));
        
        return { 
          [field]: { 
            gte: start.toISOString(), 
            lt: end.toISOString() 
          } 
        };
      }
    }
  }
  return null;
}

/**
 * Try to handle single year filter
 */
export function tryHandleYear(node: ODataNode): PrismaWhereClause | null {
  if (node.type === NodeType.EQUALS_EXPRESSION) {
    const left = node.value.left;
    const right = node.value.right;
    
    if (left.type === NodeType.METHOD_CALL_EXPRESSION && 
        left.value.method === ODataMethod.YEAR) {
      const field = getFieldName(left.value.parameters[0]);
      const yearValue = getLiteralValue(right);
      
      const start = new Date(Date.UTC(yearValue, 0, 1));
      const end = new Date(Date.UTC(yearValue + 1, 0, 1));
      
      return { 
        [field]: { 
          gte: start.toISOString(), 
          lt: end.toISOString() 
        } 
      };
    }
  }
  return null;
}

/**
 * Try to handle date range
 */
export function tryHandleDateRange(a: ODataNode, b: ODataNode): PrismaWhereClause | null {
  if ((a.type === NodeType.GREATER_OR_EQUALS_EXPRESSION || a.type === NodeType.GREATER_THAN_EXPRESSION) &&
      (b.type === NodeType.LESSER_OR_EQUALS_EXPRESSION || b.type === NodeType.LESSER_THAN_EXPRESSION)) {
    
    const aField = getFieldName(a.value.left);
    const bField = getFieldName(b.value.left);
    
    if (aField === bField) {
      const startValue = getLiteralValue(a.value.right);
      const endValue = getLiteralValue(b.value.right);
      
      const startOp = a.type === NodeType.GREATER_OR_EQUALS_EXPRESSION ? 'gte' : 'gt';
      const endOp = b.type === NodeType.LESSER_OR_EQUALS_EXPRESSION ? 'lte' : 'lt';
      
      // Convert dates to ISO strings if they are Date objects
      const startVal = startValue instanceof Date ? startValue.toISOString() : startValue;
      const endVal = endValue instanceof Date ? endValue.toISOString() : endValue;
      
      return {
        [aField]: {
          [startOp]: startVal,
          [endOp]: endVal
        }
      };
    }
  }
  return null;
}
