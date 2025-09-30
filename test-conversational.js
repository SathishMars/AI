// Quick test script for conversational parameter collection
async function testConversationalWorkflow() {
  console.log('🧪 Testing conversational parameter collection...');
  
  try {
    const response = await fetch('http://localhost:3001/api/generate-workflow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userInput: 'Create a workflow for when a new event request is submitted through MRF forms',
        context: {
          user: {
            id: 'user123',
            name: 'Test User',
            email: 'test@example.com',
            role: 'Event Coordinator',
            department: 'Events'
          },
          mrf: {
            id: 'mrf456',
            title: 'Test Event',
            purpose: 'internal',
            maxAttendees: 50,
            startDate: '2025-10-15',
            endDate: '2025-10-15',
            location: 'Conference Room',
            budget: 10000
          },
          availableFunctions: [
            'functions.requestApproval',
            'functions.sendEmail',
            'functions.createEvent',
            'onMRFSubmit'
          ]
        },
        stream: false // Non-streaming for easier testing
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('📊 API Response:', JSON.stringify(result, null, 2));
    
    // Check for conversational response
    if (result.conversationalResponse) {
      console.log('✅ Conversational response found:', result.conversationalResponse);
    }
    
    if (result.followUpQuestions) {
      console.log('✅ Follow-up questions found:', result.followUpQuestions);
    }
    
    if (result.parameterCollectionNeeded) {
      console.log('✅ Parameter collection needed:', result.parameterCollectionNeeded);
    }
    
    if (result.workflow?.steps) {
      console.log('📋 Workflow steps:', Object.keys(result.workflow.steps));
      
      // Check for empty params in steps
      Object.entries(result.workflow.steps).forEach(([stepId, step]) => {
        if (step.type === 'trigger' || step.type === 'action') {
          const hasEmptyParams = !step.params || Object.keys(step.params).length === 0;
          console.log(`  Step ${stepId} (${step.name}): ${hasEmptyParams ? 'NEEDS PARAMS' : 'has params'}`);
        }
      });
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testConversationalWorkflow();