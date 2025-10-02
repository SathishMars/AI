// src/app/components/TopNavigation.tsx
'use client';

import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Container,
  Chip,
  Skeleton,
  Avatar
} from '@mui/material';
import {
  Business as BusinessIcon,
  AccountCircle as AccountIcon
} from '@mui/icons-material';
import ThemeToggle from './ThemeToggle';
import { useUnifiedUserContext } from '@/app/contexts/UnifiedUserContext';

interface TopNavigationProps {
  title?: string;
}

export default function TopNavigation({ title = "Groupize Workflows" }: TopNavigationProps) {
  const { user, account, currentOrganization, isLoading, displayName } = useUnifiedUserContext();

  return (
    <AppBar 
      position="static" 
      elevation={1}
      sx={{
        backgroundColor: 'background.paper',
        color: 'text.primary',
        borderBottom: 1,
        borderColor: 'divider'
      }}
    >
      <Container maxWidth="xl">
        <Toolbar sx={{ px: { xs: 0 } }}>
          <Typography 
            variant="h6" 
            component="div" 
            sx={{ 
              fontWeight: 600,
              color: 'primary.main',
              mr: 2
            }}
          >
            {title}
          </Typography>
          
          {/* Account and Organization Display */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1 }}>
            {isLoading ? (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Skeleton variant="rectangular" width={100} height={24} sx={{ borderRadius: 1 }} />
                <Skeleton variant="rectangular" width={120} height={24} sx={{ borderRadius: 1 }} />
              </Box>
            ) : (
              <>
                {account && (
                  <Chip
                    icon={<AccountIcon />}
                    label={account.name}
                    size="small"
                    variant="outlined"
                    sx={{ 
                      fontSize: '0.75rem',
                      height: 28,
                      '& .MuiChip-icon': { fontSize: '1rem' }
                    }}
                  />
                )}
                {currentOrganization && (
                  <Chip
                    icon={<BusinessIcon />}
                    label={currentOrganization.name}
                    size="small"
                    color="primary"
                    variant="filled"
                    sx={{ 
                      fontSize: '0.75rem',
                      height: 28,
                      '& .MuiChip-icon': { fontSize: '1rem', color: 'inherit' }
                    }}
                  />
                )}
              </>
            )}
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* User Display */}
            {isLoading ? (
              <Skeleton variant="circular" width={32} height={32} />
            ) : user ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: 'text.secondary',
                    display: { xs: 'none', sm: 'block' },
                    fontWeight: 500
                  }}
                >
                  {displayName}
                </Typography>
                <Avatar 
                  src={user.profile.avatar}
                  alt={displayName}
                  sx={{ 
                    width: 32, 
                    height: 32,
                    fontSize: '0.875rem',
                    bgcolor: 'primary.main'
                  }}
                >
                  {user.profile.firstName[0]}{user.profile.lastName[0]}
                </Avatar>
              </Box>
            ) : null}
            
            <ThemeToggle />
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}