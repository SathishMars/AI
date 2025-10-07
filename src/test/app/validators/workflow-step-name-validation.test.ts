// src/test/app/validators/workflow-step-name-validation.test.ts
import {
  validateStepNameFormat,
  validateStepNames,
  STEP_NAME_PREFIXES,
  EMOJI_REGEX
} from '@/app/validators/workflow';
import { WorkflowJSON, WorkflowStep } from '@/app/types/workflow';

describe('Step Name Format Validation', () => {
  describe('STEP_NAME_PREFIXES constant', () => {
    it('should have correct prefixes for all step types', () => {
      expect(STEP_NAME_PREFIXES.trigger).toBe('Start:');
      expect(STEP_NAME_PREFIXES.condition).toBe('Check:');
      expect(STEP_NAME_PREFIXES.action).toBe('Action:');
      expect(STEP_NAME_PREFIXES.end).toBe('End:');
    });
  });

  describe('EMOJI_REGEX constant', () => {
    it('should detect common emojis', () => {
      expect(EMOJI_REGEX.test('🎯')).toBe(true);
      expect(EMOJI_REGEX.test('✅')).toBe(true);
      expect(EMOJI_REGEX.test('📧')).toBe(true);
      expect(EMOJI_REGEX.test('🚀')).toBe(true);
      expect(EMOJI_REGEX.test('❌')).toBe(true);
      expect(EMOJI_REGEX.test('⚠️')).toBe(true);
    });

    it('should not flag regular text', () => {
      expect(EMOJI_REGEX.test('Start: On MRF Submission')).toBe(false);
      expect(EMOJI_REGEX.test('Check: Attendees Over 100')).toBe(false);
      expect(EMOJI_REGEX.test('Action: Send Email')).toBe(false);
    });

    it('should detect emojis in mixed text', () => {
      expect(EMOJI_REGEX.test('🎯 Start: On MRF Submission')).toBe(true);
      expect(EMOJI_REGEX.test('Start: On MRF Submission 🎯')).toBe(true);
      expect(EMOJI_REGEX.test('Check: 🎯 Attendees Over 100')).toBe(true);
    });
  });

  describe('validateStepNameFormat', () => {
    describe('trigger steps', () => {
      it('should accept valid trigger step names', () => {
        const result = validateStepNameFormat('Start: On MRF Submission', 'trigger');
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should accept trigger steps with detailed descriptions', () => {
        const result = validateStepNameFormat('Start: Daily at 9 AM', 'trigger');
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject trigger steps without Start: prefix', () => {
        const result = validateStepNameFormat('On MRF Submission', 'trigger');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Step name must start with "Start:"');
      });

      it('should reject trigger steps with emojis', () => {
        const result = validateStepNameFormat('🎯 Start: On MRF Submission', 'trigger');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Step names must not contain emojis');
      });

      it('should reject trigger steps with wrong prefix', () => {
        const result = validateStepNameFormat('Action: On MRF Submission', 'trigger');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Step name must start with "Start:"');
      });
    });

    describe('condition steps', () => {
      it('should accept valid condition step names', () => {
        const result = validateStepNameFormat('Check: Attendees Over 100', 'condition');
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should accept condition steps with complex logic descriptions', () => {
        const result = validateStepNameFormat('Check: Budget Exceeds $10,000 Threshold', 'condition');
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject condition steps without Check: prefix', () => {
        const result = validateStepNameFormat('Attendees Over 100', 'condition');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Step name must start with "Check:"');
      });

      it('should reject condition steps with emojis', () => {
        const result = validateStepNameFormat('✅ Check: Attendees Over 100', 'condition');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Step names must not contain emojis');
      });
    });

    describe('action steps', () => {
      it('should accept valid action step names', () => {
        const result = validateStepNameFormat('Action: Request Manager Approval', 'action');
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should accept action steps with detailed descriptions', () => {
        const result = validateStepNameFormat('Action: Send Confirmation Email to Attendees', 'action');
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject action steps without Action: prefix', () => {
        const result = validateStepNameFormat('Send Email', 'action');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Step name must start with "Action:"');
      });

      it('should reject action steps with emojis', () => {
        const result = validateStepNameFormat('📧 Action: Send Email', 'action');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Step names must not contain emojis');
      });
    });

    describe('end steps', () => {
      it('should accept valid end step names', () => {
        const result = validateStepNameFormat('End: Workflow Complete', 'end');
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should accept end steps with outcome descriptions', () => {
        const result = validateStepNameFormat('End: Request Approved and Event Created', 'end');
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject end steps without End: prefix', () => {
        const result = validateStepNameFormat('Workflow Complete', 'end');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Step name must start with "End:"');
      });

      it('should reject end steps with emojis', () => {
        const result = validateStepNameFormat('✅ End: Workflow Complete', 'end');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Step names must not contain emojis');
      });
    });

    describe('unknown step types', () => {
      it('should pass validation for unknown step types', () => {
        const result = validateStepNameFormat('Any Name Here', 'unknown');
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('multiple violations', () => {
      it('should report both missing prefix and emoji violations', () => {
        const result = validateStepNameFormat('🎯 Send Email', 'action');
        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(2);
        expect(result.errors).toContain('Step name must start with "Action:"');
        expect(result.errors).toContain('Step names must not contain emojis');
      });
    });
  });

  describe('validateStepNames - nested array structure', () => {
    it('should validate all steps in nested array workflow', () => {
      const workflow: WorkflowJSON = {
        schemaVersion: '1.0.0',
        metadata: {
          id: 'test-workflow-1',
          name: 'Test Workflow',
          version: '1.0.0',
          status: 'draft',
          tags: []
        },
        steps: [
          {
            id: 'step1',
            name: 'Start: On MRF Submission',
            type: 'trigger',
            action: 'onMRFSubmit',
            params: {}
          },
          {
            id: 'step2',
            name: 'Check: Attendees Over 100',
            type: 'condition',
            condition: {
              all: [
                { fact: 'attendees', operator: 'greaterThan', value: 100 }
              ]
            },
            onSuccess: {
              id: 'step3',
              name: 'Action: Request Approval',
              type: 'action',
              action: 'requestApproval',
              params: {}
            },
            onFailure: {
              id: 'step4',
              name: 'End: Auto-Approved',
              type: 'end',
              action: 'terminateWorkflow',
              params: {}
            }
          }
        ] as WorkflowStep[]
      };

      const errors = validateStepNames(workflow);
      expect(errors).toHaveLength(0);
    });

    it('should detect invalid step names in nested structure', () => {
      const workflow: WorkflowJSON = {
        schemaVersion: '1.0.0',
        metadata: {
          id: 'test-workflow-2',
          name: 'Test Workflow 2',
          version: '1.0.0',
          status: 'draft',
          tags: []
        },
        steps: [
          {
            id: 'step1',
            name: '🎯 Start: On MRF Submission', // Has emoji
            type: 'trigger',
            action: 'onMRFSubmit',
            params: {}
          },
          {
            id: 'step2',
            name: 'Send Email', // Missing prefix
            type: 'action',
            action: 'sendEmail',
            params: {}
          }
        ] as WorkflowStep[]
      };

      const errors = validateStepNames(workflow);
      expect(errors.length).toBeGreaterThan(0);
      
      // Check for emoji error
      const emojiError = errors.find(e => e.stepId === 'step1');
      expect(emojiError).toBeDefined();
      expect(emojiError?.technicalMessage).toContain('emoji');
      expect(emojiError?.conversationalExplanation).toContain('professional format');
      
      // Check for prefix error
      const prefixError = errors.find(e => e.stepId === 'step2');
      expect(prefixError).toBeDefined();
      expect(prefixError?.technicalMessage).toContain('Action:');
      expect(prefixError?.suggestedFix).toContain('Action: Send Email');
    });

    it('should provide helpful error messages with examples', () => {
      const workflow: WorkflowJSON = {
        schemaVersion: '1.0.0',
        metadata: {
          id: 'test-workflow-3',
          name: 'Test Workflow 3',
          version: '1.0.0',
          status: 'draft',
          tags: []
        },
        steps: [
          {
            id: 'badStep',
            name: 'Check attendance',
            type: 'condition',
            condition: { all: [] }
          }
        ] as WorkflowStep[]
      };

      const errors = validateStepNames(workflow);
      expect(errors).toHaveLength(1);
      
      const error = errors[0];
      expect(error.severity).toBe('error');
      expect(error.stepId).toBe('badStep');
      expect(error.fieldPath).toBe('name');
      expect(error.suggestedFix).toContain('Check: Check attendance');
      expect(error.documentationLink).toBe('/docs/workflow-best-practices#step-naming');
    });

    it('should validate deeply nested steps', () => {
      const workflow: WorkflowJSON = {
        schemaVersion: '1.0.0',
        metadata: {
          id: 'test-workflow-4',
          name: 'Test Workflow 4',
          version: '1.0.0',
          status: 'draft',
          tags: []
        },
        steps: [
          {
            id: 'step1',
            name: 'Start: On MRF Submission',
            type: 'trigger',
            action: 'onMRFSubmit',
            params: {},
            children: [
              {
                id: 'step2',
                name: 'Check: Budget Available',
                type: 'condition',
                condition: { all: [] },
                onSuccess: {
                  id: 'step3',
                  name: 'Approve Event', // Missing Action: prefix
                  type: 'action',
                  action: 'approveEvent',
                  params: {}
                },
                onFailure: {
                  id: 'step4',
                  name: 'End: Denied',
                  type: 'end',
                  action: 'terminateWorkflow',
                  params: {}
                }
              }
            ]
          }
        ] as WorkflowStep[]
      };

      const errors = validateStepNames(workflow);
      expect(errors.length).toBeGreaterThan(0);
      
      const error = errors.find(e => e.stepId === 'step3');
      expect(error).toBeDefined();
      expect(error?.technicalMessage).toContain('Action:');
    });
  });

  describe('validateStepNames - legacy object structure', () => {
    it('should validate legacy workflow structure', () => {
      const workflow: WorkflowJSON = {
        schemaVersion: '1.0.0',
        metadata: {
          id: 'test-workflow-5',
          name: 'Test Workflow 5',
          version: '1.0.0',
          status: 'draft',
          tags: []
        },
        steps: {
          '1': {
            id: '1',
            name: 'Start: On MRF Submission',
            type: 'trigger',
            action: 'onMRFSubmit',
            params: {}
          },
          '2': {
            id: '2',
            name: 'Action: Send Email',
            type: 'action',
            action: 'sendEmail',
            params: {}
          }
        } as unknown as WorkflowStep[]
      };

      const errors = validateStepNames(workflow);
      expect(errors).toHaveLength(0);
    });

    it('should detect errors in legacy structure', () => {
      const workflow: WorkflowJSON = {
        schemaVersion: '1.0.0',
        metadata: {
          id: 'test-workflow-6',
          name: 'Test Workflow 6',
          version: '1.0.0',
          status: 'draft',
          tags: []
        },
        steps: {
          '1': {
            id: '1',
            name: '✅ Start: On MRF Submission',
            type: 'trigger',
            action: 'onMRFSubmit',
            params: {}
          }
        } as unknown as WorkflowStep[]
      };

      const errors = validateStepNames(workflow);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].technicalMessage).toContain('emoji');
    });
  });

  describe('edge cases', () => {
    it('should handle empty step names', () => {
      const result = validateStepNameFormat('', 'action');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Step name must start with "Action:"');
    });

    it('should handle step names with only prefix', () => {
      const result = validateStepNameFormat('Action:', 'action');
      expect(result.isValid).toBe(true); // Technically valid format
      expect(result.errors).toHaveLength(0);
    });

    it('should handle step names with extra whitespace', () => {
      const result = validateStepNameFormat('  Action: Send Email  ', 'action');
      expect(result.isValid).toBe(false); // Leading whitespace means no proper prefix
      expect(result.errors).toContain('Step name must start with "Action:"');
    });

    it('should handle case-sensitive prefix matching', () => {
      const result = validateStepNameFormat('action: Send Email', 'action');
      expect(result.isValid).toBe(false); // Lowercase prefix should fail
      expect(result.errors).toContain('Step name must start with "Action:"');
    });

    it('should handle prefix with different spacing', () => {
      const result = validateStepNameFormat('Action:Send Email', 'action');
      expect(result.isValid).toBe(true); // No space after colon is still valid
      expect(result.errors).toHaveLength(0);
    });

    it('should detect emojis at end of string', () => {
      const result = validateStepNameFormat('Action: Send Email 📧', 'action');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Step names must not contain emojis');
    });

    it('should detect emojis in middle of string', () => {
      const result = validateStepNameFormat('Action: Send 📧 Email', 'action');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Step names must not contain emojis');
    });

    it('should handle multiple emojis', () => {
      const result = validateStepNameFormat('🎯 Action: Send Email 📧', 'action');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Step names must not contain emojis');
    });
  });
});
