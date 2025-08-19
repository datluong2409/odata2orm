/**
 * OData filter field extraction utilities
 */

import { SchemaValidator } from './schema-validator';
import { SchemaValidationOptions } from '../types/schema';
import { SchemaValidationError } from '../errors';

/**
 * Extract field paths from OData filter string for validation
 * This is a simple regex-based approach that captures most common cases
 */
export function extractFieldPathsFromFilter(filterString: string): string[] {
  if (!filterString) return [];

  const paths: string[] = [];
  
  // First, remove any/all expressions to avoid extracting lambda variables
  let cleanedFilter = filterString;
  const anyAllRegex = /\b([a-zA-Z_][a-zA-Z0-9_]*(?:\/[a-zA-Z_][a-zA-Z0-9_]*)*)\/(any|all)\([^)]+\)/g;
  cleanedFilter = cleanedFilter.replace(anyAllRegex, '');
  
  // Match field paths that appear before operators
  // This regex matches: word/word/word followed by space and operator
  const fieldRegex = /\b([a-zA-Z_][a-zA-Z0-9_]*(?:\/[a-zA-Z_][a-zA-Z0-9_]*)*)\s+(?:eq|ne|gt|ge|lt|le|contains|startswith|endswith|in)\s/g;
  
  let match;
  while ((match = fieldRegex.exec(cleanedFilter)) !== null) {
    const fieldPath = match[1];
    if (!paths.includes(fieldPath)) {
      paths.push(fieldPath);
    }
  }

  // Also match fields in method calls like contains(field, 'value')
  const methodRegex = /\b(?:contains|startswith|endswith|tolower|toupper|year|month|day)\s*\(\s*([a-zA-Z_][a-zA-Z0-9_]*(?:\/[a-zA-Z_][a-zA-Z0-9_]*)*)\s*[,)]/g;
  
  while ((match = methodRegex.exec(cleanedFilter)) !== null) {
    const fieldPath = match[1];
    if (!paths.includes(fieldPath)) {
      paths.push(fieldPath);
    }
  }

  return paths;
}

/**
 * Validate all field paths in a filter string against schema
 */
export function validateFilterFieldPaths(
  filterString: string, 
  options: SchemaValidationOptions
): void {
  if (!filterString) return;

  const validator = new SchemaValidator(options.schema);
  
  // Only validate if strict validation is enabled
  if (!validator.isStrictValidationEnabled(options.allowAllFields)) {
    return;
  }

  const fieldPaths = extractFieldPathsFromFilter(filterString);
  
  for (const fieldPath of fieldPaths) {
    // Skip fields that are part of collection filters (any/all) as they are validated separately
    if (fieldPath.includes('any(') || fieldPath.includes('all(')) {
      continue;
    }
    
    const pathParts = fieldPath.split('/');
    validator.validateFieldPathStrict(pathParts, 'filter');
  }
}
