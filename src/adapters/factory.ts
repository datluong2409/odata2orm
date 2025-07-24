/**
 * Factory for creating ORM adapters
 */

import { BaseOrmAdapter, ConversionOptions } from './base';
import { PrismaAdapter } from './prisma';
import { TypeOrmAdapter } from './typeorm';
import { SequelizeAdapter } from './sequelize';
import { MongooseAdapter } from './mongoose';
import { SupportedOrm, OrmStatus } from '../enums';

export type SupportedOrmType = SupportedOrm;

export class AdapterFactory {
  /**
   * Create an adapter for the specified ORM
   */
  static createAdapter(orm: SupportedOrmType, options: ConversionOptions = {}): BaseOrmAdapter {
    switch (orm.toLowerCase() as SupportedOrm) {
      case SupportedOrm.PRISMA:
        return new PrismaAdapter(options);
      
      case SupportedOrm.TYPEORM:
        return new TypeOrmAdapter(options);
      
      case SupportedOrm.SEQUELIZE:
        return new SequelizeAdapter(options);
      
      case SupportedOrm.MONGOOSE:
        return new MongooseAdapter(options);
      
      default:
        throw new Error(`Unsupported ORM: ${orm}. Supported ORMs: ${Object.values(SupportedOrm).join(', ')}`);
    }
  }

  /**
   * Get list of supported ORMs
   */
  static getSupportedOrms(): SupportedOrmType[] {
    return Object.values(SupportedOrm);
  }

  /**
   * Get adapter information for all supported ORMs
   */
  static getAdapterInfo(): Array<{orm: string, status: string, features: string[]}> {
    const orms = this.getSupportedOrms();
    return orms.map(orm => {
      const adapter = this.createAdapter(orm);
      return {
        orm: adapter.getOrmName(),
        status: orm === SupportedOrm.PRISMA ? OrmStatus.AVAILABLE : OrmStatus.COMING_SOON,
        features: adapter.getSupportedFeatures()
      };
    });
  }
}
