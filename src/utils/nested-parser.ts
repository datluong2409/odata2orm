/**
 * Enhanced OData parser with nested navigation support
 */

import { 
  ParsedOrderBy, 
  ParsedSelect, 
  ODataQueryParams 
} from '../types/odata-query';
import { 
  ParsedNestedSelect, 
  SchemaValidationOptions,
  CollectionFilter 
} from '../types/schema';
import { 
  SchemaValidator, 
  parseNavigationPath, 
  parseCollectionFilter 
} from './schema-validator';
import { SchemaValidationError } from '../errors';

/**
 * Parse OData $select with nested navigation support
 * Supports: "name,profile/avatar,orders/total" or "name,profile(avatar,bio),orders(total,status)"
 */
export function parseNestedSelect(
  selectString: string, 
  options: SchemaValidationOptions = {},
  contextPath: string[] = []
): ParsedNestedSelect {
  if (!selectString) return {};

  const validator = new SchemaValidator(options.schema);
  const result: ParsedNestedSelect = {};

  // Split by commas, but respect parentheses
  const fields = splitSelectFields(selectString);

  for (const field of fields) {
    const trimmedField = field.trim();
    
    // Check for nested selection with parentheses: "profile(avatar,bio)"
    const nestedMatch = trimmedField.match(/^([^(]+)\((.+)\)$/);
    
    if (nestedMatch) {
      const [, basePath, nestedFields] = nestedMatch;
      const pathParts = basePath.split('/');
      const fullPath = [...contextPath, ...pathParts];
      
      // Validate path if schema is provided and strict validation is enabled
      if (validator.isStrictValidationEnabled(options.allowAllFields)) {
        validator.validateFieldPathStrict(fullPath, 'select');
      }

      // Recursively parse nested fields with the current path as context
      const nestedSelect = parseNestedSelect(nestedFields, options, fullPath);
      setNestedValue(result, pathParts, nestedSelect);
    } else {
      // Simple field or navigation path: "name" or "profile/avatar"
      const pathParts = trimmedField.split('/');
      const fullPath = [...contextPath, ...pathParts];
      
      // Validate path if schema is provided and strict validation is enabled
      if (validator.isStrictValidationEnabled(options.allowAllFields)) {
        validator.validateFieldPathStrict(fullPath, 'select');
      }

      setNestedValue(result, pathParts, true);
    }
  }

  return result;
}

/**
 * Split select fields respecting parentheses nesting
 */
function splitSelectFields(selectString: string): string[] {
  const fields: string[] = [];
  let current = '';
  let parenthesesDepth = 0;

  for (let i = 0; i < selectString.length; i++) {
    const char = selectString[i];
    
    if (char === '(') {
      parenthesesDepth++;
      current += char;
    } else if (char === ')') {
      parenthesesDepth--;
      current += char;
    } else if (char === ',' && parenthesesDepth === 0) {
      fields.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  if (current.trim()) {
    fields.push(current.trim());
  }

  return fields;
}

/**
 * Set nested value in the result object
 */
function setNestedValue(
  obj: ParsedNestedSelect, 
  path: string[], 
  value: boolean | ParsedNestedSelect
): void {
  let current = obj;
  
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    if (!(key in current)) {
      current[key] = {};
    }
    if (typeof current[key] === 'boolean') {
      current[key] = {};
    }
    current = current[key] as ParsedNestedSelect;
  }
  
  const lastKey = path[path.length - 1];
  current[lastKey] = value;
}

/**
 * Parse OData $orderby with nested navigation support
 * Supports: "name asc, profile/createdAt desc, orders/total asc"
 */
export function parseNestedOrderBy(
  orderByString: string, 
  options: SchemaValidationOptions = {}
): ParsedOrderBy {
  if (!orderByString) return {};

  const validator = new SchemaValidator(options.schema);
  const result: ParsedOrderBy = {};

  const orderItems = orderByString.split(',').map(item => item.trim());

  for (const item of orderItems) {
    const parts = item.split(/\s+/);
    const fieldPath = parts[0];
    const direction = (parts[1]?.toLowerCase() === 'desc') ? 'desc' : 'asc';

    // Validate path if schema is provided and strict validation is enabled
    if (validator.isStrictValidationEnabled(options.allowAllFields)) {
      const pathParts = fieldPath.split('/');
      validator.validateFieldPathStrict(pathParts, 'orderby');
    }

    // For now, flatten the path for orderBy (ORM-specific handling will be in query builders)
    const flatPath = fieldPath.replace(/\//g, '.');
    result[flatPath] = direction;
  }

  return result;
}

/**
 * Parse collection filters (any/all expressions)
 */
export function parseCollectionFilters(
  filterString: string, 
  options: SchemaValidationOptions = {}
): CollectionFilter[] {
  if (!filterString) return [];

  const validator = new SchemaValidator(options.schema);
  const filters: CollectionFilter[] = [];
  
  // Simple regex to find any/all expressions
  const anyAllRegex = /(\w+(?:\/\w+)*)\/(any|all)\((\w+):\s*([^)]+)\)/g;
  let match;

  while ((match = anyAllRegex.exec(filterString)) !== null) {
    const [, pathStr, type, variable, condition] = match;
    const pathParts = pathStr.split('/');
    
    // Validate collection path if schema is provided and strict validation is enabled
    if (validator.isStrictValidationEnabled(options.allowAllFields)) {
      validator.validateFieldPathStrict(pathParts, 'filter');
      
      // Also validate that this is actually a collection
      if (!validator.isCollectionPath(pathParts)) {
        throw new SchemaValidationError(
          `Schema validation failed for $filter: Field '${pathStr}' is not a collection and cannot be used with ${type}()`,
          pathStr,
          'filter'
        );
      }
    }
    
    filters.push({
      type: type as 'any' | 'all',
      variable,
      condition,
      path: pathParts
    });
  }

  return filters;
}

/**
 * Convert nested select to Prisma select format
 */
export function convertNestedSelectToPrisma(nestedSelect: ParsedNestedSelect): any {
  const result: any = {};

  for (const [key, value] of Object.entries(nestedSelect)) {
    if (value === true) {
      result[key] = true;
    } else if (typeof value === 'object') {
      result[key] = {
        select: convertNestedSelectToPrisma(value)
      };
    }
  }

  return result;
}

/**
 * Convert collection filter to Prisma format
 */
export function convertCollectionFilterToPrisma(filter: CollectionFilter, baseAdapter: any): any {
  // Convert the condition using the base adapter
  const conditionWhere = baseAdapter.convert(filter.condition.replace(new RegExp(`\\b${filter.variable}\\/`, 'g'), ''));

  // Build nested path for Prisma
  const result: any = {};
  let current = result;

  for (let i = 0; i < filter.path.length - 1; i++) {
    current[filter.path[i]] = {};
    current = current[filter.path[i]];
  }

  const lastKey = filter.path[filter.path.length - 1];
  current[lastKey] = {
    [filter.type === 'any' ? 'some' : 'every']: conditionWhere
  };

  return result;
}
