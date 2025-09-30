// src/app/utils/draft-manager.ts
import { WorkflowJSON, ValidationResult, ValidationError } from '@/app/types/workflow';
import { 
  WorkflowVersion, 
  WorkflowVersionSystem, 
  PublishValidationError,
  DraftSaveEvent,
  WorkflowChange 
} from '@/app/types/workflow-history';

export class DraftManager {
  private readonly storageKey = 'groupize_workflow_versions';
  private readonly autoSaveDelay = 2000; // 2 seconds
  private saveTimeouts = new Map<string, NodeJS.Timeout>();

  /**
   * Save workflow as draft with auto-save capabilities
   */
  async saveAsDraft(
    workflowId: string,
    updatedWorkflow: WorkflowJSON,
    conversationContext: string,
    autoSaved = false
  ): Promise<WorkflowVersion> {
    try {
      // Generate version ID
      const versionId = this.generateVersionId();
      
      // Generate change description
      const changeDescription = await this.generateChangeDescription(
        updatedWorkflow, 
        workflowId
      );

      // Create draft version
      const draftVersion: WorkflowVersion = {
        versionId,
        workflowJSON: {
          ...updatedWorkflow,
          metadata: {
            ...updatedWorkflow.metadata,
            status: 'draft',
            updatedAt: new Date()
          }
        },
        timestamp: new Date(),
        status: 'draft',
        changeDescription,
        conversationContext,
        validationState: { isValid: true, errors: [], warnings: [], info: [] }, // Will be updated by validation
        createdBy: 'current-user' // Would come from auth context
      };

      // Get or create version system
      const versionSystem = await this.getVersionSystem(workflowId) || 
                           this.createVersionSystem(workflowId);

      // Update version system
      versionSystem.currentDraft = draftVersion;
      versionSystem.draftHistory.push(draftVersion);
      versionSystem.metadata.lastModified = new Date();
      versionSystem.metadata.draftVersions++;
      versionSystem.metadata.totalVersions++;

      // Save to storage
      await this.saveVersionSystem(workflowId, versionSystem);

      // Emit save event
      this.emitDraftSaveEvent({
        type: 'draft_saved',
        sessionId: workflowId,
        versionId,
        timestamp: new Date(),
        metadata: {
          changeCount: 1, // Would be calculated from actual changes
          validationState: 'valid',
          autoSaved
        }
      });

      console.log(`📝 Draft saved: version ${versionId} for workflow ${workflowId}`);
      return draftVersion;

    } catch (error) {
      console.error('❌ Error saving draft:', error);
      
      this.emitDraftSaveEvent({
        type: 'draft_error',
        sessionId: workflowId,
        versionId: 'error',
        timestamp: new Date()
      });
      
      throw error;
    }
  }

  /**
   * Auto-save draft with debouncing
   */
  async autoSaveDraft(
    workflowId: string,
    updatedWorkflow: WorkflowJSON,
    conversationContext: string
  ): Promise<void> {
    // Clear existing timeout
    if (this.saveTimeouts.has(workflowId)) {
      clearTimeout(this.saveTimeouts.get(workflowId)!);
    }

    // Set new timeout for auto-save
    const timeout = setTimeout(async () => {
      await this.saveAsDraft(workflowId, updatedWorkflow, conversationContext, true);
      this.saveTimeouts.delete(workflowId);
    }, this.autoSaveDelay);

    this.saveTimeouts.set(workflowId, timeout);
  }

  /**
   * Publish draft after validation
   */
  async publishDraft(
    workflowId: string,
    draftVersionId: string
  ): Promise<WorkflowVersion> {
    try {
      const versionSystem = await this.getVersionSystem(workflowId);
      
      if (!versionSystem?.currentDraft || versionSystem.currentDraft.versionId !== draftVersionId) {
        throw new Error('Draft version not found or mismatched');
      }

      const draft = versionSystem.currentDraft;

      // Final validation before publishing
      const finalValidation = await this.validateWorkflow(draft.workflowJSON);
      
      if (!finalValidation.isValid) {
        const error = new Error('Cannot publish draft with validation errors') as PublishValidationError;
        error.name = 'PublishValidationError';
        error.validationResult = finalValidation;
        error.blockingErrors = finalValidation.errors.map(e => e.conversationalExplanation);
        throw error;
      }

      // Create published version
      const publishedVersion: WorkflowVersion = {
        ...draft,
        status: 'published',
        timestamp: new Date(),
        validationState: finalValidation,
        publishedBy: 'current-user', // Would come from auth context
        workflowJSON: {
          ...draft.workflowJSON,
          metadata: {
            ...draft.workflowJSON.metadata,
            status: 'published',
            updatedAt: new Date()
          }
        }
      };

      // Update version system
      versionSystem.publishedVersion = publishedVersion;
      versionSystem.currentDraft = undefined; // Clear draft after publishing
      versionSystem.metadata.lastModified = new Date();
      versionSystem.metadata.publishedVersions++;

      // Save to storage
      await this.saveVersionSystem(workflowId, versionSystem);

      // Emit publish event
      this.emitDraftSaveEvent({
        type: 'workflow_published',
        sessionId: workflowId,
        versionId: publishedVersion.versionId,
        timestamp: new Date(),
        metadata: {
          changeCount: 1,
          validationState: 'valid',
          autoSaved: false
        }
      });

      console.log(`🚀 Workflow published: version ${publishedVersion.versionId}`);
      return publishedVersion;

    } catch (error) {
      console.error('❌ Error publishing draft:', error);
      throw error;
    }
  }

  /**
   * Get current draft for workflow
   */
  async getCurrentDraft(workflowId: string): Promise<WorkflowVersion | null> {
    const versionSystem = await this.getVersionSystem(workflowId);
    return versionSystem?.currentDraft || null;
  }

  /**
   * Get published version for workflow
   */
  async getPublishedVersion(workflowId: string): Promise<WorkflowVersion | null> {
    const versionSystem = await this.getVersionSystem(workflowId);
    return versionSystem?.publishedVersion || null;
  }

  /**
   * Get version history for workflow
   */
  async getVersionHistory(workflowId: string): Promise<WorkflowVersion[]> {
    const versionSystem = await this.getVersionSystem(workflowId);
    if (!versionSystem) return [];

    const allVersions = [...versionSystem.draftHistory];
    if (versionSystem.publishedVersion) {
      allVersions.push(versionSystem.publishedVersion);
    }

    return allVersions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Compare two workflow versions
   */
  async compareVersions(
    workflowId: string, 
    version1Id: string, 
    version2Id: string
  ): Promise<WorkflowChange[]> {
    const versions = await this.getVersionHistory(workflowId);
    const version1 = versions.find(v => v.versionId === version1Id);
    const version2 = versions.find(v => v.versionId === version2Id);

    if (!version1 || !version2) {
      throw new Error('One or both versions not found');
    }

    return this.calculateWorkflowDiff(version1.workflowJSON, version2.workflowJSON);
  }

  /**
   * Delete draft version
   */
  async deleteDraft(workflowId: string): Promise<void> {
    const versionSystem = await this.getVersionSystem(workflowId);
    if (!versionSystem) return;

    versionSystem.currentDraft = undefined;
    versionSystem.metadata.lastModified = new Date();

    await this.saveVersionSystem(workflowId, versionSystem);
  }

  // Private helper methods

  private generateVersionId(): string {
    return `v_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async generateChangeDescription(
    workflow: WorkflowJSON, 
    workflowId: string
  ): Promise<string> {
    // For now, generate a simple description
    // In a real implementation, this would compare with the previous version
    const stepCount = Object.keys(workflow.steps).length;
    const previousVersion = await this.getPublishedVersion(workflowId);
    
    if (!previousVersion) {
      return `Initial workflow creation with ${stepCount} steps`;
    }

    const previousStepCount = Object.keys(previousVersion.workflowJSON.steps).length;
    const stepDifference = stepCount - previousStepCount;

    if (stepDifference > 0) {
      return `Added ${stepDifference} new step(s) to workflow`;
    } else if (stepDifference < 0) {
      return `Removed ${Math.abs(stepDifference)} step(s) from workflow`;
    } else {
      return `Modified existing workflow steps or configuration`;
    }
  }

  private async validateWorkflow(workflow: WorkflowJSON): Promise<ValidationResult> {
    // Basic validation - in a real implementation, this would use the streaming validator
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    const info: ValidationError[] = [];

    // Check if workflow has steps
    if (!workflow.steps || Object.keys(workflow.steps).length === 0) {
      errors.push({
        id: 'no-steps',
        severity: 'error' as const,
        technicalMessage: 'Workflow must have at least one step',
        conversationalExplanation: 'Your workflow needs at least one step to be published.'
      });
    }

    // Check for required metadata
    if (!workflow.metadata.name || workflow.metadata.name.trim() === '') {
      errors.push({
        id: 'no-name',
        severity: 'error' as const,
        technicalMessage: 'Workflow must have a name',
        conversationalExplanation: 'Please provide a name for your workflow before publishing.'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      info
    };
  }

  private async getVersionSystem(workflowId: string): Promise<WorkflowVersionSystem | null> {
    try {
      const stored = localStorage.getItem(`${this.storageKey}_${workflowId}`);
      if (!stored) return null;

      const parsed = JSON.parse(stored);
      
      // Convert date strings back to Date objects
      this.deserializeDates(parsed);
      
      return parsed;
    } catch (error) {
      console.error('Error loading version system:', error);
      return null;
    }
  }

  private createVersionSystem(workflowId: string): WorkflowVersionSystem {
    return {
      workflowId,
      draftHistory: [],
      conversationHistory: [],
      metadata: {
        workflowId,
        firstCreated: new Date(),
        lastModified: new Date(),
        totalVersions: 0,
        publishedVersions: 0,
        draftVersions: 0,
        conversationCount: 0,
        retentionPolicy: {
          retentionYears: 5,
          autoArchive: true
        }
      }
    };
  }

  private async saveVersionSystem(workflowId: string, versionSystem: WorkflowVersionSystem): Promise<void> {
    try {
      localStorage.setItem(`${this.storageKey}_${workflowId}`, JSON.stringify(versionSystem));
    } catch (error) {
      console.error('Error saving version system:', error);
      throw error;
    }
  }

  private deserializeDates(obj: unknown): void {
    if (obj && typeof obj === 'object') {
      const record = obj as Record<string, unknown>;
      for (const [key, value] of Object.entries(record)) {
        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
          record[key] = new Date(value);
        } else if (typeof value === 'object' && value !== null) {
          this.deserializeDates(value);
        }
      }
    }
  }

  private calculateWorkflowDiff(workflow1: WorkflowJSON, workflow2: WorkflowJSON): WorkflowChange[] {
    const changes: WorkflowChange[] = [];
    
    // This is a simplified diff - a real implementation would be more comprehensive
    const steps1 = Object.keys(workflow1.steps);
    const steps2 = Object.keys(workflow2.steps);
    
    // Find added steps
    steps2.filter(step => !steps1.includes(step)).forEach(step => {
      changes.push({
        changeId: `add_${step}`,
        timestamp: new Date(),
        type: 'added',
        path: `steps.${step}`,
        description: `Added step: ${workflow2.steps[step].name}`,
        source: 'ai',
        afterValue: workflow2.steps[step]
      });
    });

    // Find removed steps
    steps1.filter(step => !steps2.includes(step)).forEach(step => {
      changes.push({
        changeId: `remove_${step}`,
        timestamp: new Date(),
        type: 'removed',
        path: `steps.${step}`,
        description: `Removed step: ${workflow1.steps[step].name}`,
        source: 'ai',
        beforeValue: workflow1.steps[step]
      });
    });

    return changes;
  }

  private emitDraftSaveEvent(event: DraftSaveEvent): void {
    // Emit custom event for UI components to listen to
    const customEvent = new CustomEvent('draftSaveEvent', { detail: event });
    window.dispatchEvent(customEvent);
  }
}