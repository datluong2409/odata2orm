/**
 * Fallback parser for special OData cases
 */

import { ConversionOptions, PrismaWhereClause } from '../types';

/**
 * Fallback parser for special cases
 */
export function fallbackParser(filterString: string, options: ConversionOptions = {}): PrismaWhereClause {
  // Handle datetime literals that might not be properly quoted
  const datetimePattern = /(datetime)'([^']+)'/gi;
  let processed = filterString.replace(datetimePattern, "'$2'");
  
  // Handle IN operations manually
  const inPattern = /(\w+)\s+in\s*\(([^)]+)\)/gi;
  const inMatch = inPattern.exec(filterString);
  if (inMatch) {
    const [, field, values] = inMatch;
    const valueList = values.split(',').map(v => {
      const trimmed = v.trim();
      // Try to parse as number, otherwise keep as string
      const num = Number(trimmed);
      return isNaN(num) ? trimmed.replace(/['"]/g, '') : num;
    });
    return { [field]: { in: valueList } };
  }
  
  throw new Error('Fallback parsing failed');
}
