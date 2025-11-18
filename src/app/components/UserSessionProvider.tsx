// src/app/components/UserSessionProvider.tsx
import { headers } from 'next/headers';
import { UnifiedUserProvider } from '../contexts/UnifiedUserContext';
import { CurrentUser } from '../types/unified-user-context';

export async function UserSessionProvider({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  const headersList = await headers();
  const userId = headersList.get('x-user-id');
  const firstName = headersList.get('x-user-first-name');
  const lastName = headersList.get('x-user-last-name');
  const email = headersList.get('x-user-email');
  const accountId = headersList.get('x-account-id');
  const organizationId = headersList.get('x-organization-id');
  const expiresAt = headersList.get('x-session-expires-at');

  const currentUser: CurrentUser | undefined = userId && firstName && lastName && email && accountId
    ? {
        userId,
        firstName,
        lastName,
        email,
        accountId,
        organizationId: organizationId || undefined,
        expiresAt: expiresAt || undefined,
        isAuthenticated: true,
      }
    : undefined;

  return (
    <UnifiedUserProvider initialCurrentUser={currentUser}>
      {children}
    </UnifiedUserProvider>
  );
}

