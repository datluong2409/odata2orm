/**
 * Example: Using Abstract Base Query Builder for Multiple ORMs
 * This example shows how the abstract base class makes it easy to implement
 * pagination for different ORMs with consistent API
 */

import { 
  PrismaQueryBuilder,
  TypeOrmQueryBuilder,
  SequelizeQueryBuilder,
  MongooseQueryBuilder,
  BaseQueryBuilder,
  BaseQueryOptions
} from '../src';
import type { ODataQueryParams } from '../src';

console.log('🏗️ Abstract Base Query Builder Examples\n');

// Common OData parameters for all examples
const commonParams: ODataQueryParams = {
  $filter: "department eq 'Engineering' and salary gt 50000",
  $top: 20,
  $skip: 40,
  $orderby: 'salary desc, name asc',
  $select: 'id,name,email,salary,department',
  $count: true
};

console.log('Common OData Parameters:');
console.log(JSON.stringify(commonParams, null, 2));
console.log('\n' + '='.repeat(80) + '\n');

// Example 1: Prisma Query Builder
console.log('🟦 PRISMA Query Builder');
const prismaBuilder = new PrismaQueryBuilder();
const prismaQueries = prismaBuilder.buildPaginationQuery(commonParams);

console.log('Prisma Find Query:');
console.log(JSON.stringify(prismaQueries.findQuery, null, 2));
console.log('\nPrisma Count Query:');
console.log(JSON.stringify(prismaQueries.countQuery, null, 2));

// Simulate usage with Prisma
const prismaUsage = `
// Usage with Prisma Client:
const [users, total] = await Promise.all([
  prisma.user.findMany(${JSON.stringify(prismaQueries.findQuery, null, 2)}),
  prisma.user.count(${JSON.stringify(prismaQueries.countQuery, null, 2)})
]);

const result = prismaBuilder.processPaginationResult(users, total, params);
`;

console.log('\nPrisma Usage:');
console.log(prismaUsage);
console.log('\n' + '='.repeat(80) + '\n');

// Example 2: TypeORM Query Builder
console.log('🟨 TypeORM Query Builder');
const typeormBuilder = new TypeOrmQueryBuilder();
const typeormQueries = typeormBuilder.buildPaginationQuery(commonParams);

console.log('TypeORM Find Query:');
console.log(JSON.stringify(typeormQueries.findQuery, null, 2));
console.log('\nTypeORM Count Query:');
console.log(JSON.stringify(typeormQueries.countQuery, null, 2));

// Simulate usage with TypeORM
const typeormUsage = `
// Usage with TypeORM Repository:
const userRepository = getRepository(User);

const [users, total] = await Promise.all([
  userRepository.find(${JSON.stringify(typeormQueries.findQuery, null, 2)}),
  userRepository.count(${JSON.stringify(typeormQueries.countQuery, null, 2)})
]);

const result = typeormBuilder.processPaginationResult(users, total, params);
`;

console.log('\nTypeORM Usage:');
console.log(typeormUsage);
console.log('\n' + '='.repeat(80) + '\n');

// Example 3: Sequelize Query Builder
console.log('🟩 Sequelize Query Builder');
const sequelizeBuilder = new SequelizeQueryBuilder();
const sequelizeQueries = sequelizeBuilder.buildPaginationQuery(commonParams);

console.log('Sequelize Find Query:');
console.log(JSON.stringify(sequelizeQueries.findQuery, null, 2));
console.log('\nSequelize Count Query:');
console.log(JSON.stringify(sequelizeQueries.countQuery, null, 2));

// Simulate usage with Sequelize
const sequelizeUsage = `
// Usage with Sequelize Model:
const [users, total] = await Promise.all([
  User.findAll(${JSON.stringify(sequelizeQueries.findQuery, null, 2)}),
  User.count(${JSON.stringify(sequelizeQueries.countQuery, null, 2)})
]);

const result = sequelizeBuilder.processPaginationResult(users, total, params);
`;

console.log('\nSequelize Usage:');
console.log(sequelizeUsage);
console.log('\n' + '='.repeat(80) + '\n');

// Example 4: Mongoose Query Builder
console.log('🟪 Mongoose Query Builder');
const mongooseBuilder = new MongooseQueryBuilder();
const mongooseQueries = mongooseBuilder.buildPaginationQuery(commonParams);

console.log('Mongoose Find Query:');
console.log(JSON.stringify(mongooseQueries.findQuery, null, 2));
console.log('\nMongoose Count Query:');
console.log(JSON.stringify(mongooseQueries.countQuery, null, 2));

// Simulate usage with Mongoose
const mongooseUsage = `
// Usage with Mongoose Model:
const query = mongooseQueries.findQuery;
const countQuery = mongooseQueries.countQuery;

const [users, total] = await Promise.all([
  User.find(query.filter)
      .limit(query.limit)
      .skip(query.skip)
      .sort(query.sort)
      .select(query.select),
  User.countDocuments(countQuery.filter)
]);

const result = mongooseBuilder.processPaginationResult(users, total, params);
`;

console.log('\nMongoose Usage:');
console.log(mongooseUsage);
console.log('\n' + '='.repeat(80) + '\n');

// Example 5: Custom ORM Implementation
console.log('🔧 Custom ORM Implementation Example');

interface CustomOrmQueryOptions extends BaseQueryOptions {
  filter?: any;
  max?: number;
  start?: number;
  sortBy?: Array<{ field: string; order: 'ASC' | 'DESC' }>;
  fields?: string[];
}

class CustomOrmQueryBuilder extends BaseQueryBuilder<CustomOrmQueryOptions> {
  constructor() {
    // You would pass your custom adapter here
    super(new PrismaQueryBuilder()['adapter']); // Just for demo
  }

  protected createEmptyQuery(): CustomOrmQueryOptions {
    return {};
  }

  protected setTake(query: CustomOrmQueryOptions, take: number): void {
    query.max = take; // Custom ORM uses 'max' instead of 'take'
  }

  protected setSkip(query: CustomOrmQueryOptions, skip: number): void {
    query.start = skip; // Custom ORM uses 'start' instead of 'skip'
  }

  protected setOrderBy(query: CustomOrmQueryOptions, orderBy: Record<string, 'asc' | 'desc'>): void {
    query.sortBy = Object.entries(orderBy).map(([field, direction]) => ({
      field,
      order: direction.toUpperCase() as 'ASC' | 'DESC'
    }));
  }

  protected setSelect(query: CustomOrmQueryOptions, select: Record<string, any>): void {
    query.fields = Object.keys(select).filter(key => select[key] === true);
  }

  protected createCountQuery(findQuery: CustomOrmQueryOptions): CustomOrmQueryOptions {
    const countQuery: CustomOrmQueryOptions = {};
    if (findQuery.where) {
      countQuery.filter = findQuery.where;
    }
    return countQuery;
  }
}

const customBuilder = new CustomOrmQueryBuilder();
const customQuery = customBuilder.buildQuery(commonParams);

console.log('Custom ORM Query:');
console.log(JSON.stringify(customQuery, null, 2));

console.log('\n' + '='.repeat(80) + '\n');

// Example 6: Consistent API across all ORMs
console.log('🔄 Consistent API Demonstration');

const builders = [
  { name: 'Prisma', builder: prismaBuilder },
  { name: 'TypeORM', builder: typeormBuilder },
  { name: 'Sequelize', builder: sequelizeBuilder },
  { name: 'Mongoose', builder: mongooseBuilder },
  { name: 'Custom', builder: customBuilder }
];

// Simulate data processing for all ORMs
const mockData = [
  { id: 1, name: 'Alice Johnson', salary: 75000 },
  { id: 2, name: 'Bob Smith', salary: 85000 }
];
const mockTotal = 150;

console.log('Pagination Results (all ORMs use same API):');

builders.forEach(({ name, builder }) => {
  const result = builder.processPaginationResult(mockData, mockTotal, commonParams);
  
  console.log(`\n${name} Pagination Result:`);
  console.log(`- Data count: ${result.data.length}`);
  console.log(`- Total: ${result.count}`);
  console.log(`- Has next: ${result.hasNext}`);
  console.log(`- Has previous: ${result.hasPrevious}`);
  console.log(`- Current page: ${result.currentPage}`);
  console.log(`- Total pages: ${result.totalPages}`);
});

console.log('\n' + '='.repeat(80) + '\n');

console.log('✅ Benefits of Abstract Base Class:');
console.log('1. 🔄 Consistent API across all ORMs');
console.log('2. 🧩 Easy to add new ORM support');
console.log('3. 🔧 Customizable for different ORM query formats');
console.log('4. 📊 Shared pagination logic');
console.log('5. 🛡️ Type safety with generics');
console.log('6. 🧪 Easy to test and maintain');

console.log('\n🎉 Abstract Base Query Builder provides a solid foundation');
console.log('for implementing OData pagination across any ORM!');

// Generic function that works with any query builder
function createGenericPaginationApi<T extends BaseQueryOptions>(
  builder: BaseQueryBuilder<T>
) {
  return {
    async paginate(params: ODataQueryParams, dataFetcher: (query: T) => Promise<any[]>, counter: (query: T) => Promise<number>) {
      const { findQuery, countQuery } = builder.buildPaginationQuery(params);
      
      const [data, total] = await Promise.all([
        dataFetcher(findQuery),
        counter(countQuery)
      ]);
      
      return builder.processPaginationResult(data, total, params);
    }
  };
}

console.log('\n📝 Generic Pagination API Example:');
const genericApi = createGenericPaginationApi(prismaBuilder);
console.log('✅ Generic pagination API created that works with any ORM!');

export { 
  PrismaQueryBuilder,
  TypeOrmQueryBuilder, 
  SequelizeQueryBuilder,
  MongooseQueryBuilder,
  CustomOrmQueryBuilder,
  createGenericPaginationApi
};
