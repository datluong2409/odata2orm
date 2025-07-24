# OData2ORM Development Guide

## Project Architecture

The project follows an adapter pattern to support multiple ORMs:

```
src/
├── index.ts                 # Main entry point & API
├── adapters/                # ORM adapters
│   ├── base.ts             # Abstract base adapter
│   ├── prisma.ts           # Prisma implementation (complete)
│   ├── typeorm.ts          # TypeORM skeleton (coming soon)
│   ├── sequelize.ts        # Sequelize skeleton (coming soon)
│   ├── mongoose.ts         # Mongoose skeleton (coming soon)
│   ├── factory.ts          # Adapter factory
│   └── index.ts            # Adapters exports
├── types/
│   └── index.ts            # Legacy TypeScript definitions
├── utils/                  # Shared utilities
│   ├── helpers.ts          # Helper functions
│   ├── optimizer.ts        # Query optimization
│   └── fallback.ts         # Fallback parser
└── converters/             # Legacy Prisma converters
    ├── index.ts            # Main converter (used by Prisma adapter)
    ├── comparison.ts       # Comparison operators
    ├── methods.ts          # OData method calls
    └── date.ts            # Date-related operations
```

## Development Commands

- `npm run build` - Build the TypeScript project
- `npm run build:watch` - Build in watch mode for development
- `npm run clean` - Clean build artifacts
- `npm run dev` - Run with ts-node for quick testing
- `npm run example:new` - Run new adapter examples
- `npm run adapters:info` - Display adapter information
- `npm run lint` - Type checking without output

## Adding New ORM Adapters

### 1. Create New Adapter Class

Create a new file `src/adapters/your-orm.ts`:

```typescript
import { BaseOrmAdapter, ConversionOptions, WhereClause, ComparisonNode, MethodCallNode } from './base';
import { ODataNode } from '../types';

export interface YourOrmWhereClause extends WhereClause {
  // Define your ORM-specific types here
}

export class YourOrmAdapter extends BaseOrmAdapter {
  constructor(options: ConversionOptions = {}) {
    super(options);
  }

  convert(odataFilterString: string): YourOrmWhereClause {
    // Implement main conversion logic
    // Parse OData string and convert to your ORM format
  }

  convertNode(node: ODataNode): YourOrmWhereClause {
    // Implement AST node conversion
    // Handle different node types (comparison, logical, etc.)
  }

  handleComparison(node: ComparisonNode): YourOrmWhereClause {
    // Implement comparison operations (=, !=, >, >=, <, <=)
  }

  handleLogical(node: ODataNode): YourOrmWhereClause {
    // Implement logical operations (AND, OR, NOT)
  }

  handleMethod(node: MethodCallNode): YourOrmWhereClause {
    // Implement method calls (contains, startsWith, etc.)
  }

  getOrmName(): string {
    return 'YourORM';
  }

  getSupportedFeatures(): string[] {
    return [
      'Basic comparisons (=, !=, >, >=, <, <=)',
      'Logical operations (AND, OR, NOT)',
      // Add your supported features here
    ];
  }
}
```

### 2. Update Factory

Add your adapter to `src/adapters/factory.ts`:

```typescript
// Import your adapter
import { YourOrmAdapter } from './your-orm';

// Add to SupportedOrm type
export type SupportedOrm = 'prisma' | 'typeorm' | 'sequelize' | 'mongoose' | 'your-orm';

// Add to factory method
static createAdapter(orm: SupportedOrm, options: ConversionOptions = {}): BaseOrmAdapter {
  switch (orm.toLowerCase()) {
    // ... existing cases
    case 'your-orm':
      return new YourOrmAdapter(options);
    // ...
  }
}
```

### 3. Export from Index

Add exports to `src/adapters/index.ts`:

```typescript
export { YourOrmAdapter, YourOrmWhereClause } from './your-orm';
```

### 4. Add Convenience Function

Add to `src/index.ts`:

```typescript
export function convertToYourOrm(odataFilterString: string, options = {}) {
  const adapter = AdapterFactory.createAdapter('your-orm', options);
  return adapter.convert(odataFilterString);
}
```

## Adding New OData Features

### 1. For Prisma (Existing Implementation)

1. Add the method case in `src/converters/methods.ts`
2. Update types if needed in `src/types/index.ts`
3. Add tests to verify functionality

### 2. Adding New Comparison Operators

1. Update `src/converters/comparison.ts`
2. Add to the operator mapping
3. Update type definitions

### 3. Optimization Rules

Query optimizations are handled in `src/utils/optimizer.ts`. Common patterns:
- OR chains with same field → IN operations
- Date range combinations
- Complex nested expressions

## TypeScript Notes

- All functions are properly typed
- Optional parameters use `?` syntax
- Union types for flexibility
- Proper error handling with typed exceptions

## Testing

Run examples: `npx ts-node examples.ts`

The examples file demonstrates:
- Basic operations
- String functions
- Logical combinations
- Optimization features
- Configuration options
