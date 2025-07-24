/**
 * Optimization utilities for Prisma where clauses
 */

import { PrismaWhereClause } from '../types';

/**
 * Flatten nested OR conditions and collect all equals conditions for the same field
 */
function flattenOrConditions(orClause: PrismaWhereClause[]): { field: string; values: any[] } | null {
  const allConditions: PrismaWhereClause[] = [];
  
  // Recursively flatten OR structures
  function collectConditions(conditions: PrismaWhereClause[]) {
    for (const condition of conditions) {
      if (condition.OR && Array.isArray(condition.OR)) {
        collectConditions(condition.OR);
      } else {
        allConditions.push(condition);
      }
    }
  }
  
  collectConditions(orClause);
  
  // Check if all conditions are equals on the same field
  const fieldValues: Record<string, any[]> = {};
  
  for (const condition of allConditions) {
    const keys = Object.keys(condition);
    if (keys.length === 1) {
      const field = keys[0];
      const value = condition[field];
      
      if (value && typeof value === 'object' && value.equals !== undefined) {
        if (!fieldValues[field]) {
          fieldValues[field] = [];
        }
        fieldValues[field].push(value.equals);
      } else if (value && typeof value === 'object' && value.in !== undefined) {
        if (!fieldValues[field]) {
          fieldValues[field] = [];
        }
        fieldValues[field].push(...value.in);
      } else {
        return null; // Cannot optimize
      }
    } else {
      return null; // Cannot optimize
    }
  }
  
  // Check if all conditions are on the same field
  const fieldNames = Object.keys(fieldValues);
  if (fieldNames.length === 1) {
    const field = fieldNames[0];
    const values = [...new Set(fieldValues[field])]; // Remove duplicates
    return { field, values };
  }
  
  return null;
}

/**
 * Optimize OR conditions that can be converted to IN operations
 */
export function optimizeOrToIn(whereClause: PrismaWhereClause): PrismaWhereClause {
  if (!whereClause || typeof whereClause !== 'object') {
    return whereClause;
  }
  
  // Check if this is an OR clause with same field equals operations
  if (whereClause.OR && Array.isArray(whereClause.OR)) {
    const flattened = flattenOrConditions(whereClause.OR);
    
    if (flattened && flattened.values.length > 1) {
      return { [flattened.field]: { in: flattened.values } };
    } else if (flattened && flattened.values.length === 1) {
      return { [flattened.field]: { equals: flattened.values[0] } };
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
