// src/app/components/WorkflowStepTree.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { Box, IconButton, Typography, Chip, Paper, Divider, Icon } from '@mui/material';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { TreeItem } from '@mui/x-tree-view/TreeItem';
import { WorkflowStep } from '@/app/types/workflowTemplate';
import { workflowFunctionTypeConfig } from '../data/workflow-tool-defintions';
import WorkflowStepTrigger from './WorkflowStepTrigger';
import WorkflowStepDecision from './WorkflowStepDecision';
import WorkflowStepApproval from './WorkflowStepApproval';
import WorkflowStepGeneric from './WorkflowStepGeneric';
// 'get' from 'http' was unused and removed
import { getReferredSteps, getStepsLabelsMap } from '../utils/WorkflowStepUtils';
import WorkflowStepSwitchCase from './WorkflowStepSwitchCase';
import WorkflowStepNotify from './WorkflowStepNotify';
import styles from "./WorkflowStepTree.module.scss"

const MOCK_DATA: WorkflowStep[] = [
  {
    id: 'ght223nmop',  // replace with a generated unique step ID used as refernce in other steps where needed to chain the steps
    label: 'On receiving the MRF', // human readable name for the step based on context of what the step does
    type: 'trigger',
    stepFunction: 'onMRF',
    functionParams: {
      mrfTemplateName: 'all' // if provided by the user in their description, match to the available MRF types from the api or use 'all' for any MRF. 
    },
    next: [{
      id: '88nbbsq7n',
      label: 'Send notification to manager',
      type: 'task',
      stepFunction: 'sendEmail',
      functionParams: {
        to: '${manager}',
        subject: 'A new meeting request from John Doe was submitted',
        notificationTemplateName: 'manager-meeting-request'
      },
      next: [
        {
          id: '7c8aScds7e',
          label: 'Create the event for annual budget review',
          type: 'task',
          stepFunction: 'createEvent',
          functionParams: {},
          next: ['87snjhsw76']
        }
      ]
    },
    {
      id: '3klmop4567',
      label: 'Request approval from manager',
      type: 'decision',
      stepFunction: 'requestApproval',
      functionParams: {
        approver: '${manager}',
        reason: 'Budget exceeds department threshold'
      },
      onConditionPass: '7c8aScds7e',
      onConditionFail: '87snjhsw76',
      onTimeout: 'jds7bbsq7n',
      timeout: 86400,
      retryCount: 2,
      retryDelay: 3600
    },
    ] // next step ID to execute after this step
  },
  {
    id: '87snjhsw76',
    label: 'Terminate workflow',
    type: 'terminate',
    stepFunction: 'terminate',
    functionParams: {},
    next: []
  }
]

interface WorkflowStepTreeProps {
  workflowSteps: WorkflowStep[];
  onStepSave?: (step: WorkflowStep) => void;
}

/**
 * Workflow Step Tree using MUI X Tree View
 * 
 */
export default function WorkflowStepTree({ workflowSteps, onStepSave }: WorkflowStepTreeProps) {


  const [steps, setSteps] = useState<WorkflowStep[]>(MOCK_DATA || []);
  const [expanded, setExpanded] = useState<string[]>([]); //we plan to have all the nodes expanded by default
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const workflowStepsMap = React.useMemo(() => {
    return getStepsLabelsMap(workflowSteps);
  }, [workflowSteps]);

  console.log('WorkflowStepTree - rendering with steps:', steps);

  const expandAllNodes = (steps: WorkflowStep[]): string[] => {
    const allIds: string[] = [];

    const traverse = (nodes: WorkflowStep[]) => {
      nodes.forEach(node => {
        allIds.push(node.id);
        let children: Array<WorkflowStep> = [];
        if (node.next && Array.isArray(node.next)) {
          children = [...children, ...node.next.filter(child => typeof child === 'object') as WorkflowStep[]];
        }
        if (node.onConditionPass && typeof node.onConditionPass === 'object') {
          children.push(node.onConditionPass);
        }
        if (node.onConditionFail && typeof node.onConditionFail === 'object') {
          children.push(node.onConditionFail);
        }
        if (node.onError && typeof node.onError === 'object') {
          children.push(node.onError);
        }
        if (node.onTimeout && typeof node.onTimeout === 'object') {
          children.push(node.onTimeout);
        }
        if (children.length > 0) {
          traverse(children);
        }
      });
    };

    traverse(steps);
    return allIds;
  };

  const handleExpandedItemsChange = (event: React.SyntheticEvent | null, itemIds: string[]) => {
    setExpanded(itemIds);
  };

  useEffect(() => {
    console.log('WorkflowStepTree - workflowSteps prop changed:', workflowSteps);
    if (workflowSteps) {
      setSteps(JSON.parse(JSON.stringify(workflowSteps)) || []); // set it to a modifyable copy without affecting the original object
      setExpanded(expandAllNodes(workflowSteps)); //expand all nodes by default
      //for testing purposes let us temporarily assign mock data to steps
      // setSteps(MOCK_DATA);
      // setExpanded(expandAllNodes(MOCK_DATA)); //expand all nodes by default
    }
  }, [workflowSteps]);

  // Get step type color
  const getStepTypeColor = (type: string): string => {
    return workflowFunctionTypeConfig[type]?.color || 'grey';
  };

  // Get step type label
  const getStepTypeLabel = (type: string): string => {
    if (!type) return 'Unknown';
    return workflowFunctionTypeConfig[type]?.label || type;
  };

  const getStepTypeIcon = (type: string): string => {
    return workflowFunctionTypeConfig[type]?.icon || 'help_outline';
  }

  const handleStepEdit = (step: WorkflowStep) => {
    // we should ideally check if any other step is being edited and warn the user.
    setEditingStepId(step.id);
  };

  // editing completion handled inline when saving/cancelling

  // Render a single tree item with all its children
  const renderTreeItem = (step: WorkflowStep): React.ReactNode => {
    const typeColor = getStepTypeColor(step.type);
    const typeLabel = getStepTypeLabel(step.type);
    const icon: string = getStepTypeIcon(step.type);
    const referredNextSteps = getReferredSteps(step.next || []);
    let children: Array<WorkflowStep> = [];

    if (step.next && Array.isArray(step.next)) {
      //we need to add all the items that are not strings
      children = [...children, ...step.next.filter(child => typeof child === 'object') as WorkflowStep[]];
    }
    if (step.onConditionPass && typeof step.onConditionPass === 'object') {
      children.push(step.onConditionPass);
    }
    if (step.onConditionFail && typeof step.onConditionFail === 'object') {
      children.push(step.onConditionFail);
    }
    if (step.onError && typeof step.onError === 'object') {
      children.push(step.onError);
    }
    if (step.onTimeout && typeof step.onTimeout === 'object') {
      children.push(step.onTimeout);
    }

    const onSave = (updated: WorkflowStep) => {
      console.log("Step saved:", updated);
      // Call optional prop to notify parent
      if (onStepSave) {
        onStepSave(updated);
      }
      // update the step in local state
      setEditingStepId(null);
    }

    const onCancel = () => {
      setEditingStepId(null);
    }

    const renderEditingForm = (step: WorkflowStep) => {
      switch (step.stepFunction) {
        case 'onMRF':
          return (
            <WorkflowStepTrigger
              step={step}
              onSave={onSave}
              onCancel={onCancel}
            />
          );
        case 'checkCondition':
          return (
            <WorkflowStepDecision
              step={step}
              onSave={onSave}
              onCancel={onCancel}
            />
          );
        case 'requestApproval':
          return (
            <WorkflowStepApproval
              step={step}
              onSave={onSave}
              onCancel={onCancel}
            />
          );
        case 'multiCheckCondition':
          return (
            <WorkflowStepSwitchCase
              step={step}
              stepIdMap={workflowStepsMap}
              onSave={onSave}
              onCancel={onCancel}
            />
          );
        case 'WorkflowStepNotify':
          return (
            <WorkflowStepNotify
              step={step}
              onSave={onSave}
              onCancel={onCancel}
            />
          );  
        default:
          return (
            <WorkflowStepGeneric
              step={step}
              onSave={onSave}
              onCancel={onCancel}
            />
          );
      }
    };

    console.log(`Rendering step ${step.id} with children:`, children);

    return (
      <TreeItem
        key={step.id}
        itemId={step.id}
        label={(
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', width: '100%', p: 1 }} className={styles["tree-item"]}>
            {(step.id !== editingStepId) ? (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Icon baseClassName='material-icons-outlined' fontSize="small" sx={{ color: 'primary.main', opacity: 0.5 }}>{icon}</Icon>
                  <Chip
                    label={typeLabel}
                    size="small"
                    sx={{
                      backgroundColor: typeColor,
                      color: 'white',
                      height: 20,
                      fontSize: '0.75rem',
                      fontWeight: 500
                    }}
                  />
                  <Typography variant="body1" sx={{ fontWeight: 500, color: typeColor }}>
                    {step.label || <i>(No label)</i>}
                  </Typography>
                  <Box sx={{ flexGrow: 1 }} />
                  <IconButton
                    size="small"
                    disabled={editingStepId !== null}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStepEdit(step);
                    }}
                  >
                    <Icon baseClassName='material-icons' fontSize='small' sx={{ fontSize: "small" }} >edit</Icon>
                  </IconButton>
                </Box>

                {((referredNextSteps && referredNextSteps.length > 0) || step.onConditionFail || step.onError || step.onTimeout || (step.conditions && step.conditions.length > 0)) && (
                  <>
                    <Divider sx={{ m: 1 }} />
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', ml: 1 }}>
                      {(referredNextSteps && referredNextSteps.length > 0) && (
                        <Chip label={
                          <>
                            {/* We will generate a comma separated list of next steps that are referred only by their ids and are not embedded objects */}
                            Next: {referredNextSteps.map(id => workflowStepsMap[id]).join(', ')}
                          </>
                        }
                        className={styles["tree-item-chip"]}
                          sx={{
                            height: 20,
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            p: 1,
                            m: 1
                          }} />
                      )}
                      {step.onConditionPass && (
                        <Chip label={
                          <>
                            On Pass: {(typeof step.onConditionPass === 'object') ? step.onConditionPass.label : workflowStepsMap[step.onConditionPass]}
                          </>
                        }
                          className={styles["tree-item-chip"]}
                          sx={{
                            height: 20,
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            p: 1,
                            m: 1
                          }} />
                      )}                      
                      {step.onConditionFail && (
                        <Chip label={
                          <>
                            On Fail: {(typeof step.onConditionFail === 'object') ? step.onConditionFail.label : workflowStepsMap[step.onConditionFail]}
                          </>
                        }
                          className={styles["tree-item-chip"]}
                          sx={{
                            height: 20,
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            p: 1,
                            m: 1
                          }} />
                      )}
                      {step.onError && (
                        <Chip label={
                          <>
                            On Error: {(typeof step.onError === 'object') ? step.onError.label : workflowStepsMap[step.onError]}
                          </>
                        }
                          className={styles["tree-item-chip"]}
                          sx={{
                            height: 20,
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            p: 1,
                            m: 1
                          }} />
                      )}
                      {step.onTimeout && (
                        <Chip label={
                          <>
                            On Timeout: {(typeof step.onTimeout === 'object') ? step.onTimeout.label : workflowStepsMap[step.onTimeout]}
                          </>
                        }
                          className={styles["tree-item-chip"]}
                          sx={{
                            height: 20,
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            p: 1,
                            m: 1
                          }} />
                      )}
                      {(step.conditions && step.conditions.length > 0) && step.conditions.map((cond, idx) => (
                        <Chip key={idx} label={
                          <>
                            {cond.value}: {workflowStepsMap[cond.next]}
                          </>
                        }
                          className={styles["tree-item-chip"]}
                          sx={{
                            height: 20,
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            p: 1,
                            m: 1
                          }} />
                      ))} 
                    </Box>
                  </>
                )}
              </>
            ) : (
              <>
                {renderEditingForm(step)}
              </>
            )}
          </Box>
        )}
      >
        {(children.length > 0) && (children.map((child) => renderTreeItem(child)))}
      </TreeItem>
    );
  };

  return (
    <Box sx={{ width: '100%', minHeight: 200 }}>
      <SimpleTreeView
        expandedItems={expanded}
        onExpandedItemsChange={handleExpandedItemsChange}
      // sx={{
      //   '& .MuiTreeItem-content': {
      //     // padding: '4px 8px',
      //     borderRadius: 1,
      //     '&:hover': {
      //       backgroundColor: 'action.hover'
      //     },
      //     '&.Mui-selected': {
      //       backgroundColor: 'action.selected',
      //       '&:hover': {
      //         backgroundColor: 'action.selected'
      //       }
      //     }
      //   },
      //   '& .MuiTreeItem-label': {
      //     // padding: 0
      //   }
      // }}
      >
        {steps.map((step) => renderTreeItem(step))}
      </SimpleTreeView>
    </Box>
  );
}
