// src/app/hooks/useAccount.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { accountService, Account } from '@/app/services/account-service';

interface UseAccountOptions {
  autoLoad?: boolean;
}

interface UseAccountReturn {
  account: Account | null;
  isLoading: boolean;
  error: string | null;
  loadAccount: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasFeature: (feature: keyof Account['features']) => boolean;
  clearError: () => void;
  accountId: string | null;
}

/**
 * React hook for account management
 * Provides current user account information and permission checking
 */
export function useAccount(options: UseAccountOptions = {}): UseAccountReturn {
  const { autoLoad = true } = options;
  
  const [account, setAccount] = useState<Account | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAccount = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const accountData = await accountService.getCurrentAccount();
      setAccount(accountData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load account';
      setError(errorMessage);
      console.error('Failed to load account:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const hasPermission = useCallback((permission: string): boolean => {
    return account?.permissions.includes(permission) ?? false;
  }, [account]);

  const hasFeature = useCallback((feature: keyof Account['features']): boolean => {
    return account?.features[feature] ?? false;
  }, [account]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Auto-load account on mount
  useEffect(() => {
    if (autoLoad) {
      loadAccount();
    }
  }, [autoLoad, loadAccount]);

  return {
    account,
    isLoading,
    error,
    loadAccount,
    hasPermission,
    hasFeature,
    clearError,
    accountId: account?.id ?? null
  };
}