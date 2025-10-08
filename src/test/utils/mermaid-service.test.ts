// src/test/utils/mermaid-service.test.ts
import { generateMermaidDiagram, createFallbackDiagram, clearMermaidCache } from '@/app/utils/mermaid-service';
import { WorkflowJSON } from '@/app/types/workflow';

// Mock fetch for testing
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('Mermaid Service', () => {
  const sampleWorkflow: WorkflowJSON = {
    schemaVersion: '1.0.0',
    metadata: {
      id: 'test-workflow',
      name: 'Test Event Workflow',
      description: 'A test workflow for Mermaid generation',
      version: '1.0.0',
      status: 'draft',
      tags: ['test', 'mermaid']
    },
    steps: [
      {
        id: 'start',
        name: 'Start Process',
        type: 'trigger',
        action: 'onEventSubmit',
        children: [
          {
            id: 'checkCondition',
            name: 'Check Requirements',
            type: 'condition',
            condition: {
              all: [
                {
                  fact: 'event.attendees',
                  operator: 'greater than',
                  value: 50
                }
              ]
            },
            onSuccess: {
              id: 'requireApproval',
              name: 'Require Approval',
              type: 'action',
              action: 'functions.requestApproval',
              params: { approver: 'manager@example.com' },
              onSuccessGoTo: 'end'
            },
            onFailure: {
              id: 'autoApprove',
              name: 'Auto Approve',
              type: 'action',
              action: 'functions.autoApprove',
              params: { reason: 'Threshold not met' },
              onSuccessGoTo: 'end'
            }
          }
        ]
      },
      {
        id: 'end',
        name: 'Process Complete',
        type: 'end',
        result: 'success'
      }
    ]
  } as unknown as WorkflowJSON;

  beforeEach(() => {
    clearMermaidCache();
    mockFetch.mockClear();
  });

  describe('generateMermaidDiagram', () => {
    it('should generate a Mermaid diagram via API', async () => {
      const mockMermaidDiagram = `flowchart TD
    A[Start Process] --> B{Check Requirements}
    B -->|Success| C[Require Approval]
    B -->|Failure| D[Auto Approve]
    C --> E((Process Complete))
    D --> E`;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ mermaidDiagram: mockMermaidDiagram })
      });

      const result = await generateMermaidDiagram(sampleWorkflow);

      expect(result).toBe(mockMermaidDiagram);
      expect(mockFetch).toHaveBeenCalledWith('/api/generate-mermaid', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ workflow: sampleWorkflow })
      });
    });

    it('should use cached diagram for identical workflows', async () => {
      const mockMermaidDiagram = 'flowchart TD\\n    A[Start] --> B[End]';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ mermaidDiagram: mockMermaidDiagram })
      });

      // First call should hit the API
      const result1 = await generateMermaidDiagram(sampleWorkflow);
      expect(result1).toBe(mockMermaidDiagram);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second call should use cache
      const result2 = await generateMermaidDiagram(sampleWorkflow);
      expect(result2).toBe(mockMermaidDiagram);
      expect(mockFetch).toHaveBeenCalledTimes(1); // Still only 1 call
    });

    it('should throw error when API fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'API Error' })
      });

      await expect(generateMermaidDiagram(sampleWorkflow))
        .rejects.toThrow('API Error');
    });

    it('should throw error when network request fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network Error'));

      await expect(generateMermaidDiagram(sampleWorkflow))
        .rejects.toThrow('Network Error');
    });
  });

  describe('createFallbackDiagram', () => {
    it('should create a basic Mermaid diagram from workflow steps', () => {
      const fallbackDiagram = createFallbackDiagram(sampleWorkflow);

      expect(fallbackDiagram).toContain('flowchart TD');
      expect(fallbackDiagram).toContain('start(["Start Process"])');
      expect(fallbackDiagram).toContain('checkCondition{"Check Requirements');
      expect(fallbackDiagram).toContain('requireApproval["Require Approval<br/>functions.requestApproval');
      expect(fallbackDiagram).toContain('autoApprove["Auto Approve<br/>functions.autoApprove');
      expect(fallbackDiagram).toContain('end(("Process Complete<br/>Result: success"))');
      expect(fallbackDiagram).toContain('Check Requirements<br/>event.attendees greater than 50');
      expect(fallbackDiagram).toContain('checkCondition -->|Success| requireApproval');
      expect(fallbackDiagram).toContain('checkCondition -->|Failure| autoApprove');
      expect(fallbackDiagram).toContain('classDef triggerClass fill:#E8F5E8,stroke:#2E7D32');
      expect(fallbackDiagram).toContain('classDef conditionClass fill:#FFF3E0,stroke:#F57C00');
      expect(fallbackDiagram).toContain('classDef actionClass fill:#E3F2FD,stroke:#1976D2');
      expect(fallbackDiagram).toContain('classDef endClass fill:#FFEBEE,stroke:#B71C1C');
    });

    it('should handle workflows with nextSteps connections', () => {
      const simpleWorkflow: WorkflowJSON = {
        schemaVersion: '1.0.0',
        metadata: {
          id: 'simple-workflow',
          name: 'Simple Workflow',
          version: '1.0.0',
          status: 'draft',
          tags: []
        },
        steps: [
          {
            id: 'step1',
            name: 'First Step',
            type: 'action',
            action: 'doSomething',
            children: [
              {
                id: 'step2',
                name: 'Second Step',
                type: 'action',
                action: 'doSomethingElse',
                onSuccessGoTo: 'end'
              }
            ]
          },
          {
            id: 'end',
            name: 'End',
            type: 'end',
            result: 'success'
          }
        ]
      } as unknown as WorkflowJSON;

      const fallbackDiagram = createFallbackDiagram(simpleWorkflow);

      expect(fallbackDiagram).toContain('step1 --> step2');
      expect(fallbackDiagram).toContain('step2 -->|Success| end');
    });

    it('should include reference-based transitions from inline branches', () => {
      const workflowWithReferences: WorkflowJSON = {
        schemaVersion: '1.0.0',
        metadata: {
          id: 'reference-workflow',
          name: 'Reference Workflow',
          version: '1.0.0',
          status: 'draft',
          tags: []
        },
        steps: [
          {
            id: 'start',
            name: 'Start',
            type: 'trigger',
            action: 'onEventSubmit',
            children: [
              {
                id: 'checkBudget',
                name: 'Check Budget',
                type: 'condition',
                condition: {
                  all: [
                    { fact: 'budget.amount', operator: 'greater than', value: 1000 }
                  ]
                },
                onSuccessGoTo: 'approveStep',
                onFailure: {
                  id: 'requestDetails',
                  name: 'Request Details',
                  type: 'action',
                  action: 'functions.requestMoreInfo',
                  onSuccessGoTo: 'end'
                }
              }
            ]
          },
          {
            id: 'approveStep',
            name: 'Approve Request',
            type: 'action',
            action: 'functions.requestApproval',
            onSuccessGoTo: 'end'
          },
          {
            id: 'end',
            name: 'End',
            type: 'end',
            result: 'success'
          }
        ]
      } as unknown as WorkflowJSON;

      const fallbackDiagram = createFallbackDiagram(workflowWithReferences);

      expect(fallbackDiagram).toContain('checkBudget -->|Success| approveStep');
      expect(fallbackDiagram).toContain('checkBudget -->|Failure| requestDetails');
      expect(fallbackDiagram).toContain('requestDetails -->|Success| end');
    });
  });

  describe('cache management', () => {
    it('should clear cache when clearMermaidCache is called', async () => {
      const mockMermaidDiagram = 'flowchart TD\\n    A[Start] --> B[End]';

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ mermaidDiagram: mockMermaidDiagram })
      });

      // Generate diagram (should hit API)
      await generateMermaidDiagram(sampleWorkflow);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Generate again (should use cache)
      await generateMermaidDiagram(sampleWorkflow);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Clear cache
      clearMermaidCache();

      // Generate again (should hit API again)
      await generateMermaidDiagram(sampleWorkflow);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});