// src/app/components/EditModeIndicator.tsx
'use client';

import React from 'react';
import {
  Box,
  Chip,
  Typography,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Edit as EditIcon,
  Publish as PublishIcon,
  Save as SaveIcon
} from '@mui/icons-material';
import { WorkflowJSON } from '@/app/types/workflow';

interface EditModeIndicatorProps {
  workflow: WorkflowJSON;
  hasUnsavedChanges?: boolean;
  className?: string;
}

export default function EditModeIndicator({
  workflow,
  hasUnsavedChanges = false,
  className = ''
}: EditModeIndicatorProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const isDraft = workflow.metadata.status === 'draft';

  return (
    <Box
      className={className}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        flexWrap: 'wrap'
      }}
    >
      {/* Status Indicator */}
      <Chip
        icon={isDraft ? <EditIcon /> : <PublishIcon />}
        label={isDraft ? 'Draft' : 'Published'}
        color={isDraft ? 'warning' : 'success'}
        size={isMobile ? 'small' : 'medium'}
        variant="filled"
      />

      {/* Unsaved Changes Indicator */}
      {hasUnsavedChanges && (
        <Chip
          icon={<SaveIcon />}
          label="Unsaved Changes"
          color="error"
          size={isMobile ? 'small' : 'medium'}
          variant="outlined"
        />
      )}

      {/* Version Information */}
      <Typography
        variant={isMobile ? 'caption' : 'body2'}
        color="text.secondary"
        sx={{ whiteSpace: 'nowrap' }}
      >
        v{workflow.metadata.version}
      </Typography>

      {/* Last Updated */}
      {workflow.metadata.updatedAt && (
        <Typography
          variant={isMobile ? 'caption' : 'body2'}
          color="text.secondary"
          sx={{ 
            whiteSpace: 'nowrap',
            display: { xs: 'none', sm: 'block' }
          }}
        >
          Updated {new Date(workflow.metadata.updatedAt).toLocaleDateString()}
        </Typography>
      )}
    </Box>
  );
}