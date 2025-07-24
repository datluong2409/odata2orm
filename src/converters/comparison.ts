/**
 * Comparison operation handlers
 */

import { 
  ODataNode, 
  ComparisonNode, 
  ConversionOptions, 
  PrismaWhereClause, 
  ComparisonOperator,
  ComparisonType,
  ArithmeticOperator
} from '../types';
import { getFieldName, getLiteralValue, getComparisonSymbol } from '../utils/helpers';
import { NodeType, ODataMethod, ComparisonOperator as ComparisonOperatorEnum, PrismaStringMode } from '../enums';

/**
 * Handle comparison operators
 */
export function handleComparison(node: ComparisonNode, options: ConversionOptions = {}): PrismaWhereClause {
  let { left, right } = node.value;
  
  // Unwrap parentheses
  if (left.type === NodeType.PAREN_EXPRESSION || left.type === NodeType.BOOL_PAREN_EXPRESSION) {
    left = left.value;
  }
  
  // Handle arithmetic expressions
  if (left.type === NodeType.MUL_EXPRESSION || left.type === NodeType.DIV_EXPRESSION || 
      left.type === NodeType.ADD_EXPRESSION || left.type === NodeType.SUB_EXPRESSION) {
    return handleArithmeticComparison(node, left, right, options);
  }
  
  // Handle function calls in comparison
  if (left.type === NodeType.METHOD_CALL_EXPRESSION) {
    return handleFunctionComparison(node, left, right, options);
  }
  
  // Basic field comparison
  const field = getFieldName(left);
  const value = getLiteralValue(right);
  
  const operatorMap: Record<ComparisonType, ComparisonOperator> = {
    [NodeType.EQUALS_EXPRESSION]: ComparisonOperatorEnum.EQUALS,
    [NodeType.NOT_EQUALS_EXPRESSION]: ComparisonOperatorEnum.NOT,
    [NodeType.GREATER_THAN_EXPRESSION]: ComparisonOperatorEnum.GT,
    [NodeType.GREATER_OR_EQUALS_EXPRESSION]: ComparisonOperatorEnum.GTE,
    [NodeType.LESSER_THAN_EXPRESSION]: ComparisonOperatorEnum.LT,
    [NodeType.LESSER_OR_EQUALS_EXPRESSION]: ComparisonOperatorEnum.LTE
  };
  
  const operator = operatorMap[node.type as ComparisonType];
  if (!operator) {
    throw new Error(`Unsupported comparison operator: ${node.type}`);
  }
  
  // Handle null values
  if (value === null) {
    return operator === ComparisonOperatorEnum.EQUALS ? { [field]: null } : { [field]: { not: null } };
  }
  
  return { [field]: { [operator]: value } };
}

/**
 * Handle arithmetic expressions in comparison
 */
export function handleArithmeticComparison(
  node: ComparisonNode, 
  left: ODataNode, 
  right: ODataNode, 
  options: ConversionOptions
): PrismaWhereClause {
  const field = getFieldName(left.value.left);
  const operand = getLiteralValue(left.value.right);
  const threshold = getLiteralValue(right);
  
  const comparisonMap: Record<ComparisonType, string> = {
    [NodeType.LESSER_THAN_EXPRESSION]: ComparisonOperatorEnum.LT,
    [NodeType.LESSER_OR_EQUALS_EXPRESSION]: ComparisonOperatorEnum.LTE,
    [NodeType.GREATER_THAN_EXPRESSION]: ComparisonOperatorEnum.GT,
    [NodeType.GREATER_OR_EQUALS_EXPRESSION]: ComparisonOperatorEnum.GTE,
    [NodeType.EQUALS_EXPRESSION]: ComparisonOperatorEnum.EQUALS,
    [NodeType.NOT_EQUALS_EXPRESSION]: ComparisonOperatorEnum.NOT
  };
  
  const op = comparisonMap[node.type as ComparisonType];
  if (!op) {
    throw new Error(`Unsupported arithmetic comparison: ${node.type}`);
  }
  
  let adjustedThreshold: number;
  // Handle arithmetic with all comparison operators
  switch (left.type as ArithmeticOperator) {
    case NodeType.MUL_EXPRESSION:
      adjustedThreshold = threshold / operand;
      break;
    case NodeType.DIV_EXPRESSION:
      adjustedThreshold = threshold * operand;
      break;
    case NodeType.ADD_EXPRESSION:
      adjustedThreshold = threshold - operand;
      break;
    case NodeType.SUB_EXPRESSION:
      adjustedThreshold = threshold + operand;
      break;
    default:
      throw new Error(`Unsupported arithmetic operation: ${left.type}`);
  }
  
  // Special handling for NotEqualsExpression
  if (op === ComparisonOperatorEnum.NOT) {
    return { [field]: { not: { equals: adjustedThreshold } } };
  }
  
  return { [field]: { [op]: adjustedThreshold } };
}

/**
 * Handle function calls in comparison
 */
export function handleFunctionComparison(
  node: ComparisonNode, 
  left: ODataNode, 
  right: ODataNode, 
  options: ConversionOptions
): PrismaWhereClause {
  const { method, parameters } = left.value;
  
  switch (method) {
    case ODataMethod.YEAR:
      if (node.type === NodeType.EQUALS_EXPRESSION) {
        return handleYearEq(left, right);
      }
      throw new Error(`Unsupported year comparison: ${node.type}`);
      
    case ODataMethod.MONTH:
      if (node.type === NodeType.EQUALS_EXPRESSION) {
        return handleMonthEq(left, right);
      }
      throw new Error(`Unsupported month comparison: ${node.type}`);
      
    case ODataMethod.DAY:
      if (node.type === NodeType.EQUALS_EXPRESSION) {
        return handleDayEq(left, right);
      }
      throw new Error(`Unsupported day comparison: ${node.type}`);
    
    case ODataMethod.INDEX_OF:
      // indexof(field, 'text') ge 0 means contains
      const field = getFieldName(parameters[0]);
      const searchValue = getLiteralValue(parameters[1]);
      const threshold = getLiteralValue(right);
      
      if (node.type === NodeType.GREATER_OR_EQUALS_EXPRESSION && threshold === 0) {
        return { 
          [field]: { 
            contains: searchValue, 
            mode: options.caseSensitive ? PrismaStringMode.DEFAULT : PrismaStringMode.INSENSITIVE 
          } 
        };
      } else if (node.type === NodeType.EQUALS_EXPRESSION && threshold === -1) {
        return { 
          NOT: { 
            [field]: { 
              contains: searchValue, 
              mode: options.caseSensitive ? PrismaStringMode.DEFAULT : PrismaStringMode.INSENSITIVE 
            } 
          } 
        };
      }
      throw new Error(`Unsupported indexof comparison: ${node.type} with threshold ${threshold}`);
      
    case ODataMethod.LENGTH:
      return handleLengthComparison(node, left, right);
      
    case ODataMethod.ROUND:
    case ODataMethod.FLOOR:
    case ODataMethod.CEILING:
      return handleMathFunctionComparison(node, left, right, method);
      
    default:
      throw new Error(`Unsupported function in comparison: ${method}`);
  }
}

/**
 * Handle year(...) eq value
 */
function handleYearEq(node: ODataNode, literalNode: ODataNode): PrismaWhereClause {
  const { parameters } = node.value;
  const field = getFieldName(parameters[0]);
  const year = getLiteralValue(literalNode);
  
  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year + 1, 0, 1));
  
  return { [field]: { gte: start, lt: end } };
}

/**
 * Handle month(...) eq value
 */
function handleMonthEq(node: ODataNode, literalNode: ODataNode): PrismaWhereClause {
  const { parameters } = node.value;
  const field = getFieldName(parameters[0]);
  const month = getLiteralValue(literalNode);
  
  // Use raw SQL for month extraction
  throw new Error('Month extraction requires raw SQL. Use prisma.$queryRaw');
}

/**
 * Handle day(...) eq value
 */
function handleDayEq(node: ODataNode, literalNode: ODataNode): PrismaWhereClause {
  const { parameters } = node.value;
  const field = getFieldName(parameters[0]);
  const day = getLiteralValue(literalNode);
  
  // Similar to month, needs raw SQL
  throw new Error('Day extraction requires raw SQL. Use prisma.$queryRaw');
}

/**
 * Handle length function comparison
 */
function handleLengthComparison(node: ComparisonNode, left: ODataNode, right: ODataNode): PrismaWhereClause {
  const field = getFieldName(left.value.parameters[0]);
  const threshold = getLiteralValue(right);
  
  // Prisma doesn't support length comparison directly
  throw new Error(`Length comparison requires raw SQL: SELECT * FROM table WHERE LENGTH(${field}) ${getComparisonSymbol(node.type as ComparisonType)} ${threshold}`);
}

/**
 * Handle math functions
 */
function handleMathFunctionComparison(node: ComparisonNode, left: ODataNode, right: ODataNode, method: string): PrismaWhereClause {
  const field = getFieldName(left.value.parameters[0]);
  const value = getLiteralValue(right);
  
  throw new Error(`Math function ${method} requires raw SQL implementation`);
}
