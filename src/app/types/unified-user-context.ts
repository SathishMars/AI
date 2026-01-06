// Unified User Context Types
// Combines user, account, and organization data in a single coherent context

/**
 * CurrentUser type for SSR/initial authentication data
 * Used for bootstrapping user context from middleware/JWT claims
 */
export interface CurrentUser {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  accountId: string;
  organizationId?: string;
  fullName?: string;
  isAuthenticated?: boolean;
  expiresAt?: string; // ISO 8601 timestamp from JWT exp claim
}

export interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
  phone?: string;
  timezone: string;
  locale: string;
  title?: string;
  department?: string;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  notifications: {
    email: boolean;
    push: boolean;
    workflowUpdates: boolean;
    systemAlerts: boolean;
  };
  workflowDefaults: {
    autoSave: boolean;
    defaultView: 'visual' | 'code' | 'hybrid';
    showAdvancedOptions: boolean;
  };
}

export interface UserRole {
  id: string;
  name: string;
  permissions: string[];
  level: 'viewer' | 'editor' | 'admin' | 'owner';
  scope: 'organization' | 'account' | 'global';
}

export interface Organization {
  id: string;
  name: string;
  type: 'department' | 'subsidiary' | 'division' | 'team';
  parentId?: string;
  description?: string;
  settings: {
    workflowDefaults: Record<string, unknown>;
    permissions: {
      canCreateWorkflows: boolean;
      canEditSharedWorkflows: boolean;
      canPublishWorkflows: boolean;
      canManageUsers: boolean;
      canViewAnalytics: boolean;
      canExportData: boolean;
    };
    features: {
      aiGeneration: boolean;
      advancedRules: boolean;
      customIntegrations: boolean;
      analyticsReporting: boolean;
      ssoIntegration: boolean;
      auditLogging: boolean;
    };
  };
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
  };
}

export interface Account {
  id: string;
  name: string;
  type: 'demo' | 'trial' | 'basic' | 'professional' | 'enterprise';
  permissions: string[];
  features: {
    workflowBuilder: boolean;
    aiGeneration: boolean;
    templateSharing: boolean;
  };
  subscription: {
    plan: string;
    status: 'active' | 'suspended' | 'cancelled';
    expiresAt?: Date;
  };
  organizations: Organization[];
}

export interface User {
  id: string;
  profile: UserProfile;
  preferences: UserPreferences;
  roles: UserRole[];
  status: 'active' | 'inactive' | 'suspended';
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    lastLoginAt?: Date;
    loginCount: number;
  };
}

export interface UserSession {
  sessionId: string;
  token: string;
  expiresAt: Date;
  refreshToken?: string;
  device?: {
    type: 'web' | 'mobile' | 'desktop';
    browser?: string;
    os?: string;
    ip?: string;
  };
}

export interface UnifiedUserContextState {
  // User data
  user: User | null;
  account: Account | null;
  currentOrganization: Organization | null;
  availableOrganizations: Organization[];
  session: UserSession | null;
  
  // Loading states
  isLoading: boolean;
  userError: string | null;
  
  // Actions
  refreshUserData: () => Promise<void>;
  updatePreferences: (preferences: Partial<UserPreferences>) => Promise<void>;
  updateProfile: (profile: Partial<UserProfile>) => Promise<void>;
  switchOrganization: (organizationId: string) => Promise<void>;
  logout: () => Promise<void>;
  clearErrors: () => void;
  
  // User permission helpers
  hasRole: (roleName: string) => boolean;
  hasPermission: (permission: string) => boolean;
  hasMinimumRole: (level: UserRole['level']) => boolean;
  
  // Account permission helpers
  hasAccountPermission: (permission: string) => boolean;
  hasAccountFeature: (feature: string) => boolean;
  
  // Organization permission helpers
  hasOrganizationPermission: (permission: keyof Organization['settings']['permissions']) => boolean;
  hasOrganizationFeature: (feature: keyof Organization['settings']['features']) => boolean;
  canAccessOrganization: (organizationId: string) => boolean;
  
  // Convenience getters
  displayName: string;
  isAdmin: boolean;
  isOwner: boolean;
  isAuthenticated: boolean;
  isSessionExpired: boolean;
}

export interface UnifiedUserProviderProps {
  children: React.ReactNode;
  initialCurrentUser?: CurrentUser;  // Optional current user from SSR
}