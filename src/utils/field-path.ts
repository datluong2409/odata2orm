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
    
    if (node.value && node.value.current) {
      // Multi-level navigation: user/profile/name
      let current = node.value.current;
      while (current) {
        if (current.type === 'ODataIdentifier') {
          path.unshift(current.value.name);
        } else if (current.value && current.value.name) {
          path.unshift(current.value.name);
        }
        current = current.value ? current.value.next : null;
      }
    } else if (node.value && node.value.name) {
      // Simple field
      path.push(node.value.name);
    }

    return path;
  }

  // Handle first member expressions
  if (node.type === 'FirstMemberExpression') {
    if (node.value && node.value.name) {
      return [node.value.name];
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
  if (!options.caseSensitive) {
    return path.map(p => p.toLowerCase());
  }
  return path;
}
