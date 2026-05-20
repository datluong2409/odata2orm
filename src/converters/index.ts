/**
 * Main OData → Prisma converter.
 */

import { ConversionOptions, PrismaWhereClause, ODataNode } from '../types';
import { optimizeOrToIn } from '../utils/optimizer';
import { fallbackParser } from '../utils/fallback';
import { handleComparison } from './comparison';
import { handleMethod, handleInExpression } from './methods';
import { tryHandleYear, tryHandleYearMonth, tryHandleDateRange } from './date';
import {
  ConvertStrategy,
  convertNodeGeneric,
  convertFilterGeneric,
} from './shared/convert-node';

const strategy: ConvertStrategy<PrismaWhereClause> = {
  handleComparison: (node, opts) => handleComparison(node, opts),
  handleMethod: (node, opts) => handleMethod(node, opts),
  handleInExpression: (node, opts) => handleInExpression(node, opts),
  and: (a, b) => ({ AND: [a, b] }),
  or: (a, b) => ({ OR: [a, b] }),
  not: (w) => ({ NOT: w }),
  tryHandleYear,
  tryHandleYearMonth,
  tryHandleDateRange,
  optimize: optimizeOrToIn,
  fallback: fallbackParser,
};

/**
 * Convert OData filter string to Prisma where
 * @param odataFilterString - OData filter string
 * @param options - Conversion options
 * @returns Prisma where clause
 */
export function convert(
  odataFilterString: string,
  options: ConversionOptions = {}
): PrismaWhereClause {
  return convertFilterGeneric(odataFilterString, options, strategy, () => ({}));
}

/**
 * Recursively convert AST node to Prisma filter
 */
export function convertNode(node: ODataNode, options: ConversionOptions = {}): PrismaWhereClause {
  return convertNodeGeneric(node, options, strategy);
}
