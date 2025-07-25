/**
 * Test cases for OData Pagination Features
 */

import { 
  buildPrismaQuery, 
  buildPrismaPagination,
  PrismaQueryBuilder,
  parseOrderBy,
  parseSelect,
  calculatePagination
} from '../src';
import type { ODataQueryParams } from '../src';

describe('OData Pagination Features', () => {
  describe('parseOrderBy', () => {
    it('should parse simple orderby', () => {
      expect(parseOrderBy('name asc')).toEqual({ name: 'asc' });
      expect(parseOrderBy('name desc')).toEqual({ name: 'desc' });
      expect(parseOrderBy('name')).toEqual({ name: 'asc' }); // default to asc
    });

    it('should parse multiple orderby fields', () => {
      expect(parseOrderBy('name asc, age desc')).toEqual({
        name: 'asc',
        age: 'desc'
      });
    });

    it('should handle empty or invalid input', () => {
      expect(parseOrderBy('')).toEqual({});
      expect(parseOrderBy(null as any)).toEqual({});
    });
  });

  describe('parseSelect', () => {
    it('should parse simple select fields', () => {
      expect(parseSelect('name,age,email')).toEqual({
        name: true,
        age: true,
        email: true
      });
    });

    it('should parse nested select fields', () => {
      expect(parseSelect('user(name,email)')).toEqual({
        user: {
          name: true,
          email: true
        }
      });
    });

    it('should handle empty input', () => {
      expect(parseSelect('')).toEqual({});
    });
  });

  describe('calculatePagination', () => {
    it('should calculate pagination metadata', () => {
      const result = calculatePagination(100, 20, 10);
      expect(result).toEqual({
        hasNext: true,
        hasPrevious: true,
        totalPages: 10,
        currentPage: 3,
        pageSize: 10
      });
    });

    it('should handle first page', () => {
      const result = calculatePagination(100, 0, 10);
      expect(result).toEqual({
        hasNext: true,
        hasPrevious: false,
        totalPages: 10,
        currentPage: 1,
        pageSize: 10
      });
    });

    it('should handle last page', () => {
      const result = calculatePagination(100, 90, 10);
      expect(result).toEqual({
        hasNext: false,
        hasPrevious: true,
        totalPages: 10,
        currentPage: 10,
        pageSize: 10
      });
    });
  });

  describe('buildPrismaQuery', () => {
    it('should build complete Prisma query from OData params', () => {
      const params: ODataQueryParams = {
        $filter: "name eq 'John'",
        $top: 10,
        $skip: 20,
        $orderby: 'name asc, age desc',
        $select: 'name,age,email'
      };

      const result = buildPrismaQuery(params);

      expect(result).toHaveProperty('where');
      expect(result.take).toBe(10);
      expect(result.skip).toBe(20);
      expect(result.orderBy).toEqual([
        { name: 'asc' },
        { age: 'desc' }
      ]);
      expect(result.select).toEqual({
        name: true,
        age: true,
        email: true
      });
    });

    it('should handle minimal params', () => {
      const params: ODataQueryParams = {
        $filter: "active eq true"
      };

      const result = buildPrismaQuery(params);

      expect(result).toHaveProperty('where');
      expect(result.take).toBeUndefined();
      expect(result.skip).toBeUndefined();
    });
  });

  describe('buildPrismaPagination', () => {
    it('should build separate find and count queries', () => {
      const params: ODataQueryParams = {
        $filter: "name eq 'John'",
        $top: 10,
        $skip: 20,
        $orderby: 'name asc',
        $select: 'name,email'
      };

      const result = buildPrismaPagination(params);

      // Find query should have all options
      expect(result.findQuery).toHaveProperty('where');
      expect(result.findQuery.take).toBe(10);
      expect(result.findQuery.skip).toBe(20);
      expect(result.findQuery.orderBy).toBeDefined();
      expect(result.findQuery.select).toBeDefined();

      // Count query should only have where clause
      expect(result.countQuery).toHaveProperty('where');
      expect(result.countQuery.take).toBeUndefined();
      expect(result.countQuery.skip).toBeUndefined();
      expect(result.countQuery.orderBy).toBeUndefined();
      expect(result.countQuery.select).toBeUndefined();
    });
  });

  describe('PrismaQueryBuilder', () => {
    let builder: PrismaQueryBuilder;

    beforeEach(() => {
      builder = new PrismaQueryBuilder();
    });

    it('should process pagination result with metadata', () => {
      const data = [{ id: 1, name: 'John' }, { id: 2, name: 'Jane' }];
      const total = 100;
      const params: ODataQueryParams = {
        $top: 10,
        $skip: 20,
        $count: true
      };

      const result = builder.processPaginationResult(data, total, params);

      expect(result.data).toBe(data);
      expect(result.count).toBe(100);
      expect(result.hasNext).toBe(true);
      expect(result.hasPrevious).toBe(true);
      expect(result.totalPages).toBe(10);
      expect(result.currentPage).toBe(3);
    });

    it('should get where clause only', () => {
      const whereClause = builder.getWhereClause("name eq 'John'");
      expect(whereClause).toHaveProperty('name');
    });
  });
});
