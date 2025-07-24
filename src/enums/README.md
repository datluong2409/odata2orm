# Enums Documentation

This directory contains all the TypeScript enums used throughout the OData2ORM library. Using enums instead of string literals provides better type safety, IntelliSense support, and maintainability.

## Available Enums

### NodeType
Defines all AST node types used in OData parsing:
- **Comparison types**: `EQUALS_EXPRESSION`, `NOT_EQUALS_EXPRESSION`, etc.
- **Logical types**: `AND_EXPRESSION`, `OR_EXPRESSION`, `NOT_EXPRESSION`
- **Method types**: `METHOD_CALL_EXPRESSION`, `COMMON_EXPRESSION`
- **Other types**: `PAREN_EXPRESSION`, `IN_EXPRESSION`, etc.

### ComparisonOperator
Prisma comparison operators:
- `EQUALS`, `NOT`, `GT`, `GTE`, `LT`, `LTE`

### ODataMethod
All supported OData method names:
- String methods: `CONTAINS`, `STARTS_WITH`, `ENDS_WITH`, etc.
- Date methods: `YEAR`, `MONTH`, `DAY`
- Math methods: `ROUND`, `FLOOR`, `CEILING`

### PrismaStringMode
Prisma string matching modes:
- `DEFAULT` - Case sensitive
- `INSENSITIVE` - Case insensitive

### SupportedOrm
Available ORM adapters:
- `PRISMA`, `TYPEORM`, `SEQUELIZE`, `MONGOOSE`

### OrmStatus
Status of ORM implementations:
- `AVAILABLE`, `COMING_SOON`

### ComparisonSymbol
Human-readable comparison symbols for error messages:
- `EQUALS` = '=', `NOT_EQUALS` = '!=', etc.

### LiteralType
Types of literal values in OData:
- `STRING`, `BOOLEAN`, `NULL`, `DATETIME`, `GUID`, `NUMBER`

## Benefits of Using Enums

1. **Type Safety**: Prevents typos and invalid values
2. **IntelliSense**: Better IDE support with autocomplete
3. **Refactoring**: Easy to rename values across the codebase
4. **Maintainability**: Central place to manage constants
5. **Documentation**: Self-documenting code with clear intent

## Usage Example

```typescript
import { NodeType, ODataMethod, ComparisonOperator } from '../enums';

// Instead of: expr.type === 'MethodCallExpression'
if (expr.type === NodeType.METHOD_CALL_EXPRESSION) {
  // Handle method call
}

// Instead of: method === 'contains'
if (method === ODataMethod.CONTAINS) {
  // Handle contains method
}

// Instead of: operator: 'equals'
const operator = ComparisonOperator.EQUALS;
```

This approach makes the code more maintainable and less prone to errors.
