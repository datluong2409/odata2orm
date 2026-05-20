# Usage Guide

A step-by-step walkthrough of `odata2orm`. For a quick reference / operator tables see [README.md](./README.md); for the pagination response shape see [PAGINATION.md](./PAGINATION.md).

## Table of contents

1. [Install](#1-install)
2. [Pick an API surface](#2-pick-an-api-surface)
3. [Filter-only conversion](#3-filter-only-conversion)
4. [Full query (filter + paging + ordering + projection)](#4-full-query-filter--paging--ordering--projection)
5. [Pagination](#5-pagination)
6. [Schema validation (Prisma + Zod)](#6-schema-validation-prisma--zod)
7. [Nested navigation and collection filters (any / all)](#7-nested-navigation-and-collection-filters-any--all)
8. [Per-ORM cheat sheet](#8-per-orm-cheat-sheet)
9. [Express / HTTP integration](#9-express--http-integration)
10. [Error handling](#10-error-handling)
11. [Options reference](#11-options-reference)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Install

```bash
pnpm add odata2orm        # or npm i / yarn add
```

Install the peer ORM you actually use:

```bash
pnpm add typeorm          # only if using TypeORM
pnpm add sequelize        # only if using Sequelize
pnpm add mongoose         # only if using Mongoose
# Prisma needs no peer dep — output is a plain object
```

TypeScript is supported out of the box (types ship from `dist/`).

## 2. Pick an API surface

Three layers, increasing capability:

| You want | Use |
|---|---|
| Convert just a `$filter` string to a `where` clause | `convertToPrisma` / `convertToTypeORM` / `convertToSequelize` / `convertToMongoose` |
| Convert `$filter` + `$top` + `$skip` + `$orderby` + `$select` to a full query | `buildPrismaQuery` / `buildTypeOrmQuery` / `buildSequelizeQuery` / `buildMongooseQuery` |
| Same as above, plus a paired count query and pagination metadata | `buildPrismaPagination` / `buildTypeOrmPagination` / `buildSequelizePagination` / `buildMongoosePagination`, or the corresponding `*QueryBuilder` class |

If you don't know which to pick, start with the `build*Query` function. Move to the `*QueryBuilder` class when you need schema validation, nested navigation, or want to share configuration across many calls.

## 3. Filter-only conversion

The simplest entry point — converts a single OData `$filter` string to a `where`-clause object.

```ts
import { convertToPrisma } from 'odata2orm';

const where = convertToPrisma("name eq 'John' and age gt 25");
// { AND: [{ name: { equals: 'John' } }, { age: { gt: 25 } }] }

await prisma.user.findMany({ where });
```

Switch ORMs by switching the function name; the input string is identical:

```ts
import { convertToTypeORM, convertToSequelize, convertToMongoose } from 'odata2orm';

convertToTypeORM("age gt 18 and age lt 65");
// { age: And(MoreThan(18), LessThan(65)) }

convertToSequelize("age gt 18 and age lt 65");
// { age: { [Op.gt]: 18, [Op.lt]: 65 } }

convertToMongoose("age gt 18 and age lt 65");
// { age: { $gt: 18, $lt: 65 } }
```

A second `options` argument is supported on every converter:

```ts
convertToMongoose("contains(name, 'jo')", { caseSensitive: false });
// { name: { $regex: 'jo', $options: 'i' } }
```

## 4. Full query (filter + paging + ordering + projection)

Pass all six OData params at once via `ODataQueryParams`:

```ts
import { buildPrismaQuery } from 'odata2orm';

const query = buildPrismaQuery({
  $filter: "department eq 'IT' and salary gt 50000",
  $top: 20,
  $skip: 40,
  $orderby: 'salary desc, name asc',
  $select: 'id,name,salary',
});

await prisma.user.findMany(query);
```

The `ODataQueryParams` shape is the same for every ORM:

```ts
interface ODataQueryParams {
  $filter?: string;
  $top?: number;
  $skip?: number;
  $orderby?: string;
  $select?: string;
  $count?: boolean;
}
```

Each `build*Query` returns the native query object for that ORM (Prisma `findMany` options, TypeORM `FindManyOptions`, Sequelize `FindOptions`, Mongoose split into `{ filter, sort, skip, limit, select }`).

## 5. Pagination

`build*Pagination` returns two queries: one for the page of rows, one for the total count (the count query has `take`/`skip`/`select`/`orderBy` stripped so the count is over the full filtered set).

```ts
import { buildPrismaPagination } from 'odata2orm';

const params = {
  $filter: "status eq 'active'",
  $top: 10,
  $skip: 20,
  $count: true,
};

const { findQuery, countQuery } = buildPrismaPagination(params);

const [data, total] = await Promise.all([
  prisma.user.findMany(findQuery),
  prisma.user.count(countQuery),
]);
```

To get the response shape (`hasNext`, `totalPages`, etc.), use the query-builder class:

```ts
import { PrismaQueryBuilder } from 'odata2orm';

const builder = new PrismaQueryBuilder();
const { findQuery, countQuery } = builder.buildPaginationQuery(params);

const [data, total] = await Promise.all([
  prisma.user.findMany(findQuery),
  prisma.user.count(countQuery),
]);

return builder.processPaginationResult(data, total, params);
// { data, count, hasNext, hasPrevious, totalPages, currentPage, pageSize }
```

See [PAGINATION.md](./PAGINATION.md) for the full response shape.

## 6. Schema validation (Prisma + Zod)

Schema validation is **Prisma-only** today. Pass a Zod schema to reject filter / select / orderby paths the schema doesn't define.

```ts
import { z } from 'zod';
import { PrismaQueryBuilder, SchemaValidationError } from 'odata2orm';

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  profile: z.object({
    address: z.object({ city: z.string(), country: z.string() }),
  }),
  orders: z.array(z.object({ total: z.number(), status: z.string() })),
});

const builder = new PrismaQueryBuilder({
  schema: UserSchema,
  allowAllFields: false,     // strict: unknown paths throw
  enableNestedQueries: true, // default true — enables any()/all() + nested select/orderby
});

try {
  const query = builder.buildQuery({
    $filter: "wrongField eq 1",
  });
} catch (err) {
  if (err instanceof SchemaValidationError) {
    console.log(err.field);     // 'wrongField'
    console.log(err.operation); // 'filter' | 'select' | 'orderby'
  }
}
```

Set `allowAllFields: true` (the default when no schema is supplied) to disable strict checking and accept any field name.

## 7. Nested navigation and collection filters (any / all)

With `enableNestedQueries: true` (default), `PrismaQueryBuilder` understands OData navigation paths and lambda expressions and emits Prisma's nested shape.

**Navigation path in `$filter`:**

```ts
builder.buildQuery({
  $filter: "profile/address/city eq 'Seattle'",
});
// where: { profile: { address: { is: { city: { equals: 'Seattle' } } } } }
```

**`any` / `all` over a collection:**

```ts
builder.buildQuery({
  $filter: "orders/any(o: o/total gt 100 and o/status eq 'paid')",
});
// where: { orders: { some: { AND: [{ total: { gt: 100 } }, { status: { equals: 'paid' } }] } } }
```

**Nested `$orderby`:**

```ts
builder.buildQuery({ $orderby: 'profile/address/city asc, name desc' });
// orderBy: [{ profile: { address: { city: 'asc' } } }, { name: 'desc' }]
```

**Nested `$select` (parenthesis-notation projection):**

```ts
builder.buildQuery({
  $select: 'id,name,profile(address(city,country)),orders(total)',
});
// select: {
//   id: true, name: true,
//   profile: { select: { address: { select: { city: true, country: true } } } },
//   orders:  { select: { total: true } },
// }
```

For TypeORM / Sequelize, navigation paths become nested objects / dot-keys respectively (see the per-ORM table in [README.md](./README.md)); `any`/`all` lambdas are not expanded into joins for those ORMs — handle relations through your own `include` / `relations` options.

## 8. Per-ORM cheat sheet

| ORM | Input | Output shape | Peer dep | How to execute |
|---|---|---|---|---|
| Prisma | OData string | `{ where, take, skip, orderBy, select }` | — | `prisma.model.findMany(query)` |
| TypeORM | OData string | `{ where, take, skip, order, select }` using `FindOperator`s | `typeorm` | `repo.find(query)` |
| Sequelize | OData string | `{ where, limit, offset, order, attributes }` using `Op` symbols | `sequelize` (recommended) | `Model.findAll(query)` |
| Mongoose | OData string | `{ filter, sort, skip, limit, select }` | — | `Model.find(q.filter).sort(q.sort).skip(q.skip).limit(q.limit).select(q.select)` |

`AdapterFactory.getAdapterInfo()` returns the supported-feature list for each ORM at runtime:

```ts
import { AdapterFactory } from 'odata2orm';
console.log(AdapterFactory.getAdapterInfo());
```

`QueryBuilderFactory.createQueryBuilder(SupportedOrm.PRISMA, options)` is the generic factory entry point if you want to pick the ORM at runtime instead of importing the class directly.

## 9. Express / HTTP integration

OData query params arrive on `req.query` already named `$filter`, `$top`, etc. — feed them straight in:

```ts
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { PrismaQueryBuilder, type ODataQueryParams } from 'odata2orm';

const app = express();
const prisma = new PrismaClient();
const builder = new PrismaQueryBuilder({ schema: UserSchema, allowAllFields: false });

app.get('/api/users', async (req, res) => {
  try {
    const params: ODataQueryParams = {
      $filter:  req.query.$filter  as string,
      $top:     req.query.$top     ? parseInt(req.query.$top as string, 10) : undefined,
      $skip:    req.query.$skip    ? parseInt(req.query.$skip as string, 10) : undefined,
      $orderby: req.query.$orderby as string,
      $select:  req.query.$select  as string,
      $count:   req.query.$count === 'true',
    };

    const { findQuery, countQuery } = builder.buildPaginationQuery(params);
    const [users, total] = await Promise.all([
      prisma.user.findMany(findQuery),
      prisma.user.count(countQuery),
    ]);

    res.json(builder.processPaginationResult(users, total, params));
  } catch (err: any) {
    res.status(400).json({ error: err.message, field: err.field, operation: err.operation });
  }
});
```

Example requests:

```
GET /api/users?$filter=department eq 'IT'&$top=10&$skip=0&$orderby=name asc&$count=true
GET /api/users?$filter=contains(tolower(name),'john')&$select=id,name,email
GET /api/users?$filter=orders/any(o: o/total gt 100)&$orderby=name asc
```

## 10. Error handling

There are two failure modes to handle:

**Schema validation** — thrown by `PrismaQueryBuilder` when a field path isn't in the supplied Zod schema:

```ts
import { SchemaValidationError } from 'odata2orm';

try {
  builder.buildQuery({ $filter: "ghostField eq 1" });
} catch (err) {
  if (err instanceof SchemaValidationError) {
    // err.field      → 'ghostField'
    // err.operation  → 'filter' | 'select' | 'orderby'
    // err.message    → human-readable
  }
  throw err;
}
```

**OData parse errors** — thrown by the underlying parser for malformed filter syntax. These surface as plain `Error`s with a descriptive message; return a 400 to the caller.

## 11. Options reference

`ConversionOptions` (shared across every ORM converter):

| Option | Type | Default | Effect |
|---|---|---|---|
| `caseSensitive` | `boolean` | `true` | When `false`, `contains` / `startswith` / `endswith` emit case-insensitive matches (`ILike` on Postgres, `$options:'i'` regex on Mongo, `mode:'insensitive'` on Prisma) |

`PrismaQueryBuilderOptions` (adds to `ConversionOptions`):

| Option | Type | Default | Effect |
|---|---|---|---|
| `schema` | Zod schema | — | Enables field-path validation against this schema |
| `allowAllFields` | `boolean` | `true` (or `false` when `schema` is set explicitly per call) | If `false`, unknown paths throw `SchemaValidationError` |
| `enableNestedQueries` | `boolean` | `true` | When `false`, navigation paths and `any`/`all` lambdas aren't expanded |

## 12. Troubleshooting

**"Unsupported ORM: …"** — pass one of the `SupportedOrm` enum values (`'prisma' | 'typeorm' | 'sequelize' | 'mongoose'`).

**Sequelize output has `Symbol.for('sequelize.op.eq')` instead of `Op.eq`** — `sequelize` isn't installed. Install it as a peer dependency so the library picks up the real `Op` symbols.

**`length()`, `round()`, `floor()`, `ceiling()`, `month()`/`day()` extraction** — not mappable to first-class ORM operators. Fall back to Prisma `$queryRaw`, TypeORM query builder raw SQL, Sequelize literal, or Mongoose aggregation pipeline.

**Filter that mixes `year()` with another comparison fails to parse** — the underlying parser sometimes chokes on date-function combos; `odata2orm` falls back to its own parser for these cases. If you still hit a parse error, simplify the expression or report a repro.

**Index lag after editing files (when using CodeGraph)** — the file watcher debounces ~500 ms; queries against just-edited files may miss the change for one turn.
