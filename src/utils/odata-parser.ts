/**
 * OData Query Parser Utilities
 * Parse OData query parameters into ORM-specific format
 */

import { OrderByItem, ParsedOrderBy, ParsedSelect } from '../types/odata-query';

/**
 * Parse OData $orderby parameter
 * Examples:
 * - "name asc" -> { name: 'asc' }
 * - "name desc, age asc" -> { name: 'desc', age: 'asc' }
 * - "name" -> { name: 'asc' } (default to asc)
 */
export function parseOrderBy(orderby: string): ParsedOrderBy {
  if (!orderby || typeof orderby !== 'string') {
    return {};
  }

  const result: ParsedOrderBy = {};
  
  // Split by comma and process each item
  const items = orderby.split(',').map(item => item.trim());
  
  for (const item of items) {
    const parts = item.split(/\s+/);
    const field = parts[0];
    const direction = parts[1]?.toLowerCase() === 'desc' ? 'desc' : 'asc';
    
    if (field) {
      result[field] = direction;
    }
  }
  
  return result;
}

/**
 * Parse OData $select parameter
 * Examples:
 * - "name,age" -> { name: true, age: true }
 * - "user(name,email)" -> { user: { name: true, email: true } }
 */
export function parseSelect(select: string): ParsedSelect {
  if (!select || typeof select !== 'string') {
    return {};
  }

  const result: ParsedSelect = {};
  
  // Simple case: comma-separated fields without parentheses
  if (!select.includes('(')) {
    const fields = select.split(',').map(field => field.trim());
    for (const field of fields) {
      if (field) {
        result[field] = true;
      }
    }
    return result;
  }
  
  // Complex case with nested selections
  let i = 0;
  let currentField = '';
  
  while (i < select.length) {
    const char = select[i];
    
    if (char === '(') {
      // Found start of nested selection
      const fieldName = currentField.trim();
      i++; // skip opening parenthesis
      
      // Find matching closing parenthesis
      let nestedContent = '';
      let parenthesesCount = 1;
      
      while (i < select.length && parenthesesCount > 0) {
        if (select[i] === '(') {
          parenthesesCount++;
        } else if (select[i] === ')') {
          parenthesesCount--;
        }
        
        if (parenthesesCount > 0) {
          nestedContent += select[i];
        }
        i++;
      }
      
      // Parse nested fields
      if (fieldName) {
        result[fieldName] = {};
        const nestedFields = nestedContent.split(',').map(f => f.trim());
        for (const nestedField of nestedFields) {
          if (nestedField) {
            (result[fieldName] as ParsedSelect)[nestedField] = true;
          }
        }
      }
      
      currentField = '';
    } else if (char === ',') {
      // End of current field
      const fieldName = currentField.trim();
      if (fieldName) {
        result[fieldName] = true;
      }
      currentField = '';
      i++;
    } else {
      currentField += char;
      i++;
    }
  }
  
  // Handle last field if any
  const lastField = currentField.trim();
  if (lastField) {
    result[lastField] = true;
  }
  
  return result;
}

/**
 * Calculate pagination metadata
 */
export function calculatePagination(
  total: number,
  skip: number = 0,
  take?: number
): {
  hasNext: boolean;
  hasPrevious: boolean;
  totalPages?: number;
  currentPage?: number;
  pageSize?: number;
} {
  const hasPrevious = skip > 0;
  
  if (take === undefined) {
    return {
      hasNext: false,
      hasPrevious
    };
  }
  
  const hasNext = skip + take < total;
  const totalPages = Math.ceil(total / take);
  const currentPage = Math.floor(skip / take) + 1;
  
  return {
    hasNext,
    hasPrevious,
    totalPages,
    currentPage,
    pageSize: take
  };
}
