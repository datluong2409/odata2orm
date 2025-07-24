/**
 * Examples for the new OData to ORM converter
 * Testing all cases from README.md
 */

import { 
  AdapterFactory, 
  convertToPrisma, 
  convertToTypeORM, 
  convertToSequelize, 
  convertToMongoose,
  SupportedOrm
} from './src';

console.log('=== OData to ORM Converter Test Cases from README ===\n');

// Helper function for testing
function testPrismaConversion(testName: string, odataFilter: string, expectedDescription?: string) {
  console.log(`\n🧪 Test: ${testName}`);
  console.log(`📝 Filter: ${odataFilter}`);
  if (expectedDescription) {
    console.log(`📋 Expected: ${expectedDescription}`);
  }
  
  try {
    const result = convertToPrisma(odataFilter);
    console.log('✅ Result:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.log('❌ Error:', (error as Error).message);
    return null;
  }
}

// Test Categories from README

console.log('\n=== 1. COMPARISON OPERATORS ===');

testPrismaConversion(
  "Equal (eq)", 
  "Name eq 'John'", 
  "{ Name: { equals: 'John' } }"
);

testPrismaConversion(
  "Not Equal (ne)", 
  "Age ne 25", 
  "{ Age: { not: 25 } }"
);

testPrismaConversion(
  "Greater Than (gt)", 
  "Age gt 18", 
  "{ Age: { gt: 18 } }"
);

testPrismaConversion(
  "Greater or Equal (ge)", 
  "Age ge 18", 
  "{ Age: { gte: 18 } }"
);

testPrismaConversion(
  "Less Than (lt)", 
  "Age lt 65", 
  "{ Age: { lt: 65 } }"
);

testPrismaConversion(
  "Less or Equal (le)", 
  "Age le 65", 
  "{ Age: { lte: 65 } }"
);

console.log('\n=== 2. LOGICAL OPERATORS ===');

testPrismaConversion(
  "AND Operation", 
  "Name eq 'John' and Age gt 25", 
  "{ AND: [{ Name: { equals: 'John' } }, { Age: { gt: 25 } }] }"
);

testPrismaConversion(
  "OR Operation (should optimize to IN)", 
  "Name eq 'John' or Name eq 'Jane'", 
  "{ Name: { in: ['John', 'Jane'] } }"
);

testPrismaConversion(
  "NOT Operation", 
  "not (Age lt 18)", 
  "{ NOT: { Age: { lt: 18 } } }"
);

console.log('\n=== 3. STRING FUNCTIONS ===');

testPrismaConversion(
  "Contains (case-insensitive)", 
  "contains(Name, 'john')", 
  "{ Name: { contains: 'john', mode: 'insensitive' } }"
);

testPrismaConversion(
  "Starts With", 
  "startswith(Name, 'J')", 
  "{ Name: { startsWith: 'J', mode: 'insensitive' } }"
);

testPrismaConversion(
  "Ends With", 
  "endswith(Email, '.com')", 
  "{ Email: { endsWith: '.com', mode: 'insensitive' } }"
);

testPrismaConversion(
  "Index Of (position-based search)", 
  "indexof(Name, 'oh') ge 0", 
  "{ Name: { contains: 'oh' } }"
);

// Test case sensitivity
console.log('\n--- Testing Case Sensitivity ---');
try {
  const caseSensitiveResult = convertToPrisma("contains(Name, 'John')", { caseSensitive: true });
  console.log('Case Sensitive Result:', JSON.stringify(caseSensitiveResult, null, 2));
} catch (error) {
  console.log('Case Sensitive Error:', (error as Error).message);
}

console.log('\n=== 4. DATE & TIME FUNCTIONS ===');

testPrismaConversion(
  "Year extraction", 
  "year(CreatedAt) eq 2023", 
  "{ CreatedAt: { gte: '2023-01-01T00:00:00.000Z', lt: '2024-01-01T00:00:00.000Z' } }"
);

testPrismaConversion(
  "Year + Month combination", 
  "year(CreatedAt) eq 2023 and month(CreatedAt) eq 12", 
  "{ CreatedAt: { gte: '2023-12-01T00:00:00.000Z', lt: '2024-01-01T00:00:00.000Z' } }"
);

testPrismaConversion(
  "Date range with datetime literals", 
  "CreatedAt ge datetime'2023-01-01' and CreatedAt lt datetime'2024-01-01'", 
  "{ CreatedAt: { gte: '2023-01-01T00:00:00.000Z', lt: '2024-01-01T00:00:00.000Z' } }"
);

console.log('\n=== 5. ARITHMETIC EXPRESSIONS ===');

testPrismaConversion(
  "Multiplication in comparison", 
  "Price * 1.1 gt 100", 
  "{ Price: { gt: 90.91 } } // Automatically calculated"
);

testPrismaConversion(
  "Addition in comparison", 
  "Quantity + 5 le 20", 
  "{ Quantity: { lte: 15 } }"
);

testPrismaConversion(
  "Division in comparison", 
  "Total / 2 eq 50", 
  "{ Total: { equals: 100 } }"
);

console.log('\n=== 6. IN OPERATIONS ===');

testPrismaConversion(
  "Explicit IN syntax", 
  "CategoryId in (1,2,3)", 
  "{ CategoryId: { in: [1, 2, 3] } }"
);

testPrismaConversion(
  "OR to IN optimization", 
  "Status eq 'active' or Status eq 'pending' or Status eq 'completed'", 
  "{ Status: { in: ['active', 'pending', 'completed'] } }"
);

console.log('\n=== 7. COMPLEX NESTED EXPRESSIONS ===');

testPrismaConversion(
  "Complex nested conditions", 
  "(Name eq 'John' or Name eq 'Jane') and Age gt 18 and contains(Email, '@company.com') and year(CreatedAt) eq 2023", 
  "Intelligent handling of nested conditions with optimization"
);

console.log('\n=== 8. EDGE CASES & ERROR HANDLING ===');

// Test cases that should fail gracefully
testPrismaConversion(
  "Length function (should show limitation)", 
  "length(Name) gt 5", 
  "Should show error about length() not supported"
);

testPrismaConversion(
  "Day function (should suggest alternative)", 
  "day(CreatedAt) eq 15", 
  "Should suggest using date range filters"
);

testPrismaConversion(
  "Math function (should suggest raw SQL)", 
  "round(Price) eq 100", 
  "Should suggest using raw SQL"
);

console.log('\n=== 9. ADDITIONAL COMPLEX CASES ===');

const additionalTestCases = [
  "name eq 'John' and (age gt 25 or status eq 'active')",
  "contains(email, 'gmail') and startswith(name, 'J')",
  "category in ('tech', 'science', 'art')",
  "isActive eq true and createdAt ge datetime'2023-01-01'",
  "price ge 100 and price le 500",
  "not (status eq 'deleted') and year(updatedAt) eq 2023"
];

additionalTestCases.forEach((filter, index) => {
  testPrismaConversion(`Additional Case ${index + 1}`, filter);
});

console.log('\n=== Test Summary ===');
console.log('Tests completed! Check results above for any failures that need fixing.');
