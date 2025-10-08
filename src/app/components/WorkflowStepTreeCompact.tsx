// src/app/components/WorkflowStepTreeCompact.tsx
'use client';

import React, { useCallback, useMemo, useState } from 'react';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Box,
  Chip
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';
import { WorkflowStep } from '@/app/types/workflow';
import { findStepById } from '@/app/utils/workflow-navigation';
import { getLLMContext } from '@/app/data/workflow-conversation-autocomplete';
import {
  buildFunctionDefinitionLookup,
  getRoutingFieldValue,
  getRoutingKeysForStep,
  ROUTING_FIELD_CONFIG,
  RoutingFieldKey
} from '@/app/utils/workflow-routing-helpers';

const ROUTING_CHIP_PREFIX: Partial<Record<RoutingFieldKey, string>> = {
  onSuccessGoTo: '✓ Success → ',
  onFailureGoTo: '✗ Failure → ',
  onApproval: 'Approval → ',
  onReject: 'Reject → ',
  onYes: 'Yes → ',
  onNo: 'No → ',
  nextSteps: 'Next → '
};

const ROUTING_CHIP_COLOR: Partial<
  Record<RoutingFieldKey, 'default' | 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning'>
> = {
  onSuccessGoTo: 'success',
  onFailureGoTo: 'error',
  onApproval: 'success',
  onYes: 'success',
  onReject: 'warning',
  onNo: 'warning',
  nextSteps: 'info'
};

type RoutingEntry = {
  key: RoutingFieldKey;
  label: string;
  color: 'default' | 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning';
  count: number;
};

interface WorkflowStepTreeCompactProps {
  steps: WorkflowStep[];
  onStepClick?: (step: WorkflowStep, path: number[]) => void;
}

interface CompactStepNodeProps {
  step: WorkflowStep;
  path: number[];
  allSteps: WorkflowStep[];
  onStepClick?: (step: WorkflowStep, path: number[]) => void;
  definitionLookup: ReturnType<typeof buildFunctionDefinitionLookup>;
}

/**
 * Compact step node component
 * - Shows ONLY step name (no icons)
 * - Displays tree numbering (1, 1.1, 1.1.1)
 * - Shows next step names (not IDs)
 * - Professional accordion format
 */
function CompactStepNode({ step, path, allSteps, onStepClick, definitionLookup }: CompactStepNodeProps) {
  // Check if step has inline branches (to determine default expand state)
  const hasInlineSuccess = step.onSuccess !== undefined;
  const hasInlineFailure = step.onFailure !== undefined;
  const shouldExpandByDefault = (step.type === 'condition' && (hasInlineSuccess || hasInlineFailure));
  
  const [expanded, setExpanded] = useState(shouldExpandByDefault);
  
  // Generate tree-based numbering from path (1, 1.1, 1.1.1, etc.)
  const stepNumber = path.map(i => i + 1).join('.');
  
  // Calculate indentation based on nesting level (20px per level)
  const indent = (path.length - 1) * 20;
  
  const resolveTarget = useCallback(
    (target: string | WorkflowStep | undefined): string | null => {
      if (!target) {
        return null;
      }

      if (typeof target === 'string') {
        const searchResult = findStepById(allSteps, target);
        return searchResult?.step.name || target;
      }

      if (typeof target === 'object') {
        return target.name || target.id;
      }

      return null;
    },
    [allSteps]
  );

  const routingEntries = useMemo<RoutingEntry[]>(() => {
    const keys = getRoutingKeysForStep(step, definitionLookup);

    return keys.reduce<RoutingEntry[]>((acc, key) => {
      const config = ROUTING_FIELD_CONFIG[key];
      if (!config) {
        return acc;
      }

      const rawValue = getRoutingFieldValue(step, key);
      const color = ROUTING_CHIP_COLOR[key] ?? 'default';
      const prefix = ROUTING_CHIP_PREFIX[key] ?? `${config.label} → `;

      if (Array.isArray(rawValue)) {
        const resolvedTargets = rawValue
          .map((value) => ({
            resolved: resolveTarget(value),
            isInline: typeof value === 'object' && value !== null
          }))
          .filter(({ resolved }) => Boolean(resolved)) as Array<{ resolved: string; isInline: boolean }>;

        if (resolvedTargets.length === 0) {
          return acc;
        }

        const referenceCount = resolvedTargets.filter(({ isInline }) => !isInline).length;

        acc.push({
          key,
          label: `${prefix}${resolvedTargets.map(({ resolved }) => resolved).join(', ')}`,
          color,
          count: referenceCount
        });
        return acc;
      }

      const resolvedTarget = resolveTarget(rawValue as string | WorkflowStep | undefined);
      if (!resolvedTarget) {
        return acc;
      }

      const isInlineValue = typeof rawValue === 'object' && rawValue !== null;

      acc.push({
        key,
        label: `${prefix}${resolvedTarget}`,
        color,
        count: isInlineValue ? 0 : 1
      });

      return acc;
    }, []);
  }, [definitionLookup, resolveTarget, step]);

  const routingEntryCount = routingEntries.reduce((total, entry) => total + entry.count, 0);

  // Check if step has any children or next steps
  const hasChildren = step.children && step.children.length > 0;
  const hasNextSteps = routingEntries.length > 0 || hasChildren || hasInlineSuccess || hasInlineFailure;
  const nestedStepCount = routingEntryCount + (hasChildren ? step.children!.length : 0) + (hasInlineSuccess ? 1 : 0) + (hasInlineFailure ? 1 : 0);
  
  const handleAccordionChange = (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded);
  };
  
  const handleStepClick = (e: React.MouseEvent) => {
    // Prevent accordion toggle when clicking on the step itself
    if (onStepClick && e.target === e.currentTarget) {
      onStepClick(step, path);
    }
  };
  
  return (
    <Box>
      <Accordion 
        expanded={expanded} 
        onChange={handleAccordionChange}
        disableGutters
        elevation={0}
        sx={{
          '&:before': {
            display: 'none',
          },
          backgroundColor: 'transparent',
        }}
      >
        <AccordionSummary
          expandIcon={hasNextSteps ? <ExpandMoreIcon /> : null}
          sx={{
            pl: `${indent}px`,
            minHeight: 40,
            '&.Mui-expanded': {
              minHeight: 40,
            },
            '& .MuiAccordionSummary-content': {
              margin: '8px 0',
              '&.Mui-expanded': {
                margin: '8px 0',
              },
            },
            '&:hover': {
              backgroundColor: 'action.hover',
              cursor: onStepClick ? 'pointer' : 'default',
            },
          }}
          onClick={handleStepClick}
        >
          <Typography 
            variant="body2" 
            sx={{ 
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              flex: 1,
            }}
          >
            <Box component="span" sx={{ color: 'text.secondary', minWidth: '40px' }}>
              {stepNumber}.
            </Box>
            {step.name}
          </Typography>
          
          {/* Show badge with nested step count when collapsed */}
          {!expanded && nestedStepCount > 0 && (
            <Chip
              label={`${nestedStepCount} nested step${nestedStepCount > 1 ? 's' : ''}`}
              size="small"
              sx={{ 
                ml: 1,
                height: 20,
                fontSize: '0.7rem',
                backgroundColor: 'primary.main',
                color: 'primary.contrastText',
                fontWeight: 500,
              }}
            />
          )}
        </AccordionSummary>
        
        {hasNextSteps && (
          <AccordionDetails sx={{ pl: `${indent + 60}px`, pt: 0, pb: 1 }}>
            {/* Show next steps by NAME (not ID) */}
            {routingEntries.map((entry) => (
              <Box key={entry.key} sx={{ mb: 0.5 }}>
                <Chip
                  label={entry.label}
                  size="small"
                  variant="outlined"
                  color={entry.color ?? 'default'}
                  sx={{
                    height: 24,
                    fontSize: '0.75rem',
                    borderRadius: 1
                  }}
                />
              </Box>
            ))}
            
            {/* Render inline success step */}
            {hasInlineSuccess && step.onSuccess && (
              <Box sx={{ mt: 1 }}>
                <CompactStepNode
                  step={step.onSuccess}
                  path={[...path, 0]} // First inline child
                  allSteps={allSteps}
                  onStepClick={onStepClick}
                  definitionLookup={definitionLookup}
                />
              </Box>
            )}
            
            {/* Render inline failure step */}
            {hasInlineFailure && step.onFailure && (
              <Box sx={{ mt: 1 }}>
                <CompactStepNode
                  step={step.onFailure}
                  path={[...path, hasInlineSuccess ? 1 : 0]} // Second inline child if success exists
                  allSteps={allSteps}
                  onStepClick={onStepClick}
                  definitionLookup={definitionLookup}
                />
              </Box>
            )}
            
            {/* Render sequential children recursively */}
            {hasChildren && step.children!.map((child, index) => {
              // Calculate child index accounting for inline steps
              const childIndex = (hasInlineSuccess ? 1 : 0) + (hasInlineFailure ? 1 : 0) + index;
              return (
                <Box key={child.id} sx={{ mt: index > 0 ? 1 : 0 }}>
                  <CompactStepNode
                    step={child}
                    path={[...path, childIndex]}
                    allSteps={allSteps}
                    onStepClick={onStepClick}
                    definitionLookup={definitionLookup}
                  />
                </Box>
              );
            })}
          </AccordionDetails>
        )}
      </Accordion>
    </Box>
  );
}

/**
 * Compact workflow step tree component
 * 
 * Features:
 * - Accordion-based UI (no icons)
 * - Shows ONLY step names
 * - Tree-based numbering (1, 1.1, 1.1.1)
 * - Shows next step names (not IDs)
 * - Professional, clean format
 * 
 * @param steps - Root-level workflow steps
 * @param onStepClick - Optional callback when step is clicked
 */
export default function WorkflowStepTreeCompact({ 
  steps, 
  onStepClick 
}: WorkflowStepTreeCompactProps) {
  const llmFunctionDefinitions = useMemo(() => getLLMContext(), []);
  const definitionLookup = useMemo(
    () => buildFunctionDefinitionLookup(llmFunctionDefinitions),
    [llmFunctionDefinitions]
  );

  // Flatten all steps for lookup (to find names from IDs)
  const flattenSteps = (stepArray: WorkflowStep[]): WorkflowStep[] => {
    const result: WorkflowStep[] = [];
    
    const traverse = (step: WorkflowStep) => {
      result.push(step);
      if (step.children) {
        step.children.forEach(traverse);
      }
      if (step.onSuccess) {
        traverse(step.onSuccess);
      }
      if (step.onFailure) {
        traverse(step.onFailure);
      }
    };
    
    stepArray.forEach(traverse);
    return result;
  };
  
  const allSteps = useMemo(() => flattenSteps(steps), [steps]);
  
  if (!steps || steps.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No workflow steps defined
        </Typography>
      </Box>
    );
  }
  
  return (
    <Box sx={{ width: '100%' }}>
      {steps.map((step, index) => (
        <CompactStepNode
          key={step.id}
          step={step}
          path={[index]}
          allSteps={allSteps}
          onStepClick={onStepClick}
          definitionLookup={definitionLookup}
        />
      ))}
    </Box>
  );
}
