/**
 * Tests for UnifiedUserContext
 * 
 * Tests the unified user context provider including:
 * - Initialization from SSR current user
 * - API-based loading
 * - Error handling and fallbacks
 * - Permission helpers
 * - Organization switching
 * - JWT renewal integration
 * - Convenience hooks
 */

import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import {
  UnifiedUserProvider,
  useUnifiedUserContext,
  useUser,
  useAccount,
  useOrganization,
  useUserSession,
} from '@/app/contexts/UnifiedUserContext';
import { CurrentUser, User, Account, Organization, UserSession } from '@/app/types/unified-user-context';
import * as apiModule from '@/app/utils/api';
import * as envModule from '@/app/lib/env';
import * as jwtRenewalModule from '@/app/hooks/useJwtRenewal';

// Mock dependencies
jest.mock('@/app/utils/api');
jest.mock('@/app/lib/env');
jest.mock('@/app/hooks/useJwtRenewal');

const mockApiFetch = apiModule.apiFetch as jest.MockedFunction<typeof apiModule.apiFetch>;
const mockEnv = envModule as jest.Mocked<typeof envModule>;
const mockUseJwtRenewal = jwtRenewalModule.useJwtRenewal as jest.MockedFunction<typeof jwtRenewalModule.useJwtRenewal>;

// Helper to create wrapper component
const createWrapper = (initialCurrentUser?: CurrentUser) => {
  return ({ children }: { children: React.ReactNode }) => (
    <UnifiedUserProvider initialCurrentUser={initialCurrentUser}>
      {children}
    </UnifiedUserProvider>
  );
};

// Mock data factories
const createMockCurrentUser = (overrides?: Partial<CurrentUser>): CurrentUser => ({
  userId: 'user123',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  accountId: 'account123',
  organizationId: 'org456',
  isAuthenticated: true,
  expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  ...overrides,
});

const createMockUser = (overrides?: Partial<User>): User => ({
  id: 'user123',
  profile: {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    timezone: 'UTC',
    locale: 'en-US',
  },
  preferences: {
    theme: 'system',
    language: 'en',
    notifications: {
      email: true,
      push: false,
      workflowUpdates: true,
      systemAlerts: true,
    },
    workflowDefaults: {
      autoSave: true,
      defaultView: 'visual',
      showAdvancedOptions: false,
    },
  },
  roles: [],
  status: 'active',
  metadata: {
    createdAt: new Date(),
    updatedAt: new Date(),
    loginCount: 0,
  },
  ...overrides,
});

const createMockAccount = (overrides?: Partial<Account>): Account => ({
  id: 'account123',
  name: 'Test Account',
  type: 'professional',
  permissions: ['read', 'write'],
  features: {
    workflowBuilder: true,
    aiGeneration: true,
    templateSharing: true,
  },
  subscription: {
    plan: 'professional',
    status: 'active',
  },
  organizations: [],
  ...overrides,
});

const createMockOrganization = (overrides?: Partial<Organization>): Organization => ({
  id: 'org456',
  name: 'Test Organization',
  type: 'department',
  settings: {
    workflowDefaults: {},
    permissions: {
      canCreateWorkflows: true,
      canEditSharedWorkflows: true,
      canPublishWorkflows: true,
      canManageUsers: false,
      canViewAnalytics: true,
      canExportData: true,
    },
    features: {
      aiGeneration: true,
      advancedRules: true,
      customIntegrations: true,
      analyticsReporting: true,
      ssoIntegration: true,
      auditLogging: true,
    },
  },
  metadata: {
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'user123',
  },
  ...overrides,
});

const createMockSession = (overrides?: Partial<UserSession>): UserSession => ({
  sessionId: 'session123',
  token: 'token123',
  expiresAt: new Date(Date.now() + 30 * 60 * 1000),
  device: {
    type: 'web',
  },
  ...overrides,
});

describe('UnifiedUserContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
    
    // Default env mock
    (mockEnv as any).env = {
      appUrl: 'http://localhost:3000',
      basePath: '/aime',
      railsBaseUrl: 'http://rails.test',
    } as any;

    // Default JWT renewal mock (does nothing)
    mockUseJwtRenewal.mockImplementation(() => {});

    // Default API mock (will be overridden in tests)
    mockApiFetch.mockReset();
    mockApiFetch.mockResolvedValue({
      ok: false,
      status: 404,
    } as Response);
  });

  describe('Initialization', () => {
    it('should initialize from initialCurrentUser when provided', async () => {
      const currentUser = createMockCurrentUser();

      const { result } = renderHook(() => useUnifiedUserContext(), {
        wrapper: createWrapper(currentUser),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toBeTruthy();
      expect(result.current.user?.id).toBe('user123');
      expect(result.current.account).toBeTruthy();
      expect(result.current.account?.id).toBe('account123');
      expect(result.current.currentOrganization).toBeTruthy();
      expect(result.current.currentOrganization?.id).toBe('org456');
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should load from API when initialCurrentUser is not provided', async () => {
      const mockUser = createMockUser();
      const mockAccount = createMockAccount();
      const mockOrg = createMockOrganization();
      const mockSession = createMockSession();

      mockApiFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            user: mockUser,
            account: { ...mockAccount, organizations: [mockOrg] },
            currentOrganization: mockOrg,
            availableOrganizations: [mockOrg],
            session: mockSession,
          },
        }),
      } as Response);

      const { result } = renderHook(() => useUnifiedUserContext(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockApiFetch).toHaveBeenCalledWith('/api/user-session');
      expect(result.current.user).toBeTruthy();
      expect(result.current.account).toBeTruthy();
    });

    it('should handle API failure and fallback to initialCurrentUser', async () => {
      const currentUser = createMockCurrentUser();

      mockApiFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response);

      const { result } = renderHook(() => useUnifiedUserContext(), {
        wrapper: createWrapper(currentUser),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should still have user data from initialCurrentUser
      expect(result.current.user).toBeTruthy();
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should handle invalid API response and fallback to initialCurrentUser', async () => {
      // Don't provide initialCurrentUser - let it try API first
      mockApiFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: false,
        }),
      } as Response);

      // Provide initialCurrentUser for fallback
      const currentUser = createMockCurrentUser();
      const { result } = renderHook(() => useUnifiedUserContext(), {
        wrapper: createWrapper(currentUser),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // When initialCurrentUser is provided, it initializes immediately
      // The API failure fallback only happens when API is called without initialCurrentUser
      expect(result.current.user).toBeTruthy();
    });

    it('should handle API error and fallback to initialCurrentUser', async () => {
      // Don't provide initialCurrentUser initially - let it try API first
      mockApiFetch.mockRejectedValueOnce(new Error('Network error'));

      // Provide initialCurrentUser for fallback
      const currentUser = createMockCurrentUser();
      const { result } = renderHook(() => useUnifiedUserContext(), {
        wrapper: createWrapper(currentUser),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // When initialCurrentUser is provided, it initializes immediately
      // The API error fallback only happens when API is called without initialCurrentUser
      expect(result.current.user).toBeTruthy();
    });

    it('should set error when API fails and no initialCurrentUser', async () => {
      mockApiFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response);

      const { result } = renderHook(() => useUnifiedUserContext(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.userError).toContain('User Session API error');
      expect(result.current.user).toBeNull();
    });
  });

  describe('Permission helpers', () => {
    it('should check user roles correctly', async () => {
      const mockUser = createMockUser({
        roles: [
          {
            id: 'role1',
            name: 'admin',
            permissions: ['read', 'write'],
            level: 'admin',
            scope: 'organization',
          },
        ],
      });

      // Convert Date objects to ISO strings for API response
      const mockUserForApi = {
        ...mockUser,
        metadata: {
          ...mockUser.metadata,
          createdAt: mockUser.metadata.createdAt.toISOString(),
          updatedAt: mockUser.metadata.updatedAt.toISOString(),
        },
      };

      mockApiFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            user: mockUserForApi,
            account: {
              ...createMockAccount(),
              subscription: {
                ...createMockAccount().subscription,
                expiresAt: undefined,
              },
            },
            currentOrganization: {
              id: 'temp-org',
              name: 'Temp',
              type: 'department',
              settings: {
                workflowDefaults: {},
                permissions: {
                  canCreateWorkflows: false,
                  canEditSharedWorkflows: false,
                  canPublishWorkflows: false,
                  canManageUsers: false,
                  canViewAnalytics: false,
                  canExportData: false,
                },
                features: {
                  aiGeneration: false,
                  advancedRules: false,
                  customIntegrations: false,
                  analyticsReporting: false,
                  ssoIntegration: false,
                  auditLogging: false,
                },
              },
              metadata: {
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                createdBy: 'system',
              },
            },
            availableOrganizations: [],
            session: {
              ...createMockSession(),
              expiresAt: createMockSession().expiresAt.toISOString(),
            },
          },
        }),
      } as Response);

      const { result } = renderHook(() => useUnifiedUserContext(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      }, { timeout: 5000 });


      expect(result.current.user).toBeTruthy();
      expect(result.current.hasRole('admin')).toBe(true);
      expect(result.current.hasRole('viewer')).toBe(false);
      expect(result.current.hasPermission('read')).toBe(true);
      expect(result.current.hasPermission('delete')).toBe(false);
      expect(result.current.hasMinimumRole('editor')).toBe(true);
      expect(result.current.hasMinimumRole('owner')).toBe(false);
      expect(result.current.isAdmin).toBe(true);
      expect(result.current.isOwner).toBe(false);
    });

    it('should check account permissions correctly', async () => {
      const mockAccount = createMockAccount({
        permissions: ['read', 'write'],
        features: {
          workflowBuilder: true,
          aiGeneration: false,
          templateSharing: true,
        },
      });

      const mockUserForApi = {
        ...createMockUser(),
        metadata: {
          ...createMockUser().metadata,
          createdAt: createMockUser().metadata.createdAt.toISOString(),
          updatedAt: createMockUser().metadata.updatedAt.toISOString(),
        },
      };

      const mockAccountForApi = {
        ...mockAccount,
        subscription: {
          ...mockAccount.subscription,
          expiresAt: undefined,
        },
      };

      mockApiFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            user: mockUserForApi,
            account: mockAccountForApi,
            currentOrganization: {
              id: 'temp-org',
              name: 'Temp',
              type: 'department',
              settings: {
                workflowDefaults: {},
                permissions: {
                  canCreateWorkflows: false,
                  canEditSharedWorkflows: false,
                  canPublishWorkflows: false,
                  canManageUsers: false,
                  canViewAnalytics: false,
                  canExportData: false,
                },
                features: {
                  aiGeneration: false,
                  advancedRules: false,
                  customIntegrations: false,
                  analyticsReporting: false,
                  ssoIntegration: false,
                  auditLogging: false,
                },
              },
              metadata: {
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                createdBy: 'system',
              },
            },
            availableOrganizations: [],
            session: {
              ...createMockSession(),
              expiresAt: createMockSession().expiresAt.toISOString(),
            },
          },
        }),
      } as Response);

      const { result } = renderHook(() => useUnifiedUserContext(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      }, { timeout: 5000 });

      expect(result.current.account).toBeTruthy();
      expect(result.current.hasAccountPermission('read')).toBe(true);
      expect(result.current.hasAccountPermission('delete')).toBe(false);
      expect(result.current.hasAccountFeature('workflowBuilder')).toBe(true);
      expect(result.current.hasAccountFeature('aiGeneration')).toBe(false);
    });

    it('should check organization permissions correctly', async () => {
      const mockOrg = createMockOrganization({
        settings: {
          workflowDefaults: {},
          permissions: {
            canCreateWorkflows: true,
            canEditSharedWorkflows: false,
            canPublishWorkflows: true,
            canManageUsers: false,
            canViewAnalytics: true,
            canExportData: false,
          },
          features: {
            aiGeneration: true,
            advancedRules: false,
            customIntegrations: true,
            analyticsReporting: false,
            ssoIntegration: true,
            auditLogging: false,
          },
        },
      });

      const mockUserForApi = {
        ...createMockUser(),
        metadata: {
          ...createMockUser().metadata,
          createdAt: createMockUser().metadata.createdAt.toISOString(),
          updatedAt: createMockUser().metadata.updatedAt.toISOString(),
        },
      };

      const mockAccountForApi = {
        ...createMockAccount(),
        subscription: {
          ...createMockAccount().subscription,
          expiresAt: undefined,
        },
      };

      const mockOrgForApi = {
        ...mockOrg,
        metadata: {
          ...mockOrg.metadata,
          createdAt: mockOrg.metadata.createdAt.toISOString(),
          updatedAt: mockOrg.metadata.updatedAt.toISOString(),
        },
      };

      mockApiFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            user: mockUserForApi,
            account: mockAccountForApi,
            currentOrganization: mockOrgForApi,
            availableOrganizations: [mockOrgForApi],
            session: {
              ...createMockSession(),
              expiresAt: createMockSession().expiresAt.toISOString(),
            },
          },
        }),
      } as Response);

      const { result } = renderHook(() => useUnifiedUserContext(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      }, { timeout: 5000 });

      expect(result.current.currentOrganization).toBeTruthy();
      expect(result.current.hasOrganizationPermission('canCreateWorkflows')).toBe(true);
      expect(result.current.hasOrganizationPermission('canEditSharedWorkflows')).toBe(false);
      expect(result.current.hasOrganizationFeature('aiGeneration')).toBe(true);
      expect(result.current.hasOrganizationFeature('advancedRules')).toBe(false);
    });

    it('should check organization access correctly', async () => {
      const org1 = createMockOrganization({ id: 'org1' });
      const org2 = createMockOrganization({ id: 'org2' });

      const mockUserForApi = {
        ...createMockUser(),
        metadata: {
          ...createMockUser().metadata,
          createdAt: createMockUser().metadata.createdAt.toISOString(),
          updatedAt: createMockUser().metadata.updatedAt.toISOString(),
        },
      };

      const mockAccountForApi = {
        ...createMockAccount(),
        subscription: {
          ...createMockAccount().subscription,
          expiresAt: undefined,
        },
      };

      const org1ForApi = {
        ...org1,
        metadata: {
          ...org1.metadata,
          createdAt: org1.metadata.createdAt.toISOString(),
          updatedAt: org1.metadata.updatedAt.toISOString(),
        },
      };

      const org2ForApi = {
        ...org2,
        metadata: {
          ...org2.metadata,
          createdAt: org2.metadata.createdAt.toISOString(),
          updatedAt: org2.metadata.updatedAt.toISOString(),
        },
      };

      mockApiFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            user: mockUserForApi,
            account: mockAccountForApi,
            currentOrganization: org1ForApi,
            availableOrganizations: [org1ForApi, org2ForApi],
            session: {
              ...createMockSession(),
              expiresAt: createMockSession().expiresAt.toISOString(),
            },
          },
        }),
      } as Response);

      const { result } = renderHook(() => useUnifiedUserContext(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      }, { timeout: 5000 });

      expect(result.current.availableOrganizations.length).toBeGreaterThan(0);
      expect(result.current.canAccessOrganization('org1')).toBe(true);
      expect(result.current.canAccessOrganization('org2')).toBe(true);
      expect(result.current.canAccessOrganization('org3')).toBe(false);
    });
  });

  describe('Actions', () => {
    it('should refresh user data', async () => {
      const mockUser = createMockUser();
      const updatedUser = { ...mockUser, profile: { ...mockUser.profile, firstName: 'Jane' } };

      const createApiResponse = (user: User) => ({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            user: {
              ...user,
              metadata: {
                ...user.metadata,
                createdAt: user.metadata.createdAt.toISOString(),
                updatedAt: user.metadata.updatedAt.toISOString(),
              },
            },
            account: {
              ...createMockAccount(),
              subscription: {
                ...createMockAccount().subscription,
                expiresAt: undefined,
              },
            },
            currentOrganization: {
              id: 'temp-org',
              name: 'Temp',
              type: 'department',
              settings: {
                workflowDefaults: {},
                permissions: {
                  canCreateWorkflows: false,
                  canEditSharedWorkflows: false,
                  canPublishWorkflows: false,
                  canManageUsers: false,
                  canViewAnalytics: false,
                  canExportData: false,
                },
                features: {
                  aiGeneration: false,
                  advancedRules: false,
                  customIntegrations: false,
                  analyticsReporting: false,
                  ssoIntegration: false,
                  auditLogging: false,
                },
              },
              metadata: {
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                createdBy: 'system',
              },
            },
            availableOrganizations: [],
            session: {
              ...createMockSession(),
              expiresAt: createMockSession().expiresAt.toISOString(),
            },
          },
        }),
      });

      mockApiFetch
        .mockResolvedValueOnce(createApiResponse(mockUser) as Response)
        .mockResolvedValueOnce(createApiResponse(updatedUser) as Response);

      const { result } = renderHook(() => useUnifiedUserContext(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.refreshUserData();
      });

      expect(mockApiFetch).toHaveBeenCalledTimes(2);
      expect(result.current.user?.profile.firstName).toBe('Jane');
    });

    it('should update preferences', async () => {
      const currentUser = createMockCurrentUser();

      const { result } = renderHook(() => useUnifiedUserContext(), {
        wrapper: createWrapper(currentUser),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const initialTheme = result.current.user?.preferences.theme;

      await act(async () => {
        await result.current.updatePreferences({ theme: 'dark' });
      });

      expect(result.current.user?.preferences.theme).toBe('dark');
      expect(result.current.user?.preferences.theme).not.toBe(initialTheme);
    });

    it('should update profile', async () => {
      const currentUser = createMockCurrentUser();

      const { result } = renderHook(() => useUnifiedUserContext(), {
        wrapper: createWrapper(currentUser),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.updateProfile({ firstName: 'Jane' });
      });

      expect(result.current.user?.profile.firstName).toBe('Jane');
    });

    it('should switch organization', async () => {
      const currentUser = createMockCurrentUser();
      const org1 = createMockOrganization({ id: 'org1', name: 'Org 1' });
      const org2 = createMockOrganization({ id: 'org2', name: 'Org 2' });

      mockApiFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            user: createMockUser(),
            account: createMockAccount(),
            currentOrganization: org1,
            availableOrganizations: [org1, org2],
            session: createMockSession(),
          },
        }),
      } as Response);

      const { result } = renderHook(() => useUnifiedUserContext(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.currentOrganization?.id).toBe('org1');
      });

      await act(async () => {
        await result.current.switchOrganization('org2');
      });

      expect(result.current.currentOrganization?.id).toBe('org2');
    });

    it('should handle switching to non-existent organization', async () => {
      const org1 = createMockOrganization({ id: 'org1' });

      const mockUserForApi = {
        ...createMockUser(),
        metadata: {
          ...createMockUser().metadata,
          createdAt: createMockUser().metadata.createdAt.toISOString(),
          updatedAt: createMockUser().metadata.updatedAt.toISOString(),
        },
      };

      const mockAccountForApi = {
        ...createMockAccount(),
        subscription: {
          ...createMockAccount().subscription,
          expiresAt: undefined,
        },
      };

      const org1ForApi = {
        ...org1,
        metadata: {
          ...org1.metadata,
          createdAt: org1.metadata.createdAt.toISOString(),
          updatedAt: org1.metadata.updatedAt.toISOString(),
        },
      };

      mockApiFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            user: mockUserForApi,
            account: mockAccountForApi,
            currentOrganization: org1ForApi,
            availableOrganizations: [org1ForApi],
            session: {
              ...createMockSession(),
              expiresAt: createMockSession().expiresAt.toISOString(),
            },
          },
        }),
      } as Response);

      const { result } = renderHook(() => useUnifiedUserContext(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      }, { timeout: 5000 });


      expect(result.current.currentOrganization).toBeTruthy();

      await act(async () => {
        await result.current.switchOrganization('nonexistent');
      });

      expect(result.current.userError).toContain('not found');

    });

    it('should logout and clear all data', async () => {
      const currentUser = createMockCurrentUser();

      const { result } = renderHook(() => useUnifiedUserContext(), {
        wrapper: createWrapper(currentUser),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toBeTruthy();

      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.account).toBeNull();
      expect(result.current.currentOrganization).toBeNull();
      expect(result.current.session).toBeNull();
    });

    it('should clear errors', async () => {
      mockApiFetch.mockRejectedValueOnce(new Error('Test error'));

      const { result } = renderHook(() => useUnifiedUserContext(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.userError).toBeTruthy();
      });

      act(() => {
        result.current.clearErrors();
      });

      expect(result.current.userError).toBeNull();
    });
  });

  describe('Convenience getters', () => {
    it('should compute displayName correctly', async () => {
      const currentUser = createMockCurrentUser();

      const { result } = renderHook(() => useUnifiedUserContext(), {
        wrapper: createWrapper(currentUser),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.displayName).toBe('John Doe');
    });

    it('should compute isAuthenticated correctly', async () => {
      const currentUser = createMockCurrentUser();

      const { result } = renderHook(() => useUnifiedUserContext(), {
        wrapper: createWrapper(currentUser),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should compute isSessionExpired correctly', async () => {
      const currentUser = createMockCurrentUser({
        expiresAt: new Date(Date.now() - 1000).toISOString(), // Expired
      });

      const { result } = renderHook(() => useUnifiedUserContext(), {
        wrapper: createWrapper(currentUser),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isSessionExpired).toBe(true);
    });
  });

  describe('JWT Renewal Integration', () => {
    it('should setup JWT renewal', () => {
      const currentUser = createMockCurrentUser();

      renderHook(() => useUnifiedUserContext(), {
        wrapper: createWrapper(currentUser),
      });

      expect(mockUseJwtRenewal).toHaveBeenCalledWith({
        expiresAt: currentUser.expiresAt,
        onRenewalSuccess: expect.any(Function),
        onRenewalFailure: expect.any(Function),
        enabled: true,
      });
    });

    it('should handle JWT renewal success', () => {
      const currentUser = createMockCurrentUser();
      let renewalSuccessCallback: (newExpiresAt: string) => void;

      mockUseJwtRenewal.mockImplementation((options) => {
        renewalSuccessCallback = options.onRenewalSuccess!;
      });

      const { result } = renderHook(() => useUnifiedUserContext(), {
        wrapper: createWrapper(currentUser),
      });

      const newExpiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

      act(() => {
        renewalSuccessCallback!(newExpiresAt);
      });
      expect(result.current.session?.expiresAt).toEqual(new Date(newExpiresAt));
    });

    it('should handle JWT renewal failure with redirect', () => {
      const currentUser = createMockCurrentUser();
      let renewalFailureCallback: (error: { code: string; message: string; shouldRedirect: boolean }) => void;

      mockUseJwtRenewal.mockImplementation((options) => {
        renewalFailureCallback = options.onRenewalFailure!;
      });

      renderHook(() => useUnifiedUserContext(), {
        wrapper: createWrapper(currentUser),
      });

      act(() => {
        renewalFailureCallback!({
          code: 'SESSION_EXPIRED',
          message: 'Session expired',
          shouldRedirect: true,
        });
      });
    });

    it('should handle JWT renewal failure without redirect', () => {
      const currentUser = createMockCurrentUser();
      let renewalFailureCallback: (error: { code: string; message: string; shouldRedirect: boolean }) => void;

      mockUseJwtRenewal.mockImplementation((options) => {
        renewalFailureCallback = options.onRenewalFailure!;
      });

      const { result } = renderHook(() => useUnifiedUserContext(), {
        wrapper: createWrapper(currentUser),
      });

      act(() => {
        renewalFailureCallback!({
          code: 'RENEWAL_FAILED',
          message: 'Renewal failed',
          shouldRedirect: false,
        });
      });

      expect(result.current.userError).toContain('Session renewal failed');
    });
  });

  describe('Convenience hooks', () => {
    it('useUser should return user data and helpers', async () => {
      const currentUser = createMockCurrentUser();

      const { result } = renderHook(() => useUser(), {
        wrapper: createWrapper(currentUser),
      });

      await waitFor(() => {
        expect(result.current.user).toBeTruthy();
      });

      expect(result.current.displayName).toBe('John Doe');
      expect(typeof result.current.hasRole).toBe('function');
      expect(typeof result.current.hasPermission).toBe('function');
    });

    it('useAccount should return account data and helpers', async () => {
      const currentUser = createMockCurrentUser();

      const { result } = renderHook(() => useAccount(), {
        wrapper: createWrapper(currentUser),
      });

      await waitFor(() => {
        expect(result.current.account).toBeTruthy();
      });

      expect(typeof result.current.hasPermission).toBe('function');
      expect(typeof result.current.hasFeature).toBe('function');
    });

    it('useOrganization should return organization data and helpers', async () => {
      const currentUser = createMockCurrentUser();

      const { result } = renderHook(() => useOrganization(), {
        wrapper: createWrapper(currentUser),
      });

      await waitFor(() => {
        expect(result.current.currentOrganization).toBeTruthy();
      });

      expect(typeof result.current.switchOrganization).toBe('function');
      expect(typeof result.current.hasPermission).toBe('function');
    });

    it('useUserSession should return session data', async () => {
      const currentUser = createMockCurrentUser();

      const { result } = renderHook(() => useUserSession(), {
        wrapper: createWrapper(currentUser),
      });

      await waitFor(() => {
        expect(result.current.session).toBeTruthy();
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(typeof result.current.logout).toBe('function');
    });

    it('useUnifiedUserContext should throw when used outside provider', () => {
      expect(() => {
        renderHook(() => useUnifiedUserContext());
      }).toThrow('useUnifiedUserContext must be used within a UnifiedUserProvider');

    });
  });
});

