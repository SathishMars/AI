// Quick test for autocomplete functionality
const { AutocompleteManager } = require('./src/app/utils/autocomplete-providers.ts');

async function testAutocomplete() {
  const manager = new AutocompleteManager();
  const context = {
    workflowId: 'test-workflow',
    workflowName: 'Test Workflow',
    userRole: 'admin',
    userDepartment: 'IT',
    availableFunctions: [],
    conversationGoal: 'create'
  };

  try {
    // Test @ trigger
    const suggestions = await manager.getSuggestions('Hello @', 7, context);
    console.log('Found', suggestions.length, 'suggestions for @');
    console.log('Suggestions:', suggestions.map(s => s.display));
  } catch (error) {
    console.error('Error:', error);
  }
}

testAutocomplete();