import { MongoClient, MongoClientOptions, Db } from 'mongodb';
import { env } from '@/app/lib/env';

/**
 * MongoDB Connection Pool Utility
 * Provides validated MongoDB 8.0 connections with automatic connection pooling
 * Supports both local MongoDB 8.0+ and AWS DocumentDB 8.0 (MongoDB 8.0 compatible, released November 2025)
 * Follows the singleton pattern to ensure only one connection pool is created
 * 
 * DocumentDB 8.0 Features:
 * - Full MongoDB 8.0 API compatibility
 * - Collation support (case-insensitive operations without workarounds)
 * - New aggregation stages: $replaceWith, $merge, $set, $unset, $bucket
 * - New operators: $pow, $rand, $dateTrunc
 * - Planner Version 3 with extended performance optimizations
 */

interface MongoConnection {
  client: MongoClient;
  db: Db;
}

interface ConnectionStats {
  database: string;
  collections: number;
  dataSize: number;
  indexSize: number;
  connections: {
    current: number;
    available: number;
    totalCreated: number;
  };
  uptime: number;
}

type DatabaseEnvironment = 'local' | 'documentdb';

class MongoDBConnectionPool {
  private static instance: MongoDBConnectionPool;
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private connectionString: string;
  private databaseName: string;
  private environment: DatabaseEnvironment;
  private isConnecting: boolean = false;
  private connectionPromise: Promise<MongoConnection> | null = null;

  private constructor() {
    // Determine database environment
    this.environment = env.databaseEnvironment as DatabaseEnvironment;
    
    // Get connection string from environment
    this.connectionString = this.getConnectionString();
    
    // Extract database name from connection string
    this.databaseName = this.extractDatabaseName(this.connectionString);
  }

  /**
   * Get connection string from environment variables
   * Uses MONGODB_URI for local MongoDB and DOCUMENTDB_URI for AWS DocumentDB
   */
  private getConnectionString(): string {
    if (this.environment === 'documentdb') {
      // AWS DocumentDB connection
      if (!env.documentDbUri) {
        throw new Error('AWS DocumentDB connection requires DOCUMENTDB_URI environment variable');
      }
      
      return env.documentDbUri;
    } else {
      // Local MongoDB connection
      if (!env.mongoDbUri) {
        throw new Error('Local MongoDB connection requires MONGODB_URI environment variable');
      }
      
      return env.mongoDbUri;
    }
  }

  /**
   * Extract database name from MongoDB connection string
   * Handles both simple and complex connection strings with query parameters
   */
  private extractDatabaseName(connectionString: string): string {
    try {
      // Remove 'mongodb://' prefix
      const withoutProtocol = connectionString.replace(/^mongodb:\/\//, '');
      
      // Split by '/' to get the path portion
      const parts = withoutProtocol.split('/');
      
      if (parts.length < 2) {
        throw new Error('Invalid MongoDB connection string format');
      }
      
      // Database name is after the host:port and before query params
      const dbWithParams = parts[1];
      
      // Remove query parameters if present
      const dbName = dbWithParams.split('?')[0];
      
      if (!dbName) {
        throw new Error('Database name not found in connection string');
      }
      
      return dbName;
    } catch (error) {
      console.error('Failed to extract database name from connection string:', error);
      // Fallback to default
      return 'groupize-workflows';
    }
  }

  /**
   * Get singleton instance of the connection pool
   */
  public static getInstance(): MongoDBConnectionPool {
    if (!MongoDBConnectionPool.instance) {
      MongoDBConnectionPool.instance = new MongoDBConnectionPool();
    }
    return MongoDBConnectionPool.instance;
  }

  /**
   * Get MongoDB connection options with optimized settings
   * Handles both local MongoDB and AWS DocumentDB configurations
   */
  private getConnectionOptions(): MongoClientOptions {
    const baseOptions: MongoClientOptions = {
      // Connection pool settings
      maxPoolSize: 10, // Maximum number of connections in the pool
      minPoolSize: 2,  // Minimum number of connections to maintain
      maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
      
      // Connection timeout settings
      connectTimeoutMS: 10000, // 10 seconds
      socketTimeoutMS: 45000,  // 45 seconds
      
      // Server selection timeout
      serverSelectionTimeoutMS: 10000, // 10 seconds
      
      // Heartbeat frequency
      heartbeatFrequencyMS: 10000, // 10 seconds
      
      // Read preference
      readPreference: 'primary',
    };

    if (this.environment === 'documentdb') {
      // AWS DocumentDB specific options
      return {
        ...baseOptions,
        // DocumentDB doesn't support retryWrites
        retryWrites: false,
        // Use secondary preferred for read operations in DocumentDB
        readPreference: 'secondaryPreferred',
        tlsAllowInvalidCertificates: true, // DocumentDB uses self-signed certificates
        tlsCAFile: env.documentDBCaFilePath, // Path to CA file for DocumentDB
        // Write concern for DocumentDB
        writeConcern: { w: 'majority', j: false }, // DocumentDB doesn't support journal
        // Read concern
        readConcern: { level: 'majority' },
        // Longer timeouts for DocumentDB
        connectTimeoutMS: 30000,
        socketTimeoutMS: 60000,
        serverSelectionTimeoutMS: 30000,
      };
    } else {
      // Local MongoDB options
      return {
        ...baseOptions,
        // Retry settings for local MongoDB
        retryWrites: true,
        retryReads: true,
        // Compression
        compressors: ['zlib'],
        // Write concern
        writeConcern: { w: 'majority', j: true },
        // Read concern
        readConcern: { level: 'majority' }
      };
    }
  }

  /**
   * Establish connection to MongoDB or AWS DocumentDB
   */
  private async connect(): Promise<MongoConnection> {
    try {
      console.log(`Establishing ${this.environment === 'documentdb' ? 'AWS DocumentDB' : 'MongoDB'} connection...`);
      
      // Create new MongoClient with options
      this.client = new MongoClient(this.connectionString, this.getConnectionOptions());
      
      // Connect to MongoDB/DocumentDB
      await this.client.connect();
      
      // Get database instance
      this.db = this.client.db(this.databaseName);
      
      // Validate connection by running a ping command
      await this.db.admin().ping();
      
      console.log(`Successfully connected to ${this.environment === 'documentdb' ? 'AWS DocumentDB' : 'MongoDB'} database: ${this.databaseName}`);
      
      // Set up connection event listeners
      this.setupEventListeners();
      
      return { client: this.client, db: this.db };
      
    } catch (error) {
      console.error(`Failed to connect to ${this.environment === 'documentdb' ? 'AWS DocumentDB' : 'MongoDB'}:`, error);
      
      // Clean up on connection failure
      if (this.client) {
        try {
          await this.client.close();
        } catch (closeError) {
          console.error('Error closing failed connection:', closeError);
        }
        this.client = null;
        this.db = null;
      }
      
      throw new Error(`${this.environment === 'documentdb' ? 'AWS DocumentDB' : 'MongoDB'} connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Set up event listeners for connection monitoring
   */
  private setupEventListeners(): void {
    if (!this.client) return;

    this.client.on('serverOpening', () => {
      console.log(`${this.environment === 'documentdb' ? 'AWS DocumentDB' : 'MongoDB'} server connection opening`);
    });

    this.client.on('serverClosed', () => {
      console.log(`${this.environment === 'documentdb' ? 'AWS DocumentDB' : 'MongoDB'} server connection closed`);
    });

    this.client.on('error', (error) => {
      console.error(`${this.environment === 'documentdb' ? 'AWS DocumentDB' : 'MongoDB'} connection error:`, error);
    });

    this.client.on('timeout', () => {
      console.warn(`${this.environment === 'documentdb' ? 'AWS DocumentDB' : 'MongoDB'} connection timeout`);
    });

    // DocumentDB specific events
    if (this.environment === 'documentdb') {
      this.client.on('serverHeartbeatFailed', (event) => {
        console.warn('DocumentDB heartbeat failed:', event);
      });
    }
  }

  /**
   * Get validated MongoDB connection
   * Returns existing connection or creates new one if needed
   */
  public async getConnection(): Promise<MongoConnection> {
    // If we already have a valid connection, return it
    if (this.client && this.db) {
      try {
        // Validate connection with a quick ping
        await this.db.admin().ping();
        return { client: this.client, db: this.db };
      } catch (error) {
        console.warn('Existing connection invalid, creating new connection:', error);
        // Reset connection state
        this.client = null;
        this.db = null;
        this.connectionPromise = null;
      }
    }

    // If we're already connecting, wait for that connection
    if (this.isConnecting && this.connectionPromise) {
      return this.connectionPromise;
    }

    // Create new connection
    this.isConnecting = true;
    this.connectionPromise = this.connect().finally(() => {
      this.isConnecting = false;
    });

    return this.connectionPromise;
  }

  /**
   * Get database instance directly
   */
  public async getDatabase(): Promise<Db> {
    const connection = await this.getConnection();
    return connection.db;
  }

  /**
   * Test the database connection
   */
  public async testConnection(): Promise<boolean> {
    try {
      const { db } = await this.getConnection();
      await db.admin().ping();
      console.log('MongoDB connection test successful');
      return true;
    } catch (error) {
      console.error('MongoDB connection test failed:', error);
      return false;
    }
  }

  /**
   * Get connection status and statistics
   * Note: Some stats may not be available in AWS DocumentDB
   */
  public async getConnectionStats(): Promise<ConnectionStats> {
    try {
      const { db } = await this.getConnection();
      const stats = await db.stats();
      
      // Try to get server status (may not be available in DocumentDB)
      let serverStatus;
      try {
        serverStatus = await db.admin().serverStatus();
      } catch (error) {
        console.warn(`Server status not available in ${this.environment}:`, error instanceof Error ? error.message : 'Unknown error');
        // Provide default values for DocumentDB
        serverStatus = {
          connections: { current: 1, available: 9, totalCreated: 1 },
          uptime: 0
        };
      }
      
      return {
        database: this.databaseName,
        collections: stats.collections,
        dataSize: stats.dataSize,
        indexSize: stats.indexSize,
        connections: serverStatus.connections,
        uptime: serverStatus.uptime
      };
    } catch (error) {
      console.error('Failed to get connection stats:', error);
      throw error;
    }
  }

  /**
   * Close all connections and clean up
   */
  public async close(): Promise<void> {
    if (this.client) {
      try {
        console.log('Closing MongoDB connections...');
        await this.client.close();
        console.log('MongoDB connections closed successfully');
      } catch (error) {
        console.error('Error closing MongoDB connections:', error);
      } finally {
        this.client = null;
        this.db = null;
        this.connectionPromise = null;
        this.isConnecting = false;
      }
    }
  }
}

// Export singleton instance getter
export const getMongoConnection = async (): Promise<MongoConnection> => {
  const pool = MongoDBConnectionPool.getInstance();
  return pool.getConnection();
};

// Export database getter
export const getMongoDatabase = async (): Promise<Db> => {
  const pool = MongoDBConnectionPool.getInstance();
  return pool.getDatabase();
};

// Export connection test function
export const testMongoConnection = async (): Promise<boolean> => {
  const pool = MongoDBConnectionPool.getInstance();
  return pool.testConnection();
};

// Export connection stats function
export const getMongoConnectionStats = async (): Promise<ConnectionStats> => {
  const pool = MongoDBConnectionPool.getInstance();
  return pool.getConnectionStats();
};

// Export close function for graceful shutdown
export const closeMongoConnection = async (): Promise<void> => {
  const pool = MongoDBConnectionPool.getInstance();
  return pool.close();
};

// Types export
export type { MongoConnection, ConnectionStats };
export { MongoDBConnectionPool };