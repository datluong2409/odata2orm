/**
 * Enhanced OData to ORM Converter
 * Convert OData filter string to various ORM filters (Prisma, TypeORM, Sequelize, Mongoose)
 */

// Export the new adapter-based API
export * from './adapters';

// Export enums for better type safety
export * from './enums';

// Export error classes
export * from './errors';

// Export legacy types for backward compatibility (excluding conflicts)
export type { ODataNode, MethodCallNode, ComparisonNode, LogicalNode, LiteralNode, FieldNode } from './types';

// Export new OData query types
export type { 
  ODataQueryParams, 
  PrismaQueryOptions, 
  PaginationResult, 
  OrderByItem, 
  ParsedOrderBy, 
  ParsedSelect 
} from './types/odata-query';

// Export schema validation types
export type {
  SchemaValidationOptions,
  NestedFieldPath,
  ParsedNestedSelect,
  ValidationResult,
  CollectionFilter,
  SchemaFieldInfo,
  SchemaMap
} from './types/schema';

// Legacy API - Keep for backward compatibility (defaults to Prisma)
export { convert } from './converters';
export { convert as default } from './converters';

// Convenience exports for easy usage
export { AdapterFactory as ODataConverter } from './adapters/factory';

// Export new Prisma Query Builder with schema support
export { 
  PrismaQueryBuilder, 
  PrismaQueryBuilderOptions,
  createPrismaQuery, 
  createPrismaPaginationQuery 
} from './adapters/prisma-query-builder';

// Export Abstract Base Classes
export { BaseQueryBuilder, BaseQueryOptions, PaginationQueries } from './adapters/base-query-builder';
export { QueryBuilderFactory } from './adapters/query-builder-factory';

// Export other ORM Query Builders
export { 
  TypeOrmQueryBuilder,
  createTypeOrmQuery,
  createTypeOrmPaginationQuery
} from './adapters/typeorm-query-builder';

export { 
  SequelizeQueryBuilder,
  createSequelizeQuery,
  createSequelizePaginationQuery
} from './adapters/sequelize-query-builder';

export { 
  MongooseQueryBuilder,
  createMongooseQuery,
  createMongoosePaginationQuery
} from './adapters/mongoose-query-builder';

// Export OData parser utilities
export { parseOrderBy, parseSelect, calculatePagination } from './utils/odata-parser';

// Export enhanced nested parsing utilities
export { 
  parseNestedSelect, 
  parseNestedOrderBy, 
  parseCollectionFilters,
  convertNestedSelectToPrisma,
  convertCollectionFilterToPrisma
} from './utils/nested-parser';

// Export schema validation utilities
export { SchemaValidator, parseNavigationPath, parseCollectionFilter } from './utils/schema-validator';

/**
 * Quick convert function for Prisma (backward compatibility)
 * @param odataFilterString - OData filter string
 * @param options - Conversion options
 * @returns Prisma where clause
 */
import { AdapterFactory } from './adapters/factory';
import { SupportedOrm } from './enums';
import { ODataQueryParams } from './types/odata-query';
import { PrismaQueryBuilderOptions, createPrismaQuery, createPrismaPaginationQuery } from './adapters/prisma-query-builder';
import { createTypeOrmQuery, createTypeOrmPaginationQuery } from './adapters/typeorm-query-builder';
import { createSequelizeQuery, createSequelizePaginationQuery } from './adapters/sequelize-query-builder';
import { createMongooseQuery, createMongoosePaginationQuery } from './adapters/mongoose-query-builder';

export function convertToPrisma(odataFilterString: string, options = {}) {
  const adapter = AdapterFactory.createAdapter(SupportedOrm.PRISMA, options);
  return adapter.convert(odataFilterString);
}

/**
 * Convert to TypeORM (coming soon)
 * @param odataFilterString - OData filter string
 * @param options - Conversion options
 */
export function convertToTypeORM(odataFilterString: string, options = {}) {
  const adapter = AdapterFactory.createAdapter(SupportedOrm.TYPEORM, options);
  return adapter.convert(odataFilterString);
}

/**
 * Convert to Sequelize (coming soon)
 * @param odataFilterString - OData filter string
 * @param options - Conversion options
 */
export function convertToSequelize(odataFilterString: string, options = {}) {
  const adapter = AdapterFactory.createAdapter(SupportedOrm.SEQUELIZE, options);
  return adapter.convert(odataFilterString);
}

/**
 * Convert to Mongoose (coming soon)
 * @param odataFilterString - OData filter string
 * @param options - Conversion options
 */
export function convertToMongoose(odataFilterString: string, options = {}) {
  const adapter = AdapterFactory.createAdapter(SupportedOrm.MONGOOSE, options);
  return adapter.convert(odataFilterString);
}

/**
 * Build complete Prisma query from OData parameters with schema validation
 * @param params - OData query parameters ($filter, $top, $skip, $orderby, $select)
 * @param options - Conversion and schema validation options
 * @returns Prisma query options
 */
export function buildPrismaQuery(params: ODataQueryParams, options: PrismaQueryBuilderOptions = {}) {
  return createPrismaQuery(params, options);
}

/**
 * Build Prisma pagination query from OData parameters with schema validation
 * @param params - OData query parameters
 * @param options - Conversion and schema validation options
 * @returns Object with findQuery and countQuery for pagination
 */
export function buildPrismaPagination(params: ODataQueryParams, options: PrismaQueryBuilderOptions = {}) {
  return createPrismaPaginationQuery(params, options);
}

/**
 * Build complete TypeORM query from OData parameters
 * @param params - OData query parameters ($filter, $top, $skip, $orderby, $select)
 * @param options - Conversion options
 * @returns TypeORM query options
 */
export function buildTypeOrmQuery(params: ODataQueryParams, options = {}) {
  return createTypeOrmQuery(params, options);
}

/**
 * Build TypeORM pagination query from OData parameters
 * @param params - OData query parameters
 * @param options - Conversion options
 * @returns Object with findQuery and countQuery for pagination
 */
export function buildTypeOrmPagination(params: ODataQueryParams, options = {}) {
  return createTypeOrmPaginationQuery(params, options);
}

/**
 * Build complete Sequelize query from OData parameters
 * @param params - OData query parameters ($filter, $top, $skip, $orderby, $select)
 * @param options - Conversion options
 * @returns Sequelize query options
 */
export function buildSequelizeQuery(params: ODataQueryParams, options = {}) {
  return createSequelizeQuery(params, options);
}

/**
 * Build Sequelize pagination query from OData parameters
 * @param params - OData query parameters
 * @param options - Conversion options
 * @returns Object with findQuery and countQuery for pagination
 */
export function buildSequelizePagination(params: ODataQueryParams, options = {}) {
  return createSequelizePaginationQuery(params, options);
}

/**
 * Build complete Mongoose query from OData parameters
 * @param params - OData query parameters ($filter, $top, $skip, $orderby, $select)
 * @param options - Conversion options
 * @returns Mongoose query options
 */
export function buildMongooseQuery(params: ODataQueryParams, options = {}) {
  return createMongooseQuery(params, options);
}

/**
 * Build Mongoose pagination query from OData parameters
 * @param params - OData query parameters
 * @param options - Conversion options
 * @returns Object with findQuery and countQuery for pagination
 */
export function buildMongoosePagination(params: ODataQueryParams, options = {}) {
  return createMongoosePaginationQuery(params, options);
}
