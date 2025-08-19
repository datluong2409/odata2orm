/**
 * Enhanced field path handling for nested navigation
 */

import { ODataNode } from '../types';

/**
 * Extract field path from OData AST node, supporting nested navigation
 */
export function extractFieldPath(node: any): string[] {
  if (!node) return [];

  // Handle simple field names
  if (node.type === 'ODataIdentifier') {
    return [node.value.name];
  }

  // Handle property path expressions (nested fields)
  if (node.type === 'PropertyPathExpression' || node.type === 'MemberExpression') {
    const path: string[] = [];
    
    // Check for nested structure with .value.current
    const targetValue = node.value?.value || node.value;
    
    if (targetValue && targetValue.current) {
      // Multi-level navigation: user/profile/name
      path.push(targetValue.current.value.name);
      
      // Traverse the next chain
      let next = targetValue.next;
      while (next) {
        if (next.type === 'SingleNavigationExpression' && next.value) {
          // Extract field from nested navigation
          const nestedPath = extractFieldPath(next.value);
          path.push(...nestedPath);
          break;
        } else if (next.value && next.value.name) {
          path.push(next.value.name);
        }
        next = next.value ? next.value.next : null;
      }
    } else if (targetValue && targetValue.value && targetValue.value.name) {
      // Simple field from nested value
      path.push(targetValue.value.name);
    } else if (targetValue && targetValue.name) {
      // Simple field
      path.push(targetValue.name);
    }

    return path;
  }

  // Handle first member expressions
  if (node.type === 'FirstMemberExpression') {
    if (node.value) {
      return extractFieldPath(node.value);
    }
  }

  // Handle single navigation expressions
  if (node.type === 'SingleNavigationExpression') {
    if (node.value) {
      return extractFieldPath(node.value);
    }
  }

  // Fallback: try to get name directly
  if (node.value && node.value.name) {
    return [node.value.name];
  }

  return [];
}

/**
 * Convert field path array to nested Prisma where structure
 */
export function buildNestedWhere(path: string[], condition: any): any {
  if (path.length === 0) {
    return condition;
  }

  if (path.length === 1) {
    return { [path[0]]: condition };
  }

  // Build nested structure
  const result: any = {};
  let current = result;

  for (let i = 0; i < path.length - 1; i++) {
    current[path[i]] = {};
    current = current[path[i]];
  }

  current[path[path.length - 1]] = condition;
  return result;
}

/**
 * Determine if a field path represents a relation in Prisma
 */
export function isRelationPath(path: string[]): boolean {
  // In a real implementation, this would check against schema metadata
  // For now, assume paths with length > 1 are relations
  return path.length > 1;
}

/**
 * Convert nested field path to dot notation for orderBy
 */
export function pathToDotNotation(path: string[]): string {
  return path.join('.');
}

/**
 * Normalize field path (handle case sensitivity, aliases, etc.)
 */
export function normalizeFieldPath(path: string[], options: any = {}): string[] {
  if (options.caseSensitive === false) {
    return path.map(p => p.toLowerCase());
  }
  return path;
}
