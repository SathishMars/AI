// src/app/components/ThemeProvider.tsx
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { ThemeProvider as MUIThemeProvider } from '@mui/material/styles';
import { PaletteMode } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import createAppTheme from '../theme/theme';

export type ThemeMode = 'light' | 'dark' | 'device';

interface ThemeModeContextType {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  effectiveMode: PaletteMode;
}

const ThemeModeContext = createContext<ThemeModeContextType | undefined>(undefined);

export function useThemeMode() {
  const context = useContext(ThemeModeContext);
  if (context === undefined) {
    throw new Error('useThemeMode must be used within a ThemeModeProvider');
  }
  return context;
}



interface ThemeModeProviderProps {
  children: React.ReactNode;
}

export function ThemeModeProvider({ children }: ThemeModeProviderProps) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('device');
  const [effectiveMode, setEffectiveMode] = useState<PaletteMode>('light');

  // Determine effective mode based on theme mode and system preference
  useEffect(() => {
    const updateEffectiveMode = () => {
      if (themeMode === 'device') {
        // Use system preference
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setEffectiveMode(systemPrefersDark ? 'dark' : 'light');
      } else {
        setEffectiveMode(themeMode as PaletteMode);
      }
    };

    // Load saved theme preference
    const savedTheme = localStorage.getItem('theme-mode') as ThemeMode;
    if (savedTheme && ['light', 'dark', 'device'].includes(savedTheme)) {
      setThemeModeState(savedTheme);
    }

    updateEffectiveMode();

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (themeMode === 'device') {
        updateEffectiveMode();
      }
    };

    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [themeMode]);

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    localStorage.setItem('theme-mode', mode);

    // Update effective mode immediately
    if (mode === 'device') {
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setEffectiveMode(systemPrefersDark ? 'dark' : 'light');
    } else {
      setEffectiveMode(mode as PaletteMode);
    }
  };

  const theme = React.useMemo(() => createAppTheme(effectiveMode), [effectiveMode]);

  const contextValue: ThemeModeContextType = {
    themeMode,
    setThemeMode,
    effectiveMode,
  };

  return (
    <ThemeModeContext.Provider value={contextValue}>
      <MUIThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MUIThemeProvider>
    </ThemeModeContext.Provider>
  );
}