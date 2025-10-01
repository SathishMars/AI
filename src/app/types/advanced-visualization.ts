// src/app/types/advanced-visualization.ts

import { WorkflowJSON, WorkflowStep, ValidationResult } from './workflow';

export interface VisualizationConfig {
  theme: 'light' | 'dark';
  enableInteractions: boolean;
  showMinimap: boolean;
  enableZoom: boolean;
  enablePan: boolean;
  maxZoom: number;
  minZoom: number;
  animationDuration: number;
}

export interface ViewportBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  zoom: number;
}

export interface StepPosition {
  stepId: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DraftState {
  isDraft: boolean;
  workflowId: string;
  publishedVersion?: WorkflowJSON;
  draftVersion?: WorkflowJSON;
  modifiedSteps: Set<string>;
  lastModified: Date;
  autoSave: boolean;
}

export interface ParameterModification {
  stepId: string;
  parameterName: string;
  oldValue: string | number | boolean | object;
  newValue: string | number | boolean | object;
  timestamp: Date;
  source: 'direct_edit' | 'ai_conversation' | 'import';
  validationResult?: ValidationResult;
}

export interface VisualWorkflowTheme {
  draft: {
    stepBorder: string;
    stepBackground: string;
    modifiedIndicator: string;
    opacity: number;
  };
  published: {
    stepBorder: string;
    stepBackground: string;
    opacity: number;
  };
  validation: {
    errorBorder: string;
    errorBackground: string;
    warningBorder: string;
    warningBackground: string;
  };
}

export interface MermaidVisualizationConfig {
  stepStyles: Map<string, StepVisualStyle>;
  connectionStyles: Map<string, ConnectionVisualStyle>;
  indicators: Map<string, StepIndicator>;
  theme: VisualWorkflowTheme;
}

export interface StepVisualStyle {
  border: string;
  background: string;
  opacity: number;
  textColor?: string;
  shadowColor?: string;
}

export interface ConnectionVisualStyle {
  color: string;
  width: number;
  style: 'solid' | 'dashed' | 'dotted';
  opacity: number;
}

export interface StepIndicator {
  type: 'draft_modification' | 'validation_error' | 'validation_warning';
  icon: string;
  color: string;
  tooltip: string;
  position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export interface WorkflowUpdate {
  workflowId: string;
  updatedWorkflow: WorkflowJSON;
  changedSteps: Set<string>;
  source: 'ai_conversation' | 'direct_edit' | 'import';
  timestamp: Date;
}

export interface VisualDiff {
  addedSteps: Set<string>;
  removedSteps: Set<string>;
  modifiedSteps: Set<string>;
  changedConnections: Array<{
    from: string;
    to: string;
    type: 'added' | 'removed' | 'modified';
  }>;
}

export interface OptimizedVisualization {
  visibleSteps: WorkflowStep[];
  simplifiedConnections: Connection[];
  totalStepCount: number;
  renderingStrategy: 'full' | 'virtualized' | 'simplified';
  performanceMetrics: {
    renderTime: number;
    memoryUsage: number;
    frameRate: number;
  };
}

export interface Connection {
  from: string;
  to: string;
  condition?: string;
  label?: string;
  type: 'success' | 'failure' | 'default';
}

export interface InteractionEvent {
  type: 'step_click' | 'step_hover' | 'parameter_edit' | 'zoom' | 'pan';
  stepId?: string;
  parameterName?: string;
  newValue?: string | number | boolean | object;
  position?: { x: number; y: number };
  metadata?: Record<string, string | number | boolean>;
}

export interface ParameterEditResult {
  success: boolean;
  updatedWorkflow: WorkflowJSON;
  validationErrors: ValidationResult['errors'];
  draftState: DraftState;
  aiContextNotified: boolean;
}

export interface ZoomPanState {
  zoom: number;
  panX: number;
  panY: number;
  centerX: number;
  centerY: number;
}

export interface MinimapState {
  visible: boolean;
  position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  size: { width: number; height: number };
  opacity: number;
}

export interface SearchHighlight {
  stepId: string;
  searchTerm: string;
  matchType: 'name' | 'action' | 'parameter' | 'condition';
  isActive: boolean;
}

export interface VisualizationPerformanceMetrics {
  renderTime: number;
  updateTime: number;
  memoryUsage: number;
  frameRate: number;
  stepCount: number;
  connectionCount: number;
}