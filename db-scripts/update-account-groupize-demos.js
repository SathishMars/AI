#!/usr/bin/env node

/**
 * Update Test Data with Groupize Demos Account
 * Updates existing test templates to use "groupize-demos" account
 */

const { MongoClient } = require('mongodb');

async function updateTestData() {
  const client = new MongoClient('mongodb://groupize_app:gr0up!zeapP@localhost:27017/groupize-workflows', {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 10000,
  });

  try {
    console.log('Connecting to MongoDB...');
    await client.connect();
    
    const db = client.db('groupize-workflows');
    const collection = db.collection('workflow-templates');
    
    // Update all templates to use groupize-demos account
    const updateResult = await collection.updateMany(
      { account: 'default-account' },
      { $set: { account: 'groupize-demos' } }
    );
    
    console.log(`✅ Updated ${updateResult.modifiedCount} templates to use groupize-demos account`);
    
    // List all templates to verify
    const templates = await collection.find({ account: 'groupize-demos' }).toArray();
    
    console.log('\n📋 Current templates in groupize-demos account:');
    templates.forEach(template => {
      console.log(`  • ${template.name} (${template.status}) - ${template.workflowDefinition.metadata.name}`);
    });
    
    console.log('\n🎉 Account migration complete!');
    
  } catch (error) {
    console.error('❌ Failed to update test data:', error.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

if (require.main === module) {
  updateTestData();
}

module.exports = { updateTestData };