/**
 * Schema types for OData v4 nested query validation
 */

import { z } from 'zod';

export interface SchemaValidationOptions {
  schema?: z.ZodSchema<any>;
  allowAllFields?: boolean; // Fallback to current behavior if no schema provided
}

export interface NestedFieldPath {
  path: string[];
  isCollection: boolean;
  lambdaVariable?: string;
  lambdaCondition?: string;
}

export interface ParsedNestedSelect {
  [key: string]: boolean | ParsedNestedSelect;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  normalizedPath?: string[];
}

export interface CollectionFilter {
  type: 'any' | 'all';
  variable: string;
  condition: string;
  path: string[];
}

export interface SchemaFieldInfo {
  type: 'scalar' | 'object' | 'array';
  nullable?: boolean;
  fields?: Record<string, SchemaFieldInfo>;
  itemType?: SchemaFieldInfo;
}

export type SchemaMap = Record<string, SchemaFieldInfo>;
