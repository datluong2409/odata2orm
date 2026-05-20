/**
 * Mongoose Adapter
 */

import { BaseOrmAdapter, ConversionOptions, WhereClause, ComparisonNode, MethodCallNode } from './base';
import { ODataNode } from '../types';
import {
  convertToMongooseWhere,
  convertNode as convertNodeImpl,
} from '../converters/mongoose';
import { handleComparison as handleComparisonImpl } from '../converters/mongoose/comparison';
import { handleMethod as handleMethodImpl } from '../converters/mongoose/methods';

export interface MongooseWhereClause extends WhereClause {
  [key: string]: any;
}

export class MongooseAdapter extends BaseOrmAdapter {
  constructor(options: ConversionOptions = {}) {
    super(options);
  }

  /**
   * Convert OData filter string to a Mongoose / MongoDB filter object.
   */
  convert(odataFilterString: string): MongooseWhereClause {
    const result = convertToMongooseWhere(odataFilterString, this.options);
    return result as MongooseWhereClause;
  }

  convertNode(node: ODataNode): MongooseWhereClause {
    return convertNodeImpl(node, this.options) as MongooseWhereClause;
  }

  handleComparison(node: ComparisonNode): MongooseWhereClause {
    return handleComparisonImpl(node, this.options) as MongooseWhereClause;
  }

  handleLogical(node: ODataNode): MongooseWhereClause {
    return convertNodeImpl(node, this.options) as MongooseWhereClause;
  }

  handleMethod(node: MethodCallNode): MongooseWhereClause {
    return handleMethodImpl(node, this.options) as MongooseWhereClause;
  }

  getOrmName(): string {
    return 'Mongoose';
  }

  getSupportedFeatures(): string[] {
    return [
      'Basic comparisons (=, !=, >, >=, <, <=) via MongoDB ops ($eq/$ne/$gt/$gte/$lt/$lte)',
      'Logical operations (AND via merge / $and, OR via $or, NOT via $not / $nor / de Morgan)',
      'String methods (contains, startsWith, endsWith) → $regex (with $options: "i" for caseSensitive=false)',
      'Date operations (year, year+month, date range → { $gte: start, $lt: end })',
      'IN expressions → $in',
      'Null handling → { field: null } / { field: { $ne: null } }',
      'Nested navigation paths → dot-notation keys (e.g. "profile.address.city")',
      'Case sensitivity control (caseSensitive=false → regex /i)',
      'Arithmetic in comparisons (algebraically rearranged)',
    ];
  }
}
