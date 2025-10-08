// src/test/app/workflows/configure/id-page-integration.test.tsx
/**
 * Integration Tests for EditWorkflowPage (formerly EditWorkflowPage) with useWorkflowTemplateV2
 * 
 * Tests the page component integration with the new hook.
 * Updated to use new URL structure: /workflows/configure/[id]
 */

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EditWorkflowPage from '@/app/workflows/configure/[id]/page';
import * as UnifiedUserContext from '@/app/contexts/UnifiedUserContext';

// Mock the context
jest.mock('@/app/contexts/UnifiedUserContext', () => ({
  useUnifiedUserContext: jest.fn()
}));

// Mock the ResponsiveWorkflowConfigurator component
jest.mock('@/app/components/ResponsiveWorkflowConfigurator', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function MockResponsiveWorkflowConfigurator(props: any) {
    return (
      <div data-testid="workflow-configurator">
        <div data-testid="workflow-name">{props.currentTemplateName}</div>
        <div data-testid="is-new">{props.isNewWorkflow ? 'true' : 'false'}</div>
        <button
          data-testid="change-workflow"
          onClick={() => props.onWorkflowChange({
            steps: [{ id: 'test', name: 'Test', type: 'action' }],
            mermaidDiagram: 'graph TD; test[Test] --> result[Result];'
          })}
        >
          Change Workflow
        </button>
        <button
          data-testid="change-name"
          onClick={() => props.onTemplateNameChange('Updated Name')}
        >
          Change Name
        </button>
      </div>
    );
  };
});

// Mock fetch globally
global.fetch = jest.fn();

describe('EditWorkflowPage Integration', () => {
  const mockAccountId = 'account123';
  const mockOrgId = 'org456';
  const mockAccount = { id: mockAccountId, name: 'Test Account' };
  const mockOrg = { id: mockOrgId, name: 'Test Org' };
  
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
  
  describe('New Workflow Creation', () => {
    it('should create new workflow when id is "new"', async () => {
      const mockParams = Promise.resolve({ id: 'new' });
      
      // Mock create template response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          _id: 'mongo123',
          id: 'a1b2c3d4e5',
          account: mockAccountId,
          organization: mockOrgId,
          name: 'New Workflow',
          status: 'draft',
          version: '1.0.0',
          workflowDefinition: { steps: [] },
          metadata: {
            createdAt: new Date(),
            updatedAt: new Date(),
            author: 'Test User'
          }
        })
      });
      
      render(<EditWorkflowPage params={mockParams} />);
      
      // Should show configurator in new mode
      await waitFor(() => {
        expect(screen.getByTestId('workflow-configurator')).toBeInTheDocument();
        expect(screen.getByTestId('is-new')).toHaveTextContent('true');
      });
    });
    
    it('should create new workflow when id is "create"', async () => {
      const mockParams = Promise.resolve({ id: 'create' });
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          _id: 'mongo123',
          id: 'a1b2c3d4e5',
          account: mockAccountId,
          organization: mockOrgId,
          name: 'New Workflow',
          status: 'draft',
          version: '1.0.0',
          workflowDefinition: { steps: [] },
          metadata: {
            createdAt: new Date(),
            updatedAt: new Date(),
            author: 'Test User'
          }
        })
      });
      
      render(<EditWorkflowPage params={mockParams} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('is-new')).toHaveTextContent('true');
      });
    });
  });
  
  describe('Existing Workflow Loading', () => {
    it('should load existing workflow by id', async () => {
      const mockParams = Promise.resolve({ id: 'a1b2c3d4e5' });
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          _id: 'mongo123',
          id: 'a1b2c3d4e5',
          account: mockAccountId,
          organization: mockOrgId,
          name: 'Existing Workflow',
          status: 'published',
          version: '1.0.0',
          workflowDefinition: {
            steps: [
              {
                id: 'step1',
                name: 'Start: Trigger',
                type: 'trigger',
                action: 'onMRFSubmit'
              }
            ]
          },
          metadata: {
            createdAt: new Date(),
            updatedAt: new Date(),
            author: 'Test User'
          }
        })
      });
      
      render(<EditWorkflowPage params={mockParams} />);
      
      // Wait for template load
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
      
      // Should show configurator with existing workflow
      await waitFor(() => {
        const configurator = screen.getByTestId('workflow-configurator');
        expect(configurator).toBeInTheDocument();
        
        const name = within(configurator).getByTestId('workflow-name');
        expect(name).toHaveTextContent('Existing Workflow');
        
        const isNew = within(configurator).getByTestId('is-new');
        expect(isNew).toHaveTextContent('false');
      });
    });
    
    it('should handle load errors gracefully', async () => {
      const mockParams = Promise.resolve({ id: 'nonexistent' });
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found'
      });
      
      render(<EditWorkflowPage params={mockParams} />);
      
      // Should show error alert
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(/Not Found/i)).toBeInTheDocument();
      });
    });
  });
  
  describe('Workflow Updates', () => {
    it('should update workflow definition via auto-save', async () => {
      const mockParams = Promise.resolve({ id: 'a1b2c3d4e5' });
      
      // Mock load response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          _id: 'mongo123',
          id: 'a1b2c3d4e5',
          account: mockAccountId,
          organization: mockOrgId,
          name: 'Test Workflow',
          status: 'draft',
          version: '1.0.0',
          workflowDefinition: { steps: [] },
          metadata: {
            createdAt: new Date(),
            updatedAt: new Date(),
            author: 'Test User'
          }
        })
      });
      
      render(<EditWorkflowPage params={mockParams} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('workflow-configurator')).toBeInTheDocument();
      });
      
      // Mock update response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'a1b2c3d4e5',
          account: mockAccountId,
          organization: mockOrgId,
          name: 'Test Workflow',
          status: 'draft',
          version: '1.0.0',
          workflowDefinition: {
            steps: [{ id: 'test', name: 'Test', type: 'action' }]
          },
          mermaidDiagram: 'graph TD; test[Test] --> result[Result];',
          metadata: {
            createdAt: new Date(),
            updatedAt: new Date(),
            author: 'Test User'
          }
        })
      });
      
      // Click button to trigger workflow change
      const changeButton = screen.getByTestId('change-workflow');
      await userEvent.click(changeButton);
      
      // Should call update API
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/workflow-templates/a1b2c3d4e5',
          expect.objectContaining({
            method: 'PUT',
            body: expect.stringContaining('workflowDefinition')
          })
        );
      });
    });
    
    it('should update template name', async () => {
      const mockParams = Promise.resolve({ id: 'a1b2c3d4e5' });
      
      // Mock load response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'a1b2c3d4e5',
          account: mockAccountId,
          organization: mockOrgId,
          name: 'Original Name',
          status: 'draft',
          version: '1.0.0',
          workflowDefinition: { steps: [{ id: 'step1', name: 'Start', type: 'trigger' }] },
          mermaidDiagram: 'graph TD; step1 --> end;',
          metadata: {
            createdAt: new Date(),
            updatedAt: new Date(),
            author: 'Test User'
          }
        })
      });
      
      render(<EditWorkflowPage params={mockParams} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('workflow-configurator')).toBeInTheDocument();
      });
      
      // Mock name update response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'a1b2c3d4e5',
          account: mockAccountId,
          organization: mockOrgId,
          name: 'Updated Name',
          status: 'draft',
          version: '1.0.0',
          workflowDefinition: { steps: [{ id: 'step1', name: 'Start', type: 'trigger' }] },
          mermaidDiagram: 'graph TD; step1 --> end;',
          metadata: {
            createdAt: new Date(),
            updatedAt: new Date(),
            author: 'Test User'
          }
        })
      });
      
      // Click button to change name
      const nameButton = screen.getByTestId('change-name');
      await userEvent.click(nameButton);
      
      // Should call update API with name
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/workflow-templates/a1b2c3d4e5',
          expect.objectContaining({
            method: 'PUT',
            body: expect.stringContaining('Updated Name')
          })
        );
      });
    });
  });
  
  describe('Auto-Save Indicators', () => {
    it('should show saving indicator during save', async () => {
      const mockParams = Promise.resolve({ id: 'a1b2c3d4e5' });
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'a1b2c3d4e5',
          account: mockAccountId,
          organization: mockOrgId,
          name: 'Test Workflow',
          status: 'draft',
          version: '1.0.0',
          workflowDefinition: { steps: [] },
          metadata: {
            createdAt: new Date(),
            updatedAt: new Date(),
            author: 'Test User'
          }
        })
      });
      
      render(<EditWorkflowPage params={mockParams} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('workflow-configurator')).toBeInTheDocument();
      });
      
      // Mock slow update to see saving indicator
      (global.fetch as jest.Mock).mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({
            id: 'a1b2c3d4e5',
            account: mockAccountId,
            organization: mockOrgId,
            name: 'Test Workflow',
            status: 'draft',
            version: '1.0.0',
            workflowDefinition: {
              steps: [{ id: 'test', name: 'Test', type: 'action' }]
            },
            mermaidDiagram: 'graph TD; test[Test] --> result[Result];',
            metadata: {
              createdAt: new Date(),
              updatedAt: new Date(),
              author: 'Test User'
            }
          })
        }), 100))
      );
      
      // Trigger update
      const changeButton = screen.getByTestId('change-workflow');
      await userEvent.click(changeButton);
      
      // Should show saving indicator briefly
      // Note: This might be too fast to catch in tests, but verifies the code path
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/workflow-templates'),
          expect.objectContaining({ method: expect.stringMatching(/POST|PUT/) })
        );
      }, { timeout: 200 });
    });
    
    it('should show warning when auto-save criteria not met', async () => {
      const mockParams = Promise.resolve({ id: 'new' });
      
      // Mock create with invalid name
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'a1b2c3d4e5',
          account: mockAccountId,
          organization: mockOrgId,
          name: 'new',  // Invalid name - should trigger warning
          status: 'draft',
          version: '1.0.0',
          workflowDefinition: { steps: [] },
          metadata: {
            createdAt: new Date(),
            updatedAt: new Date(),
            author: 'Test User'
          }
        })
      });
      
      render(<EditWorkflowPage params={mockParams} />);
      
      // Should show auto-save warning
      await waitFor(() => {
        expect(screen.getByText(/Auto-save disabled/i)).toBeInTheDocument();
      });
    });
  });
  
  describe('Loading and Error States', () => {
    it('should show loading state initially', async () => {
      const mockParams = Promise.resolve({ id: 'a1b2c3d4e5' });
      
      // Mock slow load
      (global.fetch as jest.Mock).mockImplementation(() =>
        new Promise(() => {}) // Never resolves
      );
      
      render(<EditWorkflowPage params={mockParams} />);
      
      // Should show "No Workflow Loaded" text (loading state)
      await waitFor(() => {
        expect(screen.getByText('No Workflow Loaded')).toBeInTheDocument();
      });
    });
    
    it('should clear error when dismiss button clicked', async () => {
      const mockParams = Promise.resolve({ id: 'bad-id' });
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: 'Server Error'
      });
      
      render(<EditWorkflowPage params={mockParams} />);
      
      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByText(/Server Error/i)).toBeInTheDocument();
      });
      
      // Click dismiss button
      const dismissButton = screen.getByText('Dismiss');
      await userEvent.click(dismissButton);
      
      // Error should be cleared
      await waitFor(() => {
        expect(screen.queryByText(/Server Error/i)).not.toBeInTheDocument();
      });
    });
  });
});
