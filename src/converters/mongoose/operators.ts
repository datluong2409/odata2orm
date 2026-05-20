/**
 * Mongoose / MongoDB operator names. These are plain string keys (e.g. `$eq`),
 * not lazily-loaded — no native module is required.
 */

export const MongoOps = {
  eq: '$eq',
  ne: '$ne',
  gt: '$gt',
  gte: '$gte',
  lt: '$lt',
  lte: '$lte',
  in: '$in',
  nin: '$nin',
  and: '$and',
  or: '$or',
  nor: '$nor',
  not: '$not',
  regex: '$regex',
  options: '$options',
  exists: '$exists',
} as const;

export type MongoOpKey = (typeof MongoOps)[keyof typeof MongoOps];

/**
 * Escape special regex characters in a literal substring so it can be embedded
 * safely into a `$regex` pattern.
 */
export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
