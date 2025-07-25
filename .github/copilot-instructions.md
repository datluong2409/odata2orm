# GitHub Copilot Instructions for odata2orm

This document provides context and guidelines for GitHub Copilot when working with the odata2orm project.

## Project Overview

**odata2orm** is a universal TypeScript library that converts OData query expressions to various ORM filters (Prisma, TypeORM, Sequelize, Mongoose) with full pagination support and abstract base class architecture.

## Key Features

- Multi-ORM support with abstract base class architecture
- OData filter expression parsing and conversion
- Complete pagination support with `$filter`, `$top`, `$skip`, `$orderby`, `$select`, `$count`
- Abstract base query builders for consistent API across ORMs
- TypeScript-first with comprehensive type definitions
- Modular architecture with adapter and factory patterns

## Architecture

### Core Components

1. **Adapters** (`src/adapters/`)
   - `base.ts` - Abstract base adapter class
   - `factory.ts` - Adapter factory for creating ORM-specific adapters
   - `prisma.ts` - Prisma ORM adapter (fully implemented)
   - `prisma-query-builder.ts` - Complete Prisma query builder with pagination support
   - `base-query-builder.ts` - Abstract base query builder for all ORMs
   - `query-builder-factory.ts` - Factory for creating query builders
   - `typeorm-query-builder.ts` - TypeORM query builder (framework ready)
   - `sequelize-query-builder.ts` - Sequelize query builder (framework ready)
   - `mongoose-query-builder.ts` - Mongoose query builder (framework ready)
   - Other adapters (typeorm.ts, sequelize.ts, mongoose.ts) - Filter conversion pending

2. **Converters** (`src/converters/`)
   - `comparison.ts` - Handles comparison operations (eq, ne, gt, lt, etc.)
   - `methods.ts` - Handles OData method calls (contains, startswith, etc.)
   - `date.ts` - Special date handling and optimization
   - `index.ts` - Main conversion entry point

3. **Types** (`src/types/`)
   - `index.ts` - Core type definitions
   - `odata-query.ts` - OData query parameter types

4. **Utils** (`src/utils/`)
   - `helpers.ts` - General utility functions
   - `optimizer.ts` - Query optimization functions
   - `fallback.ts` - Fallback parsing for edge cases
   - `odata-parser.ts` - OData parameter parsing utilities

5. **Enums** (`src/enums/`)
   - Defines all supported node types, operators, and ORM types

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

### Advanced Usage with Abstract Base Class
```typescript
import { BaseQueryBuilder, BaseQueryOptions } from 'odata2orm';

class CustomOrmQueryBuilder extends BaseQueryBuilder<CustomQueryOptions> {
  protected createEmptyQuery(): CustomQueryOptions { return {}; }
  protected setTake(query: CustomQueryOptions, take: number): void { query.limit = take; }
  protected setSkip(query: CustomQueryOptions, skip: number): void { query.offset = skip; }
  protected setOrderBy(query: CustomQueryOptions, orderBy: Record<string, 'asc' | 'desc'>): void {
    query.sort = Object.entries(orderBy).map(([field, dir]) => ({ [field]: dir }));
  }
  protected setSelect(query: CustomQueryOptions, select: Record<string, any>): void {
    query.fields = Object.keys(select);
  }
  protected createCountQuery(findQuery: CustomQueryOptions): CustomQueryOptions {
    return { where: findQuery.where };
  }
}
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

## Dependencies

### Runtime Dependencies
- `odata-v4-parser` - OData expression parsing

### Development Dependencies
- TypeScript - Language and compiler
- Jest - Testing framework
- ts-node - TypeScript execution
- rimraf - Clean build artifacts

## Build and Release

### Scripts
```bash
pnpm run build        # Clean and compile
pnpm run test         # Run all tests
pnpm run test:coverage # Run tests with coverage
pnpm run lint         # Type checking
pnpm run clean        # Clean build artifacts
```

### Release Process
1. Update version in package.json
2. Update CHANGELOG.md
3. Run full test suite
4. Build and verify dist/
5. Publish to npm

## Documentation

### Key Files
- `README.md` - Main documentation
- `PAGINATION.md` - Detailed pagination guide
- `DEVELOPMENT.md` - Development setup
- Examples in `examples/` directory

### Documentation Standards
- Provide code examples for all features
- Include both simple and complex use cases
- Document breaking changes clearly
- Maintain API reference documentation

## Future Roadmap

### Planned Features
- TypeORM adapter implementation
- Sequelize adapter implementation  
- Mongoose adapter implementation
- Advanced query optimization
- Nested field filtering improvements
- GraphQL integration

### Architecture Improvements
- Plugin system for custom converters
- Configuration management
- Better error reporting
- Performance monitoring

## Common Issues and Solutions

### OData Parsing Issues
- Use fallback parser for edge cases
- Validate input before parsing
- Provide meaningful error messages

### Type Safety
- Export all relevant types
- Use proper generics for flexibility
- Maintain strict TypeScript compliance

### Performance
- Profile complex queries
- Optimize OR conditions to IN operations
- Use efficient pagination patterns

## Contributing Guidelines

When contributing code:
1. Follow existing code style and patterns
2. Add comprehensive tests for new features
3. Update documentation accordingly
4. Maintain backward compatibility
5. Use meaningful commit messages
6. Add appropriate type definitions

This project follows semantic versioning and maintains high code quality standards.
