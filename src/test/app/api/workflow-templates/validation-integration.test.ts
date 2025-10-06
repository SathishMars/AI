// Phase 3 Integration Tests: API Validation Logic
import { WorkflowTemplateService } from '@/app/services/workflow-template-service';
import type { WorkflowDefinition } from '@/app/types/workflow';

describe('API Workflow Validation Integration (Phase 3)', () => {
  let service: WorkflowTemplateService;

  beforeEach(() => {
    service = new WorkflowTemplateService();
  });

  describe('Validation for POST /api/workflow-templates', () => {
    it('should accept valid nested workflow', () => {
      const workflow: WorkflowDefinition = {
        steps: [
          {
            id: 'start',
            name: 'Start',
            type: 'trigger',
            action: 'onEvent',
            params: {}
          },
          {
            id: 'end',
            name: 'End',
            type: 'end',
            action: 'terminate',
            params: {}
          }
        ]
      };

      const result = service.validateWorkflow(workflow);
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid step IDs', () => {
      const workflow: WorkflowDefinition = {
        steps: [
          {
            id: 'invalid-id',
            name: 'Invalid',
            type: 'action',
            action: 'doSomething',
            params: {}
          }
        ]
      };

      const result = service.validateWorkflow(workflow);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject duplicate IDs', () => {
      const workflow: WorkflowDefinition = {
        steps: [
          {
            id: 'duplicate',
            name: 'First',
            type: 'action',
            action: 'action1',
            params: {}
          },
          {
            id: 'duplicate',
            name: 'Second',
            type: 'action',
            action: 'action2',
            params: {}
          }
        ]
      };

      const result = service.validateWorkflow(workflow);
      expect(result.isValid).toBe(false);
    });

    it('should reject circular references', () => {
      const workflow: WorkflowDefinition = {
        steps: [
          {
            id: 'stepA',
            name: 'Step A',
            type: 'action',
            action: 'action1',
            params: {},
            onSuccessGoTo: 'stepB'
          },
          {
            id: 'stepB',
            name: 'Step B',
            type: 'action',
            action: 'action2',
            params: {},
            onSuccessGoTo: 'stepA'
          }
        ]
      };

      const result = service.validateWorkflow(workflow);
      expect(result.isValid).toBe(false);
    });
  });

  describe('Validation for PUT /api/workflow-templates/[id]', () => {
    it('should accept valid workflow update', () => {
      const workflow: WorkflowDefinition = {
        steps: [
          {
            id: 'startStep',
            name: 'Start',
            type: 'trigger',
            action: 'onEvent',
            params: {},
            children: [
              {
                id: 'updated',
                name: 'Updated Step',
                type: 'action',
                action: 'newAction',
                params: {}
              }
            ]
          },
          {
            id: 'endStep',
            name: 'End',
            type: 'end',
            action: 'terminate',
            params: {}
          }
        ]
      };

      const result = service.validateWorkflow(workflow);
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid references', () => {
      const workflow: WorkflowDefinition = {
        steps: [
          {
            id: 'stepOne',
            name: 'Step One',
            type: 'action',
            action: 'action1',
            params: {},
            onSuccessGoTo: 'nonExistent'
          }
        ]
      };

      const result = service.validateWorkflow(workflow);
      expect(result.isValid).toBe(false);
    });
  });
});
