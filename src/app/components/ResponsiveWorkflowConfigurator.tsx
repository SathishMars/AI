// src/app/components/ResponsiveWorkflowConfigurator.tsx
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Upload as PublishIcon,
  Maximize as FullscreenIcon,
  Code as CodeIcon,
  MessageSquare as ChatIcon,
  GitBranch as VisualizationIcon,
  GripVertical as DragIcon,
  History as HistoryIcon,
  Edit as EditIcon
} from 'lucide-react';
import { WorkflowDefinition, WorkflowTemplate } from '@/app/types/workflowTemplate';
import VisualizationPane from './VisualizationPane';
import WorkflowTemplateSelector, { workflowTemplateSelectorMenuItem } from './WorkflowTemplateSelector';
import WorkflowTemplateNameDialog from './WorkflowTemplateNameDialog';
import AimeWorkflowPane from './AimeWorkflowPane';
import { WorkflowMessage } from '../types/aimeWorkflowMessages';
import { cn } from '@/lib/utils';

interface ResponsiveWorkflowConfiguratorProps {
  workflowTemplate?: WorkflowTemplate;
  messages?: WorkflowMessage[];
  isPublishReady?: boolean;
  sendMessage?: (message: string) => Promise<void>;
  regenerateMermaidDiagram?: () => Promise<void>;
  onWorkflowDefinitionChange: (workflowDefinition: WorkflowDefinition, mermaidDiagram?: string) => void;
  onTemplateLabelChange?: (name: string) => Promise<void>;
}

export default function ResponsiveWorkflowConfigurator({
  workflowTemplate,
  messages,
  isPublishReady,
  sendMessage,
  regenerateMermaidDiagram,
  onWorkflowDefinitionChange,
  onTemplateLabelChange,
}: ResponsiveWorkflowConfiguratorProps) {

  // Ensure we have a workflow object
  if (!workflowTemplate) {
    throw new Error('ResponsiveWorkflowConfigurator requires a workflowTemplate');
  }

  // Custom breakpoints using matchMedia
  const [isDesktop, setIsDesktop] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1200px)');
    const tablet = window.matchMedia('(min-width: 768px) and (max-width: 1199px)');
    const mobile = window.matchMedia('(max-width: 767px)');

    const updateBreakpoints = () => {
      setIsDesktop(desktop.matches);
      setIsTablet(tablet.matches);
      setIsMobile(mobile.matches);
    };

    updateBreakpoints();
    desktop.addEventListener('change', updateBreakpoints);
    tablet.addEventListener('change', updateBreakpoints);
    mobile.addEventListener('change', updateBreakpoints);

    return () => {
      desktop.removeEventListener('change', updateBreakpoints);
      tablet.removeEventListener('change', updateBreakpoints);
      mobile.removeEventListener('change', updateBreakpoints);
    };
  }, []);

  // Layout state
  const [showFullVisualization, setShowFullVisualization] = useState(false);
  const [showRawJSON, setShowRawJSON] = useState(false);
  const [activeTab, setActiveTab] = useState('aime'); // For mobile tab navigation
  const [aimePanelWidth, setAimePanelWidth] = useState(400); // Default 400px
  const [isDragging, setIsDragging] = useState(false); // For resizable divider

  // Template naming state
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [_isTemplateValid] = useState(false); // placeholder to prevent accidental publish; setter intentionally unused
  const [workflowTemplateSelectorItem, setWorkflowTemplateSelectorItem] = useState<workflowTemplateSelectorMenuItem | null>(null);


  const updateWorkflowTemplateSelectorItem = useCallback((loadedTemplate: WorkflowTemplate) => {
    setWorkflowTemplateSelectorItem({
      id: loadedTemplate.id,
      label: loadedTemplate.metadata.label,
      version: loadedTemplate.version,
      status: loadedTemplate.metadata.status
    });
  }, []);

  // Auto-show dialog for new templates that need naming (only once)
  useEffect(() => {
    if (workflowTemplate && workflowTemplate.metadata && !workflowTemplate.metadata.label) {
      setShowNameDialog(true);
    }
    updateWorkflowTemplateSelectorItem(workflowTemplate);
  }, [updateWorkflowTemplateSelectorItem, workflowTemplate, workflowTemplate?.metadata?.label]);

  // Resizable divider functionality
  const dividerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const MIN_AIME_WIDTH = 400;
  const MAX_AIME_WIDTH_PERCENT = 0.5; // 50% of container width


  // Resizable divider logic
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const newWidth = containerRect.right - e.clientX;
      const maxWidth = containerRect.width * MAX_AIME_WIDTH_PERCENT;

      // console.log('New width:', newWidth, 'Max width:', maxWidth);

      const clampedWidth = Math.max(
        MIN_AIME_WIDTH,
        Math.min(newWidth, maxWidth)
      );

      setAimePanelWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, []);

  // Workflow actions
  const handlePublish = useCallback(() => {
    if (_isTemplateValid) {
      // WorkflowJSON only has steps - status is handled at template level
      onWorkflowDefinitionChange(workflowTemplate.workflowDefinition);
    }
  }, [workflowTemplate, _isTemplateValid, onWorkflowDefinitionChange]);

  // Handle template naming
  const handleTemplateNameSubmit = useCallback(async (name: string) => {
    if (onTemplateLabelChange) {
      await onTemplateLabelChange(name);
      console.log('✏️ Updated template label:', name);
    }
    setShowNameDialog(false);
  }, [onTemplateLabelChange]);

  // Render toolbar
  const renderToolbar = () => (
    <div className="p-4 border-b bg-background w-full">
      <div className={cn(
        "flex justify-between items-center gap-2",
        "flex-col sm:flex-row",
        "sm:gap-1"
      )}>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <WorkflowTemplateSelector
              currentTemplateMenuItem={workflowTemplateSelectorItem ? workflowTemplateSelectorItem : undefined}
            />
            <div className="flex items-center gap-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowNameDialog(true)}
                    >
                      <EditIcon className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Rename template</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* current template status */}
              {isPublishReady ? (
                <Badge variant="default" className="bg-green-600 text-white">
                  Publish-Ready
                </Badge>
              ) : (
                <Badge variant="secondary">
                  Draft
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-1 flex-wrap">
          {(workflowTemplate.metadata.status === "draft") && (
            <Button
              variant="default"
              size="sm"
              onClick={handlePublish}
              disabled={!isPublishReady}
            >
              <PublishIcon className="h-4 w-4 mr-2" />
              Publish
            </Button>
          )}

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFullVisualization(!showFullVisualization)}
                >
                  <FullscreenIcon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Toggle Full Screen Visualization</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowRawJSON(!showRawJSON)}
                >
                  <CodeIcon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Show Raw JSON</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );

  // Render mobile tabs
  const renderMobileTabs = () => (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="w-full grid grid-cols-3">
        <TabsTrigger value="aime" className="flex flex-col items-center gap-1">
          <ChatIcon className="h-4 w-4" />
          <span className="text-xs">aime</span>
        </TabsTrigger>
        <TabsTrigger value="workflow" className="flex flex-col items-center gap-1">
          <VisualizationIcon className="h-4 w-4" />
          <span className="text-xs">Workflow</span>
        </TabsTrigger>
        <TabsTrigger value="history" className="flex flex-col items-center gap-1">
          <HistoryIcon className="h-4 w-4" />
          <span className="text-xs">History</span>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );

  // Render resizable divider
  const renderDivider = () => (
    <div
      ref={dividerRef}
      className={cn(
        "relative flex items-center justify-center min-h-full",
        "transition-colors duration-200",
        isDragging ? "bg-primary/30" : "bg-border hover:bg-primary/30"
      )}
    >
      <DragIcon className="h-4 w-4 cursor-col-resize text-muted-foreground" onMouseDown={handleMouseDown} />
    </div>
  );


  if (showFullVisualization) {
    return (
      <div className="h-screen p-0 w-full">
        {renderToolbar()}
        <div className="flex-1 overflow-hidden">
          {/* Full screen visualization - commented out in original */}
        </div>
      </div>
    );
  }

  if (showRawJSON) {
    return (
      <div className="h-screen p-0 w-full">
        {renderToolbar()}
        <div className="p-4 h-[calc(100vh-100px)] overflow-auto">
          <h2 className="text-xl font-semibold mb-4">Raw Workflow JSON</h2>
          <div className="p-4 bg-muted rounded-md border">
            <pre className="text-xs font-mono whitespace-pre-wrap">
              {JSON.stringify(workflowTemplate, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full p-0 m-0 flex flex-col items-stretch bg-border">
      {renderToolbar()}

      {/* Mobile Layout */}
      {isMobile && (
        <div className="flex-1 flex flex-col">
          {renderMobileTabs()}
          <Tabs value={activeTab} className="flex-1 overflow-hidden">
            <TabsContent value="aime" className="h-full">
              {/* Commented out in original */}
            </TabsContent>
            <TabsContent value="workflow" className="h-full">
              {/* Commented out in original */}
            </TabsContent>
            <TabsContent value="history" className="h-full">
              {/* Commented out in original */}
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* Desktop/Tablet Layout */}
      {(isDesktop || isTablet) && (
        <div
          ref={containerRef}
          className="flex-1 flex w-full min-h-0"
        >
          {/* Visualization Pane */}
          <div className="h-full min-w-0 inline-flex flex-col flex-1">
            <VisualizationPane
              workflowTemplate={workflowTemplate}
              regenerateMermaidDiagram={regenerateMermaidDiagram ? regenerateMermaidDiagram : async () => { console.log('regenerateMermaidDiagram not provided.'); }}
              onWorkflowDefinitionChange={onWorkflowDefinitionChange}
            />
          </div>

          {/* Resizable Divider (Desktop only) */}
          {isDesktop && renderDivider()}


          {/* Conversation Pane */}
          <div className="h-full min-h-0 flex flex-col items-stretch"
            style={{
              width: isDesktop ? `${aimePanelWidth}px` : '50%',
              minWidth: `${MIN_AIME_WIDTH}px`,
            }}
          >
            <AimeWorkflowPane
              messages={messages || []}
              sendMessage={sendMessage ? sendMessage : async (msg: string) => { console.log('SendMessage not provided. Message:', msg); }}
              workflowDefinition={workflowTemplate.workflowDefinition}
              workflowTemplateId={workflowTemplate.id}
              onWorkflowDefinitionChange={onWorkflowDefinitionChange}
            />
          </div>

        </div>
      )}

      {/* Template Name Dialog */}
      <WorkflowTemplateNameDialog
        open={showNameDialog}
        onClose={() => setShowNameDialog(false)}
        onSubmit={handleTemplateNameSubmit}
        currentName={workflowTemplate?.metadata?.label}
      />
    </div>
  );
}
