// src/app/components/TopNavigation.tsx
'use client';

import React from 'react';
import { Building2, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useUnifiedUserContext } from '@/app/contexts/UnifiedUserContext';
import { ThemeToggle } from './ThemeToggle';

interface TopNavigationProps {
  title?: string;
}

export default function TopNavigation({ title = "Groupize Workflows" }: TopNavigationProps) {
  const { user, account, currentOrganization, isLoading, displayName } = useUnifiedUserContext();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
      <div className="flex h-14 items-center px-4">
        <h1 className="text-lg font-semibold mr-4">
          {title}
        </h1>
        
        <div className="flex items-center gap-2 flex-1">
          {isLoading ? (
            <div className="flex gap-2">
              <div className="h-6 w-24 animate-pulse rounded bg-muted" />
              <div className="h-6 w-28 animate-pulse rounded bg-muted" />
            </div>
          ) : (
            <>
              {account && (
                <Badge className="glass">
                  <User className="h-3 w-3" />
                  {account.name}
                </Badge>
              )}
              {currentOrganization && (
                <Badge className="glass">
                  <Building2 className="h-3 w-3" />
                  {currentOrganization.name}
                </Badge>
              )}
            </>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {isLoading ? (
            <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
          ) : user ? (
            <div className="flex items-center gap-2">
              <span className="hidden sm:block text-sm">
                {displayName}
              </span>
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.profile.avatar} alt={displayName} />
                <AvatarFallback>
                  {user.profile.firstName[0]}{user.profile.lastName[0]}
                </AvatarFallback>
              </Avatar>
            </div>
          ) : null}
          
          <Separator orientation="vertical" className="h-6" />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}