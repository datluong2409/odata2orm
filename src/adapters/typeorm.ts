/**
 * TypeORM Adapter
 */

import { BaseOrmAdapter, ConversionOptions, WhereClause, ComparisonNode, MethodCallNode } from './base';
import { ODataNode } from '../types';
import {
  convertToTypeOrmWhere,
  convertNode as convertNodeImpl,
} from '../converters/typeorm';
import { handleComparison as handleComparisonImpl } from '../converters/typeorm/comparison';
import { handleMethod as handleMethodImpl } from '../converters/typeorm/methods';

export interface TypeOrmWhereClause extends WhereClause {
  [key: string]: any;
}

export class TypeOrmAdapter extends BaseOrmAdapter {
  constructor(options: ConversionOptions = {}) {
    super(options);
  }

  /**
   * Convert OData filter string to TypeORM where clause.
   * Returns FindOptionsWhere or FindOptionsWhere[] (for OR).
   */
  convert(odataFilterString: string): TypeOrmWhereClause {
    const result = convertToTypeOrmWhere(odataFilterString, this.options);
    return result as TypeOrmWhereClause;
  }

  /**
   * Convert AST node to TypeORM filter.
   */
  convertNode(node: ODataNode): TypeOrmWhereClause {
    return convertNodeImpl(node, this.options) as TypeOrmWhereClause;
  }

  /**
   * Handle comparison operations.
   */
  handleComparison(node: ComparisonNode): TypeOrmWhereClause {
    return handleComparisonImpl(node, this.options) as TypeOrmWhereClause;
  }

  /**
   * Handle logical operations.
   */
  handleLogical(node: ODataNode): TypeOrmWhereClause {
    return convertNodeImpl(node, this.options) as TypeOrmWhereClause;
  }

  /**
   * Handle method calls.
   */
  handleMethod(node: MethodCallNode): TypeOrmWhereClause {
    return handleMethodImpl(node, this.options) as TypeOrmWhereClause;
  }

  getOrmName(): string {
    return 'TypeORM';
  }

  getSupportedFeatures(): string[] {
    return [
      'Basic comparisons (=, !=, >, >=, <, <=) via FindOperator (Equal/Not/MoreThan/LessThan/...)',
      'Logical operations (AND via merge / And() operator, OR via array, NOT via de Morgan + Not())',
      'String methods (contains, startsWith, endsWith) → Like / ILike',
      'Date operations (year, year+month combos, date range → Between via And(MoreThanOrEqual, LessThan))',
      'IN expressions → In([...])',
      'Null handling → IsNull() / Not(IsNull())',
      'Nested navigation paths → nested relation objects',
      'Case sensitivity control (caseSensitive=false → ILike)',
      'Arithmetic in comparisons (algebraically rearranged)',
    ];
  }
}
