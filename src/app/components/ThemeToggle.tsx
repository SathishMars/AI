// src/app/components/ThemeToggle.tsx
'use client';

import React from 'react';
import {
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Box,
  Typography
} from '@mui/material';
import {
  Brightness4 as DarkIcon,
  Brightness7 as LightIcon,
  SettingsBrightness as DeviceIcon,
  Palette as ThemeIcon
} from '@mui/icons-material';
import { useThemeMode, type ThemeMode } from './ThemeRegistry';

const THEME_OPTIONS: Array<{
  mode: ThemeMode;
  label: string;
  icon: React.ReactNode;
  description: string;
}> = [
  {
    mode: 'light',
    label: 'Light',
    icon: <LightIcon />,
    description: 'Light theme for bright environments'
  },
  {
    mode: 'dark',
    label: 'Dark',
    icon: <DarkIcon />,
    description: 'Dark theme for low-light environments'
  },
  {
    mode: 'device',
    label: 'Device',
    icon: <DeviceIcon />,
    description: 'Follow system/device theme preference'
  }
];

export default function ThemeToggle() {
  const { themeMode, setThemeMode } = useThemeMode();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleThemeChange = (mode: ThemeMode) => {
    setThemeMode(mode);
    handleClose();
  };

  const getCurrentIcon = () => {
    const option = THEME_OPTIONS.find(opt => opt.mode === themeMode);
    return option?.icon || <ThemeIcon />;
  };

  const getCurrentLabel = () => {
    const option = THEME_OPTIONS.find(opt => opt.mode === themeMode);
    return option?.label || 'Theme';
  };

  return (
    <Box>
      <Tooltip title={`Current theme: ${getCurrentLabel()}`}>
        <IconButton
          onClick={handleClick}
          size="small"
          aria-controls={open ? 'theme-menu' : undefined}
          aria-haspopup="true"
          aria-expanded={open ? 'true' : undefined}
          aria-label="Change theme"
          sx={{
            color: 'text.primary',
            '&:hover': {
              backgroundColor: 'action.hover'
            }
          }}
        >
          {getCurrentIcon()}
        </IconButton>
      </Tooltip>
      
      <Menu
        id="theme-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          'aria-labelledby': 'theme-button',
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          sx: {
            minWidth: 200,
            mt: 1
          }
        }}
      >
        <Box sx={{ px: 2, py: 1, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="subtitle2" color="text.secondary">
            Theme Settings
          </Typography>
        </Box>
        
        {THEME_OPTIONS.map((option) => (
          <MenuItem
            key={option.mode}
            onClick={() => handleThemeChange(option.mode)}
            selected={themeMode === option.mode}
            sx={{
              py: 1.5,
              '&.Mui-selected': {
                backgroundColor: 'primary.light',
                '&:hover': {
                  backgroundColor: 'primary.light'
                }
              }
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              {option.icon}
            </ListItemIcon>
            <ListItemText
              primary={option.label}
              secondary={option.description}
              secondaryTypographyProps={{
                variant: 'caption',
                color: 'text.secondary'
              }}
            />
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
}