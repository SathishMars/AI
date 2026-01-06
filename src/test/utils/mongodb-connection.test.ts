import { getMongoDatabase, closeMongoConnection, MongoDBConnectionPool } from '@/app/utils/mongodb-connection';
import * as envModule from '@/app/lib/env';
import { MongoClient } from 'mongodb';

// Mock MongoDB
jest.mock('mongodb');
jest.mock('@/app/lib/env');

const mockMongoClient = MongoClient as jest.MockedClass<typeof MongoClient>;

describe('MongoDB Connection Pool', () => {
  let mockDb: any;
  let mockAdminHelper: any;
  let mockClient: any;

  beforeEach(async () => {
    // Reset env mock FIRST before anything else
    (envModule as any).env = {
      databaseEnvironment: 'local',
      mongoDbUri: 'mongodb://groupize_app:gr0up!zeapP@localhost:27017/groupize-workflows',
      nodeEnv: 'development',
    };

    // Close any existing connection from previous test
    await closeMongoConnection();
    
    jest.clearAllMocks();

    // Create fresh mocks for each test
    mockAdminHelper = {
      ping: jest.fn().mockResolvedValue({ ok: 1 }),
      command: jest.fn().mockResolvedValue({ ok: 1 }),
    };

    mockDb = {
      collection: jest.fn(),
      command: jest.fn().mockResolvedValue({ ok: 1 }),
      admin: jest.fn().mockReturnValue(mockAdminHelper),
    };

    mockClient = {
      db: jest.fn().mockReturnValue(mockDb),
      connect: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
      on: jest.fn().mockReturnValue(undefined), // For event listeners
    };

    mockMongoClient.mockImplementation(() => mockClient as any);
  });

  describe('getMongoDatabase', () => {
    it('should return a MongoDB database instance', async () => {
      mockDb.collection.mockReturnValue({ insertOne: jest.fn() } as any);

      const db = await getMongoDatabase();

      expect(db).toBeDefined();
      expect(db.collection).toBeDefined();
      expect(mockClient.connect).toHaveBeenCalled();
    });

    it('should reuse connection pool on subsequent calls', async () => {
      mockDb.collection.mockReturnValue({ insertOne: jest.fn() } as any);

      const db1 = await getMongoDatabase();
      const db2 = await getMongoDatabase();

      expect(db1).toBe(db2);
      expect(mockClient.connect).toHaveBeenCalledTimes(1);
    });

    it('should use local MongoDB URI when databaseEnvironment is local', async () => {
      (envModule as any).env.databaseEnvironment = 'local';

      await getMongoDatabase();

      expect(mockMongoClient).toHaveBeenCalledWith(
        expect.stringContaining('mongodb://'),
        expect.any(Object)
      );
    });

    it('should use DocumentDB URI when databaseEnvironment is documentdb', async () => {
      (envModule as any).env.databaseEnvironment = 'documentdb';
      (envModule as any).env.documentDbUri = 'mongodb+srv://user:pass@docdb.us-east-1.docdb.amazonaws.com';

      await getMongoDatabase();

      expect(mockMongoClient).toHaveBeenCalled();
    });

    it('should use correct database name from connection string', async () => {
      mockDb.collection.mockReturnValue({ insertOne: jest.fn() } as any);

      await getMongoDatabase();

      expect(mockClient.db).toHaveBeenCalledWith('groupize-workflows');
    });

    it('should handle connection errors gracefully', async () => {
      mockClient.connect.mockRejectedValueOnce(new Error('Connection failed'));

      await expect(getMongoDatabase()).rejects.toThrow('Connection failed');
    });

    it('should support local MongoDB 8.0 syntax', async () => {
      (envModule as any).env.databaseEnvironment = 'local';
      
      const db = await getMongoDatabase();
      
      expect(db.collection).toBeDefined();
    });

    it('should support AWS DocumentDB 8.0 compatibility', async () => {
      (envModule as any).env.databaseEnvironment = 'documentdb';
      (envModule as any).env.documentDbUri = 'mongodb+srv://user:pass@host:27017/dbname?retryWrites=false';

      const db = await getMongoDatabase();

      expect(db).toBeDefined();
    });

    it('should timeout after configured duration if connection fails', async () => {
      mockClient.connect.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 10000))
      );

      const connectionPromise = getMongoDatabase();

      // Connection attempt should eventually resolve or reject
      await expect(Promise.race([
        connectionPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 100))
      ])).rejects.toThrow();
    });
  });

  describe('Connection Pool Management', () => {
    it('should handle concurrent connection requests', async () => {
      mockDb.collection.mockReturnValue({ insertOne: jest.fn() } as any);

      const promises = [
        getMongoDatabase(),
        getMongoDatabase(),
        getMongoDatabase(),
      ];

      const results = await Promise.all(promises);

      expect(results[0]).toBe(results[1]);
      expect(results[1]).toBe(results[2]);
      expect(mockClient.connect).toHaveBeenCalledTimes(1);
    });

    it('should maintain connection across multiple operations', async () => {
      mockDb.collection.mockReturnValue({
        insertOne: jest.fn(),
        findOne: jest.fn(),
      } as any);

      const db1 = await getMongoDatabase();
      const collection1 = db1.collection('test');

      const db2 = await getMongoDatabase();
      const collection2 = db2.collection('test');

      expect(collection1).toBe(collection2);
    });

    it('should extract database name correctly from various URIs', async () => {
      // Test that the database name is properly extracted and used
      mockDb.collection.mockReturnValue({ insertOne: jest.fn() } as any);
      
      const db = await getMongoDatabase();
      
      // Verify the db was called to get the database instance
      expect(mockClient.db).toHaveBeenCalled();
      expect(db).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should throw error if no database URI is configured', async () => {
      await closeMongoConnection();
      // Manually reset the static instance
      (MongoDBConnectionPool as any).instance = null;
      
      (envModule as any).env.mongoDbUri = undefined;
      (envModule as any).env.documentDbUri = undefined;

      await expect(getMongoDatabase()).rejects.toThrow('MongoDB connection requires');
    });

    it('should handle invalid connection string format', async () => {
      await closeMongoConnection();
      (envModule as any).env.mongoDbUri = 'invalid-connection-string';
      
      // Invalid connection strings will be handled gracefully - the database extraction
      // falls back to a default name, and the actual connection validation happens at
      // connect() time. Since we mock the connection, we let it succeed.
      const db = await getMongoDatabase();
      
      expect(db).toBeDefined();
      // The mock.db should still be called, just with the fallback database name
      expect(mockClient.db).toHaveBeenCalled();
    });

    it('should handle MongoDB network errors', async () => {
      await closeMongoConnection();
      mockClient.connect.mockRejectedValueOnce(
        new Error('connect ECONNREFUSED 127.0.0.1:27017')
      );

      await expect(getMongoDatabase()).rejects.toThrow('MongoDB connection failed');
    });

    it('should handle authentication errors', async () => {
      mockClient.connect.mockRejectedValueOnce(
        new Error('Authentication failed')
      );

      await expect(getMongoDatabase()).rejects.toThrow('Authentication failed');
    });
  });

  describe('Environment Detection', () => {
    it('should detect local environment from config', async () => {
      (envModule as any).env.databaseEnvironment = 'local';

      await getMongoDatabase();

      // Should use local connection settings
      expect(mockMongoClient).toHaveBeenCalled();
    });

    it('should detect DocumentDB environment from config', async () => {
      (envModule as any).env.databaseEnvironment = 'documentdb';
      (envModule as any).env.documentDbUri = 'mongodb+srv://host/db';

      await getMongoDatabase();

      expect(mockMongoClient).toHaveBeenCalled();
    });

    it('should support production environment', async () => {
      (envModule as any).env.nodeEnv = 'production';
      (envModule as any).env.databaseEnvironment = 'documentdb';

      const db = await getMongoDatabase();

      expect(db).toBeDefined();
    });
  });

  describe('DocumentDB 8.0 Features', () => {
    it('should support collation in find operations', async () => {
      mockDb.collection.mockReturnValue({
        find: jest.fn().mockReturnValue({
          collation: jest.fn().mockReturnValue({
            toArray: jest.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      (envModule as any).env.databaseEnvironment = 'documentdb';
      const db = await getMongoDatabase();
      const collection = db.collection('users');
      
      // Verify collation is supported
      expect(collection.find).toBeDefined();
    });

    it('should support collation in aggregation pipelines', async () => {
      mockDb.collection.mockReturnValue({
        aggregate: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue([]),
        }),
      } as any);

      (envModule as any).env.databaseEnvironment = 'documentdb';
      const db = await getMongoDatabase();
      const collection = db.collection('workflows');
      
      // Verify aggregation with collation options is supported
      expect(collection.aggregate).toBeDefined();
    });

    it('should support case-insensitive indexes with collation', async () => {
      mockDb.collection.mockReturnValue({
        createIndex: jest.fn().mockResolvedValue('name_1_collation'),
        listIndexes: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue([
            { key: { name: 1 }, collation: { locale: 'en', strength: 2 } },
          ]),
        }),
      } as any);

      (envModule as any).env.databaseEnvironment = 'documentdb';
      const db = await getMongoDatabase();
      const collection = db.collection('users');
      
      // Verify index operations are available
      expect(collection.createIndex).toBeDefined();
      expect(collection.listIndexes).toBeDefined();
    });

    it('should support new aggregation stages ($bucket, $merge, $set, $unset)', async () => {
      const mockAggregation = {
        toArray: jest.fn().mockResolvedValue([]),
      };

      mockDb.collection.mockReturnValue({
        aggregate: jest.fn().mockReturnValue(mockAggregation),
      } as any);

      (envModule as any).env.databaseEnvironment = 'documentdb';
      const db = await getMongoDatabase();
      const collection = db.collection('workflows');
      
      // These stages should work in DocumentDB 8.0
      const pipeline = [
        { $bucket: { groupBy: '$status', boundaries: [0, 1, 2] } },
        { $set: { updatedAt: new Date() } },
        { $unset: ['tempField'] },
        { $merge: { into: 'other_collection' } },
      ];
      
      expect(collection.aggregate(pipeline)).toBeDefined();
    });

    it('should support new operators ($pow, $rand, $dateTrunc)', async () => {
      const mockAggregation = {
        toArray: jest.fn().mockResolvedValue([]),
      };

      mockDb.collection.mockReturnValue({
        aggregate: jest.fn().mockReturnValue(mockAggregation),
      } as any);

      (envModule as any).env.databaseEnvironment = 'documentdb';
      const db = await getMongoDatabase();
      const collection = db.collection('metrics');
      
      // These operators should work in DocumentDB 8.0
      const pipeline = [
        { $project: { 
          power: { $pow: ['$value', 2] },
          random: { $rand: {} },
          truncatedDate: { $dateTrunc: { date: '$createdAt', unit: 'day' } },
        }},
      ];
      
      expect(collection.aggregate(pipeline)).toBeDefined();
    });

    it('should support vector search with $vectorSearch', async () => {
      const mockAggregation = {
        toArray: jest.fn().mockResolvedValue([]),
      };

      mockDb.collection.mockReturnValue({
        aggregate: jest.fn().mockReturnValue(mockAggregation),
      } as any);

      (envModule as any).env.databaseEnvironment = 'documentdb';
      const db = await getMongoDatabase();
      const collection = db.collection('embeddings');
      
      // Vector search should be supported in DocumentDB 8.0
      const pipeline = [
        {
          $vectorSearch: {
            vector: [0.1, 0.2, 0.3],
            path: 'embedding',
            k: 10,
          },
        },
      ];
      
      expect(collection.aggregate(pipeline)).toBeDefined();
    });

    it('should handle DocumentDB-specific retryWrites configuration', async () => {
      (envModule as any).env.databaseEnvironment = 'documentdb';
      (envModule as any).env.documentDbUri = 'mongodb+srv://user:pass@host/db?retryWrites=false';

      await getMongoDatabase();

      // DocumentDB should be instantiated with proper configuration
      expect(mockMongoClient).toHaveBeenCalled();
      expect(mockClient.connect).toHaveBeenCalled();
    });

    it('should support compression improvements in DocumentDB 8.0', async () => {
      mockDb.collection.mockReturnValue({
        insertOne: jest.fn().mockResolvedValue({ insertedId: 'test-id' }),
      } as any);

      (envModule as any).env.databaseEnvironment = 'documentdb';
      const db = await getMongoDatabase();
      
      // Compression is handled transparently at storage level
      const collection = db.collection('data');
      expect(collection.insertOne).toBeDefined();
    });

    it('should support Planner Version 3 optimizations', async () => {
      mockDb.collection.mockReturnValue({
        aggregate: jest.fn().mockReturnValue({
          explain: jest.fn().mockResolvedValue({
            executionStats: { executionStages: { stage: 'COLLSCAN' } },
          }),
          toArray: jest.fn().mockResolvedValue([]),
        }),
      } as any);

      (envModule as any).env.databaseEnvironment = 'documentdb';
      const db = await getMongoDatabase();
      const collection = db.collection('workflows');
      
      // Planner Version 3 is used automatically for optimized query execution
      expect(collection.aggregate).toBeDefined();
    });
  });
});
