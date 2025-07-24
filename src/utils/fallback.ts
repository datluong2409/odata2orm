/**
 * Fallback parser for special OData cases
 */

import { ConversionOptions, PrismaWhereClause } from '../types';

/**
 * Fallback parser for special cases
 */
export function fallbackParser(filterString: string, options: ConversionOptions = {}): PrismaWhereClause {
  // Handle arithmetic expressions
  const arithmeticPattern = /(\w+)\s*([*\/+-])\s*([\d.]+)\s+(eq|ne|gt|ge|lt|le)\s+([\d.]+)/i;
  const arithmeticMatch = arithmeticPattern.exec(filterString);
  if (arithmeticMatch) {
    const [, field, operator, operand, comparison, target] = arithmeticMatch;
    const operandNum = parseFloat(operand);
    const targetNum = parseFloat(target);
    
    let resultValue: number;
    switch (operator) {
      case '*':
        resultValue = targetNum / operandNum; // Price * 1.1 gt 100 => Price gt 90.91
        break;
      case '/':
        resultValue = targetNum * operandNum; // Total / 2 eq 50 => Total eq 100
        break;
      case '+':
        resultValue = targetNum - operandNum; // Quantity + 5 le 20 => Quantity le 15
        break;
      case '-':
        resultValue = targetNum + operandNum; // Quantity - 5 ge 10 => Quantity ge 15
        break;
      default:
        throw new Error(`Unsupported arithmetic operator: ${operator}`);
    }
    
    const prismaOp = {
      'eq': 'equals',
      'ne': 'not',
      'gt': 'gt',
      'ge': 'gte',
      'lt': 'lt',
      'le': 'lte'
    }[comparison];
    
    if (!prismaOp) {
      throw new Error(`Unsupported comparison operator: ${comparison}`);
    }
    
    return { [field]: { [prismaOp as string]: Math.round(resultValue * 100) / 100 } };
  }
  
  // Handle datetime literals that might not be properly quoted
  const datetimePattern = /(datetime)'([^']+)'/gi;
  let processed = filterString.replace(datetimePattern, "'$2'");
  
  // Handle IN operations manually
  const inPattern = /(\w+)\s+in\s*\(([^)]+)\)/gi;
  const inMatch = inPattern.exec(filterString);
  if (inMatch) {
    const [, field, values] = inMatch;
    const valueList = values.split(',').map(v => {
      const trimmed = v.trim();
      // Try to parse as number, otherwise keep as string
      const num = Number(trimmed);
      return isNaN(num) ? trimmed.replace(/['"]/g, '') : num;
    });
    return { [field]: { in: valueList } };
  }
  
  throw new Error('Fallback parsing failed');
}
