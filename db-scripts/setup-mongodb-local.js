#!/usr/bin/env node

/**
 * MongoDB Setup Script - Authentication-Free Local Development
 * Creates database and collections for Groupize Workflows without authentication
 */

const { MongoClient } = require('mongodb');

async function setupMongoDBLocal() {
  const client = new MongoClient('mongodb://localhost:27017', {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 10000,
  });

  try {
    console.log('Connecting to MongoDB without authentication...');
    await client.connect();
    
    const db = client.db('groupize-workflows');
    
    console.log('Setting up collections...');
    
    // Create workflow-templates collection if it doesn't exist
    const collections = await db.listCollections().toArray();
    const workflowTemplatesExists = collections.some(c => c.name === 'workflow-templates');
    
    if (!workflowTemplatesExists) {
      await db.createCollection('workflow-templates');
      console.log('✅ Created workflow-templates collection');
    } else {
      console.log('✅ workflow-templates collection already exists');
    }
    
    // Create indexes for better performance
    await db.collection('workflow-templates').createIndex({ 
      accountId: 1, 
      templateName: 1 
    }, { unique: true });
    
    await db.collection('workflow-templates').createIndex({ 
      accountId: 1, 
      status: 1 
    });
    
    console.log('✅ Created database indexes');
    
    console.log('\n🎉 MongoDB setup complete!');
    console.log('Database: groupize-workflows');
    console.log('Connection: mongodb://localhost:27017');
    
  } catch (error) {
    console.error('❌ Failed to set up MongoDB:', error.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

if (require.main === module) {
  setupMongoDBLocal();
}

module.exports = { setupMongoDBLocal };