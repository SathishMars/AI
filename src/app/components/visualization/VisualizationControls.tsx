// src/app/components/visualization/VisualizationControls.tsx
'use client';

import React, { useState, useCallback } from 'react';
import {
  Box,
  Fab,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  Tooltip,
  Drawer,
  Typography,
  Switch,
  FormControlLabel,
  Slider,
  Divider,
  Chip
} from '@mui/material';
import {
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  CenterFocusStrong as CenterIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  Settings as SettingsIcon,
  Search as SearchIcon,
  Save as SaveIcon,
  History as HistoryIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon
} from '@mui/icons-material';
import { 
  ZoomPanState, 
  MinimapState, 
  VisualizationConfig,
  DraftState 
} from '@/app/types/advanced-visualization';

interface VisualizationControlsProps {
  zoomPanState: ZoomPanState;
  onZoomPanChange: (state: ZoomPanState) => void;
  minimapState: MinimapState;
  onMinimapToggle: (visible: boolean) => void;
  config: VisualizationConfig;
  onConfigChange: (config: Partial<VisualizationConfig>) => void;
  draftState?: DraftState;
  isFullscreen: boolean;
  onFullscreenToggle: () => void;
  onCenterView: () => void;
  onSearch: (term: string) => void;
  onSaveDraft?: () => void;
  onViewHistory?: () => void;
}

export default function VisualizationControls({
  zoomPanState,
  onZoomPanChange,
  minimapState,
  onMinimapToggle,
  config,
  onConfigChange,
  draftState,
  isFullscreen,
  onFullscreenToggle,
  onCenterView,
  onSearch,
  onSaveDraft,
  onViewHistory
}: VisualizationControlsProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [speedDialOpen, setSpeedDialOpen] = useState(false);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    const newZoom = Math.min(zoomPanState.zoom * 1.2, config.maxZoom);
    onZoomPanChange({ ...zoomPanState, zoom: newZoom });
  }, [zoomPanState, onZoomPanChange, config.maxZoom]);

  const handleZoomOut = useCallback(() => {
    const newZoom = Math.max(zoomPanState.zoom / 1.2, config.minZoom);
    onZoomPanChange({ ...zoomPanState, zoom: newZoom });
  }, [zoomPanState, onZoomPanChange, config.minZoom]);

  const handleZoomChange = useCallback((zoom: number) => {
    onZoomPanChange({ ...zoomPanState, zoom });
  }, [zoomPanState, onZoomPanChange]);

  // Configuration change handlers
  const handleInteractionsToggle = useCallback((enabled: boolean) => {
    onConfigChange({ enableInteractions: enabled });
  }, [onConfigChange]);

  const handleMinimapToggle = useCallback((enabled: boolean) => {
    onMinimapToggle(enabled);
  }, [onMinimapToggle]);

  const handleAnimationDurationChange = useCallback((duration: number) => {
    onConfigChange({ animationDuration: duration });
  }, [onConfigChange]);

  // Speed dial actions
  const speedDialActions = [
    {
      icon: <SearchIcon />,
      name: 'Search Steps',
      onClick: () => {
        const searchTerm = prompt('Search for steps:');
        if (searchTerm) {
          onSearch(searchTerm);
        }
      }
    },
    {
      icon: minimapState.visible ? <VisibilityOffIcon /> : <VisibilityIcon />,
      name: minimapState.visible ? 'Hide Minimap' : 'Show Minimap',
      onClick: () => handleMinimapToggle(!minimapState.visible)
    },
    {
      icon: <CenterIcon />,
      name: 'Center View',
      onClick: onCenterView
    },
    {
      icon: isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />,
      name: isFullscreen ? 'Exit Fullscreen' : 'Fullscreen',
      onClick: onFullscreenToggle
    }
  ];

  // Add draft-specific actions if available
  if (draftState?.isDraft && onSaveDraft) {
    speedDialActions.unshift({
      icon: <SaveIcon />,
      name: 'Save Draft',
      onClick: onSaveDraft
    });
  }

  if (onViewHistory) {
    speedDialActions.unshift({
      icon: <HistoryIcon />,
      name: 'View History',
      onClick: onViewHistory
    });
  }

  return (
    <>
      {/* Main Controls */}
      <Box
        sx={{
          position: 'absolute',
          top: 16,
          right: 16,
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          gap: 1
        }}
      >
        {/* Draft State Indicator */}
        {draftState?.isDraft && (
          <Chip
            label={`Draft (${draftState.modifiedSteps.size} changes)`}
            color="warning"
            size="small"
            sx={{ alignSelf: 'flex-end' }}
          />
        )}

        {/* Zoom Controls */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Tooltip title="Zoom In">
            <Fab 
              size="small" 
              color="primary" 
              onClick={handleZoomIn}
              disabled={zoomPanState.zoom >= config.maxZoom}
            >
              <ZoomInIcon />
            </Fab>
          </Tooltip>
          
          <Typography 
            variant="caption" 
            sx={{ 
              textAlign: 'center', 
              bgcolor: 'background.paper', 
              px: 1, 
              borderRadius: 1,
              fontSize: '0.7rem'
            }}
          >
            {Math.round(zoomPanState.zoom * 100)}%
          </Typography>
          
          <Tooltip title="Zoom Out">
            <Fab 
              size="small" 
              color="primary" 
              onClick={handleZoomOut}
              disabled={zoomPanState.zoom <= config.minZoom}
            >
              <ZoomOutIcon />
            </Fab>
          </Tooltip>
        </Box>

        {/* Settings Button */}
        <Tooltip title="Visualization Settings">
          <Fab 
            size="small" 
            color="default" 
            onClick={() => setSettingsOpen(true)}
          >
            <SettingsIcon />
          </Fab>
        </Tooltip>
      </Box>

      {/* Speed Dial */}
      <SpeedDial
        ariaLabel="Visualization actions"
        sx={{ position: 'absolute', bottom: 16, right: 16, zIndex: 1000 }}
        icon={<SpeedDialIcon />}
        open={speedDialOpen}
        onOpen={() => setSpeedDialOpen(true)}
        onClose={() => setSpeedDialOpen(false)}
      >
        {speedDialActions.map((action) => (
          <SpeedDialAction
            key={action.name}
            icon={action.icon}
            tooltipTitle={action.name}
            onClick={() => {
              action.onClick();
              setSpeedDialOpen(false);
            }}
          />
        ))}
      </SpeedDial>

      {/* Settings Drawer */}
      <Drawer
        anchor="right"
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        sx={{ zIndex: 1300 }}
      >
        <Box sx={{ width: 300, p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Visualization Settings
          </Typography>

          <Divider sx={{ mb: 2 }} />

          {/* Interaction Settings */}
          <Typography variant="subtitle2" gutterBottom>
            Interactions
          </Typography>
          
          <FormControlLabel
            control={
              <Switch
                checked={config.enableInteractions}
                onChange={(e) => handleInteractionsToggle(e.target.checked)}
              />
            }
            label="Enable Step Interactions"
          />

          <FormControlLabel
            control={
              <Switch
                checked={minimapState.visible}
                onChange={(e) => handleMinimapToggle(e.target.checked)}
              />
            }
            label="Show Minimap"
            sx={{ mt: 1 }}
          />

          <Divider sx={{ my: 2 }} />

          {/* Zoom Settings */}
          <Typography variant="subtitle2" gutterBottom>
            Zoom Level
          </Typography>
          
          <Slider
            value={zoomPanState.zoom}
            onChange={(_, value) => handleZoomChange(value as number)}
            min={config.minZoom}
            max={config.maxZoom}
            step={0.1}
            marks={[
              { value: config.minZoom, label: `${Math.round(config.minZoom * 100)}%` },
              { value: 1, label: '100%' },
              { value: config.maxZoom, label: `${Math.round(config.maxZoom * 100)}%` }
            ]}
            valueLabelDisplay="auto"
            valueLabelFormat={(value) => `${Math.round(value * 100)}%`}
          />

          <Divider sx={{ my: 2 }} />

          {/* Animation Settings */}
          <Typography variant="subtitle2" gutterBottom>
            Animation Duration (ms)
          </Typography>
          
          <Slider
            value={config.animationDuration}
            onChange={(_, value) => handleAnimationDurationChange(value as number)}
            min={0}
            max={1000}
            step={50}
            marks={[
              { value: 0, label: 'None' },
              { value: 300, label: 'Fast' },
              { value: 600, label: 'Smooth' },
              { value: 1000, label: 'Slow' }
            ]}
            valueLabelDisplay="auto"
            valueLabelFormat={(value) => value === 0 ? 'None' : `${value}ms`}
          />

          <Divider sx={{ my: 2 }} />

          {/* Theme Settings */}
          <Typography variant="subtitle2" gutterBottom>
            Theme
          </Typography>
          
          <FormControlLabel
            control={
              <Switch
                checked={config.theme === 'dark'}
                onChange={(e) => onConfigChange({ 
                  theme: e.target.checked ? 'dark' : 'light' 
                })}
              />
            }
            label="Dark Mode"
          />

          {/* Draft State Information */}
          {draftState && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" gutterBottom>
                Draft Information
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Modified Steps: {draftState.modifiedSteps.size}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Last Modified: {draftState.lastModified.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Auto-save: {draftState.autoSave ? 'Enabled' : 'Disabled'}
              </Typography>
            </>
          )}
        </Box>
      </Drawer>
    </>
  );
}