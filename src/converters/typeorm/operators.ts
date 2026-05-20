/**
 * Lazy-load TypeORM operators so this lib stays usable when typeorm is not installed
 * (TypeORM is a peer dependency).
 */

export interface TypeOrmOperators {
  Equal: (value: any) => any;
  Not: (value: any) => any;
  MoreThan: (value: any) => any;
  MoreThanOrEqual: (value: any) => any;
  LessThan: (value: any) => any;
  LessThanOrEqual: (value: any) => any;
  Like: (value: string) => any;
  ILike: (value: string) => any;
  In: (values: any[]) => any;
  Between: (a: any, b: any) => any;
  IsNull: () => any;
  And: (...ops: any[]) => any;
  Or?: (...ops: any[]) => any;
  Raw?: (alias: string | ((alias: string) => string), params?: any) => any;
}

let cached: TypeOrmOperators | null = null;

export function getTypeOrmOperators(): TypeOrmOperators {
  if (cached) return cached;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('typeorm');
    cached = {
      Equal: mod.Equal,
      Not: mod.Not,
      MoreThan: mod.MoreThan,
      MoreThanOrEqual: mod.MoreThanOrEqual,
      LessThan: mod.LessThan,
      LessThanOrEqual: mod.LessThanOrEqual,
      Like: mod.Like,
      ILike: mod.ILike,
      In: mod.In,
      Between: mod.Between,
      IsNull: mod.IsNull,
      And: mod.And,
      Or: mod.Or,
      Raw: mod.Raw,
    };
    return cached!;
  } catch {
    // Fallback: emit plain-object markers so the result is still inspectable.
    // Users without typeorm installed should install it; this fallback keeps tests
    // and adapters:info from crashing.
    const make = (op: string) => (...args: any[]) => ({ _type: op, args });
    cached = {
      Equal: make('Equal'),
      Not: make('Not'),
      MoreThan: make('MoreThan'),
      MoreThanOrEqual: make('MoreThanOrEqual'),
      LessThan: make('LessThan'),
      LessThanOrEqual: make('LessThanOrEqual'),
      Like: make('Like'),
      ILike: make('ILike'),
      In: make('In'),
      Between: (a: any, b: any) => ({ _type: 'Between', args: [a, b] }),
      IsNull: () => ({ _type: 'IsNull', args: [] }),
      And: make('And'),
      Or: make('Or'),
      Raw: make('Raw'),
    };
    return cached!;
  }
}

/**
 * For tests / re-init.
 */
export function _resetTypeOrmOperatorsCache(): void {
  cached = null;
}
