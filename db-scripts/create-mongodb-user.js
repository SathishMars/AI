#!/usr/bin/env node

/**
 * MongoDB User Setup Script
 * Creates the required user for Groupize Workflows with proper permissions
 */

const { MongoClient } = require('mongodb');

async function createMongoDBUser() {
  // Connect as admin (no auth required for local dev setup)
  const client = new MongoClient('mongodb://localhost:27017', {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 10000,
  });

  try {
    console.log('Connecting to MongoDB to create user...');
    await client.connect();
    
    const adminDb = client.db('admin');
    const groupizeDb = client.db('groupize-workflows');
    
    // Create user with proper permissions
    const createUserCommand = {
      createUser: 'groupize_app',
      pwd: 'gr0up!zeapP',
      roles: [
        {
          role: 'readWrite',
          db: 'groupize-workflows'
        }
      ]
    };
    
    try {
      await groupizeDb.command(createUserCommand);
      console.log('✅ Created user: groupize_app');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('✅ User groupize_app already exists');
      } else {
        throw error;
      }
    }
    
    // Test the connection with the new user
    console.log('\nTesting connection with credentials...');
    const testClient = new MongoClient('mongodb://groupize_app:gr0up!zeapP@localhost:27017/groupize-workflows', {
      serverSelectionTimeoutMS: 5000
    });
    
    await testClient.connect();
    const testDb = testClient.db('groupize-workflows');
    
    // Try to list collections to verify permissions
    const collections = await testDb.listCollections().toArray();
    console.log(`✅ Authentication successful - Found ${collections.length} collections`);
    
    await testClient.close();
    
    console.log('\n🎉 MongoDB user setup complete!');
    console.log('User: groupize_app');
    console.log('Database: groupize-workflows');
    console.log('Permissions: readWrite');
    
  } catch (error) {
    console.error('❌ Failed to create MongoDB user:', error.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

if (require.main === module) {
  createMongoDBUser();
}

module.exports = { createMongoDBUser };