// src/app/components/WorkflowTemplateNameDialog.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && currentName && onClose()}>
      <DialogContent className="sm:max-w-[500px] glass">
        <DialogHeader>
          <DialogTitle>
            {currentName ? 'Rename Workflow Template' : 'Name Your Workflow Template'}
          </DialogTitle>
          {!currentName && (
            <DialogDescription>
              Give your workflow template a descriptive name to help identify it later.
            </DialogDescription>
          )}
        </DialogHeader>
        
        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="template-name">Workflow Template Name</Label>
            <Input
              id="template-name"
              ref={labelTextFieldRef}
              autoFocus
              type="text"
              value={templateName}
              onChange={(e) => {
                setTemplateName(e.target.value);
                setError(null);
              }}
              onKeyUp={handleKeyUp}
              disabled={isSubmitting}
              placeholder="e.g., Event Approval Workflow"
            />
            <p className="text-xs text-muted-foreground">
              Use letters, numbers, spaces, hyphens, and underscores
            </p>
          </div>
        </div>
        
        <DialogFooter>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || !templateName.trim()}
            className="w-full"
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {currentName ? 'Save' : 'Create Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
