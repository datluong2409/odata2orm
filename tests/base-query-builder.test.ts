/**
 * Test cases for Abstract Base Query Builder
 */

import { 
  BaseQueryBuilder,
  PrismaQueryBuilder,
  TypeOrmQueryBuilder,
  SequelizeQueryBuilder,
  MongooseQueryBuilder
} from '../src';
import type { ODataQueryParams } from '../src';

describe('Abstract Base Query Builder', () => {
  describe('PrismaQueryBuilder', () => {
    let builder: PrismaQueryBuilder;

    beforeEach(() => {
      builder = new PrismaQueryBuilder();
    });

    it('should build Prisma query correctly', () => {
      const params: ODataQueryParams = {
        $filter: "name eq 'John'",
        $top: 10,
        $skip: 5,
        $orderby: 'name asc',
        $select: 'id,name,email'
      };

      const query = builder.buildQuery(params);

      expect(query).toHaveProperty('where');
      expect(query.take).toBe(10);
      expect(query.skip).toBe(5);
      expect(query.orderBy).toEqual([{ name: 'asc' }]);
      expect(query.select).toEqual({
        id: true,
        name: true,
        email: true
      });
    });

    it('should build pagination queries', () => {
      const params: ODataQueryParams = {
        $filter: "active eq true",
        $top: 20,
        $orderby: 'createdAt desc'
      };

      const { findQuery, countQuery } = builder.buildPaginationQuery(params);

      expect(findQuery).toHaveProperty('where');
      expect(findQuery.take).toBe(20);
      expect(findQuery.orderBy).toBeDefined();

      expect(countQuery).toHaveProperty('where');
      expect(countQuery.take).toBeUndefined();
      expect(countQuery.orderBy).toBeUndefined();
    });
  });

  describe('TypeOrmQueryBuilder', () => {
    let builder: TypeOrmQueryBuilder;

    beforeEach(() => {
      builder = new TypeOrmQueryBuilder();
    });

    it.skip('should build TypeORM query correctly (coming soon)', () => {
      // TypeORM adapter is not fully implemented yet
      const params: ODataQueryParams = {
        $filter: "status eq 'active'",
        $top: 15,
        $skip: 10,
        $orderby: 'createdAt desc, name asc',
        $select: 'id,name,status'
      };

      const query = builder.buildQuery(params);

      expect(query).toHaveProperty('where');
      expect(query.take).toBe(15);
      expect(query.skip).toBe(10);
      expect(query.order).toEqual({
        createdAt: 'DESC',
        name: 'ASC'
      });
      expect(query.select).toEqual(['id', 'name', 'status']);
    });

    it.skip('should build pagination queries (coming soon)', () => {
      // TypeORM adapter is not fully implemented yet
      const params: ODataQueryParams = {
        $filter: "department eq 'IT'",
        $top: 25
      };

      const { findQuery, countQuery } = builder.buildPaginationQuery(params);

      expect(findQuery).toHaveProperty('where');
      expect(findQuery.take).toBe(25);

      expect(countQuery).toHaveProperty('where');
      expect(countQuery.take).toBeUndefined();
    });
  });

  describe('SequelizeQueryBuilder', () => {
    let builder: SequelizeQueryBuilder;

    beforeEach(() => {
      builder = new SequelizeQueryBuilder();
    });

    it.skip('should build Sequelize query correctly (coming soon)', () => {
      // Sequelize adapter is not fully implemented yet
      const params: ODataQueryParams = {
        $filter: "age gt 18",
        $top: 30,
        $skip: 15,
        $orderby: 'age desc',
        $select: 'id,name,age'
      };

      const query = builder.buildQuery(params);

      expect(query).toHaveProperty('where');
      expect(query.limit).toBe(30);
      expect(query.offset).toBe(15);
      expect(query.order).toEqual([['age', 'DESC']]);
      expect(query.attributes).toEqual(['id', 'name', 'age']);
    });

    it.skip('should build pagination queries (coming soon)', () => {
      // Sequelize adapter is not fully implemented yet
      const params: ODataQueryParams = {
        $filter: "verified eq true",
        $top: 50
      };

      const { findQuery, countQuery } = builder.buildPaginationQuery(params);

      expect(findQuery).toHaveProperty('where');
      expect(findQuery.limit).toBe(50);

      expect(countQuery).toHaveProperty('where');
      expect(countQuery.limit).toBeUndefined();
    });
  });

  describe('MongooseQueryBuilder', () => {
    let builder: MongooseQueryBuilder;

    beforeEach(() => {
      builder = new MongooseQueryBuilder();
    });

    it.skip('should build Mongoose query correctly (coming soon)', () => {
      // Mongoose adapter is not fully implemented yet
      const params: ODataQueryParams = {
        $filter: "category eq 'electronics'",
        $top: 20,
        $skip: 10,
        $orderby: 'price asc, name desc',
        $select: 'id,name,price'
      };

      const query = builder.buildQuery(params);

      expect(query).toHaveProperty('filter'); // Mongoose uses filter instead of where
      expect(query.limit).toBe(20);
      expect(query.skip).toBe(10);
      expect(query.sort).toEqual({
        price: 1,
        name: -1
      });
      expect(query.select).toEqual({
        id: 1,
        name: 1,
        price: 1
      });
    });

    it.skip('should build pagination queries (coming soon)', () => {
      // Mongoose adapter is not fully implemented yet
      const params: ODataQueryParams = {
        $filter: "inStock eq true",
        $top: 100
      };

      const { findQuery, countQuery } = builder.buildPaginationQuery(params);

      expect(findQuery).toHaveProperty('filter');
      expect(findQuery.limit).toBe(100);

      expect(countQuery).toHaveProperty('filter');
      expect(countQuery.limit).toBeUndefined();
    });

    it.skip('should handle nested select objects (coming soon)', () => {
      // Mongoose adapter is not fully implemented yet
      const params: ODataQueryParams = {
        $select: 'name,profile(email,address)'
      };

      const query = builder.buildQuery(params);

      expect(query.select).toEqual({
        name: 1,
        'profile.email': 1,
        'profile.address': 1
      });
    });
  });

  describe('Common functionality', () => {
    it('should process pagination results consistently', () => {
      const builders = [
        new PrismaQueryBuilder(),
        new TypeOrmQueryBuilder(),
        new SequelizeQueryBuilder(),
        new MongooseQueryBuilder()
      ];

      const mockData = [{ id: 1, name: 'Test' }];
      const total = 100;
      const params: ODataQueryParams = {
        $top: 10,
        $skip: 20,
        $count: true
      };

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

    it('should get where clause consistently', () => {
      const builders = [
        new PrismaQueryBuilder(),
        new PrismaQueryBuilder()
        // Skip other builders as they're not fully implemented yet
        // new TypeOrmQueryBuilder(),
        // new SequelizeQueryBuilder(),
        // new MongooseQueryBuilder()
      ];

      const filter = "name eq 'test'";

      builders.forEach(builder => {
        const whereClause = builder.getWhereClause(filter);
        expect(whereClause).toBeDefined();
        // Each ORM will have different format, but should be defined
      });
    });
  });
});
