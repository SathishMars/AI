// src/test/app/utils/short-id-generator.test.ts
/**
 * Unit tests for short ID generator
 */

import { 
  generateShortId, 
  isValidShortId,
  generateShortIds
} from '@/app/utils/short-id-generator';

describe('short-id-generator', () => {
  describe('generateShortId', () => {
    it('should generate a 10-character ID', () => {
      const id = generateShortId();
      expect(id).toHaveLength(10);
    });

    it('should generate alphanumeric characters only', () => {
      const id = generateShortId();
      expect(id).toMatch(/^[a-zA-Z0-9]{10}$/);
    });

    it('should generate unique IDs', () => {
      const ids = new Set<string>();
      const count = 1000;
      
      for (let i = 0; i < count; i++) {
        ids.add(generateShortId());
      }
      
      // All IDs should be unique
      expect(ids.size).toBe(count);
    });

    it('should not contain special characters', () => {
      const id = generateShortId();
      expect(id).not.toMatch(/[^a-zA-Z0-9]/);
    });
  });

  describe('isValidShortId', () => {
    it('should return true for valid short IDs', () => {
      expect(isValidShortId('a1b2c3d4e5')).toBe(true);
      expect(isValidShortId('0123456789')).toBe(true);
      expect(isValidShortId('ABCDEFGHIJ')).toBe(true);
      expect(isValidShortId('aBcDeFgHiJ')).toBe(true);
    });

    it('should return false for invalid length', () => {
      expect(isValidShortId('short')).toBe(false);
      expect(isValidShortId('toolongid123')).toBe(false);
      expect(isValidShortId('')).toBe(false);
    });

    it('should return false for special characters', () => {
      expect(isValidShortId('a1b2c3d4-5')).toBe(false);
      expect(isValidShortId('a1b2c3d4_5')).toBe(false);
      expect(isValidShortId('a1b2c3d4 5')).toBe(false);
      expect(isValidShortId('a1b2c3d4@5')).toBe(false);
    });

    it('should return false for non-string values', () => {
      expect(isValidShortId(null as unknown as string)).toBe(false);
      expect(isValidShortId(undefined as unknown as string)).toBe(false);
      expect(isValidShortId(123 as unknown as string)).toBe(false);
    });
  });

  describe('generateShortIds', () => {
    it('should generate requested number of IDs', () => {
      const ids = generateShortIds(10);
      expect(ids).toHaveLength(10);
    });

    it('should generate unique IDs', () => {
      const ids = generateShortIds(100);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(100);
    });

    it('should generate valid format for all IDs', () => {
      const ids = generateShortIds(50);
      ids.forEach(id => {
        expect(isValidShortId(id)).toBe(true);
      });
    });

    it('should handle generating zero IDs', () => {
      const ids = generateShortIds(0);
      expect(ids).toHaveLength(0);
    });
  });
});
