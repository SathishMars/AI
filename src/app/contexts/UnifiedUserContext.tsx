// src/app/contexts/UnifiedUserContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/app/utils/api';
import { useJwtRenewal } from '@/app/hooks/useJwtRenewal';
import { 
  User,
  Account,
  Organization,
  UserSession,
  UnifiedUserContextState,
  UnifiedUserProviderProps,
  UserPreferences,
  UserProfile,
  UserRole,
  CurrentUser
} from '@/app/types/unified-user-context';

// Create the context
const UnifiedUserContext = createContext<UnifiedUserContextState | undefined>(undefined);

/**
 * Unified User Context Provider
 * Provides complete user session context including user, account, and organization data
 * 
 * Updated to work with new JWT authentication:
 * - Accepts initialCurrentUser from SSR (prevents hydration mismatch)
 * - Can bootstrap user data from current user
 * - Maintains backward compatibility with API-based loading
 */
export function UnifiedUserProvider({ children, initialCurrentUser }: UnifiedUserProviderProps) {
  // State for all user-related data
  const [user, setUser] = useState<User | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [availableOrganizations, setAvailableOrganizations] = useState<Organization[]>([]);
  const [session, setSession] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userError, setUserError] = useState<string | null>(null);
  const [sessionExpiresAt, setSessionExpiresAt] = useState<string | undefined>(
    initialCurrentUser?.expiresAt
  );

  // baseUrl intentionally not used in this provider

  /**
   * Initialize user data from current user (SSR initial data)
   * Creates minimal user/account/org data from current user for immediate use
   */
  const initializeFromCurrentUser = useCallback((currentUser: CurrentUser) => {
    // Create minimal user from current user
    const initializedUser: User = {
      id: currentUser.userId,
      profile: {
        firstName: currentUser.firstName,
        lastName: currentUser.lastName,
        email: currentUser.email,
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
    };
    
    // Create minimal account from current user
    const initializedAccount: Account = {
      id: currentUser.accountId,
      name: 'Account',
      type: 'professional',
      permissions: [],
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
    };
    
    // Create minimal organization if available
    let initializedOrg: Organization | null = null;
    if (currentUser.organizationId) {
      initializedOrg = {
        id: currentUser.organizationId,
        name: 'Organization',
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
          createdBy: currentUser.userId,
        },
      };
    }
    
    // Create minimal session from current user
    const expiresAt = currentUser.expiresAt 
      ? new Date(currentUser.expiresAt)
      : new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    const initializedSession: UserSession = {
      sessionId: `session-${currentUser.userId}-${Date.now()}`,
      token: '', // Not needed for embedded mode (JWT in cookie)
      expiresAt,
      device: {
        type: 'web',
      },
    };
    
    setUser(initializedUser);
    setAccount(initializedAccount);
    setCurrentOrganization(initializedOrg);
    setAvailableOrganizations(initializedOrg ? [initializedOrg] : []);
    setSession(initializedSession);
    
    // Update session expiry for JWT renewal
    if (currentUser.expiresAt) {
      setSessionExpiresAt(currentUser.expiresAt);
    }
  }, []);

  /**
   * Load complete user session data from unified API
   */
  const loadUserSession = useCallback(async () => {
    try {
      setIsLoading(true);
      setUserError(null);

      const response = await apiFetch('/api/user-session');
      
      if (!response.ok) {
        // If API fails but we have current user data, that's okay
        if (initialCurrentUser && initialCurrentUser.isAuthenticated) {
          console.log('[UnifiedUserContext] API failed, initializing from current user data');
          initializeFromCurrentUser(initialCurrentUser);
          setIsLoading(false);
          return;
        }
        // For 401 (Unauthorized), gracefully handle - insights pages don't require auth
        if (response.status === 401) {
          console.log('[UnifiedUserContext] 401 Unauthorized - continuing without authentication (insights mode)');
          setIsLoading(false);
          return;
        }
        throw new Error(`User Session API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success || !data.data) {
        // If API returns invalid data but we have current user, use it
        if (initialCurrentUser && initialCurrentUser.isAuthenticated) {
          console.log('[UnifiedUserContext] Invalid API response, initializing from current user data');
          initializeFromCurrentUser(initialCurrentUser);
          setIsLoading(false);
          return;
        }
        throw new Error('Invalid user session response format');
      }

      const { user: userData, account: accountData, currentOrganization: currentOrgData, availableOrganizations: availableOrgsData, session: sessionData } = data.data;
      
      // Convert date strings to Date objects
      const enrichedUser: User = {
        ...userData,
        metadata: {
          ...userData.metadata,
          createdAt: new Date(userData.metadata.createdAt),
          updatedAt: new Date(userData.metadata.updatedAt),
          lastLoginAt: userData.metadata.lastLoginAt ? new Date(userData.metadata.lastLoginAt) : undefined
        }
      };

      const enrichedOrganizations: Organization[] = availableOrgsData.map((org: Organization) => ({
        ...org,
        metadata: {
          ...org.metadata,
          createdAt: new Date(org.metadata.createdAt),
          updatedAt: new Date(org.metadata.updatedAt)
        }
      }));

      const enrichedCurrentOrg: Organization = {
        ...currentOrgData,
        metadata: {
          ...currentOrgData.metadata,
          createdAt: new Date(currentOrgData.metadata.createdAt),
          updatedAt: new Date(currentOrgData.metadata.updatedAt)
        }
      };

      const enrichedSession: UserSession = {
        ...sessionData,
        expiresAt: new Date(sessionData.expiresAt)
      };

      const enrichedAccount: Account = {
        ...accountData,
        organizations: enrichedOrganizations,
        subscription: {
          ...accountData.subscription,
          expiresAt: accountData.subscription.expiresAt ? new Date(accountData.subscription.expiresAt) : undefined
        }
      };

      setUser(enrichedUser);
      setAccount(enrichedAccount);
      setCurrentOrganization(enrichedCurrentOrg);
      setAvailableOrganizations(enrichedOrganizations);
      setSession(enrichedSession);

    } catch (error) {
      console.error('Failed to load user session:', error);
      
      // Fall back to current user data if available
      if (initialCurrentUser && initialCurrentUser.isAuthenticated) {
        console.log('[UnifiedUserContext] Error loading session, initializing from current user data');
        initializeFromCurrentUser(initialCurrentUser);
      } else {
        setUserError(error instanceof Error ? error.message : 'Failed to load user session');
      }
    } finally {
      setIsLoading(false);
    }
  }, [initialCurrentUser, initializeFromCurrentUser]);

  /**
   * Switch to a different organization
   */
  const switchOrganization = useCallback(async (organizationId: string) => {
    try {
      const organization = availableOrganizations.find(org => org.id === organizationId);
      
      if (!organization) {
        throw new Error(`Organization ${organizationId} not found`);
      }

      setCurrentOrganization(organization);
      
      // TODO: Persist organization preference to backend
      
    } catch (error) {
      console.error('Failed to switch organization:', error);
      setUserError(error instanceof Error ? error.message : 'Failed to switch organization');
    }
  }, [availableOrganizations]);

  /**
   * Update user preferences
   */
  const updatePreferences = useCallback(async (preferences: Partial<UserPreferences>) => {
    if (!user) return;

    try {
      // TODO: Call API to update preferences
      const updatedUser: User = {
        ...user,
        preferences: { ...user.preferences, ...preferences },
        metadata: { ...user.metadata, updatedAt: new Date() }
      };
      
      setUser(updatedUser);
      
    } catch (error) {
      console.error('Failed to update preferences:', error);
      setUserError(error instanceof Error ? error.message : 'Failed to update preferences');
    }
  }, [user]);

  /**
   * Update user profile
   */
  const updateProfile = useCallback(async (profile: Partial<UserProfile>) => {
    if (!user) return;

    try {
      // TODO: Call API to update profile
      const updatedUser: User = {
        ...user,
        profile: { ...user.profile, ...profile },
        metadata: { ...user.metadata, updatedAt: new Date() }
      };
      
      setUser(updatedUser);
      
    } catch (error) {
      console.error('Failed to update profile:', error);
      setUserError(error instanceof Error ? error.message : 'Failed to update profile');
    }
  }, [user]);

  /**
   * Logout user and clear all session data (standalone mode only)
   */
  const logout = useCallback(async () => {
    try {
      setUser(null);
      setAccount(null);
      setCurrentOrganization(null);
      setAvailableOrganizations([]);
      setSession(null);
      setSessionExpiresAt(undefined);
    } catch (error) {
      console.error('Failed to logout:', error);
      setUserError(error instanceof Error ? error.message : 'Failed to logout');
    }
  }, []);

  /**
   * Refresh all user session data
   */
  const refreshUserData = useCallback(async () => {
    await loadUserSession();
  }, [loadUserSession]);

  /**
   * Clear all errors
   */
  const clearErrors = useCallback(() => {
    setUserError(null);
  }, []);

  /**
   * Handle successful JWT renewal
   */
  const handleRenewalSuccess = useCallback((newExpiresAt: string) => {
    console.log('[UnifiedUserContext] JWT renewed successfully, new expiry:', newExpiresAt);
    setSessionExpiresAt(newExpiresAt);
    
    // Update session object if it exists
    if (session) {
      setSession({
        ...session,
        expiresAt: new Date(newExpiresAt),
      });
    }
  }, [session]);

  /**
   * Handle JWT renewal failure
   */
  const handleRenewalFailure = useCallback((error: { code: string; message: string; shouldRedirect: boolean; redirectUrl?: string }) => {
    console.error('[UnifiedUserContext] JWT renewal failed:', error);  
    if (error.shouldRedirect && error.redirectUrl) {
      window.location.href = error.redirectUrl;
    } else if (error.shouldRedirect) {
      console.warn('[UnifiedUserContext] Redirect required but no redirectUrl provided');
      setUserError(`Session renewal failed: ${error.message}`);
    } else {
      setUserError(`Session renewal failed: ${error.message}`);
    }
  }, []);

  useJwtRenewal({
    expiresAt: sessionExpiresAt,
    onRenewalSuccess: handleRenewalSuccess,
    onRenewalFailure: handleRenewalFailure,
    enabled: !!sessionExpiresAt,
  });

  // Permission helper functions
  const hasRole = useCallback((roleName: string): boolean => {
    return user?.roles?.some(role => role.name === roleName) ?? false;
  }, [user]);

  const hasPermission = useCallback((permission: string): boolean => {
    return user?.roles?.some(role => role.permissions.includes(permission)) ?? false;
  }, [user]);

  const hasMinimumRole = useCallback((level: UserRole['level']): boolean => {
    const roleLevels = ['viewer', 'editor', 'admin', 'owner'];
    const requiredLevelIndex = roleLevels.indexOf(level);
    
    return user?.roles?.some(role => {
      const userLevelIndex = roleLevels.indexOf(role.level);
      return userLevelIndex >= requiredLevelIndex;
    }) ?? false;
  }, [user]);

  const hasAccountPermission = useCallback((permission: string): boolean => {
    return account?.permissions?.includes(permission) ?? false;
  }, [account]);

  const hasAccountFeature = useCallback((feature: string): boolean => {
    return account?.features?.[feature as keyof typeof account.features] ?? false;
  }, [account]);

  const hasOrganizationPermission = useCallback((permission: keyof Organization['settings']['permissions']): boolean => {
    return currentOrganization?.settings.permissions[permission] ?? false;
  }, [currentOrganization]);

  const hasOrganizationFeature = useCallback((feature: keyof Organization['settings']['features']): boolean => {
    return currentOrganization?.settings.features[feature] ?? false;
  }, [currentOrganization]);

  const canAccessOrganization = useCallback((organizationId: string): boolean => {
    return availableOrganizations.some(org => org.id === organizationId);
  }, [availableOrganizations]);

  // Convenience getters
  const displayName = user ? `${user.profile.firstName} ${user.profile.lastName}` : '';
  const isAdmin = hasMinimumRole('admin');
  const isOwner = hasMinimumRole('owner');
  const isAuthenticated = !!session && !!user;
  const isSessionExpired = session ? new Date() > session.expiresAt : true;

  // Initialize user data on mount
  useEffect(() => {
    // If we have initialCurrentUser from SSR, initialize immediately
    if (initialCurrentUser && initialCurrentUser.isAuthenticated) {
      console.log('[UnifiedUserContext] Initializing from SSR current user');
      initializeFromCurrentUser(initialCurrentUser);
      setIsLoading(false);
      
      // Optionally load full data in background (comment out if not needed)
      // loadUserSession();
    } else {
      // Otherwise load from API
      loadUserSession();
    }
  }, [initialCurrentUser, initializeFromCurrentUser, loadUserSession]);

  // Context value
  const contextValue: UnifiedUserContextState = {
    // Data
    user,
    account,
    currentOrganization,
    availableOrganizations,
    session,
    
    // Loading states
    isLoading,
    userError,
    
    // Actions
    refreshUserData,
    updatePreferences,
    updateProfile,
    switchOrganization,
    logout,
    clearErrors,
    
    // Permission helpers
    hasRole,
    hasPermission,
    hasMinimumRole,
    hasAccountPermission,
    hasAccountFeature,
    hasOrganizationPermission,
    hasOrganizationFeature,
    canAccessOrganization,
    
    // Convenience getters
    displayName,
    isAdmin,
    isOwner,
    isAuthenticated,
    isSessionExpired
  };

  return (
    <UnifiedUserContext.Provider value={contextValue}>
      {children}
    </UnifiedUserContext.Provider>
  );
}

/**
 * Hook to use the unified user context
 */
export function useUnifiedUserContext(): UnifiedUserContextState {
  const context = useContext(UnifiedUserContext);
  
  if (context === undefined) {
    throw new Error('useUnifiedUserContext must be used within a UnifiedUserProvider');
  }
  
  return context;
}

/**
 * Convenience hooks for specific data types (backward compatibility)
 */
export function useUser() {
  const { user, isLoading, userError, displayName, hasRole, hasPermission, hasMinimumRole, isAdmin, isOwner } = useUnifiedUserContext();
  
  return {
    user,
    isLoading,
    error: userError,
    displayName,
    hasRole,
    hasPermission,
    hasMinimumRole,
    isAdmin,
    isOwner
  };
}

export function useAccount() {
  const { account, isLoading, hasAccountPermission, hasAccountFeature } = useUnifiedUserContext();
  
  return {
    account,
    isLoading,
    hasPermission: hasAccountPermission,
    hasFeature: hasAccountFeature
  };
}

export function useOrganization() {
  const { 
    currentOrganization, 
    availableOrganizations, 
    switchOrganization, 
    hasOrganizationPermission, 
    hasOrganizationFeature,
    canAccessOrganization,
    isLoading
  } = useUnifiedUserContext();
  
  return {
    currentOrganization,
    availableOrganizations,
    switchOrganization,
    hasPermission: hasOrganizationPermission,
    hasFeature: hasOrganizationFeature,
    canAccessOrganization,
    isLoading
  };
}

export function useUserSession() {
  const { session, logout, isAuthenticated, isSessionExpired } = useUnifiedUserContext();
  
  return {
    session,
    logout,
    isAuthenticated,
    isSessionExpired
  };
}