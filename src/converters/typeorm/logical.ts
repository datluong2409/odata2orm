/**
 * Logical combinators for TypeORM where clauses.
 *
 * Representation:
 *   - A "where" is either FindOptionsWhere (object) or FindOptionsWhere[] (OR of objects).
 *   - AND of objects = merge (overlapping keys wrap in And()).
 *   - AND involving arrays = cartesian distribute.
 *   - OR = concat arrays of objects.
 */

import { getTypeOrmOperators } from './operators';

export type TypeOrmWhere = Record<string, any> | Record<string, any>[];

function isPlainObject(v: any): v is Record<string, any> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function isFindOperator(v: any): boolean {
  // TypeORM FindOperator instances have a "_type" or constructor name "FindOperator".
  if (!v || typeof v !== 'object') return false;
  if (typeof v._type === 'string') return true;
  if (v.constructor && v.constructor.name === 'FindOperator') return true;
  return false;
}

/**
 * Merge two object-form where clauses with AND semantics.
 * Overlapping keys wrap with TypeORM's And() operator (or merge deeper for relations).
 */
function mergeAndObjects(a: Record<string, any>, b: Record<string, any>): Record<string, any> {
  const { And } = getTypeOrmOperators();
  const result: Record<string, any> = { ...a };

  for (const key of Object.keys(b)) {
    if (!(key in result)) {
      result[key] = b[key];
      continue;
    }

    const av = result[key];
    const bv = b[key];

    // Both plain objects (no FindOperator) → relation/nested merge
    if (isPlainObject(av) && !isFindOperator(av) && isPlainObject(bv) && !isFindOperator(bv)) {
      result[key] = mergeAndObjects(av, bv);
      continue;
    }

    // Otherwise combine with And()
    result[key] = And(av, bv);
  }

  return result;
}

/**
 * Combine two where clauses with AND semantics, handling arrays (OR) via distribution.
 */
export function andWhere(a: TypeOrmWhere, b: TypeOrmWhere): TypeOrmWhere {
  const aArr = Array.isArray(a) ? a : [a];
  const bArr = Array.isArray(b) ? b : [b];

  const out: Record<string, any>[] = [];
  for (const ai of aArr) {
    for (const bi of bArr) {
      out.push(mergeAndObjects(ai, bi));
    }
  }

  return out.length === 1 ? out[0] : out;
}

/**
 * Combine two where clauses with OR semantics → array concat.
 */
export function orWhere(a: TypeOrmWhere, b: TypeOrmWhere): TypeOrmWhere {
  const aArr = Array.isArray(a) ? a : [a];
  const bArr = Array.isArray(b) ? b : [b];
  const out = [...aArr, ...bArr];
  return out.length === 1 ? out[0] : out;
}

/**
 * Collapse arrays of single-field Equal-on-same-field where clauses into In([...]).
 * Runs once at the top of the result tree.
 */
export function optimizeOrToIn(where: TypeOrmWhere): TypeOrmWhere {
  if (!Array.isArray(where)) return where;

  let field: string | null = null;
  const values: any[] = [];

  for (const branch of where) {
    const keys = Object.keys(branch);
    if (keys.length !== 1) return where;
    const key = keys[0];
    const v = branch[key];
    if (!isFindOperator(v)) return where;
    if (v._type === 'Equal') {
      if (field === null) field = key;
      else if (field !== key) return where;
      values.push(v.args[0]);
    } else if (v._type === 'In') {
      if (field === null) field = key;
      else if (field !== key) return where;
      values.push(...v.args[0]);
    } else {
      return where;
    }
  }

  if (field === null) return where;
  const { In, Equal } = getTypeOrmOperators();
  const unique = [...new Set(values)];
  return unique.length === 1 ? { [field]: Equal(unique[0]) } : { [field]: In(unique) };
}

/**
 * Negate a where clause using de Morgan's laws.
 * - NOT (AND of fields) → OR of negated fields
 * - NOT (OR / array)    → AND of negated branches
 * - NOT { field: op }   → { field: Not(op) } (or invert op pair for null/in)
 */
export function notWhere(w: TypeOrmWhere): TypeOrmWhere {
  const { Not } = getTypeOrmOperators();

  if (Array.isArray(w)) {
    // NOT (a OR b OR c) = NOT a AND NOT b AND NOT c
    return w.reduce<TypeOrmWhere>((acc, branch, idx) => {
      const negated = notWhere(branch);
      return idx === 0 ? negated : andWhere(acc, negated);
    }, {});
  }

  const keys = Object.keys(w);

  // Single-field clause → wrap field value in Not()
  if (keys.length === 1) {
    const k = keys[0];
    const v = w[k];

    // Nested relation (plain object without FindOperator) → recurse, then wrap each leaf
    if (isPlainObject(v) && !isFindOperator(v)) {
      return { [k]: notWhere(v) };
    }

    return { [k]: Not(v) };
  }

  // Multi-field AND → split into OR of negations
  const branches = keys.map((k) => notWhere({ [k]: w[k] }));
  return branches.reduce((acc, br, idx) => (idx === 0 ? br : orWhere(acc, br)));
}
