/**
 * Example usage of OData Pagination features with Prisma
 */

import { 
  buildPrismaQuery, 
  buildPrismaPagination,
  PrismaQueryBuilder 
} from '../src';
import type { ODataQueryParams, PaginationResult } from '../src';

// Example 1: Simple query building
console.log('=== Example 1: Simple Query Building ===');

const simpleParams: ODataQueryParams = {
  $filter: "name eq 'John' and age gt 25",
  $top: 10,
  $skip: 0,
  $orderby: 'name asc',
  $select: 'id,name,email,age'
};

const prismaQuery = buildPrismaQuery(simpleParams);
console.log('Prisma Query:', JSON.stringify(prismaQuery, null, 2));

// Example 2: Pagination with count
console.log('\n=== Example 2: Pagination with Count ===');

const paginationParams: ODataQueryParams = {
  $filter: "department eq 'IT' and salary gt 50000",
  $top: 20,
  $skip: 40,
  $orderby: 'salary desc, name asc',
  $select: 'id,name,salary,department',
  $count: true
};

const { findQuery, countQuery } = buildPrismaPagination(paginationParams);
console.log('Find Query:', JSON.stringify(findQuery, null, 2));
console.log('Count Query:', JSON.stringify(countQuery, null, 2));

// Example 3: Using PrismaQueryBuilder class
console.log('\n=== Example 3: Using PrismaQueryBuilder Class ===');

const builder = new PrismaQueryBuilder({
  caseSensitive: true
});

// Simulate actual Prisma usage
async function getUsersWithPagination(params: ODataQueryParams) {
  // Build queries
  const { findQuery, countQuery } = builder.buildPaginationQuery(params);
  
  // Simulate Prisma calls (you would use your actual Prisma client here)
  console.log('Would execute Prisma findMany with:', JSON.stringify(findQuery, null, 2));
  console.log('Would execute Prisma count with:', JSON.stringify(countQuery, null, 2));
  
  // Simulate results
  const mockData = [
    { id: 1, name: 'John Doe', email: 'john@example.com', age: 30 },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', age: 28 }
  ];
  const mockTotal = 150;
  
  // Process pagination result
  const result = builder.processPaginationResult(mockData, mockTotal, params);
  
  return result;
}

// Usage example
const advancedParams: ODataQueryParams = {
  $filter: "startswith(name,'J') and age ge 25 and age le 35",
  $top: 5,
  $skip: 10,
  $orderby: 'name asc',
  $select: 'id,name,email,age',
  $count: true
};

getUsersWithPagination(advancedParams).then(result => {
  console.log('Pagination Result:', JSON.stringify(result, null, 2));
});

// Example 4: Real-world Express.js API usage
console.log('\n=== Example 4: Express.js API Usage ===');

const expressExample = `
// In your Express.js route handler
app.get('/api/users', async (req, res) => {
  try {
    // Extract OData parameters from query string
    const odataParams: ODataQueryParams = {
      $filter: req.query.$filter as string,
      $top: req.query.$top ? parseInt(req.query.$top as string) : undefined,
      $skip: req.query.$skip ? parseInt(req.query.$skip as string) : undefined,
      $orderby: req.query.$orderby as string,
      $select: req.query.$select as string,
      $count: req.query.$count === 'true'
    };

    // Build Prisma queries
    const builder = new PrismaQueryBuilder();
    const { findQuery, countQuery } = builder.buildPaginationQuery(odataParams);

    // Execute Prisma queries
    const [users, total] = await Promise.all([
      prisma.user.findMany(findQuery),
      prisma.user.count(countQuery)
    ]);

    // Process result with pagination metadata
    const result = builder.processPaginationResult(users, total, odataParams);

    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Example API calls:
// GET /api/users?$filter=department eq 'IT'&$top=10&$skip=0&$orderby=name asc&$count=true
// GET /api/users?$filter=age gt 25 and salary le 100000&$top=20&$skip=40&$select=id,name,email
`;

console.log(expressExample);

// Example 5: Complex filtering scenarios
console.log('\n=== Example 5: Complex Filtering Scenarios ===');

const complexScenarios = [
  {
    description: 'Date range filtering',
    params: {
      $filter: "createdAt ge 2024-01-01T00:00:00Z and createdAt lt 2024-12-31T23:59:59Z",
      $top: 50,
      $orderby: 'createdAt desc'
    }
  },
  {
    description: 'String operations',
    params: {
      $filter: "contains(tolower(name),'john') or endswith(email,'@company.com')",
      $top: 25,
      $select: 'id,name,email'
    }
  },
  {
    description: 'Nested field filtering',
    params: {
      $filter: "profile/department eq 'Engineering' and profile/level ge 'Senior'",
      $orderby: 'profile/salary desc',
      $select: 'id,name,profile'
    }
  },
  {
    description: 'Multiple conditions with pagination',
    params: {
      $filter: "active eq true and (department eq 'IT' or department eq 'Engineering') and salary gt 60000",
      $top: 15,
      $skip: 30,
      $orderby: 'salary desc, name asc',
      $select: 'id,name,department,salary,active',
      $count: true
    }
  }
];

complexScenarios.forEach((scenario, index) => {
  console.log(`\\nScenario ${index + 1}: ${scenario.description}`);
  const query = buildPrismaQuery(scenario.params);
  console.log('Generated Prisma Query:', JSON.stringify(query, null, 2));
});
