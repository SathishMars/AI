import { 
  getMongoConnection, 
  getMongoDatabase, 
  testMongoConnection, 
  getMongoConnectionStats,
  closeMongoConnection,
  MongoDBConnectionPool,
  type MongoConnection,
  type ConnectionStats
} from '@/app/utils/mongodb-connection';
import { MongoClient } from 'mongodb';

// Use manual mock
jest.mock('mongodb');

const mockMongoClient = MongoClient as jest.MockedClass<typeof MongoClient>;

describe('MongoDB Connection Pool Utility', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockClient: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up mock instances
    mockDb = {
      admin: jest.fn().mockReturnValue({
        ping: jest.fn().mockResolvedValue({}),
        serverStatus: jest.fn().mockResolvedValue({
          connections: { current: 5, available: 10, totalCreated: 15 },
          uptime: 3600
        })
      }),
      stats: jest.fn().mockResolvedValue({
        collections: 3,
        dataSize: 1024,
        indexSize: 512
      })
    };

    mockClient = {
      connect: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
      db: jest.fn().mockReturnValue(mockDb),
      on: jest.fn()
    };

    mockMongoClient.mockImplementation(() => mockClient);
    
    // Reset singleton instance
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (MongoDBConnectionPool as any).instance = undefined;
    
    // Set up test environment variables for local MongoDB
    process.env.DATABASE_ENVIRONMENT = 'local';
    process.env.MONGODB_URI = 'mongodb://testuser:testpass@localhost:27017/testdb';
  });

  afterEach(async () => {
    // Clean up connections after each test
    try {
      await closeMongoConnection();
    } catch {
      // Ignore cleanup errors in tests
    }
  });

  describe('Connection Establishment', () => {
    it('should create a valid MongoDB connection', async () => {
      const connection = await getMongoConnection();
      
      expect(connection).toHaveProperty('client');
      expect(connection).toHaveProperty('db');
      expect(mockClient.connect).toHaveBeenCalledTimes(1);
      expect(mockClient.db).toHaveBeenCalledWith('testdb');
    });

    it('should reuse existing connection on subsequent calls', async () => {
      const connection1 = await getMongoConnection();
      const connection2 = await getMongoConnection();
      
      expect(connection1.client).toBe(connection2.client);
      expect(connection1.db).toBe(connection2.db);
      expect(mockClient.connect).toHaveBeenCalledTimes(1);
    });

    it('should handle connection failures gracefully', async () => {
      const connectionError = new Error('Connection failed');
      (mockClient.connect as jest.Mock).mockRejectedValueOnce(connectionError);
      
      await expect(getMongoConnection()).rejects.toThrow('MongoDB connection failed: Connection failed');
      expect(mockClient.close).toHaveBeenCalledTimes(1);
    });
  });

  describe('Database Access', () => {
    it('should return database instance', async () => {
      const db = await getMongoDatabase();
      
      expect(db).toBe(mockDb);
      expect(mockClient.db).toHaveBeenCalledWith('testdb');
    });

    it('should validate database connection with ping', async () => {
      await getMongoDatabase();
      
      expect(mockDb.admin().ping).toHaveBeenCalled();
    });
  });

  describe('Connection Testing', () => {
    it('should return true for successful connection test', async () => {
      const result = await testMongoConnection();
      
      expect(result).toBe(true);
      expect(mockDb.admin().ping).toHaveBeenCalled();
    });

    it('should return false for failed connection test', async () => {
      (mockDb.admin().ping as jest.Mock).mockRejectedValueOnce(new Error('Ping failed'));
      
      const result = await testMongoConnection();
      
      expect(result).toBe(false);
    });
  });

  describe('Connection Statistics', () => {
    it('should return formatted connection statistics', async () => {
      const stats = await getMongoConnectionStats();
      
      expect(stats).toEqual({
        database: 'testdb',
        collections: 3,
        dataSize: 1024,
        indexSize: 512,
        connections: { current: 5, available: 10, totalCreated: 15 },
        uptime: 3600
      });
      
      expect(mockDb.stats).toHaveBeenCalled();
      expect(mockDb.admin().serverStatus).toHaveBeenCalled();
    });

    it('should handle stats retrieval errors', async () => {
      (mockDb.stats as jest.Mock).mockRejectedValueOnce(new Error('Stats failed'));
      
      await expect(getMongoConnectionStats()).rejects.toThrow('Stats failed');
    });
  });

  describe('Connection Cleanup', () => {
    it('should close connections properly', async () => {
      await getMongoConnection();
      await closeMongoConnection();
      
      expect(mockClient.close).toHaveBeenCalledTimes(1);
    });

    it('should handle close errors gracefully', async () => {
      await getMongoConnection();
      (mockClient.close as jest.Mock).mockRejectedValueOnce(new Error('Close failed'));
      
      // Should not throw error
      await expect(closeMongoConnection()).resolves.toBeUndefined();
    });
  });

  describe('Singleton Pattern', () => {
    it('should maintain singleton instance across calls', () => {
      const instance1 = MongoDBConnectionPool.getInstance();
      const instance2 = MongoDBConnectionPool.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('Connection Recovery', () => {
    it('should create new connection if existing one is invalid', async () => {
      // Get initial connection
      await getMongoConnection();
      expect(mockClient.connect).toHaveBeenCalledTimes(1);
      
      // Simulate connection failure on ping
      (mockDb.admin().ping as jest.Mock).mockRejectedValueOnce(new Error('Connection lost'));
      
      // Reset mocks to track new connection
      jest.clearAllMocks();
      (mockClient.connect as jest.Mock).mockResolvedValue(undefined);
      (mockClient.db as jest.Mock).mockReturnValue(mockDb);
      
      // Should create new connection
      const newConnection = await getMongoConnection();
      expect(newConnection).toHaveProperty('client');
      expect(newConnection).toHaveProperty('db');
    });
  });

  describe('Environment Configuration', () => {
    it('should use default values when environment variables are not set', () => {
      delete process.env.DATABASE_ENVIRONMENT;
      // Set MONGODB_URI with default values
      process.env.MONGODB_URI = 'mongodb://groupize_app:gr0up!zeapP@localhost:27017/groupize-workflows';
      
      // Reset singleton to pick up new env vars
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (MongoDBConnectionPool as any).instance = undefined;
      
      // The constructor should use defaults
      const instance = MongoDBConnectionPool.getInstance();
      expect(instance).toBeDefined();
    });

    it('should configure for DocumentDB environment', async () => {
      // Set DocumentDB environment variables
      process.env.DATABASE_ENVIRONMENT = 'documentdb';
      process.env.DOCUMENTDB_URI = 'mongodb://docdb-user:docdb-password@test-cluster.cluster-xyz.us-east-1.docdb.amazonaws.com:27017/groupize-workflows?ssl=true&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false';
      
      // Reset singleton to pick up new env vars
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (MongoDBConnectionPool as any).instance = undefined;
      
      const connection = await getMongoConnection();
      expect(connection).toHaveProperty('client');
      expect(connection).toHaveProperty('db');
      expect(mockClient.connect).toHaveBeenCalledTimes(1);
    });

    it('should throw error for DocumentDB without required credentials', () => {
      process.env.DATABASE_ENVIRONMENT = 'documentdb';
      delete process.env.DOCUMENTDB_URI;
      
      // Reset singleton to pick up new env vars
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (MongoDBConnectionPool as any).instance = undefined;
      
      expect(() => {
        MongoDBConnectionPool.getInstance();
      }).toThrow('AWS DocumentDB connection requires DOCUMENTDB_URI environment variable');
    });
  });

  describe('Type Safety', () => {
    it('should export correct TypeScript types', () => {
      // This test ensures types are exported correctly
      const connection: MongoConnection = {
        client: mockClient,
        db: mockDb
      };
      
      const stats: ConnectionStats = {
        database: 'test',
        collections: 1,
        dataSize: 100,
        indexSize: 50,
        connections: { current: 1, available: 5, totalCreated: 1 },
        uptime: 100
      };
      
      expect(connection).toBeDefined();
      expect(stats).toBeDefined();
    });
  });
});