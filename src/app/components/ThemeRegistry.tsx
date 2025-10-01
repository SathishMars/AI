// src/components/ThemeRegistry.tsx
'use client';

import * as React from 'react';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v14-appRouter';
import { ThemeModeProvider } from './ThemeProvider';

export default function ThemeRegistry({ children }: { children: React.ReactNode }) {
  return (
    <AppRouterCacheProvider options={{ enableCssLayer: true }}>
      <ThemeModeProvider>
        {children}
      </ThemeModeProvider>
    </AppRouterCacheProvider>
  );
}

// Re-export ThemeProvider components for convenience
export { ThemeModeProvider, useThemeMode, type ThemeMode } from './ThemeProvider';

