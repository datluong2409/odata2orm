# OData2ORM

[![npm version](https://badge.fury.io/js/odata2orm.svg)](https://badge.fury.io/js/odata2orm)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

A universal TypeScript library that converts OData v4 query expressions to various ORM filters with schema validation and nested query support.

## ✨ Features

- 🌐 **Multi-ORM Support** - Prisma (complete), TypeORM/Sequelize/Mongoose (framework ready)
- 🔗 **OData v4 Compliance** - Nested navigation, collection filters (any/all), lambda expressions
- �️ **Schema Validation** - Zod integration for type-safe field validation and nested object support
- 📄 **Complete Pagination** - Full OData query parameters ($filter, $top, $skip, $orderby, $select, $count)
- �️ **Abstract Base Classes** - Consistent API across ORMs with BaseQueryBuilder
- 🎯 **Nested Query Support** - Deep object filtering and selection with schema validation
- 📝 **TypeScript-First** - Full type definitions with IntelliSense support
- ⚡ **Query Optimization** - Intelligent query pattern optimization
- � **Modular Architecture** - Clean, maintainable codebase

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

### Method 2: Complete Query Building

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
```

### Method 3: Schema-Validated Nested Queries (NEW! 🎉)

```typescript
import { z } from 'zod';
import { PrismaQueryBuilder } from 'odata2orm';

// Define schema
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

// Create query builder with schema validation
const builder = new PrismaQueryBuilder({
  schema: UserSchema,
  enableNestedQueries: true,
  allowAllFields: false
});

// Build complex nested queries with validation
const query = builder.buildQuery({
  $filter: "profile/address/city eq 'Seattle' and orders/any(o: o/total gt 100)",
  $select: "id,name,profile(avatar,address(city)),orders(total,status)",
  $orderby: "name asc, profile/address/city desc"
});
```

### Method 4: Abstract Base Class Pattern

```typescript
import { BaseQueryBuilder, QueryBuilderFactory } from 'odata2orm';

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

// Works with any ORM
const prismaBuilder = QueryBuilderFactory.createQueryBuilder('prisma');
const result = await paginateData(
  prismaBuilder,
  params,
  (query) => prisma.user.findMany(query),
  (query) => prisma.user.count(query)
);
```

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

### Schema Validation Benefits

- **Type Safety**: Validate field paths against your data schema
- **Nested Object Support**: Deep filtering and selection with validation
- **Error Prevention**: Catch invalid field references at query build time
- **IntelliSense**: Full TypeScript support with schema inference

### Real-world Example

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
    status: z.enum(['pending', 'shipped', 'delivered'])
  }))
});

const builder = new PrismaQueryBuilder({
  schema: UserSchema,
  enableNestedQueries: true,
  allowAllFields: false
});

// This will work - all fields are valid
const validQuery = builder.buildQuery({
  $filter: "profile/address/city eq 'Seattle' and orders/any(o: o/total gt 100)",
  $select: "id,name,profile(avatar,address(city)),orders(total,status)",
  $orderby: "name asc"
});

// This will throw an error - 'invalidField' doesn't exist in schema
try {
  const invalidQuery = builder.buildQuery({
    $select: "id,invalidField"
  });
} catch (error) {
  console.log(error.message); // "Invalid field path 'invalidField': Field does not exist in schema"
}
```

## 🏗️ Abstract Base Class Architecture

All ORM query builders extend `BaseQueryBuilder<T>` providing consistent API across ORMs:

```typescript
import { BaseQueryBuilder, QueryBuilderFactory } from 'odata2orm';

// Works with any ORM
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
```

### ORM Implementation Status

| ORM | Status | Query Builder | Filter Conversion | Notes |
|-----|--------|---------------|-------------------|-------|
| **Prisma** | ✅ Complete | ✅ Implemented | ✅ Full Support | Production ready with schema validation |
| **TypeORM** | 🚧 Framework Ready | ✅ Implemented | ⏳ Pending | 80% complete |
| **Sequelize** | 🚧 Framework Ready | ✅ Implemented | ⏳ Pending | 80% complete |
| **Mongoose** | 🚧 Framework Ready | ✅ Implemented | ⏳ Pending | 80% complete |

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
// AND / OR / NOT
convert("Name eq 'John' and Age gt 25")
convert("Name eq 'John' or Name eq 'Jane'") // Auto-optimized to IN
convert("not (Age lt 18)")
```

### String Functions
```typescript
convert("contains(Name, 'john')") // Case-insensitive by default
convert("startswith(Name, 'J')")
convert("endswith(Email, '.com')")
```

### Date & Arithmetic Operations
```typescript
convert("year(CreatedAt) eq 2023") // Smart date range optimization
convert("Price * 1.1 gt 100") // Mathematical operations
```

### Nested Navigation & Collections
```typescript
// Nested field filtering
convert("profile/address/city eq 'Seattle'")

// Collection filtering with any/all
convert("orders/any(o: o/total gt 100)")
convert("products/all(p: p/price lt 50)")
```

## 💡 Real-world Usage Patterns

### Express.js API with Nested Query Support

```typescript
import express from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { PrismaQueryBuilder } from 'odata2orm';

const app = express();
const prisma = new PrismaClient();

// Define your data schema
const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  profile: z.object({
    bio: z.string().optional(),
    avatar: z.string(),
    address: z.object({
      city: z.string(),
      country: z.string()
    })
  }),
  orders: z.array(z.object({
    id: z.string(),
    total: z.number(),
    status: z.string()
  }))
});

const queryBuilder = new PrismaQueryBuilder({
  schema: UserSchema,
  enableNestedQueries: true,
  allowAllFields: false
});

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
# Basic filtering with nested fields
GET /api/users?$filter=profile/address/city eq 'Seattle'&$top=10

# Collection filtering with any/all
GET /api/users?$filter=orders/any(o: o/total gt 100)&$select=id,name,orders(total)

# Complex nested selections
GET /api/users?$select=id,name,profile(avatar,address(city,country)),orders(total,status)

# Combined filtering and pagination
GET /api/users?$filter=profile/address/city eq 'Seattle' and orders/any(o: o/status eq 'shipped')&$top=20&$skip=40&$orderby=name asc
```

## ⚡ Performance & Best Practices

### Automatic Optimizations
- **OR → IN Conversion**: `name eq 'John' or name eq 'Jane'` becomes `{ name: { in: ['John', 'Jane'] } }`
- **Date Range Optimization**: `year(date) eq 2023` becomes efficient date range queries
- **Smart Fallback Parsing**: Enhanced parser handles complex nested expressions

### Production Tips
```typescript
// Enable schema validation for type safety
const builder = new PrismaQueryBuilder({ 
  schema: YourSchema,
  allowAllFields: false // Prevents field injection attacks
});

// Use pagination for large datasets
const { findQuery, countQuery } = builder.buildPaginationQuery(params);
```
## 🛠️ Development & Testing

```bash
# Install dependencies
pnpm install

# Run tests (35 comprehensive tests including nested queries)
pnpm test

# Build and watch
pnpm run build:watch

# Type checking
pnpm run lint
```

## ⚠️ Known Limitations

Advanced OData features requiring raw SQL:
- `length()` function → Use raw SQL: `LENGTH(field) > value`
- Math functions (`round()`, `floor()`) → Use Prisma's raw queries
- Complex subqueries → Use Prisma's advanced features

## 📄 Migration Guide

### From v1.0 to v1.1
```typescript
// Old way (still supported)
import { convertToPrisma } from 'odata2orm';

// New way with schema validation
import { PrismaQueryBuilder } from 'odata2orm';
const builder = new PrismaQueryBuilder({ schema: YourSchema });
```
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

## 📄 License

This project is licensed under the ISC License.

## 👨‍💻 Author

**datluong2409** - [GitHub](https://github.com/datluong2409)

---

⭐ **Star this repo if you find it helpful!**
