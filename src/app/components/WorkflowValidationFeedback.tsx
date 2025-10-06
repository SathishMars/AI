// src/app/components/WorkflowValidationFeedback.tsx
'use client';

import React, { useState, useMemo } from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Collapse,
  IconButton,
  Typography,
  Chip,
  List,
  ListItem,
  ListItemText,
  Divider,
  Paper
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { ValidationError } from '@/app/types/workflow';

/**
 * Props for WorkflowValidationFeedback component
 */
export interface WorkflowValidationFeedbackProps {
  /**
   * Validation errors to display
   */
  errors: ValidationError[];
  
  /**
   * Validation warnings to display
   */
  warnings: ValidationError[];
  
  /**
   * Whether validation is currently running
   */
  isValidating?: boolean;
  
  /**
   * Callback when user clicks on a step in error list
   */
  onStepClick?: (stepId: string) => void;
  
  /**
   * Whether to show warnings (default: true)
   */
  showWarnings?: boolean;
  
  /**
   * Whether to group errors by type (default: true)
   */
  groupByType?: boolean;
  
  /**
   * Custom class name for styling
   */
  className?: string;
  
  /**
   * Whether to show success state when no errors (default: true)
   */
  showSuccessState?: boolean;
}

/**
 * Grouped validation errors by type
 */
interface GroupedErrors {
  stepIds: ValidationError[];
  references: ValidationError[];
  structure: ValidationError[];
  circular: ValidationError[];
  other: ValidationError[];
}

/**
 * Component for displaying workflow validation feedback
 * 
 * Features:
 * - Color-coded error/warning display
 * - Collapsible error groups
 * - Clickable step references
 * - User-friendly error explanations
 * - Success state when no errors
 * 
 * @example
 * ```tsx
 * <WorkflowValidationFeedback
 *   errors={validationErrors}
 *   warnings={validationWarnings}
 *   onStepClick={(stepId) => navigateToStep(stepId)}
 * />
 * ```
 */
export function WorkflowValidationFeedback({
  errors,
  warnings,
  isValidating = false,
  onStepClick,
  showWarnings = true,
  groupByType = true,
  className,
  showSuccessState = true
}: WorkflowValidationFeedbackProps): React.ReactElement | null {
  // Collapsed state for error groups
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['stepIds', 'references']));

  /**
   * Group errors by type (inferred from error ID)
   */
  const groupedErrors = useMemo<GroupedErrors>(() => {
    const groups: GroupedErrors = {
      stepIds: [],
      references: [],
      structure: [],
      circular: [],
      other: []
    };

    errors.forEach(error => {
      // Infer type from error ID prefix (e.g., "stepId-invalid", "ref-not-found")
      const errorId = error.id.toLowerCase();
      
      if (errorId.startsWith('stepid') || errorId.includes('invalid-id') || errorId.includes('duplicate-id')) {
        groups.stepIds.push(error);
      } else if (errorId.startsWith('ref') || errorId.includes('reference') || errorId.includes('not-found')) {
        groups.references.push(error);
      } else if (errorId.includes('circular') || errorId.includes('cycle')) {
        groups.circular.push(error);
      } else if (errorId.includes('structure') || errorId.includes('invalid-workflow')) {
        groups.structure.push(error);
      } else {
        groups.other.push(error);
      }
    });

    return groups;
  }, [errors]);

  /**
   * Toggle expansion of error group
   */
  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupName)) {
        next.delete(groupName);
      } else {
        next.add(groupName);
      }
      return next;
    });
  };

  /**
   * Handle step click
   */
  const handleStepClick = (stepId: string | undefined) => {
    if (stepId && onStepClick) {
      onStepClick(stepId);
    }
  };

  /**
   * Get severity icon
   */
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return <ErrorIcon fontSize="small" />;
      case 'warning':
        return <WarningIcon fontSize="small" />;
      case 'info':
        return <InfoIcon fontSize="small" />;
      default:
        return <ErrorIcon fontSize="small" />;
    }
  };

  /**
   * Get group title
   */
  const getGroupTitle = (groupName: string): string => {
    const titles: Record<string, string> = {
      stepIds: 'Step ID Issues',
      references: 'Reference Issues',
      structure: 'Structure Issues',
      circular: 'Circular Reference Issues',
      other: 'Other Issues'
    };
    return titles[groupName] || groupName;
  };

  /**
   * Render error group
   */
  const renderErrorGroup = (groupName: string, groupErrors: ValidationError[]) => {
    if (groupErrors.length === 0) return null;

    const isExpanded = expandedGroups.has(groupName);

    return (
      <Paper key={groupName} elevation={0} sx={{ mb: 1, border: '1px solid #e0e0e0' }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 1,
            bgcolor: '#f5f5f5',
            cursor: 'pointer',
            '&:hover': { bgcolor: '#eeeeee' }
          }}
          onClick={() => toggleGroup(groupName)}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ErrorIcon fontSize="small" color="error" />
            <Typography variant="subtitle2">
              {getGroupTitle(groupName)}
            </Typography>
            <Chip label={groupErrors.length} size="small" color="error" />
          </Box>
          <IconButton size="small">
            {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>
        <Collapse in={isExpanded}>
          <List dense>
            {groupErrors.map((error, index) => (
              <React.Fragment key={index}>
                <ListItem
                  sx={{
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    '&:hover': { bgcolor: '#fafafa' }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                    {getSeverityIcon(error.severity)}
                    <Typography variant="body2" sx={{ fontWeight: 500, flex: 1 }}>
                      {error.conversationalExplanation}
                    </Typography>
                    {error.stepId && (
                      <Chip
                        label={error.stepId}
                        size="small"
                        variant="outlined"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStepClick(error.stepId);
                        }}
                        sx={{ cursor: onStepClick ? 'pointer' : 'default' }}
                      />
                    )}
                  </Box>
                  {error.suggestedFix && (
                    <Typography
                      variant="caption"
                      sx={{ mt: 0.5, ml: 3, color: 'text.secondary' }}
                    >
                      💡 Suggested fix: {error.suggestedFix}
                    </Typography>
                  )}
                </ListItem>
                {index < groupErrors.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </Collapse>
      </Paper>
    );
  };

  /**
   * Render flat error list (no grouping)
   */
  const renderFlatErrors = () => {
    return (
      <List dense>
        {errors.map((error, index) => (
          <React.Fragment key={index}>
            <ListItem
              sx={{
                flexDirection: 'column',
                alignItems: 'flex-start',
                '&:hover': { bgcolor: '#fafafa' }
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                {getSeverityIcon(error.severity)}
                <Typography variant="body2" sx={{ fontWeight: 500, flex: 1 }}>
                  {error.conversationalExplanation}
                </Typography>
                {error.stepId && (
                  <Chip
                    label={error.stepId}
                    size="small"
                    variant="outlined"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStepClick(error.stepId);
                    }}
                    sx={{ cursor: onStepClick ? 'pointer' : 'default' }}
                  />
                )}
              </Box>
              {error.suggestedFix && (
                <Typography
                  variant="caption"
                  sx={{ mt: 0.5, ml: 3, color: 'text.secondary' }}
                >
                  💡 Suggested fix: {error.suggestedFix}
                </Typography>
              )}
            </ListItem>
            {index < errors.length - 1 && <Divider />}
          </React.Fragment>
        ))}
      </List>
    );
  };

  // Show loading state
  if (isValidating) {
    return (
      <Alert severity="info" className={className}>
        <AlertTitle>Validating...</AlertTitle>
        Checking workflow for errors...
      </Alert>
    );
  }

  // Show success state if no errors
  if (errors.length === 0 && warnings.length === 0) {
    if (!showSuccessState) return null;
    
    return (
      <Alert severity="success" icon={<CheckCircleIcon />} className={className}>
        <AlertTitle>Validation Passed</AlertTitle>
        Your workflow is valid and ready to save!
      </Alert>
    );
  }

  // Show errors
  if (errors.length > 0) {
    return (
      <Box className={className}>
        <Alert severity="error" sx={{ mb: 2 }}>
          <AlertTitle>Validation Errors ({errors.length})</AlertTitle>
          Please fix the following errors before saving:
        </Alert>
        {groupByType ? (
          Object.entries(groupedErrors).map(([groupName, groupErrors]) =>
            renderErrorGroup(groupName, groupErrors)
          )
        ) : (
          <Paper elevation={1} sx={{ p: 1 }}>
            {renderFlatErrors()}
          </Paper>
        )}
      </Box>
    );
  }

  // Show warnings only
  if (showWarnings && warnings.length > 0) {
    return (
      <Alert severity="warning" className={className}>
        <AlertTitle>Warnings ({warnings.length})</AlertTitle>
        <List dense>
          {warnings.map((warning, index) => (
            <ListItem key={index} sx={{ py: 0.5 }}>
              <ListItemText
                primary={warning.conversationalExplanation}
                secondary={warning.suggestedFix}
              />
            </ListItem>
          ))}
        </List>
      </Alert>
    );
  }

  return null;
}
