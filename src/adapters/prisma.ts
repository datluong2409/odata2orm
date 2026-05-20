/**
 * Prisma ORM Adapter
 */

import { BaseOrmAdapter, ConversionOptions, WhereClause, ComparisonNode, MethodCallNode } from './base';
import { ODataNode } from '../types';
import {
  convert as convertToPrismaWhere,
  convertNode as convertNodeImpl,
} from '../converters';
import { handleComparison as handleComparisonImpl } from '../converters/comparison';
import { handleMethod as handleMethodImpl } from '../converters/methods';

export interface PrismaWhereClause extends WhereClause {
  AND?: PrismaWhereClause[];
  OR?: PrismaWhereClause[];
  NOT?: PrismaWhereClause | PrismaWhereClause[];
}

export class PrismaAdapter extends BaseOrmAdapter {
  constructor(options: ConversionOptions = {}) {
    super(options);
  }

  /**
   * Convert OData filter string to Prisma where clause
   */
  convert(odataFilterString: string): PrismaWhereClause {
    return convertToPrismaWhere(odataFilterString, this.options) as PrismaWhereClause;
  }

  /**
   * Recursively convert AST node to Prisma filter
   */
  convertNode(node: ODataNode): PrismaWhereClause {
    return convertNodeImpl(node, this.options) as PrismaWhereClause;
  }

  /**
   * Handle comparison operations
   */
  handleComparison(node: ComparisonNode): PrismaWhereClause {
    return handleComparisonImpl(node, this.options);
  }

  /**
   * Handle logical operations
   */
  handleLogical(node: ODataNode): PrismaWhereClause {
    return convertNodeImpl(node, this.options) as PrismaWhereClause;
  }

  /**
   * Handle method calls
   */
  handleMethod(node: MethodCallNode): PrismaWhereClause {
    return handleMethodImpl(node, this.options);
  }

  /**
   * Get the ORM name
   */
  getOrmName(): string {
    return 'Prisma';
  }

  /**
   * Get supported features for Prisma
   */
  getSupportedFeatures(): string[] {
    return [
      'Basic comparisons (=, !=, >, >=, <, <=)',
      'Logical operations (AND, OR, NOT)',
      'String methods (contains, startsWith, endsWith)',
      'Date operations',
      'Case sensitivity control',
      'IN expressions',
      'Optimization (OR to IN conversion)',
      'Year/Month filtering',
      'Date range filtering'
    ];
  }
}
