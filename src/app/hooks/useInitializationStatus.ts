/**
 * Hook to fetch and track database initialization status
 */

import { useState, useCallback, useEffect } from 'react';
import { apiFetch } from '@/app/utils/api';

export interface InitializationStatus {
  success: boolean;
  appliedVersions: string[];
  skippedVersions: string[];
  failedVersions: string[];
  errors: string[];
  duration: number;
  message: string;
}

export interface UseInitializationStatusReturn {
  status: InitializationStatus | null;
  loading: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  isInitialized: boolean;
}

export function useInitializationStatus(): UseInitializationStatusReturn {
  const [status, setStatus] = useState<InitializationStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialize = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiFetch('/api/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: InitializationStatus = await response.json();
      setStatus(data);

      if (!data.success) {
        setError(data.errors?.join('; ') || 'Initialization failed');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const isInitialized = status?.success ?? false;

  return {
    status,
    loading,
    error,
    initialize,
    isInitialized,
  };
}
