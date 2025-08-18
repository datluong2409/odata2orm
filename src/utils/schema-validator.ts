/**
 * Schema validation utilities for OData v4 nested queries
 */

import { z } from 'zod';
import { 
  SchemaFieldInfo, 
  SchemaMap, 
  ValidationResult, 
  NestedFieldPath,
  CollectionFilter 
} from '../types/schema';

export class SchemaValidator {
  private schemaMap: SchemaMap;

  constructor(schema?: z.ZodSchema<any>) {
    this.schemaMap = schema ? this.buildSchemaMap(schema) : {};
  }

  /**
   * Build a flattened schema map from Zod schema for fast lookups
   */
  private buildSchemaMap(schema: z.ZodSchema<any>, prefix = ''): SchemaMap {
    const map: SchemaMap = {};
    
    if (schema instanceof z.ZodObject) {
      const shape = schema.shape;
      for (const [key, fieldSchema] of Object.entries(shape)) {
        const fullPath = prefix ? `${prefix}.${key}` : key;
        map[fullPath] = this.getFieldInfo(fieldSchema);
        
        // Recursively process nested objects
        if (fieldSchema instanceof z.ZodObject) {
          Object.assign(map, this.buildSchemaMap(fieldSchema, fullPath));
        } else if (fieldSchema instanceof z.ZodArray) {
          const itemSchema = fieldSchema.element;
          if (itemSchema instanceof z.ZodObject) {
            Object.assign(map, this.buildSchemaMap(itemSchema, fullPath));
          }
        }
      }
    }
    
    return map;
  }

  /**
   * Get field information from Zod schema
   */
  private getFieldInfo(schema: any): SchemaFieldInfo {
    if (schema instanceof z.ZodObject) {
      const fields: Record<string, SchemaFieldInfo> = {};
      for (const [key, fieldSchema] of Object.entries(schema.shape)) {
        fields[key] = this.getFieldInfo(fieldSchema);
      }
      return { type: 'object', fields };
    }
    
    if (schema instanceof z.ZodArray) {
      return { 
        type: 'array', 
        itemType: this.getFieldInfo(schema.element) 
      };
    }
    
    if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable) {
      return { 
        ...this.getFieldInfo(schema.unwrap()), 
        nullable: true 
      };
    }
    
    return { type: 'scalar' };
  }

  /**
   * Validate a field path against the schema
   */
  validateFieldPath(path: string[]): ValidationResult {
    if (Object.keys(this.schemaMap).length === 0) {
      return { isValid: true }; // No schema validation
    }

    const pathString = path.join('.');
    
    // Check exact match first
    if (this.schemaMap[pathString]) {
      return { isValid: true, normalizedPath: path };
    }

    // Check if it's a valid nested path
    let currentPath = '';
    for (let i = 0; i < path.length; i++) {
      currentPath = i === 0 ? path[i] : `${currentPath}.${path[i]}`;
      const fieldInfo = this.schemaMap[currentPath];
      
      if (!fieldInfo) {
        return { 
          isValid: false, 
          error: `Field '${currentPath}' does not exist in schema` 
        };
      }

      // If this is the last segment, it must be a scalar or the full path must exist
      if (i === path.length - 1) {
        if (fieldInfo.type === 'object' && !this.schemaMap[pathString]) {
          return { 
            isValid: false, 
            error: `Cannot select object field '${pathString}' directly. Use specific sub-fields.` 
          };
        }
      }
    }

    return { isValid: true, normalizedPath: path };
  }

  /**
   * Check if a field path represents a collection
   */
  isCollectionPath(path: string[]): boolean {
    if (Object.keys(this.schemaMap).length === 0) {
      return false; // Assume scalar if no schema
    }

    for (let i = 0; i < path.length; i++) {
      const currentPath = path.slice(0, i + 1).join('.');
      const fieldInfo = this.schemaMap[currentPath];
      
      if (fieldInfo && fieldInfo.type === 'array') {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Get all valid field paths for autocomplete/validation
   */
  getValidPaths(): string[] {
    return Object.keys(this.schemaMap).filter(path => {
      const fieldInfo = this.schemaMap[path];
      return fieldInfo.type === 'scalar' || fieldInfo.type === 'array';
    });
  }
}

/**
 * Parse OData navigation path (e.g., "user/profile/name" or "orders/any(o: o/total gt 100)")
 */
export function parseNavigationPath(path: string): NestedFieldPath {
  // Check for lambda expressions (any/all)
  const lambdaMatch = path.match(/^(.+)\/(any|all)\((\w+):\s*(.+)\)$/);
  
  if (lambdaMatch) {
    const [, basePath, , variable, condition] = lambdaMatch;
    return {
      path: basePath.split('/'),
      isCollection: true,
      lambdaVariable: variable,
      lambdaCondition: condition
    };
  }

  // Regular navigation path
  return {
    path: path.split('/'),
    isCollection: false
  };
}

/**
 * Parse collection filter expressions (any/all)
 */
export function parseCollectionFilter(expression: string): CollectionFilter | null {
  const match = expression.match(/^(.+)\/(any|all)\((\w+):\s*(.+)\)$/);
  
  if (!match) {
    return null;
  }

  const [, pathStr, type, variable, condition] = match;
  
  return {
    type: type as 'any' | 'all',
    variable,
    condition,
    path: pathStr.split('/')
  };
}
