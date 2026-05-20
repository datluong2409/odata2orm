/**
 * Simple test file to verify the conversion works
 */

import { inspect } from 'util';
import {
  convert,
  convertToPrisma,
  convertToTypeORM,
  convertToSequelize,
  convertToMongoose,
  buildPrismaQuery,
  buildPrismaPagination,
  QueryBuilderFactory,
  SupportedOrm,
} from './dist/index';

// util.inspect handles Symbols (Sequelize Op.*) and functions (TypeORM FindOperator) better than JSON.stringify
const dump = (v: unknown) => inspect(v, { depth: null, colors: false, compact: false });

function section(title: string) {
  console.log(`\n=== ${title} ===`);
}

function runCase(label: string, input: string, output: unknown) {
  console.log(`\n[${label}]`);
  console.log(`  Input : ${input}`);
  console.log(`  Output: ${dump(output)}`);
}

try {
  // ---------- Default convert (Prisma) ----------
  section('Default convert() — Prisma');
  runCase('Simple equality',   "Name eq 'John'",                 convert("Name eq 'John'"));
  runCase('Comparison',        "Age gt 25",                      convert("Age gt 25"));
  runCase('String contains',   "contains(Name, 'John')",         convert("contains(Name, 'John')"));
  runCase('Complex AND',       "Name eq 'John' and Age gt 25",   convert("Name eq 'John' and Age gt 25"));
  runCase('OR -> in',          "Status eq 'A' or Status eq 'B'", convert("Status eq 'A' or Status eq 'B'"));
  runCase('startswith',        "startswith(Email, 'admin')",     convert("startswith(Email, 'admin')"));
  runCase('Date range',        "CreatedAt ge 2024-01-01 and CreatedAt lt 2025-01-01", convert("CreatedAt ge 2024-01-01 and CreatedAt lt 2025-01-01"));
  runCase('NOT',               "not (Age lt 18)",                convert("not (Age lt 18)"));

  // ---------- Prisma ----------
  section('convertToPrisma()');
  runCase('eq + ne',           "Name eq 'John' and Status ne 'X'", convertToPrisma("Name eq 'John' and Status ne 'X'"));
  runCase('in via OR',         "Role eq 'admin' or Role eq 'mod'", convertToPrisma("Role eq 'admin' or Role eq 'mod'"));
  runCase('contains',          "contains(tolower(Name), 'jo')",    convertToPrisma("contains(tolower(Name), 'jo')"));
  runCase('between (ge/le)',   "Price ge 10 and Price le 99",      convertToPrisma("Price ge 10 and Price le 99"));

  // ---------- TypeORM ----------
  section('convertToTypeORM()');
  runCase('eq',                "Name eq 'John'",                 convertToTypeORM("Name eq 'John'"));
  runCase('gt',                "Age gt 25",                      convertToTypeORM("Age gt 25"));
  runCase('AND',               "Active eq true and Age ge 18",   convertToTypeORM("Active eq true and Age ge 18"));
  runCase('OR (array)',        "Type eq 'A' or Type eq 'B'",     convertToTypeORM("Type eq 'A' or Type eq 'B'"));
  runCase('contains',          "contains(Name, 'jo')",           convertToTypeORM("contains(Name, 'jo')"));

  // ---------- Sequelize ----------
  section('convertToSequelize()');
  runCase('eq',                "Name eq 'John'",                 convertToSequelize("Name eq 'John'"));
  runCase('gt/lt',             "Age gt 18 and Age lt 65",        convertToSequelize("Age gt 18 and Age lt 65"));
  runCase('OR',                "Status eq 'A' or Status eq 'B'", convertToSequelize("Status eq 'A' or Status eq 'B'"));
  runCase('startswith',        "startswith(Email, 'admin')",     convertToSequelize("startswith(Email, 'admin')"));
  runCase('NOT',               "not (Archived eq true)",         convertToSequelize("not (Archived eq true)"));

  // ---------- Mongoose ----------
  section('convertToMongoose()');
  runCase('eq',                "Name eq 'John'",                 convertToMongoose("Name eq 'John'"));
  runCase('gte/lte',           "Score ge 50 and Score le 90",    convertToMongoose("Score ge 50 and Score le 90"));
  runCase('OR -> $in',         "Tag eq 'x' or Tag eq 'y'",       convertToMongoose("Tag eq 'x' or Tag eq 'y'"));
  runCase('contains -> regex', "contains(Name, 'jo')",           convertToMongoose("contains(Name, 'jo')"));
  runCase('endswith -> regex', "endswith(Email, '@corp.com')",   convertToMongoose("endswith(Email, '@corp.com')"));

  // ---------- Full query builder (Prisma) ----------
  section('buildPrismaQuery() — $filter + $top + $skip + $orderby + $select');
  const prismaQuery = buildPrismaQuery({
    $filter:  "Age gt 18 and contains(Name, 'jo')",
    $top:     10,
    $skip:    20,
    $orderby: 'Name asc, CreatedAt desc',
    $select:  'id,Name,Age',
  });
  console.log(dump(prismaQuery));

  section('buildPrismaPagination() — findQuery + countQuery');
  const prismaPag = buildPrismaPagination({
    $filter: "Active eq true",
    $top:    5,
    $skip:   0,
  });
  console.log(dump(prismaPag));

  // ---------- Query builders for other ORMs (pagination / orderBy / select; filter only) ----------
  section('QueryBuilderFactory — TypeORM / Sequelize / Mongoose');
  for (const orm of [SupportedOrm.TYPEORM, SupportedOrm.SEQUELIZE, SupportedOrm.MONGOOSE]) {
    const qb = QueryBuilderFactory.createQueryBuilder(orm);
    const q  = qb.buildQuery({
      $filter:  "Age gt 18",
      $top:     5,
      $skip:    10,
      $orderby: 'Name asc',
      $select:  'id,Name,Age',
    });
    console.log(`\n[${orm}]`);
    console.log(dump(q));
  }

  console.log('\nAll examples ran.');
} catch (error) {
  console.error('Test failed:', error);
  process.exitCode = 1;
}
