# odata2orm

[![npm version](https://badge.fury.io/js/odata2orm.svg)](https://badge.fury.io/js/odata2orm)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

Convert OData v4 query (`$filter`, `$top`, `$skip`, `$orderby`, `$select`, `$count`) to ORM filters.

## Status

| ORM       | Filter | Query builder | Pagination | Notes                              |
|-----------|:------:|:-------------:|:----------:|------------------------------------|
| Prisma    |   ✅   |      ✅       |     ✅     | Schema validation, nested queries  |
| TypeORM   |   ✅   |      ✅       |     ✅     | Uses `FindOperator` (peer dep)     |
| Sequelize |   ✅   |      ✅       |     ✅     | Uses `Op` symbols (peer dep)       |
| Mongoose  |   ✅   |      ✅       |     ✅     | Native MongoDB `$ops`              |

## Install

```bash
pnpm add odata2orm        # or npm / yarn
pnpm add typeorm          # peer dep, only if using TypeORM
pnpm add sequelize        # peer dep, only if using Sequelize
pnpm add mongoose         # peer dep, only if using Mongoose
```

## Quick start

```ts
import { convertToPrisma } from 'odata2orm';

convertToPrisma("name eq 'John' and age gt 25");
// { AND: [{ name: { equals: 'John' }}, { age: { gt: 25 }}] }
```

---

## Providers

<details>
<summary><b>🔷 Prisma</b> — full filter + query builder + schema validation</summary>

### Filter only

```ts
import { convertToPrisma } from 'odata2orm';

convertToPrisma("status eq 'active' and age gt 18");
// { AND: [{ status: { equals: 'active' }}, { age: { gt: 18 }}] }
```

### Full query

```ts
import { buildPrismaQuery, buildPrismaPagination } from 'odata2orm';

const query = buildPrismaQuery({
  $filter: "department eq 'IT' and salary gt 50000",
  $top: 20,
  $skip: 40,
  $orderby: 'salary desc, name asc',
  $select: 'id,name,salary',
});
// prisma.user.findMany(query)

const { findQuery, countQuery } = buildPrismaPagination(params);
```

### Schema validation (Zod)

```ts
import { z } from 'zod';
import { PrismaQueryBuilder } from 'odata2orm';

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  profile: z.object({
    address: z.object({ city: z.string() }),
  }),
  orders: z.array(z.object({ total: z.number() })),
});

const builder = new PrismaQueryBuilder({
  schema: UserSchema,
  enableNestedQueries: true,
  allowAllFields: false,
});

const query = builder.buildQuery({
  $filter: "profile/address/city eq 'Seattle' and orders/any(o: o/total gt 100)",
  $select: 'id,name,profile(address(city)),orders(total)',
  $orderby: 'name asc',
});
```

### Express handler

```ts
app.get('/api/users', async (req, res) => {
  const { findQuery, countQuery } = builder.buildPaginationQuery(req.query);
  const [users, total] = await Promise.all([
    prisma.user.findMany(findQuery),
    prisma.user.count(countQuery),
  ]);
  res.json(builder.processPaginationResult(users, total, req.query));
});
```

</details>

<details>
<summary><b>🔶 TypeORM</b> — full filter + query builder (peer dep)</summary>

Install `typeorm` alongside this lib. Output uses `FindOperator` instances (`Equal`, `MoreThan`, `Like`, `In`, ...).

### Filter only

```ts
import { convertToTypeORM } from 'odata2orm';
// returns FindOptionsWhere<T> | FindOptionsWhere<T>[]

convertToTypeORM("name eq 'John'");
// { name: Equal('John') }

convertToTypeORM("age gt 18 and age lt 65");
// { age: And(MoreThan(18), LessThan(65)) }

convertToTypeORM("status in ('a','b','c')");
// { status: In(['a','b','c']) }

convertToTypeORM("not (age lt 18)");
// { age: Not(LessThan(18)) }
```

### Full query

```ts
import { buildTypeOrmQuery, buildTypeOrmPagination } from 'odata2orm';

const query = buildTypeOrmQuery({
  $filter: "status eq 'active'",
  $top: 15,
  $skip: 10,
  $orderby: 'createdAt desc, name asc',
  $select: 'id,name,status',
});
// repo.find(query)
// query.order = { createdAt: 'DESC', name: 'ASC' }
// query.select = ['id','name','status']

const { findQuery, countQuery } = buildTypeOrmPagination(params);
const [rows, total] = await Promise.all([
  repo.find(findQuery),
  repo.count(countQuery),
]);
```

### Semantics

| OData                                 | TypeORM output                                |
|---------------------------------------|-----------------------------------------------|
| AND on different fields               | merged object                                 |
| AND on same field                     | `And(op1, op2)`                               |
| OR on same field (auto-optimized)     | `In([...])`                                   |
| OR on different fields                | `[{...}, {...}]` array                        |
| `NOT (a AND b)`                       | de Morgan → `[{a: Not}, {b: Not}]`            |
| `contains` / `startswith` / `endswith`| `Like` (or `ILike` if `caseSensitive: false`) |
| `field eq null`                       | `IsNull()`                                    |
| `year(date) eq 2024`                  | `And(MoreThanOrEqual(start), LessThan(end))`  |
| nested path `a/b/c`                   | `{ a: { b: { c: ... } } }`                    |

</details>

<details>
<summary><b>🟦 Sequelize</b> — full filter + query builder (peer dep)</summary>

Install `sequelize` alongside this lib. Output uses `Sequelize.Op` symbols. If `sequelize` is not installed, fallback `Symbol.for('sequelize.op.*')` keys are used (still inspectable, but you should install the real package for production).

### Filter only

```ts
import { convertToSequelize } from 'odata2orm';
import { Op } from 'sequelize';

convertToSequelize("name eq 'John'");
// { name: { [Op.eq]: 'John' } }

convertToSequelize("age gt 18 and age lt 65");
// { age: { [Op.gt]: 18, [Op.lt]: 65 } }

convertToSequelize("status in ('a','b','c')");
// { status: { [Op.in]: ['a','b','c'] } }

convertToSequelize("not (age lt 18)");
// { [Op.not]: { age: { [Op.lt]: 18 } } }
```

### Full query

```ts
import { buildSequelizeQuery, buildSequelizePagination } from 'odata2orm';

const query = buildSequelizeQuery({
  $filter: "status eq 'active'",
  $top: 15,
  $skip: 10,
  $orderby: 'createdAt desc, name asc',
  $select: 'id,name,status',
});
// Model.findAll(query)
// query.order      = [['createdAt','DESC'], ['name','ASC']]
// query.attributes = ['id','name','status']
// query.limit      = 15
// query.offset     = 10

const { findQuery, countQuery } = buildSequelizePagination(params);
const [rows, total] = await Promise.all([
  Model.findAll(findQuery),
  Model.count(countQuery),
]);
```

### Semantics

| OData                                  | Sequelize output                              |
|----------------------------------------|-----------------------------------------------|
| AND on different fields                | merged object                                 |
| AND on same field                      | merged op object `{ [gt]: ..., [lt]: ... }`   |
| OR on same field (auto-optimized)      | `{ [Op.in]: [...] }`                          |
| OR on different fields                 | `{ [Op.or]: [{...}, {...}] }`                 |
| NOT                                    | `{ [Op.not]: ... }`                           |
| `contains` / `startswith` / `endswith` | `[Op.like]` (or `[Op.iLike]` if insensitive)  |
| `field eq null`                        | `{ [Op.is]: null }`                           |
| `field ne null`                        | `{ [Op.not]: null }`                          |
| `year(date) eq 2024`                   | `{ [Op.gte]: start, [Op.lt]: end }`           |
| nested path `a/b/c`                    | dot key `'a.b.c'` (use with `include`)        |

</details>

<details>
<summary><b>🟩 Mongoose</b> — full filter + query builder</summary>

No peer dep needed — output uses plain MongoDB operator strings (`$eq`, `$gt`, `$in`, ...). Feed directly to `Model.find()`.

### Filter only

```ts
import { convertToMongoose } from 'odata2orm';

convertToMongoose("name eq 'John'");
// { name: 'John' }

convertToMongoose("age gt 18 and age lt 65");
// { age: { $gt: 18, $lt: 65 } }

convertToMongoose("status in ('a','b','c')");
// { status: { $in: ['a','b','c'] } }

convertToMongoose("contains(name, 'jo')", { caseSensitive: false });
// { name: { $regex: 'jo', $options: 'i' } }

convertToMongoose("not (name eq 'John' or age gt 30)");
// { $nor: [{ name: 'John' }, { age: { $gt: 30 } }] }
```

### Full query

```ts
import { buildMongooseQuery, buildMongoosePagination } from 'odata2orm';

const query = buildMongooseQuery({
  $filter: "status eq 'active'",
  $top: 15,
  $skip: 10,
  $orderby: 'createdAt desc, name asc',
  $select: 'id,name,status',
});
// Model.find(query.filter).sort(query.sort).skip(query.skip).limit(query.limit).select(query.select)
// query.filter = { status: 'active' }
// query.sort   = { createdAt: -1, name: 1 }
// query.select = { id: 1, name: 1, status: 1 }

const { findQuery, countQuery } = buildMongoosePagination(params);
const [rows, total] = await Promise.all([
  Model.find(findQuery.filter).sort(findQuery.sort).skip(findQuery.skip).limit(findQuery.limit),
  Model.countDocuments(countQuery.filter),
]);
```

### Semantics

| OData                                  | Mongoose / MongoDB output                                |
|----------------------------------------|----------------------------------------------------------|
| `field eq v`                           | `{ field: v }` (implicit eq)                             |
| `field ne v`                           | `{ field: { $ne: v } }`                                  |
| AND on different fields                | merged object                                            |
| AND on same field (different ops)      | merged op object `{ $gt: ..., $lt: ... }`                |
| AND collision (same op same field)     | `{ $and: [{...}, {...}] }`                               |
| OR on same field (auto-optimized)      | `{ $in: [...] }`                                         |
| OR on different fields                 | `{ $or: [...] }`                                         |
| NOT value                              | `{ field: { $ne: v } }`                                  |
| NOT op clause                          | `{ field: { $not: { $op: v } } }`                        |
| NOT of OR                              | `{ $nor: [...] }`                                        |
| `contains` / `startswith` / `endswith` | `$regex` (with `$options: 'i'` if `caseSensitive: false`)|
| `field eq null`                        | `{ field: null }`                                        |
| `year(date) eq 2024`                   | `{ field: { $gte: start, $lt: end } }`                   |
| nested path `a/b/c`                    | dot key `'a.b.c'`                                        |

Regex specials in string literals are escaped automatically.

</details>

---

## OData operators

| Category   | Operators                                                                       |
|------------|---------------------------------------------------------------------------------|
| Comparison | `eq` `ne` `gt` `ge` `lt` `le`                                                   |
| Logical    | `and` `or` `not`                                                                |
| String     | `contains` `startswith` `endswith` `indexof` `substringof` `tolower` `toupper`  |
| Date       | `year` `year + month` combo, date range                                         |
| Set        | `in (...)`                                                                      |
| Arithmetic | `* / + -` (rearranged algebraically)                                            |

Auto-optimizations:
- `a eq 'x' or a eq 'y'` → `In(['x','y'])`
- `year(date) eq 2024` → range query
- `date ge X and date le Y` → range query

## Pagination response

```json
{
  "data": [ ... ],
  "count": 150,
  "hasNext": true,
  "hasPrevious": true,
  "totalPages": 15,
  "currentPage": 3,
  "pageSize": 10
}
```

See [PAGINATION.md](./PAGINATION.md). For a step-by-step walkthrough see [USAGE.md](./USAGE.md).

## Limitations

Need raw SQL (or aggregation pipeline for Mongo): `length()`, `round()`, `floor()`, `ceiling()`, `month()` / `day()` extraction, complex subqueries.

## Develop

```bash
pnpm install
pnpm test
pnpm run build
pnpm run lint
```

## License

ISC — [datluong2409](https://github.com/datluong2409)
