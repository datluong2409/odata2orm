# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

`odata2orm` is a TypeScript library that converts OData v4 query expressions (`$filter`, `$top`, `$skip`, `$orderby`, `$select`, `$count`) into ORM query objects. Prisma is fully implemented; TypeORM/Sequelize/Mongoose have query-builder scaffolding but their filter conversion (`adapter.convert()`) is not yet implemented.

Package manager is **pnpm** (see `pnpm-lock.yaml`).

## Commands

```bash
pnpm install              # install deps
pnpm run build            # clean + tsc to dist/
pnpm run build:watch      # tsc --watch
pnpm run lint             # tsc --noEmit (type-check only)
pnpm test                 # jest (all suites)
pnpm test:watch
pnpm test:coverage
pnpm run example          # ts-node examples.ts
pnpm run adapters:info    # dump AdapterFactory.getAdapterInfo()
```

Run a single test file or pattern:

```bash
pnpm test -- tests/nested-schema.test.ts
pnpm test -- -t "collection filter"
```

Jest config (`jest.config.js`): `ts-jest` preset, roots `src/` and `tests/`, matches `*.test.ts` / `*.spec.ts`.

## Architecture

Two parallel layers, both keyed off the `SupportedOrm` enum:

### Layer 1 — Filter conversion (`src/adapters/` + `src/converters/`)

Converts an OData filter string → ORM where clause.

- `BaseOrmAdapter` (`adapters/base.ts`) — abstract; each ORM subclass implements `convert()` and `convertNode()`.
- `PrismaAdapter` delegates to the shared `convert()` in `src/converters/index.ts`. The pipeline is:
  1. `preprocessODataFilter` (string normalization)
  2. `odata-v4-parser.filter()` → AST
  3. `convertNode()` walks the AST via the `NodeType` enum (`src/enums/index.ts`)
  4. `optimizeOrToIn()` collapses `name eq 'a' or name eq 'b'` → `{ name: { in: [...] } }`
  5. If the parser throws, `fallbackParser()` (`utils/fallback.ts`) handles nested-navigation and other expressions the upstream parser chokes on.
- `convertNode` has special-cases for `year + month`-AND'd-together and date ranges (`converters/date.ts`), so AST traversal isn't purely structural.
- `AdapterFactory.createAdapter(orm, options)` is the entry point for raw filter-to-where conversion.

### Layer 2 — Full query building (`src/adapters/*-query-builder.ts`)

Adds `$top` / `$skip` / `$orderby` / `$select` / `$count` and pagination metadata on top of Layer 1.

- `BaseQueryBuilder<TQueryOptions>` (`adapters/base-query-builder.ts`) — abstract; subclasses implement five methods: `createEmptyQuery`, `setTake`, `setSkip`, `setOrderBy`, `setSelect`, `createCountQuery`.
- `buildQuery(params)` (base impl) wires `$filter` through `adapter.convert()` and the rest through `parseOrderBy` / `parseSelect` (`utils/odata-parser.ts`).
- `buildPaginationQuery(params)` returns `{ findQuery, countQuery }`. The count query strips take/skip/select/orderBy.
- `processPaginationResult(data, total, params)` produces the `PaginationResult` shape (hasNext/hasPrevious/totalPages/currentPage/pageSize).
- `QueryBuilderFactory.createQueryBuilder(orm, options)` is the recommended entry point.

### Prisma's override path (schema validation + nested queries)

`PrismaQueryBuilder` (`adapters/prisma-query-builder.ts`) overrides `buildQuery` rather than using the base behavior. When `enableNestedQueries: true` (default), it:

- Calls `validateFilterFieldPaths` (`utils/filter-field-extractor.ts`) — throws `SchemaValidationError` (`src/errors/`) for unknown paths when a Zod `schema` is supplied and `allowAllFields: false`.
- Routes `$filter` through `parseCollectionFilters` (`utils/nested-parser.ts`) to handle lambda expressions like `orders/any(o: o/total gt 100)` and merges them into `{ AND: [...] }` with the base where.
- Uses `parseNestedOrderBy` and `parseNestedSelect` to expand `profile/address/city` and `profile(avatar,address(city))` into Prisma's nested `orderBy` / `select` shapes via `convertNestedSelectToPrisma`.

Other ORMs do not (yet) override `buildQuery`, so their query builders work for pagination/select/orderBy but their `convert()` returns stubs.

### Schema layer (`src/utils/schema-validator.ts`, `src/types/schema.ts`)

Schema validation is opt-in. When passed, `SchemaValidator` walks the Zod schema to validate field paths for filters, orderBy, and select. `parseNavigationPath` / `parseCollectionFilter` are exported for external use.

### Public surface

`src/index.ts` re-exports:
- Legacy: `convertToPrisma`, `convertToTypeORM`, `convertToSequelize`, `convertToMongoose`, `convert` (default).
- Recommended: `PrismaQueryBuilder`, `buildPrismaQuery`, `buildPrismaPagination`, `QueryBuilderFactory`, `BaseQueryBuilder`.
- Errors: `SchemaValidationError` (has `.field` and `.operation: 'filter' | 'select' | 'orderby'`).

## Adding a new ORM

1. New adapter extending `BaseOrmAdapter` in `src/adapters/<orm>.ts` — implement `convert`, `convertNode`, `handleComparison`, `handleLogical`, `handleMethod`, `getOrmName`, `getSupportedFeatures`.
2. New query builder extending `BaseQueryBuilder<YourQueryOptions>` — implement the six abstract methods.
3. Register both in `AdapterFactory` (`adapters/factory.ts`) and `QueryBuilderFactory` (`adapters/query-builder-factory.ts`) and add to `SupportedOrm` enum.
4. Add tests under `tests/`. Existing suites of interest: `comprehensive.test.ts`, `query-builders.test.ts`, `nested-schema.test.ts`, `schema-validation-errors.test.ts`.

## Known limitations (from README)

`length()`, math functions (`round`/`floor`), and complex subqueries don't have direct Prisma equivalents — use Prisma raw SQL.

## Related docs

- `README.md` — usage examples and full operator/method tables.
- `PAGINATION.md` — pagination response shape and details.
- `.github/copilot-instructions.md` — overlapping architectural notes.

<!-- CODEGRAPH_START -->
## CodeGraph

This project has a CodeGraph MCP server (`codegraph_*` tools) configured. CodeGraph is a tree-sitter-parsed knowledge graph of every symbol, edge, and file. Reads are sub-millisecond and return structural information grep cannot.

### When to prefer codegraph over native search

Use codegraph for **structural** questions — what calls what, what would break, where is X defined, what is X's signature. Use native grep/read only for **literal text** queries (string contents, comments, log messages) or after you already have a specific file open.

| Question | Tool |
|---|---|
| "Where is X defined?" / "Find symbol named X" | `codegraph_search` |
| "What calls function Y?" | `codegraph_callers` |
| "What does Y call?" | `codegraph_callees` |
| "What would break if I changed Z?" | `codegraph_impact` |
| "Show me Y's signature / source / docstring" | `codegraph_node` |
| "Give me focused context for a task/area" | `codegraph_context` |
| "Survey an unfamiliar module/topic" | `codegraph_explore` |
| "What files exist under path/" | `codegraph_files` |
| "Is the index healthy?" | `codegraph_status` |

### Rules of thumb

- **Trust codegraph results.** They come from a full AST parse. Do NOT re-verify them with grep — that's slower, less accurate, and wastes context.
- **Don't grep first** when looking up a symbol by name. `codegraph_search` is faster and returns kind + location + signature in one call.
- **Don't chain `codegraph_search` + `codegraph_node`** when you just want context — `codegraph_context` is one call.
- **`codegraph_explore` is the heavy hitter** for unfamiliar areas — it returns full source from all relevant files in one call, but is token-heavy. If your harness supports parallel subagents (e.g., Claude Code's Task tool), spawn one for explore-class questions to keep main session context clean.
- **Index lag**: the file watcher debounces ~500ms behind writes; don't re-query immediately after editing a file in the same turn.

### If `.codegraph/` doesn't exist

The MCP server returns "not initialized." Ask the user: *"I notice this project doesn't have CodeGraph initialized. Want me to run `codegraph init -i` to build the index?"*
<!-- CODEGRAPH_END -->
