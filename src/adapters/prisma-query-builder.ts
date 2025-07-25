/**
 * Prisma Query Builder
 * Build Prisma query options from OData query parameters
 */

import { ODataQueryParams, PrismaQueryOptions } from '../types/odata-query';
import { PrismaAdapter } from '../adapters/prisma';
import { BaseQueryBuilder } from './base-query-builder';
import { ConversionOptions } from './base';

// Re-export for convenience
export { PrismaQueryOptions } from '../types/odata-query';

export class PrismaQueryBuilder extends BaseQueryBuilder<PrismaQueryOptions> {
  constructor(options: ConversionOptions = {}) {
    const adapter = new PrismaAdapter(options);
    super(adapter);
  }

  /**
   * Create an empty Prisma query object
   */
  protected createEmptyQuery(): PrismaQueryOptions {
    return {};
  }

  /**
   * Set the take parameter in Prisma format
   */
  protected setTake(query: PrismaQueryOptions, take: number): void {
    query.take = take;
  }

  /**
   * Set the skip parameter in Prisma format
   */
  protected setSkip(query: PrismaQueryOptions, skip: number): void {
    query.skip = skip;
  }

  /**
   * Set the orderBy parameter in Prisma format
   */
  protected setOrderBy(query: PrismaQueryOptions, orderBy: Record<string, 'asc' | 'desc'>): void {
    query.orderBy = Object.entries(orderBy).map(([field, direction]) => ({
      [field]: direction
    }));
  }

  /**
   * Set the select parameter in Prisma format
   */
  protected setSelect(query: PrismaQueryOptions, select: Record<string, any>): void {
    query.select = select;
  }

  /**
   * Create a count query from a find query
   * Count query should not include take, skip, select, orderBy
   */
  protected createCountQuery(findQuery: PrismaQueryOptions): PrismaQueryOptions {
    const countQuery: PrismaQueryOptions = {};
    if (findQuery.where) {
      countQuery.where = findQuery.where;
    }
    return countQuery;
  }
}

/**
 * Static factory method for quick usage
 */
export function createPrismaQuery(params: ODataQueryParams, options = {}): PrismaQueryOptions {
  const builder = new PrismaQueryBuilder(options);
  return builder.buildQuery(params);
}

/**
 * Static factory method for pagination queries
 */
export function createPrismaPaginationQuery(params: ODataQueryParams, options = {}) {
  const builder = new PrismaQueryBuilder(options);
  return builder.buildPaginationQuery(params);
}
