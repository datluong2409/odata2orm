/**
 * Abstract base adapter for ORM converters
 */

import { ODataNode } from '../types';

export interface ConversionOptions {
  caseSensitive?: boolean;
  [key: string]: any;
}

export interface WhereClause {
  [key: string]: any;
}

export interface ComparisonNode extends ODataNode {
  value: {
    left: ODataNode;
    right: ODataNode;
  };
}

export interface MethodCallNode extends ODataNode {
  value: {
    method: string;
    parameters: ODataNode[];
  };
}

/**
 * Abstract base class for ORM adapters
 */
export abstract class BaseOrmAdapter {
  protected options: ConversionOptions;

  constructor(options: ConversionOptions = {}) {
    this.options = options;
  }

  /**
   * Convert OData filter string to ORM-specific where clause
   */
  abstract convert(odataFilterString: string): WhereClause;

  /**
   * Convert AST node to ORM-specific filter
   */
  abstract convertNode(node: ODataNode): WhereClause;

  /**
   * Handle comparison operations (=, !=, >, >=, <, <=)
   */
  abstract handleComparison(node: ComparisonNode): WhereClause;

  /**
   * Handle logical operations (AND, OR, NOT)
   */
  abstract handleLogical(node: ODataNode): WhereClause;

  /**
   * Handle method calls (contains, startsWith, etc.)
   */
  abstract handleMethod(node: MethodCallNode): WhereClause;

  /**
   * Get the ORM name
   */
  abstract getOrmName(): string;

  /**
   * Get supported features for this ORM
   */
  abstract getSupportedFeatures(): string[];
}
