/**
 * Comprehensive test suite for OData to Prisma converter
 * Using @jest/globals for modern Jest testing
 */

import { describe, test, expect, beforeAll } from '@jest/globals';
import { 
  convertToPrisma,
  convertToTypeORM, 
  convertToSequelize, 
  convertToMongoose,
  AdapterFactory,
  SupportedOrm
} from '../src';

describe('OData to ORM Converter - Comprehensive Tests', () => {

  beforeAll(() => {
    console.log('=== OData to ORM Converter Test Suite ===');
  });

  describe('1. COMPARISON OPERATORS', () => {
    test('Equal (eq)', () => {
      const result = convertToPrisma("Name eq 'John'");
      expect(result).toEqual({ Name: { equals: 'John' } });
    });

    test('Not Equal (ne)', () => {
      const result = convertToPrisma("Age ne 25");
      expect(result).toEqual({ Age: { not: 25 } });
    });

    test('Greater Than (gt)', () => {
      const result = convertToPrisma("Age gt 18");
      expect(result).toEqual({ Age: { gt: 18 } });
    });

    test('Greater or Equal (ge)', () => {
      const result = convertToPrisma("Age ge 18");
      expect(result).toEqual({ Age: { gte: 18 } });
    });

    test('Less Than (lt)', () => {
      const result = convertToPrisma("Age lt 65");
      expect(result).toEqual({ Age: { lt: 65 } });
    });

    test('Less or Equal (le)', () => {
      const result = convertToPrisma("Age le 65");
      expect(result).toEqual({ Age: { lte: 65 } });
    });
  });

  describe('2. LOGICAL OPERATORS', () => {
    test('AND Operation', () => {
      const result = convertToPrisma("Name eq 'John' and Age gt 25");
      expect(result).toEqual({
        AND: [
          { Name: { equals: 'John' } },
          { Age: { gt: 25 } }
        ]
      });
    });

    test('OR Operation (should optimize to IN when possible)', () => {
      const result = convertToPrisma("Name eq 'John' or Name eq 'Jane'");
      expect(result).toEqual({ Name: { in: ['John', 'Jane'] } });
    });

    test('NOT Operation', () => {
      const result = convertToPrisma("not (Age lt 18)");
      expect(result).toEqual({ NOT: { Age: { lt: 18 } } });
    });
  });

  describe('3. STRING FUNCTIONS', () => {
    test('Contains (default behavior - no mode)', () => {
      const result = convertToPrisma("contains(Name, 'john')");
      expect(result).toEqual({ Name: { contains: 'john' } });
      expect(result.Name).not.toHaveProperty('mode');
    });

    test('Contains (case-sensitive = true)', () => {
      const result = convertToPrisma("contains(Name, 'john')", { caseSensitive: true });
      expect(result).toEqual({ Name: { contains: 'john' } });
      expect(result.Name).not.toHaveProperty('mode');
    });

    test('Contains (case-sensitive = false)', () => {
      const result = convertToPrisma("contains(Name, 'john')", { caseSensitive: false });
      expect(result).toEqual({ 
        Name: { 
          contains: 'john', 
          mode: 'insensitive' 
        } 
      });
    });

    test('Starts With (default)', () => {
      const result = convertToPrisma("startswith(Name, 'J')");
      expect(result).toEqual({ Name: { startsWith: 'J' } });
      expect(result.Name).not.toHaveProperty('mode');
    });

    test('Starts With (case-sensitive = false)', () => {
      const result = convertToPrisma("startswith(Name, 'J')", { caseSensitive: false });
      expect(result).toEqual({ 
        Name: { 
          startsWith: 'J', 
          mode: 'insensitive' 
        } 
      });
    });

    test('Ends With (default)', () => {
      const result = convertToPrisma("endswith(Email, '.com')");
      expect(result).toEqual({ Email: { endsWith: '.com' } });
      expect(result.Email).not.toHaveProperty('mode');
    });

    test('Ends With (case-sensitive = false)', () => {
      const result = convertToPrisma("endswith(Email, '.com')", { caseSensitive: false });
      expect(result).toEqual({ 
        Email: { 
          endsWith: '.com', 
          mode: 'insensitive' 
        } 
      });
    });

    test('Index Of (position-based search)', () => {
      const result = convertToPrisma("indexof(Name, 'oh') ge 0");
      expect(result).toEqual({ Name: { contains: 'oh' } });
    });

    test('Index Of with case sensitivity', () => {
      const result = convertToPrisma("indexof(Name, 'oh') ge 0", { caseSensitive: false });
      expect(result).toEqual({ 
        Name: { 
          contains: 'oh', 
          mode: 'insensitive' 
        } 
      });
    });
  });

  describe('4. DATE & TIME FUNCTIONS', () => {
    test('Year extraction', () => {
      const result = convertToPrisma("year(CreatedAt) eq 2023");
      expect(result).toEqual({
        CreatedAt: {
          gte: "2023-01-01T00:00:00.000Z",
          lt: "2024-01-01T00:00:00.000Z"
        }
      });
    });

    test('Date range with datetime literals', () => {
      const result = convertToPrisma("CreatedAt ge datetime'2023-01-01' and CreatedAt lt datetime'2024-01-01'");
      expect(result).toEqual({
        CreatedAt: {
          gte: "2023-01-01T00:00:00.000Z",
          lt: "2024-01-01T00:00:00.000Z"
        }
      });
    });
  });

  describe('5. ARITHMETIC EXPRESSIONS', () => {
    test('Multiplication in comparison', () => {
      const result = convertToPrisma("Price * 1.1 gt 100");
      expect(result).toEqual({ Price: { gt: 90.91 } });
    });

    test('Addition in comparison', () => {
      const result = convertToPrisma("Quantity + 5 le 20");
      expect(result).toEqual({ Quantity: { lte: 15 } });
    });

    test('Division in comparison', () => {
      const result = convertToPrisma("Total / 2 eq 50");
      expect(result).toEqual({ Total: { equals: 100 } });
    });

    test('Subtraction in comparison', () => {
      const result = convertToPrisma("Score - 10 gt 80");
      expect(result).toEqual({ Score: { gt: 90 } });
    });
  });

  describe('6. IN OPERATIONS', () => {
    test('Explicit IN syntax', () => {
      const result = convertToPrisma("CategoryId in (1,2,3)");
      expect(result).toEqual({ CategoryId: { in: [1, 2, 3] } });
    });

    test('OR to IN optimization', () => {
      const result = convertToPrisma("Status eq 'active' or Status eq 'pending' or Status eq 'completed'");
      expect(result).toEqual({ Status: { in: ['active', 'pending', 'completed'] } });
    });
  });

  describe('7. COMPLEX NESTED EXPRESSIONS', () => {
    test('Complex nested conditions', () => {
      const result = convertToPrisma("(Name eq 'John' or Name eq 'Jane') and Age gt 18");
      expect(result).toEqual({
        AND: [
          { Name: { in: ['John', 'Jane'] } }, // Should optimize OR to IN
          { Age: { gt: 18 } }
        ]
      });
    });

    test('Mixed string operations with different case sensitivity', () => {
      const result = convertToPrisma(
        "contains(Name, 'john') and startswith(Email, 'admin')", 
        { caseSensitive: false }
      );
      expect(result).toEqual({
        AND: [
          { Name: { contains: 'john', mode: 'insensitive' } },
          { Email: { startsWith: 'admin', mode: 'insensitive' } }
        ]
      });
    });
  });

  describe('8. EDGE CASES & ERROR HANDLING', () => {
    test('Length function (should throw error)', () => {
      expect(() => {
        convertToPrisma("length(Name) gt 5");
      }).toThrow(/Length comparison requires raw SQL/);
    });

    test('Day function (should throw error)', () => {
      expect(() => {
        convertToPrisma("day(CreatedAt) eq 15");
      }).toThrow(/Day extraction requires raw SQL/);
    });

    test('Math function (should throw error)', () => {
      expect(() => {
        convertToPrisma("round(Price) eq 100");
      }).toThrow(/Math function .* requires raw SQL implementation/);
    });

    test('Unsupported method should throw error', () => {
      expect(() => {
        convertToPrisma("unsupportedmethod(Name) eq 'test'");
      }).toThrow();
    });
  });

  describe('9. CASE SENSITIVITY EDGE CASES', () => {
    test('tolower function should always add insensitive mode', () => {
      const result = convertToPrisma("startswith(tolower(Name), 'jo')");
      expect(result).toEqual({
        Name: { startsWith: 'jo', mode: 'insensitive' }
      });
    });

    test('tolower function should override caseSensitive: true', () => {
      const result = convertToPrisma("startswith(tolower(Name), 'jo')", { caseSensitive: true });
      expect(result).toEqual({
        Name: { startsWith: 'jo', mode: 'insensitive' }
      });
    });

    test('Mixed tolower and regular fields with caseSensitive: false', () => {
      const result = convertToPrisma(
        "startswith(tolower(FirstName), 'jo') and contains(LastName, 'smith')", 
        { caseSensitive: false }
      );
      expect(result).toEqual({
        AND: [
          { FirstName: { startsWith: 'jo', mode: 'insensitive' } },
          { LastName: { contains: 'smith', mode: 'insensitive' } }
        ]
      });
    });

    test('Mixed tolower and regular fields with caseSensitive: true', () => {
      const result = convertToPrisma(
        "startswith(tolower(FirstName), 'jo') and contains(LastName, 'smith')", 
        { caseSensitive: true }
      );
      expect(result).toEqual({
        AND: [
          { FirstName: { startsWith: 'jo', mode: 'insensitive' } }, // tolower overrides
          { LastName: { contains: 'smith' } } // no mode
        ]
      });
    });
  });

  describe('10. ADDITIONAL COMPLEX CASES', () => {
    const additionalTestCases = [
      {
        name: "Complex AND with parentheses",
        filter: "name eq 'John' and (age gt 25 or status eq 'active')",
        expected: {
          AND: [
            { name: { equals: 'John' } },
            { OR: [{ age: { gt: 25 } }, { status: { equals: 'active' } }] }
          ]
        }
      },
      {
        name: "Multiple string functions",
        filter: "contains(email, 'gmail') and startswith(name, 'J')",
        expected: {
          AND: [
            { email: { contains: 'gmail' } },
            { name: { startsWith: 'J' } }
          ]
        }
      },
      {
        name: "Category IN operation",
        filter: "category in ('tech', 'science', 'art')",
        expected: { category: { in: ['tech', 'science', 'art'] } }
      },
      {
        name: "Boolean and date combination",
        filter: "isActive eq true and createdAt ge datetime'2023-01-01'",
        expected: {
          AND: [
            { isActive: { equals: true } },
            { createdAt: { gte: "2023-01-01T00:00:00.000Z" } }
          ]
        }
      },
      {
        name: "Price range",
        filter: "price ge 100 and price le 500",
        expected: {
          price: {
            gte: 100,
            lte: 500
          }
        }
      },
      {
        name: "NOT with year function",
        filter: "not (status eq 'deleted') and year(updatedAt) eq 2023",
        expected: {
          NOT: {
            AND: [
              { status: { equals: 'deleted' } },
              { updatedAt: { gte: "2023-01-01T00:00:00.000Z", lt: "2024-01-01T00:00:00.000Z" } }
            ]
          }
        }
      }
    ];

    additionalTestCases.forEach(({ name, filter, expected }) => {
      test(name, () => {
        const result = convertToPrisma(filter);
        expect(result).toEqual(expected);
      });
    });
  });

  describe('11. MULTI-ORM COMPATIBILITY', () => {
    test('Adapter factory should provide info about all ORMs', () => {
      const adapterInfo = AdapterFactory.getAdapterInfo();
      expect(Array.isArray(adapterInfo)).toBe(true);
      expect(adapterInfo.length).toBeGreaterThan(0);
      
      // Check that Prisma adapter info exists
      const prismaInfo = adapterInfo.find(info => info.orm.toLowerCase().includes('prisma'));
      expect(prismaInfo).toBeDefined();
      expect(prismaInfo?.status).toBeDefined();
      expect(Array.isArray(prismaInfo?.features)).toBe(true);
    });

    test('Should convert to different ORMs without errors', () => {
      const odataFilter = "Name eq 'John' and Age gt 25";
      
      // Only test Prisma as other adapters are not yet implemented
      expect(() => convertToPrisma(odataFilter)).not.toThrow();
      
      // Other ORMs will throw "coming soon" errors, which is expected behavior
      expect(() => convertToTypeORM(odataFilter)).toThrow(/coming soon/);
      expect(() => convertToSequelize(odataFilter)).toThrow(/coming soon/);
      expect(() => convertToMongoose(odataFilter)).toThrow(/coming soon/);
    });
  });
});
