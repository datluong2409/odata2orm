/**
 * Generic AST walker shared by every ORM converter.
 *
 * Each ORM provides a `ConvertStrategy<W>` describing how to combine where-clauses
 * (`and`/`or`/`not`), how to render a leaf comparison or method call, and any
 * date-special-cases or post-pass `optimize` to apply. The walker is the only place
 * that knows the OData AST shape.
 */

import { ConversionOptions, ODataNode, ComparisonNode } from '../../types';
import { NodeType } from '../../enums';
import { preprocessODataFilter } from '../../utils/helpers';

// eslint-disable-next-line @typescript-eslint/no-var-requires
import * as odataParser from 'odata-v4-parser';

export interface ConvertStrategy<W> {
  handleComparison: (node: ComparisonNode, options: ConversionOptions) => W;
  handleMethod: (node: ODataNode, options: ConversionOptions) => W;
  handleInExpression: (node: ODataNode, options: ConversionOptions) => W;
  and: (a: W, b: W) => W;
  or: (a: W, b: W) => W;
  not: (w: W) => W;
  /** Single `year(field) eq N` short-circuit (TypeORM/Sequelize/Mongoose use it; Prisma doesn't). */
  tryHandleYear?: (node: ODataNode) => W | null | undefined;
  /** `year(field) eq Y and month(field) eq M` short-circuit. */
  tryHandleYearMonth?: (a: ODataNode, b: ODataNode) => W | null | undefined;
  /** `field ge X and field le Y` short-circuit. */
  tryHandleDateRange?: (a: ODataNode, b: ODataNode) => W | null | undefined;
  /** Post-pass run on the final tree (e.g. collapse OR-of-eq into IN). */
  optimize?: (w: W) => W;
  /** Custom recovery when the upstream parser throws. */
  fallback?: (filter: string, options: ConversionOptions) => W;
}

export function convertNodeGeneric<W>(
  node: ODataNode,
  options: ConversionOptions,
  strategy: ConvertStrategy<W>
): W {
  if (!node || !node.type) {
    throw new Error('Invalid AST node');
  }

  switch (node.type) {
    case NodeType.EQUALS_EXPRESSION:
    case NodeType.NOT_EQUALS_EXPRESSION:
    case NodeType.GREATER_THAN_EXPRESSION:
    case NodeType.GREATER_OR_EQUALS_EXPRESSION:
    case NodeType.LESSER_THAN_EXPRESSION:
    case NodeType.LESSER_OR_EQUALS_EXPRESSION: {
      if (strategy.tryHandleYear) {
        const yr = strategy.tryHandleYear(node);
        if (yr) return yr;
      }
      return strategy.handleComparison(node as ComparisonNode, options);
    }

    case NodeType.AND_EXPRESSION: {
      const left = node.value.left;
      const right = node.value.right;

      if (strategy.tryHandleYearMonth) {
        const ym = strategy.tryHandleYearMonth(left, right) || strategy.tryHandleYearMonth(right, left);
        if (ym) return ym;
      }

      if (strategy.tryHandleDateRange) {
        const dr = strategy.tryHandleDateRange(left, right) || strategy.tryHandleDateRange(right, left);
        if (dr) return dr;
      }

      return strategy.and(
        convertNodeGeneric(left, options, strategy),
        convertNodeGeneric(right, options, strategy)
      );
    }

    case NodeType.OR_EXPRESSION:
      return strategy.or(
        convertNodeGeneric(node.value.left, options, strategy),
        convertNodeGeneric(node.value.right, options, strategy)
      );

    case NodeType.NOT_EXPRESSION:
      return strategy.not(convertNodeGeneric(node.value, options, strategy));

    case NodeType.METHOD_CALL_EXPRESSION:
    case NodeType.COMMON_EXPRESSION:
      return strategy.handleMethod(node, options);

    case NodeType.PAREN_EXPRESSION:
    case NodeType.BOOL_PAREN_EXPRESSION:
      return convertNodeGeneric(node.value, options, strategy);

    case NodeType.IN_EXPRESSION:
      return strategy.handleInExpression(node, options);

    default:
      throw new Error(`Unsupported AST node type: ${node.type}`);
  }
}

export function convertFilterGeneric<W>(
  odataFilterString: string,
  options: ConversionOptions,
  strategy: ConvertStrategy<W>,
  emptyWhere: () => W
): W {
  if (!odataFilterString || typeof odataFilterString !== 'string') {
    return emptyWhere();
  }

  try {
    const preprocessed = preprocessODataFilter(odataFilterString);
    const ast = odataParser.filter(preprocessed);
    const result = convertNodeGeneric(ast, options, strategy);
    return strategy.optimize ? strategy.optimize(result) : result;
  } catch (error) {
    if (strategy.fallback) {
      try {
        return strategy.fallback(odataFilterString, options);
      } catch {
        throw new Error(`Failed to parse OData filter: ${(error as Error).message}`);
      }
    }
    throw new Error(`Failed to parse OData filter: ${(error as Error).message}`);
  }
}
