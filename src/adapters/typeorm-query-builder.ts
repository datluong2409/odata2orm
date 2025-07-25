/**
 * TypeORM Query Builder
 * Build TypeORM query options from OData query parameters
 */

import { ODataQueryParams } from '../types/odata-query';
import { TypeOrmAdapter } from '../adapters/typeorm';
import { BaseQueryBuilder } from './base-query-builder';
import { ConversionOptions } from './base';

export interface TypeOrmQueryOptions {
  where?: any;
  take?: number;
  skip?: number;
  order?: Record<string, 'ASC' | 'DESC'>;
  select?: string[] | Record<string, any>;
  [key: string]: any;
}

export class TypeOrmQueryBuilder extends BaseQueryBuilder<TypeOrmQueryOptions> {
  constructor(options: ConversionOptions = {}) {
    const adapter = new TypeOrmAdapter(options);
    super(adapter);
  }

  /**
   * Create an empty TypeORM query object
   */
  protected createEmptyQuery(): TypeOrmQueryOptions {
    return {};
  }

  /**
   * Set the take parameter in TypeORM format
   */
  protected setTake(query: TypeOrmQueryOptions, take: number): void {
    query.take = take;
  }

  /**
   * Set the skip parameter in TypeORM format
   */
  protected setSkip(query: TypeOrmQueryOptions, skip: number): void {
    query.skip = skip;
  }

  /**
   * Set the orderBy parameter in TypeORM format
   * TypeORM uses 'ASC' and 'DESC' instead of 'asc' and 'desc'
   */
  protected setOrderBy(query: TypeOrmQueryOptions, orderBy: Record<string, 'asc' | 'desc'>): void {
    query.order = Object.entries(orderBy).reduce((acc, [field, direction]) => {
      acc[field] = direction.toUpperCase() as 'ASC' | 'DESC';
      return acc;
    }, {} as Record<string, 'ASC' | 'DESC'>);
  }

  /**
   * Set the select parameter in TypeORM format
   * TypeORM typically uses an array of field names for select
   */
  protected setSelect(query: TypeOrmQueryOptions, select: Record<string, any>): void {
    // Convert object select to array format for TypeORM
    const selectFields = this.flattenSelectObject(select);
    if (selectFields.length > 0) {
      query.select = selectFields;
    }
  }

  /**
   * Create a count query from a find query
   * Count query should not include take, skip, select, order
   */
  protected createCountQuery(findQuery: TypeOrmQueryOptions): TypeOrmQueryOptions {
    const countQuery: TypeOrmQueryOptions = {};
    if (findQuery.where) {
      countQuery.where = findQuery.where;
    }
    return countQuery;
  }

  /**
   * Helper method to flatten select object to array of field names
   * This is a simplified implementation - TypeORM select can be more complex
   */
  private flattenSelectObject(select: Record<string, any>, prefix = ''): string[] {
    const fields: string[] = [];
    
    for (const [key, value] of Object.entries(select)) {
      const fieldName = prefix ? `${prefix}.${key}` : key;
      
      if (value === true) {
        fields.push(fieldName);
      } else if (typeof value === 'object' && value !== null) {
        // Handle nested objects (for relations)
        fields.push(...this.flattenSelectObject(value, fieldName));
      }
    }
    
    return fields;
  }
}

/**
 * Static factory method for quick usage
 */
export function createTypeOrmQuery(params: ODataQueryParams, options = {}): TypeOrmQueryOptions {
  const builder = new TypeOrmQueryBuilder(options);
  return builder.buildQuery(params);
}

/**
 * Static factory method for pagination queries
 */
export function createTypeOrmPaginationQuery(params: ODataQueryParams, options = {}) {
  const builder = new TypeOrmQueryBuilder(options);
  return builder.buildPaginationQuery(params);
}
