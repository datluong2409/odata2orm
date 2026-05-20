/**
 * Sequelize adapter tests.
 *
 * The `sequelize` package is not a devDependency of this lib (it is a peer dep),
 * so the operator helpers fall back to a fixed set of Symbol-keyed operators
 * (`Symbol.for('sequelize.op.<name>')`). Tests reach for the same getter so they
 * compare symbol-identical keys.
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import {
  convertToSequelize,
  SequelizeQueryBuilder,
  buildSequelizeQuery,
  buildSequelizePagination,
  AdapterFactory,
  SupportedOrm,
} from '../src';
import {
  getSequelizeOps,
  _resetSequelizeOpsCache,
} from '../src/converters/sequelize/operators';

beforeEach(() => {
  _resetSequelizeOpsCache();
});

const Op = getSequelizeOps();

describe('Sequelize adapter — comparisons', () => {
  test('eq', () => {
    expect(convertToSequelize("Name eq 'John'")).toEqual({ Name: { [Op.eq]: 'John' } });
  });

  test('ne', () => {
    expect(convertToSequelize('Age ne 25')).toEqual({ Age: { [Op.ne]: 25 } });
  });

  test('gt / ge / lt / le', () => {
    expect(convertToSequelize('Age gt 18')).toEqual({ Age: { [Op.gt]: 18 } });
    expect(convertToSequelize('Age ge 18')).toEqual({ Age: { [Op.gte]: 18 } });
    expect(convertToSequelize('Age lt 65')).toEqual({ Age: { [Op.lt]: 65 } });
    expect(convertToSequelize('Age le 65')).toEqual({ Age: { [Op.lte]: 65 } });
  });

  test('eq null → Op.is', () => {
    expect(convertToSequelize('DeletedAt eq null')).toEqual({ DeletedAt: { [Op.is]: null } });
  });

  test('ne null → Op.not', () => {
    expect(convertToSequelize('DeletedAt ne null')).toEqual({ DeletedAt: { [Op.not]: null } });
  });
});

describe('Sequelize adapter — logical', () => {
  test('AND of two fields merges into one object', () => {
    expect(convertToSequelize("Name eq 'John' and Age gt 25")).toEqual({
      Name: { [Op.eq]: 'John' },
      Age: { [Op.gt]: 25 },
    });
  });

  test('AND on same field merges operator objects', () => {
    expect(convertToSequelize('Age gt 18 and Age lt 65')).toEqual({
      Age: { [Op.gt]: 18, [Op.lt]: 65 },
    });
  });

  test('OR on same field optimizes to Op.in', () => {
    expect(convertToSequelize("Name eq 'John' or Name eq 'Jane'")).toEqual({
      Name: { [Op.in]: ['John', 'Jane'] },
    });
  });

  test('OR on different fields uses Op.or', () => {
    expect(convertToSequelize("Name eq 'John' or Age gt 30")).toEqual({
      [Op.or]: [{ Name: { [Op.eq]: 'John' } }, { Age: { [Op.gt]: 30 } }],
    });
  });

  test('NOT wraps with Op.not', () => {
    expect(convertToSequelize('not (Age lt 18)')).toEqual({
      [Op.not]: { Age: { [Op.lt]: 18 } },
    });
  });
});

describe('Sequelize adapter — string methods', () => {
  test('contains → Op.like %x%', () => {
    expect(convertToSequelize("contains(Name, 'jo')")).toEqual({ Name: { [Op.like]: '%jo%' } });
  });

  test('startswith → Op.like x%', () => {
    expect(convertToSequelize("startswith(Name, 'jo')")).toEqual({ Name: { [Op.like]: 'jo%' } });
  });

  test('endswith → Op.like %x', () => {
    expect(convertToSequelize("endswith(Name, 'hn')")).toEqual({ Name: { [Op.like]: '%hn' } });
  });

  test('caseSensitive=false → Op.iLike', () => {
    expect(convertToSequelize("contains(Name, 'jo')", { caseSensitive: false })).toEqual({
      Name: { [Op.iLike]: '%jo%' },
    });
  });
});

describe('Sequelize adapter — IN', () => {
  test('OData in (...) → Op.in', () => {
    expect(convertToSequelize("Status in ('a', 'b', 'c')")).toEqual({
      Status: { [Op.in]: ['a', 'b', 'c'] },
    });
  });
});

describe('Sequelize adapter — dates', () => {
  test('year(date) eq 2024 → gte/lt range', () => {
    const result: any = convertToSequelize('year(CreatedAt) eq 2024');
    expect((result.CreatedAt[Op.gte] as Date).toISOString()).toBe('2024-01-01T00:00:00.000Z');
    expect((result.CreatedAt[Op.lt] as Date).toISOString()).toBe('2025-01-01T00:00:00.000Z');
  });

  test('year + month combo → narrowed range', () => {
    const result: any = convertToSequelize('year(CreatedAt) eq 2024 and month(CreatedAt) eq 3');
    expect((result.CreatedAt[Op.gte] as Date).toISOString()).toBe('2024-03-01T00:00:00.000Z');
    expect((result.CreatedAt[Op.lt] as Date).toISOString()).toBe('2024-04-01T00:00:00.000Z');
  });

  test('date range (ge ... and le ...) → gte/lte', () => {
    const result: any = convertToSequelize(
      "CreatedAt ge datetime'2024-01-01T00:00:00Z' and CreatedAt le datetime'2024-12-31T23:59:59Z'"
    );
    expect(result.CreatedAt[Op.gte]).toBe('2024-01-01T00:00:00.000Z');
    expect(result.CreatedAt[Op.lte]).toBe('2024-12-31T23:59:59.000Z');
  });
});

describe('Sequelize adapter — nested navigation', () => {
  test('nested path produces dot-notation key', () => {
    expect(convertToSequelize("profile/email eq 'a@b.com'")).toEqual({
      'profile.email': { [Op.eq]: 'a@b.com' },
    });
  });
});

describe('Sequelize adapter — indexof', () => {
  test('indexof(field, x) ge 0 → Op.like %x%', () => {
    expect(convertToSequelize("indexof(Name, 'jo') ge 0")).toEqual({ Name: { [Op.like]: '%jo%' } });
  });

  test('indexof(field, x) eq -1 → Op.notLike %x%', () => {
    expect(convertToSequelize("indexof(Name, 'jo') eq -1")).toEqual({
      Name: { [Op.notLike]: '%jo%' },
    });
  });
});

describe('SequelizeQueryBuilder', () => {
  let builder: SequelizeQueryBuilder;

  beforeEach(() => {
    builder = new SequelizeQueryBuilder();
  });

  test('builds full query', () => {
    const query = builder.buildQuery({
      $filter: "status eq 'active'",
      $top: 15,
      $skip: 10,
      $orderby: 'createdAt desc, name asc',
      $select: 'id,name,status',
    });

    expect(query.where).toEqual({ status: { [Op.eq]: 'active' } });
    expect(query.limit).toBe(15);
    expect(query.offset).toBe(10);
    expect(query.order).toEqual([
      ['createdAt', 'DESC'],
      ['name', 'ASC'],
    ]);
    expect(query.attributes).toEqual(['id', 'name', 'status']);
  });

  test('buildPaginationQuery strips limit/offset from count', () => {
    const { findQuery, countQuery } = builder.buildPaginationQuery({
      $filter: "department eq 'IT'",
      $top: 25,
    });
    expect(findQuery.limit).toBe(25);
    expect(countQuery.limit).toBeUndefined();
    expect(countQuery.offset).toBeUndefined();
    expect(countQuery.where).toEqual({ department: { [Op.eq]: 'IT' } });
  });

  test('buildSequelizeQuery convenience export works', () => {
    const q = buildSequelizeQuery({ $filter: 'id eq 1' });
    expect(q.where).toEqual({ id: { [Op.eq]: 1 } });
  });

  test('buildSequelizePagination convenience export works', () => {
    const { findQuery, countQuery } = buildSequelizePagination({ $filter: 'id eq 1', $top: 5 });
    expect(findQuery.where).toEqual({ id: { [Op.eq]: 1 } });
    expect(countQuery.where).toEqual({ id: { [Op.eq]: 1 } });
  });
});

describe('AdapterFactory status', () => {
  test('Sequelize is now Available', () => {
    const info = AdapterFactory.getAdapterInfo();
    const sequelize = info.find((i) => i.orm === 'Sequelize');
    expect(sequelize).toBeDefined();
    expect(sequelize!.status).toBe('Available');
  });

  test('AdapterFactory.createAdapter(SEQUELIZE) converts without throwing', () => {
    const adapter = AdapterFactory.createAdapter(SupportedOrm.SEQUELIZE);
    expect(() => adapter.convert("Name eq 'John'")).not.toThrow();
  });
});
