// src/app/components/WorkflowStepTreeCompact.tsx
'use client';

import React, { useState } from 'react';
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

interface WorkflowStepTreeCompactProps {
  steps: WorkflowStep[];
  onStepClick?: (step: WorkflowStep, path: number[]) => void;
}

interface CompactStepNodeProps {
  step: WorkflowStep;
  path: number[];
  allSteps: WorkflowStep[];
  onStepClick?: (step: WorkflowStep, path: number[]) => void;
}

/**
 * Compact step node component
 * - Shows ONLY step name (no icons)
 * - Displays tree numbering (1, 1.1, 1.1.1)
 * - Shows next step names (not IDs)
 * - Professional accordion format
 */
function CompactStepNode({ step, path, allSteps, onStepClick }: CompactStepNodeProps) {
  // Check if step has inline branches (to determine default expand state)
  const hasInlineSuccess = step.onSuccess !== undefined;
  const hasInlineFailure = step.onFailure !== undefined;
  const shouldExpandByDefault = (step.type === 'condition' && (hasInlineSuccess || hasInlineFailure));
  
  const [expanded, setExpanded] = useState(shouldExpandByDefault);
  
  // Generate tree-based numbering from path (1, 1.1, 1.1.1, etc.)
  const stepNumber = path.map(i => i + 1).join('.');
  
  // Calculate indentation based on nesting level (20px per level)
  const indent = (path.length - 1) * 20;
  
  // Find next step names from IDs (not showing IDs, only names)
  const getNextStepName = (stepId: string | undefined): string | null => {
    if (!stepId) return null;
    const searchResult = findStepById(allSteps, stepId);
    return searchResult?.step.name || null;
  };
  
  const onSuccessStepName = getNextStepName(step.onSuccessGoTo);
  const onFailureStepName = getNextStepName(step.onFailureGoTo);
  
  // Check if step has any children or next steps
  const hasChildren = step.children && step.children.length > 0;
  const hasNextSteps = onSuccessStepName || onFailureStepName || hasChildren || hasInlineSuccess || hasInlineFailure;
  
  // Count nested steps for badge display when collapsed
  const countNestedSteps = () => {
    let count = 0;
    if (hasInlineSuccess) count++;
    if (hasInlineFailure) count++;
    if (hasChildren) count += step.children!.length;
    return count;
  };
  
  const nestedStepCount = countNestedSteps();
  
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
            {onSuccessStepName && (
              <Box sx={{ mb: 0.5 }}>
                <Chip
                  label={`✓ Success → ${onSuccessStepName}`}
                  size="small"
                  variant="outlined"
                  color="success"
                  sx={{ 
                    height: 24, 
                    fontSize: '0.75rem',
                    borderRadius: 1,
                  }}
                />
              </Box>
            )}
            
            {onFailureStepName && (
              <Box sx={{ mb: 0.5 }}>
                <Chip
                  label={`✗ Failure → ${onFailureStepName}`}
                  size="small"
                  variant="outlined"
                  color="error"
                  sx={{ 
                    height: 24, 
                    fontSize: '0.75rem',
                    borderRadius: 1,
                  }}
                />
              </Box>
            )}
            
            {/* Render inline success step */}
            {hasInlineSuccess && step.onSuccess && (
              <Box sx={{ mt: 1 }}>
                <CompactStepNode
                  step={step.onSuccess}
                  path={[...path, 0]} // First inline child
                  allSteps={allSteps}
                  onStepClick={onStepClick}
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
  
  const allSteps = flattenSteps(steps);
  
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
        />
      ))}
    </Box>
  );
}
