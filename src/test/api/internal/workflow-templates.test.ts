import { NextRequest, NextResponse } from 'next/server';
import { GET as getInternalTemplates, POST as postInternalTemplate } from '@/app/api/internal/workflow-templates/route';
import * as workflowTemplateService from '@/app/services/workflowTemplateService';
import { createTestRequest } from '../../helpers/next-request';
import { WorkflowTemplate, WorkflowTemplateMetadata } from '@/app/types/workflowTemplate';

// Mock dependencies
jest.mock('@/app/services/workflowTemplateService');

// We'll manually test the handlers as they are wrapped by withServiceAuth
// Instead of mocking the middleware, we'll mock the exported GET/POST which are already wrapped

const mockListTemplates = workflowTemplateService.listTemplates as jest.MockedFunction<typeof workflowTemplateService.listTemplates>;
const mockCreateTemplate = workflowTemplateService.createTemplate as jest.MockedFunction<typeof workflowTemplateService.createTemplate>;

// Mock the jwt-verifier for service auth
jest.mock('@/app/lib/jwt-verifier', () => ({
  verifyServiceToken: jest.fn(),
  JWTVerificationError: class JWTVerificationError extends Error {
    code: string;
    details?: unknown;
    constructor(code: string, message: string, details?: unknown) {
      super(message);
      this.code = code;
      this.details = details;
    }
  },
}));

import { verifyServiceToken } from '@/app/lib/jwt-verifier';
const mockVerifyServiceToken = verifyServiceToken as jest.MockedFunction<typeof verifyServiceToken>;

// Helper to create mock template metadata
const createMockMetadata = (overrides?: Partial<WorkflowTemplateMetadata>): WorkflowTemplateMetadata => ({
  label: 'Internal Template',
  description: 'An internal template',
  status: 'draft' as const,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  createdBy: 'service:rails',
  updatedBy: 'service:rails',
  ...overrides,
});

// Helper to create mock template
const createMockTemplate = (overrides?: Partial<WorkflowTemplate>): WorkflowTemplate => ({
  id: 'internal-template-id',
  account: 'account123',
  version: '1.0.0',
  metadata: createMockMetadata(),
  workflowDefinition: { steps: [] },
  ...overrides,
});

describe('Internal Workflow Templates API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default successful auth
    mockVerifyServiceToken.mockResolvedValue({
      iss: 'groupize',
      aud: 'workflows-api',
      sub: 'service:rails',
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
      nbf: Math.floor(Date.now() / 1000),
      context: {
        user_id: 'service:rails',
        account_id: 'account123',
        organization_id: undefined,
      },
    } as any);
  });

  describe('GET /api/internal/workflow-templates', () => {
    it('should list templates with default pagination for internal caller', async () => {
      const mockTemplate = createMockTemplate({
        metadata: createMockMetadata({ status: 'published' as const }),
      });

      mockListTemplates.mockResolvedValue({
        templates: [mockTemplate],
        totalCount: 1,
        page: 1,
        pageSize: 20,
        hasMore: false,
      });

      const request = createTestRequest('http://localhost:3000/api/internal/workflow-templates', {
        method: 'GET',
        headers: {
          'authorization': 'Bearer valid-service-token',
        },
      });

      const response = await getInternalTemplates(request);

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.data.templates).toHaveLength(1);
      expect(json.data.templates[0].id).toBe('internal-template-id');
    });

    it('should return 401 when authorization header is missing', async () => {
      const request = createTestRequest('http://localhost:3000/api/internal/workflow-templates', {
        method: 'GET',
      });

      const response = await getInternalTemplates(request);

      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json.error).toContain('Authorization');
      expect(json.code).toBe('TOKEN_MISSING');
    });

    it('should list templates with custom pagination', async () => {
      mockListTemplates.mockResolvedValue({
        templates: [],
        totalCount: 0,
        page: 3,
        pageSize: 30,
        hasMore: false,
      });

      const request = createTestRequest('http://localhost:3000/api/internal/workflow-templates?page=3&pageSize=30', {
        method: 'GET',
        headers: {
          'authorization': 'Bearer valid-service-token',
        },
      });

      const response = await getInternalTemplates(request);

      expect(response.status).toBe(200);
      expect(mockListTemplates).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 3,
          pageSize: 30,
        })
      );
    });

    it('should filter templates by status in internal API', async () => {
      mockListTemplates.mockResolvedValue({
        templates: [],
        totalCount: 0,
        page: 1,
        pageSize: 20,
        hasMore: false,
      });

      const request = createTestRequest('http://localhost:3000/api/internal/workflow-templates?status=published', {
        method: 'GET',
        headers: {
          'authorization': 'Bearer valid-service-token',
        },
      });

      const response = await getInternalTemplates(request);

      expect(response.status).toBe(200);
      expect(mockListTemplates).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ['published'],
        })
      );
    });

    it('should filter templates by type (Request) in internal API', async () => {
      mockListTemplates.mockResolvedValue({
        templates: [],
        totalCount: 0,
        page: 1,
        pageSize: 20,
        hasMore: false,
      });

      const request = createTestRequest('http://localhost:3000/api/internal/workflow-templates?type=Request', {
        method: 'GET',
        headers: {
          'authorization': 'Bearer valid-service-token',
        },
      });

      const response = await getInternalTemplates(request);

      expect(response.status).toBe(200);
      expect(mockListTemplates).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'Request',
        })
      );
    });

    it('should filter templates by type (MRF) in internal API', async () => {
      mockListTemplates.mockResolvedValue({
        templates: [],
        totalCount: 0,
        page: 1,
        pageSize: 20,
        hasMore: false,
      });

      const request = createTestRequest('http://localhost:3000/api/internal/workflow-templates?type=MRF', {
        method: 'GET',
        headers: {
          'authorization': 'Bearer valid-service-token',
        },
      });

      const response = await getInternalTemplates(request);

      expect(response.status).toBe(200);
      expect(mockListTemplates).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'MRF',
        })
      );
    });

    it('should ignore invalid type parameter in internal API', async () => {
      mockListTemplates.mockResolvedValue({
        templates: [],
        totalCount: 0,
        page: 1,
        pageSize: 20,
        hasMore: false,
      });

      const request = createTestRequest('http://localhost:3000/api/internal/workflow-templates?type=InvalidType', {
        method: 'GET',
        headers: {
          'authorization': 'Bearer valid-service-token',
        },
      });

      const response = await getInternalTemplates(request);

      expect(response.status).toBe(200);
      expect(mockListTemplates).toHaveBeenCalledWith(
        expect.objectContaining({
          type: undefined,
        })
      );
    });

    it('should combine status and type filters in internal API', async () => {
      mockListTemplates.mockResolvedValue({
        templates: [],
        totalCount: 0,
        page: 1,
        pageSize: 20,
        hasMore: false,
      });

      const request = createTestRequest('http://localhost:3000/api/internal/workflow-templates?status=published&type=Request', {
        method: 'GET',
        headers: {
          'authorization': 'Bearer valid-service-token',
        },
      });

      const response = await getInternalTemplates(request);

      expect(response.status).toBe(200);
      expect(mockListTemplates).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ['published'],
          type: 'Request',
        })
      );
    });

    it('should use account from service token context', async () => {
      mockListTemplates.mockResolvedValue({
        templates: [],
        totalCount: 0,
        page: 1,
        pageSize: 20,
        hasMore: false,
      });

      mockVerifyServiceToken.mockResolvedValue({
        iss: 'groupize',
        aud: 'workflows-api',
        sub: 'service:rails',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        nbf: Math.floor(Date.now() / 1000),
        context: {
          user_id: 'service:rails',
          account_id: 'rails-account-456',
          organization_id: 'rails-org-789',
        },
      } as any);

      const request = createTestRequest('http://localhost:3000/api/internal/workflow-templates', {
        method: 'GET',
        headers: {
          'authorization': 'Bearer valid-service-token',
        },
      });

      const response = await getInternalTemplates(request);

      expect(response.status).toBe(200);
      expect(mockListTemplates).toHaveBeenCalledWith(
        expect.objectContaining({
          account: 'rails-account-456',
          organization: 'rails-org-789',
        })
      );
    });

    it('should return 400 for invalid page number in internal API', async () => {
      mockListTemplates.mockRejectedValue(new Error('Page must be greater than 0'));

      const request = createTestRequest('http://localhost:3000/api/internal/workflow-templates?page=-1', {
        method: 'GET',
        headers: {
          'authorization': 'Bearer valid-service-token',
        },
      });

      const response = await getInternalTemplates(request);

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toContain('Page must be greater than 0');
    });

    it('should return 500 on database error in internal API', async () => {
      mockListTemplates.mockRejectedValue(new Error('MongoDB connection timeout'));

      const request = createTestRequest('http://localhost:3000/api/internal/workflow-templates', {
        method: 'GET',
        headers: {
          'authorization': 'Bearer valid-service-token',
        },
      });

      const response = await getInternalTemplates(request);

      expect(response.status).toBe(500);
      const json = await response.json();
      expect(json.error).toBe('MongoDB connection timeout');
    });

    it('should cap pageSize at 100 for internal API', async () => {
      mockListTemplates.mockResolvedValue({
        templates: [],
        totalCount: 0,
        page: 1,
        pageSize: 100,
        hasMore: false,
      });

      const request = createTestRequest('http://localhost:3000/api/internal/workflow-templates?pageSize=250', {
        method: 'GET',
        headers: {
          'authorization': 'Bearer valid-service-token',
        },
      });

      const response = await getInternalTemplates(request);

      expect(response.status).toBe(200);
      expect(mockListTemplates).toHaveBeenCalledWith(
        expect.objectContaining({
          pageSize: 100,
        })
      );
    });
  });

  describe('POST /api/internal/workflow-templates', () => {
    it('should create template from Rails backend', async () => {
      const templateData = {
        metadata: createMockMetadata(),
        workflowDefinition: { steps: [] },
      };

      const createdTemplate = createMockTemplate({
        id: 'rails-created-template',
        account: 'rails-account',
        ...templateData,
      });

      mockCreateTemplate.mockResolvedValue(createdTemplate);

      const request = createTestRequest('http://localhost:3000/api/internal/workflow-templates', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'authorization': 'Bearer valid-service-token',
        },
      });

      mockVerifyServiceToken.mockResolvedValue({
        iss: 'groupize',
        aud: 'workflows-api',
        sub: 'service:rails',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        nbf: Math.floor(Date.now() / 1000),
        context: {
          user_id: 'service:rails',
          account_id: 'rails-account',
          organization_id: undefined,
        },
      } as any);

      Object.defineProperty(request, 'json', {
        value: jest.fn().mockResolvedValue(templateData),
      });

      const response = await postInternalTemplate(request);

      expect(response.status).toBe(201);
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.data.id).toBe('rails-created-template');
      expect(json.data.account).toBe('rails-account');
    });

    it('should create template with organization for internal caller', async () => {
      const templateData = {
        metadata: createMockMetadata({ label: 'Org Template' }),
        workflowDefinition: { steps: [] },
      };

      const createdTemplate = createMockTemplate({
        id: 'org-internal-template',
        account: 'rails-account',
        organization: 'rails-org',
        ...templateData,
      });

      mockCreateTemplate.mockResolvedValue(createdTemplate);

      mockVerifyServiceToken.mockResolvedValue({
        iss: 'groupize',
        aud: 'workflows-api',
        sub: 'service:rails',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        nbf: Math.floor(Date.now() / 1000),
        context: {
          user_id: 'service:rails',
          account_id: 'rails-account',
          organization_id: 'rails-org',
        },
      } as any);

      const request = createTestRequest('http://localhost:3000/api/internal/workflow-templates', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'authorization': 'Bearer valid-service-token',
        },
      });

      Object.defineProperty(request, 'json', {
        value: jest.fn().mockResolvedValue(templateData),
      });

      const response = await postInternalTemplate(request);

      expect(response.status).toBe(201);
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.data.organization).toBe('rails-org');
    });

    it('should return 201 with created template metadata', async () => {
      const templateData = {
        metadata: createMockMetadata({
          label: 'Complex Template',
          description: 'A complex internal template',
        }),
        workflowDefinition: {
          steps: [
            {
              id: 'step1',
              label: 'Start',
              type: 'trigger',
            },
          ],
        },
      };

      const createdTemplate = createMockTemplate({
        id: 'complex-template',
        ...templateData,
      });

      mockCreateTemplate.mockResolvedValue(createdTemplate);

      const request = createTestRequest('http://localhost:3000/api/internal/workflow-templates', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'authorization': 'Bearer valid-service-token',
        },
      });

      Object.defineProperty(request, 'json', {
        value: jest.fn().mockResolvedValue(templateData),
      });

      const response = await postInternalTemplate(request);

      expect(response.status).toBe(201);
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.data.version).toBeDefined();
      expect(json.data.metadata.label).toBe('Complex Template');
      expect(json.data.workflowDefinition.steps).toHaveLength(1);
    });

    it('should return 400 for invalid template in internal API', async () => {
      mockCreateTemplate.mockRejectedValue(new Error('Invalid template: workflowDefinition is required'));

      const request = createTestRequest('http://localhost:3000/api/internal/workflow-templates', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'authorization': 'Bearer valid-service-token',
        },
      });

      Object.defineProperty(request, 'json', {
        value: jest.fn().mockResolvedValue({}),
      });

      const response = await postInternalTemplate(request);

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toContain('Invalid template');
    });

    it('should return 500 on internal server error', async () => {
      mockCreateTemplate.mockRejectedValue(new Error('Unexpected database error'));

      const request = createTestRequest('http://localhost:3000/api/internal/workflow-templates', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'authorization': 'Bearer valid-service-token',
        },
      });

      Object.defineProperty(request, 'json', {
        value: jest.fn().mockResolvedValue(createMockTemplate()),
      });

      const response = await postInternalTemplate(request);

      expect(response.status).toBe(500);
      const json = await response.json();
      expect(json.error).toBe('Unexpected database error');
    });

    it('should handle JSON parsing error in internal API', async () => {
      const request = createTestRequest('http://localhost:3000/api/internal/workflow-templates', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'authorization': 'Bearer valid-service-token',
        },
      });

      Object.defineProperty(request, 'json', {
        value: jest.fn().mockRejectedValue(new SyntaxError('Invalid JSON in request')),
      });

      const response = await postInternalTemplate(request);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should return 401 when auth token is invalid', async () => {
      mockVerifyServiceToken.mockRejectedValue(
        new (require('@/app/lib/jwt-verifier').JWTVerificationError)('TOKEN_EXPIRED', 'Token has expired')
      );

      const request = createTestRequest('http://localhost:3000/api/internal/workflow-templates', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'authorization': 'Bearer expired-service-token',
        },
      });

      Object.defineProperty(request, 'json', {
        value: jest.fn().mockResolvedValue({}),
      });

      const response = await postInternalTemplate(request);

      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json.code).toBe('TOKEN_EXPIRED');
    });
  });

  describe('Service caller context and auditing', () => {
    it('should handle multiple internal API calls from different services', async () => {
      const templates1 = createMockTemplate({ account: 'service1-account' });
      const templates2 = createMockTemplate({ account: 'service2-account' });

      mockListTemplates
        .mockResolvedValueOnce({
          templates: [templates1],
          totalCount: 1,
          page: 1,
          pageSize: 20,
          hasMore: false,
        })
        .mockResolvedValueOnce({
          templates: [templates2],
          totalCount: 1,
          page: 1,
          pageSize: 20,
          hasMore: false,
        });

      mockVerifyServiceToken
        .mockResolvedValueOnce({
          iss: 'groupize',
          aud: 'workflows-api',
          sub: 'service:service1',
          exp: Math.floor(Date.now() / 1000) + 3600,
          iat: Math.floor(Date.now() / 1000),
          nbf: Math.floor(Date.now() / 1000),
          context: {
            user_id: 'service:service1',
            account_id: 'service1-account',
            organization_id: undefined,
          },
        } as any)
        .mockResolvedValueOnce({
          iss: 'groupize',
          aud: 'workflows-api',
          sub: 'service:service2',
          exp: Math.floor(Date.now() / 1000) + 3600,
          iat: Math.floor(Date.now() / 1000),
          nbf: Math.floor(Date.now() / 1000),
          context: {
            user_id: 'service:service2',
            account_id: 'service2-account',
            organization_id: undefined,
          },
        } as any);

      const request1 = createTestRequest('http://localhost:3000/api/internal/workflow-templates', {
        headers: { 'authorization': 'Bearer service1-token' },
      });

      const request2 = createTestRequest('http://localhost:3000/api/internal/workflow-templates', {
        headers: { 'authorization': 'Bearer service2-token' },
      });

      const [response1, response2] = await Promise.all([
        getInternalTemplates(request1),
        getInternalTemplates(request2),
      ]);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);

      const json1 = await response1.json();
      const json2 = await response2.json();

      expect(json1.data.templates[0].account).toBe('service1-account');
      expect(json2.data.templates[0].account).toBe('service2-account');
    });
  });
});
