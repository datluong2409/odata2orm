/**
 * Enums for OData to ORM conversion
 */

// Node type enums
export enum NodeType {
  // Comparison types
  EQUALS_EXPRESSION = 'EqualsExpression',
  NOT_EQUALS_EXPRESSION = 'NotEqualsExpression',
  GREATER_THAN_EXPRESSION = 'GreaterThanExpression',
  GREATER_OR_EQUALS_EXPRESSION = 'GreaterOrEqualsExpression',
  LESSER_THAN_EXPRESSION = 'LesserThanExpression',
  LESSER_OR_EQUALS_EXPRESSION = 'LesserOrEqualsExpression',

  // Logical types
  AND_EXPRESSION = 'AndExpression',
  OR_EXPRESSION = 'OrExpression',
  NOT_EXPRESSION = 'NotExpression',

  // Method types
  METHOD_CALL_EXPRESSION = 'MethodCallExpression',
  COMMON_EXPRESSION = 'CommonExpression',

  // Other types
  PAREN_EXPRESSION = 'ParenExpression',
  BOOL_PAREN_EXPRESSION = 'BoolParenExpression',
  IN_EXPRESSION = 'InExpression',
  FIRST_MEMBER_EXPRESSION = 'FirstMemberExpression',
  MEMBER_EXPRESSION = 'MemberExpression',
  PROPERTY_PATH_EXPRESSION = 'PropertyPathExpression',
  ODATA_IDENTIFIER = 'ODataIdentifier',

  // Arithmetic types
  MUL_EXPRESSION = 'MulExpression',
  DIV_EXPRESSION = 'DivExpression',
  ADD_EXPRESSION = 'AddExpression',
  SUB_EXPRESSION = 'SubExpression'
}

// Comparison operators enum
export enum ComparisonOperator {
  EQUALS = 'equals',
  NOT = 'not',
  GT = 'gt',
  GTE = 'gte',
  LT = 'lt',
  LTE = 'lte'
}

// OData method names enum
export enum ODataMethod {
  CONTAINS = 'contains',
  SUBSTRING_OF = 'substringof',
  STARTS_WITH = 'startswith',
  ENDS_WITH = 'endswith',
  INDEX_OF = 'indexof',
  TO_LOWER = 'tolower',
  TO_UPPER = 'toupper',
  TRIM = 'trim',
  CONCAT = 'concat',
  YEAR = 'year',
  MONTH = 'month',
  DAY = 'day',
  LENGTH = 'length',
  ROUND = 'round',
  FLOOR = 'floor',
  CEILING = 'ceiling'
}

// Prisma string modes enum
export enum PrismaStringMode {
  DEFAULT = 'default',
  INSENSITIVE = 'insensitive'
}

// Supported ORM enum
export enum SupportedOrm {
  PRISMA = 'prisma',
  TYPEORM = 'typeorm',
  SEQUELIZE = 'sequelize',
  MONGOOSE = 'mongoose'
}

// ORM Status enum
export enum OrmStatus {
  AVAILABLE = 'Available',
  COMING_SOON = 'Coming Soon'
}

// Comparison symbols enum
export enum ComparisonSymbol {
  EQUALS = '=',
  NOT_EQUALS = '!=',
  GREATER_THAN = '>',
  GREATER_OR_EQUALS = '>=',
  LESSER_THAN = '<',
  LESSER_OR_EQUALS = '<='
}

// Literal types enum
export enum LiteralType {
  STRING = 'string',
  BOOLEAN = 'boolean',
  NULL = 'null',
  DATETIME = 'datetime',
  GUID = 'guid',
  NUMBER = 'number'
}
