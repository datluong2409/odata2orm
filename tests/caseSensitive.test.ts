/**
 * Test cases for caseSensitive option in OData to Prisma converter
 * Testing the new logic where mode: insensitive is only added when caseSensitive is explicitly defined
 */

import { describe, test, expect } from '@jest/globals';
import { convertToPrisma } from '../src';
import { PrismaStringMode } from '../src/enums';

describe('OData to Prisma Converter - Case Sensitivity Tests', () => {
  
  describe('CONTAINS method', () => {
    test('should not add mode when caseSensitive is undefined', () => {
      const result = convertToPrisma("contains(Name, 'john')");
      expect(result).toEqual({
        Name: { contains: 'john' }
      });
      expect(result.Name).not.toHaveProperty('mode');
    });

    test('should not add mode when caseSensitive is true', () => {
      const result = convertToPrisma("contains(Name, 'john')", { caseSensitive: true });
      expect(result).toEqual({
        Name: { contains: 'john' }
      });
      expect(result.Name).not.toHaveProperty('mode');
    });

    test('should add mode: insensitive when caseSensitive is false', () => {
      const result = convertToPrisma("contains(Name, 'john')", { caseSensitive: false });
      expect(result).toEqual({
        Name: { 
          contains: 'john',
          mode: PrismaStringMode.INSENSITIVE
        }
      });
    });
  });

  describe('SUBSTRING_OF method', () => {
    test('should not add mode when caseSensitive is undefined', () => {
      const result = convertToPrisma("substringof('john', Name)");
      expect(result).toEqual({
        Name: { contains: 'john' }
      });
      expect(result.Name).not.toHaveProperty('mode');
    });

    test('should not add mode when caseSensitive is true', () => {
      const result = convertToPrisma("substringof('john', Name)", { caseSensitive: true });
      expect(result).toEqual({
        Name: { contains: 'john' }
      });
      expect(result.Name).not.toHaveProperty('mode');
    });

    test('should add mode: insensitive when caseSensitive is false', () => {
      const result = convertToPrisma("substringof('john', Name)", { caseSensitive: false });
      expect(result).toEqual({
        Name: { 
          contains: 'john',
          mode: PrismaStringMode.INSENSITIVE
        }
      });
    });
  });

  describe('STARTS_WITH method', () => {
    test('should not add mode when caseSensitive is undefined', () => {
      const result = convertToPrisma("startswith(Name, 'Jo')");
      expect(result).toEqual({
        Name: { startsWith: 'Jo' }
      });
      expect(result.Name).not.toHaveProperty('mode');
    });

    test('should not add mode when caseSensitive is true', () => {
      const result = convertToPrisma("startswith(Name, 'Jo')", { caseSensitive: true });
      expect(result).toEqual({
        Name: { startsWith: 'Jo' }
      });
      expect(result.Name).not.toHaveProperty('mode');
    });

    test('should add mode: insensitive when caseSensitive is false', () => {
      const result = convertToPrisma("startswith(Name, 'Jo')", { caseSensitive: false });
      expect(result).toEqual({
        Name: { 
          startsWith: 'Jo',
          mode: PrismaStringMode.INSENSITIVE
        }
      });
    });

    test('should always add mode: insensitive when tolower is used', () => {
      const result = convertToPrisma("startswith(tolower(Name), 'jo')");
      expect(result).toEqual({
        Name: { 
          startsWith: 'jo',
          mode: PrismaStringMode.INSENSITIVE
        }
      });
    });

    test('should add mode: insensitive when tolower is used even with caseSensitive: true', () => {
      const result = convertToPrisma("startswith(tolower(Name), 'jo')", { caseSensitive: true });
      expect(result).toEqual({
        Name: { 
          startsWith: 'jo',
          mode: PrismaStringMode.INSENSITIVE
        }
      });
    });
  });

  describe('ENDS_WITH method', () => {
    test('should not add mode when caseSensitive is undefined', () => {
      const result = convertToPrisma("endswith(Name, 'son')");
      expect(result).toEqual({
        Name: { endsWith: 'son' }
      });
      expect(result.Name).not.toHaveProperty('mode');
    });

    test('should not add mode when caseSensitive is true', () => {
      const result = convertToPrisma("endswith(Name, 'son')", { caseSensitive: true });
      expect(result).toEqual({
        Name: { endsWith: 'son' }
      });
      expect(result.Name).not.toHaveProperty('mode');
    });

    test('should add mode: insensitive when caseSensitive is false', () => {
      const result = convertToPrisma("endswith(Name, 'son')", { caseSensitive: false });
      expect(result).toEqual({
        Name: { 
          endsWith: 'son',
          mode: PrismaStringMode.INSENSITIVE
        }
      });
    });

    test('should always add mode: insensitive when tolower is used', () => {
      const result = convertToPrisma("endswith(tolower(Name), 'son')");
      expect(result).toEqual({
        Name: { 
          endsWith: 'son',
          mode: PrismaStringMode.INSENSITIVE
        }
      });
    });
  });

  describe('INDEX_OF method', () => {
    test('should not add mode when caseSensitive is undefined', () => {
      const result = convertToPrisma("indexof(Name, 'oh') ge 0");
      expect(result).toEqual({
        Name: { contains: 'oh' }
      });
      expect(result.Name).not.toHaveProperty('mode');
    });

    test('should not add mode when caseSensitive is true', () => {
      const result = convertToPrisma("indexof(Name, 'oh') ge 0", { caseSensitive: true });
      expect(result).toEqual({
        Name: { contains: 'oh' }
      });
      expect(result.Name).not.toHaveProperty('mode');
    });

    test('should add mode: insensitive when caseSensitive is false', () => {
      const result = convertToPrisma("indexof(Name, 'oh') ge 0", { caseSensitive: false });
      expect(result).toEqual({
        Name: { 
          contains: 'oh',
          mode: PrismaStringMode.INSENSITIVE
        }
      });
    });

    test('should handle indexof equals -1 (not found) case without mode when undefined', () => {
      const result = convertToPrisma("indexof(Name, 'xyz') eq -1");
      expect(result).toEqual({
        NOT: {
          Name: { contains: 'xyz' }
        }
      });
      expect(result.NOT.Name).not.toHaveProperty('mode');
    });

    test('should handle indexof equals -1 (not found) case with mode when caseSensitive is false', () => {
      const result = convertToPrisma("indexof(Name, 'xyz') eq -1", { caseSensitive: false });
      expect(result).toEqual({
        NOT: {
          Name: { 
            contains: 'xyz',
            mode: PrismaStringMode.INSENSITIVE
          }
        }
      });
    });
  });

  describe('Complex cases with multiple string operations', () => {
    test('should handle multiple contains with mixed case sensitivity', () => {
      const result = convertToPrisma(
        "contains(Name, 'john') and contains(Email, 'gmail')", 
        { caseSensitive: false }
      );
      expect(result).toEqual({
        AND: [
          { Name: { contains: 'john', mode: PrismaStringMode.INSENSITIVE } },
          { Email: { contains: 'gmail', mode: PrismaStringMode.INSENSITIVE } }
        ]
      });
    });

    test('should handle OR conditions with case sensitivity', () => {
      const result = convertToPrisma(
        "startswith(Name, 'J') or endswith(Name, 'son')", 
        { caseSensitive: false }
      );
      expect(result).toEqual({
        OR: [
          { Name: { startsWith: 'J', mode: PrismaStringMode.INSENSITIVE } },
          { Name: { endsWith: 'son', mode: PrismaStringMode.INSENSITIVE } }
        ]
      });
    });

    test('should handle mixed tolower and caseSensitive options', () => {
      const result = convertToPrisma(
        "startswith(tolower(FirstName), 'jo') and contains(LastName, 'smith')", 
        { caseSensitive: true }
      );
      expect(result).toEqual({
        AND: [
          { FirstName: { startsWith: 'jo', mode: PrismaStringMode.INSENSITIVE } }, // tolower overrides caseSensitive
          { LastName: { contains: 'smith' } } // no mode because caseSensitive: true
        ]
      });
    });
  });

  describe('Backward compatibility', () => {
    test('should maintain same behavior as before when caseSensitive is explicitly false', () => {
      const testCases = [
        {
          filter: "contains(Name, 'test')",
          options: { caseSensitive: false },
          expected: { Name: { contains: 'test', mode: PrismaStringMode.INSENSITIVE } }
        },
        {
          filter: "startswith(Name, 'test')",
          options: { caseSensitive: false },
          expected: { Name: { startsWith: 'test', mode: PrismaStringMode.INSENSITIVE } }
        },
        {
          filter: "endswith(Name, 'test')",
          options: { caseSensitive: false },
          expected: { Name: { endsWith: 'test', mode: PrismaStringMode.INSENSITIVE } }
        }
      ];

      testCases.forEach(({ filter, options, expected }) => {
        const result = convertToPrisma(filter, options);
        expect(result).toEqual(expected);
      });
    });

    test('should not break existing code that relies on default behavior', () => {
      // These should work exactly as before (no mode property)
      const testCases = [
        "contains(Name, 'test')",
        "startswith(Name, 'test')",
        "endswith(Name, 'test')",
        "indexof(Name, 'test') ge 0"
      ];

      testCases.forEach(filter => {
        const result = convertToPrisma(filter);
        const fieldName = Object.keys(result)[0];
        expect(result[fieldName]).not.toHaveProperty('mode');
      });
    });
  });
});
