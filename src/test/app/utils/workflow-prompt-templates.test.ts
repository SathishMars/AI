// src/test/app/utils/workflow-prompt-templates.test.ts
/**
 * Unit tests for workflow prompt templates
 * 
 * Tests prompt generation and ID generation utilities
 */

import {
  buildWorkflowGenerationPrompt,
  generateStepIdFromName,
  ensureStepIds,
  STEP_ID_GENERATION_PROMPT,
  NESTED_ARRAY_STRUCTURE_PROMPT,
  PROFESSIONAL_NAMING_PROMPT
} from '@/app/utils/workflow-prompt-templates';

describe('workflow-prompt-templates', () => {
  describe('generateStepIdFromName', () => {
    it('should generate camelCase ID from trigger step name', () => {
      const id = generateStepIdFromName('Start: On MRF Submission', 'trigger');
      expect(id).toBe('onMrfSubmission');
    });

    it('should generate camelCase ID from condition step name', () => {
      const id = generateStepIdFromName('Check: Attendees Over 100', 'condition');
      expect(id).toBe('attendeesOver100');
    });

    it('should generate camelCase ID from action step name', () => {
      const id = generateStepIdFromName('Action: Request Manager Approval', 'action');
      expect(id).toBe('requestManagerApproval');
    });

    it('should generate camelCase ID from end step name', () => {
      const id = generateStepIdFromName('End: Workflow Complete', 'end');
      expect(id).toBe('workflowComplete');
    });

    it('should handle names without prefixes', () => {
      const id = generateStepIdFromName('Send Email Notification', 'action');
      expect(id).toBe('sendEmailNotification');
    });

    it('should remove special characters', () => {
      const id = generateStepIdFromName('Check: Budget $10,000+', 'condition');
      expect(id).toBe('budget10000');
    });

    it('should handle very long names by truncating', () => {
      const longName = 'Check: This is a very long step name that exceeds the maximum allowed length and should be truncated';
      const id = generateStepIdFromName(longName, 'condition');
      expect(id.length).toBeLessThanOrEqual(50);
    });

    it('should handle very short names by adding type suffix', () => {
      const id = generateStepIdFromName('A', 'action');
      expect(id.length).toBeGreaterThanOrEqual(3);
      expect(id).toContain('Action');
    });

    it('should ensure first character is lowercase', () => {
      const id = generateStepIdFromName('START: Something', 'trigger');
      expect(id[0]).toBe(id[0].toLowerCase());
    });

    it('should handle names with multiple spaces', () => {
      const id = generateStepIdFromName('Action:   Send    Multiple    Spaces', 'action');
      expect(id).toBe('sendMultipleSpaces');
    });
  });

  describe('ensureStepIds', () => {
    it('should generate IDs for steps missing them', () => {
      const steps = [
        { name: 'Start: On MRF Submission', type: 'trigger' },
        { name: 'Check: Budget', type: 'condition' }
      ];

      ensureStepIds(steps);

      expect(steps[0].id).toBe('onMrfSubmission');
      expect(steps[1].id).toBe('budget');
    });

    it('should preserve existing valid IDs', () => {
      const steps = [
        { id: 'customTrigger', name: 'Start: Custom', type: 'trigger' },
        { id: 'customCheck', name: 'Check: Custom', type: 'condition' }
      ];

      ensureStepIds(steps);

      expect(steps[0].id).toBe('customTrigger');
      expect(steps[1].id).toBe('customCheck');
    });

    it('should generate unique IDs for duplicate names', () => {
      const steps = [
        { name: 'Action: Send Email', type: 'action' },
        { name: 'Action: Send Email', type: 'action' },
        { name: 'Action: Send Email', type: 'action' }
      ];

      ensureStepIds(steps);

      expect(steps[0].id).toBe('sendEmail');
      expect(steps[1].id).toBe('sendEmail1');
      expect(steps[2].id).toBe('sendEmail2');
    });

    it('should handle nested children steps', () => {
      const steps = [
        {
          name: 'Start: Parent',
          type: 'trigger',
          children: [
            { name: 'Check: Child 1', type: 'condition' },
            { name: 'Action: Child 2', type: 'action' }
          ]
        }
      ];

      ensureStepIds(steps);

      expect(steps[0].id).toBe('parent');
      expect(steps[0].children[0].id).toBe('child1');
      expect(steps[0].children[1].id).toBe('child2');
    });

    it('should handle onSuccess/onFailure nested steps', () => {
      const steps = [
        {
          name: 'Check: Budget',
          type: 'condition',
          onSuccess: {
            name: 'Action: Approve',
            type: 'action'
          },
          onFailure: {
            name: 'Action: Reject',
            type: 'action'
          }
        }
      ];

      ensureStepIds(steps);

      expect(steps[0].id).toBe('budget');
      expect(steps[0].onSuccess.id).toBe('approve');
      expect(steps[0].onFailure.id).toBe('reject');
    });

    it('should replace empty or invalid IDs', () => {
      const steps = [
        { id: '', name: 'Start: Empty ID', type: 'trigger' },
        { id: '   ', name: 'Check: Whitespace ID', type: 'condition' }
      ];

      ensureStepIds(steps);

      expect(steps[0].id).toBe('emptyId');
      expect(steps[1].id).toBe('whitespaceId');
    });
  });

  describe('buildWorkflowGenerationPrompt', () => {
    it('should build a complete prompt with function definitions', () => {
      const context = {
        functionDefinitions: [
          {
            name: 'sendEmail',
            description: 'Send an email',
            usage: 'Use to send email notifications',
            parameters: [
              { name: 'to', type: 'string', description: 'Recipient', required: true },
              { name: 'subject', type: 'string', description: 'Subject', required: true }
            ],
            example: { to: 'user@example.com', subject: 'Test' }
          }
        ],
        userRole: 'Event Planner',
        userDepartment: 'Events'
      };

      const prompt = buildWorkflowGenerationPrompt(context);

      expect(prompt).toContain('Aime');
      expect(prompt).toContain('sendEmail');
      expect(prompt).toContain('nested array format');
      expect(prompt).toContain('human-readable IDs');
      expect(prompt).toContain('Event Planner');
      expect(prompt).toContain('Events');
    });

    it('should include step ID generation rules', () => {
      const prompt = buildWorkflowGenerationPrompt({});
      
      expect(prompt).toContain('STEP ID GENERATION RULES');
      expect(prompt).toContain('camelCase');
      expect(prompt).toContain('mrfSubmissionTrigger');
      expect(prompt).toContain('checkAttendeeCount');
    });

    it('should include nested array structure instructions', () => {
      const prompt = buildWorkflowGenerationPrompt({});
      
      expect(prompt).toContain('WORKFLOW STRUCTURE FORMAT');
      expect(prompt).toContain('nested array format');
      expect(prompt).toContain('DEPRECATED FORMAT');
    });

    it('should include professional naming conventions', () => {
      const prompt = buildWorkflowGenerationPrompt({});
      
      expect(prompt).toContain('STEP NAMING CONVENTIONS');
      expect(prompt).toContain('Start:');
      expect(prompt).toContain('Check:');
      expect(prompt).toContain('Action:');
      expect(prompt).toContain('End:');
      expect(prompt).toContain('NO emojis');
    });

    it('should include conversation history when provided', () => {
      const context = {
        conversationHistory: [
          { role: 'user', content: 'Create a workflow' },
          { role: 'assistant', content: 'Sure, I can help' }
        ]
      };

      const prompt = buildWorkflowGenerationPrompt(context);

      expect(prompt).toContain('CONVERSATION HISTORY');
      expect(prompt).toContain('Create a workflow');
      expect(prompt).toContain('Sure, I can help');
    });

    it('should include reference data when provided', () => {
      const context = {
        referenceData: {
          mrfTemplates: [{ name: 'Standard Event', category: 'Corporate' }],
          users: [{ name: 'John Doe', role: 'Manager' }]
        }
      };

      const prompt = buildWorkflowGenerationPrompt(context);

      expect(prompt).toContain('AVAILABLE REFERENCE DATA');
      expect(prompt).toContain('Standard Event');
      expect(prompt).toContain('John Doe');
    });

    it('should handle empty context gracefully', () => {
      const prompt = buildWorkflowGenerationPrompt({});

      expect(prompt).toBeTruthy();
      expect(prompt.length).toBeGreaterThan(100);
      expect(prompt).toContain('Aime');
    });
  });

  describe('Prompt Template Constants', () => {
    it('STEP_ID_GENERATION_PROMPT should contain key examples', () => {
      expect(STEP_ID_GENERATION_PROMPT).toContain('camelCase');
      expect(STEP_ID_GENERATION_PROMPT).toContain('mrfSubmissionTrigger');
      expect(STEP_ID_GENERATION_PROMPT).toContain('checkAttendeeCount');
      expect(STEP_ID_GENERATION_PROMPT).toContain('requestManagerApproval');
    });

    it('NESTED_ARRAY_STRUCTURE_PROMPT should show correct and deprecated formats', () => {
      expect(NESTED_ARRAY_STRUCTURE_PROMPT).toContain('CORRECT FORMAT');
      expect(NESTED_ARRAY_STRUCTURE_PROMPT).toContain('DEPRECATED FORMAT');
      expect(NESTED_ARRAY_STRUCTURE_PROMPT).toContain('"steps": [');
      expect(NESTED_ARRAY_STRUCTURE_PROMPT).toContain('"steps": {');
    });

    it('PROFESSIONAL_NAMING_PROMPT should list all required prefixes', () => {
      expect(PROFESSIONAL_NAMING_PROMPT).toContain('Start:');
      expect(PROFESSIONAL_NAMING_PROMPT).toContain('Check:');
      expect(PROFESSIONAL_NAMING_PROMPT).toContain('Action:');
      expect(PROFESSIONAL_NAMING_PROMPT).toContain('End:');
      expect(PROFESSIONAL_NAMING_PROMPT).toContain('NO emojis');
    });

    it('PROFESSIONAL_NAMING_PROMPT should show good and bad examples', () => {
      expect(PROFESSIONAL_NAMING_PROMPT).toContain('GOOD EXAMPLES');
      expect(PROFESSIONAL_NAMING_PROMPT).toContain('BAD EXAMPLES');
      expect(PROFESSIONAL_NAMING_PROMPT).toContain('✅');
      expect(PROFESSIONAL_NAMING_PROMPT).toContain('❌');
    });
  });
});
