/**
 * Optimization utilities for Prisma where clauses
 */

import { PrismaWhereClause } from '../types';

/**
 * Optimize OR conditions that can be converted to IN operations
 */
export function optimizeOrToIn(whereClause: PrismaWhereClause): PrismaWhereClause {
  if (!whereClause || typeof whereClause !== 'object') {
    return whereClause;
  }
  
  // Check if this is an OR clause with same field equals operations
  if (whereClause.OR && Array.isArray(whereClause.OR)) {
    const fieldValues: Record<string, any[]> = {};
    let canOptimize = true;
    
    for (const condition of whereClause.OR) {
      const keys = Object.keys(condition);
      if (keys.length === 1) {
        const field = keys[0];
        const value = condition[field];
        
        if (value && typeof value === 'object' && value.equals !== undefined) {
          if (!fieldValues[field]) {
            fieldValues[field] = [];
          }
          fieldValues[field].push(value.equals);
        } else {
          canOptimize = false;
          break;
        }
      } else {
        canOptimize = false;
        break;
      }
    }
    
    // If we can optimize and there's only one field with multiple values
    const fieldNames = Object.keys(fieldValues);
    if (canOptimize && fieldNames.length === 1 && fieldValues[fieldNames[0]].length > 1) {
      return { [fieldNames[0]]: { in: fieldValues[fieldNames[0]] } };
    }
  }
  
  // Recursively optimize nested structures
  const result: PrismaWhereClause = {};
  for (const [key, value] of Object.entries(whereClause)) {
    if (Array.isArray(value)) {
      result[key] = value.map(item => optimizeOrToIn(item));
    } else if (value && typeof value === 'object') {
      result[key] = optimizeOrToIn(value);
    } else {
      result[key] = value;
    }
  }
  
  return result;
}
