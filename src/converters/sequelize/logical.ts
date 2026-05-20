/**
 * Logical combinators for Sequelize where clauses.
 *
 * Representation:
 *   - A "where" is a plain object whose keys are either string field names or Op symbols.
 *   - AND of two objects = merge (overlapping keys combined via [Op.and] array on that field).
 *   - OR = wrap branches under [Op.or].
 *   - NOT = wrap under [Op.not].
 */

import { getSequelizeOps } from './operators';

export type SequelizeWhere = Record<string | symbol, any>;

function isPlainObject(v: any): v is Record<string | symbol, any> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function isOperatorObject(v: any): boolean {
  if (!isPlainObject(v)) return false;
  const symKeys = Object.getOwnPropertySymbols(v);
  return symKeys.length > 0;
}

function mergeAndObjects(a: SequelizeWhere, b: SequelizeWhere): SequelizeWhere {
  const { and } = getSequelizeOps();
  const result: SequelizeWhere = { ...a };
  for (const sym of Object.getOwnPropertySymbols(a)) {
    (result as any)[sym] = (a as any)[sym];
  }

  const bStringKeys = Object.keys(b);
  const bSymKeys = Object.getOwnPropertySymbols(b);

  for (const key of bStringKeys) {
    if (!(key in result)) {
      result[key] = b[key];
      continue;
    }
    const av = result[key];
    const bv = b[key];
    if (
      isPlainObject(av) &&
      isPlainObject(bv) &&
      !isOperatorObject(av) &&
      !isOperatorObject(bv)
    ) {
      result[key] = mergeAndObjects(av, bv);
      continue;
    }
    if (isOperatorObject(av) && isOperatorObject(bv)) {
      result[key] = { ...av, ...bv };
      continue;
    }
    result[key] = { [and]: [av, bv] };
  }

  for (const sym of bSymKeys) {
    const existing = (result as any)[sym];
    if (existing === undefined) {
      (result as any)[sym] = (b as any)[sym];
    } else {
      (result as any)[and] = [
        ...(Array.isArray(existing) ? existing : [{ [sym]: existing }]),
        { [sym]: (b as any)[sym] },
      ];
    }
  }

  return result;
}

export function andWhere(a: SequelizeWhere, b: SequelizeWhere): SequelizeWhere {
  return mergeAndObjects(a, b);
}

export function orWhere(a: SequelizeWhere, b: SequelizeWhere): SequelizeWhere {
  const { or } = getSequelizeOps();
  const branchesOf = (w: SequelizeWhere): SequelizeWhere[] => {
    if (!isPlainObject(w)) return [w];
    const stringKeys = Object.keys(w);
    const symKeys = Object.getOwnPropertySymbols(w);
    if (stringKeys.length === 0 && symKeys.length === 1 && symKeys[0] === or) {
      const inner = (w as any)[or];
      if (Array.isArray(inner)) return inner;
    }
    return [w];
  };
  return { [or]: [...branchesOf(a), ...branchesOf(b)] };
}

export function notWhere(w: SequelizeWhere): SequelizeWhere {
  const { not } = getSequelizeOps();
  return { [not]: w };
}

/**
 * Collapse a [Op.or] of single-field { field: { [Op.eq]: v } } into { field: { [Op.in]: [...] } }.
 * Runs once at top of result tree.
 */
export function optimizeOrToIn(where: SequelizeWhere): SequelizeWhere {
  const { or, eq, in: opIn } = getSequelizeOps();
  if (!isPlainObject(where)) return where;
  const branches = (where as any)[or];
  if (!Array.isArray(branches)) return where;

  let field: string | null = null;
  const values: any[] = [];

  for (const branch of branches) {
    if (!isPlainObject(branch)) return where;
    const stringKeys = Object.keys(branch);
    if (stringKeys.length !== 1) return where;
    if (Object.getOwnPropertySymbols(branch).length !== 0) return where;
    const key = stringKeys[0];
    const v = branch[key];

    if (field === null) field = key;
    else if (field !== key) return where;

    if (!isPlainObject(v)) {
      values.push(v);
      continue;
    }
    const vSyms = Object.getOwnPropertySymbols(v);
    if (vSyms.length !== 1) return where;
    const sym = vSyms[0];
    const inner = (v as any)[sym];
    if (sym === eq) {
      values.push(inner);
    } else if (sym === opIn && Array.isArray(inner)) {
      values.push(...inner);
    } else {
      return where;
    }
  }

  if (field === null) return where;
  const unique = [...new Set(values)];
  if (unique.length === 1) {
    return { [field]: { [eq]: unique[0] } };
  }
  return { [field]: { [opIn]: unique } };
}
