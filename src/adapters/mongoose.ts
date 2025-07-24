/**
 * Mongoose Adapter
 */

import { BaseOrmAdapter, ConversionOptions, WhereClause, ComparisonNode, MethodCallNode } from './base';
import { ODataNode } from '../types';

export interface MongooseWhereClause extends WhereClause {
  // Mongoose specific types will be defined here
}

export class MongooseAdapter extends BaseOrmAdapter {
  constructor(options: ConversionOptions = {}) {
    super(options);
  }

  /**
   * Convert OData filter string to Mongoose where clause
   */
  convert(odataFilterString: string): MongooseWhereClause {
    throw new Error('Mongoose adapter is coming soon! Please stay tuned for updates.');
  }

  /**
   * Convert AST node to Mongoose filter
   */
  convertNode(node: ODataNode): MongooseWhereClause {
    throw new Error('Mongoose adapter is coming soon! Please stay tuned for updates.');
  }

  /**
   * Handle comparison operations
   */
  handleComparison(node: ComparisonNode): MongooseWhereClause {
    throw new Error('Mongoose adapter is coming soon! Please stay tuned for updates.');
  }

  /**
   * Handle logical operations
   */
  handleLogical(node: ODataNode): MongooseWhereClause {
    throw new Error('Mongoose adapter is coming soon! Please stay tuned for updates.');
  }

  /**
   * Handle method calls
   */
  handleMethod(node: MethodCallNode): MongooseWhereClause {
    throw new Error('Mongoose adapter is coming soon! Please stay tuned for updates.');
  }

  /**
   * Get the ORM name
   */
  getOrmName(): string {
    return 'Mongoose';
  }

  /**
   * Get supported features for Mongoose
   */
  getSupportedFeatures(): string[] {
    return [
      'Coming soon! This adapter is under development.',
      'Will support: Basic comparisons, Logical operations, String methods, Date operations, MongoDB queries'
    ];
  }
}
