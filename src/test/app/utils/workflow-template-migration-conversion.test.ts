// src/test/app/utils/workflow-template-migration-conversion.test.ts
import { workflowDefinitionToJSON } from '@/app/utils/workflow-template-migration';
import { WorkflowDefinition } from '@/app/types/workflow-template-v2';
import { WorkflowStep } from '@/app/types/workflow';

describe('workflowDefinitionToJSON', () => {
  it('should convert WorkflowDefinition to WorkflowJSON format', () => {
    const definition: WorkflowDefinition = {
      steps: [
        { id: 'step1', name: 'Step 1', type: 'trigger', action: 'start' },
        { id: 'step2', name: 'Step 2', type: 'action', action: 'process' }
      ]
    };

    const result = workflowDefinitionToJSON(definition);

    expect(result).toHaveProperty('schemaVersion', '1.0.0');
    expect(result).toHaveProperty('metadata');
    expect(result.metadata).toHaveProperty('id');
    expect(result.metadata).toHaveProperty('name');
    expect(result.metadata).toHaveProperty('version', '1.0.0');
    expect(result.metadata).toHaveProperty('status', 'draft');
    expect(result.steps).toEqual(definition.steps);
  });

  it('should preserve all steps from WorkflowDefinition', () => {
    const definition: WorkflowDefinition = {
      steps: [
        { id: 'step1', name: 'Step 1', type: 'trigger', action: 'start' },
        { id: 'step2', name: 'Step 2', type: 'condition', condition: { all: [] } },
        { id: 'step3', name: 'Step 3', type: 'action', action: 'process' },
        { id: 'step4', name: 'Step 4', type: 'end', result: 'success' }
      ]
    };

    const result = workflowDefinitionToJSON(definition);

    expect(result.steps).toHaveLength(4);
    const steps = result.steps as WorkflowStep[];
    expect(steps[0].id).toBe('step1');
    expect(steps[1].id).toBe('step2');
    expect(steps[2].id).toBe('step3');
    expect(steps[3].id).toBe('step4');
  });

  it('should create valid WorkflowJSON structure', () => {
    const definition: WorkflowDefinition = {
      steps: [{ id: 'test', name: 'Test', type: 'trigger', action: 'test' }]
    };

    const result = workflowDefinitionToJSON(definition);

    // Check all required WorkflowJSON properties
    expect(result).toMatchObject({
      schemaVersion: expect.any(String),
      metadata: {
        id: expect.any(String),
        name: expect.any(String),
        version: expect.any(String),
        status: expect.stringMatching(/draft|published/),
        tags: expect.any(Array)
      },
      steps: expect.any(Array)
    });
  });

  it('should handle empty steps array', () => {
    const definition: WorkflowDefinition = {
      steps: []
    };

    const result = workflowDefinitionToJSON(definition);

    expect(result.steps).toEqual([]);
    expect(result.metadata).toBeDefined();
  });

  it('should handle nested steps with children', () => {
    const definition: WorkflowDefinition = {
      steps: [
        {
          id: 'parent',
          name: 'Parent Step',
          type: 'trigger',
          action: 'start',
          children: [
            { id: 'child1', name: 'Child 1', type: 'action', action: 'process' },
            { id: 'child2', name: 'Child 2', type: 'action', action: 'validate' }
          ]
        }
      ]
    };

    const result = workflowDefinitionToJSON(definition);

    expect(result.steps).toHaveLength(1);
    const steps = result.steps as WorkflowStep[];
    expect(steps[0].children).toHaveLength(2);
    expect(steps[0].children![0].id).toBe('child1');
    expect(steps[0].children![1].id).toBe('child2');
  });
});
