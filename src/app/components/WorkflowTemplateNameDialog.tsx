// src/app/components/WorkflowTemplateNameDialog.tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Alert,
  CircularProgress
} from '@mui/material';

interface WorkflowTemplateNameDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void>;
  currentName?: string;
  mode?: 'create' | 'rename';
}

export default function WorkflowTemplateNameDialog({
  open,
  onClose,
  onSubmit,
  currentName = '',
  mode = 'create'
}: WorkflowTemplateNameDialogProps) {
  const [templateName, setTemplateName] = useState(currentName);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setTemplateName(currentName);
      setError(null);
    }
  }, [open, currentName]);

  const validateTemplateName = (name: string): string | null => {
    if (!name.trim()) {
      return 'Template name is required';
    }
    if (name.length > 100) {
      return 'Template name must be 100 characters or less';
    }
    if (!/^[a-zA-Z0-9-_ ]+$/.test(name)) {
      return 'Template name can only contain letters, numbers, spaces, hyphens, and underscores';
    }
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateTemplateName(templateName);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit(templateName.trim());
      setTemplateName('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template name');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !isSubmitting) {
      event.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={mode === 'create' ? undefined : onClose} // Prevent closing for new templates
      disableEscapeKeyDown={mode === 'create'} // Disable Escape key for create mode
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        {mode === 'create' ? 'Name Your Workflow Template' : 'Rename Workflow Template'}
      </DialogTitle>
      
      <DialogContent>
        {mode === 'create' && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Give your workflow template a descriptive name to help identify it later.
          </Alert>
        )}
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <TextField
          autoFocus
          margin="dense"
          label="Template Name"
          type="text"
          fullWidth
          variant="outlined"
          value={templateName}
          onChange={(e) => {
            setTemplateName(e.target.value);
            setError(null);
          }}
          onKeyPress={handleKeyPress}
          disabled={isSubmitting}
          placeholder="e.g., Event Approval Workflow"
          helperText="Use letters, numbers, spaces, hyphens, and underscores"
        />
      </DialogContent>
      
      <DialogActions>
        <Button 
          onClick={handleSubmit} 
          variant="contained"
          disabled={isSubmitting || !templateName.trim()}
          startIcon={isSubmitting && <CircularProgress size={16} />}
          fullWidth
        >
          {mode === 'create' ? 'Create Template' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
