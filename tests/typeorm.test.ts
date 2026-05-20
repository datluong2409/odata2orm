/**
 * TypeORM adapter tests.
 *
 * The `typeorm` package is not a devDependency of this lib (it is a peer dep),
 * so the operator helpers fall back to plain marker objects of the form
 * `{ _type: '<OpName>', args: [...] }`. These tests assert against that shape.
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import {
  convertToTypeORM,
  TypeOrmQueryBuilder,
  buildTypeOrmQuery,
  buildTypeOrmPagination,
  AdapterFactory,
  SupportedOrm,
} from '../src';
import { _resetTypeOrmOperatorsCache } from '../src/converters/typeorm/operators';

const op = (name: string, ...args: any[]) => ({ _type: name, args });

beforeEach(() => {
  _resetTypeOrmOperatorsCache();
});

describe('TypeORM adapter — comparisons', () => {
  test('eq', () => {
    expect(convertToTypeORM("Name eq 'John'")).toEqual({ Name: op('Equal', 'John') });
  });

  test('ne', () => {
    expect(convertToTypeORM('Age ne 25')).toEqual({ Age: op('Not', 25) });
  });

  test('gt / ge / lt / le', () => {
    expect(convertToTypeORM('Age gt 18')).toEqual({ Age: op('MoreThan', 18) });
    expect(convertToTypeORM('Age ge 18')).toEqual({ Age: op('MoreThanOrEqual', 18) });
    expect(convertToTypeORM('Age lt 65')).toEqual({ Age: op('LessThan', 65) });
    expect(convertToTypeORM('Age le 65')).toEqual({ Age: op('LessThanOrEqual', 65) });
  });

  test('eq null → IsNull', () => {
    expect(convertToTypeORM('DeletedAt eq null')).toEqual({ DeletedAt: op('IsNull') });
  });

  test('ne null → Not(IsNull)', () => {
    expect(convertToTypeORM('DeletedAt ne null')).toEqual({
      DeletedAt: op('Not', op('IsNull')),
    });
  });
});

describe('TypeORM adapter — logical', () => {
  test('AND of two fields merges into one object', () => {
    expect(convertToTypeORM("Name eq 'John' and Age gt 25")).toEqual({
      Name: op('Equal', 'John'),
      Age: op('MoreThan', 25),
    });
  });

  test('AND on same field uses And() operator', () => {
    expect(convertToTypeORM('Age gt 18 and Age lt 65')).toEqual({
      Age: op('And', op('MoreThan', 18), op('LessThan', 65)),
    });
  });

  test('OR on same field optimizes to In()', () => {
    expect(convertToTypeORM("Name eq 'John' or Name eq 'Jane'")).toEqual({
      Name: op('In', ['John', 'Jane']),
    });
  });

  test('OR on different fields stays an array', () => {
    expect(convertToTypeORM("Name eq 'John' or Age gt 30")).toEqual([
      { Name: op('Equal', 'John') },
      { Age: op('MoreThan', 30) },
    ]);
  });

  test('AND distributes over OR', () => {
    const result = convertToTypeORM("Status eq 'active' and (Role eq 'admin' or Role eq 'user')");
    expect(result).toEqual([
      { Status: op('Equal', 'active'), Role: op('Equal', 'admin') },
      { Status: op('Equal', 'active'), Role: op('Equal', 'user') },
    ]);
  });

  test('NOT of single comparison wraps with Not()', () => {
    expect(convertToTypeORM('not (Age lt 18)')).toEqual({ Age: op('Not', op('LessThan', 18)) });
  });

  test('NOT of AND becomes OR of Nots (de Morgan)', () => {
    expect(convertToTypeORM("not (Name eq 'John' and Age gt 25)")).toEqual([
      { Name: op('Not', op('Equal', 'John')) },
      { Age: op('Not', op('MoreThan', 25)) },
    ]);
  });
});

describe('TypeORM adapter — string methods', () => {
  test('contains → Like %x%', () => {
    expect(convertToTypeORM("contains(Name, 'jo')")).toEqual({ Name: op('Like', '%jo%') });
  });

  test('startswith → Like x%', () => {
    expect(convertToTypeORM("startswith(Name, 'jo')")).toEqual({ Name: op('Like', 'jo%') });
  });

  test('endswith → Like %x', () => {
    expect(convertToTypeORM("endswith(Name, 'hn')")).toEqual({ Name: op('Like', '%hn') });
  });

  test('caseSensitive=false → ILike', () => {
    expect(convertToTypeORM("contains(Name, 'jo')", { caseSensitive: false })).toEqual({
      Name: op('ILike', '%jo%'),
    });
  });
});

describe('TypeORM adapter — IN', () => {
  test('OData in (...) → In([...])', () => {
    expect(convertToTypeORM("Status in ('a', 'b', 'c')")).toEqual({
      Status: op('In', ['a', 'b', 'c']),
    });
  });
});

describe('TypeORM adapter — dates', () => {
  test('year(date) eq 2024 → range', () => {
    const result: any = convertToTypeORM('year(CreatedAt) eq 2024');
    expect(result.CreatedAt._type).toBe('And');
    const [lo, hi] = result.CreatedAt.args;
    expect(lo._type).toBe('MoreThanOrEqual');
    expect((lo.args[0] as Date).toISOString()).toBe('2024-01-01T00:00:00.000Z');
    expect(hi._type).toBe('LessThan');
    expect((hi.args[0] as Date).toISOString()).toBe('2025-01-01T00:00:00.000Z');
  });

  test('year + month combo → narrowed range', () => {
    const result: any = convertToTypeORM('year(CreatedAt) eq 2024 and month(CreatedAt) eq 3');
    expect(result.CreatedAt._type).toBe('And');
    const [lo, hi] = result.CreatedAt.args;
    expect((lo.args[0] as Date).toISOString()).toBe('2024-03-01T00:00:00.000Z');
    expect((hi.args[0] as Date).toISOString()).toBe('2024-04-01T00:00:00.000Z');
  });

  test('date range (ge ... and le ...) → And(MoreThanOrEqual, LessThanOrEqual)', () => {
    const result: any = convertToTypeORM(
      "CreatedAt ge datetime'2024-01-01T00:00:00Z' and CreatedAt le datetime'2024-12-31T23:59:59Z'"
    );
    expect(result.CreatedAt._type).toBe('And');
    expect(result.CreatedAt.args[0]._type).toBe('MoreThanOrEqual');
    expect(result.CreatedAt.args[1]._type).toBe('LessThanOrEqual');
  });
});

describe('TypeORM adapter — nested navigation', () => {
  test('nested path produces nested object', () => {
    expect(convertToTypeORM("profile/email eq 'a@b.com'")).toEqual({
      profile: { email: op('Equal', 'a@b.com') },
    });
  });

  test('deep nested AND merges', () => {
    expect(convertToTypeORM("profile/email eq 'a@b.com' and profile/verified eq true")).toEqual({
      profile: {
        email: op('Equal', 'a@b.com'),
        verified: op('Equal', true),
      },
    });
  });
});

describe('TypeORM adapter — indexof', () => {
  test('indexof(field, x) ge 0 → Like contains', () => {
    expect(convertToTypeORM("indexof(Name, 'jo') ge 0")).toEqual({ Name: op('Like', '%jo%') });
  });

  test('indexof(field, x) eq -1 → Not(Like contains)', () => {
    expect(convertToTypeORM("indexof(Name, 'jo') eq -1")).toEqual({
      Name: op('Not', op('Like', '%jo%')),
    });
  });
});

describe('TypeOrmQueryBuilder', () => {
  let builder: TypeOrmQueryBuilder;

  beforeEach(() => {
    builder = new TypeOrmQueryBuilder();
  });

  test('builds full query', () => {
    const query = builder.buildQuery({
      $filter: "status eq 'active'",
      $top: 15,
      $skip: 10,
      $orderby: 'createdAt desc, name asc',
      $select: 'id,name,status',
    });

    expect(query.where).toEqual({ status: op('Equal', 'active') });
    expect(query.take).toBe(15);
    expect(query.skip).toBe(10);
    expect(query.order).toEqual({ createdAt: 'DESC', name: 'ASC' });
    expect(query.select).toEqual(['id', 'name', 'status']);
  });

  test('buildPaginationQuery strips take/skip from count', () => {
    const { findQuery, countQuery } = builder.buildPaginationQuery({
      $filter: "department eq 'IT'",
      $top: 25,
    });
    expect(findQuery.take).toBe(25);
    expect(countQuery.take).toBeUndefined();
    expect(countQuery.skip).toBeUndefined();
    expect(countQuery.where).toEqual({ department: op('Equal', 'IT') });
  });

  test('buildTypeOrmQuery convenience export works', () => {
    const q = buildTypeOrmQuery({ $filter: 'id eq 1' });
    expect(q.where).toEqual({ id: op('Equal', 1) });
  });

  test('buildTypeOrmPagination convenience export works', () => {
    const { findQuery, countQuery } = buildTypeOrmPagination({ $filter: 'id eq 1', $top: 5 });
    expect(findQuery.where).toEqual({ id: op('Equal', 1) });
    expect(countQuery.where).toEqual({ id: op('Equal', 1) });
  });
});

describe('AdapterFactory status', () => {
  test('TypeORM is now Available', () => {
    const info = AdapterFactory.getAdapterInfo();
    const typeorm = info.find((i) => i.orm === 'TypeORM');
    expect(typeorm).toBeDefined();
    expect(typeorm!.status).toBe('Available');
  });

  test('AdapterFactory.createAdapter(TYPEORM) converts without throwing', () => {
    const adapter = AdapterFactory.createAdapter(SupportedOrm.TYPEORM);
    expect(() => adapter.convert("Name eq 'John'")).not.toThrow();
  });
});
