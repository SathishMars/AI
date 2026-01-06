// src/app/components/UserSessionProvider.tsx
import { headers } from 'next/headers';
import { verifySession } from '@/app/lib/dal';
import { UnifiedUserProvider } from '../contexts/UnifiedUserContext';
import { CurrentUser } from '../types/unified-user-context';

/**
 * User Session Provider (Server Component)
 * 
 * Uses DAL to verify session following Next.js best practices.
 */
export async function UserSessionProvider({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  const session = await verifySession();
  let currentUser: CurrentUser | undefined;
  
  if (session) {
    currentUser = {
      userId: session.userId,
      firstName: session.firstName,
      lastName: session.lastName,
      email: session.email,
      accountId: session.accountId,
      organizationId: session.organizationId,
      expiresAt: session.expiresAt.toISOString(),
      isAuthenticated: true,
    };
  } else {
    // Fallback to reading headers
    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    const firstName = headersList.get('x-user-first-name');
    const lastName = headersList.get('x-user-last-name');
    const email = headersList.get('x-user-email');
    const accountId = headersList.get('x-account-id');
    const organizationId = headersList.get('x-organization-id');
    const expiresAt = headersList.get('x-session-expires-at');

    if (userId && firstName && lastName && email && accountId) {
      currentUser = {
        userId,
        firstName,
        lastName,
        email,
        accountId,
        organizationId: organizationId || undefined,
        expiresAt: expiresAt || undefined,
        isAuthenticated: true,
      };
    }
  }

  return (
    <UnifiedUserProvider initialCurrentUser={currentUser}>
      {children}
    </UnifiedUserProvider>
  );
}

