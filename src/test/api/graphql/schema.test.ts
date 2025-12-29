// INSIGHTS-SPECIFIC: Unit tests for GraphQL schema resolvers
import { resolvers } from '@/app/api/graphql/schema';
import { insightsAttendeeColumns, insightsArrivalsRows } from '@/app/lib/insights/data';

// Mock the database pool
jest.mock('@/app/lib/insights/db', () => ({
  getInsightsPool: jest.fn(),
}));

describe('GraphQL Schema Resolvers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'time').mockImplementation();
    jest.spyOn(console, 'timeEnd').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('arrivalColumns resolver', () => {
    it('should return columns from database', async () => {
      const { getInsightsPool } = require('@/app/lib/insights/db');
      const mockPool = {
        query: jest.fn().mockResolvedValue({
          rows: [
            { column_name: 'first_name' },
            { column_name: 'last_name' },
            { column_name: 'email' },
          ],
        }),
      };
      getInsightsPool.mockReturnValue(mockPool);

      const result = await resolvers.Query.arrivalColumns();

      expect(result).toEqual(['first_name', 'last_name', 'email']);
      expect(mockPool.query).toHaveBeenCalled();
    });

    it('should fallback to mock data on database error', async () => {
      const { getInsightsPool } = require('@/app/lib/insights/db');
      const mockPool = {
        query: jest.fn().mockRejectedValue(new Error('Database error')),
      };
      getInsightsPool.mockReturnValue(mockPool);

      const result = await resolvers.Query.arrivalColumns();

      expect(result).toEqual(insightsAttendeeColumns);
      expect(console.error).toHaveBeenCalled();
    });

    it('should fallback when pool is null', async () => {
      const { getInsightsPool } = require('@/app/lib/insights/db');
      getInsightsPool.mockReturnValue(null);

      const result = await resolvers.Query.arrivalColumns();

      expect(result).toEqual(insightsAttendeeColumns);
    });
  });

  describe('arrivals resolver', () => {
    describe('Input validation', () => {
      it('should reject search query exceeding max length', async () => {
        const args = {
          q: 'a'.repeat(201), // Exceeds 200 char limit
          limit: 10,
          offset: 0,
        };

        await expect(resolvers.Query.arrivals(null, args)).rejects.toThrow(
          'Search query exceeds maximum length of 200 characters'
        );
      });

      it('should reject search query with invalid characters', async () => {
        const args = {
          q: 'test<script>alert("xss")</script>',
          limit: 10,
          offset: 0,
        };

        await expect(resolvers.Query.arrivals(null, args)).rejects.toThrow(
          'Search query contains invalid characters'
        );
      });

      it('should accept valid search query', async () => {
        const { getInsightsPool } = require('@/app/lib/insights/db');
        const mockPool = {
          query: jest.fn()
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [{ total: 0 }] }),
        };
        getInsightsPool.mockReturnValue(mockPool);

        const args = { q: 'john@example.com', limit: 10, offset: 0 };
        await expect(resolvers.Query.arrivals(null, args)).resolves.toBeDefined();
      });

      it('should validate limit is an integer', async () => {
        const args = {
          q: 'test',
          limit: 10.5, // Float
          offset: 0,
        };

        // Should floor the value, but still validate
        const { getInsightsPool } = require('@/app/lib/insights/db');
        const mockPool = {
          query: jest.fn()
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [{ total: 0 }] }),
        };
        getInsightsPool.mockReturnValue(mockPool);

        const result = await resolvers.Query.arrivals(null, args);
        expect(result).toBeDefined();
      });

      it('should cap limit at maximum', async () => {
        const { getInsightsPool } = require('@/app/lib/insights/db');
        const mockPool = {
          query: jest.fn()
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [{ total: 0 }] }),
        };
        getInsightsPool.mockReturnValue(mockPool);

        const args = { q: null, limit: 999999, offset: 0 };
        const result = await resolvers.Query.arrivals(null, args);

        // Should be capped at 200
        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining('LIMIT'),
          expect.arrayContaining([200, expect.any(Number)])
        );
      });

      it('should enforce minimum limit', async () => {
        const { getInsightsPool } = require('@/app/lib/insights/db');
        const mockPool = {
          query: jest.fn()
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [{ total: 0 }] }),
        };
        getInsightsPool.mockReturnValue(mockPool);

        const args = { q: null, limit: 0, offset: 0 };
        const result = await resolvers.Query.arrivals(null, args);

        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining('LIMIT'),
          expect.arrayContaining([1, expect.any(Number)])
        );
      });

      it('should enforce minimum offset', async () => {
        const { getInsightsPool } = require('@/app/lib/insights/db');
        const mockPool = {
          query: jest.fn()
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [{ total: 0 }] }),
        };
        getInsightsPool.mockReturnValue(mockPool);

        const args = { q: null, limit: 10, offset: -5 };
        const result = await resolvers.Query.arrivals(null, args);

        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining('OFFSET'),
          expect.arrayContaining([expect.any(Number), 0])
        );
      });
    });

    describe('Database queries', () => {
      it('should use parameterized queries for search', async () => {
        const { getInsightsPool } = require('@/app/lib/insights/db');
        const mockPool = {
          query: jest.fn()
            .mockResolvedValueOnce({ rows: [{ first_name: 'John' }] })
            .mockResolvedValueOnce({ rows: [{ total: 1 }] }),
        };
        getInsightsPool.mockReturnValue(mockPool);

        const args = { q: 'john', limit: 10, offset: 0 };
        await resolvers.Query.arrivals(null, args);

        // Verify parameterized query was used
        const dataQuery = mockPool.query.mock.calls[0][0];
        expect(dataQuery).toContain('$1');
        expect(dataQuery).toContain('$2');
        expect(dataQuery).toContain('$3');
        expect(dataQuery).not.toContain('john'); // Should not have raw value

        // Verify parameters were passed
        const dataParams = mockPool.query.mock.calls[0][1];
        expect(dataParams).toEqual(['%john%', 10, 0]);
      });

      it('should use parameterized queries without search', async () => {
        const { getInsightsPool } = require('@/app/lib/insights/db');
        const mockPool = {
          query: jest.fn()
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [{ total: 0 }] }),
        };
        getInsightsPool.mockReturnValue(mockPool);

        const args = { q: null, limit: 10, offset: 0 };
        await resolvers.Query.arrivals(null, args);

        const dataQuery = mockPool.query.mock.calls[0][0];
        expect(dataQuery).toContain('$1');
        expect(dataQuery).toContain('$2');
        expect(dataQuery).not.toContain('$3'); // No search param
      });

      it('should return correct result structure', async () => {
        const { getInsightsPool } = require('@/app/lib/insights/db');
        const mockRows = [
          { first_name: 'John', last_name: 'Doe' },
          { first_name: 'Jane', last_name: 'Smith' },
        ];
        const mockPool = {
          query: jest.fn()
            .mockResolvedValueOnce({ rows: mockRows })
            .mockResolvedValueOnce({ rows: [{ total: 2 }] }),
        };
        getInsightsPool.mockReturnValue(mockPool);

        const args = { q: null, limit: 10, offset: 0 };
        const result = await resolvers.Query.arrivals(null, args);

        expect(result).toEqual({
          rows: mockRows,
          total: 2,
          limit: 10,
          offset: 0,
        });
      });

      it('should handle database errors with fallback', async () => {
        const { getInsightsPool } = require('@/app/lib/insights/db');
        const mockPool = {
          query: jest.fn().mockRejectedValue(new Error('Database error')),
        };
        getInsightsPool.mockReturnValue(mockPool);

        const args = { q: null, limit: 10, offset: 0 };
        const result = await resolvers.Query.arrivals(null, args);

        // Should fallback to mock data
        expect(result).toHaveProperty('rows');
        expect(result).toHaveProperty('total');
        expect(console.error).toHaveBeenCalled();
      });

      it('should handle null pool gracefully', async () => {
        const { getInsightsPool } = require('@/app/lib/insights/db');
        getInsightsPool.mockReturnValue(null);

        const args = { q: null, limit: 10, offset: 0 };
        const result = await resolvers.Query.arrivals(null, args);

        // Should fallback to mock data
        expect(result).toHaveProperty('rows');
        expect(result).toHaveProperty('total');
      });
    });

    describe('Fallback to mock data', () => {
      it('should use mock data when database fails', async () => {
        const { getInsightsPool } = require('@/app/lib/insights/db');
        const mockPool = {
          query: jest.fn().mockRejectedValue(new Error('Connection failed')),
        };
        getInsightsPool.mockReturnValue(mockPool);

        const args = { q: null, limit: 10, offset: 0 };
        const result = await resolvers.Query.arrivals(null, args);

        expect(result.rows).toBeDefined();
        expect(Array.isArray(result.rows)).toBe(true);
      });

      it('should filter mock data when search query provided', async () => {
        const { getInsightsPool } = require('@/app/lib/insights/db');
        const mockPool = {
          query: jest.fn().mockRejectedValue(new Error('Connection failed')),
        };
        getInsightsPool.mockReturnValue(mockPool);

        // Add some mock data
        const mockData = [
          { 'First Name': 'John', 'Last Name': 'Doe', 'Email': 'john@example.com' },
          { 'First Name': 'Jane', 'Last Name': 'Smith', 'Email': 'jane@example.com' },
        ];
        jest.spyOn(require('@/app/lib/insights/data'), 'insightsArrivalsRows', 'get').mockReturnValue(mockData);

        const args = { q: 'john', limit: 10, offset: 0 };
        const result = await resolvers.Query.arrivals(null, args);

        // Should filter by search term
        expect(result.rows.length).toBeGreaterThan(0);
      });
    });
  });
});

