/**
 * Sequelize Query Builder
 * Build Sequelize query options from OData query parameters
 */

import { ODataQueryParams } from '../types/odata-query';
import { SequelizeAdapter } from '../adapters/sequelize';
import { BaseQueryBuilder } from './base-query-builder';
import { ConversionOptions } from './base';

export interface SequelizeQueryOptions {
  where?: any;
  limit?: number;
  offset?: number;
  order?: Array<[string, 'ASC' | 'DESC']>;
  attributes?: string[] | { include?: string[]; exclude?: string[] };
  [key: string]: any;
}

export class SequelizeQueryBuilder extends BaseQueryBuilder<SequelizeQueryOptions> {
  constructor(options: ConversionOptions = {}) {
    const adapter = new SequelizeAdapter(options);
    super(adapter);
  }

  /**
   * Create an empty Sequelize query object
   */
  protected createEmptyQuery(): SequelizeQueryOptions {
    return {};
  }

  /**
   * Set the limit parameter in Sequelize format
   */
  protected setTake(query: SequelizeQueryOptions, take: number): void {
    query.limit = take;
  }

  /**
   * Set the offset parameter in Sequelize format
   */
  protected setSkip(query: SequelizeQueryOptions, skip: number): void {
    query.offset = skip;
  }

  /**
   * Set the order parameter in Sequelize format
   * Sequelize uses arrays of [field, direction] tuples
   */
  protected setOrderBy(query: SequelizeQueryOptions, orderBy: Record<string, 'asc' | 'desc'>): void {
    query.order = Object.entries(orderBy).map(([field, direction]) => [
      field,
      direction.toUpperCase() as 'ASC' | 'DESC'
    ]);
  }

  /**
   * Set the attributes parameter in Sequelize format
   * Sequelize uses an array of field names for attributes (select)
   */
  protected setSelect(query: SequelizeQueryOptions, select: Record<string, any>): void {
    // Convert object select to array format for Sequelize
    const selectFields = this.flattenSelectObject(select);
    if (selectFields.length > 0) {
      query.attributes = selectFields;
    }
  }

  /**
   * Create a count query from a find query
   * Count query should not include limit, offset, attributes, order
   */
  protected createCountQuery(findQuery: SequelizeQueryOptions): SequelizeQueryOptions {
    const countQuery: SequelizeQueryOptions = {};
    if (findQuery.where) {
      countQuery.where = findQuery.where;
    }
    return countQuery;
  }

  /**
   * Helper method to flatten select object to array of field names
   * This handles the conversion from OData select format to Sequelize attributes
   */
  private flattenSelectObject(select: Record<string, any>, prefix = ''): string[] {
    const fields: string[] = [];
    
    for (const [key, value] of Object.entries(select)) {
      const fieldName = prefix ? `${prefix}.${key}` : key;
      
      if (value === true) {
        fields.push(fieldName);
      } else if (typeof value === 'object' && value !== null) {
        // For Sequelize, nested objects might represent includes
        // This is a simplified implementation
        fields.push(fieldName);
        // You might want to handle includes differently in real implementation
      }
    }
    
    return fields;
  }
}

/**
 * Static factory method for quick usage
 */
export function createSequelizeQuery(params: ODataQueryParams, options = {}): SequelizeQueryOptions {
  const builder = new SequelizeQueryBuilder(options);
  return builder.buildQuery(params);
}

/**
 * Static factory method for pagination queries
 */
export function createSequelizePaginationQuery(params: ODataQueryParams, options = {}) {
  const builder = new SequelizeQueryBuilder(options);
  return builder.buildPaginationQuery(params);
}
