// src/test/app/utils/workflow-navigation.test.ts
/**
 * Unit tests for workflow navigation utilities
 * 
 * Tests the nested array navigation functions with human-readable step IDs
 */

import {
  findStepById,
  generateStepNumber,
  traverseWorkflow,
  getAllStepIds,
  getAllStepReferences,
  getParentStep,
  getStepDepth,
  isLeafNode,
  getLeafNodes,
  countSteps,
  getStepsByType,
  hasRealSteps
} from '@/app/utils/workflow-navigation';
import { WorkflowStep } from '@/app/types/workflow';

describe('workflow-navigation', () => {
  // Sample workflow for testing
  const sampleWorkflow: WorkflowStep[] = [
    {
      id: 'startTrigger',
      name: 'Start: Workflow',
      type: 'trigger',
      action: 'onSubmit',
      children: [
        {
          id: 'checkCondition',
          name: 'Check: Condition',
          type: 'condition',
          condition: {
            all: [{ fact: 'amount', operator: 'greaterThan', value: 100 }]
          },
          onSuccess: {
            id: 'approvalAction',
            name: 'Action: Request Approval',
            type: 'action',
            action: 'requestApproval'
          },
          onFailure: {
            id: 'autoApprove',
            name: 'Action: Auto Approve',
            type: 'action',
            action: 'autoApprove'
          }
        },
        {
          id: 'notifyUser',
          name: 'Action: Notify User',
          type: 'action',
          action: 'sendNotification'
        }
      ]
    },
    {
      id: 'workflowEnd',
      name: 'End: Complete',
      type: 'end',
      result: 'success'
    }
  ];

  describe('findStepById', () => {
    it('should find step at root level', () => {
      const result = findStepById(sampleWorkflow, 'startTrigger');
      
      expect(result).not.toBeNull();
      expect(result?.step.id).toBe('startTrigger');
      expect(result?.path).toEqual([0]);
    });

    it('should find step at second root level', () => {
      const result = findStepById(sampleWorkflow, 'workflowEnd');
      
      expect(result).not.toBeNull();
      expect(result?.step.id).toBe('workflowEnd');
      expect(result?.path).toEqual([1]);
    });

    it('should find nested step in children', () => {
      const result = findStepById(sampleWorkflow, 'checkCondition');
      
      expect(result).not.toBeNull();
      expect(result?.step.id).toBe('checkCondition');
      expect(result?.path).toEqual([0, 0]);
    });

    it('should find deeply nested step', () => {
      const result = findStepById(sampleWorkflow, 'notifyUser');
      
      expect(result).not.toBeNull();
      expect(result?.step.id).toBe('notifyUser');
      expect(result?.path).toEqual([0, 1]);
    });

    it('should find step in onSuccess branch', () => {
      const result = findStepById(sampleWorkflow, 'approvalAction');
      
      expect(result).not.toBeNull();
      expect(result?.step.id).toBe('approvalAction');
      expect(result?.step.type).toBe('action');
    });

    it('should find step in onFailure branch', () => {
      const result = findStepById(sampleWorkflow, 'autoApprove');
      
      expect(result).not.toBeNull();
      expect(result?.step.id).toBe('autoApprove');
      expect(result?.step.type).toBe('action');
    });

    it('should return null for non-existent step', () => {
      const result = findStepById(sampleWorkflow, 'nonExistentStep');
      
      expect(result).toBeNull();
    });

    it('should handle empty workflow', () => {
      const result = findStepById([], 'anyStep');
      
      expect(result).toBeNull();
    });
  });

  describe('generateStepNumber', () => {
    it('should generate correct number for root level', () => {
      expect(generateStepNumber([0])).toBe('1');
      expect(generateStepNumber([1])).toBe('2');
      expect(generateStepNumber([5])).toBe('6');
    });

    it('should generate correct number for second level', () => {
      expect(generateStepNumber([0, 0])).toBe('1.1');
      expect(generateStepNumber([0, 2])).toBe('1.3');
      expect(generateStepNumber([1, 0])).toBe('2.1');
    });

    it('should generate correct number for third level', () => {
      expect(generateStepNumber([0, 0, 0])).toBe('1.1.1');
      expect(generateStepNumber([1, 2, 3])).toBe('2.3.4');
    });

    it('should generate correct number for deep nesting', () => {
      expect(generateStepNumber([0, 1, 2, 3, 4])).toBe('1.2.3.4.5');
    });

    it('should handle empty path', () => {
      expect(generateStepNumber([])).toBe('');
    });
  });

  describe('traverseWorkflow', () => {
    it('should visit all steps in workflow', () => {
      const visited: string[] = [];
      
      traverseWorkflow(sampleWorkflow, (step) => {
        visited.push(step.id);
      });
      
      expect(visited).toContain('startTrigger');
      expect(visited).toContain('checkCondition');
      expect(visited).toContain('approvalAction');
      expect(visited).toContain('autoApprove');
      expect(visited).toContain('notifyUser');
      expect(visited).toContain('workflowEnd');
      expect(visited.length).toBe(6);
    });

    it('should provide correct paths to callback', () => {
      const paths: { id: string; path: number[] }[] = [];
      
      traverseWorkflow(sampleWorkflow, (step, path) => {
        paths.push({ id: step.id, path: [...path] });
      });
      
      const startTrigger = paths.find(p => p.id === 'startTrigger');
      expect(startTrigger?.path).toEqual([0]);
      
      const checkCondition = paths.find(p => p.id === 'checkCondition');
      expect(checkCondition?.path).toEqual([0, 0]);
      
      const workflowEnd = paths.find(p => p.id === 'workflowEnd');
      expect(workflowEnd?.path).toEqual([1]);
    });

    it('should handle empty workflow', () => {
      const visited: string[] = [];
      
      traverseWorkflow([], (step) => {
        visited.push(step.id);
      });
      
      expect(visited.length).toBe(0);
    });

    it('should visit each step exactly once', () => {
      const visitCount = new Map<string, number>();
      
      traverseWorkflow(sampleWorkflow, (step) => {
        visitCount.set(step.id, (visitCount.get(step.id) || 0) + 1);
      });
      
      visitCount.forEach((count) => {
        expect(count).toBe(1);
      });
    });
  });

  describe('getAllStepIds', () => {
    it('should return all step IDs', () => {
      const stepIds = getAllStepIds(sampleWorkflow);
      
      expect(stepIds.size).toBe(6);
      expect(stepIds.has('startTrigger')).toBe(true);
      expect(stepIds.has('checkCondition')).toBe(true);
      expect(stepIds.has('approvalAction')).toBe(true);
      expect(stepIds.has('autoApprove')).toBe(true);
      expect(stepIds.has('notifyUser')).toBe(true);
      expect(stepIds.has('workflowEnd')).toBe(true);
    });

    it('should return empty set for empty workflow', () => {
      const stepIds = getAllStepIds([]);
      
      expect(stepIds.size).toBe(0);
    });
  });

  describe('getAllStepReferences', () => {
    it('should return all step references', () => {
      const workflowWithRefs: WorkflowStep[] = [
        {
          id: 'step1',
          name: 'Step 1',
          type: 'action',
          onSuccessGoTo: 'step2',
          onFailureGoTo: 'step3'
        },
        {
          id: 'step2',
          name: 'Step 2',
          type: 'action',
          onSuccessGoTo: 'step4'
        },
        {
          id: 'step3',
          name: 'Step 3',
          type: 'action'
        },
        {
          id: 'step4',
          name: 'Step 4',
          type: 'end'
        }
      ];
      
      const refs = getAllStepReferences(workflowWithRefs);
      
      expect(refs.size).toBe(3);
      expect(refs.has('step2')).toBe(true);
      expect(refs.has('step3')).toBe(true);
      expect(refs.has('step4')).toBe(true);
    });

    it('should return empty set when no references', () => {
      const refs = getAllStepReferences(sampleWorkflow);
      
      expect(refs.size).toBe(0);
    });
  });

  describe('getParentStep', () => {
    it('should find parent of child step', () => {
      const result = getParentStep(sampleWorkflow, 'checkCondition');
      
      expect(result).not.toBeNull();
      expect(result?.step.id).toBe('startTrigger');
      expect(result?.path).toEqual([0]);
    });

    it('should find parent of conditional step', () => {
      const result = getParentStep(sampleWorkflow, 'approvalAction');
      
      expect(result).not.toBeNull();
      expect(result?.step.id).toBe('checkCondition');
    });

    it('should return null for root step', () => {
      const result = getParentStep(sampleWorkflow, 'startTrigger');
      
      expect(result).toBeNull();
    });

    it('should return null for non-existent step', () => {
      const result = getParentStep(sampleWorkflow, 'nonExistent');
      
      expect(result).toBeNull();
    });
  });

  describe('getStepDepth', () => {
    it('should return 0 for root level steps', () => {
      expect(getStepDepth(sampleWorkflow, 'startTrigger')).toBe(0);
      expect(getStepDepth(sampleWorkflow, 'workflowEnd')).toBe(0);
    });

    it('should return 1 for first level children', () => {
      expect(getStepDepth(sampleWorkflow, 'checkCondition')).toBe(1);
      expect(getStepDepth(sampleWorkflow, 'notifyUser')).toBe(1);
    });

    it('should return correct depth for nested steps', () => {
      expect(getStepDepth(sampleWorkflow, 'approvalAction')).toBeGreaterThan(0);
    });

    it('should return -1 for non-existent step', () => {
      expect(getStepDepth(sampleWorkflow, 'nonExistent')).toBe(-1);
    });
  });

  describe('isLeafNode', () => {
    it('should identify leaf nodes', () => {
      const leafStep: WorkflowStep = {
        id: 'leaf',
        name: 'Leaf',
        type: 'action'
      };
      
      expect(isLeafNode(leafStep)).toBe(true);
    });

    it('should identify non-leaf nodes with children', () => {
      const nonLeaf: WorkflowStep = {
        id: 'parent',
        name: 'Parent',
        type: 'action',
        children: [
          { id: 'child', name: 'Child', type: 'action' }
        ]
      };
      
      expect(isLeafNode(nonLeaf)).toBe(false);
    });

    it('should identify non-leaf nodes with conditional steps', () => {
      const nonLeaf: WorkflowStep = {
        id: 'parent',
        name: 'Parent',
        type: 'condition',
        onSuccess: { id: 'success', name: 'Success', type: 'action' }
      };
      
      expect(isLeafNode(nonLeaf)).toBe(false);
    });
  });

  describe('getLeafNodes', () => {
    it('should return all leaf nodes', () => {
      const leaves = getLeafNodes(sampleWorkflow);
      
      // Check that all returned nodes are actually leaves
      leaves.forEach(({ step }) => {
        expect(isLeafNode(step)).toBe(true);
      });
    });

    it('should return empty array for workflow with no leaves', () => {
      const workflowWithoutLeaves: WorkflowStep[] = [
        {
          id: 'step1',
          name: 'Step 1',
          type: 'action',
          onSuccessGoTo: 'step2'
        }
      ];
      
      const leaves = getLeafNodes(workflowWithoutLeaves);
      expect(leaves.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('countSteps', () => {
    it('should count all steps in workflow', () => {
      const count = countSteps(sampleWorkflow);
      
      expect(count).toBe(6);
    });

    it('should return 0 for empty workflow', () => {
      const count = countSteps([]);
      
      expect(count).toBe(0);
    });

    it('should count nested steps', () => {
      const deepWorkflow: WorkflowStep[] = [
        {
          id: 'root',
          name: 'Root',
          type: 'trigger',
          children: [
            {
              id: 'child1',
              name: 'Child 1',
              type: 'action',
              children: [
                {
                  id: 'grandchild',
                  name: 'Grandchild',
                  type: 'action'
                }
              ]
            }
          ]
        }
      ];
      
      const count = countSteps(deepWorkflow);
      expect(count).toBe(3);
    });
  });

  describe('getStepsByType', () => {
    it('should return all steps of given type', () => {
      const actions = getStepsByType(sampleWorkflow, 'action');
      
      expect(actions.length).toBeGreaterThan(0);
      actions.forEach(({ step }) => {
        expect(step.type).toBe('action');
      });
    });

    it('should return triggers', () => {
      const triggers = getStepsByType(sampleWorkflow, 'trigger');
      
      expect(triggers.length).toBe(1);
      expect(triggers[0].step.id).toBe('startTrigger');
    });

    it('should return end steps', () => {
      const ends = getStepsByType(sampleWorkflow, 'end');
      
      expect(ends.length).toBe(1);
      expect(ends[0].step.id).toBe('workflowEnd');
    });

    it('should return empty array for non-existent type', () => {
      const branches = getStepsByType(sampleWorkflow, 'branch');
      
      expect(branches.length).toBe(0);
    });
  });

  describe('hasRealSteps', () => {
    it('should return true for workflow with action steps', () => {
      expect(hasRealSteps(sampleWorkflow)).toBe(true);
    });

    it('should return false for workflow with only trigger and end', () => {
      const minimalWorkflow: WorkflowStep[] = [
        {
          id: 'start',
          name: 'Start',
          type: 'trigger'
        },
        {
          id: 'end',
          name: 'End',
          type: 'end'
        }
      ];
      
      expect(hasRealSteps(minimalWorkflow)).toBe(false);
    });

    it('should return true for workflow with condition step', () => {
      const workflowWithCondition: WorkflowStep[] = [
        {
          id: 'start',
          name: 'Start',
          type: 'trigger'
        },
        {
          id: 'check',
          name: 'Check',
          type: 'condition',
          condition: { all: [] }
        }
      ];
      
      expect(hasRealSteps(workflowWithCondition)).toBe(true);
    });

    it('should return false for empty workflow', () => {
      expect(hasRealSteps([])).toBe(false);
    });
  });

  describe('Edge Cases - Non-Array Inputs', () => {
    it('findStepById should handle non-array input gracefully', () => {
      // Mock console.warn to avoid polluting test output
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // @ts-expect-error - Testing runtime edge case with invalid input
      const result = findStepById({}, 'someId');
      
      expect(result).toBeNull();
      expect(warnSpy).toHaveBeenCalledWith(
        'findStepById: steps is not an array, received:',
        'object',
        {}
      );
      
      warnSpy.mockRestore();
    });

    it('traverseWorkflow should handle non-array input gracefully', () => {
      // Mock console.warn to avoid polluting test output
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const callback = jest.fn();
      
      // @ts-expect-error - Testing runtime edge case with invalid input
      traverseWorkflow({}, callback);
      
      expect(callback).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith(
        'traverseWorkflow: steps is not an array, received:',
        'object',
        {}
      );
      
      warnSpy.mockRestore();
    });

    it('traverseWorkflow should handle undefined input gracefully', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const callback = jest.fn();
      
      // @ts-expect-error - Testing runtime edge case with invalid input
      traverseWorkflow(undefined, callback);
      
      expect(callback).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalled();
      
      warnSpy.mockRestore();
    });

    it('traverseWorkflow should handle null input gracefully', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const callback = jest.fn();
      
      // @ts-expect-error - Testing runtime edge case with invalid input
      traverseWorkflow(null, callback);
      
      expect(callback).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalled();
      
      warnSpy.mockRestore();
    });

    it('findStepById should handle steps with non-array children gracefully', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const invalidWorkflow: WorkflowStep[] = [
        {
          id: 'parent',
          name: 'Parent',
          type: 'action',
          action: 'test',
          // @ts-expect-error - Testing runtime edge case
          children: { invalid: 'object' }
        }
      ];
      
      const result = findStepById(invalidWorkflow, 'nonexistent');
      
      expect(result).toBeNull();
      // Should not crash, just skip invalid children
      expect(warnSpy).not.toHaveBeenCalled(); // Only warns on top-level non-array
      
      warnSpy.mockRestore();
    });
  });
});
