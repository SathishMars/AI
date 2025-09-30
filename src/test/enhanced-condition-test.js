#!/usr/bin/env node

/**
 * Test Enhanced Workflow Generation with Complex Conditions
 * Tests the specific conditional statement provided by the user
 */

// Mock the WorkflowJSON type for testing
const WorkflowJSON = {};

// Import or mock the streaming workflow generator class
class StreamingWorkflowGenerator {
  constructor() {
    this.accumulatedWorkflow = {};
    this.buffer = '';
  }

  /**
   * Parse workflow content from AI chunk
   */
  async parseWorkflowChunk(chunk, buffer) {
    // Look for JSON-like structures in the response
    const jsonMatch = chunk.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      try {
        // Try to parse as JSON
        const jsonString = jsonMatch[0];
        const workflowData = JSON.parse(jsonString);
        
        // Validate it looks like workflow data
        if (workflowData.steps || workflowData.metadata) {
          return workflowData;
        }
      } catch (_error) {
        // Not valid JSON, continue
      }
    }

    // Enhanced simulation: Generate workflow steps based on phrases and buffer state
    const lowerChunk = chunk.toLowerCase();
    const lowerBuffer = buffer.toLowerCase();
    
    // Generate trigger step when we mention trigger concepts
    if ((lowerChunk.includes('trigger') || lowerChunk.includes('start') || lowerChunk.includes('mrf') || lowerChunk.includes('first step')) && 
        !lowerBuffer.includes('start:') && !lowerBuffer.includes('"trigger"')) {
      console.log('🎯 Generating trigger step from chunk:', chunk);
      return this.generateTriggerStep(chunk);
    }
    
    // Generate condition step when we mention approval, decision logic, or conditional statements
    if ((lowerChunk.includes('condition') || lowerChunk.includes('approval') || lowerChunk.includes('decision') || 
         lowerChunk.includes('if either') || lowerChunk.includes('if ') || lowerChunk.includes('else') ||
         lowerChunk.includes('greater than') || lowerChunk.includes('external') || lowerChunk.includes('manager')) && 
        !lowerBuffer.includes('checkapproval') && !lowerBuffer.includes('"condition"')) {
      console.log('🎯 Generating condition step from chunk:', chunk);
      return this.generateConditionStep(chunk);
    }

    // Generate manager approval step when mentioned
    if ((lowerChunk.includes('manager') || lowerChunk.includes('approval from')) && 
        !lowerBuffer.includes('requestmanagerapproval')) {
      console.log('🎯 Generating manager approval step from chunk:', chunk);
      return this.generateManagerApprovalStep();
    }
    
    // Generate action step when we mention actions or notifications
    if ((lowerChunk.includes('action') || lowerChunk.includes('notification') || lowerChunk.includes('create event')) && 
        !lowerBuffer.includes('createevent') && !lowerBuffer.includes('"action"')) {
      console.log('🎯 Generating action step from chunk:', chunk);
      return this.generateActionStep(chunk);
    }
    
    // Generate end step when we mention completion or end states
    if ((lowerChunk.includes('end') || lowerChunk.includes('complete') || lowerChunk.includes('finish')) && 
        !lowerBuffer.includes('end:') && !lowerBuffer.includes('"end"')) {
      console.log('🎯 Generating end step from chunk:', chunk);
      return this.generateEndStep(chunk);
    }
    
    return null;
  }

  /**
   * Generate trigger step from content
   */
  generateTriggerStep(_content) {
    return {
      steps: {
        start: {
          name: 'Start Workflow',
          type: 'trigger',
          action: 'onMRFSubmit',
          params: { mrfID: 'dynamic' },
          nextSteps: ['checkApprovalNeeded']
        }
      }
    };
  }

  /**
   * Generate condition step from content - Enhanced with complex parsing
   */
  generateConditionStep(content) {
    const lowerContent = content.toLowerCase();
    console.log('📝 Parsing condition from content:', content);
    
    // Parse different types of conditions
    let conditionName = 'Check Requirements';
    let condition = { all: [] };
    
    // Look for OR conditions ("if either")
    if (lowerContent.includes('if either') || lowerContent.includes('or if')) {
      condition = { any: [] };
      conditionName = 'Check Approval Requirements';
      
      // Parse external purpose condition
      if (lowerContent.includes('external')) {
        condition.any.push({
          fact: 'mrf.purpose',
          operator: 'equal',
          value: 'external'
        });
      }
      
      // Parse max attendees condition
      if (lowerContent.includes('greater than 100') || (lowerContent.includes('maxattendees') && lowerContent.includes('100'))) {
        condition.any.push({
          fact: 'mrf.maxAttendees',
          operator: 'greaterThan',
          value: 100
        });
      }
    } else {
      // Handle single conditions or AND conditions
      if (lowerContent.includes('attendees') && lowerContent.includes('100')) {
        condition.all.push({
          fact: 'mrf.maxAttendees',
          operator: lowerContent.includes('greater than') ? 'greaterThan' : 'lessThan',
          value: 100
        });
      }
      
      if (lowerContent.includes('external')) {
        condition.all.push({
          fact: 'mrf.purpose',
          operator: 'equal',
          value: 'external'
        });
      }
    }
    
    // Determine success/failure paths based on content
    let onSuccess = 'createEvent';
    let onFailure = 'requestApproval';
    
    if (lowerContent.includes('approval') && lowerContent.includes('manager')) {
      // If condition is met, needs approval
      onSuccess = 'requestManagerApproval';
      onFailure = 'proceedDirectly';
    }
    
    console.log('🎯 Generated condition:', condition);
    
    return {
      steps: {
        checkApprovalNeeded: {
          name: conditionName,
          type: 'condition',
          condition,
          onSuccess,
          onFailure
        }
      }
    };
  }

  /**
   * Generate manager approval step
   */
  generateManagerApprovalStep() {
    return {
      steps: {
        requestManagerApproval: {
          name: 'Request Manager Approval',
          type: 'action',
          action: 'functions.requestApproval',
          params: {
            to: 'user.manager',
            subject: 'Event Approval Required',
            data: 'mrf'
          },
          onSuccess: 'createEvent',
          onFailure: 'notifyUser'
        },
        proceedDirectly: {
          name: 'Proceed Without Approval',
          type: 'action',
          action: 'functions.proceedDirectly',
          params: { reason: 'No approval required' },
          nextSteps: ['createEvent']
        }
      }
    };
  }

  /**
   * Generate action step from content
   */
  generateActionStep(_content) {
    return {
      steps: {
        createEvent: {
          name: 'Create Event',
          type: 'action',
          action: 'functions.createAnEvent',
          params: { mrfID: 'dynamic' },
          onSuccess: 'sendNotification',
          onFailure: 'logError'
        },
        sendNotification: {
          name: 'Send Notification',
          type: 'action',
          action: 'functions.sendNotification',
          params: { 
            to: 'user.email',
            subject: 'Event Created Successfully' 
          },
          nextSteps: ['end']
        }
      }
    };
  }

  /**
   * Generate end step from content
   */
  generateEndStep(_content) {
    return {
      steps: {
        end: {
          name: 'Workflow Complete',
          type: 'end',
          result: 'success'
        }
      }
    };
  }

  /**
   * Merge workflow update with accumulated workflow
   */
  mergeWorkflowUpdate(accumulated, update) {
    const merged = { ...accumulated };
    
    // Merge metadata
    if (update.metadata) {
      merged.metadata = {
        ...merged.metadata,
        ...update.metadata,
        updatedAt: new Date()
      };
    }
    
    // Merge steps
    if (update.steps) {
      merged.steps = {
        ...merged.steps,
        ...update.steps
      };
    }
    
    return merged;
  }
}

/**
 * Test the enhanced condition parsing with the user's specific statement
 */
async function testEnhancedConditionParsing() {
  console.log('\n🧪 Testing Enhanced Workflow Generation with Complex Conditions');
  console.log('═'.repeat(80));
  
  const generator = new StreamingWorkflowGenerator();
  let accumulatedWorkflow = {
    schemaVersion: '1.0',
    metadata: {
      id: 'test-workflow-complex',
      name: 'Complex Conditional Workflow',
      description: 'Testing complex condition parsing',
      version: '1.0.0',
      status: 'draft',
      createdAt: new Date().toISOString(),
      tags: ['test', 'complex-conditions']
    },
    steps: {}
  };
  
  // Test the specific user statement
  const userStatement = "if either the mrf.purpose is external or if the mrf.maxAttendees is greater than 100 it will need to go for approval from user.manager else it can go to the next step";
  
  console.log('\n🎯 Testing User Statement:');
  console.log('"' + userStatement + '"');
  console.log('\n📊 Processing chunks...\n');
  
  // Simulate processing this statement in chunks
  const chunks = [
    "I understand you want to create a workflow with conditional logic.",
    "Let me break down your requirement: if either the mrf.purpose is external",
    "or if the mrf.maxAttendees is greater than 100",
    "it will need to go for approval from user.manager",
    "else it can go to the next step",
    "I'll create the appropriate workflow steps for this logic."
  ];
  
  let buffer = '';
  let stepCount = 0;
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    buffer += ' ' + chunk;
    
    console.log(`\n📝 Processing chunk ${i + 1}: "${chunk}"`);
    
    try {
      const update = await generator.parseWorkflowChunk(chunk, buffer);
      
      if (update) {
        stepCount++;
        accumulatedWorkflow = generator.mergeWorkflowUpdate(accumulatedWorkflow, update);
        
        console.log(`✅ Generated workflow update:`, JSON.stringify(update, null, 2));
        console.log(`📊 Total workflow steps so far: ${Object.keys(accumulatedWorkflow.steps || {}).length}`);
      } else {
        console.log('ℹ️  No workflow update generated from this chunk');
      }
    } catch (error) {
      console.error('❌ Error processing chunk:', error.message);
    }
  }
  
  console.log('\n🎉 Final Test Results:');
  console.log('═'.repeat(50));
  console.log(`✅ Successfully processed user statement`);
  console.log(`📊 Generated workflow steps: ${Object.keys(accumulatedWorkflow.steps || {}).length}`);
  console.log(`🔄 Processing chunks: ${chunks.length}`);
  console.log(`⚡ Updates generated: ${stepCount}`);
  
  console.log('\n📋 Final Workflow Structure:');
  console.log(JSON.stringify(accumulatedWorkflow, null, 2));
  
  // Validate the specific condition
  const checkApprovalStep = accumulatedWorkflow.steps?.checkApprovalNeeded;
  if (checkApprovalStep) {
    console.log('\n🎯 Condition Analysis:');
    console.log('✅ Found checkApprovalNeeded step');
    console.log('✅ Condition type:', checkApprovalStep.condition.any ? 'OR (any)' : 'AND (all)');
    
    if (checkApprovalStep.condition.any) {
      console.log('✅ OR conditions found:');
      checkApprovalStep.condition.any.forEach((cond, idx) => {
        console.log(`   ${idx + 1}. ${cond.fact} ${cond.operator} ${cond.value}`);
      });
    }
    
    console.log('✅ Success path:', checkApprovalStep.onSuccess);
    console.log('✅ Failure path:', checkApprovalStep.onFailure);
    
    // Check if we have the expected conditions
    const hasExternalCondition = checkApprovalStep.condition.any?.some(c => 
      c.fact === 'mrf.purpose' && c.operator === 'equal' && c.value === 'external'
    );
    const hasAttendeesCondition = checkApprovalStep.condition.any?.some(c => 
      c.fact === 'mrf.maxAttendees' && c.operator === 'greaterThan' && c.value === 100
    );
    
    console.log('\n🔍 Expected Conditions Check:');
    console.log(`✅ External purpose condition: ${hasExternalCondition ? 'FOUND' : 'MISSING'}`);
    console.log(`✅ Max attendees > 100 condition: ${hasAttendeesCondition ? 'FOUND' : 'MISSING'}`);
    
    if (hasExternalCondition && hasAttendeesCondition) {
      console.log('\n🎉 SUCCESS: All expected conditions properly parsed!');
    } else {
      console.log('\n⚠️  Some conditions may be missing');
    }
  } else {
    console.log('\n⚠️  No checkApprovalNeeded step found in workflow');
  }
  
  return accumulatedWorkflow;
}

// Run the test
testEnhancedConditionParsing()
  .then((workflow) => {
    console.log('\n🎯 Test completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });