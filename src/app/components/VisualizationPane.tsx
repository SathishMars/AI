// src/app/components/VisualizationPane.tsx
'use client';

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Network, Sparkles } from "lucide-react";
import WorkflowStepTree from '@/app/components/WorkflowStepTree';
import { WorkflowStep, WorkflowDefinition, WorkflowTemplate } from '../types/workflowTemplate';
import MermaidChart from './MermaidChart';



interface VisualizationPaneProps {
  workflowTemplate: WorkflowTemplate;
  regenerateMermaidDiagram: () => Promise<void>;
  onWorkflowDefinitionChange: (workflowDefinition: WorkflowDefinition) => void;
  fullScreen?: boolean;
}

export default function VisualizationPane({
  workflowTemplate,
  regenerateMermaidDiagram,
  onWorkflowDefinitionChange,
  fullScreen = false
}: VisualizationPaneProps) {
  const [editingStepId, setEditingStepId] = useState<string | null>(null);

  const handleStepEdit = (step: WorkflowStep) => {
    setEditingStepId(step.id);
  };

  const handleStepCancel = () => {
    setEditingStepId(null);
  };

  const handleStepSave = (updatedStep: WorkflowStep) => {
    setEditingStepId(null);
    // Update the step in the workflow definition
    const updateStepsRecursively = (steps: Array<WorkflowStep | string>): Array<WorkflowStep | string> => {
      return steps.map(step => {
        if (typeof step === 'string') {
          return step;
        }
        if (step.id === updatedStep.id) {
          // Since the edit form only allows the user to edit label, type, stepFunction, and functionParams we do not want the children steps to be overwritten
          // we will allow the children steps that are references to other steps (string ids) to be modified though
          return {
            ...step,
            ...{ label: updatedStep.label, type: updatedStep.type, stepFunction: updatedStep.stepFunction, functionParams: updatedStep.functionParams }
          };
        } else if (step.next && step.next.length > 0) {
          return { ...step, next: updateStepsRecursively(step.next) };
        } else if (step.onConditionPass && typeof step.onConditionPass === 'object') {
          return { ...step, onConditionPass: updateStepsRecursively([step.onConditionPass])[0] };
        } else if (step.onConditionFail && typeof step.onConditionFail === 'object') {
          return { ...step, onConditionFail: updateStepsRecursively([step.onConditionFail])[0] };
        } else if (step.onError && typeof step.onError === 'object') {
          return { ...step, onError: updateStepsRecursively([step.onError])[0] };
        } else if (step.onTimeout && typeof step.onTimeout === 'object') {
          return { ...step, onTimeout: updateStepsRecursively([step.onTimeout])[0] };
        } else {
          return step;
        }
      });
    }
    const updatedWorkflowDefinition = {
      ...workflowTemplate.workflowDefinition,
      steps: updateStepsRecursively(workflowTemplate.workflowDefinition.steps) as WorkflowStep[]
    };
  onWorkflowDefinitionChange(updatedWorkflowDefinition);
  }


  return (
    <div className={`h-full flex flex-col ${fullScreen ? 'p-6' : 'p-4'}`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Network className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-medium">Workflow Visualization</h3>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="tree" className="flex-1 flex flex-col overflow-hidden">
        <TabsList>
          <TabsTrigger value="tree">Step Tree</TabsTrigger>
          <TabsTrigger value="diagram" className="gap-2">
            Diagram
            <Sparkles className="h-4 w-4 text-primary" />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tree" className="flex-1 overflow-auto mt-4">
          {workflowTemplate.workflowDefinition.steps.length >= 0 ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-xl font-semibold">Workflow Step Tree</h4>
                  <p className="text-sm text-muted-foreground">
                    Tree view showing complete workflow structure with all nested steps
                  </p>
                </div>
              </div>
              <WorkflowStepTree
                steps={workflowTemplate.workflowDefinition.steps}
                editingStepId={editingStepId}
                onStepEdit={handleStepEdit}
                onStepSave={handleStepSave}
                onStepCancel={handleStepCancel}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <Alert>
                <AlertTitle>No Workflow Steps</AlertTitle>
                <AlertDescription>
                  Start a conversation with aime to create workflow steps.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </TabsContent>

        <TabsContent value="diagram" className="flex-1 overflow-auto mt-4">
          <MermaidChart
            mermaidDiagram={workflowTemplate.mermaidDiagram || ''}
            regenerateMermaidDiagram={regenerateMermaidDiagram}
            onError={(error) => {
              console.error('Mermaid chart error:', error);
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}