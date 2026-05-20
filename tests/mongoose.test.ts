/**
 * Mongoose adapter tests.
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import {
  convertToMongoose,
  MongooseQueryBuilder,
  buildMongooseQuery,
  buildMongoosePagination,
  AdapterFactory,
  SupportedOrm,
} from '../src';

describe('Mongoose adapter — comparisons', () => {
  test('eq → shorthand { field: v }', () => {
    expect(convertToMongoose("Name eq 'John'")).toEqual({ Name: 'John' });
  });

  test('ne', () => {
    expect(convertToMongoose('Age ne 25')).toEqual({ Age: { $ne: 25 } });
  });

  test('gt / ge / lt / le', () => {
    expect(convertToMongoose('Age gt 18')).toEqual({ Age: { $gt: 18 } });
    expect(convertToMongoose('Age ge 18')).toEqual({ Age: { $gte: 18 } });
    expect(convertToMongoose('Age lt 65')).toEqual({ Age: { $lt: 65 } });
    expect(convertToMongoose('Age le 65')).toEqual({ Age: { $lte: 65 } });
  });

  test('eq null → { field: null }', () => {
    expect(convertToMongoose('DeletedAt eq null')).toEqual({ DeletedAt: null });
  });

  test('ne null → { field: { $ne: null } }', () => {
    expect(convertToMongoose('DeletedAt ne null')).toEqual({ DeletedAt: { $ne: null } });
  });
});

describe('Mongoose adapter — logical', () => {
  test('AND of two fields merges into one object', () => {
    expect(convertToMongoose("Name eq 'John' and Age gt 25")).toEqual({
      Name: 'John',
      Age: { $gt: 25 },
    });
  });

  test('AND on same field merges operator objects', () => {
    expect(convertToMongoose('Age gt 18 and Age lt 65')).toEqual({
      Age: { $gt: 18, $lt: 65 },
    });
  });

  test('AND on same field with collision falls back to $and', () => {
    const result: any = convertToMongoose('Age gt 18 and Age gt 25');
    expect(result.$and).toEqual([{ Age: { $gt: 18 } }, { Age: { $gt: 25 } }]);
  });

  test('OR on same field optimizes to $in', () => {
    expect(convertToMongoose("Name eq 'John' or Name eq 'Jane'")).toEqual({
      Name: { $in: ['John', 'Jane'] },
    });
  });

  test('OR on different fields uses $or', () => {
    expect(convertToMongoose("Name eq 'John' or Age gt 30")).toEqual({
      $or: [{ Name: 'John' }, { Age: { $gt: 30 } }],
    });
  });

  test('NOT of value clause → { field: { $ne: v } }', () => {
    expect(convertToMongoose("not (Name eq 'John')")).toEqual({ Name: { $ne: 'John' } });
  });

  test('NOT of operator clause wraps with $not', () => {
    expect(convertToMongoose('not (Age lt 18)')).toEqual({ Age: { $not: { $lt: 18 } } });
  });

  test('NOT of OR becomes $nor', () => {
    expect(convertToMongoose("not (Name eq 'John' or Age gt 30)")).toEqual({
      $nor: [{ Name: 'John' }, { Age: { $gt: 30 } }],
    });
  });
});

describe('Mongoose adapter — string methods', () => {
  test('contains → $regex', () => {
    expect(convertToMongoose("contains(Name, 'jo')")).toEqual({ Name: { $regex: 'jo' } });
  });

  test('contains caseSensitive=false → $regex with $options i', () => {
    expect(convertToMongoose("contains(Name, 'jo')", { caseSensitive: false })).toEqual({
      Name: { $regex: 'jo', $options: 'i' },
    });
  });

  test('startswith → $regex ^x', () => {
    expect(convertToMongoose("startswith(Name, 'jo')")).toEqual({ Name: { $regex: '^jo' } });
  });

  test('endswith → $regex x$', () => {
    expect(convertToMongoose("endswith(Name, 'hn')")).toEqual({ Name: { $regex: 'hn$' } });
  });

  test('contains escapes regex specials', () => {
    expect(convertToMongoose("contains(Name, 'a.b')")).toEqual({ Name: { $regex: 'a\\.b' } });
  });
});

describe('Mongoose adapter — IN', () => {
  test('OData in (...) → $in', () => {
    expect(convertToMongoose("Status in ('a', 'b', 'c')")).toEqual({
      Status: { $in: ['a', 'b', 'c'] },
    });
  });
});

describe('Mongoose adapter — dates', () => {
  test('year(date) eq 2024 → $gte/$lt range', () => {
    const result: any = convertToMongoose('year(CreatedAt) eq 2024');
    expect((result.CreatedAt.$gte as Date).toISOString()).toBe('2024-01-01T00:00:00.000Z');
    expect((result.CreatedAt.$lt as Date).toISOString()).toBe('2025-01-01T00:00:00.000Z');
  });

  test('year + month combo → narrowed range', () => {
    const result: any = convertToMongoose('year(CreatedAt) eq 2024 and month(CreatedAt) eq 3');
    expect((result.CreatedAt.$gte as Date).toISOString()).toBe('2024-03-01T00:00:00.000Z');
    expect((result.CreatedAt.$lt as Date).toISOString()).toBe('2024-04-01T00:00:00.000Z');
  });

  test('date range (ge ... and le ...) → $gte/$lte', () => {
    const result: any = convertToMongoose(
      "CreatedAt ge datetime'2024-01-01T00:00:00Z' and CreatedAt le datetime'2024-12-31T23:59:59Z'"
    );
    expect(result.CreatedAt.$gte).toBe('2024-01-01T00:00:00.000Z');
    expect(result.CreatedAt.$lte).toBe('2024-12-31T23:59:59.000Z');
  });
});

describe('Mongoose adapter — nested navigation', () => {
  test('nested path produces dot-notation key', () => {
    expect(convertToMongoose("profile/email eq 'a@b.com'")).toEqual({
      'profile.email': 'a@b.com',
    });
  });
});

describe('Mongoose adapter — indexof', () => {
  test('indexof(field, x) ge 0 → $regex contains', () => {
    expect(convertToMongoose("indexof(Name, 'jo') ge 0")).toEqual({ Name: { $regex: 'jo' } });
  });

  test('indexof(field, x) eq -1 → $not $regex contains', () => {
    expect(convertToMongoose("indexof(Name, 'jo') eq -1")).toEqual({
      Name: { $not: { $regex: 'jo' } },
    });
  });
});

describe('MongooseQueryBuilder', () => {
  let builder: MongooseQueryBuilder;

  beforeEach(() => {
    builder = new MongooseQueryBuilder();
  });

  test('builds full query (filter is the Mongoose key)', () => {
    const query = builder.buildQuery({
      $filter: "status eq 'active'",
      $top: 15,
      $skip: 10,
      $orderby: 'createdAt desc, name asc',
      $select: 'id,name,status',
    });

    expect(query.filter).toEqual({ status: 'active' });
    expect(query.limit).toBe(15);
    expect(query.skip).toBe(10);
    expect(query.sort).toEqual({ createdAt: -1, name: 1 });
    expect(query.select).toEqual({ id: 1, name: 1, status: 1 });
  });

  test('buildPaginationQuery strips limit/skip from count', () => {
    const { findQuery, countQuery } = builder.buildPaginationQuery({
      $filter: "department eq 'IT'",
      $top: 25,
    });
    expect(findQuery.limit).toBe(25);
    expect(countQuery.limit).toBeUndefined();
    expect(countQuery.skip).toBeUndefined();
    expect(countQuery.filter).toEqual({ department: 'IT' });
  });

  test('buildMongooseQuery convenience export works', () => {
    const q = buildMongooseQuery({ $filter: 'id eq 1' });
    expect(q.filter).toEqual({ id: 1 });
  });

  test('buildMongoosePagination convenience export works', () => {
    const { findQuery, countQuery } = buildMongoosePagination({ $filter: 'id eq 1', $top: 5 });
    expect(findQuery.filter).toEqual({ id: 1 });
    expect(countQuery.filter).toEqual({ id: 1 });
  });
});

describe('AdapterFactory status', () => {
  test('Mongoose is now Available', () => {
    const info = AdapterFactory.getAdapterInfo();
    const mongoose = info.find((i) => i.orm === 'Mongoose');
    expect(mongoose).toBeDefined();
    expect(mongoose!.status).toBe('Available');
  });

  test('AdapterFactory.createAdapter(MONGOOSE) converts without throwing', () => {
    const adapter = AdapterFactory.createAdapter(SupportedOrm.MONGOOSE);
    expect(() => adapter.convert("Name eq 'John'")).not.toThrow();
  });
});
