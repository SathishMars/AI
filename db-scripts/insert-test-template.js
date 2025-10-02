// db-scripts/insert-test-template.js
/**
 * Script to insert a test workflow template for integration testing
 * Run this with: node db-scripts/insert-test-template.js
 */

const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DATABASE_NAME = process.env.DATABASE_NAME || 'groupize-workflows';

async function insertTestTemplate() {
  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(DATABASE_NAME);
    const collection = db.collection('workflowTemplates');
    
    const testTemplate = {
      account: 'default-account',
      name: 'event-approval-workflow',
      status: 'draft',
      version: '1.0.0',
      workflowDefinition: {
        schemaVersion: '1.0',
        metadata: {
          id: 'event-approval-001',
          name: 'Event Approval Workflow',
          description: 'Sample workflow for event approval process',
          version: '1.0.0',
          status: 'draft',
          tags: ['events', 'approval', 'test']
        },
        steps: {
          start: {
            name: 'MRF Submitted',
            type: 'trigger',
            action: 'onMRFSubmit',
            params: { mrfID: 'dynamic' },
            nextSteps: ['checkApprovalNeeded']
          },
          checkApprovalNeeded: {
            name: 'Check Approval Requirements',
            type: 'condition',
            condition: {
              any: [
                {
                  fact: 'mrf.purpose',
                  operator: 'equal',
                  value: 'external'
                },
                {
                  fact: 'mrf.maxAttendees',
                  operator: 'greaterThan',
                  value: 100
                }
              ]
            },
            onSuccess: 'requestManagerApproval',
            onFailure: 'proceedDirectly'
          },
          requestManagerApproval: {
            name: 'Request Manager Approval',
            type: 'action',
            action: 'functions.requestApproval',
            params: {
              to: 'user.manager',
              subject: 'Event Approval Required',
              data: 'mrf'
            },
            onSuccess: 'proceedDirectly',
            onFailure: 'terminateWithFailure'
          },
          proceedDirectly: {
            name: 'Proceed Without Approval',
            type: 'action',
            action: 'functions.proceedDirectly',
            params: { reason: 'No approval required' },
            nextSteps: ['createEvent']
          },
          createEvent: {
            name: 'Create Event',
            type: 'action',
            action: 'functions.createEvent',
            params: { mrfID: 'dynamic' },
            nextSteps: ['end']
          },
          terminateWithFailure: {
            name: 'Terminate with Failure',
            type: 'action',
            action: 'functions.sendFailureNotification',
            params: { reason: 'Approval denied' },
            nextSteps: ['end']
          },
          end: {
            name: 'Workflow Complete',
            type: 'end',
            result: 'success'
          }
        }
      },
      mermaidDiagram: `graph TD
    A[MRF Submitted] --> B{Check Approval Requirements}
    B -->|Needs Approval| C[Request Manager Approval]
    B -->|No Approval Needed| D[Proceed Directly]
    C -->|Approved| D
    C -->|Denied| E[Terminate with Failure]
    D --> F[Create Event]
    F --> G[End]
    E --> G`,
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        author: 'test-user'
      }
    };
    
    // Check if template already exists
    const existing = await collection.findOne({
      account: testTemplate.account,
      name: testTemplate.name,
      version: testTemplate.version
    });
    
    if (existing) {
      console.log('Test template already exists, updating...');
      await collection.replaceOne(
        { _id: existing._id },
        testTemplate
      );
      console.log('Test template updated successfully');
    } else {
      console.log('Inserting new test template...');
      const result = await collection.insertOne(testTemplate);
      console.log('Test template inserted with ID:', result.insertedId);
    }
    
    // Also insert a published version
    const publishedTemplate = {
      ...testTemplate,
      status: 'published',
      version: '1.0.1',
      metadata: {
        ...testTemplate.metadata,
        updatedAt: new Date()
      }
    };
    
    const existingPublished = await collection.findOne({
      account: publishedTemplate.account,
      name: publishedTemplate.name,
      version: publishedTemplate.version
    });
    
    if (!existingPublished) {
      const publishedResult = await collection.insertOne(publishedTemplate);
      console.log('Published template inserted with ID:', publishedResult.insertedId);
    } else {
      console.log('Published template already exists');
    }
    
    console.log('Test data insertion completed successfully!');
    
  } catch (error) {
    console.error('Error inserting test template:', error);
  } finally {
    await client.close();
  }
}

// Run if called directly
if (require.main === module) {
  insertTestTemplate();
}

module.exports = { insertTestTemplate };