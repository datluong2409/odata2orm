/**
 * Debug nested field parsing in filters
 */

import { z } from 'zod';
import { buildPrismaPagination } from '../src';

const EmployeeSchema = z.object({
  id: z.string(),
  name: z.string(),
  refStatusCodes: z.object({
    statusName: z.string(),
    statusCode: z.string()
  })
});

console.log('=== Debug Nested Field Filter Parsing ===\n');

// Test different nested field filters
const testCases = [
  {
    name: 'Simple nested field equality',
    filter: "refStatusCodes/statusName eq 'Active'"
  },
  {
    name: 'Simple nested field not equal',
    filter: "refStatusCodes/statusName ne 'Terminated'"
  },
  {
    name: 'Multiple nested fields',
    filter: "refStatusCodes/statusName eq 'Active' and refStatusCodes/statusCode eq 'ACT'"
  },
  {
    name: 'Simple field (for comparison)',
    filter: "name eq 'John'"
  }
];

for (const testCase of testCases) {
  console.log(`\n${testCase.name}:`);
  console.log(`Filter: ${testCase.filter}`);
  
  try {
    const result = buildPrismaPagination(
      { $filter: testCase.filter },
      { 
        schema: EmployeeSchema,
        allowAllFields: false,
        enableNestedQueries: true
      }
    );
    
    console.log('✅ Generated where clause:');
    console.log(JSON.stringify(result.findQuery.where, null, 2));
    
  } catch (error) {
    console.log('❌ Error:', (error as Error).message);
  }
}

console.log('\n=== Debug completed ===');
