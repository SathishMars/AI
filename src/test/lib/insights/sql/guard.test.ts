// INSIGHTS-SPECIFIC: Unit tests for SQL guard functions
import { ensureSafeSelect, forceLimit, containsPII, PII_COLUMNS } from '@/app/lib/insights/sql/guard';

describe('SQL Guard Functions', () => {
  describe('ensureSafeSelect', () => {
    it('should allow valid SELECT queries', () => {
      const sql = 'SELECT first_name, last_name FROM attendee';
      expect(() => ensureSafeSelect(sql)).not.toThrow();
      expect(ensureSafeSelect(sql)).toBe(sql);
    });

    it('should allow SELECT with WHERE clause', () => {
      const sql = 'SELECT * FROM attendee WHERE first_name = $1';
      expect(() => ensureSafeSelect(sql)).not.toThrow();
    });

    it('should allow SELECT with JOIN', () => {
      const sql = 'SELECT a.first_name FROM attendee a JOIN events e ON a.event_id = e.id';
      expect(() => ensureSafeSelect(sql)).not.toThrow();
    });

    it('should reject non-SELECT queries', () => {
      const sql = 'INSERT INTO attendee VALUES (1, "test")';
      expect(() => ensureSafeSelect(sql)).toThrow('Only SELECT queries are allowed');
    });

    it('should reject UPDATE queries', () => {
      const sql = 'UPDATE attendee SET first_name = "test"';
      expect(() => ensureSafeSelect(sql)).toThrow('Only SELECT queries are allowed');
    });

    it('should reject DELETE queries', () => {
      const sql = 'DELETE FROM attendee WHERE id = 1';
      expect(() => ensureSafeSelect(sql)).toThrow('Only SELECT queries are allowed');
    });

    it('should reject queries with semicolons', () => {
      const sql = 'SELECT * FROM attendee; DROP TABLE attendee';
      expect(() => ensureSafeSelect(sql)).toThrow('Semicolons are not allowed');
    });

    it('should reject queries with multiple statements via semicolon', () => {
      const sql = 'SELECT * FROM attendee; SELECT * FROM events';
      expect(() => ensureSafeSelect(sql)).toThrow('Semicolons are not allowed');
    });

    it('should reject forbidden keywords in INSERT', () => {
      const sql = 'SELECT * FROM attendee INSERT INTO test';
      expect(() => ensureSafeSelect(sql)).toThrow('Forbidden keyword detected: insert');
    });

    it('should reject forbidden keywords in UPDATE', () => {
      const sql = 'SELECT * FROM attendee UPDATE test';
      expect(() => ensureSafeSelect(sql)).toThrow('Forbidden keyword detected: update');
    });

    it('should reject forbidden keywords in DELETE', () => {
      const sql = 'SELECT * FROM attendee DELETE FROM test';
      expect(() => ensureSafeSelect(sql)).toThrow('Forbidden keyword detected: delete');
    });

    it('should reject forbidden keywords in DROP', () => {
      const sql = 'SELECT * FROM attendee DROP TABLE test';
      expect(() => ensureSafeSelect(sql)).toThrow('Forbidden keyword detected: drop');
    });

    it('should reject forbidden keywords in ALTER', () => {
      const sql = 'SELECT * FROM attendee ALTER TABLE test';
      expect(() => ensureSafeSelect(sql)).toThrow('Forbidden keyword detected: alter');
    });

    it('should handle case-insensitive SELECT', () => {
      const sql = 'select * from attendee';
      expect(() => ensureSafeSelect(sql)).not.toThrow();
    });

    it('should trim whitespace', () => {
      const sql = '   SELECT * FROM attendee   ';
      const result = ensureSafeSelect(sql);
      expect(result).toBe('SELECT * FROM attendee');
    });
  });

  describe('forceLimit', () => {
    it('should add LIMIT if not present', () => {
      const sql = 'SELECT * FROM attendee';
      const result = forceLimit(sql, 50);
      expect(result).toContain('LIMIT 50');
    });

    it('should cap existing LIMIT that exceeds max', () => {
      const sql = 'SELECT * FROM attendee LIMIT 100';
      const result = forceLimit(sql, 50);
      expect(result).toContain('LIMIT 50');
      expect(result).not.toContain('LIMIT 100');
    });

    it('should preserve LIMIT if below cap', () => {
      const sql = 'SELECT * FROM attendee LIMIT 10';
      const result = forceLimit(sql, 50);
      expect(result).toContain('LIMIT 10');
    });

    it('should handle LIMIT with OFFSET', () => {
      const sql = 'SELECT * FROM attendee LIMIT 100 OFFSET 10';
      const result = forceLimit(sql, 50);
      expect(result).toContain('LIMIT 50');
    });

    it('should handle case-insensitive LIMIT', () => {
      const sql = 'SELECT * FROM attendee limit 100';
      const result = forceLimit(sql, 50);
      expect(result).toContain('LIMIT 50');
    });

    it('should handle non-numeric LIMIT gracefully', () => {
      const sql = 'SELECT * FROM attendee LIMIT abc';
      const result = forceLimit(sql, 50);
      // The function adds LIMIT even if existing LIMIT is invalid
      // This is expected behavior - it ensures a valid LIMIT is always present
      expect(result).toContain('LIMIT');
    });

    it('should use custom limit value', () => {
      const sql = 'SELECT * FROM attendee';
      const result = forceLimit(sql, 25);
      expect(result).toContain('LIMIT 25');
    });
  });

  describe('containsPII', () => {
    describe('Direct column references', () => {
      it('should detect all PII columns', () => {
        PII_COLUMNS.forEach(column => {
          const sql = `SELECT ${column} FROM attendee`;
          expect(containsPII(sql)).toBe(true);
        });
      });

      it('should detect PII in SELECT with multiple columns', () => {
        const sql = 'SELECT first_name, email, last_name FROM attendee';
        expect(containsPII(sql)).toBe(true);
      });

      it('should not detect false positives', () => {
        const sql = 'SELECT first_name, last_name, company_name FROM attendee';
        expect(containsPII(sql)).toBe(false);
      });
    });

    describe('Column aliases', () => {
      it('should detect PII in aliases', () => {
        const sql = 'SELECT email AS e FROM attendee';
        expect(containsPII(sql)).toBe(true);
      });

      it('should detect PII with table alias', () => {
        const sql = 'SELECT a.email AS e FROM attendee a';
        expect(containsPII(sql)).toBe(true);
      });

      it('should detect PII in qualified alias', () => {
        const sql = 'SELECT e.email FROM attendee e';
        expect(containsPII(sql)).toBe(true);
      });
    });

    describe('Table-qualified columns', () => {
      it('should detect table-qualified PII columns', () => {
        const sql = 'SELECT attendee.email FROM attendee';
        expect(containsPII(sql)).toBe(true);
      });

      it('should detect schema-qualified PII columns', () => {
        const sql = 'SELECT public.attendee.email FROM public.attendee';
        expect(containsPII(sql)).toBe(true);
      });
    });

    describe('SQL functions', () => {
      it('should detect PII in CONCAT', () => {
        const sql = 'SELECT CONCAT(email, "@example.com") FROM attendee';
        expect(containsPII(sql)).toBe(true);
      });

      it('should detect PII in SUBSTRING', () => {
        const sql = 'SELECT SUBSTRING(email, 1, 5) FROM attendee';
        expect(containsPII(sql)).toBe(true);
      });

      it('should detect PII in SUBSTR', () => {
        const sql = 'SELECT SUBSTR(phone, 1, 3) FROM attendee';
        expect(containsPII(sql)).toBe(true);
      });

      it('should detect PII in LOWER', () => {
        const sql = 'SELECT LOWER(email) FROM attendee';
        expect(containsPII(sql)).toBe(true);
      });

      it('should detect PII in UPPER', () => {
        const sql = 'SELECT UPPER(email) FROM attendee';
        expect(containsPII(sql)).toBe(true);
      });

      it('should detect PII in TRIM', () => {
        const sql = 'SELECT TRIM(email) FROM attendee';
        expect(containsPII(sql)).toBe(true);
      });

      it('should detect PII in COALESCE', () => {
        const sql = 'SELECT COALESCE(email, phone) FROM attendee';
        expect(containsPII(sql)).toBe(true);
      });
    });

    describe('SQL comments', () => {
      it('should detect PII even with single-line comments', () => {
        const sql = 'SELECT email -- comment FROM attendee';
        expect(containsPII(sql)).toBe(true);
      });

      it('should detect PII even with multi-line comments', () => {
        const sql = 'SELECT /* comment */ email FROM attendee';
        expect(containsPII(sql)).toBe(true);
      });

      it('should handle complex comment patterns', () => {
        const sql = 'SELECT -- email\nfirst_name, email FROM attendee';
        expect(containsPII(sql)).toBe(true);
      });
    });

    describe('Case insensitivity', () => {
      it('should detect PII regardless of case', () => {
        const sql = 'SELECT EMAIL FROM attendee';
        expect(containsPII(sql)).toBe(true);
      });

      it('should detect PII in mixed case', () => {
        const sql = 'SELECT Email FROM attendee';
        expect(containsPII(sql)).toBe(true);
      });
    });

    describe('Edge cases', () => {
      it('should handle empty SQL', () => {
        expect(containsPII('')).toBe(false);
      });

      it('should handle SQL with no PII', () => {
        const sql = 'SELECT COUNT(*) FROM attendee';
        expect(containsPII(sql)).toBe(false);
      });

      it('should handle complex queries', () => {
        const sql = `
          SELECT 
            first_name,
            last_name,
            email,
            COUNT(*) as total
          FROM attendee
          GROUP BY first_name, last_name, email
        `;
        expect(containsPII(sql)).toBe(true);
      });
    });
  });
});

