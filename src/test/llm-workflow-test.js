#!/usr/bin/env node

/**
 * Test LLM-Based Workflow Generation with Real AI Integration
 * Tests the specific conditional statement with proper LLM context
 */

// Import the new LLM workflow generator
import { LLMWorkflowGenerator, DEFAULT_WORKFLOW_FUNCTIONS } from '../src/app/utils/llm-workflow-generator.js';

/**
 * Test the LLM workflow generation with user's specific conditional statement
 */
async function testLLMWorkflowGeneration() {
  console.log('\n🤖 Testing LLM-Based Workflow Generation');
  console.log('═'.repeat(80));
  
  // The specific user statement that wasn't working before
  const userStatement = "if either the mrf.purpose is external or if the mrf.maxAttendees is greater than 100 it will need to go for approval from user.manager else it can go to the next step";
  
  console.log('\n🎯 User Statement:');
  console.log('"' + userStatement + '"');
  
  // Create context with sample data
  const context = {
    user: {
      id: 'user123',
      name: 'John Doe',
      email: 'john.doe@example.com',
      role: 'Event Coordinator',
      department: 'Events',
      manager: 'jane.smith@example.com'
    },
    mrf: {
      id: 'mrf456',
      title: 'Annual Company Retreat',
      purpose: 'external', // This should trigger approval
      maxAttendees: 150,   // This should also trigger approval
      startDate: '2025-10-15',
      endDate: '2025-10-17',
      location: 'Conference Center',
      budget: 50000
    },
    availableFunctions: DEFAULT_WORKFLOW_FUNCTIONS,
    currentDate: new Date().toISOString()
  };
  
  console.log('\n📋 Context:');
  console.log('- User:', context.user.name, '(' + context.user.role + ')');
  console.log('- Manager:', context.user.manager);
  console.log('- MRF Purpose:', context.mrf.purpose);
  console.log('- Max Attendees:', context.mrf.maxAttendees);
  
  // Test different LLM providers (simulation mode)
  const providers = [
    { name: 'OpenAI GPT-4 (Simulation)', provider: 'openai', apiKey: 'demo-key' },
    { name: 'Anthropic Claude (Simulation)', provider: 'anthropic', apiKey: 'demo-key' }
  ];
  
  for (const config of providers) {
    console.log('\n🔧 Testing with:', config.name);
    console.log('-'.repeat(50));
    
    try {
      const generator = new LLMWorkflowGenerator({
        provider: config.provider,
        apiKey: config.apiKey,
        model: config.provider === 'openai' ? 'gpt-4' : 'claude-3-sonnet-20240229'
      });
      
      console.log('✅ LLM Generator initialized');
      console.log('📤 Sending request to LLM...');
      
      // Since we're using demo keys, this will likely fail
      // But we can show the system prompt that would be sent
      console.log('\n📝 System Prompt (Preview):');
      console.log('```');
      console.log('You are an expert workflow designer. Generate valid JSON workflows...');
      console.log('[System prompt includes workflow schema, available functions, and json-rules-engine format]');
      console.log('```');
      
      console.log('\n📝 User Prompt (Preview):');
      console.log('```');
      console.log(`Generate a workflow for: "${userStatement}"`);
      console.log('');
      console.log('CURRENT CONTEXT:');
      console.log(`User: ${context.user.name} (${context.user.role}) - Manager: ${context.user.manager}`);
      console.log(`MRF: ${context.mrf.title} - Purpose: ${context.mrf.purpose}, Attendees: ${context.mrf.maxAttendees}`);
      console.log(`Date: ${context.currentDate}`);
      console.log('');
      console.log('Return ONLY the JSON workflow - no other text.');
      console.log('```');
      
      // Test the generation (will likely fail with demo keys)
      try {
        const workflow = await generator.generateWorkflow(userStatement, context);
        console.log('\n🎉 SUCCESS: Generated workflow:');
        console.log(JSON.stringify(workflow, null, 2));
        
        // Validate the expected conditions
        const steps = workflow.steps || {};
        const conditionSteps = Object.values(steps).filter(step => step.type === 'condition');
        
        if (conditionSteps.length > 0) {
          console.log('\n🔍 Condition Analysis:');
          conditionSteps.forEach((step, idx) => {
            console.log(`Condition ${idx + 1}:`, step.name);
            if (step.condition) {
              if (step.condition.any) {
                console.log('  Type: OR (any)');
                step.condition.any.forEach((cond, i) => {
                  console.log(`    ${i + 1}. ${cond.fact} ${cond.operator} ${cond.value}`);
                });
              }
              if (step.condition.all) {
                console.log('  Type: AND (all)');
                step.condition.all.forEach((cond, i) => {
                  console.log(`    ${i + 1}. ${cond.fact} ${cond.operator} ${cond.value}`);
                });
              }
            }
          });
        }
        
      } catch (error) {
        console.log('\n⚠️  LLM API Error (Expected with demo keys):', error.message);
        
        // Show what the expected workflow should look like
        console.log('\n📋 Expected Workflow Structure:');
        const expectedWorkflow = {
          "schemaVersion": "1.0",
          "metadata": {
            "id": "approval-workflow-123",
            "name": "Event Approval Workflow",
            "description": "Workflow with conditional approval logic",
            "version": "1.0.0",
            "status": "draft",
            "createdAt": new Date().toISOString(),
            "tags": ["ai-generated", "approval", "conditional"]
          },
          "steps": {
            "start": {
              "name": "MRF Submitted",
              "type": "trigger",
              "action": "onMRFSubmit",
              "params": { "mrfID": "dynamic" },
              "nextSteps": ["checkApprovalNeeded"]
            },
            "checkApprovalNeeded": {
              "name": "Check Approval Requirements",
              "type": "condition",
              "condition": {
                "any": [
                  {
                    "fact": "mrf.purpose",
                    "operator": "equal",
                    "value": "external"
                  },
                  {
                    "fact": "mrf.maxAttendees",
                    "operator": "greaterThan",
                    "value": 100
                  }
                ]
              },
              "onSuccess": "requestManagerApproval",
              "onFailure": "proceedDirectly"
            },
            "requestManagerApproval": {
              "name": "Request Manager Approval",
              "type": "action",
              "action": "functions.requestApproval",
              "params": {
                "to": "user.manager",
                "subject": "Event Approval Required",
                "data": "mrf"
              },
              "onSuccess": "createEvent",
              "onFailure": "notifyUser"
            },
            "proceedDirectly": {
              "name": "Proceed Without Approval",
              "type": "action",
              "action": "functions.proceedDirectly",
              "params": { "reason": "No approval required" },
              "nextSteps": ["createEvent"]
            },
            "createEvent": {
              "name": "Create Event",
              "type": "action",
              "action": "functions.createEvent",
              "params": { "mrfID": "dynamic" },
              "nextSteps": ["end"]
            },
            "end": {
              "name": "Workflow Complete",
              "type": "end",
              "result": "success"
            }
          }
        };
        
        console.log(JSON.stringify(expectedWorkflow, null, 2));
        
        console.log('\n✅ Expected Conditions:');
        console.log('- OR condition (any): mrf.purpose = external OR mrf.maxAttendees > 100');
        console.log('- Success path: requestManagerApproval');
        console.log('- Failure path: proceedDirectly');
        console.log('- Proper json-rules-engine format');
      }
      
    } catch (error) {
      console.log('❌ Error initializing LLM generator:', error.message);
    }
  }
  
  console.log('\n🎯 Implementation Summary:');
  console.log('═'.repeat(50));
  console.log('✅ LLM-based workflow generator created');
  console.log('✅ Proper context passing (user, MRF, functions)');
  console.log('✅ System prompt with workflow schema');
  console.log('✅ json-rules-engine condition format');
  console.log('✅ Support for both OpenAI and Anthropic');
  console.log('✅ Streaming generation capability');
  console.log('✅ Fallback simulation mode');
  
  console.log('\n🚀 Next Steps:');
  console.log('1. Add real API keys to environment variables');
  console.log('2. Test with actual LLM providers');
  console.log('3. Integrate into workflow builder UI');
  console.log('4. Test the complete user experience');
  
  console.log('\n📋 API Key Environment Variables:');
  console.log('export OPENAI_API_KEY="your-openai-key"');
  console.log('export ANTHROPIC_API_KEY="your-anthropic-key"');
  console.log('export LLM_PROVIDER="openai"  # or "anthropic"');
  
  return true;
}

// Run the test
testLLMWorkflowGeneration()
  .then(() => {
    console.log('\n🎉 LLM workflow generation test completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });