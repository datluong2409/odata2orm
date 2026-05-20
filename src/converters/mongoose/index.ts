/**
 * Main OData → Mongoose / MongoDB converter.
 */

import { ConversionOptions, ODataNode } from '../../types';
import { handleComparison } from './comparison';
import { handleMethod, handleInExpression } from './methods';
import { tryHandleYearMonth, tryHandleDateRange, tryHandleYear } from './date';
import { andWhere, orWhere, notWhere, optimizeOrToIn, MongoWhere } from './logical';
import {
  ConvertStrategy,
  convertNodeGeneric,
  convertFilterGeneric,
} from '../shared/convert-node';

const strategy: ConvertStrategy<MongoWhere> = {
  handleComparison: (node, opts) => handleComparison(node, opts),
  handleMethod: (node, opts) => handleMethod(node, opts),
  handleInExpression: (node, opts) => handleInExpression(node, opts),
  and: andWhere,
  or: orWhere,
  not: notWhere,
  tryHandleYear,
  tryHandleYearMonth,
  tryHandleDateRange,
  optimize: optimizeOrToIn,
};

export function convertToMongooseWhere(
  odataFilterString: string,
  options: ConversionOptions = {}
): MongoWhere {
  return convertFilterGeneric(odataFilterString, options, strategy, () => ({}));
}

export function convertNode(node: ODataNode, options: ConversionOptions = {}): MongoWhere {
  return convertNodeGeneric(node, options, strategy);
}
