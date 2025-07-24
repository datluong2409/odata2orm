/**
 * Enhanced OData to ORM Converter
 * Convert OData filter string to various ORM filters (Prisma, TypeORM, Sequelize, Mongoose)
 */

// Export the new adapter-based API
export * from './adapters';

// Export enums for better type safety
export * from './enums';

// Export legacy types for backward compatibility (excluding conflicts)
export type { ODataNode, MethodCallNode, ComparisonNode, LogicalNode, LiteralNode, FieldNode } from './types';

// Legacy API - Keep for backward compatibility (defaults to Prisma)
export { convert } from './converters';
export { convert as default } from './converters';

// Convenience exports for easy usage
export { AdapterFactory as ODataConverter } from './adapters/factory';

/**
 * Quick convert function for Prisma (backward compatibility)
 * @param odataFilterString - OData filter string
 * @param options - Conversion options
 * @returns Prisma where clause
 */
import { AdapterFactory } from './adapters/factory';
import { SupportedOrm } from './enums';

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
