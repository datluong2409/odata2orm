/**
 * Mongoose Query Builder
 * Build Mongoose query options from OData query parameters
 */

import { ODataQueryParams } from '../types/odata-query';
import { MongooseAdapter } from '../adapters/mongoose';
import { BaseQueryBuilder } from './base-query-builder';
import { ConversionOptions } from './base';

export interface MongooseQueryOptions {
  filter?: any;
  limit?: number;
  skip?: number;
  sort?: Record<string, 1 | -1> | string;
  select?: string | Record<string, 0 | 1>;
  [key: string]: any;
}

export class MongooseQueryBuilder extends BaseQueryBuilder<MongooseQueryOptions> {
  constructor(options: ConversionOptions = {}) {
    const adapter = new MongooseAdapter(options);
    super(adapter);
  }

  /**
   * Create an empty Mongoose query object
   */
  protected createEmptyQuery(): MongooseQueryOptions {
    return {};
  }

  /**
   * Set the limit parameter in Mongoose format
   */
  protected setTake(query: MongooseQueryOptions, take: number): void {
    query.limit = take;
  }

  /**
   * Set the skip parameter in Mongoose format
   */
  protected setSkip(query: MongooseQueryOptions, skip: number): void {
    query.skip = skip;
  }

  /**
   * Set the sort parameter in Mongoose format
   * Mongoose uses 1 for ascending and -1 for descending
   */
  protected setOrderBy(query: MongooseQueryOptions, orderBy: Record<string, 'asc' | 'desc'>): void {
    query.sort = Object.entries(orderBy).reduce((acc, [field, direction]) => {
      acc[field] = direction === 'asc' ? 1 : -1;
      return acc;
    }, {} as Record<string, 1 | -1>);
  }

  /**
   * Set the select parameter in Mongoose format
   * Mongoose can use space-separated string or object with 1/0 values
   */
  protected setSelect(query: MongooseQueryOptions, select: Record<string, any>): void {
    // Convert object select to Mongoose select format
    const selectObj = this.convertToMongooseSelect(select);
    if (Object.keys(selectObj).length > 0) {
      query.select = selectObj;
    }
  }

  /**
   * Handle where clause for Mongoose (uses filter instead of where)
   */
  buildQuery(params: ODataQueryParams): MongooseQueryOptions {
    const query = super.buildQuery(params);
    
    // Move where to filter for Mongoose
    if (query.where) {
      query.filter = query.where;
      delete query.where;
    }
    
    return query;
  }

  /**
   * Create a count query from a find query
   * Count query should not include limit, skip, select, sort
   */
  protected createCountQuery(findQuery: MongooseQueryOptions): MongooseQueryOptions {
    const countQuery: MongooseQueryOptions = {};
    if (findQuery.filter) {
      countQuery.filter = findQuery.filter;
    } else if (findQuery.where) {
      countQuery.filter = findQuery.where;
    }
    return countQuery;
  }

  /**
   * Helper method to convert select object to Mongoose select format
   * Mongoose select can be a string or object with 1/0 values
   */
  private convertToMongooseSelect(select: Record<string, any>): Record<string, 1> {
    const mongooseSelect: Record<string, 1> = {};
    
    for (const [key, value] of Object.entries(select)) {
      if (value === true) {
        mongooseSelect[key] = 1;
      } else if (typeof value === 'object' && value !== null) {
        // Handle nested objects for subdocuments
        const nestedFields = this.flattenSelectObject(value, key);
        nestedFields.forEach(field => {
          mongooseSelect[field] = 1;
        });
      }
    }
    
    return mongooseSelect;
  }

  /**
   * Helper method to flatten nested select objects
   */
  private flattenSelectObject(select: Record<string, any>, prefix: string): string[] {
    const fields: string[] = [];
    
    for (const [key, value] of Object.entries(select)) {
      const fieldName = `${prefix}.${key}`;
      
      if (value === true) {
        fields.push(fieldName);
      } else if (typeof value === 'object' && value !== null) {
        fields.push(...this.flattenSelectObject(value, fieldName));
      }
    }
    
    return fields;
  }
}

/**
 * Static factory method for quick usage
 */
export function createMongooseQuery(params: ODataQueryParams, options = {}): MongooseQueryOptions {
  const builder = new MongooseQueryBuilder(options);
  return builder.buildQuery(params);
}

/**
 * Static factory method for pagination queries
 */
export function createMongoosePaginationQuery(params: ODataQueryParams, options = {}) {
  const builder = new MongooseQueryBuilder(options);
  return builder.buildPaginationQuery(params);
}
