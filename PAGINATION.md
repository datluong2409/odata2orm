# OData Pagination Features

This document describes the new pagination features added to the odata2orm library, allowing you to build complete Prisma queries from OData query parameters.

## Overview

The library now supports converting OData query parameters (`$filter`, `$top`, `$skip`, `$orderby`, `$select`, `$count`) into Prisma query options with built-in pagination support.

## New Features

### 1. OData Query Parameters Support

```typescript
interface ODataQueryParams {
  $filter?: string;    // OData filter expression
  $top?: number;       // Limit number of results
  $skip?: number;      // Skip number of results (offset)
  $orderby?: string;   // Sort order
  $select?: string;    // Select specific fields
  $count?: boolean;    // Include total count in response
}
```

### 2. Quick Build Functions

#### `buildPrismaQuery(params, options)`

Converts OData parameters to a complete Prisma query:

```typescript
import { buildPrismaQuery } from 'odata2orm';

const params = {
  $filter: "name eq 'John' and age gt 25",
  $top: 10,
  $skip: 20,
  $orderby: 'name asc, age desc',
  $select: 'id,name,email,age'
};

const prismaQuery = buildPrismaQuery(params);
// Result:
// {
//   where: { AND: [{ name: { equals: 'John' }}, { age: { gt: 25 }}] },
//   take: 10,
//   skip: 20,
//   orderBy: [{ name: 'asc' }, { age: 'desc' }],
//   select: { id: true, name: true, email: true, age: true }
// }
```

#### `buildPrismaPagination(params, options)`

Creates separate queries for data fetching and counting:

```typescript
import { buildPrismaPagination } from 'odata2orm';

const { findQuery, countQuery } = buildPrismaPagination(params);

// Use with Prisma
const [data, total] = await Promise.all([
  prisma.user.findMany(findQuery),
  prisma.user.count(countQuery)
]);
```

### 3. PrismaQueryBuilder Class

For more advanced usage with additional processing:

```typescript
import { PrismaQueryBuilder } from 'odata2orm';

const builder = new PrismaQueryBuilder({
  caseSensitive: true
});

// Build queries
const { findQuery, countQuery } = builder.buildPaginationQuery(params);

// Execute and process results
const users = await prisma.user.findMany(findQuery);
const total = await prisma.user.count(countQuery);

const result = builder.processPaginationResult(users, total, params);
// Result includes pagination metadata: hasNext, hasPrevious, totalPages, etc.
```

## Supported OData Parameters

### `$filter`
Standard OData filter expressions:
- Comparison: `eq`, `ne`, `gt`, `ge`, `lt`, `le`
- Logical: `and`, `or`, `not`
- String functions: `contains`, `startswith`, `endswith`
- Date functions: `year`, `month`, `day`

```typescript
$filter: "name eq 'John' and age gt 25"
$filter: "contains(tolower(name),'john') or department eq 'IT'"
$filter: "year(createdAt) eq 2024 and month(createdAt) ge 6"
```

### `$orderby`
Sort by one or multiple fields:

```typescript
$orderby: "name asc"
$orderby: "salary desc, name asc"
$orderby: "createdAt desc, name"  // defaults to asc
```

### `$select`
Select specific fields:

```typescript
$select: "id,name,email"
$select: "user(name,email),department"  // nested selection
```

### `$top` and `$skip`
Pagination parameters:

```typescript
$top: 20      // limit to 20 results
$skip: 40     // skip first 40 results (page 3 with pageSize 20)
```

### `$count`
Include total count in response:

```typescript
$count: true  // includes count in pagination result
```

## Express.js Integration Example

```typescript
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { PrismaQueryBuilder } from 'odata2orm';
import type { ODataQueryParams } from 'odata2orm';

const app = express();
const prisma = new PrismaClient();
const queryBuilder = new PrismaQueryBuilder();

app.get('/api/users', async (req, res) => {
  try {
    // Parse OData parameters from query string
    const params: ODataQueryParams = {
      $filter: req.query.$filter as string,
      $top: req.query.$top ? parseInt(req.query.$top as string) : undefined,
      $skip: req.query.$skip ? parseInt(req.query.$skip as string) : undefined,
      $orderby: req.query.$orderby as string,
      $select: req.query.$select as string,
      $count: req.query.$count === 'true'
    };

    // Build Prisma queries
    const { findQuery, countQuery } = queryBuilder.buildPaginationQuery(params);

    // Execute queries
    const [users, total] = await Promise.all([
      prisma.user.findMany(findQuery),
      prisma.user.count(countQuery)
    ]);

    // Process result with pagination metadata
    const result = queryBuilder.processPaginationResult(users, total, params);

    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
```

### Example API Calls

```bash
# Basic filtering with pagination
GET /api/users?$filter=department eq 'IT'&$top=10&$skip=0&$orderby=name asc&$count=true

# Complex filtering
GET /api/users?$filter=age gt 25 and salary le 100000&$top=20&$skip=40&$select=id,name,email

# String operations
GET /api/users?$filter=contains(tolower(name),'john') or endswith(email,'@company.com')

# Date filtering
GET /api/users?$filter=year(createdAt) eq 2024 and month(createdAt) ge 6&$orderby=createdAt desc
```

## Response Format

When using `processPaginationResult()`, the response includes:

```typescript
interface PaginationResult<T> {
  data: T[];              // The actual data
  count?: number;         // Total count (if $count=true)
  hasNext?: boolean;      // Whether there are more results
  hasPrevious?: boolean;  // Whether there are previous results
  totalPages?: number;    // Total number of pages
  currentPage?: number;   // Current page number (1-based)
  pageSize?: number;      // Page size ($top value)
}
```

Example response:

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

## Utility Functions

### `parseOrderBy(orderby: string)`
Parse OData orderby string to Prisma format:

```typescript
import { parseOrderBy } from 'odata2orm';

parseOrderBy('name asc, age desc')
// Returns: { name: 'asc', age: 'desc' }
```

### `parseSelect(select: string)`
Parse OData select string to Prisma format:

```typescript
import { parseSelect } from 'odata2orm';

parseSelect('id,name,user(email,profile)')
// Returns: { id: true, name: true, user: { email: true, profile: true } }
```

### `calculatePagination(total, skip, take)`
Calculate pagination metadata:

```typescript
import { calculatePagination } from 'odata2orm';

calculatePagination(100, 20, 10)
// Returns: { hasNext: true, hasPrevious: true, totalPages: 10, currentPage: 3, pageSize: 10 }
```

## Migration from Previous Version

The new pagination features are backward compatible. Your existing code using `convertToPrisma()` will continue to work:

```typescript
// Old way (still supported)
import { convertToPrisma } from 'odata2orm';
const whereClause = convertToPrisma("name eq 'John'");

// New way (recommended for full queries)
import { buildPrismaQuery } from 'odata2orm';
const fullQuery = buildPrismaQuery({
  $filter: "name eq 'John'",
  $top: 10,
  $orderby: 'name asc'
});
```

## Error Handling

The library provides meaningful error messages for invalid OData syntax:

```typescript
try {
  const query = buildPrismaQuery({
    $filter: "invalid syntax here"
  });
} catch (error) {
  console.error('OData parsing error:', error.message);
}
```

## Performance Tips

1. **Use `$select`** to limit returned fields and improve performance
2. **Implement proper indexing** on fields used in `$filter` and `$orderby`
3. **Set reasonable limits** on `$top` to prevent excessive data transfer
4. **Use count queries judiciously** - only include `$count=true` when needed

## TypeScript Support

Full TypeScript support with proper type definitions:

```typescript
import type { 
  ODataQueryParams, 
  PrismaQueryOptions, 
  PaginationResult 
} from 'odata2orm';

async function getUsers(params: ODataQueryParams): Promise<PaginationResult<User>> {
  // Implementation with full type safety
}
```
