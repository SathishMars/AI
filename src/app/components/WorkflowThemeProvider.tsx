// src/app/components/WorkflowThemeProvider.tsx
'use client';

import { createTheme, ThemeProvider } from '@mui/material/styles';
import { ReactNode } from 'react';

// Custom theme with breakpoints matching story requirements
const workflowTheme = createTheme({
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
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#fafafa',
      paper: '#ffffff',
    },
  },
  typography: {
    h6: {
      fontWeight: 600,
    },
    button: {
      textTransform: 'none',
    },
  },
  components: {
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
            backgroundColor: 'rgba(25, 118, 210, 0.04)',
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          minHeight: 48,
          // Smooth indicator animation
          '& .MuiTabs-indicator': {
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          },
        },
        indicator: {
          height: 3,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
          transition: 'box-shadow 0.2s ease',
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
  },
});

interface WorkflowThemeProviderProps {
  children: ReactNode;
}

export default function WorkflowThemeProvider({ children }: WorkflowThemeProviderProps) {
  return (
    <ThemeProvider theme={workflowTheme}>
      {children}
    </ThemeProvider>
  );
}