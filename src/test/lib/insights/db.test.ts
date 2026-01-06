// INSIGHTS-SPECIFIC: Unit tests for database connection

// Mock pg module before importing db module
jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation((config) => ({
    query: jest.fn(),
    connect: jest.fn(),
    end: jest.fn(),
    on: jest.fn(),
    ...config,
  })),
}));

describe('Database Connection', () => {
  const originalEnv = process.env;
  let getInsightsPool: any;
  let insightsPool: any;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    // Re-import after resetting modules
    const dbModule = require('@/app/lib/insights/db');
    getInsightsPool = dbModule.getInsightsPool;
    insightsPool = dbModule.insightsPool;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getInsightsPool', () => {
    it('should return null when DATABASE_URL is missing', () => {
      delete process.env.DATABASE_URL;
      jest.resetModules();
      const dbModule = require('@/app/lib/insights/db');
      const pool = dbModule.getInsightsPool();
      expect(pool).toBeNull();
    });

    it('should create pool when DATABASE_URL is set', () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/test';
      jest.resetModules();
      const { Pool } = require('pg');
      const dbModule = require('@/app/lib/insights/db');
      const pool = dbModule.getInsightsPool();
      expect(Pool).toHaveBeenCalled();
      expect(pool).toBeDefined();
    });

    it('should return same instance on subsequent calls', () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/test';
      jest.resetModules();
      const dbModule = require('@/app/lib/insights/db');
      const pool1 = dbModule.getInsightsPool();
      const pool2 = dbModule.getInsightsPool();
      expect(pool1).toBe(pool2);
    });

    it('should configure pool with correct settings', () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/test';
      jest.resetModules();
      const { Pool } = require('pg');
      const dbModule = require('@/app/lib/insights/db');
      dbModule.getInsightsPool();
      expect(Pool).toHaveBeenCalledWith(
        expect.objectContaining({
          connectionString: 'postgresql://user:pass@localhost:5432/test',
          max: 10,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 2000,
        })
      );
    });

    it('should handle pool initialization errors', () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/test';
      jest.resetModules();
      const { Pool } = require('pg');
      Pool.mockImplementationOnce(() => {
        throw new Error('Connection failed');
      });
      const dbModule = require('@/app/lib/insights/db');
      const pool = dbModule.getInsightsPool();
      expect(pool).toBeNull();
    });
  });

  describe('insightsPool proxy', () => {
    it('should throw error when pool is not initialized', () => {
      delete process.env.DATABASE_URL;
      jest.resetModules();
      const { insightsPool } = require('@/app/lib/insights/db');
      expect(() => {
        insightsPool.query('SELECT 1');
      }).toThrow('Insights database pool not initialized');
    });

    it('should proxy query method when pool is initialized', () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/test';
      jest.resetModules();
      const mockQuery = jest.fn().mockResolvedValue({ rows: [] });
      const { Pool } = require('pg');
      Pool.mockImplementationOnce(() => ({
        query: mockQuery,
        connect: jest.fn(),
        end: jest.fn(),
        on: jest.fn(),
      }));
      const { insightsPool } = require('@/app/lib/insights/db');
      
      const queryFn = insightsPool.query;
      expect(typeof queryFn).toBe('function');
    });

    it('should bind methods to pool instance', () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/test';
      jest.resetModules();
      const mockPool = {
        query: jest.fn().mockResolvedValue({ rows: [] }),
        connect: jest.fn(),
        end: jest.fn(),
        on: jest.fn(),
      };
      const { Pool } = require('pg');
      Pool.mockImplementationOnce(() => mockPool);
      const { insightsPool } = require('@/app/lib/insights/db');
      
      const queryFn = insightsPool.query;
      queryFn('SELECT 1');
      expect(mockPool.query).toHaveBeenCalledWith('SELECT 1');
    });
  });
});

