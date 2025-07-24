# OData2ORM

[![npm version](https://badge.fury.io/js/odata2orm.svg)](https://badge.fury.io/js/odata2orm)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

A universal TypeScript library that converts OData filter expressions to various ORM filters (Prisma, TypeORM, Sequelize, Mongoose). Seamlessly bridge OData query syntax with your favorite ORM for modern database operations.

## ✨ Features

- 🌐 **Multi-ORM Support** - Prisma, TypeORM, Sequelize, Mongoose
- 📝 **Full TypeScript Support** - Complete type definitions and IntelliSense
- 🔄 **OData Conversion** - Seamless filter translation
- 📊 **Comprehensive Operators** - All comparison and logical operators
- 🔍 **String Functions** - contains, startswith, endswith, indexof support
- 📅 **Date Operations** - Smart date range handling and optimization
- 🧮 **Arithmetic Expressions** - Mathematical operations in filters
- 📋 **IN Operator** - Automatic OR to IN optimization
- 🎯 **Case Sensitivity** - Configurable string matching
- ⚡ **Query Optimization** - Intelligent query pattern optimization
- 🛡️ **Robust Error Handling** - Comprehensive error handling with fallbacks
- 🏗️ **Modular Architecture** - Clean, maintainable codebase

## 🎯 ORM Support Status

| ORM | Status | Description |
|-----|--------|-------------|
| **Prisma** | ✅ **Available** | Fully implemented with all features |
| **TypeORM** | � **Coming Soon** | Under development |
| **Sequelize** | 🚧 **Coming Soon** | Under development |
| **Mongoose** | 🚧 **Coming Soon** | Under development |

## �📦 Installation

```bash
npm install odata2orm
```

## 🚀 Quick Start

### Method 1: Convenience Functions

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

## 🔗 Related Projects

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
