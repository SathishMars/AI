/**
 * JWT Renewal Hook (useJwtRenewal)
 * 
 * Implements proactive token renewal for sliding sessions in embedded mode.
 * 
 * Architecture:
 * - Renews tokens 5 minutes before expiry (e.g., at 25 minutes for 30-minute tokens)
 * - This ensures tokens are rarely expired when middleware verifies them
 * - Calls Next.js /api/auth/renew endpoint (which proxies to Rails)
 * - All JWT and cookie handling stays server-side - browser never sees Rails URLs or JWTs
 * - Middleware only verifies and redirects - no renewal logic there
 * 
 * Security: NEVER decodes or manipulates JWT in browser - only uses expiresAt from server.
 */

import { useEffect, useRef, useCallback } from 'react';
import { apiFetch } from '@/app/utils/api';

export interface JwtRenewalOptions {
  expiresAt?: string; // ISO 8601 timestamp from JWT exp claim
  onRenewalSuccess?: (newExpiresAt: string) => void;
  onRenewalFailure?: (error: RenewalError) => void;
  enabled?: boolean;
}

export interface RenewalError {
  code: string;
  message: string;
  shouldRedirect: boolean;
  redirectUrl?: string; // Server-provided redirect URL
}

// Renew 5 minutes before token expiry (e.g., for 30-minute tokens, renew at 25 minutes)
const RENEWAL_BUFFER_MS = 5 * 60 * 1000;
// Random jitter to prevent thundering herd when multiple clients renew simultaneously
const JITTER_MS = 15 * 1000;

export function useJwtRenewal(options: JwtRenewalOptions) {
  const { expiresAt, onRenewalSuccess, onRenewalFailure, enabled = true } = options;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isRenewingRef = useRef<boolean>(false);

  const calculateRenewalDelay = useCallback((expiresAtIso: string): number => {
    const expiryTime = new Date(expiresAtIso).getTime();
    const now = Date.now();
    const timeUntilExpiry = expiryTime - now;

    if (timeUntilExpiry <= 0) return 0;

    const renewalTime = timeUntilExpiry - RENEWAL_BUFFER_MS;
    const jitter = Math.floor(Math.random() * JITTER_MS);
    return Math.max(0, renewalTime + jitter);
  }, []);

  const performRenewal = useCallback(async () => {
    if (isRenewingRef.current) return;
    isRenewingRef.current = true;

    try {
      const renewUrl = '/api/auth/renew';

      const response = await apiFetch(renewUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        const shouldRedirect = response.status === 401 || response.status === 403;
        
        if (shouldRedirect && onRenewalFailure) {
          onRenewalFailure({
            code: errorData.code || (response.status === 401 ? 'SESSION_EXPIRED' : 'RENEWAL_FAILED'),
            message: errorData.error || (response.status === 401 ? 'Session expired' : 'Renewal failed'),
            shouldRedirect: true,
            redirectUrl: errorData.redirectUrl,
          });
        }
        return;
      }

      const data = await response.json();
      if (!data.ok || !data.expiresAt) {
        console.error('[JWT Renewal] Invalid response format:', data);
        return;
      }

      const newExpiresAt = data.expiresAt;
      if (onRenewalSuccess) {
        onRenewalSuccess(newExpiresAt);
      }

      const nextDelay = calculateRenewalDelay(newExpiresAt);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(performRenewal, nextDelay);

    } catch (error) {
      console.error('[JWT Renewal] Renewal failed:', error);
    } finally {
      isRenewingRef.current = false;
    }
  }, [calculateRenewalDelay, onRenewalSuccess, onRenewalFailure]);

  useEffect(() => {
    if (!enabled || !expiresAt) return;

    const expiryTime = new Date(expiresAt).getTime();
    if (isNaN(expiryTime)) return;

    const delay = calculateRenewalDelay(expiresAt);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(performRenewal, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [expiresAt, enabled, calculateRenewalDelay, performRenewal]);
}

