/**
 * Prisma ORM Adapter
 */

import { BaseOrmAdapter, ConversionOptions, WhereClause, ComparisonNode, MethodCallNode } from './base';
import { ODataNode } from '../types';
import { preprocessODataFilter } from '../utils/helpers';
import { optimizeOrToIn } from '../utils/optimizer';
import { fallbackParser } from '../utils/fallback';
import { handleComparison } from '../converters/comparison';
import { handleMethod, handleInExpression } from '../converters/methods';
import { tryHandleYearMonth, tryHandleDateRange } from '../converters/date';

// Import the odata-v4-parser
import * as odataParser from 'odata-v4-parser';

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
    if (!odataFilterString || typeof odataFilterString !== 'string') {
      return {};
    }
    
    try {
      // Pre-process the filter string
      const preprocessed = preprocessODataFilter(odataFilterString);
      const ast = odataParser.filter(preprocessed);
      const result = this.convertNode(ast);
      
      // Post-process to optimize OR conditions into IN operations
      return optimizeOrToIn(result);
    } catch (error) {
      // If parsing fails, try fallback parsing for special cases
      try {
        return fallbackParser(odataFilterString, this.options);
      } catch (fallbackError) {
        throw new Error(`Failed to parse OData filter: ${(error as Error).message}`);
      }
    }
  }

  /**
   * Recursively convert AST node to Prisma filter
   */
  convertNode(node: ODataNode): PrismaWhereClause {
    if (!node || !node.type) {
      throw new Error('Invalid AST node');
    }

    switch (node.type) {
      case 'EqualsExpression':
      case 'NotEqualsExpression':
      case 'GreaterThanExpression':
      case 'GreaterOrEqualsExpression':
      case 'LesserThanExpression':
      case 'LesserOrEqualsExpression':
        return this.handleComparison(node as ComparisonNode);

      case 'AndExpression': {
        const left = node.value.left;
        const right = node.value.right;
        
        // Handle special case: year + month
        const yearMonth = tryHandleYearMonth(left, right) || tryHandleYearMonth(right, left);
        if (yearMonth) return yearMonth;
        
        // Handle special case: date range
        const dateRange = tryHandleDateRange(left, right) || tryHandleDateRange(right, left);
        if (dateRange) return dateRange;
        
        return { AND: [this.convertNode(left), this.convertNode(right)] };
      }

      case 'OrExpression':
        return { OR: [this.convertNode(node.value.left), this.convertNode(node.value.right)] };

      case 'NotExpression':
        return { NOT: this.convertNode(node.value) };

      case 'MethodCallExpression':
      case 'CommonExpression':
        return this.handleMethod(node as MethodCallNode);

      case 'ParenExpression':
      case 'BoolParenExpression':
        return this.convertNode(node.value);

      case 'InExpression':
        return handleInExpression(node, this.options);

      default:
        throw new Error(`Unsupported AST node type: ${node.type}`);
    }
  }

  /**
   * Handle comparison operations
   */
  handleComparison(node: ComparisonNode): PrismaWhereClause {
    return handleComparison(node, this.options);
  }

  /**
   * Handle logical operations
   */
  handleLogical(node: ODataNode): PrismaWhereClause {
    return this.convertNode(node);
  }

  /**
   * Handle method calls
   */
  handleMethod(node: MethodCallNode): PrismaWhereClause {
    return handleMethod(node, this.options);
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
