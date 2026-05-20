/**
 * Lazy-load Sequelize Op symbols so this lib stays usable when sequelize is not installed
 * (Sequelize is a peer dependency). When the real package is missing, a fallback object of
 * unique Symbols is used so the produced where-clauses are still inspectable and tests can
 * assert against them by importing `getSequelizeOps()`.
 */

export interface SequelizeOps {
  eq: symbol | string;
  ne: symbol | string;
  gt: symbol | string;
  gte: symbol | string;
  lt: symbol | string;
  lte: symbol | string;
  like: symbol | string;
  iLike: symbol | string;
  notLike: symbol | string;
  notILike: symbol | string;
  in: symbol | string;
  notIn: symbol | string;
  between: symbol | string;
  notBetween: symbol | string;
  is: symbol | string;
  not: symbol | string;
  and: symbol | string;
  or: symbol | string;
}

let cached: SequelizeOps | null = null;

const fallbackOps = (): SequelizeOps => ({
  eq: Symbol.for('sequelize.op.eq'),
  ne: Symbol.for('sequelize.op.ne'),
  gt: Symbol.for('sequelize.op.gt'),
  gte: Symbol.for('sequelize.op.gte'),
  lt: Symbol.for('sequelize.op.lt'),
  lte: Symbol.for('sequelize.op.lte'),
  like: Symbol.for('sequelize.op.like'),
  iLike: Symbol.for('sequelize.op.iLike'),
  notLike: Symbol.for('sequelize.op.notLike'),
  notILike: Symbol.for('sequelize.op.notILike'),
  in: Symbol.for('sequelize.op.in'),
  notIn: Symbol.for('sequelize.op.notIn'),
  between: Symbol.for('sequelize.op.between'),
  notBetween: Symbol.for('sequelize.op.notBetween'),
  is: Symbol.for('sequelize.op.is'),
  not: Symbol.for('sequelize.op.not'),
  and: Symbol.for('sequelize.op.and'),
  or: Symbol.for('sequelize.op.or'),
});

export function getSequelizeOps(): SequelizeOps {
  if (cached) return cached;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('sequelize');
    const Op = mod.Op || (mod.default && mod.default.Op);
    if (!Op) throw new Error('Op not found');
    cached = {
      eq: Op.eq,
      ne: Op.ne,
      gt: Op.gt,
      gte: Op.gte,
      lt: Op.lt,
      lte: Op.lte,
      like: Op.like,
      iLike: Op.iLike,
      notLike: Op.notLike,
      notILike: Op.notILike,
      in: Op.in,
      notIn: Op.notIn,
      between: Op.between,
      notBetween: Op.notBetween,
      is: Op.is,
      not: Op.not,
      and: Op.and,
      or: Op.or,
    };
    return cached!;
  } catch {
    cached = fallbackOps();
    return cached!;
  }
}

export function _resetSequelizeOpsCache(): void {
  cached = null;
}
