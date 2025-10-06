// src/app/components/visualization/ParameterEditor.tsx
'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Chip,
  Alert,
  Switch,
  FormControlLabel,
  Autocomplete,
  Paper,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Close as CloseIcon,
  Save as SaveIcon,
  Undo as UndoIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { WorkflowStep, ValidationResult } from '@/app/types/workflow';
import { ParameterModification, ParameterEditResult } from '@/app/types/advanced-visualization';

interface ParameterEditorProps {
  open: boolean;
  onClose: () => void;
  step: WorkflowStep | null;
  stepId: string | null;
  onParameterEdit: (
    stepId: string, 
    parameterName: string, 
    oldValue: string | number | boolean | object, 
    newValue: string | number | boolean | object
  ) => Promise<ParameterEditResult>;
  availableFunctions?: string[];
  validationErrors?: ValidationResult['errors'];
}

interface ParameterValue {
  name: string;
  value: string | number | boolean | object;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  description?: string;
}

export default function ParameterEditor({
  open,
  onClose,
  step,
  stepId,
  onParameterEdit,
  availableFunctions = [],
  validationErrors = []
}: ParameterEditorProps) {
  const [parameters, setParameters] = useState<ParameterValue[]>([]);
  const [originalParameters, setOriginalParameters] = useState<ParameterValue[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [saveErrors, setSaveErrors] = useState<string[]>([]);

  // Initialize parameters when step changes
  useEffect(() => {
    if (!step) {
      setParameters([]);
      setOriginalParameters([]);
      return;
    }

    const params = extractParameters(step);
    setParameters(params);
    setOriginalParameters(JSON.parse(JSON.stringify(params)));
    setHasChanges(false);
    setSaveErrors([]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);  // extractParameters is stable and doesn't need to be in deps

  // Extract parameters from step
  const extractParameters = useCallback((step: WorkflowStep): ParameterValue[] => {
    const params: ParameterValue[] = [];

    // Basic step properties
    params.push({
      name: 'name',
      value: step.name,
      type: 'string',
      required: true,
      description: 'Display name for this step'
    });

    if (step.action) {
      params.push({
        name: 'action',
        value: step.action,
        type: 'string',
        required: step.type === 'action',
        description: 'Function or action to execute'
      });
    }

    // Step parameters
    if (step.params && typeof step.params === 'object') {
      Object.entries(step.params).forEach(([key, value]) => {
        params.push({
          name: `params.${key}`,
          value: value as string | number | boolean | object,
          type: inferParameterType(value),
          required: false,
          description: `Parameter: ${key}`
        });
      });
    }

    // Conditional parameters
    if (step.condition) {
      params.push({
        name: 'condition',
        value: step.condition,
        type: 'object',
        required: step.type === 'condition',
        description: 'Condition rules for evaluation'
      });
    }

    // Navigation parameters
    if (step.onSuccess) {
      params.push({
        name: 'onSuccess',
        value: step.onSuccess,
        type: 'string',
        required: false,
        description: 'Next step on success'
      });
    }

    if (step.onFailure) {
      params.push({
        name: 'onFailure',
        value: step.onFailure,
        type: 'string',
        required: false,
        description: 'Next step on failure'
      });
    }

    // Enhanced condition outputs
    if ('onApproval' in step && step.onApproval) {
      params.push({
        name: 'onApproval',
        value: step.onApproval,
        type: 'string',
        required: false,
        description: 'Next step on approval'
      });
    }

    if ('onYes' in step && step.onYes) {
      params.push({
        name: 'onYes',
        value: step.onYes,
        type: 'string',
        required: false,
        description: 'Next step on yes response'
      });
    }

    if ('onReject' in step && step.onReject) {
      params.push({
        name: 'onReject',
        value: step.onReject,
        type: 'string',
        required: false,
        description: 'Next step on rejection'
      });
    }

    if ('onNo' in step && step.onNo) {
      params.push({
        name: 'onNo',
        value: step.onNo,
        type: 'string',
        required: false,
        description: 'Next step on no response'
      });
    }

    // Branching properties
    if ('branches' in step && step.branches) {
      params.push({
        name: 'branches',
        value: step.branches,
        type: 'array',
        required: false,
        description: 'Parallel execution branches'
      });
    }

    if ('waitForSteps' in step && step.waitForSteps) {
      params.push({
        name: 'waitForSteps',
        value: step.waitForSteps,
        type: 'array',
        required: false,
        description: 'Steps to wait for completion'
      });
    }

    if ('requireAllSuccess' in step && step.requireAllSuccess !== undefined) {
      params.push({
        name: 'requireAllSuccess',
        value: Boolean(step.requireAllSuccess),
        type: 'boolean',
        required: false,
        description: 'Require all steps to succeed'
      });
    }

    if ('timeout' in step && step.timeout) {
      params.push({
        name: 'timeout',
        value: step.timeout,
        type: 'number',
        required: false,
        description: 'Timeout in minutes'
      });
    }

    // Type assertion for legacy workflow schema
    const stepWithNextSteps = step as WorkflowStep & { nextSteps?: string[] };
    if (stepWithNextSteps.nextSteps) {
      params.push({
        name: 'nextSteps',
        value: stepWithNextSteps.nextSteps,
        type: 'array',
        required: false,
        description: 'List of next steps'
      });
    }

    return params;
  }, []);

  // Infer parameter type from value
  const inferParameterType = (value: unknown): ParameterValue['type'] => {
    if (typeof value === 'string') return 'string';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (Array.isArray(value)) return 'array';
    return 'object';
  };

  // Handle parameter value change
  const handleParameterChange = useCallback((parameterName: string, newValue: string | number | boolean | object) => {
    setParameters(prev => 
      prev.map(param => 
        param.name === parameterName 
          ? { ...param, value: newValue }
          : param
      )
    );
    setHasChanges(true);
    setSaveErrors([]);
  }, []);

  // Reset to original values
  const handleReset = useCallback(() => {
    setParameters(JSON.parse(JSON.stringify(originalParameters)));
    setHasChanges(false);
    setSaveErrors([]);
  }, [originalParameters]);

  // Save parameter changes
  const handleSave = useCallback(async () => {
    if (!stepId || !hasChanges) return;

    setIsLoading(true);
    setSaveErrors([]);

    try {
      const modifications: ParameterModification[] = [];

      // Find changed parameters
      for (const param of parameters) {
        const original = originalParameters.find(p => p.name === param.name);
        if (!original || JSON.stringify(original.value) !== JSON.stringify(param.value)) {
          modifications.push({
            stepId,
            parameterName: param.name,
            oldValue: original?.value || '',
            newValue: param.value,
            timestamp: new Date(),
            source: 'direct_edit'
          });
        }
      }

      // Apply modifications sequentially
      const results: ParameterEditResult[] = [];
      for (const modification of modifications) {
        const result = await onParameterEdit(
          modification.stepId,
          modification.parameterName,
          modification.oldValue,
          modification.newValue
        );
        results.push(result);
      }

      // Check for errors
      const errors = results.flatMap(result => 
        result.validationErrors?.map(error => error.conversationalExplanation) || []
      );

      if (errors.length > 0) {
        setSaveErrors(errors);
      } else {
        // Success - update original parameters and close
        setOriginalParameters(JSON.parse(JSON.stringify(parameters)));
        setHasChanges(false);
        onClose();
      }

    } catch (error) {
      console.error('Failed to save parameter changes:', error);
      setSaveErrors([`Failed to save changes: ${error instanceof Error ? error.message : 'Unknown error'}`]);
    } finally {
      setIsLoading(false);
    }
  }, [stepId, hasChanges, parameters, originalParameters, onParameterEdit, onClose]);

  // Render parameter input based on type
  const renderParameterInput = useCallback((param: ParameterValue) => {
    const paramError = validationErrors.find(error => 
      error.stepId === stepId && error.id?.includes(param.name)
    );

    switch (param.type) {
      case 'boolean':
        return (
          <FormControlLabel
            control={
              <Switch
                checked={Boolean(param.value)}
                onChange={(e) => handleParameterChange(param.name, e.target.checked)}
              />
            }
            label={param.name}
          />
        );

      case 'number':
        return (
          <TextField
            fullWidth
            label={param.name}
            type="number"
            value={param.value}
            onChange={(e) => handleParameterChange(param.name, Number(e.target.value))}
            required={param.required}
            error={!!paramError}
            helperText={paramError?.conversationalExplanation || param.description}
            size="small"
          />
        );

      case 'array':
        if (param.name === 'nextSteps') {
          return (
            <Autocomplete
              multiple
              options={[]} // Would be populated with available step IDs
              value={Array.isArray(param.value) ? param.value : []}
              onChange={(_, newValue) => handleParameterChange(param.name, newValue)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={param.name}
                  required={param.required}
                  error={!!paramError}
                  helperText={paramError?.conversationalExplanation || param.description}
                  size="small"
                />
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => {
                  const { key, ...chipProps } = getTagProps({ index });
                  return (
                    <Chip
                      key={key || `chip-${index}`}
                      {...chipProps}
                      variant="outlined"
                      label={option}
                    />
                  );
                })
              }
            />
          );
        }
        return (
          <TextField
            fullWidth
            label={param.name}
            multiline
            rows={3}
            value={JSON.stringify(param.value, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                handleParameterChange(param.name, parsed);
              } catch {
                // Invalid JSON, keep as string for now
                handleParameterChange(param.name, e.target.value);
              }
            }}
            required={param.required}
            error={!!paramError}
            helperText={paramError?.conversationalExplanation || param.description}
            size="small"
          />
        );

      case 'object':
        return (
          <TextField
            fullWidth
            label={param.name}
            multiline
            rows={4}
            value={JSON.stringify(param.value, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                handleParameterChange(param.name, parsed);
              } catch {
                // Invalid JSON, keep as string for now
                handleParameterChange(param.name, e.target.value);
              }
            }}
            required={param.required}
            error={!!paramError}
            helperText={paramError?.conversationalExplanation || param.description}
            size="small"
          />
        );

      default: // string
        if (param.name === 'action' && availableFunctions.length > 0) {
          return (
            <FormControl fullWidth size="small">
              <InputLabel>{param.name}</InputLabel>
              <Select
                value={param.value}
                onChange={(e) => handleParameterChange(param.name, e.target.value)}
                label={param.name}
                required={param.required}
                error={!!paramError}
              >
                {availableFunctions.map((func) => (
                  <MenuItem key={func} value={func}>
                    {func}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          );
        }

        return (
          <TextField
            fullWidth
            label={param.name}
            value={param.value}
            onChange={(e) => handleParameterChange(param.name, e.target.value)}
            required={param.required}
            error={!!paramError}
            helperText={paramError?.conversationalExplanation || param.description}
            size="small"
            multiline={param.name === 'name' ? false : String(param.value).length > 50}
            rows={String(param.value).length > 50 ? 2 : 1}
          />
        );
    }
  }, [validationErrors, stepId, handleParameterChange, availableFunctions]);

  if (!step || !stepId) {
    return null;
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { maxHeight: '80vh' }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h6">
            Edit Step: {step.name}
          </Typography>
          <Chip label={step.type} size="small" variant="outlined" />
        </Box>
        <Tooltip title="Close">
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Tooltip>
      </DialogTitle>

      <DialogContent dividers>
        {saveErrors.length > 0 && (
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Validation Errors:
            </Typography>
            {saveErrors.map((error, index) => (
              <Typography key={index} variant="body2">
                • {error}
              </Typography>
            ))}
          </Alert>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <InfoIcon color="info" fontSize="small" />
          <Typography variant="body2" color="text.secondary">
            Changes will be saved as a draft and the AI will be notified for context awareness.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {parameters.map((param) => (
            <Paper key={param.name} sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography variant="subtitle2">
                  {param.name}
                </Typography>
                {param.required && (
                  <Chip label="Required" size="small" color="error" variant="outlined" />
                )}
              </Box>
              {renderParameterInput(param)}
            </Paper>
          ))}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button
          onClick={handleReset}
          disabled={!hasChanges || isLoading}
          startIcon={<UndoIcon />}
        >
          Reset
        </Button>
        <Button onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={!hasChanges || isLoading}
          variant="contained"
          startIcon={<SaveIcon />}
        >
          {isLoading ? 'Saving...' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}