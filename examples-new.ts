/**
 * Examples for the new OData to ORM converter
 */

import { 
  AdapterFactory, 
  convertToPrisma, 
  convertToTypeORM, 
  convertToSequelize, 
  convertToMongoose,
  SupportedOrm
} from './src';

// Example OData filter
const odataFilter = "name eq 'John' and age gt 25";

console.log('=== OData to ORM Converter Examples ===\n');

// Method 1: Using convenience functions
console.log('1. Using convenience functions:');

try {
  // Prisma (working)
  console.log('Prisma Result:');
  console.log(JSON.stringify(convertToPrisma(odataFilter), null, 2));
} catch (error) {
  console.log('Prisma Error:', (error as Error).message);
}

try {
  // TypeORM (coming soon)
  console.log('\nTypeORM Result:');
  console.log(JSON.stringify(convertToTypeORM(odataFilter), null, 2));
} catch (error) {
  console.log('TypeORM:', (error as Error).message);
}

try {
  // Sequelize (coming soon)
  console.log('\nSequelize Result:');
  console.log(JSON.stringify(convertToSequelize(odataFilter), null, 2));
} catch (error) {
  console.log('Sequelize:', (error as Error).message);
}

try {
  // Mongoose (coming soon)
  console.log('\nMongoose Result:');
  console.log(JSON.stringify(convertToMongoose(odataFilter), null, 2));
} catch (error) {
  console.log('Mongoose:', (error as Error).message);
}

// Method 2: Using factory pattern
console.log('\n\n2. Using factory pattern:');

const prismaAdapter = AdapterFactory.createAdapter(SupportedOrm.PRISMA);
console.log(`${prismaAdapter.getOrmName()} Adapter:`, 
  JSON.stringify(prismaAdapter.convert(odataFilter), null, 2));

// Method 3: Get adapter information
console.log('\n\n3. Supported ORMs and their status:');
const adapterInfo = AdapterFactory.getAdapterInfo();
adapterInfo.forEach(info => {
  console.log(`\n${info.orm} - Status: ${info.status}`);
  console.log('Features:', info.features.join('\n  - '));
});

// Method 4: More complex examples (Prisma only for now)
console.log('\n\n4. Complex examples (Prisma):');

const complexFilters = [
  "name eq 'John' and (age gt 25 or status eq 'active')",
  "contains(email, 'gmail') and startsWith(name, 'J')",
  "createdAt ge 2023-01-01T00:00:00.000Z and createdAt le 2023-12-31T23:59:59.999Z",
  "category in ('tech', 'science', 'art')"
];

complexFilters.forEach((filter, index) => {
  try {
    console.log(`\nExample ${index + 1}: ${filter}`);
    console.log('Result:', JSON.stringify(convertToPrisma(filter), null, 2));
  } catch (error) {
    console.log(`Error: ${(error as Error).message}`);
  }
});
