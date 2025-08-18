/**
 * Prisma Query Builder
 * Build Prisma query options from OData query parameters with schema validation and nested support
 */

import { ODataQueryParams, PrismaQueryOptions } from '../types/odata-query';
import { SchemaValidationOptions, CollectionFilter } from '../types/schema';
import { PrismaAdapter } from '../adapters/prisma';
import { BaseQueryBuilder } from './base-query-builder';
import { ConversionOptions } from './base';
import { 
  parseNestedSelect, 
  parseNestedOrderBy, 
  parseCollectionFilters,
  convertNestedSelectToPrisma,
  convertCollectionFilterToPrisma
} from '../utils/nested-parser';
import { SchemaValidator } from '../utils/schema-validator';

// Re-export for convenience
export { PrismaQueryOptions } from '../types/odata-query';

export interface PrismaQueryBuilderOptions extends ConversionOptions, SchemaValidationOptions {
  enableNestedQueries?: boolean;
}

export class PrismaQueryBuilder extends BaseQueryBuilder<PrismaQueryOptions> {
  private schemaOptions: SchemaValidationOptions;
  private enableNestedQueries: boolean;
  private validator: SchemaValidator;

  constructor(options: PrismaQueryBuilderOptions = {}) {
    const adapter = new PrismaAdapter(options);
    super(adapter);
    
    this.schemaOptions = {
      schema: options.schema,
      allowAllFields: options.allowAllFields ?? true
    };
    this.enableNestedQueries = options.enableNestedQueries ?? true;
    this.validator = new SchemaValidator(options.schema);
  }

  /**
   * Build query options from OData query parameters with enhanced nested support
   */
  buildQuery(params: ODataQueryParams): PrismaQueryOptions {
    const query = this.createEmptyQuery();

    // Handle $filter with nested navigation and collection filters
    if (params.$filter) {
      const baseWhere = this.adapter.convert(params.$filter);
      
      if (this.enableNestedQueries) {
        // Parse and handle collection filters (any/all)
        const collectionFilters = parseCollectionFilters(params.$filter);
        
        if (collectionFilters.length > 0) {
          const collectionWheres = collectionFilters.map(filter => 
            convertCollectionFilterToPrisma(filter, this.adapter)
          );
          
          // Merge base where with collection filters
          if (collectionWheres.length === 1 && Object.keys(baseWhere).length === 0) {
            query.where = collectionWheres[0];
          } else {
            query.where = {
              AND: [baseWhere, ...collectionWheres].filter(w => Object.keys(w).length > 0)
            };
          }
        } else {
          query.where = baseWhere;
        }
      } else {
        query.where = baseWhere;
      }
    }

    // Handle $top (limit)
    if (params.$top !== undefined && params.$top > 0) {
      this.setTake(query, params.$top);
    }

    // Handle $skip (offset)
    if (params.$skip !== undefined && params.$skip > 0) {
      this.setSkip(query, params.$skip);
    }

    // Handle $orderby with nested support
    if (params.$orderby) {
      if (this.enableNestedQueries) {
        const orderBy = parseNestedOrderBy(params.$orderby, this.schemaOptions);
        if (Object.keys(orderBy).length > 0) {
          this.setOrderBy(query, orderBy);
        }
      } else {
        // Fall back to original parsing
        const orderBy = this.parseOrderByLegacy(params.$orderby);
        if (Object.keys(orderBy).length > 0) {
          this.setOrderBy(query, orderBy);
        }
      }
    }

    // Handle $select with nested support
    if (params.$select) {
      if (this.enableNestedQueries) {
        const nestedSelect = parseNestedSelect(params.$select, this.schemaOptions);
        if (Object.keys(nestedSelect).length > 0) {
          const prismaSelect = convertNestedSelectToPrisma(nestedSelect);
          query.select = prismaSelect;
        }
      } else {
        // Fall back to original parsing
        const select = this.parseSelectLegacy(params.$select);
        if (Object.keys(select).length > 0) {
          this.setSelect(query, select);
        }
      }
    }

    return query;
  }

  /**
   * Legacy orderBy parsing for backward compatibility
   */
  private parseOrderByLegacy(orderByString: string): Record<string, 'asc' | 'desc'> {
    const result: Record<string, 'asc' | 'desc'> = {};
    const orderItems = orderByString.split(',').map(item => item.trim());

    for (const item of orderItems) {
      const parts = item.split(/\s+/);
      const field = parts[0];
      const direction = (parts[1]?.toLowerCase() === 'desc') ? 'desc' : 'asc';
      result[field] = direction;
    }

    return result;
  }

  /**
   * Legacy select parsing for backward compatibility
   */
  private parseSelectLegacy(selectString: string): Record<string, any> {
    const result: Record<string, any> = {};
    const fields = selectString.split(',').map(f => f.trim());
    
    for (const field of fields) {
      if (field) {
        result[field] = true;
      }
    }
    
    return result;
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
export function createPrismaQuery(
  params: ODataQueryParams, 
  options: PrismaQueryBuilderOptions = {}
): PrismaQueryOptions {
  const builder = new PrismaQueryBuilder(options);
  return builder.buildQuery(params);
}

/**
 * Static factory method for pagination queries
 */
export function createPrismaPaginationQuery(
  params: ODataQueryParams, 
  options: PrismaQueryBuilderOptions = {}
) {
  const builder = new PrismaQueryBuilder(options);
  return builder.buildPaginationQuery(params);
}
