/**
 * Simple test file to verify the conversion works
 */

import { convert } from './dist/index';

// Test basic functionality
console.log('Testing OData2Prisma TypeScript conversion...\n');

try {
  // Test 1: Simple equality
  const test1 = convert("Name eq 'John'");
  console.log('Test 1 - Simple equality:');
  console.log('Input: "Name eq \'John\'"');
  console.log('Output:', JSON.stringify(test1, null, 2));
  console.log('');

  // Test 2: Comparison
  const test2 = convert("Age gt 25");
  console.log('Test 2 - Comparison:');
  console.log('Input: "Age gt 25"');
  console.log('Output:', JSON.stringify(test2, null, 2));
  console.log('');

  // Test 3: String contains
  const test3 = convert("contains(Name, 'John')");
  console.log('Test 3 - String contains:');
  console.log('Input: "contains(Name, \'John\')"');
  console.log('Output:', JSON.stringify(test3, null, 2));
  console.log('');

  // Test 4: Complex AND
  const test4 = convert("Name eq 'John' and Age gt 25");
  console.log('Test 4 - Complex AND:');
  console.log('Input: "Name eq \'John\' and Age gt 25"');
  console.log('Output:', JSON.stringify(test4, null, 2));
  console.log('');

  console.log('✅ All tests completed successfully!');

} catch (error) {
  console.error('❌ Test failed:', error);
}
