/**
 * Test cases for Abstract Query Builders
 */

import { 
  BaseQueryBuilder,
  PrismaQueryBuilder,
  TypeOrmQueryBuilder,
  SequelizeQueryBuilder,
  MongooseQueryBuilder,
  QueryBuilderFactory
} from '../src';
import { SupportedOrm } from '../src/enums';
import type { ODataQueryParams } from '../src';

describe('Abstract Query Builders', () => {
  const sampleParams: ODataQueryParams = {
    $filter: "name eq 'John' and age gt 25",
    $top: 10,
    $skip: 20,
    $orderby: 'name asc, age desc',
    $select: 'id,name,email,age',
    $count: true
  };

  describe('BaseQueryBuilder Abstract Class', () => {
    it('should provide common pagination processing', () => {
      const builder = new PrismaQueryBuilder();
      const mockData = [{ id: 1, name: 'John' }];
      const result = builder.processPaginationResult(mockData, 100, sampleParams);
      
      expect(result.data).toBe(mockData);
      expect(result.count).toBe(100);
      expect(result.hasNext).toBe(true);
      expect(result.hasPrevious).toBe(true);
    });
  });

  describe('PrismaQueryBuilder', () => {
    let builder: PrismaQueryBuilder;

    beforeEach(() => {
      builder = new PrismaQueryBuilder();
    });

    it('should build Prisma query with all options', () => {
      const query = builder.buildQuery(sampleParams);
      
      expect(query).toHaveProperty('where');
      expect(query.take).toBe(10);
      expect(query.skip).toBe(20);
      expect(query.orderBy).toEqual([
        { name: 'asc' },
        { age: 'desc' }
      ]);
      expect(query.select).toEqual({
        id: true,
        name: true,
        email: true,
        age: true
      });
    });

    it('should build pagination queries', () => {
      const { findQuery, countQuery } = builder.buildPaginationQuery(sampleParams);
      
      expect(findQuery).toHaveProperty('where');
      expect(findQuery.take).toBe(10);
      expect(countQuery).toHaveProperty('where');
      expect(countQuery.take).toBeUndefined();
    });
  });

  describe('TypeOrmQueryBuilder', () => {
    let builder: TypeOrmQueryBuilder;

    beforeEach(() => {
      builder = new TypeOrmQueryBuilder();
    });

    it.skip('should build TypeORM query with correct format (adapter not implemented yet)', () => {
      const query = builder.buildQuery(sampleParams);
      
      expect(query).toHaveProperty('where');
      expect(query.take).toBe(10);
      expect(query.skip).toBe(20);
      expect(query.order).toEqual({
        name: 'ASC',
        age: 'DESC'
      });
      expect(query.select).toEqual(['id', 'name', 'email', 'age']);
    });
  });

  describe('SequelizeQueryBuilder', () => {
    let builder: SequelizeQueryBuilder;

    beforeEach(() => {
      builder = new SequelizeQueryBuilder();
    });

    it.skip('should build Sequelize query with correct format (adapter not implemented yet)', () => {
      const query = builder.buildQuery(sampleParams);
      
      expect(query).toHaveProperty('where');
      expect(query.limit).toBe(10);
      expect(query.offset).toBe(20);
      expect(query.order).toEqual([
        ['name', 'ASC'],
        ['age', 'DESC']
      ]);
      expect(query.attributes).toEqual(['id', 'name', 'email', 'age']);
    });
  });

  describe('MongooseQueryBuilder', () => {
    let builder: MongooseQueryBuilder;

    beforeEach(() => {
      builder = new MongooseQueryBuilder();
    });

    it.skip('should build Mongoose query with correct format (adapter not implemented yet)', () => {
      const query = builder.buildQuery(sampleParams);
      
      expect(query).toHaveProperty('filter');
      expect(query.limit).toBe(10);
      expect(query.skip).toBe(20);
      expect(query.sort).toEqual({
        name: 1,
        age: -1
      });
      expect(query.select).toBe('id name email age');
    });
  });

  describe('QueryBuilderFactory', () => {
    it('should create correct query builder for each ORM', () => {
      const prismaBuilder = QueryBuilderFactory.createQueryBuilder(SupportedOrm.PRISMA);
      const typeormBuilder = QueryBuilderFactory.createQueryBuilder(SupportedOrm.TYPEORM);
      const sequelizeBuilder = QueryBuilderFactory.createQueryBuilder(SupportedOrm.SEQUELIZE);
      const mongooseBuilder = QueryBuilderFactory.createQueryBuilder(SupportedOrm.MONGOOSE);

      expect(prismaBuilder).toBeInstanceOf(PrismaQueryBuilder);
      expect(typeormBuilder).toBeInstanceOf(TypeOrmQueryBuilder);
      expect(sequelizeBuilder).toBeInstanceOf(SequelizeQueryBuilder);
      expect(mongooseBuilder).toBeInstanceOf(MongooseQueryBuilder);
    });

    it('should throw error for unsupported ORM', () => {
      expect(() => {
        QueryBuilderFactory.createQueryBuilder('UNKNOWN' as any);
      }).toThrow('Unsupported ORM');
    });

    it('should provide query builder info', () => {
      const info = QueryBuilderFactory.getQueryBuilderInfo();
      
      expect(info).toHaveProperty(SupportedOrm.PRISMA);
      expect(info[SupportedOrm.PRISMA]).toHaveProperty('name');
      expect(info[SupportedOrm.PRISMA]).toHaveProperty('status');
      expect(info[SupportedOrm.PRISMA].status).toBe('Available');
    });
  });

  describe('Cross-ORM Consistency', () => {
    // Only test with Prisma for now since other adapters are not implemented
    const builders = [
      new PrismaQueryBuilder()
    ];

    it('should handle empty params consistently', () => {
      const emptyParams: ODataQueryParams = {};
      
      builders.forEach(builder => {
        const query = builder.buildQuery(emptyParams);
        // Each builder should return an empty query object
        expect(typeof query).toBe('object');
      });
    });

    it('should handle filter-only params consistently', () => {
      const filterParams: ODataQueryParams = {
        $filter: "active eq true"
      };
      
      builders.forEach(builder => {
        const query = builder.buildQuery(filterParams);
        // Each builder should have a where/filter property
        const hasFilterProperty = 
          query.hasOwnProperty('where') || 
          query.hasOwnProperty('filter');
        expect(hasFilterProperty).toBe(true);
      });
    });

    it('should process pagination results consistently', () => {
      const mockData = [{ id: 1 }, { id: 2 }];
      const total = 100;
      const params: ODataQueryParams = { $top: 10, $skip: 20, $count: true };
      
      builders.forEach(builder => {
        const result = builder.processPaginationResult(mockData, total, params);
        
        expect(result.data).toBe(mockData);
        expect(result.count).toBe(100);
        expect(result.hasNext).toBe(true);
        expect(result.hasPrevious).toBe(true);
        expect(result.totalPages).toBe(10);
        expect(result.currentPage).toBe(3);
      });
    });
  });
});
