/**
 * Query Builder Factory
 * Factory pattern to create different ORM query builders
 */

import { PrismaQueryBuilder, PrismaQueryOptions } from './prisma-query-builder';
import { TypeOrmQueryBuilder, TypeOrmQueryOptions } from './typeorm-query-builder';
import { SequelizeQueryBuilder, SequelizeQueryOptions } from './sequelize-query-builder';
import { MongooseQueryBuilder, MongooseQueryOptions } from './mongoose-query-builder';
import { SupportedOrm } from '../enums';
import { BaseQueryBuilder, BaseQueryOptions } from './base-query-builder';

export type QueryBuilderType = 
  | PrismaQueryBuilder
  | TypeOrmQueryBuilder
  | SequelizeQueryBuilder
  | MongooseQueryBuilder;

export type QueryOptionsType = 
  | PrismaQueryOptions
  | TypeOrmQueryOptions
  | SequelizeQueryOptions
  | MongooseQueryOptions;

/**
 * Factory class for creating ORM-specific query builders
 */
export class QueryBuilderFactory {
  /**
   * Create a query builder for the specified ORM
   */
  static createQueryBuilder(orm: SupportedOrm, options = {}): BaseQueryBuilder<BaseQueryOptions> {
    switch (orm) {
      case SupportedOrm.PRISMA:
        return new PrismaQueryBuilder(options);
      
      case SupportedOrm.TYPEORM:
        return new TypeOrmQueryBuilder(options);
      
      case SupportedOrm.SEQUELIZE:
        return new SequelizeQueryBuilder(options);
      
      case SupportedOrm.MONGOOSE:
        return new MongooseQueryBuilder(options);
      
      default:
        throw new Error(`Unsupported ORM: ${orm}`);
    }
  }

  /**
   * Get information about available query builders
   */
  static getQueryBuilderInfo() {
    return {
      [SupportedOrm.PRISMA]: {
        name: 'Prisma Query Builder',
        status: 'Available',
        description: 'Fully implemented with all pagination features'
      },
      [SupportedOrm.TYPEORM]: {
        name: 'TypeORM Query Builder',
        status: 'Available',
        description: 'Complete implementation for TypeORM queries'
      },
      [SupportedOrm.SEQUELIZE]: {
        name: 'Sequelize Query Builder',
        status: 'Available',
        description: 'Complete implementation for Sequelize queries'
      },
      [SupportedOrm.MONGOOSE]: {
        name: 'Mongoose Query Builder',
        status: 'Available',
        description: 'Complete implementation for Mongoose queries'
      }
    };
  }
}