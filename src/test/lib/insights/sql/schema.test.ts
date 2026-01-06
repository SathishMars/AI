// INSIGHTS-SPECIFIC: Unit tests for SQL schema utilities
import { getAttendeeSchemaText } from '@/app/lib/insights/sql/schema';

// Mock the database pool
jest.mock('@/app/lib/insights/db', () => ({
  insightsPool: {
    query: jest.fn(),
  },
}));

describe('SQL Schema Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAttendeeSchemaText', () => {
    it('should fetch and format schema from database', async () => {
      const { insightsPool } = require('@/app/lib/insights/db');
      insightsPool.query.mockResolvedValue({
        rows: [
          { column_name: 'first_name', data_type: 'text' },
          { column_name: 'last_name', data_type: 'text' },
          { column_name: 'email', data_type: 'text' },
          { column_name: 'created_at', data_type: 'timestamp' },
        ],
      });

      const result = await getAttendeeSchemaText();

      expect(result).toContain('Table: public.attendee');
      expect(result).toContain('first_name');
      expect(result).toContain('last_name');
      expect(result).toContain('email');
      expect(result).toContain('text');
      expect(result).toContain('timestamp');
      expect(insightsPool.query).toHaveBeenCalled();
    });

    it('should include schema rules', async () => {
      const { insightsPool } = require('@/app/lib/insights/db');
      insightsPool.query.mockResolvedValue({
        rows: [{ column_name: 'id', data_type: 'integer' }],
      });

      const result = await getAttendeeSchemaText();

      expect(result).toContain('Only use SELECT');
      expect(result).toContain('Always include LIMIT');
      expect(result).toContain('created_at::timestamp');
    });

    it('should format columns correctly', async () => {
      const { insightsPool } = require('@/app/lib/insights/db');
      insightsPool.query.mockResolvedValue({
        rows: [
          { column_name: 'id', data_type: 'integer' },
          { column_name: 'name', data_type: 'varchar' },
        ],
      });

      const result = await getAttendeeSchemaText();

      expect(result).toContain('- id (integer)');
      expect(result).toContain('- name (varchar)');
    });

    it('should handle empty schema', async () => {
      const { insightsPool } = require('@/app/lib/insights/db');
      insightsPool.query.mockResolvedValue({
        rows: [],
      });

      const result = await getAttendeeSchemaText();

      expect(result).toContain('Table: public.attendee');
      expect(result).toContain('Columns:');
    });

    it('should handle database errors', async () => {
      const { insightsPool } = require('@/app/lib/insights/db');
      insightsPool.query.mockRejectedValue(new Error('Database error'));

      await expect(getAttendeeSchemaText()).rejects.toThrow('Database error');
    });
  });
});

