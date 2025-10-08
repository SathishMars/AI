// src/test/app/hooks/useWorkflowTemplateV2.test.tsx
/**
 * Tests for useWorkflowTemplateV2 Hook
 * 
 * Tests new hook with WorkflowTemplate type system.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useWorkflowTemplateV2 } from '@/app/hooks/useWorkflowTemplateV2';
import { WorkflowTemplate, WorkflowDefinition } from '@/app/types/workflow-template-v2';
import { isValidShortId } from '@/app/utils/short-id-generator';
import * as UnifiedUserContext from '@/app/contexts/UnifiedUserContext';

// Mock the context
jest.mock('@/app/contexts/UnifiedUserContext', () => ({
  useUnifiedUserContext: jest.fn()
}));

// Mock fetch globally
global.fetch = jest.fn();

describe('useWorkflowTemplateV2', () => {
  const mockAccountId = 'account123';
  const mockOrgId = 'org456';
  const mockAccount = { id: mockAccountId, name: 'Test Account' };
  const mockOrg = { id: mockOrgId, name: 'Test Org' };
  
  const mockTemplate: WorkflowTemplate = {
    _id: 'mongo123',
    account: mockAccountId,
    organization: mockOrgId,
    id: 'a1b2c3d4e5',
    version: '1.0.0',
    name: 'Test Workflow',
    status: 'draft',
    workflowDefinition: {
      steps: [
        {
          id: 'step1',
          name: 'Start: Test Step',
          type: 'trigger',
          action: 'onMRFSubmit',
          params: {}
        }
      ]
    },
    mermaidDiagram: 'graph TD; step1[Start] --> step2[End];',
    metadata: {
      name: 'Test Workflow',
      status: 'draft',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      author: 'Test User',
      tags: []
    }
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default context mock
    (UnifiedUserContext.useUnifiedUserContext as jest.Mock).mockReturnValue({
      account: mockAccount,
      currentOrganization: mockOrg,
      isLoading: false
    });
    
    // Reset fetch mock
    (global.fetch as jest.Mock).mockReset();
  });
  
  describe('Basic Initialization', () => {
    it('should initialize with null template', () => {
      const { result } = renderHook(() => useWorkflowTemplateV2({ autoLoad: false }));
      
      expect(result.current.template).toBeNull();
      expect(result.current.workflow).toBeNull();
      expect(result.current.workflowJSON).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
    
    it('should compute isNewTemplate correctly', () => {
      const { result } = renderHook(() => useWorkflowTemplateV2({ autoLoad: false }));
      expect(result.current.isNewTemplate).toBe(true);
    });
    
    it('should compute hasUnsavedChanges as false initially', () => {
      const { result } = renderHook(() => useWorkflowTemplateV2({ autoLoad: false }));
      expect(result.current.hasUnsavedChanges).toBe(false);
    });
    
    it('should compute canAutoSave as false with no template', () => {
      const { result } = renderHook(() => useWorkflowTemplateV2({ autoLoad: false }));
      expect(result.current.canAutoSave).toBe(false);
    });
  });
  
  describe('Load Template', () => {
    it('should load template by ID', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTemplate
      });
      
      const { result } = renderHook(() => useWorkflowTemplateV2({ autoLoad: false }));
      
      await act(async () => {
        await result.current.loadTemplate('a1b2c3d4e5');
      });
      
      await waitFor(() => {
        expect(result.current.template).toEqual(mockTemplate);
        expect(result.current.workflow).toEqual(mockTemplate.workflowDefinition);
        expect(result.current.isLoading).toBe(false);
      });
    });
    
    it('should set loading state during load', async () => {
      (global.fetch as jest.Mock).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => mockTemplate
        }), 100))
      );
      
      const { result } = renderHook(() => useWorkflowTemplateV2({ autoLoad: false }));
      
      act(() => {
        result.current.loadTemplate('a1b2c3d4e5');
      });
      
      expect(result.current.isLoading).toBe(true);
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      }, { timeout: 200 });
    });
    
    it('should handle load errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found'
      });
      
      const { result } = renderHook(() => useWorkflowTemplateV2({ autoLoad: false }));
      
      await act(async () => {
        await result.current.loadTemplate('nonexistent');
      });
      
      await waitFor(() => {
        expect(result.current.error).toContain('Not Found');
        expect(result.current.template).toBeNull();
      });
    });
    
    it('should auto-load template on mount if specified', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTemplate
      });
      
      renderHook(() => useWorkflowTemplateV2({ 
        templateId: 'a1b2c3d4e5',
        autoLoad: true 
      }));
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/workflow-templates/a1b2c3d4e5',
          expect.objectContaining({
            headers: expect.objectContaining({
              'x-account': mockAccountId,
              'x-organization': mockOrgId
            })
          })
        );
      });
    });
    
    it('should not auto-load if autoLoad is false', () => {
      renderHook(() => useWorkflowTemplateV2({ 
        templateId: 'a1b2c3d4e5',
        autoLoad: false 
      }));
      
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });
  
  describe('Create Template', () => {
    it('should create new template', async () => {
      const newTemplate: WorkflowTemplate = {
        ...mockTemplate,
        name: 'New Workflow',
        metadata: {
          ...mockTemplate.metadata,
          name: 'New Workflow'
        },
        workflowDefinition: { steps: [] }
      };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => newTemplate
      });
      
      const { result } = renderHook(() => useWorkflowTemplateV2({ autoLoad: false }));
      
      let created: WorkflowTemplate | null = null;
      await act(async () => {
        created = await result.current.createTemplate('New Workflow', 'Test description');
      });
      
      expect(created).toEqual(newTemplate);
      expect(result.current.template).toEqual(newTemplate);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/workflow-templates',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'x-account': mockAccountId,
            'x-organization': mockOrgId
          }),
          body: expect.stringContaining('New Workflow')
        })
      );
    });
    
    it('should throw error if no account context', async () => {
      (UnifiedUserContext.useUnifiedUserContext as jest.Mock).mockReturnValue({
        account: null,
        currentOrganization: null,
        isLoading: false
      });
      
      const { result } = renderHook(() => useWorkflowTemplateV2({ autoLoad: false }));
      
      await expect(async () => {
        await act(async () => {
          await result.current.createTemplate('New Workflow');
        });
      }).rejects.toThrow('No account context available');
    });
    
    it('should handle creation errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: 'Bad Request'
      });
      
      const { result } = renderHook(() => useWorkflowTemplateV2({ autoLoad: false }));
      
      // Should throw error
      await expect(
        act(async () => {
          await result.current.createTemplate('New Workflow');
        })
      ).rejects.toThrow('Bad Request');
    });
  });
  
  describe('Initialize New Template', () => {
    it('should initialize template in memory without API call', () => {
      const { result } = renderHook(() => useWorkflowTemplateV2({ autoLoad: false }));
      
      act(() => {
        result.current.initializeNewTemplate('Test Workflow', 'Test description');
      });
      
      expect(result.current.template).toBeTruthy();
  expect(result.current.template?.name).toBe('Test Workflow');
  expect(result.current.template?.id).toBeDefined();
  expect(isValidShortId(result.current.template?.id ?? '')).toBe(true);
      expect(result.current.template?.status).toBe('draft');
      expect(result.current.template?.metadata.description).toBe('Test description');
      expect(result.current.template?.metadata.author).toBe('Test Account');
      expect(result.current.isNewTemplate).toBe(true);
      
      // Should NOT make any API calls
      expect(global.fetch).not.toHaveBeenCalled();
    });
    
    it('should initialize with empty steps', () => {
      const { result } = renderHook(() => useWorkflowTemplateV2({ autoLoad: false }));
      
      act(() => {
        result.current.initializeNewTemplate('Empty Workflow');
      });
      
      expect(result.current.template?.workflowDefinition.steps).toEqual([]);
      expect(result.current.workflow?.steps).toEqual([]);
    });
    
    it('should throw error if no account context', () => {
      (UnifiedUserContext.useUnifiedUserContext as jest.Mock).mockReturnValue({
        account: null,
        currentOrganization: null,
        isLoading: false
      });
      
      const { result } = renderHook(() => useWorkflowTemplateV2({ autoLoad: false }));
      
      expect(() => {
        act(() => {
          result.current.initializeNewTemplate('Test Workflow');
        });
      }).toThrow('No account context available');
    });
    
    it('should set canAutoSave to false for new template', () => {
      const { result } = renderHook(() => useWorkflowTemplateV2({ autoLoad: false }));
      
      act(() => {
        result.current.initializeNewTemplate('new', 'Test description');
      });
      
      // canAutoSave should be false because name is 'new' (excluded name)
      expect(result.current.canAutoSave).toBe(false);
    });
  });
  
  describe('Update Workflow Definition', () => {
    it('should update workflow definition locally', async () => {
      const { result } = renderHook(() => useWorkflowTemplateV2({ autoLoad: false }));
      
      // Set initial template
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTemplate
      });
      
      await act(async () => {
        await result.current.loadTemplate('a1b2c3d4e5');
      });
      
      const newDefinition: WorkflowDefinition = {
        steps: [
          {
            id: 'step1',
            name: 'Start: Updated Step',
            type: 'trigger',
            action: 'onMRFSubmit',
            params: {}
          }
        ]
      };
      
      await act(async () => {
        await result.current.updateWorkflowDefinition(newDefinition);
      });
      
      expect(result.current.workflow).toEqual(newDefinition);
      expect(result.current.template?.mermaidDiagram).toBeUndefined();
    });
    
    it('should auto-save when criteria met', async () => {
      const { result } = renderHook(() => useWorkflowTemplateV2({ 
        autoLoad: false,
        autoSave: true 
      }));
      
      // Set initial template with valid name
      const validTemplate: WorkflowTemplate = {
        ...mockTemplate,
        name: 'Valid Workflow',  // Valid name for auto-save
        metadata: {
          ...mockTemplate.metadata,
          name: 'Valid Workflow'
        }
      };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => validTemplate
      });
      
      await act(async () => {
        await result.current.loadTemplate('a1b2c3d4e5');
      });
      (global.fetch as jest.Mock).mockClear();
      
      const newDefinition: WorkflowDefinition = {
        steps: [
          {
            id: 'step1',
            name: 'Start: Updated Step',
            type: 'trigger',
            action: 'onMRFSubmit',
            params: {}
          }
        ]
      };
      
      await act(async () => {
        await result.current.updateWorkflowDefinition(newDefinition);
      });
      expect(global.fetch).not.toHaveBeenCalled();

      const updatedMermaid = 'graph TD; step1[Start] --> step2[End];';

      // Mock save response for mermaid-ready auto-save
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...validTemplate,
          workflowDefinition: newDefinition,
          mermaidDiagram: updatedMermaid
        })
      });

      await act(async () => {
        await result.current.updateWorkflowDefinition(newDefinition, {
          mermaidDiagram: updatedMermaid
        });
      });
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          `/api/workflow-templates/${validTemplate.id}`,
          expect.objectContaining({
            method: 'PUT',
            body: expect.stringContaining(updatedMermaid)
          })
        );
      });
    });
    
    it('should not auto-save if criteria not met', async () => {
      const { result } = renderHook(() => useWorkflowTemplateV2({ 
        autoLoad: false,
        autoSave: true 
      }));
      
      // Set initial template with invalid name
      const invalidTemplate: WorkflowTemplate = {
        ...mockTemplate,
        name: 'new',  // Invalid name - should not auto-save
        metadata: {
          ...mockTemplate.metadata,
          name: 'new'
        }
      };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => invalidTemplate
      });
      
      await act(async () => {
        await result.current.loadTemplate('a1b2c3d4e5');
      });
      
      // Clear fetch calls
      (global.fetch as jest.Mock).mockClear();
      
      const newDefinition: WorkflowDefinition = {
        steps: []  // Empty steps - should not auto-save
      };
      
      await act(async () => {
        await result.current.updateWorkflowDefinition(newDefinition);
      });
      
      // Should NOT have called save API
      expect(global.fetch).not.toHaveBeenCalled();
    });
    
    it('should not auto-save if autoSave disabled', async () => {
      const { result } = renderHook(() => useWorkflowTemplateV2({ 
        autoLoad: false,
        autoSave: false 
      }));
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTemplate
      });
      
      await act(async () => {
        await result.current.loadTemplate('a1b2c3d4e5');
      });
      
      // Clear fetch calls
      (global.fetch as jest.Mock).mockClear();
      
      const newDefinition: WorkflowDefinition = {
        steps: [
          {
            id: 'step1',
            name: 'Start: Updated Step',
            type: 'trigger',
            action: 'onMRFSubmit',
            params: {}
          }
        ]
      };
      
      await act(async () => {
        await result.current.updateWorkflowDefinition(newDefinition, {
          mermaidDiagram: 'graph TD; A-->B;'
        });
      });
      
      // Should NOT have called save API
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });
  
  describe('Update Template Name', () => {
    it('should update template name', async () => {
      const { result } = renderHook(() => useWorkflowTemplateV2({ autoLoad: false }));
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTemplate
      });
      
      await act(async () => {
        await result.current.loadTemplate('a1b2c3d4e5');
      });
      
      const updatedTemplate = {
        ...mockTemplate,
        name: 'Updated Name',
        metadata: {
          ...mockTemplate.metadata,
          name: 'Updated Name'
        }
      };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => updatedTemplate
      });
      
      await act(async () => {
        await result.current.updateTemplateName('Updated Name');
      });
      
      expect(result.current.template?.name).toBe('Updated Name');
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/workflow-templates/${mockTemplate.id}`,
        expect.objectContaining({
          method: 'PUT',
          body: expect.stringContaining('Updated Name')
        })
      );
    });
    
    it('should throw error if no template loaded', async () => {
      const { result } = renderHook(() => useWorkflowTemplateV2({ autoLoad: false }));
      
      await expect(async () => {
        await act(async () => {
          await result.current.updateTemplateName('New Name');
        });
      }).rejects.toThrow('No template loaded');
    });
  });
  
  describe('Manual Save', () => {
    it('should save template manually', async () => {
      const { result } = renderHook(() => useWorkflowTemplateV2({ autoLoad: false }));
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTemplate
      });
      
      await act(async () => {
        await result.current.loadTemplate('a1b2c3d4e5');
      });
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTemplate
      });
      
      await act(async () => {
        await result.current.saveTemplate();
      });
      
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/workflow-templates/${mockTemplate.id}`,
        expect.objectContaining({
          method: 'PUT',
          body: expect.stringContaining('mermaidDiagram')
        })
      );
    });
    
    it('should set saving state during save', async () => {
      const { result } = renderHook(() => useWorkflowTemplateV2({ autoLoad: false }));
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTemplate
      });
      
      await act(async () => {
        await result.current.loadTemplate('a1b2c3d4e5');
      });
      
      (global.fetch as jest.Mock).mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => mockTemplate
        }), 100))
      );
      
      act(() => {
        result.current.saveTemplate();
      });
      
      expect(result.current.isSaving).toBe(true);
      
      await waitFor(() => {
        expect(result.current.isSaving).toBe(false);
      }, { timeout: 200 });
    });
  });
  
  describe('Utility Functions', () => {
    it('should clear error', () => {
      const { result } = renderHook(() => useWorkflowTemplateV2({ autoLoad: false }));
      
      // Set an error
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: 'Error'
      });
      
      act(() => {
        result.current.loadTemplate('bad-id');
      });
      
      waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });
      
      act(() => {
        result.current.clearError();
      });
      
      expect(result.current.error).toBeNull();
    });
    
    it('should reset to original template', async () => {
      const { result } = renderHook(() => useWorkflowTemplateV2({ autoLoad: false }));
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTemplate
      });
      
      await act(async () => {
        await result.current.loadTemplate('a1b2c3d4e5');
      });
      
      // Make a change
      const newDefinition: WorkflowDefinition = {
        steps: []
      };
      
      await act(async () => {
        await result.current.updateWorkflowDefinition(newDefinition);
      });
      
      expect(result.current.workflow?.steps).toHaveLength(0);
      
      // Reset
      act(() => {
        result.current.reset();
      });
      
      expect(result.current.workflow?.steps).toHaveLength(1);
    });
  });
  
  describe('Computed Properties', () => {
    it('should compute hasUnsavedChanges correctly', async () => {
      const { result } = renderHook(() => useWorkflowTemplateV2({ autoLoad: false }));
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTemplate
      });
      
      await act(async () => {
        await result.current.loadTemplate('a1b2c3d4e5');
      });
      
      expect(result.current.hasUnsavedChanges).toBe(false);
      
      // Make a change
      await act(async () => {
        await result.current.updateWorkflowDefinition({ steps: [] });
      });
      
      expect(result.current.hasUnsavedChanges).toBe(true);
    });
    
    it('should compute canAutoSave correctly', async () => {
      const { result } = renderHook(() => useWorkflowTemplateV2({ autoLoad: false }));
      
      // Template with invalid name
      const invalidTemplate = {
        ...mockTemplate,
        name: 'new'
      };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => invalidTemplate
      });
      
      await act(async () => {
        await result.current.loadTemplate('a1b2c3d4e5');
      });
      
      expect(result.current.canAutoSave).toBe(true);

      // Update to invalid name
      const invalidTemplateUpdate = {
        ...mockTemplate,
        name: 'new',
        metadata: {
          ...mockTemplate.metadata,
          name: 'new'
        }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => invalidTemplateUpdate
      });

      await act(async () => {
        await result.current.updateTemplateName('new');
      });

      expect(result.current.canAutoSave).toBe(false);

      // Update back to valid name
      const validTemplate = {
        ...invalidTemplateUpdate,
        name: 'Valid Name',
        metadata: {
          ...invalidTemplateUpdate.metadata,
          name: 'Valid Name'
        }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => validTemplate
      });

      await act(async () => {
        await result.current.updateTemplateName('Valid Name');
      });

      expect(result.current.canAutoSave).toBe(true);
    });
    
    it('should provide workflowJSON for backward compatibility', async () => {
      const { result } = renderHook(() => useWorkflowTemplateV2({ autoLoad: false }));
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTemplate
      });
      
      await act(async () => {
        await result.current.loadTemplate('a1b2c3d4e5');
      });
      
      expect(result.current.workflowJSON).toBeTruthy();
      expect(result.current.workflowJSON?.steps).toEqual(mockTemplate.workflowDefinition.steps);
    });
  });
});
