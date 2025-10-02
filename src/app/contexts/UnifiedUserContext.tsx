// src/app/contexts/UnifiedUserContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  User,
  Account,
  Organization,
  UserSession,
  UnifiedUserContextState,
  UnifiedUserProviderProps,
  UserPreferences,
  UserProfile,
  UserRole
} from '@/app/types/unified-user-context';

// Create the context
const UnifiedUserContext = createContext<UnifiedUserContextState | undefined>(undefined);

/**
 * Unified User Context Provider
 * Provides complete user session context including user, account, and organization data
 */
export function UnifiedUserProvider({ children }: UnifiedUserProviderProps) {
  // State for all user-related data
  const [user, setUser] = useState<User | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [availableOrganizations, setAvailableOrganizations] = useState<Organization[]>([]);
  const [session, setSession] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userError, setUserError] = useState<string | null>(null);

  // Base URL for API calls
  const baseUrl = typeof window !== 'undefined' 
    ? window.location.origin 
    : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  /**
   * Load complete user session data from unified API
   */
  const loadUserSession = useCallback(async () => {
    try {
      setIsLoading(true);
      setUserError(null);

      const response = await fetch(`${baseUrl}/api/user-session`);
      
      if (!response.ok) {
        throw new Error(`User Session API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success || !data.data) {
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
      setUserError(error instanceof Error ? error.message : 'Failed to load user session');
    } finally {
      setIsLoading(false);
    }
  }, [baseUrl]);

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
   * Logout user and clear all session data
   */
  const logout = useCallback(async () => {
    try {
      // TODO: Call API to invalidate session
      setUser(null);
      setAccount(null);
      setCurrentOrganization(null);
      setAvailableOrganizations([]);
      setSession(null);
      
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

  // Load user session on mount
  useEffect(() => {
    loadUserSession();
  }, [loadUserSession]);

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