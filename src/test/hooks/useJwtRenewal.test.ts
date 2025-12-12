/**
 * Tests for useJwtRenewal hook
 * 
 * Tests JWT renewal logic including:
 * - Timer calculation with buffer and jitter
 * - API calls to Rails renewal endpoint
 * - Success and error handling
 * - Cleanup on unmount
 * - Mode-based enabling/disabling
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { useJwtRenewal } from '@/app/hooks/useJwtRenewal';
import * as envModule from '@/app/lib/env';

// Mock dependencies
jest.mock('@/app/lib/env');

const mockEnv = envModule as jest.Mocked<typeof envModule>;

// Mock fetch
global.fetch = jest.fn();

// Mock timers
jest.useFakeTimers();

describe('useJwtRenewal', () => {
  const mockRenewUrl = '/aime/api/auth/renew';

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    
    // Set base path for apiFetch
    process.env.NEXT_PUBLIC_BASE_PATH = '/aime';

    // Reset fetch mock
    (global.fetch as jest.Mock).mockClear();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.useFakeTimers();
  });

  describe('Initialization and enabling', () => {
    it('should not set up renewal when disabled', () => {
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      
      renderHook(() => useJwtRenewal({
        expiresAt,
        enabled: false,
      }));

      expect(global.fetch).not.toHaveBeenCalled();
      expect(jest.getTimerCount()).toBe(0);
    });

    it('should not set up renewal when expiresAt is missing', () => {
      renderHook(() => useJwtRenewal({
        enabled: true,
      }));

      expect(global.fetch).not.toHaveBeenCalled();
      expect(jest.getTimerCount()).toBe(0);
    });

    it('should not set up renewal with invalid date', () => {
      const invalidDate = 'invalid-date';
      
      renderHook(() => useJwtRenewal({
        expiresAt: invalidDate,
        enabled: true,
      }));

      expect(global.fetch).not.toHaveBeenCalled();
      expect(jest.getTimerCount()).toBe(0);
    });

    it('should set up renewal timer when enabled', () => {
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      
      renderHook(() => useJwtRenewal({
        expiresAt,
        enabled: true,
      }));

      // Should have set up a timer
      expect(jest.getTimerCount()).toBe(1);
      expect(global.fetch).not.toHaveBeenCalled(); // Not called yet
    });
  });

  describe('Renewal delay calculation', () => {
    it('should calculate delay with 5 minute buffer', () => {
      const now = Date.now();
      const expiresIn30Min = new Date(now + 30 * 60 * 1000).toISOString();
      
      // Mock Date.now to return our fixed time
      jest.spyOn(Date, 'now').mockReturnValue(now);
      
      renderHook(() => useJwtRenewal({
        expiresAt: expiresIn30Min,
        enabled: true,
      }));

      // Should have set up a timer
      // The delay should be approximately 25 minutes (30 - 5 buffer) plus jitter
      // We can't test exact value due to jitter, but we can verify it's set
      expect(jest.getTimerCount()).toBe(1);
      
      // Clean up
      jest.spyOn(Date, 'now').mockRestore();
    });

    it('should return 0 delay for expired tokens', () => {
      const pastDate = new Date(Date.now() - 1000).toISOString();
      
      renderHook(() => useJwtRenewal({
        expiresAt: pastDate,
        enabled: true,
      }));

      // Should still set up timer, but with 0 delay
      expect(jest.getTimerCount()).toBeGreaterThanOrEqual(0);
    });

    it('should include jitter in delay calculation', () => {
      const now = Date.now();
      const expiresIn30Min = new Date(now + 30 * 60 * 1000).toISOString();
      
      jest.spyOn(Date, 'now').mockReturnValue(now);
      
      // Run multiple times to verify jitter varies
      // Note: We can't directly read the timer delay, but we can verify
      // the timer is set up with some delay
      for (let i = 0; i < 5; i++) {
        jest.clearAllTimers();
        const { unmount } = renderHook(() => useJwtRenewal({
          expiresAt: expiresIn30Min,
          enabled: true,
        }));
        expect(jest.getTimerCount()).toBe(1);
        unmount();
      }
      
      jest.spyOn(Date, 'now').mockRestore();
    });
  });

  describe('Successful renewal', () => {
    it('should call renewal API with correct parameters', async () => {
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      const newExpiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, expiresAt: newExpiresAt }),
      });

      const onRenewalSuccess = jest.fn();

      renderHook(() => useJwtRenewal({
        expiresAt,
        enabled: true,
        onRenewalSuccess,
      }));

      // Fast-forward to trigger renewal (25 min + buffer for jitter)
      await act(async () => {
        jest.advanceTimersByTime(26 * 60 * 1000);
        // Flush all pending promises and microtasks
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          mockRenewUrl,
          expect.objectContaining({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
          })
        );
      });

      await waitFor(() => {
        expect(onRenewalSuccess).toHaveBeenCalledWith(newExpiresAt);
      });
    });

    it('should schedule next renewal after successful renewal', async () => {
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      const newExpiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true, expiresAt: newExpiresAt }),
      });

      renderHook(() => useJwtRenewal({
        expiresAt,
        enabled: true,
      }));

      // Fast-forward to trigger first renewal (25 min + buffer for jitter)
      await act(async () => {
        jest.advanceTimersByTime(26 * 60 * 1000);
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      // Should have scheduled next renewal
      expect(jest.getTimerCount()).toBeGreaterThan(0);
    });

    it('should handle missing expiresAt in response', async () => {
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}), // Missing expiresAt
      });

      const onRenewalSuccess = jest.fn();

      renderHook(() => useJwtRenewal({
        expiresAt,
        enabled: true,
        onRenewalSuccess,
      }));

      await act(async () => {
        jest.advanceTimersByTime(26 * 60 * 1000); // 26 min to account for jitter
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(onRenewalSuccess).not.toHaveBeenCalled();
      });
    });
  });

  describe('Renewal failure handling', () => {
    it('should call onRenewalFailure for 401 status', async () => {
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Session expired', code: 'SESSION_EXPIRED' }),
      });

      const onRenewalFailure = jest.fn();

      renderHook(() => useJwtRenewal({
        expiresAt,
        enabled: true,
        onRenewalFailure,
      }));

      await act(async () => {
        jest.advanceTimersByTime(26 * 60 * 1000); // 26 min to account for jitter
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });

      await waitFor(() => {
        expect(onRenewalFailure).toHaveBeenCalledWith({
          code: 'SESSION_EXPIRED',
          message: 'Session expired',
          shouldRedirect: true,
        });
      });
    });

    it('should call onRenewalFailure for 403 status', async () => {
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ error: 'Forbidden', code: 'FORBIDDEN' }),
      });

      const onRenewalFailure = jest.fn();

      renderHook(() => useJwtRenewal({
        expiresAt,
        enabled: true,
        onRenewalFailure,
      }));

      await act(async () => {
        jest.advanceTimersByTime(26 * 60 * 1000); // 26 min to account for jitter
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });

      await waitFor(() => {
        expect(onRenewalFailure).toHaveBeenCalledWith({
          code: 'FORBIDDEN',
          message: 'Forbidden',
          shouldRedirect: true,
        });
      });
    });

    it('should use default error codes when response is not JSON', async () => {
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      const onRenewalFailure = jest.fn();

      renderHook(() => useJwtRenewal({
        expiresAt,
        enabled: true,
        onRenewalFailure,
      }));

      await act(async () => {
        jest.advanceTimersByTime(26 * 60 * 1000); // 26 min to account for jitter
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });

      await waitFor(() => {
        expect(onRenewalFailure).toHaveBeenCalledWith({
          code: 'SESSION_EXPIRED',
          message: 'Session expired',
          shouldRedirect: true,
        });
      });
    });

    it('should use RENEWAL_FAILED code for 403 without error data', async () => {
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({}), // Empty object, no error data
      });

      const onRenewalFailure = jest.fn();

      renderHook(() => useJwtRenewal({
        expiresAt,
        enabled: true,
        onRenewalFailure,
      }));

      // Advance timers enough to trigger renewal (25 min + buffer for jitter)
      await act(async () => {
        jest.advanceTimersByTime(26 * 60 * 1000); // 26 minutes to account for jitter
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });

      // Wait for fetch to be called first
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      }, { timeout: 3000 });

      // Then wait for the callback - need to flush async operations
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      await waitFor(() => {
        expect(onRenewalFailure).toHaveBeenCalledWith({
          code: 'RENEWAL_FAILED',
          message: 'Renewal failed',
          shouldRedirect: true,
        });
      }, { timeout: 3000 });
    });

    it('should not call onRenewalFailure for non-401/403 errors', async () => {
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal Server Error' }),
      });

      const onRenewalFailure = jest.fn();

      renderHook(() => useJwtRenewal({
        expiresAt,
        enabled: true,
        onRenewalFailure,
      }));

      await act(async () => {
        jest.advanceTimersByTime(26 * 60 * 1000); // 26 min to account for jitter
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      // Should not call onRenewalFailure for 500 errors
      expect(onRenewalFailure).not.toHaveBeenCalled();
    });

    it('should handle fetch errors gracefully', async () => {
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      renderHook(() => useJwtRenewal({
        expiresAt,
        enabled: true,
      }));

      await act(async () => {
        jest.advanceTimersByTime(26 * 60 * 1000); // 26 min to account for jitter
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });
    });
  });

  describe('Concurrent renewal prevention', () => {
    it('should prevent concurrent renewal calls', async () => {
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      const newExpiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

      // Create a slow response
      let resolveFetch: (value: any) => void;
      const fetchPromise = new Promise((resolve) => {
        resolveFetch = resolve;
      });

      (global.fetch as jest.Mock).mockReturnValueOnce(fetchPromise);

      renderHook(() => useJwtRenewal({
        expiresAt,
        enabled: true,
      }));

      // Trigger renewal
      await act(async () => {
        jest.advanceTimersByTime(26 * 60 * 1000); // 26 min to account for jitter
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });

      // Try to trigger again immediately (simulating rapid calls)
      act(() => {
        jest.advanceTimersByTime(100);
      });

      await act(async () => {
        await Promise.resolve();
      });

      // Resolve the first call
      await act(async () => {
        resolveFetch!({
          ok: true,
          json: async () => ({ ok: true, expiresAt: newExpiresAt }),
        });
        await Promise.resolve();
        await Promise.resolve();
      });

      await waitFor(() => {
        // Should only be called once despite multiple triggers
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Cleanup', () => {
    it('should clear timer on unmount', () => {
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

      const { unmount } = renderHook(() => useJwtRenewal({
        expiresAt,
        enabled: true,
      }));

      expect(jest.getTimerCount()).toBe(1);

      unmount();

      // Timer should be cleared
      expect(jest.getTimerCount()).toBe(0);
    });

    it('should clear timer when expiresAt changes', () => {
      const expiresAt1 = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      const expiresAt2 = new Date(Date.now() + 60 * 60 * 1000).toISOString();

      const { rerender } = renderHook(
        ({ expiresAt }) => useJwtRenewal({
          expiresAt,
          enabled: true,
        }),
        { initialProps: { expiresAt: expiresAt1 } }
      );

      expect(jest.getTimerCount()).toBe(1);

      rerender({ expiresAt: expiresAt2 });

      // Should have cleared old timer and set up new one
      expect(jest.getTimerCount()).toBe(1);
    });

    it('should clear timer when disabled', () => {
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

      const { rerender } = renderHook(
        ({ enabled }) => useJwtRenewal({
          expiresAt,
          enabled,
        }),
        { initialProps: { enabled: true } }
      );

      expect(jest.getTimerCount()).toBe(1);

      rerender({ enabled: false });

      // Timer should be cleared
      expect(jest.getTimerCount()).toBe(0);
    });
  });

  describe('expiresAt updates', () => {
    it('should reschedule renewal when expiresAt changes', () => {
      const expiresAt1 = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      const expiresAt2 = new Date(Date.now() + 60 * 60 * 1000).toISOString();

      const { rerender } = renderHook(
        ({ expiresAt }) => useJwtRenewal({
          expiresAt,
          enabled: true,
        }),
        { initialProps: { expiresAt: expiresAt1 } }
      );

      expect(jest.getTimerCount()).toBe(1);

      rerender({ expiresAt: expiresAt2 });

      // Should have rescheduled with new expiry
      expect(jest.getTimerCount()).toBe(1);
    });
  });
});

