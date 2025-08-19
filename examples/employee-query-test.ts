/**
 * Test specific OData query with employee schema
 */

import { z } from 'zod';
import { buildPrismaPagination, SchemaValidationError } from '../src';

// Define a schema for Employee entity matching your query fields
const EmployeeSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  address: z.string(),
  dateOfBirth: z.date(),
  serviceStartDate: z.date(),
  city: z.string(),
  stateProvince: z.string(),
  zipPostalCode: z.string(),
  statusNo: z.number(),
  refStatusCodes: z.object({
    statusName: z.string(),
    statusCode: z.string().optional(),
    description: z.string().optional()
  })
});

console.log('=== Testing Specific Employee Query ===\n');

// Test the exact query you provided
const testQuery = {
  $count: false,
  $filter: "refStatusCodes/statusName ne 'Terminated'",
  $orderby: '', // empty orderby
  $select: 'id, firstName, lastName, address, dateOfBirth, serviceStartDate, city, stateProvince, zipPostalCode, statusNo, refStatusCodes',
  $skip: 0,
  $top: 10
};

console.log('Query parameters:');
console.log(JSON.stringify(testQuery, null, 2));

console.log('\n1. Test with strict validation (allowAllFields: false):');
try {
  const result = buildPrismaPagination(testQuery, {
    schema: EmployeeSchema,
    allowAllFields: false,
    enableNestedQueries: true
  });
  
  console.log('✅ Success - query built successfully');
  console.log('Find query structure:');
  console.log('- where:', JSON.stringify(result.findQuery.where, null, 2));
  console.log('- select:', JSON.stringify(result.findQuery.select, null, 2));
  console.log('- take:', result.findQuery.take);
  console.log('- skip:', result.findQuery.skip);
  console.log('- orderBy:', result.findQuery.orderBy);
  
  console.log('\nCount query:');
  console.log('- where:', JSON.stringify(result.countQuery.where, null, 2));
  
} catch (error) {
  if (error instanceof SchemaValidationError) {
    console.log('❌ Schema Validation Error:');
    console.log(`   Field: ${error.field}`);
    console.log(`   Operation: ${error.operation}`);
    console.log(`   Message: ${error.message}`);
  } else {
    console.log('❌ Other Error:', (error as Error).message);
    console.log('Stack:', (error as Error).stack);
  }
}

console.log('\n2. Test with permissive mode (allowAllFields: true):');
try {
  const result = buildPrismaPagination(testQuery, {
    schema: EmployeeSchema,
    allowAllFields: true,
    enableNestedQueries: true
  });
  
  console.log('✅ Success in permissive mode');
  console.log('Query keys:', Object.keys(result.findQuery));
  
} catch (error) {
  console.log('❌ Error in permissive mode:', (error as Error).message);
}

console.log('\n3. Test without schema (backward compatibility):');
try {
  const result = buildPrismaPagination(testQuery, {
    enableNestedQueries: true
  });
  
  console.log('✅ Success without schema');
  console.log('Query keys:', Object.keys(result.findQuery));
  
} catch (error) {
  console.log('❌ Error without schema:', (error as Error).message);
}

console.log('\n=== Test completed ===');
