# OData2ORM

[![npm version](https://badge.fury.io/js/odata2orm.svg)](https://badge.fury.io/js/odata2orm)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

A universal TypeScript library that converts OData filter expressions to various ORM filters (Prisma, TypeORM, Sequelize, Mongoose). Features **complete pagination support** with abstract base class architecture for consistent API across all ORMs.

## ✨ Features

- 🌐 **Multi-ORM Support** - Prisma (complete), TypeORM/Sequelize/Mongoose (framework ready)
- 🏗️ **Abstract Base Class** - Consistent API across all ORMs with BaseQueryBuilder
- 📝 **Full TypeScript Support** - Complete type definitions and IntelliSense
- 🔄 **OData Conversion** - Seamless filter translation
- 📊 **Comprehensive Operators** - All comparison and logical operators
- 🔍 **String Functions** - contains, startswith, endswith, indexof support
- 📅 **Date Operations** - Smart date range handling and optimization
- 🧮 **Arithmetic Expressions** - Mathematical operations in filters
- 📋 **IN Operator** - Automatic OR to IN optimization
- 📄 **Complete Pagination** - Full OData query parameter support ($filter, $top, $skip, $orderby, $select, $count)
- 🏭 **Factory Pattern** - QueryBuilderFactory for creating ORM-specific builders
- 🎯 **Case Sensitivity** - Configurable string matching
- ⚡ **Query Optimization** - Intelligent query pattern optimization
- 🛡️ **Robust Error Handling** - Comprehensive error handling with fallbacks
- 🏗️ **Modular Architecture** - Clean, maintainable codebase

## 🎯 ORM Support Status

| ORM | Status | Description |
|-----|--------|-------------|
| **Prisma** | ✅ **Complete** | Fully implemented with all features including pagination |
| **TypeORM** | 🏗️ **Framework Ready** | Abstract implementation complete, needs filter logic |
| **Sequelize** | 🏗️ **Framework Ready** | Abstract implementation complete, needs filter logic |
| **Mongoose** | 🏗️ **Framework Ready** | Abstract implementation complete, needs filter logic |

## 📦 Installation

```bash
# Using npm
npm install odata2orm

# Using pnpm (recommended)
pnpm add odata2orm

# Using yarn
yarn add odata2orm
```

## 🚀 Quick Start

### Method 1: Simple Filter Conversion

```typescript
import { convertToPrisma } from 'odata2orm';

// Convert OData filter to Prisma where clause
const whereClause = convertToPrisma("name eq 'John' and age gt 25");
// Result: { AND: [{ name: { equals: 'John' }}, { age: { gt: 25 }}] }
```

### Method 2: Complete Query Building (NEW! 🎉)

```typescript
import { buildPrismaQuery, buildPrismaPagination } from 'odata2orm';

// Build complete Prisma query from OData parameters
const params = {
  $filter: "department eq 'IT' and salary gt 50000",
  $top: 20,
  $skip: 40,
  $orderby: 'salary desc, name asc',
  $select: 'id,name,salary,department',
  $count: true
};

// Single query
const query = buildPrismaQuery(params);
// Use: prisma.user.findMany(query)

// Pagination queries
const { findQuery, countQuery } = buildPrismaPagination(params);
// Use: 
// const [data, total] = await Promise.all([
//   prisma.user.findMany(findQuery),
//   prisma.user.count(countQuery)
// ]);
```

### Method 3: Advanced Usage with PrismaQueryBuilder

```typescript
import { PrismaQueryBuilder } from 'odata2orm';

const builder = new PrismaQueryBuilder();
const { findQuery, countQuery } = builder.buildPaginationQuery(params);

// Execute queries
const [users, total] = await Promise.all([
  prisma.user.findMany(findQuery),
  prisma.user.count(countQuery)
]);

// Process result with pagination metadata
const result = builder.processPaginationResult(users, total, params);
// Result includes: data, count, hasNext, hasPrevious, totalPages, currentPage
```

### Method 3: Advanced Usage with Abstract Base Class

```typescript
import { BaseQueryBuilder, PrismaQueryBuilder, QueryBuilderFactory } from 'odata2orm';

// Using factory pattern
const builder = QueryBuilderFactory.createQueryBuilder('prisma');
const { findQuery, countQuery } = builder.buildPaginationQuery(params);

// Generic function that works with any ORM
async function paginateData<T>(
  builder: BaseQueryBuilder<any>,
  params: ODataQueryParams,
  dataFetcher: (query: any) => Promise<T[]>,
  counter: (query: any) => Promise<number>
) {
  const { findQuery, countQuery } = builder.buildPaginationQuery(params);
  const [data, total] = await Promise.all([
    dataFetcher(findQuery),
    counter(countQuery)
  ]);
  return builder.processPaginationResult(data, total, params);
}

// Works with Prisma
const prismaBuilder = new PrismaQueryBuilder();
const result = await paginateData(
  prismaBuilder,
  params,
  (query) => prisma.user.findMany(query),
  (query) => prisma.user.count(query)
);

// Same function will work with TypeORM when available:
// const typeormBuilder = new TypeOrmQueryBuilder();
// const result = await paginateData(
//   typeormBuilder,
//   params,
//   (query) => userRepository.find(query),
//   (query) => userRepository.count(query)
// );
```

### Method 4: Custom ORM Implementation

```typescript
import { BaseQueryBuilder, BaseQueryOptions } from 'odata2orm';

interface CustomOrmQueryOptions extends BaseQueryOptions {
  filter?: any;
  limit?: number;
  offset?: number;
  sort?: Array<{ field: string; direction: 'ASC' | 'DESC' }>;
  fields?: string[];
}

class CustomOrmQueryBuilder extends BaseQueryBuilder<CustomOrmQueryOptions> {
  protected createEmptyQuery(): CustomOrmQueryOptions { return {}; }
  protected setTake(query: CustomOrmQueryOptions, take: number): void { 
    query.limit = take; 
  }
  protected setSkip(query: CustomOrmQueryOptions, skip: number): void { 
    query.offset = skip; 
  }
  protected setOrderBy(query: CustomOrmQueryOptions, orderBy: Record<string, 'asc' | 'desc'>): void {
    query.sort = Object.entries(orderBy).map(([field, direction]) => ({
      field,
      direction: direction.toUpperCase() as 'ASC' | 'DESC'
    }));
  }
  protected setSelect(query: CustomOrmQueryOptions, select: Record<string, any>): void {
    query.fields = Object.keys(select).filter(key => select[key] === true);
  }
  protected createCountQuery(findQuery: CustomOrmQueryOptions): CustomOrmQueryOptions {
    return { filter: findQuery.where };
  }
}
```

### Method 5: Legacy API (Backward Compatible)

```typescript
import { 
  convertToPrisma, 
  convertToTypeORM, 
  convertToSequelize, 
  convertToMongoose 
} from 'odata2orm';

// Prisma (Available now)
const prismaFilter = convertToPrisma("name eq 'John' and age gt 25");
console.log(prismaFilter);
// Output: { AND: [{ name: { equals: 'John' } }, { age: { gt: 25 } }] }

// TypeORM (Coming soon)
try {
  const typeormFilter = convertToTypeORM("name eq 'John'");
} catch (error) {
  console.log(error.message); // "TypeORM adapter is coming soon!"
}
```

### Method 2: Factory Pattern

```typescript
import { AdapterFactory, SupportedOrm } from 'odata2orm';

// Create adapter
const prismaAdapter = AdapterFactory.createAdapter('prisma');
const filter = prismaAdapter.convert("name eq 'John' and age gt 25");

// Get adapter info
console.log(prismaAdapter.getOrmName()); // "Prisma"
console.log(prismaAdapter.getSupportedFeatures());

// Get all supported ORMs
const supportedOrms = AdapterFactory.getSupportedOrms();
console.log(supportedOrms); // ['prisma', 'typeorm', 'sequelize', 'mongoose']
```

### Method 3: Legacy API (Prisma only)

```typescript
import { convert, ConversionOptions } from 'odata2orm';

// Basic conversion (defaults to Prisma)
const whereClause = convert("Name eq 'John' and Age gt 25");

// With options
const options: ConversionOptions = { caseSensitive: true };
const result = convert("contains(Name, 'John')", options);
```

## 💡 Usage Examples

### Prisma Examples
```javascript
const { convert } = require('odata2prisma');

const filter = "Name eq 'John' and Age gt 25";
const whereClause = convert(filter);

const users = await prisma.user.findMany({
  where: whereClause
});
```

## 🏗️ Abstract Base Class Architecture

The library features a powerful abstract base class architecture that provides consistent API across all ORMs:

### BaseQueryBuilder<T>

All ORM query builders extend from `BaseQueryBuilder<T>` which provides:

- **Consistent API**: Same methods across all ORMs
- **Type Safety**: Generic type support for ORM-specific query formats
- **Shared Logic**: Pagination, result processing, and utility methods
- **Easy Extension**: Only 5 abstract methods to implement for new ORMs

### Abstract Methods to Implement

When creating a new ORM query builder, implement these 5 methods:

```typescript
class YourOrmQueryBuilder extends BaseQueryBuilder<YourQueryOptions> {
  // 1. Create empty query object
  protected createEmptyQuery(): YourQueryOptions { return {}; }
  
  // 2. Set limit/take parameter
  protected setTake(query: YourQueryOptions, take: number): void { 
    query.limit = take; 
  }
  
  // 3. Set offset/skip parameter  
  protected setSkip(query: YourQueryOptions, skip: number): void { 
    query.offset = skip; 
  }
  
  // 4. Set sorting/orderBy parameter
  protected setOrderBy(query: YourQueryOptions, orderBy: Record<string, 'asc' | 'desc'>): void {
    query.sort = orderBy;
  }
  
  // 5. Set field selection parameter
  protected setSelect(query: YourQueryOptions, select: Record<string, any>): void {
    query.fields = Object.keys(select);
  }
  
  // 6. Create count query (remove pagination/selection)
  protected createCountQuery(findQuery: YourQueryOptions): YourQueryOptions {
    return { where: findQuery.where };
  }
}
```

### Shared Methods (Already Implemented)

Every query builder automatically gets these methods:

```typescript
// Build complete query from OData parameters
const query = builder.buildQuery(params);

// Build separate find and count queries for pagination  
const { findQuery, countQuery } = builder.buildPaginationQuery(params);

// Process results with pagination metadata
const result = builder.processPaginationResult(data, total, params);

// Get filter clause only
const whereClause = builder.getWhereClause(filterString);
```

### QueryBuilderFactory

Create query builders for any ORM:

```typescript
import { QueryBuilderFactory, SupportedOrm } from 'odata2orm';

// Create builder for specific ORM
const prismaBuilder = QueryBuilderFactory.createQueryBuilder(SupportedOrm.PRISMA);
const typeormBuilder = QueryBuilderFactory.createQueryBuilder(SupportedOrm.TYPEORM);

// Get information about available builders
const info = QueryBuilderFactory.getQueryBuilderInfo();
```

## 📖 API Reference

### `convert(filterString, options?)`

Converts an OData filter string to a Prisma where clause.

#### Parameters
- `filterString: string` - The OData filter expression
- `options?: ConversionOptions` - Optional configuration

#### Returns
- `PrismaWhereClause` - Prisma-compatible where object

#### Options
```typescript
interface ConversionOptions {
  caseSensitive?: boolean; // Default: false
}
```

## 🔧 Supported Operations

### Comparison Operators

| OData | Prisma | Example |
|-------|--------|---------|
| `eq` | `equals` | `Name eq 'John'` → `{ Name: { equals: 'John' } }` |
| `ne` | `not` | `Age ne 25` → `{ Age: { not: 25 } }` |
| `gt` | `gt` | `Age gt 18` → `{ Age: { gt: 18 } }` |
| `ge` | `gte` | `Age ge 18` → `{ Age: { gte: 18 } }` |
| `lt` | `lt` | `Age lt 65` → `{ Age: { lt: 65 } }` |
| `le` | `lte` | `Age le 65` → `{ Age: { lte: 65 } }` |

### Logical Operators

```typescript
// AND - Multiple conditions must be true
convert("Name eq 'John' and Age gt 25")
// Result: { AND: [{ Name: { equals: 'John' } }, { Age: { gt: 25 } }] }

// OR - At least one condition must be true
convert("Name eq 'John' or Name eq 'Jane'")
// Result: { Name: { in: ['John', 'Jane'] } } // Automatically optimized!

// NOT - Negation of condition
convert("not (Age lt 18)")
// Result: { NOT: { Age: { lt: 18 } } }
```

### String Functions

```typescript
// Contains (case-insensitive by default)
convert("contains(Name, 'john')")
// Result: { Name: { contains: 'john', mode: 'insensitive' } }

// Starts with
convert("startswith(Name, 'J')")
// Result: { Name: { startsWith: 'J', mode: 'insensitive' } }

// Ends with
convert("endswith(Email, '.com')")
// Result: { Email: { endsWith: '.com', mode: 'insensitive' } }

// Index of (position-based search)
convert("indexof(Name, 'oh') ge 0")
// Result: { Name: { contains: 'oh' } }

// Case-sensitive string operations
convert("contains(Name, 'John')", { caseSensitive: true })
// Result: { Name: { contains: 'John', mode: 'default' } }
```

### Date & Time Functions

```typescript
// Year extraction
convert("year(CreatedAt) eq 2023")
// Result: { CreatedAt: { gte: '2023-01-01T00:00:00.000Z', lt: '2024-01-01T00:00:00.000Z' } }

// Smart year + month combination
convert("year(CreatedAt) eq 2023 and month(CreatedAt) eq 12")
// Result: { CreatedAt: { gte: '2023-12-01T00:00:00.000Z', lt: '2024-01-01T00:00:00.000Z' } }

// Date range detection
convert("CreatedAt ge datetime'2023-01-01' and CreatedAt lt datetime'2024-01-01'")
// Result: { CreatedAt: { gte: '2023-01-01T00:00:00.000Z', lt: '2024-01-01T00:00:00.000Z' } }
```

### Arithmetic Expressions

```typescript
// Mathematical operations in comparisons
convert("Price * 1.1 gt 100")
// Result: { Price: { gt: 90.91 } } // Automatically calculated

convert("Quantity + 5 le 20")
// Result: { Quantity: { lte: 15 } }

convert("Total / 2 eq 50")
// Result: { Total: { equals: 100 } }
```

### IN Operations

```typescript
// Explicit IN syntax
convert("CategoryId in (1,2,3)")
// Result: { CategoryId: { in: [1, 2, 3] } }

// Automatic OR to IN optimization
convert("Status eq 'active' or Status eq 'pending' or Status eq 'completed'")
// Result: { Status: { in: ['active', 'pending', 'completed'] } }
```

## 💡 Advanced Examples

### Complex Nested Expressions
```typescript
const complexFilter = `
  (Name eq 'John' or Name eq 'Jane') and 
  Age gt 18 and 
  contains(Email, '@company.com') and
  year(CreatedAt) eq 2023
`;

const whereClause = convert(complexFilter);
// Intelligent handling of nested conditions with optimization
```

### Real-world Usage Patterns
```typescript
// API endpoint with OData filtering
app.get('/api/users', async (req, res) => {
  const { $filter } = req.query;
  
  try {
    const whereClause = $filter ? convert($filter) : {};
    
    const users = await prisma.user.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' }
    });
    
    res.json(users);
  } catch (error) {
    res.status(400).json({ error: 'Invalid filter syntax' });
  }
});

// Dynamic filtering in applications
const buildUserQuery = (filters: UserFilters) => {
  const odataFilter = [
    filters.name && `contains(name, '${filters.name}')`,
    filters.minAge && `age ge ${filters.minAge}`,
    filters.department && `department eq '${filters.department}'`,
    filters.active !== undefined && `isActive eq ${filters.active}`
  ].filter(Boolean).join(' and ');
  
  return convert(odataFilter);
};
```

## ⚡ Performance Optimizations

### Automatic Query Optimization
- **OR to IN Conversion**: Multiple OR conditions on the same field are automatically converted to efficient IN operations
- **Date Range Optimization**: Year/month combinations are converted to optimized date ranges
- **Redundant Condition Elimination**: Duplicate or redundant conditions are automatically removed

### Smart Parsing
- **Fallback Mechanisms**: Multiple parsing strategies ensure maximum compatibility
- **Error Recovery**: Graceful handling of edge cases with descriptive error messages

## 🚨 Error Handling

```typescript
try {
  const whereClause = convert(invalidFilterString);
} catch (error) {
  if (error.message.includes('Unsupported')) {
    // Handle unsupported operation
    console.log('Feature not supported:', error.message);
  } else {
    // Handle parsing error
    console.log('Invalid syntax:', error.message);
  }
}
```

## ⚠️ Known Limitations

Some advanced OData features require raw SQL and are not directly supported:

- `length()` function comparisons → Use raw SQL: `LENGTH(field) > value`
- `day()`, `month()` extraction → Use date range filters instead
- Math functions (`round()`, `floor()`, `ceiling()`) → Use raw SQL
- Complex subqueries → Use Prisma's advanced query capabilities

When encountering these limitations, the library provides helpful error messages with suggested alternatives.

## 🛠️ Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Development with watch mode
npm run build:watch

# Run examples
npm run example

# Type checking
npm run lint

# Clean build artifacts
npm run clean
```

## 📄 Pagination Support

The library now includes full support for OData query parameters, enabling complete pagination solutions:

### Supported Parameters

- `$filter` - Filter expressions (existing functionality)
- `$top` - Limit number of results (equivalent to SQL LIMIT)
- `$skip` - Skip number of results (equivalent to SQL OFFSET)
- `$orderby` - Sort results by fields
- `$select` - Select specific fields
- `$count` - Include total count in response

### Express.js API Example

```typescript
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { PrismaQueryBuilder } from 'odata2orm';

const app = express();
const prisma = new PrismaClient();
const queryBuilder = new PrismaQueryBuilder();

app.get('/api/users', async (req, res) => {
  try {
    const params = {
      $filter: req.query.$filter,
      $top: req.query.$top ? parseInt(req.query.$top) : undefined,
      $skip: req.query.$skip ? parseInt(req.query.$skip) : undefined,
      $orderby: req.query.$orderby,
      $select: req.query.$select,
      $count: req.query.$count === 'true'
    };

    const { findQuery, countQuery } = queryBuilder.buildPaginationQuery(params);
    
    const [users, total] = await Promise.all([
      prisma.user.findMany(findQuery),
      prisma.user.count(countQuery)
    ]);

    const result = queryBuilder.processPaginationResult(users, total, params);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
```

### API Usage Examples

```bash
# Basic filtering with pagination
GET /api/users?$filter=department eq 'IT'&$top=10&$skip=0&$orderby=name asc&$count=true

# Complex filtering
GET /api/users?$filter=age gt 25 and salary le 100000&$top=20&$skip=40&$select=id,name,email

# String operations  
GET /api/users?$filter=contains(tolower(name),'john')&$orderby=createdAt desc

# Date filtering
GET /api/users?$filter=year(createdAt) eq 2024&$top=50&$orderby=createdAt desc
```

### Response Format

```json
{
  "data": [
    { "id": 1, "name": "John Doe", "email": "john@example.com" },
    { "id": 2, "name": "Jane Smith", "email": "jane@example.com" }
  ],
  "count": 150,
  "hasNext": true,
  "hasPrevious": true, 
  "totalPages": 15,
  "currentPage": 3,
  "pageSize": 10
}
```

For detailed pagination documentation, see [PAGINATION.md](./PAGINATION.md).

## 🏗️ Abstract Base Class Architecture

The library provides an abstract base class architecture that enables consistent API across different ORMs while allowing easy extension for new ORM implementations.

### BaseQueryBuilder Abstract Class

All ORM query builders extend the `BaseQueryBuilder<T>` abstract class:

```typescript
import { BaseQueryBuilder, QueryBuilderFactory, SupportedOrm } from 'odata2orm';

// Using factory pattern - recommended approach
const prismaBuilder = QueryBuilderFactory.createQueryBuilder(SupportedOrm.PRISMA);
const typeOrmBuilder = QueryBuilderFactory.createQueryBuilder(SupportedOrm.TYPEORM);

// Generic function that works with any ORM
function paginateData<T>(
  builder: BaseQueryBuilder<any>,
  params: ODataQueryParams,
  dataFetcher: (query: any) => Promise<T[]>,
  counter: (query: any) => Promise<number>
) {
  const { findQuery, countQuery } = builder.buildPaginationQuery(params);
  
  return Promise.all([
    dataFetcher(findQuery),
    counter(countQuery)
  ]).then(([data, total]) => 
    builder.processPaginationResult(data, total, params)
  );
}
```

### Implementing Custom ORM Support

To add support for a new ORM, extend the `BaseQueryBuilder` and implement 5 abstract methods:

```typescript
import { BaseQueryBuilder, BaseQueryOptions } from 'odata2orm';

interface CustomOrmQuery {
  where?: any;
  limit?: number;
  offset?: number;
  sort?: any[];
  fields?: string[];
}

class CustomOrmQueryBuilder extends BaseQueryBuilder<CustomOrmQuery> {
  protected createEmptyQuery(): CustomOrmQuery {
    return {};
  }

  protected setTake(query: CustomOrmQuery, take: number): void {
    query.limit = take;
  }

  protected setSkip(query: CustomOrmQuery, skip: number): void {
    query.offset = skip;
  }

  protected setOrderBy(query: CustomOrmQuery, orderBy: Record<string, 'asc' | 'desc'>): void {
    query.sort = Object.entries(orderBy).map(([field, direction]) => ({
      [field]: direction
    }));
  }

  protected setSelect(query: CustomOrmQuery, select: Record<string, any>): void {
    query.fields = Object.keys(select);
  }

  protected createCountQuery(findQuery: CustomOrmQuery): CustomOrmQuery {
    return {
      where: findQuery.where
    };
  }
}

// Register with factory
QueryBuilderFactory.register('CUSTOM_ORM', () => new CustomOrmQueryBuilder());
```

### ORM Implementation Status

| ORM | Status | Query Builder | Filter Conversion | Notes |
|-----|--------|---------------|-------------------|-------|
| **Prisma** | ✅ Complete | ✅ Implemented | ✅ Full Support | Production ready |
| **TypeORM** | 🚧 Framework Ready | ✅ Implemented | ⏳ Pending | 80% complete |
| **Sequelize** | 🚧 Framework Ready | ✅ Implemented | ⏳ Pending | 80% complete |
| **Mongoose** | 🚧 Framework Ready | ✅ Implemented | ⏳ Pending | 80% complete |

The framework is ready for TypeORM, Sequelize, and Mongoose - only the filter conversion logic needs to be implemented.

## 🏗️ Project Structure

```
src/
├── index.ts                 # Main entry point
├── types/                   # TypeScript definitions
├── utils/                   # Helper utilities
│   ├── helpers.ts          # Core helper functions
│   ├── optimizer.ts        # Query optimization
│   └── fallback.ts         # Fallback parsing
└── converters/              # Conversion logic
    ├── index.ts            # Main converter
    ├── comparison.ts       # Comparison operators
    ├── methods.ts          # OData method handlers
    └── date.ts            # Date operations
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/AmazingFeature`
3. Commit your changes: `git commit -m 'Add some AmazingFeature'`
4. Push to the branch: `git push origin feature/AmazingFeature`
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**datluong2409**
- GitHub: [@datluong2409](https://github.com/datluong2409)

## �️ Development

```bash
# Clone the repository
git clone https://github.com/datluong2409/odata2orm.git
cd odata2orm

# Install dependencies with pnpm
pnpm install

# Run tests
pnpm test

# Run tests with coverage
pnpm run test:coverage

# Build the project
pnpm run build

# Clean build artifacts
pnpm run clean

# Type checking
pnpm run lint
```

## �🔗 Related Projects

- [odata-v4-parser](https://www.npmjs.com/package/odata-v4-parser) - OData v4 parser (internal dependency)
- [Prisma](https://www.prisma.io/) - Modern database toolkit and ORM
- [OData](https://www.odata.org/) - Open Data Protocol specification

## 📝 Changelog

### 1.0.0 (Current)
- ✨ **NEW**: Full TypeScript rewrite with complete type definitions
- ✨ **NEW**: Modular architecture for better maintainability
- ✨ **NEW**: Enhanced error handling and fallback mechanisms
- ✅ **IMPROVED**: Query optimization algorithms
- ✅ **IMPROVED**: Performance and memory usage
- 🔧 **CHANGED**: Build system migrated from JavaScript obfuscation to TypeScript compilation
- 📚 **UPDATED**: Comprehensive documentation and examples

---

⭐ **Star this repo if you find it helpful!**
