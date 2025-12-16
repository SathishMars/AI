/**
 * Tests for Database Initialization Utilities
 */

import {
  compareVersions,
  parseVersion,
  sortVersions,
  isValidVersion,
} from '@/app/utils/version-comparison';

describe('version-comparison', () => {
  describe('parseVersion', () => {
    it('should parse valid semantic versions', () => {
      const result = parseVersion('1.0.0');
      expect(result).toEqual({
        major: 1,
        minor: 0,
        patch: 0,
        raw: '1.0.0',
      });
    });

    it('should parse different major.minor.patch combinations', () => {
      const result = parseVersion('2.15.31');
      expect(result).toEqual({
        major: 2,
        minor: 15,
        patch: 31,
        raw: '2.15.31',
      });
    });

    it('should return null for invalid versions', () => {
      expect(parseVersion('1.0')).toBeNull();
      expect(parseVersion('v1.0.0')).toBeNull();
      expect(parseVersion('1.0.0.0')).toBeNull();
      expect(parseVersion('1.a.0')).toBeNull();
    });
  });

  describe('isValidVersion', () => {
    it('should return true for valid versions', () => {
      expect(isValidVersion('1.0.0')).toBe(true);
      expect(isValidVersion('2.15.31')).toBe(true);
      expect(isValidVersion('0.0.0')).toBe(true);
    });

    it('should return false for invalid versions', () => {
      expect(isValidVersion('1.0')).toBe(false);
      expect(isValidVersion('v1.0.0')).toBe(false);
      expect(isValidVersion('invalid')).toBe(false);
    });
  });

  describe('compareVersions', () => {
    it('should return -1 when first version is less than second', () => {
      expect(compareVersions('1.0.0', '1.0.1')).toBe(-1);
      expect(compareVersions('1.0.0', '1.1.0')).toBe(-1);
      expect(compareVersions('1.0.0', '2.0.0')).toBe(-1);
    });

    it('should return 0 when versions are equal', () => {
      expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
      expect(compareVersions('2.15.31', '2.15.31')).toBe(0);
    });

    it('should return 1 when first version is greater than second', () => {
      expect(compareVersions('1.0.1', '1.0.0')).toBe(1);
      expect(compareVersions('1.1.0', '1.0.0')).toBe(1);
      expect(compareVersions('2.0.0', '1.0.0')).toBe(1);
    });

    it('should handle multi-digit version numbers', () => {
      expect(compareVersions('10.0.0', '2.0.0')).toBe(1);
      expect(compareVersions('1.100.0', '1.99.0')).toBe(1);
      expect(compareVersions('1.0.100', '1.0.99')).toBe(1);
    });

    it('should throw for invalid versions', () => {
      expect(() => compareVersions('1.0', '1.0.0')).toThrow();
      expect(() => compareVersions('1.0.0', 'invalid')).toThrow();
    });
  });

  describe('sortVersions', () => {
    it('should sort versions in ascending order', () => {
      const versions = ['2.0.0', '1.0.0', '1.1.0', '1.0.1'];
      const sorted = sortVersions(versions);
      expect(sorted).toEqual(['1.0.0', '1.0.1', '1.1.0', '2.0.0']);
    });

    it('should not modify the original array', () => {
      const versions = ['2.0.0', '1.0.0'];
      const original = [...versions];
      sortVersions(versions);
      expect(versions).toEqual(original);
    });

    it('should handle single version', () => {
      expect(sortVersions(['1.0.0'])).toEqual(['1.0.0']);
    });

    it('should handle already sorted versions', () => {
      const versions = ['1.0.0', '1.0.1', '1.1.0', '2.0.0'];
      expect(sortVersions(versions)).toEqual(versions);
    });

    it('should handle reverse sorted versions', () => {
      const versions = ['2.0.0', '1.1.0', '1.0.1', '1.0.0'];
      expect(sortVersions(versions)).toEqual(['1.0.0', '1.0.1', '1.1.0', '2.0.0']);
    });
  });
});
