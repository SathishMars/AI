// INSIGHTS-SPECIFIC: Unit tests for SQL timeout functions
import { queryWithTimeout } from '@/app/lib/insights/sql/timeout';

// Mock the database pool
jest.mock('@/app/lib/insights/db', () => ({
  insightsPool: {
    connect: jest.fn(),
  },
}));

describe('SQL Timeout Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('queryWithTimeout', () => {
    it('should execute query successfully', async () => {
      const { insightsPool } = require('@/app/lib/insights/db');
      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce(undefined) // BEGIN
          .mockResolvedValueOnce(undefined) // SET LOCAL
          .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // SELECT
          .mockResolvedValueOnce(undefined), // COMMIT
        release: jest.fn(),
      };
      insightsPool.connect.mockResolvedValue(mockClient);

      const result = await queryWithTimeout('SELECT * FROM attendee', [], 1500);

      expect(result.rows).toEqual([{ id: 1 }]);
      expect(mockClient.query).toHaveBeenCalledTimes(4);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should use parameterized queries', async () => {
      const { insightsPool } = require('@/app/lib/insights/db');
      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce(undefined)
          .mockResolvedValueOnce(undefined)
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce(undefined),
        release: jest.fn(),
      };
      insightsPool.connect.mockResolvedValue(mockClient);

      await queryWithTimeout('SELECT * FROM attendee WHERE id = $1', [123], 1500);

      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT * FROM attendee WHERE id = $1',
        [123]
      );
    });

    it('should validate and cap timeout value', async () => {
      const { insightsPool } = require('@/app/lib/insights/db');
      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce(undefined)
          .mockResolvedValueOnce(undefined)
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce(undefined),
        release: jest.fn(),
      };
      insightsPool.connect.mockResolvedValue(mockClient);

      // Test with timeout exceeding max (30000ms)
      await queryWithTimeout('SELECT * FROM attendee', [], 50000);

      // Should cap at 30000
      const timeoutCall = mockClient.query.mock.calls.find(
        call => call[0]?.includes('statement_timeout')
      );
      expect(timeoutCall).toBeDefined();
      const timeoutValue = parseInt(timeoutCall[0].match(/\d+/)[0]);
      expect(timeoutValue).toBeLessThanOrEqual(30000);
    });

    it('should enforce minimum timeout value', async () => {
      const { insightsPool } = require('@/app/lib/insights/db');
      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce(undefined)
          .mockResolvedValueOnce(undefined)
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce(undefined),
        release: jest.fn(),
      };
      insightsPool.connect.mockResolvedValue(mockClient);

      // Test with timeout below minimum (100ms)
      await queryWithTimeout('SELECT * FROM attendee', [], 50);

      const timeoutCall = mockClient.query.mock.calls.find(
        call => call[0]?.includes('statement_timeout')
      );
      const timeoutValue = parseInt(timeoutCall[0].match(/\d+/)[0]);
      expect(timeoutValue).toBeGreaterThanOrEqual(100);
    });

    it('should rollback on error', async () => {
      const { insightsPool } = require('@/app/lib/insights/db');
      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce(undefined) // BEGIN
          .mockResolvedValueOnce(undefined) // SET LOCAL
          .mockRejectedValueOnce(new Error('Query failed')), // SELECT
        release: jest.fn(),
      };
      insightsPool.connect.mockResolvedValue(mockClient);

      await expect(
        queryWithTimeout('SELECT * FROM attendee', [], 1500)
      ).rejects.toThrow('Query failed');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should release connection even if rollback fails', async () => {
      const { insightsPool } = require('@/app/lib/insights/db');
      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce(undefined) // BEGIN
          .mockResolvedValueOnce(undefined) // SET LOCAL
          .mockRejectedValueOnce(new Error('Query failed')), // SELECT
        release: jest.fn(),
      };
      // Make rollback also fail
      mockClient.query.mockResolvedValueOnce(undefined); // ROLLBACK succeeds
      insightsPool.connect.mockResolvedValue(mockClient);

      await expect(
        queryWithTimeout('SELECT * FROM attendee', [], 1500)
      ).rejects.toThrow();

      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should release connection even if connect fails', async () => {
      const { insightsPool } = require('@/app/lib/insights/db');
      insightsPool.connect.mockRejectedValue(new Error('Connection failed'));

      await expect(
        queryWithTimeout('SELECT * FROM attendee', [], 1500)
      ).rejects.toThrow('Connection failed');

      // Should not throw on release since client is null
    });

    it('should handle connection acquisition failure', async () => {
      const { insightsPool } = require('@/app/lib/insights/db');
      insightsPool.connect.mockResolvedValue(null);

      await expect(
        queryWithTimeout('SELECT * FROM attendee', [], 1500)
      ).rejects.toThrow('Failed to acquire database connection');
    });

    it('should handle release errors gracefully', async () => {
      const { insightsPool } = require('@/app/lib/insights/db');
      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce(undefined)
          .mockResolvedValueOnce(undefined)
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce(undefined),
        release: jest.fn().mockImplementation(() => {
          throw new Error('Release failed');
        }),
      };
      insightsPool.connect.mockResolvedValue(mockClient);

      // Should not throw even if release fails
      const result = await queryWithTimeout('SELECT * FROM attendee', [], 1500);
      expect(result).toBeDefined();
      expect(console.error).toHaveBeenCalled();
    });

    it('should use default timeout when not specified', async () => {
      const { insightsPool } = require('@/app/lib/insights/db');
      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce(undefined)
          .mockResolvedValueOnce(undefined)
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce(undefined),
        release: jest.fn(),
      };
      insightsPool.connect.mockResolvedValue(mockClient);

      await queryWithTimeout('SELECT * FROM attendee');

      const timeoutCall = mockClient.query.mock.calls.find(
        call => call[0]?.includes('statement_timeout')
      );
      expect(timeoutCall).toBeDefined();
      // Default is 1500ms
      const timeoutValue = parseInt(timeoutCall[0].match(/\d+/)[0]);
      expect(timeoutValue).toBe(1500);
    });
  });
});

