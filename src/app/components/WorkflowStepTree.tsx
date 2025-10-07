// src/app/components/WorkflowStepTree.tsx
'use client';

import React from 'react';
import { Box, IconButton, Typography, Chip } from '@mui/material';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { TreeItem } from '@mui/x-tree-view/TreeItem';
import EditIcon from '@mui/icons-material/Edit';
import { WorkflowStep } from '@/app/types/workflow';

interface WorkflowStepTreeProps {
  steps: WorkflowStep[];
  onStepEdit?: (step: WorkflowStep) => void;
}

/**
 * Workflow Step Tree using MUI X Tree View
 * 
 * Features:
 * - All nodes always visible (no hidden content)
 * - Built-in expand/collapse with MUI Tree View
 * - Edit icon on each step to show form view
 * - No manual numbering needed
 * - Clean hierarchical visualization
 */
export default function WorkflowStepTree({ steps, onStepEdit }: WorkflowStepTreeProps) {
  // Generate unique item IDs for tree view
  const generateItemId = (step: WorkflowStep, path: string = ''): string => {
    return path ? `${path}-${step.id}` : step.id;
  };

  // Get step type color
  const getStepTypeColor = (type: string): string => {
    switch (type) {
      case 'trigger': return '#2E7D32'; // Green
      case 'condition': return '#F57C00'; // Orange
      case 'action': return '#1976D2'; // Blue
      case 'end': return '#B71C1C'; // Red
      case 'workflow': return '#7B1FA2'; // Purple
      default: return '#616161'; // Gray
    }
  };

  // Get step type label
  const getStepTypeLabel = (type: string): string => {
    switch (type) {
      case 'trigger': return 'Trigger';
      case 'condition': return 'Condition';
      case 'action': return 'Action';
      case 'end': return 'End';
      case 'workflow': return 'Workflow';
      default: return type;
    }
  };

  // Render a single tree item with all its children
  const renderTreeItem = (step: WorkflowStep, path: string = ''): React.ReactNode => {
    const itemId = generateItemId(step, path);
    const typeColor = getStepTypeColor(step.type);
    const typeLabel = getStepTypeLabel(step.type);

    // Collect all child nodes (children array + inline onSuccess/onFailure)
    const childNodes: React.ReactNode[] = [];

    // Add inline onSuccess step
    if (step.onSuccess) {
      childNodes.push(
        <Box key="onSuccess-wrapper" sx={{ position: 'relative' }}>
          <Box 
            sx={{ 
              position: 'absolute', 
              left: -40, 
              top: 8,
              fontSize: '0.75rem',
              color: 'success.main',
              fontWeight: 600
            }}
          >
            ✓
          </Box>
          {renderTreeItem(step.onSuccess, `${itemId}-success`)}
        </Box>
      );
    }

    // Add inline onFailure step
    if (step.onFailure) {
      childNodes.push(
        <Box key="onFailure-wrapper" sx={{ position: 'relative' }}>
          <Box 
            sx={{ 
              position: 'absolute', 
              left: -40, 
              top: 8,
              fontSize: '0.75rem',
              color: 'error.main',
              fontWeight: 600
            }}
          >
            ✗
          </Box>
          {renderTreeItem(step.onFailure, `${itemId}-failure`)}
        </Box>
      );
    }

    // Add sequential children
    if (step.children && step.children.length > 0) {
      step.children.forEach((child, index) => {
        childNodes.push(renderTreeItem(child, `${itemId}-child${index}`));
      });
    }

    // Create label with step info and edit button
    const label = (
      <Box 
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1,
          py: 0.5,
          pr: 1,
          '&:hover .edit-button': {
            opacity: 1
          }
        }}
      >
        {/* Step type chip */}
        <Chip
          label={typeLabel}
          size="small"
          sx={{
            height: 20,
            fontSize: '0.7rem',
            fontWeight: 600,
            backgroundColor: typeColor,
            color: 'white',
            minWidth: 70
          }}
        />

        {/* Step name */}
        <Typography 
          variant="body2" 
          sx={{ 
            fontWeight: 500,
            flex: 1
          }}
        >
          {step.name}
        </Typography>

        {/* Edit icon button */}
        {onStepEdit && (
          <IconButton
            className="edit-button"
            size="small"
            onClick={(e) => {
              e.stopPropagation(); // Prevent tree item toggle
              onStepEdit(step);
            }}
            sx={{
              opacity: 0,
              transition: 'opacity 0.2s',
              '&:hover': {
                backgroundColor: 'action.hover'
              }
            }}
          >
            <EditIcon fontSize="small" />
          </IconButton>
        )}

        {/* Show onSuccessGoTo/onFailureGoTo references if present */}
        {step.onSuccessGoTo && (
          <Chip
            label={`→ ${step.onSuccessGoTo}`}
            size="small"
            variant="outlined"
            color="success"
            sx={{ height: 20, fontSize: '0.65rem' }}
          />
        )}
        {step.onFailureGoTo && (
          <Chip
            label={`→ ${step.onFailureGoTo}`}
            size="small"
            variant="outlined"
            color="error"
            sx={{ height: 20, fontSize: '0.65rem' }}
          />
        )}
      </Box>
    );

    return (
      <TreeItem 
        key={itemId}
        itemId={itemId} 
        label={label}
      >
        {childNodes}
      </TreeItem>
    );
  };

  if (!steps || steps.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No workflow steps defined
        </Typography>
      </Box>
    );
  }

  // Collect all item IDs for default expansion (all nodes visible)
  const getAllItemIds = (stepsList: WorkflowStep[], basePath: string = ''): string[] => {
    const ids: string[] = [];
    stepsList.forEach((step, index) => {
      const path = basePath ? `${basePath}-${step.id}` : `root-${index}-${step.id}`;
      ids.push(path);
      
      if (step.onSuccess) {
        ids.push(...getAllItemIds([step.onSuccess], `${path}-success`));
      }
      if (step.onFailure) {
        ids.push(...getAllItemIds([step.onFailure], `${path}-failure`));
      }
      if (step.children) {
        step.children.forEach((child, childIndex) => {
          ids.push(...getAllItemIds([child], `${path}-child${childIndex}`));
        });
      }
    });
    return ids;
  };

  const expandedItemIds = getAllItemIds(steps);

  return (
    <Box sx={{ width: '100%', minHeight: 200 }}>
      <SimpleTreeView
        defaultExpandedItems={expandedItemIds}
        sx={{
          '& .MuiTreeItem-content': {
            // padding: '4px 8px',
            borderRadius: 1,
            '&:hover': {
              backgroundColor: 'action.hover'
            },
            '&.Mui-selected': {
              backgroundColor: 'action.selected',
              '&:hover': {
                backgroundColor: 'action.selected'
              }
            }
          },
          '& .MuiTreeItem-label': {
            // padding: 0
          }
        }}
      >
        {steps.map((step, index) => renderTreeItem(step, `root-${index}`))}
      </SimpleTreeView>
    </Box>
  );
}
