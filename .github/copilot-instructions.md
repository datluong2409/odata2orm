# GitHub Copilot Instructions for odata2orm

**odata2orm** is a universal TypeScript library that converts OData v4 query expressions to various ORM filters with schema validation and nested query support.

## 🎯 Key Features

- **Multi-ORM Support**: Prisma (complete), TypeORM/Sequelize/Mongoose (framework ready)
- **OData v4 Compliance**: Nested navigation, collection filters (any/all), lambda expressions
- **Schema Validation**: Zod integration for type-safe field validation and nested object support
- **Complete Pagination**: Full OData query parameters ($filter, $top, $skip, $orderby, $select, $count)
- **Abstract Base Classes**: Consistent API across ORMs with BaseQueryBuilder
- **Nested Query Support**: Deep object filtering and selection with schema validation
- **TypeScript-First**: Full type definitions with IntelliSense support

## 🏗️ Architecture

### Core Components

1. **Adapters** (`src/adapters/`)
   - `base.ts` - Abstract base adapter class
   - `prisma.ts` - Complete Prisma implementation
   - `prisma-query-builder.ts` - Enhanced Prisma query builder with schema support
   - `base-query-builder.ts` - Abstract base for all ORM query builders
   - Other ORMs (typeorm, sequelize, mongoose) - Framework ready

2. **Schema Validation** (`src/types/schema.ts`, `src/utils/`)
   - `schema-validator.ts` - Zod schema validation and field path validation
   - `nested-parser.ts` - OData v4 nested navigation parsing
   - `field-path.ts` - Enhanced field path handling for nested objects

3. **Converters** (`src/converters/`)
   - `comparison.ts` - Handles comparison operations with nested field support
   - `methods.ts` - OData method calls (contains, startswith, etc.)
   - `date.ts` - Date handling and optimization
   - `index.ts` - Main conversion entry point with enhanced fallback parsing

4. **Types** (`src/types/`)
   - `index.ts` - Core type definitions
   - `odata-query.ts` - OData query parameter types
   - `schema.ts` - Schema validation types and interfaces

5. **Utils** (`src/utils/`)
   - `helpers.ts` - General utility functions
   - `odata-parser.ts` - Standard OData parameter parsing
   - `nested-parser.ts` - Enhanced nested navigation parsing
   - `schema-validator.ts` - Zod schema validation utilities
   - `field-path.ts` - Nested field path handling
   - `fallback.ts` - Enhanced fallback parsing with nested support

## 🎯 OData v4 Nested Query Support

### Supported Navigation Syntax
```typescript
// Basic navigation
$filter=Category/Name eq 'Electronics'

// Multi-level navigation  
$filter=Order/Customer/Address/City eq 'Seattle'

// Collection navigation with any/all
$filter=Orders/any(o: o/Total gt 100)
$filter=Products/all(p: p/Price lt 50)

// Complex nested selections
$select=name,profile(avatar,address(city,country)),orders(total,status)
```

### Schema Validation with Zod
```typescript
import { z } from 'zod';
import { PrismaQueryBuilder } from 'odata2orm';

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  profile: z.object({
    avatar: z.string(),
    address: z.object({
      city: z.string(),
      country: z.string()
    })
  }),
  orders: z.array(z.object({
    total: z.number(),
    status: z.string()
  }))
});

const builder = new PrismaQueryBuilder({
  schema: UserSchema,
  enableNestedQueries: true,
  allowAllFields: false
});
```

### Implementation Requirements
- **Navigation Path Parsing**: Handle `/` delimited property paths
- **Lambda Expression Support**: Parse `any()/all()` with variable binding
- **Schema Validation**: Validate paths against Zod schema structure
- **Nested Prisma Generation**: Convert to proper nested where/select clauses
- **Type Safety**: Full TypeScript support with schema inference

## Coding Guidelines

### TypeScript Standards
- Use strict TypeScript with proper type definitions
- Prefer interfaces over types for object structures
- Export types alongside implementations
- Use generics where appropriate for flexibility

### Naming Conventions
- Classes: PascalCase (e.g., `PrismaAdapter`, `PrismaQueryBuilder`)
- Functions: camelCase (e.g., `convertToPrisma`, `buildPrismaQuery`)
- Constants: UPPER_SNAKE_CASE (e.g., `NODE_TYPE`, `COMPARISON_OPERATOR`)
- Files: kebab-case for utilities, PascalCase for classes

### Code Organization
- Keep adapters separate for each ORM
- Use the adapter pattern for extensibility
- Separate concerns: parsing, conversion, optimization
- Maintain backward compatibility

### Error Handling
- Use descriptive error messages
- Provide fallback mechanisms where possible
- Handle edge cases gracefully
- Include context in error messages

## OData Support

### Supported Operators
```typescript
// Comparison
eq, ne, gt, ge, lt, le

// Logical  
and, or, not

// String functions
contains(field, 'value')
startswith(field, 'value')
endswith(field, 'value')
tolower(field)
toupper(field)

// Date functions
year(dateField)
month(dateField)
day(dateField)

// Arithmetic
add, sub, mul, div
```

### Query Parameters
```typescript
interface ODataQueryParams {
  $filter?: string;    // Filter expression
  $top?: number;       // Limit results
  $skip?: number;      // Skip results (offset)
  $orderby?: string;   // Sort order
  $select?: string;    // Select fields
  $count?: boolean;    // Include count
}
```

## API Patterns

### Legacy API (Backward Compatible)
```typescript
import { convertToPrisma } from 'odata2orm';
const where = convertToPrisma("name eq 'John'");
```

### New Pagination API with Abstract Base Class
```typescript
import { BaseQueryBuilder, PrismaQueryBuilder, TypeOrmQueryBuilder } from 'odata2orm';

// Using specific ORM builder
const prismaBuilder = new PrismaQueryBuilder();
const query = prismaBuilder.buildQuery(params);

// Using factory pattern
import { QueryBuilderFactory, SupportedOrm } from 'odata2orm';
const builder = QueryBuilderFactory.createQueryBuilder(SupportedOrm.PRISMA);

// Generic function that works with any ORM
function paginateData<T>(
  builder: BaseQueryBuilder<any>,
  params: ODataQueryParams,
  dataFetcher: (query: any) => Promise<T[]>,
  counter: (query: any) => Promise<number>
) {
  const { findQuery, countQuery } = builder.buildPaginationQuery(params);
  // ... implementation
}
```

### Schema-Validated Nested Queries (NEW!)
```typescript
import { z } from 'zod';
import { PrismaQueryBuilder, PrismaQueryBuilderOptions } from 'odata2orm';

const UserSchema = z.object({
  id: z.string(),
  profile: z.object({
    avatar: z.string(),
    address: z.object({ city: z.string() })
  }),
  orders: z.array(z.object({ total: z.number() }))
});

const options: PrismaQueryBuilderOptions = {
  schema: UserSchema,
  enableNestedQueries: true,
  allowAllFields: false
};

const builder = new PrismaQueryBuilder(options);

// Supports nested navigation and validation
const query = builder.buildQuery({
  $filter: "profile/address/city eq 'Seattle' and orders/any(o: o/total gt 100)",
  $select: "id,profile(avatar,address(city)),orders(total)",
  $orderby: "profile/address/city desc"
});
```

## Testing Guidelines

### Test Structure
- Unit tests for individual components
- Integration tests for complete workflows
- Edge case testing for parsing
- Backward compatibility tests

### Test Files
- `tests/pagination.test.ts` - Pagination features
- `tests/base-query-builder.test.ts` - Abstract base class functionality
- `tests/query-builders.test.ts` - ORM-specific query builders
- `tests/comprehensive.test.ts` - Core functionality
- `tests/integration.test.ts` - End-to-end scenarios
- `tests/caseSensitive.test.ts` - Case sensitivity handling
- `tests/nested-schema.test.ts` - Schema validation and nested queries (NEW!)

### Test Patterns
```typescript
describe('Feature Name', () => {
  it('should handle basic case', () => {
    const result = functionUnderTest(input);
    expect(result).toEqual(expectedOutput);
  });
  
  it('should handle edge cases', () => {
    // Test null/undefined/empty inputs
    // Test malformed inputs
    // Test boundary conditions
  });
});
```

## Common Patterns

### Adding New ORM Support
1. Create adapter class extending `BaseOrmAdapter`
2. Create query builder class extending `BaseQueryBuilder`
3. Implement 5 abstract methods in query builder:
   - `createEmptyQuery()`
   - `setTake()`
   - `setSkip()`
   - `setOrderBy()`
   - `setSelect()`
   - `createCountQuery()`
4. Implement `convert()` and `convertNode()` methods in adapter
5. Add to factories (`AdapterFactory`, `QueryBuilderFactory`)
6. Update enums and types
7. Add comprehensive tests
8. Update documentation

### Adding New OData Functions
1. Add to method handlers in `converters/methods.ts`
2. Update type definitions
3. Add test cases
4. Document in README

### Performance Considerations
- Use query optimization (e.g., OR to IN conversion)
- Minimize database queries with efficient pagination
- Cache parsing results where appropriate
- Profile complex filter expressions
