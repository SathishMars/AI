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

export const colors = {
  black: '#000000',
  blackTwo: '#333333',
  darkpurple: '#554280',
  white: '#FFFFFF',
  whiteTwo: '#F4F4F4',
  whiteThree: '#EBEBEB',
  lightGrey: '#D1D1D1',
  veryLightGrey: '#E8E8E8',
  grey: '#A2A2A2',
  greyPrimary: '#808080',
  greyMedium: '#C4C4C4',
  greyMidDark: '#606060',
  greyDark: '#505050',
  greyBorder: '#D8D8D8',
  greyDivider: '#E8E8E8',
  violetLight: '#CB28EB',
  violet: '#BE14DE',
  violet50: '#F6F5FF',
  violet100: '#EBE7FE',
  violet600: '#7C3BED',
  violetDark: '#A306C1',
  violetDark2: '#5F0A70',
  red: '#FF0000',
  veryLightBlue: '#E8FAFD',
  lightBlue: '#5CDAF0',
  darkSkyBlue: '#57BDDA',
  blue: '#14BFDE',
  seafoamBlue: '#5ECAAB',
  aqua: '#14BFDE',
  gold: '#FD994D',
  dustyOrange: '#ED664C',
  brandRed: '#FF5B41',
  brandGreen: '#10CEA9',
  brandOrange: '#FF994D',
  lavenderLight: '#F9E8FC',
  lavender: '#EACAF0',
  lavenderDark: '#E9D3EF',
  veryLightCoral: '#FFEFEC',
  veryLightGreen: '#E7FAF6',
  veryLightYellow: '#FFF8F3',
  purple: '#554280',
  // new theme colors
  'primary-emerald-500': '#65B29F',
  'primary-emerald-600': '#488071',
  'primary-purple-500': '#765CB2',
  'primary-yellow-700': '#A26107',
  'primary-pink-300': '#D495DA',
  'primary-pink-400': '#CF5FD0',
  'primary-pink-500': '#BD15DD',
  'primary-pink-600': '#9F12B9',
  'primary-brand-400': '#8ED679',
  'primary-brand-700': '#4C8D39',
  'primary-brand-800': '#447634',
  'primary-green-50': '#F0FFEC',
  'primary-green-300': '#A0E08D',
  'primary-green-450': '#73BD5B',
  'primary-green-500': '#73BD5D',
  'primary-green-600': '#5EA349',
  'primary-green-700': '#4C8D39',
  'primary-blue-50': '#F2F7FF',
  'primary-blue-300': '#91C3FD',
  'primary-blue-400': '#61A6FA',
  'primary-blue-600': '#2463EB',
  'primary-blue-500': '#3479E9',
  'primary-blue-700': '#1D4FD7',
  'primary-grey-50': '#F9FAFB',
  'primary-grey-100': '#F4F6F8',
  'primary-grey-200': '#E6EAF0',
  'primary-grey-300': '#C8D2DB',
  'primary-grey-400': '#9DACBB',
  'primary-grey-600': '#637584',
  'primary-grey-700': '#3A4553',
  'primary-grey-800': '#212B36',
  'primary-red-50': '#FEF1F1',
  'primary-red-500': '#EF4343',
  'primary-red-600': '#DC2828',
  'primary-red-700': '#BA1C1C',
} as const;

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
          custom: colors,
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
          custom: colors,
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
      // Let Material-UI handle CssBaseline automatically based on palette
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