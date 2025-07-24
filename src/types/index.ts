/**
 * Type definitions for OData to Prisma converter
 */

import { 
  NodeType,
  ComparisonOperator as ComparisonOperatorEnum,
  ODataMethod
} from '../enums';

export interface ConversionOptions {
  caseSensitive?: boolean;
  [key: string]: any;
}

export interface PrismaWhereClause {
  [key: string]: any;
  AND?: PrismaWhereClause[];
  OR?: PrismaWhereClause[];
  NOT?: PrismaWhereClause | PrismaWhereClause[];
}

export interface ODataNode {
  type: string;
  value?: any;
  raw?: string;
}

export interface MethodCallNode extends ODataNode {
  value: {
    method: string;
    parameters: ODataNode[];
  };
}

export interface ComparisonNode extends ODataNode {
  value: {
    left: ODataNode;
    right: ODataNode;
  };
}

export interface LogicalNode extends ODataNode {
  value: {
    left: ODataNode;
    right: ODataNode;
  };
}

export interface LiteralNode extends ODataNode {
  raw: string;
}

export interface FieldNode extends ODataNode {
  value: {
    name: string;
  };
}

// Use enum values as types for better type safety
export type ComparisonOperator = ComparisonOperatorEnum;

export type ArithmeticOperator = 
  | NodeType.MUL_EXPRESSION 
  | NodeType.DIV_EXPRESSION 
  | NodeType.ADD_EXPRESSION 
  | NodeType.SUB_EXPRESSION;

export type ComparisonType = 
  | NodeType.EQUALS_EXPRESSION
  | NodeType.NOT_EQUALS_EXPRESSION
  | NodeType.GREATER_THAN_EXPRESSION
  | NodeType.GREATER_OR_EQUALS_EXPRESSION
  | NodeType.LESSER_THAN_EXPRESSION
  | NodeType.LESSER_OR_EQUALS_EXPRESSION;

export type LogicalType = 
  | NodeType.AND_EXPRESSION 
  | NodeType.OR_EXPRESSION 
  | NodeType.NOT_EXPRESSION;

export type MethodType = 
  | NodeType.METHOD_CALL_EXPRESSION 
  | NodeType.COMMON_EXPRESSION;

export type NodeTypeUnion = 
  | ComparisonType 
  | LogicalType 
  | MethodType 
  | NodeType.PAREN_EXPRESSION 
  | NodeType.BOOL_PAREN_EXPRESSION 
  | NodeType.IN_EXPRESSION;
