// src/app/services/account-service.ts

/**
 * Account Service
 * Handles account resolution and authentication-related operations
 */

export interface Account {
  id: string;
  name: string;
  type: string;
  permissions: string[];
  features: {
    workflowBuilder: boolean;
    aiGeneration: boolean;
    templateSharing: boolean;
  };
}

export interface AccountResponse {
  success: boolean;
  data: {
    account: Account;
  };
}

class AccountService {
  private baseUrl: string;
  private cachedAccount: Account | null = null;
  private cacheExpiry: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.baseUrl = typeof window !== 'undefined' 
      ? window.location.origin 
      : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  }

  /**
   * Get current user's account
   * Uses caching to avoid repeated API calls
   */
  async getCurrentAccount(): Promise<Account> {
    // Check cache first
    if (this.cachedAccount && Date.now() < this.cacheExpiry) {
      return this.cachedAccount;
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/account`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // TODO: Add Authorization header when JWT is implemented
          // 'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Account resolution failed: ${response.status}`);
      }

      const result: AccountResponse = await response.json();

      if (!result.success) {
        throw new Error('Account resolution returned error');
      }

      // Cache the result
      this.cachedAccount = result.data.account;
      this.cacheExpiry = Date.now() + this.CACHE_DURATION;

      return result.data.account;

    } catch (error) {
      console.error('Failed to get current account:', error);
      
      // Fallback to default account for development
      const fallbackAccount: Account = {
        id: 'groupize-demos',
        name: 'Groupize Demos',
        type: 'demo',
        permissions: ['read', 'write'],
        features: {
          workflowBuilder: true,
          aiGeneration: true,
          templateSharing: false
        }
      };

      return fallbackAccount;
    }
  }

  /**
   * Check if current account has specific permission
   */
  async hasPermission(permission: string): Promise<boolean> {
    try {
      const account = await this.getCurrentAccount();
      return account.permissions.includes(permission);
    } catch {
      return false;
    }
  }

  /**
   * Check if current account has specific feature enabled
   */
  async hasFeature(feature: keyof Account['features']): Promise<boolean> {
    try {
      const account = await this.getCurrentAccount();
      return account.features[feature];
    } catch {
      return false;
    }
  }

  /**
   * Clear cached account (useful when user logs out or switches accounts)
   */
  clearCache(): void {
    this.cachedAccount = null;
    this.cacheExpiry = 0;
  }

  /**
   * Get account ID only (most common use case)
   */
  async getAccountId(): Promise<string> {
    const account = await this.getCurrentAccount();
    return account.id;
  }
}

// Export singleton instance
export const accountService = new AccountService();
export default accountService;