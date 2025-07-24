/**
 * TypeORM Adapter
 */

import { BaseOrmAdapter, ConversionOptions, WhereClause, ComparisonNode, MethodCallNode } from './base';
import { ODataNode } from '../types';

export interface TypeOrmWhereClause extends WhereClause {
  // TypeORM specific types will be defined here
}

export class TypeOrmAdapter extends BaseOrmAdapter {
  constructor(options: ConversionOptions = {}) {
    super(options);
  }

  /**
   * Convert OData filter string to TypeORM where clause
   */
  convert(odataFilterString: string): TypeOrmWhereClause {
    throw new Error('TypeORM adapter is coming soon! Please stay tuned for updates.');
  }

  /**
   * Convert AST node to TypeORM filter
   */
  convertNode(node: ODataNode): TypeOrmWhereClause {
    throw new Error('TypeORM adapter is coming soon! Please stay tuned for updates.');
  }

  /**
   * Handle comparison operations
   */
  handleComparison(node: ComparisonNode): TypeOrmWhereClause {
    throw new Error('TypeORM adapter is coming soon! Please stay tuned for updates.');
  }

  /**
   * Handle logical operations
   */
  handleLogical(node: ODataNode): TypeOrmWhereClause {
    throw new Error('TypeORM adapter is coming soon! Please stay tuned for updates.');
  }

  /**
   * Handle method calls
   */
  handleMethod(node: MethodCallNode): TypeOrmWhereClause {
    throw new Error('TypeORM adapter is coming soon! Please stay tuned for updates.');
  }

  /**
   * Get the ORM name
   */
  getOrmName(): string {
    return 'TypeORM';
  }

  /**
   * Get supported features for TypeORM
   */
  getSupportedFeatures(): string[] {
    return [
      'Coming soon! This adapter is under development.',
      'Will support: Basic comparisons, Logical operations, String methods, Date operations'
    ];
  }
}
