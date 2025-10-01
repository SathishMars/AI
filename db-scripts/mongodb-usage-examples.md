# MongoDB Connection Pool Usage Examples

This document provides examples of how to use the MongoDB connection pool utility in your application. The connection pool supports both local MongoDB (development) and AWS DocumentDB (production) environments.

## Environment Configuration

### Local MongoDB (Development)
```bash
# .env.local
DATABASE_ENVIRONMENT=local
MONGODB_HOST=localhost
MONGODB_PORT=27017
MONGODB_USER=groupize_app
MONGODB_PASSWORD=gr0up!zeapP
MONGODB_DATABASE=groupize-workflows
```

### AWS DocumentDB (Production)
```bash
# .env.production
DATABASE_ENVIRONMENT=documentdb
DOCUMENTDB_HOST=your-cluster.cluster-xyz.us-east-1.docdb.amazonaws.com
DOCUMENTDB_PORT=27017
DOCUMENTDB_USER=your-username
DOCUMENTDB_PASSWORD=your-password
MONGODB_DATABASE=groupize-workflows
```

## Basic Usage

### Getting a Database Connection

```typescript
import { getMongoDatabase, getMongoConnection } from '@/app/utils/mongodb-connection';

// Get database instance (recommended)
async function exampleDatabaseUsage() {
  try {
    const db = await getMongoDatabase();
    
    // Use the database
    const collection = db.collection('workflowTemplates');
    const result = await collection.findOne({ name: 'example' });
    
    console.log('Found document:', result);
  } catch (error) {
    console.error('Database operation failed:', error);
  }
}

// Get full connection (if you need client access)
async function exampleConnectionUsage() {
  try {
    const { client, db } = await getMongoConnection();
    
    // Use the database
    const collection = db.collection('workflowTemplates');
    const result = await collection.insertOne({
      name: 'My Workflow',
      description: 'Example workflow template',
      steps: {},
      createdAt: new Date()
    });
    
    console.log('Inserted document with ID:', result.insertedId);
  } catch (error) {
    console.error('Database operation failed:', error);
  }
}
```

### CRUD Operations

```typescript
import { getMongoDatabase } from '@/app/utils/mongodb-connection';

// Create a workflow template
async function createWorkflowTemplate(template: any) {
  const db = await getMongoDatabase();
  const collection = db.collection('workflowTemplates');
  
  try {
    const result = await collection.insertOne({
      ...template,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    return result.insertedId;
  } catch (error) {
    if (error.code === 11000) {
      throw new Error('Workflow template with this name already exists');
    }
    throw error;
  }
}

// Read workflow templates
async function getWorkflowTemplates(filter = {}) {
  const db = await getMongoDatabase();
  const collection = db.collection('workflowTemplates');
  
  return await collection.find(filter).toArray();
}

// Update a workflow template
async function updateWorkflowTemplate(id: string, updates: any) {
  const db = await getMongoDatabase();
  const collection = db.collection('workflowTemplates');
  
  const result = await collection.updateOne(
    { _id: new ObjectId(id) },
    { 
      $set: { 
        ...updates, 
        updatedAt: new Date() 
      } 
    }
  );
  
  return result.modifiedCount > 0;
}

// Delete a workflow template
async function deleteWorkflowTemplate(id: string) {
  const db = await getMongoDatabase();
  const collection = db.collection('workflowTemplates');
  
  const result = await collection.deleteOne({ _id: new ObjectId(id) });
  return result.deletedCount > 0;
}
```

### Error Handling

```typescript
import { getMongoDatabase, testMongoConnection } from '@/app/utils/mongodb-connection';

async function robustDatabaseOperation() {
  // Test connection first
  const isConnected = await testMongoConnection();
  if (!isConnected) {
    throw new Error('Database connection failed');
  }
  
  try {
    const db = await getMongoDatabase();
    const collection = db.collection('workflowTemplates');
    
    // Your database operations here
    const result = await collection.findOne({ name: 'example' });
    
    return result;
  } catch (error) {
    console.error('Database operation failed:', error);
    
    // Handle specific MongoDB errors
    if (error.name === 'MongoNetworkError') {
      console.error('Network connection to MongoDB failed');
    } else if (error.name === 'MongoServerError') {
      console.error('MongoDB server error:', error.message);
    }
    
    throw error;
  }
}
```

### Connection Statistics and Monitoring

```typescript
import { getMongoConnectionStats } from '@/app/utils/mongodb-connection';

async function monitorDatabase() {
  try {
    const stats = await getMongoConnectionStats();
    
    console.log('Database Statistics:', {
      database: stats.database,
      collections: stats.collections,
      dataSize: `${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`,
      indexSize: `${(stats.indexSize / 1024 / 1024).toFixed(2)} MB`,
      currentConnections: stats.connections.current,
      availableConnections: stats.connections.available,
      uptime: `${Math.floor(stats.uptime / 3600)} hours`
    });
  } catch (error) {
    console.error('Failed to get database statistics:', error);
  }
}
```

### Next.js API Route Example

```typescript
// pages/api/workflow-templates.ts or app/api/workflow-templates/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getMongoDatabase } from '@/app/utils/mongodb-connection';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest) {
  try {
    const db = await getMongoDatabase();
    const collection = db.collection('workflowTemplates');
    
    const templates = await collection.find({}).toArray();
    
    return NextResponse.json({ templates });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workflow templates' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const db = await getMongoDatabase();
    const collection = db.collection('workflowTemplates');
    
    const result = await collection.insertOne({
      ...body,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    return NextResponse.json({ 
      id: result.insertedId,
      message: 'Workflow template created successfully' 
    });
  } catch (error) {
    console.error('API Error:', error);
    
    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'Workflow template with this name already exists' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create workflow template' },
      { status: 500 }
    );
  }
}
```

### Environment Configuration

Make sure to set up your environment variables in `.env.local`:

```bash
# MongoDB Connection Settings
MONGODB_HOST=localhost
MONGODB_PORT=27017
MONGODB_USER=groupize_app
MONGODB_PASSWORD=gr0up!zeapP
MONGODB_DATABASE=groupize-workflows
```

### Graceful Shutdown

```typescript
// In your main application or server setup
import { closeMongoConnection } from '@/app/utils/mongodb-connection';

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Gracefully shutting down...');
  await closeMongoConnection();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Gracefully shutting down...');
  await closeMongoConnection();
  process.exit(0);
});
```

## Best Practices

1. **Always use try-catch blocks** around database operations
2. **Test connections** before critical operations
3. **Handle MongoDB-specific errors** appropriately
4. **Use the `getMongoDatabase()` function** for most operations
5. **Set up proper environment variables** for different environments
6. **Monitor connection statistics** in production
7. **Implement graceful shutdown** for connection cleanup
8. **Use proper data validation** before database operations
9. **Implement proper logging** for database operations
10. **Handle unique constraint violations** gracefully

## Security Notes

- Use strong passwords in production
- Consider using MongoDB Atlas or other managed services
- Enable SSL/TLS for production connections
- Use environment-specific connection strings
- Store sensitive credentials in secure environment variable services
- Implement proper authentication and authorization
- Validate all input data before database operations