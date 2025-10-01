// src/app/components/TopNavigation.tsx
'use client';

import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Container
} from '@mui/material';
import ThemeToggle from './ThemeToggle';

interface TopNavigationProps {
  title?: string;
}

export default function TopNavigation({ title = "Groupize Workflows" }: TopNavigationProps) {
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
              flexGrow: 1,
              fontWeight: 600,
              color: 'primary.main'
            }}
          >
            {title}
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ThemeToggle />
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}