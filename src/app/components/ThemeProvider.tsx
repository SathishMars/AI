// src/app/components/ThemeProvider.tsx
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { ThemeProvider as MUIThemeProvider } from '@mui/material/styles';
import { createTheme, PaletteMode } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Roboto } from 'next/font/google';

const roboto = Roboto({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
});

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

// Enhanced theme creation with proper dark mode colors and essential workflow customizations
function createAppTheme(mode: PaletteMode) {
  return createTheme({
    // Custom breakpoints for workflow responsiveness
    breakpoints: {
      values: {
        xs: 0,      // Mobile start
        sm: 768,    // Tablet start (768px-1199px)
        md: 1200,   // Desktop start (≥1200px)
        lg: 1400,   // Large Desktop
        xl: 1920    // Extra Large
      }
    },
    palette: {
      mode,
      ...(mode === 'light'
        ? {
            // Light theme colors
            primary: {
              main: '#1976d2',
              light: '#42a5f5',
              dark: '#1565c0',
            },
            secondary: {
              main: '#dc004e',
              light: '#ff5983',
              dark: '#9a0036',
            },
            background: {
              default: '#fafafa',
              paper: '#ffffff',
            },
            text: {
              primary: '#212121',
              secondary: '#757575',
            },
          }
        : {
            // Dark theme colors
            primary: {
              main: '#90caf9',
              light: '#e3f2fd',
              dark: '#42a5f5',
            },
            secondary: {
              main: '#f48fb1',
              light: '#fce4ec',
              dark: '#e91e63',
            },
            background: {
              default: '#121212',
              paper: '#1e1e1e',
            },
            text: {
              primary: '#ffffff',
              secondary: '#aaaaaa',
            },
            divider: '#333333',
            action: {
              hover: 'rgba(255, 255, 255, 0.08)',
              selected: 'rgba(255, 255, 255, 0.12)',
              disabled: 'rgba(255, 255, 255, 0.26)',
              disabledBackground: 'rgba(255, 255, 255, 0.12)',
            },
          }),
    },
    typography: {
      fontFamily: roboto.style.fontFamily,
      h6: {
        fontWeight: 600,
      },
      button: {
        textTransform: 'none',
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: mode === 'dark' ? '#121212' : '#fafafa',
            color: mode === 'dark' ? '#ffffff' : '#212121',
          },
        },
      },
      // Minimal container customization
      MuiContainer: {
        styleOverrides: {
          root: {
            paddingLeft: 0,
            paddingRight: 0,
            '&.MuiContainer-maxWidthSm': {
              maxWidth: 'none',
            },
            '&.MuiContainer-maxWidthMd': {
              maxWidth: 'none',
            },
            '&.MuiContainer-maxWidthLg': {
              maxWidth: 'none',
            },
            '&.MuiContainer-maxWidthXl': {
              maxWidth: 'none',
            },
          },
        },
      },
      // Essential tab styling
      MuiTab: {
        styleOverrides: {
          root: {
            minWidth: 0,
            padding: '12px 16px',
            transition: 'all 0.2s ease',
            '&.Mui-selected': {
              fontWeight: 600,
            },
            '&:hover': {
              backgroundColor: mode === 'dark' 
                ? 'rgba(144, 202, 249, 0.08)' 
                : 'rgba(25, 118, 210, 0.04)',
            },
          },
        },
      },
      MuiTabs: {
        styleOverrides: {
          root: {
            minHeight: 48,
            '& .MuiTabs-indicator': {
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              height: 3,
            },
          },
        },
      },
      // Clean button animations
      MuiButton: {
        styleOverrides: {
          root: {
            transition: 'all 0.2s ease',
            '&:hover': {
              transform: 'translateY(-1px)',
              boxShadow: '0 4px 8px rgba(0,0,0,0.12)',
            },
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            transition: 'all 0.2s ease',
            '&:hover': {
              transform: 'scale(1.05)',
            },
          },
        },
      },
    },
  });
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