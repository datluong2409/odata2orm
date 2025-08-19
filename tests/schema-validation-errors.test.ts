/**
 * Tests for schema validation error throwing
 */

import { z } from 'zod';
import { PrismaQueryBuilder, SchemaValidationError } from '../src';

describe('Schema Validation Error Throwing', () => {
  const TestSchema = z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    profile: z.object({
      avatar: z.string().optional(),
      bio: z.string().optional(),
      address: z.object({
        city: z.string(),
        country: z.string()
      })
    }),
    orders: z.array(z.object({
      id: z.string(),
      total: z.number(),
      status: z.string(),
      items: z.array(z.object({
        name: z.string(),
        price: z.number()
      }))
    }))
  });

  const strictOptions = {
    schema: TestSchema,
    allowAllFields: false,
    enableNestedQueries: true
  };

  describe('$filter validation', () => {
    it('should throw error for invalid field in filter', () => {
      const builder = new PrismaQueryBuilder(strictOptions);
      
      expect(() => {
        builder.buildQuery({
          $filter: "invalidField eq 'test'"
        });
      }).toThrow(SchemaValidationError);
    });

    it('should throw error for invalid nested field in filter', () => {
      const builder = new PrismaQueryBuilder(strictOptions);
      
      expect(() => {
        builder.buildQuery({
          $filter: "profile/invalidField eq 'test'"
        });
      }).toThrow(SchemaValidationError);
    });

    it('should allow valid fields in filter', () => {
      const builder = new PrismaQueryBuilder(strictOptions);
      
      expect(() => {
        builder.buildQuery({
          $filter: "name eq 'test' and profile/bio eq 'bio'"
        });
      }).not.toThrow();
    });

    it('should throw error for invalid collection in any/all filter', () => {
      const builder = new PrismaQueryBuilder(strictOptions);
      
      expect(() => {
        builder.buildQuery({
          $filter: "invalidCollection/any(o: o/total gt 100)"
        });
      }).toThrow(SchemaValidationError);
    });

    it('should throw error when using any/all on non-collection field', () => {
      const builder = new PrismaQueryBuilder(strictOptions);
      
      expect(() => {
        builder.buildQuery({
          $filter: "name/any(n: n eq 'test')"
        });
      }).toThrow(SchemaValidationError);
    });

    it('should allow valid collection filters', () => {
      const builder = new PrismaQueryBuilder(strictOptions);
      
      expect(() => {
        builder.buildQuery({
          $filter: "orders/any(o: o/total gt 100)"
        });
      }).not.toThrow();
    });
  });

  describe('$select validation', () => {
    it('should throw error for invalid field in select', () => {
      const builder = new PrismaQueryBuilder(strictOptions);
      
      expect(() => {
        builder.buildQuery({
          $select: "id,invalidField"
        });
      }).toThrow(SchemaValidationError);
    });

    it('should throw error for invalid nested field in select', () => {
      const builder = new PrismaQueryBuilder(strictOptions);
      
      expect(() => {
        builder.buildQuery({
          $select: "id,profile/invalidField"
        });
      }).toThrow(SchemaValidationError);
    });

    it('should throw error for invalid nested select with parentheses', () => {
      const builder = new PrismaQueryBuilder(strictOptions);
      
      expect(() => {
        builder.buildQuery({
          $select: "id,profile(avatar,invalidField)"
        });
      }).toThrow(SchemaValidationError);
    });

    it('should allow valid nested select', () => {
      const builder = new PrismaQueryBuilder(strictOptions);
      
      expect(() => {
        builder.buildQuery({
          $select: "id,name,profile(avatar,bio),orders(total,status)"
        });
      }).not.toThrow();
    });
  });

  describe('$orderby validation', () => {
    it('should throw error for invalid field in orderby', () => {
      const builder = new PrismaQueryBuilder(strictOptions);
      
      expect(() => {
        builder.buildQuery({
          $orderby: "invalidField desc"
        });
      }).toThrow(SchemaValidationError);
    });

    it('should throw error for invalid nested field in orderby', () => {
      const builder = new PrismaQueryBuilder(strictOptions);
      
      expect(() => {
        builder.buildQuery({
          $orderby: "profile/invalidField asc"
        });
      }).toThrow(SchemaValidationError);
    });

    it('should allow valid orderby fields', () => {
      const builder = new PrismaQueryBuilder(strictOptions);
      
      expect(() => {
        builder.buildQuery({
          $orderby: "name desc, profile/bio asc"
        });
      }).not.toThrow();
    });
  });

  describe('allowAllFields = true (permissive mode)', () => {
    const permissiveOptions = {
      schema: TestSchema,
      allowAllFields: true,
      enableNestedQueries: true
    };

    it('should not throw error for invalid fields when allowAllFields is true', () => {
      const builder = new PrismaQueryBuilder(permissiveOptions);
      
      expect(() => {
        builder.buildQuery({
          $filter: "invalidField eq 'test'",
          $select: "invalidField",
          $orderby: "invalidField desc"
        });
      }).not.toThrow();
    });
  });

  describe('no schema provided', () => {
    const noSchemaOptions = {
      allowAllFields: false,
      enableNestedQueries: true
    };

    it('should not throw error when no schema is provided', () => {
      const builder = new PrismaQueryBuilder(noSchemaOptions);
      
      expect(() => {
        builder.buildQuery({
          $filter: "anyField eq 'test'",
          $select: "anyField",
          $orderby: "anyField desc"
        });
      }).not.toThrow();
    });
  });

  describe('error details', () => {
    it('should provide detailed error information', () => {
      const builder = new PrismaQueryBuilder(strictOptions);
      
      try {
        builder.buildQuery({
          $filter: "invalidField eq 'test'"
        });
        fail('Expected SchemaValidationError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(SchemaValidationError);
        const schemaError = error as SchemaValidationError;
        expect(schemaError.field).toBe('invalidField');
        expect(schemaError.operation).toBe('filter');
        expect(schemaError.message).toContain('Schema validation failed for $filter');
      }
    });

    it('should provide correct operation in error for select', () => {
      const builder = new PrismaQueryBuilder(strictOptions);
      
      try {
        builder.buildQuery({
          $select: "invalidField"
        });
        fail('Expected SchemaValidationError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(SchemaValidationError);
        const schemaError = error as SchemaValidationError;
        expect(schemaError.operation).toBe('select');
      }
    });

    it('should provide correct operation in error for orderby', () => {
      const builder = new PrismaQueryBuilder(strictOptions);
      
      try {
        builder.buildQuery({
          $orderby: "invalidField desc"
        });
        fail('Expected SchemaValidationError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(SchemaValidationError);
        const schemaError = error as SchemaValidationError;
        expect(schemaError.operation).toBe('orderby');
      }
    });
  });
});
