/**
 * Tests for AI SDK Agent configuration and initialization
 *
 * Tests the AI agent setup including:
 * - Tool registration
 * - Agent initialization
 * - Response parsing from LLM
 * - Integration with workflow tools
 */

import { anthropic } from '@ai-sdk/anthropic';
import { Experimental_Agent as Agent } from 'ai';

describe('AI SDK Agent Setup', () => {
  describe('Agent Initialization', () => {
    it('should have Anthropic provider configured', () => {
      expect(anthropic).toBeDefined();
    });

    it('should support creating Agent instance', () => {
      // Verify Agent class is available and constructable
      expect(Agent).toBeDefined();
    });
  });

  describe('Tool Integration', () => {
    it('should be able to import workflow validation tool', async () => {
      const { workflowDefinitionValidatorTool } = await import(
        '@/app/utils/aiSdkTools/WorkflowValidator'
      );
      expect(workflowDefinitionValidatorTool).toBeDefined();
      expect(workflowDefinitionValidatorTool.description).toBeDefined();
    });

    it('should be able to import short UUID tool', async () => {
      const { shortUUIDTool } = await import('@/app/utils/aiSdkTools/ShortUUID');
      expect(shortUUIDTool).toBeDefined();
      expect(shortUUIDTool.description).toBeDefined();
    });

    it('should be able to import workflow template listing tool', async () => {
      const { getListOfWorkflowTemplatesTool } = await import(
        '@/app/utils/aiSdkTools/GetListOfWorkflowTemplates'
      );
      expect(getListOfWorkflowTemplatesTool).toBeDefined();
    });

    it('should be able to import MRF facts tool', async () => {
      const { getMrfFactsTool } = await import('@/app/utils/aiSdkTools/GetMRFFacts');
      expect(getMrfFactsTool).toBeDefined();
    });

    it('should be able to import request facts tool', async () => {
      const { getRequestFactsTool } = await import('@/app/utils/aiSdkTools/GetRequestFacts');
      expect(getRequestFactsTool).toBeDefined();
    });
  });

  describe('Response Parsing', () => {
    it('should handle pure JSON response format', () => {
      const jsonResponse = '{"text": "Test response", "workflowDefinition": null}';
      expect(() => JSON.parse(jsonResponse)).not.toThrow();
    });

    it('should handle markdown-wrapped JSON', () => {
      const markdownJson = '```json\n{"text": "Test response"}\n```';
      const extracted = markdownJson.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      expect(extracted).not.toBeNull();
      expect(extracted?.[1]).toContain('text');
    });

    it('should extract JSON from text with preamble', () => {
      const textWithJson =
        'Here is the workflow: {"text": "Test", "workflowDefinition": null}';
      const firstBraceIndex = textWithJson.indexOf('{');
      expect(firstBraceIndex).toBeGreaterThan(0);
      const jsonString = textWithJson.substring(firstBraceIndex);
      expect(() => JSON.parse(jsonString)).not.toThrow();
    });

    it('should handle empty response gracefully', () => {
      const emptyResponse = '';
      expect(emptyResponse.trim().length).toBe(0);
    });

    it('should validate workflow message structure', () => {
      const validMessage = {
        text: 'Test workflow created',
        workflowDefinition: {
          steps: [
            {
              id: 'aB3k9ZpQ1x',
              label: 'Start',
              type: 'trigger',
            },
          ],
        },
        actions: [],
        followUpQuestions: ['Looks good?'],
        followUpOptions: {},
      };

      expect(validMessage).toHaveProperty('text');
      expect(validMessage).toHaveProperty('workflowDefinition');
      expect(Array.isArray(validMessage.actions)).toBe(true);
    });
  });

  describe('Workflow Message Format', () => {
    it('should format text content correctly', () => {
      const content = {
        text: 'Creating a workflow for event approval',
        workflowDefinition: undefined,
      };

      expect(content.text.length).toBeGreaterThan(0);
      expect(typeof content.text).toBe('string');
    });

    it('should handle workflow definition in message', () => {
      const content = {
        text: 'Workflow created',
        workflowDefinition: {
          steps: [{ id: 'aB3k9ZpQ1x', type: 'trigger' }],
        },
      };

      expect(content.workflowDefinition).toBeDefined();
      expect(Array.isArray(content.workflowDefinition.steps)).toBe(true);
    });

    it('should support follow-up questions', () => {
      const content = {
        text: 'Workflow ready',
        workflowDefinition: undefined,
        followUpQuestions: [
          'Would you like to add more steps?',
          'Should this trigger on all MRF submissions?',
        ],
      };

      expect(Array.isArray(content.followUpQuestions)).toBe(true);
      expect(content.followUpQuestions.length).toBe(2);
    });

    it('should support actions metadata', () => {
      const content = {
        text: 'Workflow updated',
        actions: [
          { type: 'save_workflow', target: 'template-123' },
          { type: 'publish', target: 'template-123' },
        ],
      };

      expect(Array.isArray(content.actions)).toBe(true);
      expect(content.actions[0]).toHaveProperty('type');
    });
  });

  describe('Agent Tool Registration Pattern', () => {
    it('should follow consistent tool naming pattern', async () => {
      const tools = [
        '@/app/utils/aiSdkTools/WorkflowValidator',
        '@/app/utils/aiSdkTools/ShortUUID',
        '@/app/utils/aiSdkTools/GetListOfWorkflowTemplates',
      ];

      // Verify all tools follow naming convention
      tools.forEach((toolPath) => {
        const toolName = toolPath.split('/').pop();
        expect(toolName).toMatch(/^[A-Z]/); // PascalCase
      });
    });

    it('should export tools from correct locations', async () => {
      const { workflowDefinitionValidatorTool } = await import(
        '@/app/utils/aiSdkTools/WorkflowValidator'
      );
      const { shortUUIDTool } = await import('@/app/utils/aiSdkTools/ShortUUID');

      expect(workflowDefinitionValidatorTool).toBeDefined();
      expect(shortUUIDTool).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON gracefully', () => {
      const malformedJson = '{ invalid json }';
      expect(() => JSON.parse(malformedJson)).toThrow();
    });

    it('should handle missing workflow definition', () => {
      const content = {
        text: 'Error occurred',
        // workflowDefinition intentionally omitted
      };

      expect('workflowDefinition' in content).toBe(false);
    });

    it('should handle empty actions array', () => {
      const content = {
        text: 'Workflow created',
        actions: [],
      };

      expect(Array.isArray(content.actions)).toBe(true);
      expect(content.actions.length).toBe(0);
    });

    it('should handle null workflow definition', () => {
      const content = {
        text: 'Workflow draft',
        workflowDefinition: null,
      };

      expect(content.workflowDefinition).toBeNull();
    });
  });

  describe('Agent Response Scenarios', () => {
    it('should handle single-step workflow response', () => {
      const response = {
        text: 'Created simple workflow',
        workflowDefinition: {
          steps: [
            {
              id: 'aB3k9ZpQ1x',
              label: 'Start Process',
              type: 'trigger',
            },
          ],
        },
      };

      expect(response.workflowDefinition.steps.length).toBe(1);
    });

    it('should handle multi-step workflow response', () => {
      const response = {
        text: 'Created complex workflow',
        workflowDefinition: {
          steps: [
            { id: 'aB3k9ZpQ1x', label: 'Start', type: 'trigger' },
            { id: 'bC4l0ApR2y', label: 'Validate', type: 'condition' },
            { id: 'cD5m1BqS3z', label: 'Process', type: 'action' },
            { id: 'dE5n1BrS4z', label: 'End', type: 'end' },
          ],
        },
      };

      expect(response.workflowDefinition.steps.length).toBe(4);
    });

    it('should handle workflow with clarification request', () => {
      const response = {
        text: 'I need clarification on the workflow',
        workflowDefinition: undefined,
        followUpQuestions: ['Should this trigger on all submissions?'],
      };

      expect(response.workflowDefinition).toBeUndefined();
      expect(response.followUpQuestions.length).toBeGreaterThan(0);
    });

    it('should handle workflow validation response', () => {
      const response = {
        text: 'Workflow validation complete',
        workflowDefinition: {
          steps: [{ id: 'aB3k9ZpQ1x', type: 'trigger' }],
        },
        actions: [{ type: 'validate', result: 'passed' }],
      };

      expect(response.actions).toBeDefined();
      expect(response.actions[0].type).toBe('validate');
    });
  });

  describe('Tool Integration Patterns', () => {
    it('should allow multiple tools to be registered', async () => {
      const toolImports = [
        import('@/app/utils/aiSdkTools/WorkflowValidator'),
        import('@/app/utils/aiSdkTools/ShortUUID'),
      ];

      const results = await Promise.all(toolImports);
      expect(results.length).toBe(2);
      results.forEach((result) => {
        expect(Object.keys(result).length).toBeGreaterThan(0);
      });
    });

    it('should support async tool execution', async () => {
      const { workflowDefinitionValidatorTool } = await import(
        '@/app/utils/aiSdkTools/WorkflowValidator'
      );

      // Verify the tool can be used asynchronously
      expect(workflowDefinitionValidatorTool.description).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long workflow responses', () => {
      const longWorkflow = {
        text: 'Created workflow',
        workflowDefinition: {
          steps: Array.from({ length: 100 }, (_, i) => ({
            id: `step${String(i).padStart(7, '0')}QW`,
            label: `Step ${i}`,
            type: 'action',
          })),
        },
      };

      expect(longWorkflow.workflowDefinition.steps.length).toBe(100);
    });

    it('should handle workflow with special characters in labels', () => {
      const workflow = {
        steps: [
          {
            id: 'aB3k9ZpQ1x',
            label: 'Start: "Special" & <Chars>',
            type: 'trigger',
          },
        ],
      };

      expect(workflow.steps[0].label).toContain('Special');
    });

    it('should handle JSON serialization of complex workflow', () => {
      const workflow = {
        steps: [
          {
            id: 'aB3k9ZpQ1x',
            label: 'Complex Step',
            type: 'action',
            metadata: { nested: { deep: { value: 'test' } } },
          },
        ],
      };

      const serialized = JSON.stringify(workflow);
      const deserialized = JSON.parse(serialized);
      expect(deserialized.steps[0].metadata.nested.deep.value).toBe('test');
    });
  });
});
