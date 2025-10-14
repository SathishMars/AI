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
}

export default function WorkflowTemplateNameDialog({
  open,
  onClose,
  onSubmit,
  currentName = '',
}: WorkflowTemplateNameDialogProps) {
  const [templateName, setTemplateName] = useState(currentName);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const labelTextFieldRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTemplateName(currentName);
      setError(null);
      console.log('Focusing text field');
      setTimeout(() => {
        labelTextFieldRef.current?.focus();
      }, 100); // Delay to ensure dialog is fully open
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
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template name');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyUp = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !isSubmitting) {
      event.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={!currentName? undefined : onClose} // Prevent closing if template name is blank
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        {currentName ? 'Rename Workflow Template' : 'Name Your Workflow Template'}
      </DialogTitle>
      
      <DialogContent>
        {!currentName && (
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
          label="Workflow Template Name"
          type="text"
          fullWidth
          variant="outlined"
          value={templateName}
          onChange={(e) => {
            setTemplateName(e.target.value);
            setError(null);
          }}
          onKeyUp={handleKeyUp}
          disabled={isSubmitting}
          placeholder="e.g., Event Approval Workflow"
          helperText="Use letters, numbers, spaces, hyphens, and underscores"
          inputRef={labelTextFieldRef}
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
          {currentName ? 'Save' : 'Create Template'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
