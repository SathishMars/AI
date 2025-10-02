// src/test/app/contexts/UnifiedUserContext.test.tsx

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { UnifiedUserProvider, useUnifiedUserContext, useUser, useAccount, useOrganization } from '@/app/contexts/UnifiedUserContext';

// Mock fetch for testing
global.fetch = jest.fn();

// Test component that uses the unified context
function TestUnifiedComponent() {
  const { 
    user, 
    account, 
    currentOrganization, 
    isLoading, 
    displayName, 
    hasRole, 
    hasAccountPermission,
    hasOrganizationPermission,
    isAuthenticated
  } = useUnifiedUserContext();
  
  if (isLoading) {
    return <div>Loading...</div>;
  }
  
  return (
    <div>
      <div data-testid="user-name">{displayName || 'No User'}</div>
      <div data-testid="account-name">{account?.name || 'No Account'}</div>
      <div data-testid="organization-name">{currentOrganization?.name || 'No Organization'}</div>
      <div data-testid="user-email">{user?.profile.email || 'No Email'}</div>
      <div data-testid="is-authenticated">{isAuthenticated ? 'Yes' : 'No'}</div>
      <div data-testid="has-workflow-role">{hasRole('Workflow Editor') ? 'Yes' : 'No'}</div>
      <div data-testid="has-write-permission">{hasAccountPermission('write') ? 'Yes' : 'No'}</div>
      <div data-testid="can-create-workflows">{hasOrganizationPermission('canCreateWorkflows') ? 'Yes' : 'No'}</div>
    </div>
  );
}

// Test component for individual hooks
function TestIndividualHooks() {
  const { displayName } = useUser();
  const { account } = useAccount();
  const { currentOrganization } = useOrganization();
  
  return (
    <div>
      <div data-testid="hook-user-name">{displayName || 'No User'}</div>
      <div data-testid="hook-account-name">{account?.name || 'No Account'}</div>
      <div data-testid="hook-organization-name">{currentOrganization?.name || 'No Organization'}</div>
    </div>
  );
}

describe('UnifiedUserContext', () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
  });

  it('should provide unified user, account, and organization data', async () => {
    // Mock successful API response with complete data
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          user: {
            id: 'test-user-123',
            profile: {
              firstName: 'Jane',
              lastName: 'Smith',
              email: 'jane.smith@test.com',
              timezone: 'America/New_York',
              locale: 'en-US'
            },
            preferences: {
              theme: 'light',
              language: 'en',
              notifications: { email: true, push: false, workflowUpdates: true, systemAlerts: false },
              workflowDefaults: { autoSave: true, defaultView: 'visual', showAdvancedOptions: false }
            },
            roles: [
              {
                id: 'role-1',
                name: 'Workflow Editor',
                permissions: ['workflow.create', 'workflow.edit'],
                level: 'editor',
                scope: 'organization'
              }
            ],
            status: 'active',
            metadata: {
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-02T00:00:00Z',
              loginCount: 15
            }
          },
          account: {
            id: 'test-account',
            name: 'Test Account',
            type: 'demo',
            permissions: ['read', 'write'],
            features: { workflowBuilder: true, aiGeneration: true, templateSharing: false },
            subscription: { plan: 'demo', status: 'active' },
            organizations: []
          },
          currentOrganization: {
            id: 'test-org',
            name: 'Test Organization',
            type: 'department',
            settings: {
              workflowDefaults: {},
              permissions: {
                canCreateWorkflows: true,
                canEditSharedWorkflows: false,
                canPublishWorkflows: true,
                canManageUsers: false,
                canViewAnalytics: true,
                canExportData: false
              },
              features: {
                aiGeneration: true,
                advancedRules: false,
                customIntegrations: false,
                analyticsReporting: true,
                ssoIntegration: false,
                auditLogging: true
              }
            },
            metadata: {
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z',
              createdBy: 'system'
            }
          },
          availableOrganizations: [],
          session: {
            sessionId: 'session-123',
            token: 'test-token',
            expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
            device: { type: 'web', browser: 'Chrome' }
          }
        }
      })
    });

    render(
      <UnifiedUserProvider>
        <TestUnifiedComponent />
      </UnifiedUserProvider>
    );

    // Initially should show loading
    expect(screen.getByText('Loading...')).toBeInTheDocument();

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByTestId('user-name')).toHaveTextContent('Jane Smith');
    });

    // Check all data types are loaded correctly
    expect(screen.getByTestId('account-name')).toHaveTextContent('Test Account');
    expect(screen.getByTestId('organization-name')).toHaveTextContent('Test Organization');
    expect(screen.getByTestId('user-email')).toHaveTextContent('jane.smith@test.com');
    expect(screen.getByTestId('is-authenticated')).toHaveTextContent('Yes');

    // Check permission system works
    expect(screen.getByTestId('has-workflow-role')).toHaveTextContent('Yes');
    expect(screen.getByTestId('has-write-permission')).toHaveTextContent('Yes');
    expect(screen.getByTestId('can-create-workflows')).toHaveTextContent('Yes');
  });

  it('should handle API errors gracefully', async () => {
    // Mock failed API response
    (fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'));

    render(
      <UnifiedUserProvider>
        <TestUnifiedComponent />
      </UnifiedUserProvider>
    );

    // Wait for error state
    await waitFor(() => {
      expect(screen.getByTestId('user-name')).toHaveTextContent('No User');
    });

    expect(screen.getByTestId('account-name')).toHaveTextContent('No Account');
    expect(screen.getByTestId('is-authenticated')).toHaveTextContent('No');
  });

  it('should provide backward-compatible individual hooks', async () => {
    // Mock successful API response
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          user: {
            id: 'test-user',
            profile: { firstName: 'John', lastName: 'Doe', email: 'john@test.com', timezone: 'UTC', locale: 'en-US' },
            preferences: { theme: 'light', language: 'en', notifications: { email: true, push: false, workflowUpdates: true, systemAlerts: false }, workflowDefaults: { autoSave: true, defaultView: 'visual', showAdvancedOptions: false } },
            roles: [],
            status: 'active',
            metadata: { createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z', loginCount: 1 }
          },
          account: {
            id: 'test-account-2',
            name: 'Test Account 2',
            type: 'demo',
            permissions: [],
            features: { workflowBuilder: true, aiGeneration: true, templateSharing: true },
            subscription: { plan: 'demo', status: 'active' },
            organizations: []
          },
          currentOrganization: {
            id: 'test-org-2',
            name: 'Test Org 2',
            type: 'department',
            settings: {
              workflowDefaults: {},
              permissions: { canCreateWorkflows: true, canEditSharedWorkflows: true, canPublishWorkflows: true, canManageUsers: true, canViewAnalytics: true, canExportData: true },
              features: { aiGeneration: true, advancedRules: true, customIntegrations: true, analyticsReporting: true, ssoIntegration: true, auditLogging: true }
            },
            metadata: { createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z', createdBy: 'system' }
          },
          availableOrganizations: [],
          session: {
            sessionId: 'session-456',
            token: 'test-token-2',
            expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()
          }
        }
      })
    });

    render(
      <UnifiedUserProvider>
        <TestIndividualHooks />
      </UnifiedUserProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('hook-user-name')).toHaveTextContent('John Doe');
    });

    expect(screen.getByTestId('hook-account-name')).toHaveTextContent('Test Account 2');
    expect(screen.getByTestId('hook-organization-name')).toHaveTextContent('Test Org 2');
  });

  it('should throw error when used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => {
      render(<TestUnifiedComponent />);
    }).toThrow('useUnifiedUserContext must be used within a UnifiedUserProvider');
    
    consoleSpy.mockRestore();
  });
});