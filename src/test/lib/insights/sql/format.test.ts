// INSIGHTS-SPECIFIC: Unit tests for SQL result formatting
import { formatResultToAnswer } from '@/app/lib/insights/sql/format';

describe('SQL Result Formatting', () => {
  describe('formatResultToAnswer', () => {
    it('should return message for empty results', () => {
      const result = formatResultToAnswer([]);
      expect(result).toBe("I didn't find any matching records.");
    });

    it('should return message for null input', () => {
      const result = formatResultToAnswer(null as any);
      expect(result).toBe("I didn't find any matching records.");
    });

    it('should format aggregate results (single row, few columns)', () => {
      const rows = [{ count: 50, total: 100 }];
      const result = formatResultToAnswer(rows);
      expect(result).toContain("Here's what I found:");
      expect(result).toContain('count: 50');
      expect(result).toContain('total: 100');
    });

    it('should format aggregate with 4 columns', () => {
      const rows = [{ count: 50, total: 100, avg: 25.5, max: 100 }];
      const result = formatResultToAnswer(rows);
      expect(result).toContain("Here's what I found:");
    });

    it('should format table results (multiple rows)', () => {
      const rows = [
        { first_name: 'John', last_name: 'Doe' },
        { first_name: 'Jane', last_name: 'Smith' },
        { first_name: 'Bob', last_name: 'Johnson' },
      ];
      const result = formatResultToAnswer(rows);
      expect(result).toContain('I found **3** rows');
      expect(result).toContain('first_name');
      expect(result).toContain('last_name');
      expect(result).toContain('John');
      expect(result).toContain('Jane');
    });

    it('should limit preview to 5 rows', () => {
      const rows = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        name: `User ${i + 1}`,
      }));
      const result = formatResultToAnswer(rows);
      expect(result).toContain('I found **10** rows');
      expect(result).toContain('Here are the first 5:');
      // Should not contain User 6
      expect(result).not.toContain('User 6');
    });

    it('should handle rows with null values', () => {
      const rows = [
        { first_name: 'John', last_name: null, email: 'john@example.com' },
      ];
      const result = formatResultToAnswer(rows);
      expect(result).toContain('John');
      expect(result).toContain('john@example.com');
    });

    it('should handle rows with undefined values', () => {
      const rows = [
        { first_name: 'John', last_name: undefined, email: 'john@example.com' },
      ];
      const result = formatResultToAnswer(rows);
      expect(result).toContain('John');
    });

    it('should format table with many columns', () => {
      const rows = [
        {
          col1: 'val1',
          col2: 'val2',
          col3: 'val3',
          col4: 'val4',
          col5: 'val5',
          col6: 'val6',
        },
      ];
      const result = formatResultToAnswer(rows);
      // Should format as table (not aggregate) since > 4 columns
      expect(result).toContain('I found **1** rows');
    });

    it('should handle special characters in data', () => {
      const rows = [
        { name: 'John "Johnny" Doe', email: 'john@example.com' },
      ];
      const result = formatResultToAnswer(rows);
      expect(result).toContain('John "Johnny" Doe');
    });

    it('should convert all values to strings', () => {
      const rows = [
        { id: 123, count: 456, price: 99.99, active: true },
      ];
      const result = formatResultToAnswer(rows);
      expect(result).toContain('123');
      expect(result).toContain('456');
      expect(result).toContain('99.99');
      expect(result).toContain('true');
    });
  });
});

