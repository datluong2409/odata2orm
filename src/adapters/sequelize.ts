/**
 * Sequelize Adapter
 */

import { BaseOrmAdapter, ConversionOptions, WhereClause, ComparisonNode, MethodCallNode } from './base';
import { ODataNode } from '../types';
import {
  convertToSequelizeWhere,
  convertNode as convertNodeImpl,
} from '../converters/sequelize';
import { handleComparison as handleComparisonImpl } from '../converters/sequelize/comparison';
import { handleMethod as handleMethodImpl } from '../converters/sequelize/methods';

export interface SequelizeWhereClause extends WhereClause {
  [key: string]: any;
}

export class SequelizeAdapter extends BaseOrmAdapter {
  constructor(options: ConversionOptions = {}) {
    super(options);
  }

  /**
   * Convert OData filter string to Sequelize where clause.
   * Keys are field names; values use Sequelize Op symbols ({ [Op.eq]: v }, etc.).
   */
  convert(odataFilterString: string): SequelizeWhereClause {
    const result = convertToSequelizeWhere(odataFilterString, this.options);
    return result as SequelizeWhereClause;
  }

  convertNode(node: ODataNode): SequelizeWhereClause {
    return convertNodeImpl(node, this.options) as SequelizeWhereClause;
  }

  handleComparison(node: ComparisonNode): SequelizeWhereClause {
    return handleComparisonImpl(node, this.options) as SequelizeWhereClause;
  }

  handleLogical(node: ODataNode): SequelizeWhereClause {
    return convertNodeImpl(node, this.options) as SequelizeWhereClause;
  }

  handleMethod(node: MethodCallNode): SequelizeWhereClause {
    return handleMethodImpl(node, this.options) as SequelizeWhereClause;
  }

  getOrmName(): string {
    return 'Sequelize';
  }

  getSupportedFeatures(): string[] {
    return [
      'Basic comparisons (=, !=, >, >=, <, <=) via Op symbols (eq/ne/gt/gte/lt/lte)',
      'Logical operations (AND via merge / [Op.and], OR via [Op.or], NOT via [Op.not])',
      'String methods (contains, startsWith, endsWith) → [Op.like] / [Op.iLike]',
      'Date operations (year, year+month, date range → { [Op.gte]: start, [Op.lt]: end })',
      'IN expressions → [Op.in]',
      'Null handling → [Op.is] null / [Op.not] null',
      'Nested navigation paths → dot-notation keys (use with include / $assoc.col$)',
      'Case sensitivity control (caseSensitive=false → [Op.iLike])',
      'Arithmetic in comparisons (algebraically rearranged)',
    ];
  }
}
