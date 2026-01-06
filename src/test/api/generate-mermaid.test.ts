import { NextRequest } from 'next/server';
import { POST as generateMermaid } from '@/app/api/generate-mermaid/route';
import { WorkflowDefinition, WorkflowStep } from '@/app/types/workflowTemplate';
import { createTestRequest } from '../helpers/next-request';
import * as MermaidGenerator from '@/app/utils/MermaidGenerator';

// Mock dependencies
jest.mock('@/app/utils/MermaidGenerator');

const mockGenerateMermaid = MermaidGenerator.generateMermaidFromWorkflow as jest.MockedFunction<typeof MermaidGenerator.generateMermaidFromWorkflow>;

// Helper to create mock workflow step
const createMockStep = (overrides?: Partial<WorkflowStep>): WorkflowStep => ({
  id: 'step-' + Math.random().toString(36).slice(2, 12),
  label: 'Test Step',
  type: 'action',
  stepFunction: 'testFunction',
  functionParams: {},
  ...overrides,
});

// Helper to create mock workflow definition
const createMockWorkflow = (overrides?: Partial<WorkflowDefinition>): WorkflowDefinition => ({
  steps: [createMockStep({ id: 'start-step', label: 'Start' })],
  ...overrides,
});

describe('POST /api/generate-mermaid', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Mermaid Diagram Generation', () => {
    it('should generate mermaid diagram from workflow definition', async () => {
      const expectedDiagram = 'graph TD\n  A[Start]\n  B[Process]\n  C[End]';
      mockGenerateMermaid.mockReturnValue(expectedDiagram);

      const workflow = createMockWorkflow({
        steps: [
          createMockStep({ id: 'start', label: 'Start' }),
          createMockStep({ id: 'process', label: 'Process' }),
          createMockStep({ id: 'end', label: 'End' }),
        ],
      });

      const request = createTestRequest('http://localhost:3000/api/generate-mermaid', {
        method: 'POST',
      });

      (request.json as jest.Mock).mockResolvedValue({
        sessionId: 'session-123',
        workflowDefinition: workflow,
      });

      const response = await generateMermaid(request as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.mermaidDiagram).toBe(expectedDiagram);
      expect(data.workflowDefinition).toEqual(workflow);
      expect(data.timestamp).toBeDefined();
    });

    it('should generate diagram for simple workflow', async () => {
      const simpleDiagram = 'graph TD\n  A[Start]\n  B[End]';
      mockGenerateMermaid.mockReturnValue(simpleDiagram);

      const workflow = createMockWorkflow({
        steps: [
          createMockStep({ id: 'start', label: 'Start', type: 'trigger' }),
          createMockStep({ id: 'end', label: 'End', type: 'end' }),
        ],
      });

      const request = createTestRequest('http://localhost:3000/api/generate-mermaid', {
        method: 'POST',
      });

      (request.json as jest.Mock).mockResolvedValue({
        sessionId: 'session-456',
        workflowDefinition: workflow,
      });

      const response = await generateMermaid(request as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.mermaidDiagram).toBe(simpleDiagram);
      expect(mockGenerateMermaid).toHaveBeenCalledWith(workflow);
    });

    it('should generate diagram for complex workflow with branching', async () => {
      const complexDiagram = 'graph TD\n  A[Start]\n  B{Decision}\n  C[Path1]\n  D[Path2]\n  E[End]';
      mockGenerateMermaid.mockReturnValue(complexDiagram);

      const workflow = createMockWorkflow({
        steps: [
          createMockStep({
            id: 'start',
            label: 'Start',
            type: 'trigger',
            next: ['decision-step'],
          }),
          createMockStep({
            id: 'decision-step',
            label: 'Decision',
            type: 'condition',
            onConditionPass: 'path1-step',
            onConditionFail: 'path2-step',
          }),
          createMockStep({
            id: 'path1-step',
            label: 'Path 1',
            type: 'action',
            next: ['end-step'],
          }),
          createMockStep({
            id: 'path2-step',
            label: 'Path 2',
            type: 'action',
            next: ['end-step'],
          }),
          createMockStep({
            id: 'end-step',
            label: 'End',
            type: 'end',
          }),
        ],
      });

      const request = createTestRequest('http://localhost:3000/api/generate-mermaid', {
        method: 'POST',
      });

      (request.json as jest.Mock).mockResolvedValue({
        sessionId: 'session-789',
        workflowDefinition: workflow,
      });

      const response = await generateMermaid(request as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.mermaidDiagram).toContain('graph TD');
      expect(mockGenerateMermaid).toHaveBeenCalled();
    });

    it('should trim mermaid diagram output', async () => {
      const diagramWithWhitespace = '  graph TD\n  A[Start]  \n  ';
      const trimmedDiagram = 'graph TD\n  A[Start]';
      mockGenerateMermaid.mockReturnValue(diagramWithWhitespace);

      const workflow = createMockWorkflow();

      const request = createTestRequest('http://localhost:3000/api/generate-mermaid', {
        method: 'POST',
      });

      (request.json as jest.Mock).mockResolvedValue({
        sessionId: 'session-trim',
        workflowDefinition: workflow,
      });

      const response = await generateMermaid(request as NextRequest);
      const data = await response.json();

      expect(data.mermaidDiagram).toBe(trimmedDiagram);
    });
  });

  describe('Request Validation', () => {
    it('should reject request with missing sessionId', async () => {
      const request = createTestRequest('http://localhost:3000/api/generate-mermaid', {
        method: 'POST',
      });

      (request.json as jest.Mock).mockResolvedValue({
        // missing sessionId
        workflowDefinition: createMockWorkflow(),
      });

      const response = await generateMermaid(request as NextRequest);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Missing required parameters');
    });

    it('should reject request with missing workflowDefinition', async () => {
      const request = createTestRequest('http://localhost:3000/api/generate-mermaid', {
        method: 'POST',
      });

      (request.json as jest.Mock).mockResolvedValue({
        sessionId: 'session-123',
        // missing workflowDefinition
      });

      const response = await generateMermaid(request as NextRequest);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Missing required parameters');
    });

    it('should reject request with empty sessionId', async () => {
      const request = createTestRequest('http://localhost:3000/api/generate-mermaid', {
        method: 'POST',
      });

      (request.json as jest.Mock).mockResolvedValue({
        sessionId: '',
        workflowDefinition: createMockWorkflow(),
      });

      const response = await generateMermaid(request as NextRequest);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
    });

    it('should reject request with null workflowDefinition', async () => {
      const request = createTestRequest('http://localhost:3000/api/generate-mermaid', {
        method: 'POST',
      });

      (request.json as jest.Mock).mockResolvedValue({
        sessionId: 'session-123',
        workflowDefinition: null,
      });

      const response = await generateMermaid(request as NextRequest);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
    });

    it('should reject request with no body', async () => {
      const request = createTestRequest('http://localhost:3000/api/generate-mermaid', {
        method: 'POST',
      });

      (request.json as jest.Mock).mockRejectedValue(new SyntaxError('No body'));

      const response = await generateMermaid(request as NextRequest);
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('Error Handling', () => {
    it('should handle mermaid generation errors', async () => {
      mockGenerateMermaid.mockImplementation(() => {
        throw new Error('Mermaid generation failed');
      });

      const request = createTestRequest('http://localhost:3000/api/generate-mermaid', {
        method: 'POST',
      });

      (request.json as jest.Mock).mockResolvedValue({
        sessionId: 'session-123',
        workflowDefinition: createMockWorkflow(),
      });

      const response = await generateMermaid(request as NextRequest);
      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Failed to generate mermaid diagram');
    });

    it('should handle malformed JSON in request', async () => {
      const request = createTestRequest('http://localhost:3000/api/generate-mermaid', {
        method: 'POST',
      });

      (request.json as jest.Mock).mockRejectedValue(new SyntaxError('Invalid JSON'));

      const response = await generateMermaid(request as NextRequest);
      expect(response.status).toBeGreaterThanOrEqual(400);
      const data = await response.json();
      expect(data.success).toBe(false);
    });

    it('should handle generator function crashes gracefully', async () => {
      mockGenerateMermaid.mockImplementation(() => {
        throw new Error('Unexpected error in generator');
      });

      const request = createTestRequest('http://localhost:3000/api/generate-mermaid', {
        method: 'POST',
      });

      (request.json as jest.Mock).mockResolvedValue({
        sessionId: 'session-123',
        workflowDefinition: createMockWorkflow(),
      });

      const response = await generateMermaid(request as NextRequest);
      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });
  });

  describe('Response Format', () => {
    it('should include all required response fields', async () => {
      mockGenerateMermaid.mockReturnValue('graph TD\n  A[Start]\n  B[End]');

      const workflow = createMockWorkflow();

      const request = createTestRequest('http://localhost:3000/api/generate-mermaid', {
        method: 'POST',
      });

      (request.json as jest.Mock).mockResolvedValue({
        sessionId: 'session-123',
        workflowDefinition: workflow,
      });

      const response = await generateMermaid(request as NextRequest);
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('mermaidDiagram');
      expect(data).toHaveProperty('workflowDefinition');
      expect(data).toHaveProperty('timestamp');
    });

    it('should echo back the workflow definition in response', async () => {
      mockGenerateMermaid.mockReturnValue('graph TD\n  A[Start]');

      const workflow = createMockWorkflow({
        steps: [
          createMockStep({ id: 'custom-id', label: 'Custom Label' }),
        ],
      });

      const request = createTestRequest('http://localhost:3000/api/generate-mermaid', {
        method: 'POST',
      });

      (request.json as jest.Mock).mockResolvedValue({
        sessionId: 'session-123',
        workflowDefinition: workflow,
      });

      const response = await generateMermaid(request as NextRequest);
      const data = await response.json();

      expect(data.workflowDefinition).toEqual(workflow);
      expect(data.workflowDefinition.steps[0].id).toBe('custom-id');
      expect(data.workflowDefinition.steps[0].label).toBe('Custom Label');
    });

    it('should include ISO timestamp in response', async () => {
      mockGenerateMermaid.mockReturnValue('graph TD\n  A[Start]');

      const request = createTestRequest('http://localhost:3000/api/generate-mermaid', {
        method: 'POST',
      });

      (request.json as jest.Mock).mockResolvedValue({
        sessionId: 'session-123',
        workflowDefinition: createMockWorkflow(),
      });

      const response = await generateMermaid(request as NextRequest);
      const data = await response.json();

      expect(data.timestamp).toBeDefined();
      expect(new Date(data.timestamp).toISOString()).toBe(data.timestamp);
    });
  });
});
