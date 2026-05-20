/**
 * Abstract Base Query Builder
 * Base class for building query options from OData query parameters for different ORMs
 */

import { ODataQueryParams, PaginationResult } from '../types/odata-query';
import { BaseOrmAdapter, ConversionOptions } from './base';
import { parseOrderBy, parseSelect, calculatePagination } from '../utils/odata-parser';

export interface BaseQueryOptions {
  where?: any;
  take?: number;
  skip?: number;
  orderBy?: any;
  select?: any;
  [key: string]: any;
}

export interface PaginationQueries<T extends BaseQueryOptions = BaseQueryOptions> {
  findQuery: T;
  countQuery: T;
}

/**
 * Abstract base class for ORM-specific query builders
 */
export abstract class BaseQueryBuilder<TQueryOptions extends BaseQueryOptions = BaseQueryOptions> {
  protected adapter: BaseOrmAdapter;

  constructor(adapter: BaseOrmAdapter) {
    this.adapter = adapter;
  }

  /**
   * Build query options from OData query parameters
   * Each ORM implementation should override this method to return ORM-specific query format
   */
  buildQuery(params: ODataQueryParams): TQueryOptions {
    const query = this.createEmptyQuery();

    // Handle $filter
    if (params.$filter) {
      this.setWhere(query, this.adapter.convert(params.$filter));
    }

    // Handle $top (limit)
    if (params.$top !== undefined && params.$top > 0) {
      this.setTake(query, params.$top);
    }

    // Handle $skip (offset)
    if (params.$skip !== undefined && params.$skip > 0) {
      this.setSkip(query, params.$skip);
    }

    // Handle $orderby
    if (params.$orderby) {
      const orderBy = parseOrderBy(params.$orderby);
      if (Object.keys(orderBy).length > 0) {
        this.setOrderBy(query, orderBy);
      }
    }

    // Handle $select
    if (params.$select) {
      const select = parseSelect(params.$select);
      if (Object.keys(select).length > 0) {
        this.setSelect(query, select);
      }
    }

    return query;
  }

  /**
   * Build pagination queries (find and count)
   */
  buildPaginationQuery(params: ODataQueryParams): PaginationQueries<TQueryOptions> {
    const findQuery = this.buildQuery(params);
    const countQuery = this.createCountQuery(findQuery);

    return { findQuery, countQuery };
  }

  /**
   * Process pagination result with metadata
   */
  processPaginationResult<T>(
    data: T[],
    total: number,
    params: ODataQueryParams
  ): PaginationResult<T> {
    const skip = params.$skip || 0;
    const take = params.$top;

    const pagination = calculatePagination(total, skip, take);

    const result: PaginationResult<T> = {
      data,
      ...pagination
    };

    // Add count if requested
    if (params.$count) {
      result.count = total;
    }

    return result;
  }

  /**
   * Convenience method to get filter where clause only
   */
  getWhereClause(filter: string) {
    return this.adapter.convert(filter);
  }

  // Abstract methods that each ORM implementation must provide

  /**
   * Create an empty query object specific to the ORM
   */
  protected abstract createEmptyQuery(): TQueryOptions;

  /**
   * Set the take/limit parameter in ORM-specific format
   */
  protected abstract setTake(query: TQueryOptions, take: number): void;

  /**
   * Set the skip/offset parameter in ORM-specific format
   */
  protected abstract setSkip(query: TQueryOptions, skip: number): void;

  /**
   * Set the orderBy parameter in ORM-specific format
   */
  protected abstract setOrderBy(query: TQueryOptions, orderBy: Record<string, 'asc' | 'desc'>): void;

  /**
   * Set the select parameter in ORM-specific format
   */
  protected abstract setSelect(query: TQueryOptions, select: Record<string, any>): void;

  /**
   * Set the where clause on the query in ORM-specific format. Default uses `query.where`;
   * override in adapters that use a different key (e.g. Mongoose uses `filter`).
   */
  protected setWhere(query: TQueryOptions, where: any): void {
    query.where = where;
  }

  /**
   * Read the where clause from the query in ORM-specific format. Default reads `query.where`;
   * override in adapters that use a different key.
   */
  protected getWhere(query: TQueryOptions): any {
    return query.where;
  }

  /**
   * Create a count query from a find query (typically removes take, skip, select, orderBy).
   * Default implementation produces an empty query and copies the where clause via
   * `setWhere` / `getWhere`. Override only if extra fields must be carried over.
   */
  protected createCountQuery(findQuery: TQueryOptions): TQueryOptions {
    const countQuery = this.createEmptyQuery();
    const where = this.getWhere(findQuery);
    if (where !== undefined && where !== null) {
      this.setWhere(countQuery, where);
    }
    return countQuery;
  }
}
