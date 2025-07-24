/**
 * Sequelize Adapter
 */

import { BaseOrmAdapter, ConversionOptions, WhereClause, ComparisonNode, MethodCallNode } from './base';
import { ODataNode } from '../types';

export interface SequelizeWhereClause extends WhereClause {
  // Sequelize specific types will be defined here
}

export class SequelizeAdapter extends BaseOrmAdapter {
  constructor(options: ConversionOptions = {}) {
    super(options);
  }

  /**
   * Convert OData filter string to Sequelize where clause
   */
  convert(odataFilterString: string): SequelizeWhereClause {
    throw new Error('Sequelize adapter is coming soon! Please stay tuned for updates.');
  }

  /**
   * Convert AST node to Sequelize filter
   */
  convertNode(node: ODataNode): SequelizeWhereClause {
    throw new Error('Sequelize adapter is coming soon! Please stay tuned for updates.');
  }

  /**
   * Handle comparison operations
   */
  handleComparison(node: ComparisonNode): SequelizeWhereClause {
    throw new Error('Sequelize adapter is coming soon! Please stay tuned for updates.');
  }

  /**
   * Handle logical operations
   */
  handleLogical(node: ODataNode): SequelizeWhereClause {
    throw new Error('Sequelize adapter is coming soon! Please stay tuned for updates.');
  }

  /**
   * Handle method calls
   */
  handleMethod(node: MethodCallNode): SequelizeWhereClause {
    throw new Error('Sequelize adapter is coming soon! Please stay tuned for updates.');
  }

  /**
   * Get the ORM name
   */
  getOrmName(): string {
    return 'Sequelize';
  }

  /**
   * Get supported features for Sequelize
   */
  getSupportedFeatures(): string[] {
    return [
      'Coming soon! This adapter is under development.',
      'Will support: Basic comparisons, Logical operations, String methods, Date operations'
    ];
  }
}
