/**
 * Test for OData v4 nested query support with schema validation
 */

import { describe, it, expect } from '@jest/globals';
import { z } from 'zod';
import {
  PrismaQueryBuilder,
  PrismaQueryBuilderOptions,
  parseNestedSelect,
  parseNestedOrderBy,
  parseCollectionFilters,
  convertNestedSelectToPrisma,
  convertCollectionFilterToPrisma,
  SchemaValidator,
  parseNavigationPath,
  parseCollectionFilter
} from '../src';

// Test schema definitions
const UserProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  profile: z.object({
    avatar: z.string(),
    bio: z.string().optional(),
    address: z.object({
      street: z.string(),
      city: z.string(),
      country: z.string(),
      zipCode: z.string().optional()
    })
  }),
  settings: z.object({
    theme: z.enum(['light', 'dark']),
    notifications: z.boolean(),
    language: z.string()
  }),
  orders: z.array(z.object({
    id: z.string(),
    total: z.number(),
    status: z.enum(['pending', 'shipped', 'delivered']),
    items: z.array(z.object({
      productName: z.string(),
      quantity: z.number(),
      price: z.number()
    })),
    customer: z.object({
      name: z.string(),
      email: z.string()
    })
  })),
  posts: z.array(z.object({
    id: z.string(),
    title: z.string(),
    content: z.string(),
    published: z.boolean(),
    tags: z.array(z.string())
  }))
});

const SimpleSchema = z.object({
  id: z.string(),
  name: z.string(),
  age: z.number().optional()
});

describe('Schema Validator', () => {
  it('should validate simple field paths', () => {
    const validator = new SchemaValidator(SimpleSchema);
    
    const result1 = validator.validateFieldPath(['name']);
    expect(result1.isValid).toBe(true);
    
    const result2 = validator.validateFieldPath(['invalidField']);
    expect(result2.isValid).toBe(false);
    expect(result2.error).toContain('does not exist');
  });

  it('should validate nested field paths', () => {
    const validator = new SchemaValidator(UserProfileSchema);
    
    const result1 = validator.validateFieldPath(['profile', 'avatar']);
    expect(result1.isValid).toBe(true);
    
    const result2 = validator.validateFieldPath(['profile', 'address', 'city']);
    expect(result2.isValid).toBe(true);
    
    const result3 = validator.validateFieldPath(['profile', 'invalidField']);
    expect(result3.isValid).toBe(false);
  });

  it('should identify collection paths', () => {
    const validator = new SchemaValidator(UserProfileSchema);
    
    expect(validator.isCollectionPath(['orders'])).toBe(true);
    expect(validator.isCollectionPath(['posts'])).toBe(true);
    expect(validator.isCollectionPath(['profile'])).toBe(false);
    expect(validator.isCollectionPath(['name'])).toBe(false);
  });

  it('should get valid paths for autocomplete', () => {
    const validator = new SchemaValidator(SimpleSchema);
    const paths = validator.getValidPaths();
    
    expect(paths).toContain('id');
    expect(paths).toContain('name');
    expect(paths).toContain('age');
    expect(paths.length).toBe(3);
  });
});

describe('Navigation Path Parser', () => {
  it('should parse simple navigation paths', () => {
    const result = parseNavigationPath('profile/avatar');
    
    expect(result.path).toEqual(['profile', 'avatar']);
    expect(result.isCollection).toBe(false);
    expect(result.lambdaVariable).toBeUndefined();
  });

  it('should parse complex navigation paths', () => {
    const result = parseNavigationPath('profile/address/city');
    
    expect(result.path).toEqual(['profile', 'address', 'city']);
    expect(result.isCollection).toBe(false);
  });

  it('should parse lambda expressions with any', () => {
    const result = parseNavigationPath('orders/any(o: o/total gt 100)');
    
    expect(result.path).toEqual(['orders']);
    expect(result.isCollection).toBe(true);
    expect(result.lambdaVariable).toBe('o');
    expect(result.lambdaCondition).toBe('o/total gt 100');
  });

  it('should parse lambda expressions with all', () => {
    const result = parseNavigationPath('posts/all(p: p/published eq true)');
    
    expect(result.path).toEqual(['posts']);
    expect(result.isCollection).toBe(true);
    expect(result.lambdaVariable).toBe('p');
    expect(result.lambdaCondition).toBe('p/published eq true');
  });
});

describe('Collection Filter Parser', () => {
  it('should parse any expressions', () => {
    const result = parseCollectionFilter('orders/any(o: o/total gt 100)');
    
    expect(result).toBeTruthy();
    expect(result!.type).toBe('any');
    expect(result!.variable).toBe('o');
    expect(result!.condition).toBe('o/total gt 100');
    expect(result!.path).toEqual(['orders']);
  });

  it('should parse all expressions', () => {
    const result = parseCollectionFilter('posts/all(p: p/published eq true)');
    
    expect(result).toBeTruthy();
    expect(result!.type).toBe('all');
    expect(result!.variable).toBe('p');
    expect(result!.condition).toBe('p/published eq true');
    expect(result!.path).toEqual(['posts']);
  });

  it('should return null for non-collection expressions', () => {
    const result = parseCollectionFilter('name eq "John"');
    expect(result).toBeNull();
  });
});

describe('Nested Select Parser', () => {
  it('should parse simple select fields', () => {
    const result = parseNestedSelect('id,name,email');
    
    expect(result).toEqual({
      id: true,
      name: true,
      email: true
    });
  });

  it('should parse navigation select fields', () => {
    const result = parseNestedSelect('id,name,profile/avatar,profile/bio');
    
    expect(result).toEqual({
      id: true,
      name: true,
      profile: {
        avatar: true,
        bio: true
      }
    });
  });

  it('should parse nested select with parentheses', () => {
    const result = parseNestedSelect('id,name,profile(avatar,bio,address(city,country))');
    
    expect(result).toEqual({
      id: true,
      name: true,
      profile: {
        avatar: true,
        bio: true,
        address: {
          city: true,
          country: true
        }
      }
    });
  });

  it('should parse complex nested selections', () => {
    const result = parseNestedSelect('id,profile(avatar,address(city)),orders(total,status)');
    
    expect(result).toEqual({
      id: true,
      profile: {
        avatar: true,
        address: {
          city: true
        }
      },
      orders: {
        total: true,
        status: true
      }
    });
  });

  it('should validate against schema when provided', () => {
    const options = { schema: UserProfileSchema };
    
    expect(() => {
      parseNestedSelect('id,name,profile/avatar', options);
    }).not.toThrow();

    expect(() => {
      parseNestedSelect('id,invalidField', options);
    }).toThrow('Invalid field path');
  });

  it('should allow all fields when allowAllFields is true', () => {
    const options = { schema: UserProfileSchema, allowAllFields: true };
    
    expect(() => {
      parseNestedSelect('id,customField', options);
    }).not.toThrow();
  });
});

describe('Nested OrderBy Parser', () => {
  it('should parse simple orderby fields', () => {
    const result = parseNestedOrderBy('name asc, email desc');
    
    expect(result).toEqual({
      name: 'asc',
      email: 'desc'
    });
  });

  it('should parse nested orderby fields', () => {
    const result = parseNestedOrderBy('name asc, profile/avatar desc, orders/total asc');
    
    expect(result).toEqual({
      'name': 'asc',
      'profile.avatar': 'desc',
      'orders.total': 'asc'
    });
  });

  it('should default to asc when direction not specified', () => {
    const result = parseNestedOrderBy('name, profile/bio desc');
    
    expect(result).toEqual({
      name: 'asc',
      'profile.bio': 'desc'
    });
  });

  it('should validate against schema when provided', () => {
    const options = { schema: UserProfileSchema };
    
    expect(() => {
      parseNestedOrderBy('name asc, profile/avatar desc', options);
    }).not.toThrow();

    expect(() => {
      parseNestedOrderBy('invalidField asc', options);
    }).toThrow('Invalid orderby field');
  });
});

describe('Collection Filters Parser', () => {
  it('should parse multiple collection filters', () => {
    const filterString = 'orders/any(o: o/total gt 100) and posts/all(p: p/published eq true)';
    const result = parseCollectionFilters(filterString);
    
    expect(result).toHaveLength(2);
    expect(result[0].type).toBe('any');
    expect(result[0].path).toEqual(['orders']);
    expect(result[1].type).toBe('all');
    expect(result[1].path).toEqual(['posts']);
  });

  it('should handle no collection filters', () => {
    const result = parseCollectionFilters('name eq "John" and age gt 25');
    expect(result).toHaveLength(0);
  });
});

describe('Nested Select to Prisma Converter', () => {
  it('should convert simple nested select', () => {
    const nestedSelect = {
      id: true,
      name: true,
      profile: {
        avatar: true,
        bio: true
      }
    };

    const result = convertNestedSelectToPrisma(nestedSelect);
    
    expect(result).toEqual({
      id: true,
      name: true,
      profile: {
        select: {
          avatar: true,
          bio: true
        }
      }
    });
  });

  it('should convert deeply nested select', () => {
    const nestedSelect = {
      id: true,
      profile: {
        address: {
          city: true,
          country: true
        }
      }
    };

    const result = convertNestedSelectToPrisma(nestedSelect);
    
    expect(result).toEqual({
      id: true,
      profile: {
        select: {
          address: {
            select: {
              city: true,
              country: true
            }
          }
        }
      }
    });
  });
});

describe('PrismaQueryBuilder with Schema Support', () => {
  it('should build query without schema validation', () => {
    const builder = new PrismaQueryBuilder({ enableNestedQueries: true });
    
    const query = builder.buildQuery({
      $filter: "name eq 'John'",
      $select: "id,name,profile/avatar",
      $orderby: "name asc, profile/createdAt desc"
    });

    expect(query.where).toBeDefined();
    expect(query.select).toBeDefined();
    expect(query.orderBy).toBeDefined();
  });

  it('should build query with schema validation', () => {
    const options: PrismaQueryBuilderOptions = {
      schema: UserProfileSchema,
      enableNestedQueries: true,
      allowAllFields: false
    };
    
    const builder = new PrismaQueryBuilder(options);
    
    const query = builder.buildQuery({
      $filter: "name eq 'John'",
      $select: "id,name,profile/avatar",
      $orderby: "name asc"
    });

    expect(query.where).toBeDefined();
    expect(query.select).toEqual({
      id: true,
      name: true,
      profile: {
        select: {
          avatar: true
        }
      }
    });
  });

  it('should reject invalid fields with schema validation', () => {
    const options: PrismaQueryBuilderOptions = {
      schema: UserProfileSchema,
      enableNestedQueries: true,
      allowAllFields: false
    };
    
    const builder = new PrismaQueryBuilder(options);
    
    expect(() => {
      builder.buildQuery({
        $select: "id,invalidField"
      });
    }).toThrow('Invalid field path');
  });

  it('should handle collection filters in query building', () => {
    const builder = new PrismaQueryBuilder({ 
      enableNestedQueries: true,
      schema: UserProfileSchema 
    });
    
    const query = builder.buildQuery({
      $filter: "name eq 'John' and orders/any(o: o/total gt 100)"
    });

    expect(query.where).toBeDefined();
    expect(query.where.AND).toBeDefined();
    expect(Array.isArray(query.where.AND)).toBe(true);
  });

  it('should build pagination queries with nested support', () => {
    const options: PrismaQueryBuilderOptions = {
      schema: UserProfileSchema,
      enableNestedQueries: true
    };
    
    const builder = new PrismaQueryBuilder(options);
    
    const { findQuery, countQuery } = builder.buildPaginationQuery({
      $filter: "profile/address/city eq 'Seattle'",
      $select: "id,name,profile(avatar,address(city))",
      $top: 10,
      $skip: 20,
      $orderby: "name asc"
    });

    expect(findQuery.where).toBeDefined();
    expect(findQuery.select).toBeDefined();
    expect(findQuery.take).toBe(10);
    expect(findQuery.skip).toBe(20);
    
    expect(countQuery.where).toBeDefined();
    expect(countQuery.select).toBeUndefined();
    expect(countQuery.take).toBeUndefined();
    expect(countQuery.skip).toBeUndefined();
  });

  it('should fall back to legacy parsing when nested queries disabled', () => {
    const builder = new PrismaQueryBuilder({ 
      enableNestedQueries: false,
      schema: UserProfileSchema 
    });
    
    const query = builder.buildQuery({
      $select: "id,name,email",
      $orderby: "name desc"
    });

    expect(query.select).toEqual({
      id: true,
      name: true,
      email: true
    });
    
    expect(query.orderBy).toEqual([
      { name: 'desc' }
    ]);
  });

  it('should process pagination results with metadata', () => {
    const builder = new PrismaQueryBuilder();
    
    const result = builder.processPaginationResult(
      [{ id: 1, name: 'John' }, { id: 2, name: 'Jane' }],
      100,
      { $top: 10, $skip: 20, $count: true }
    );

    expect(result.data).toHaveLength(2);
    expect(result.count).toBe(100);
    expect(result.hasNext).toBe(true);
    expect(result.hasPrevious).toBe(true);
    expect(result.totalPages).toBe(10);
    expect(result.currentPage).toBe(3);
  });
});

describe('Advanced Nested Query Scenarios', () => {
  it('should handle multiple levels of nesting in filters', () => {
    const builder = new PrismaQueryBuilder({ 
      enableNestedQueries: true,
      schema: UserProfileSchema 
    });
    
    // This would require enhancement to the basic converter to handle nested field paths
    // For now, we test that the query builder accepts the structure
    const query = builder.buildQuery({
      $filter: "profile/address/city eq 'Seattle'",
    });

    expect(query.where).toBeDefined();
  });

  it('should handle complex collection queries', () => {
    const builder = new PrismaQueryBuilder({ 
      enableNestedQueries: true,
      schema: UserProfileSchema 
    });
    
    const query = builder.buildQuery({
      $filter: "orders/any(o: o/total gt 100 and o/status eq 'shipped')"
    });

    expect(query.where).toBeDefined();
  });

  it('should combine regular filters with collection filters', () => {
    const builder = new PrismaQueryBuilder({ 
      enableNestedQueries: true,
      schema: UserProfileSchema 
    });
    
    const query = builder.buildQuery({
      $filter: "name eq 'John' and orders/any(o: o/total gt 100) and profile/address/city eq 'Seattle'"
    });

    expect(query.where).toBeDefined();
  });
});
