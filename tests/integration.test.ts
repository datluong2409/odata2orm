/**
 * Integration tests for OData to Prisma converter
 * Converted from examples-new.ts to proper Jest test suite
 */

import { describe, test, expect } from '@jest/globals';
import { 
  AdapterFactory, 
  convertToPrisma, 
  convertToTypeORM, 
  convertToSequelize, 
  convertToMongoose,
  SupportedOrm
} from '../src';

describe('OData to Prisma Converter - Integration Tests', () => {

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

    test('OR Operation (should optimize to IN)', () => {
      const result = convertToPrisma("Name eq 'John' or Name eq 'Jane'");
      expect(result).toEqual({ Name: { in: ['John', 'Jane'] } });
    });

    test('NOT Operation', () => {
      const result = convertToPrisma("not (Age lt 18)");
      expect(result).toEqual({ NOT: { Age: { lt: 18 } } });
    });
  });

  describe('3. STRING FUNCTIONS - Default Behavior (no mode)', () => {
    test('Contains (default - no mode)', () => {
      const result = convertToPrisma("contains(Name, 'john')");
      expect(result).toEqual({ Name: { contains: 'john' } });
      expect(result.Name).not.toHaveProperty('mode');
    });

    test('Starts With (default - no mode)', () => {
      const result = convertToPrisma("startswith(Name, 'J')");
      expect(result).toEqual({ Name: { startsWith: 'J' } });
      expect(result.Name).not.toHaveProperty('mode');
    });

    test('Ends With (default - no mode)', () => {
      const result = convertToPrisma("endswith(Email, '.com')");
      expect(result).toEqual({ Email: { endsWith: '.com' } });
      expect(result.Email).not.toHaveProperty('mode');
    });

    test('Index Of (position-based search)', () => {
      const result = convertToPrisma("indexof(Name, 'oh') ge 0");
      expect(result).toEqual({ Name: { contains: 'oh' } });
      expect(result.Name).not.toHaveProperty('mode');
    });
  });

  describe('4. CASE SENSITIVITY OPTIONS - Core Feature Tests', () => {
    describe('caseSensitive: undefined (default behavior)', () => {
      test('contains should not have mode property', () => {
        const result = convertToPrisma("contains(Name, 'John')");
        expect(result).toEqual({ Name: { contains: 'John' } });
        expect(result.Name).not.toHaveProperty('mode');
      });

      test('startswith should not have mode property', () => {
        const result = convertToPrisma("startswith(Name, 'Jo')");
        expect(result).toEqual({ Name: { startsWith: 'Jo' } });
        expect(result.Name).not.toHaveProperty('mode');
      });

      test('endswith should not have mode property', () => {
        const result = convertToPrisma("endswith(Email, '.com')");
        expect(result).toEqual({ Email: { endsWith: '.com' } });
        expect(result.Email).not.toHaveProperty('mode');
      });

      test('indexof should not have mode property', () => {
        const result = convertToPrisma("indexof(Name, 'oh') ge 0");
        expect(result).toEqual({ Name: { contains: 'oh' } });
        expect(result.Name).not.toHaveProperty('mode');
      });
    });

    describe('caseSensitive: true (case sensitive)', () => {
      test('contains should not have mode property', () => {
        const result = convertToPrisma("contains(Name, 'John')", { caseSensitive: true });
        expect(result).toEqual({ Name: { contains: 'John' } });
        expect(result.Name).not.toHaveProperty('mode');
      });

      test('startswith should not have mode property', () => {
        const result = convertToPrisma("startswith(Name, 'Jo')", { caseSensitive: true });
        expect(result).toEqual({ Name: { startsWith: 'Jo' } });
        expect(result.Name).not.toHaveProperty('mode');
      });

      test('endswith should not have mode property', () => {
        const result = convertToPrisma("endswith(Email, '.com')", { caseSensitive: true });
        expect(result).toEqual({ Email: { endsWith: '.com' } });
        expect(result.Email).not.toHaveProperty('mode');
      });

      test('indexof should not have mode property', () => {
        const result = convertToPrisma("indexof(Name, 'oh') ge 0", { caseSensitive: true });
        expect(result).toEqual({ Name: { contains: 'oh' } });
        expect(result.Name).not.toHaveProperty('mode');
      });
    });

    describe('caseSensitive: false (case insensitive)', () => {
      test('contains should have mode: insensitive', () => {
        const result = convertToPrisma("contains(Name, 'John')", { caseSensitive: false });
        expect(result).toEqual({ 
          Name: { 
            contains: 'John', 
            mode: 'insensitive' 
          } 
        });
      });

      test('startswith should have mode: insensitive', () => {
        const result = convertToPrisma("startswith(Name, 'jo')", { caseSensitive: false });
        expect(result).toEqual({ 
          Name: { 
            startsWith: 'jo', 
            mode: 'insensitive' 
          } 
        });
      });

      test('endswith should have mode: insensitive', () => {
        const result = convertToPrisma("endswith(Name, 'hn')", { caseSensitive: false });
        expect(result).toEqual({ 
          Name: { 
            endsWith: 'hn', 
            mode: 'insensitive' 
          } 
        });
      });

      test('indexof should have mode: insensitive', () => {
        const result = convertToPrisma("indexof(Name, 'oh') ge 0", { caseSensitive: false });
        expect(result).toEqual({ 
          Name: { 
            contains: 'oh', 
            mode: 'insensitive' 
          } 
        });
      });
    });

    describe('tolower function (should always be insensitive)', () => {
      test('tolower should override caseSensitive: true', () => {
        const result = convertToPrisma("startswith(tolower(Name), 'jo')", { caseSensitive: true });
        expect(result).toEqual({
          Name: { 
            startsWith: 'jo', 
            mode: 'insensitive' 
          }
        });
      });

      test('tolower should work with caseSensitive: false', () => {
        const result = convertToPrisma("startswith(tolower(Name), 'jo')", { caseSensitive: false });
        expect(result).toEqual({
          Name: { 
            startsWith: 'jo', 
            mode: 'insensitive' 
          }
        });
      });

      test('tolower should work with undefined caseSensitive', () => {
        const result = convertToPrisma("startswith(tolower(Name), 'jo')");
        expect(result).toEqual({
          Name: { 
            startsWith: 'jo', 
            mode: 'insensitive' 
          }
        });
      });
    });
  });

  describe('5. DATE & TIME FUNCTIONS', () => {
    test('Year extraction', () => {
      const result = convertToPrisma("year(CreatedAt) eq 2023");
      expect(result).toEqual({
        CreatedAt: {
          gte: "2023-01-01T00:00:00.000Z",
          lt: "2024-01-01T00:00:00.000Z"
        }
      });
    });

    test('Year + Month combination', () => {
      const result = convertToPrisma("year(CreatedAt) eq 2023 and month(CreatedAt) eq 12");
      expect(result).toEqual({
        CreatedAt: {
          gte: "2023-12-01T00:00:00.000Z",
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

  describe('6. ARITHMETIC EXPRESSIONS', () => {
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

  describe('7. IN OPERATIONS', () => {
    test('Explicit IN syntax', () => {
      const result = convertToPrisma("CategoryId in (1,2,3)");
      expect(result).toEqual({ CategoryId: { in: [1, 2, 3] } });
    });

    test('OR to IN optimization', () => {
      const result = convertToPrisma("Status eq 'active' or Status eq 'pending' or Status eq 'completed'");
      expect(result).toEqual({ Status: { in: ['active', 'pending', 'completed'] } });
    });
  });

  describe('8. COMPLEX NESTED EXPRESSIONS', () => {
    test('Complex nested conditions', () => {
      const result = convertToPrisma("(Name eq 'John' or Name eq 'Jane') and Age gt 18 and contains(Email, '@company.com') and year(CreatedAt) eq 2023");
      expect(result).toEqual({
        AND: [
          { Name: { in: ['John', 'Jane'] } }, // OR optimized to IN
          {
            AND: [
              { Age: { gt: 18 } },
              {
                AND: [
                  { Email: { contains: '@company.com' } },
                  { 
                    CreatedAt: { 
                      gte: "2023-01-01T00:00:00.000Z",
                      lt: "2024-01-01T00:00:00.000Z"
                    } 
                  }
                ]
              }
            ]
          }
        ]
      });
    });
  });

  describe('9. EDGE CASES & ERROR HANDLING', () => {
    test('Length function should throw error', () => {
      expect(() => {
        convertToPrisma("length(Name) gt 5");
      }).toThrow(/Length comparison requires raw SQL/);
    });

    test('Day function should throw error', () => {
      expect(() => {
        convertToPrisma("day(CreatedAt) eq 15");
      }).toThrow(/Day extraction requires raw SQL/);
    });

    test('Math function should throw error', () => {
      expect(() => {
        convertToPrisma("round(Price) eq 100");
      }).toThrow(/Math function .* requires raw SQL implementation/);
    });
  });

  describe('10. ADDITIONAL COMPLEX CASES', () => {
    const complexTestCases = [
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
        name: "Multiple string functions (default behavior)",
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
        name: "Price range (optimized to single object)",
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
              { 
                updatedAt: { 
                  gte: "2023-01-01T00:00:00.000Z", 
                  lt: "2024-01-01T00:00:00.000Z" 
                } 
              }
            ]
          }
        }
      }
    ];

    complexTestCases.forEach(({ name, filter, expected }) => {
      test(name, () => {
        const result = convertToPrisma(filter);
        expect(result).toEqual(expected);
      });
    });
  });

  describe('11. CASE SENSITIVITY INTEGRATION TESTS', () => {
    test('Mixed string operations with caseSensitive: false', () => {
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

    test('Complex query with mixed case sensitivity', () => {
      const result = convertToPrisma(
        "(contains(Name, 'john') or startswith(Name, 'jane')) and endswith(Email, '.com')",
        { caseSensitive: false }
      );
      expect(result).toEqual({
        AND: [
          {
            OR: [
              { Name: { contains: 'john', mode: 'insensitive' } },
              { Name: { startsWith: 'jane', mode: 'insensitive' } }
            ]
          },
          { Email: { endsWith: '.com', mode: 'insensitive' } }
        ]
      });
    });
  });

  describe('12. ADAPTER FACTORY TESTS', () => {
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

    test('Should handle different ORMs correctly', () => {
      const odataFilter = "Name eq 'John' and Age gt 25";
      
      // Prisma should work
      expect(() => convertToPrisma(odataFilter)).not.toThrow();
      
      // Other ORMs should throw "coming soon" errors
      expect(() => convertToTypeORM(odataFilter)).toThrow(/coming soon/);
      expect(() => convertToSequelize(odataFilter)).toThrow(/coming soon/);
      expect(() => convertToMongoose(odataFilter)).toThrow(/coming soon/);
    });
  });
});
