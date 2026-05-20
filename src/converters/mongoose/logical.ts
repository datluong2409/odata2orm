/**
 * Logical combinators for Mongoose / MongoDB query objects.
 *
 * Representation:
 *   - A "where" is a plain object whose top-level keys are either field names
 *     (e.g. `name`) or MongoDB logical operators (`$and`, `$or`, `$nor`).
 *   - AND of two field-only objects = shallow merge; collisions wrap under $and.
 *   - OR = wrap branches under $and-of-`$or` array.
 *   - NOT = de Morgan: invert leaf ops where possible, otherwise use `$nor`.
 */

import { MongoOps } from './operators';

export type MongoWhere = Record<string, any>;

function isPlainObject(v: any): v is Record<string, any> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function hasOperatorKey(v: any): boolean {
  if (!isPlainObject(v)) return false;
  return Object.keys(v).some((k) => k.startsWith('$'));
}

function mergeAndObjects(a: MongoWhere, b: MongoWhere): MongoWhere {
  const result: MongoWhere = { ...a };

  for (const key of Object.keys(b)) {
    if (!(key in result)) {
      result[key] = b[key];
      continue;
    }

    const av = result[key];
    const bv = b[key];

    if (key === MongoOps.and && Array.isArray(av) && Array.isArray(bv)) {
      result[key] = [...av, ...bv];
      continue;
    }

    if (
      isPlainObject(av) &&
      isPlainObject(bv) &&
      hasOperatorKey(av) &&
      hasOperatorKey(bv)
    ) {
      const overlap = Object.keys(bv).some((k) => k in av);
      if (!overlap) {
        result[key] = { ...av, ...bv };
        continue;
      }
    }

    const existingAnd = result[MongoOps.and];
    const clauses = Array.isArray(existingAnd) ? existingAnd : [];
    result[MongoOps.and] = [...clauses, { [key]: av }, { [key]: bv }];
    delete result[key];
  }

  return result;
}

export function andWhere(a: MongoWhere, b: MongoWhere): MongoWhere {
  return mergeAndObjects(a, b);
}

export function orWhere(a: MongoWhere, b: MongoWhere): MongoWhere {
  const branchesOf = (w: MongoWhere): MongoWhere[] => {
    if (!isPlainObject(w)) return [w];
    const keys = Object.keys(w);
    if (keys.length === 1 && keys[0] === MongoOps.or && Array.isArray(w[MongoOps.or])) {
      return w[MongoOps.or];
    }
    return [w];
  };
  return { [MongoOps.or]: [...branchesOf(a), ...branchesOf(b)] };
}

/**
 * Negate a where clause.
 *   - { field: val }            → { field: { $ne: val } }
 *   - { field: { $op: v, ...} } → { field: { $not: { ... } } }
 *   - { $or: [...] }            → { $nor: [...] }
 *   - { $and: [...] }           → { $or: [NOT(each)] }
 *   - multi-key object (AND)    → { $or: [NOT(each)] }
 */
export function notWhere(w: MongoWhere): MongoWhere {
  const keys = Object.keys(w);

  if (keys.length === 1) {
    const k = keys[0];
    const v = w[k];

    if (k === MongoOps.or && Array.isArray(v)) {
      return { [MongoOps.nor]: v };
    }
    if (k === MongoOps.and && Array.isArray(v)) {
      return { [MongoOps.or]: v.map((branch: MongoWhere) => notWhere(branch)) };
    }
    if (k === MongoOps.nor && Array.isArray(v)) {
      return { [MongoOps.or]: v };
    }

    if (!isPlainObject(v) || !hasOperatorKey(v)) {
      return { [k]: { [MongoOps.ne]: v } };
    }

    return { [k]: { [MongoOps.not]: v } };
  }

  return { [MongoOps.or]: keys.map((k) => notWhere({ [k]: w[k] })) };
}

/**
 * Collapse a top-level `$or` of single-field `{ field: v }` (or `{ field: { $eq: v } }`)
 * into `{ field: { $in: [...] } }`.
 */
export function optimizeOrToIn(where: MongoWhere): MongoWhere {
  const branches = where[MongoOps.or];
  if (!Array.isArray(branches)) return where;

  let field: string | null = null;
  const values: any[] = [];

  for (const branch of branches) {
    if (!isPlainObject(branch)) return where;
    const keys = Object.keys(branch);
    if (keys.length !== 1) return where;
    const key = keys[0];
    if (key.startsWith('$')) return where;

    if (field === null) field = key;
    else if (field !== key) return where;

    const v = branch[key];
    if (isPlainObject(v) && hasOperatorKey(v)) {
      const opKeys = Object.keys(v);
      if (opKeys.length === 1 && opKeys[0] === MongoOps.eq) {
        values.push(v[MongoOps.eq]);
        continue;
      }
      if (opKeys.length === 1 && opKeys[0] === MongoOps.in && Array.isArray(v[MongoOps.in])) {
        values.push(...v[MongoOps.in]);
        continue;
      }
      return where;
    }
    values.push(v);
  }

  if (field === null) return where;
  const unique = [...new Set(values)];
  if (unique.length === 1) return { [field]: unique[0] };
  return { [field]: { [MongoOps.in]: unique } };
}
