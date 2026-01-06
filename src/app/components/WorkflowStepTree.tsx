// src/app/components/WorkflowStepTree.tsx
'use client';

import React, { useMemo, useState } from 'react';
import { ChevronRight, ChevronDown, Edit, Check, X, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { WorkflowStep } from '@/app/types/workflowTemplate';
import { workflowFunctionTypeConfig } from '../data/workflow-step-definitions';
import WorkflowStepTrigger from './WorkflowStepTrigger';
import WorkflowStepDecision from './WorkflowStepDecision';
import WorkflowStepApproval from './WorkflowStepApproval';
import WorkflowStepGeneric from './WorkflowStepGeneric';
import { getReferredSteps, getStepsLabelsMap } from '../utils/WorkflowStepUtils';
import WorkflowStepSwitchCase from './WorkflowStepSwitchCase';
import WorkflowStepNotify from './WorkflowStepNotify';

interface WorkflowStepTreeProps {
  steps: WorkflowStep[];
  editingStepId: string | null;
  onStepEdit: (step: WorkflowStep) => void;
  onStepSave: (step: WorkflowStep) => void;
  onStepCancel: () => void;
}

interface TreeNodeProps {
  step: WorkflowStep;
  editingStepId: string | null;
  workflowStepsMap: Record<string, string>;
  onStepEdit: (step: WorkflowStep) => void;
  onStepSave: (step: WorkflowStep) => void;
  onStepCancel: () => void;
}

function TreeNode({ 
  step, 
  editingStepId, 
  workflowStepsMap, 
  onStepEdit, 
  onStepSave, 
  onStepCancel 
}: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Get step type configuration
  const config = workflowFunctionTypeConfig[step.type] || workflowFunctionTypeConfig['task'];
  const typeColor = config.color;
  const typeLabel = config.label;
  const icon = config.icon;

  // Get referred next steps
  const referredNextSteps = step.next ? getReferredSteps(step.next) : [];

  // Collect all child steps from various branching properties
  const children: WorkflowStep[] = [];

  // Add embedded children from 'next' array
  if (step.next && Array.isArray(step.next)) {
    step.next.forEach(nextStep => {
      if (typeof nextStep === 'object' && nextStep !== null) {
        children.push(nextStep);
      }
    });
  }

  // Add embedded onConditionPass/Fail
  if (step.onConditionPass && typeof step.onConditionPass === 'object') {
    children.push(step.onConditionPass);
  }
  if (step.onConditionFail && typeof step.onConditionFail === 'object') {
    children.push(step.onConditionFail);
  }

  // Add embedded onError/onTimeout
  if (step.onError && typeof step.onError === 'object') {
    children.push(step.onError);
  }
  if (step.onTimeout && typeof step.onTimeout === 'object') {
    children.push(step.onTimeout);
  }

  // Add switch-case condition children
  if (step.conditions && Array.isArray(step.conditions)) {
    step.conditions.forEach(cond => {
      if (typeof cond.next === 'object' && cond.next !== null) {
        children.push(cond.next);
      }
    });
  }

  // Render editing form
  const renderEditingForm = () => {
    const onSave = (updatedStep: WorkflowStep) => onStepSave(updatedStep);
    const onCancel = () => onStepCancel();

    switch (step.type) {
      case 'trigger':
        return <WorkflowStepTrigger step={step} onSave={onSave} onCancel={onCancel} />;
      case 'decision':
        return <WorkflowStepDecision step={step} onSave={onSave} onCancel={onCancel} />;
      case 'approval':
        return <WorkflowStepApproval step={step} onSave={onSave} onCancel={onCancel} />;
      case 'switch-case':
        return <WorkflowStepSwitchCase step={step} stepIdMap={workflowStepsMap} onSave={onSave} onCancel={onCancel} />;
      case 'notify':
        return <WorkflowStepNotify step={step} onSave={onSave} onCancel={onCancel} />;
      default:
        return <WorkflowStepGeneric step={step} onSave={onSave} onCancel={onCancel} />;
    }
  };

  return (
    <div className="relative">
      <div className="flex flex-col items-stretch w-full border-2 rounded-2xl bg-card p-2 mb-2">
        {editingStepId !== step.id ? (
          <>
            <div className="flex items-center gap-2">
              {/* Expand/Collapse */}
              {children.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              )}

              {/* Icon */}
              <span className="text-primary/50 text-sm">{icon}</span>

              {/* Type Badge */}
              <Badge
                style={{ backgroundColor: typeColor, color: 'white' }}
                className="h-5 text-xs font-medium"
              >
                {typeLabel}
              </Badge>

              {/* Step Label */}
              <span className="font-medium text-sm" style={{ color: typeColor }}>
                {step.label || <i>(No label)</i>}
              </span>

              <div className="flex-grow" />

              {/* Edit Button */}
              <Button
                variant="ghost"
                size="sm"
                disabled={editingStepId !== null}
                onClick={(e) => {
                  e.stopPropagation();
                  onStepEdit(step);
                }}
                className="h-8"
              >
                <Edit className="h-4 w-4" />
              </Button>
            </div>

            {/* Flow control badges */}
            {(referredNextSteps.length > 0 || step.onConditionFail || step.onError || step.onTimeout || (step.conditions && step.conditions.length > 0)) && (
              <>
                <Separator className="my-2" />
                <div className="flex flex-col items-end gap-2 ml-2">
                  {referredNextSteps.length > 0 && (
                    <Badge
                      variant="outline"
                      className="h-5 text-xs font-medium m-1"
                    >
                      Next: {referredNextSteps.map(id => workflowStepsMap[id]).join(', ')}
                    </Badge>
                  )}

                  {step.onConditionPass && (
                    <Badge
                      variant="outline"
                      className="h-5 text-xs font-medium flex items-center gap-1 m-1"
                    >
                      <Check className="h-3 w-3" />
                      <span>Criteria Met:</span>
                      <ArrowRight className="h-3 w-3" />
                      <span>
                        {typeof step.onConditionPass === 'object'
                          ? step.onConditionPass.label
                          : workflowStepsMap[step.onConditionPass]}
                      </span>
                    </Badge>
                  )}

                  {step.onConditionFail && (
                    <Badge
                      variant="outline"
                      className="h-5 text-xs font-medium flex items-center gap-1 m-1"
                    >
                      <X className="h-3 w-3" />
                      <span>Otherwise:</span>
                      <ArrowRight className="h-3 w-3" />
                      <span>
                        {typeof step.onConditionFail === 'object'
                          ? step.onConditionFail.label
                          : workflowStepsMap[step.onConditionFail]}
                      </span>
                    </Badge>
                  )}

                  {step.onError && (
                    <Badge
                      variant="outline"
                      className="h-5 text-xs font-medium m-1"
                    >
                      On Error: {typeof step.onError === 'object' ? step.onError.label : workflowStepsMap[step.onError]}
                    </Badge>
                  )}

                  {step.onTimeout && (
                    <Badge
                      variant="outline"
                      className="h-5 text-xs font-medium m-1"
                    >
                      On Timeout: {typeof step.onTimeout === 'object' ? step.onTimeout.label : workflowStepsMap[step.onTimeout]}
                    </Badge>
                  )}

                  {step.conditions && step.conditions.map((cond, idx) => (
                    <Badge
                      key={idx}
                      variant="outline"
                      className="h-5 text-xs font-medium m-1"
                    >
                      {cond.value}: {workflowStepsMap[cond.next]}
                    </Badge>
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <>{renderEditingForm()}</>
        )}
      </div>

      {/* Render children */}
      {isExpanded && children.length > 0 && (
        <div className="ml-6 border-l-2 border-muted pl-4">
          {children.map((child) => (
            <TreeNode
              key={child.id}
              step={child}
              editingStepId={editingStepId}
              workflowStepsMap={workflowStepsMap}
              onStepEdit={onStepEdit}
              onStepSave={onStepSave}
              onStepCancel={onStepCancel}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function WorkflowStepTree({
  steps,
  editingStepId,
  onStepEdit,
  onStepSave,
  onStepCancel
}: WorkflowStepTreeProps) {
  // Build workflow steps map for labels
  const workflowStepsMap = useMemo(() => getStepsLabelsMap(steps), [steps]);

  return (
    <div className="w-full min-h-[200px]">
      {steps.map((step) => (
        <TreeNode
          key={step.id}
          step={step}
          editingStepId={editingStepId}
          workflowStepsMap={workflowStepsMap}
          onStepEdit={onStepEdit}
          onStepSave={onStepSave}
          onStepCancel={onStepCancel}
        />
      ))}
    </div>
  );
}
