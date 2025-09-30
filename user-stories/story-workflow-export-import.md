# User Story: Workflow Export and Import

**As a** workflow administrator  
**I want** to export and import workflows with their conversation history  
**So that** I can backup, share, and migrate workflows between systems

## Summary
Implement comprehensive workflow export/import functionality supporting multiple formats and conversation history preservation.

## Epic
[Epic: Workflow Configurator Screen](epic-workflow-configurator.md)

## UI Considerations
- **Draft/Published Export Choice:** Clear selection between current draft and published version export
- **JSON-Focused Interface:** Streamlined export/import UI optimized for JSON format with minimal transformations
- **Function Dependency Preview:** Visual indicators showing function references that need resolution during import
- **Automatic Validation Feedback:** Real-time validation results display during import process
- **Dual-Pane Integration:** Export/import actions accessible from Story 9's visualization pane
- **Progress Indicators:** Clear progress feedback for export/import operations with large workflows
- **Conflict Resolution Interface:** User-friendly resolution for function dependency conflicts
- **Import Preview:** Workflow validation results and dependency status before final import
- **Material-UI Integration:** MUI v7 Dialog, Stepper, and FileUpload components for file operations
- **Error Handling:** Clear error messages for validation failures and dependency resolution issues

## Acceptance Criteria
- [ ] **Draft/Published Export Management:**
  - [ ] User choice between exporting current draft or published version
  - [ ] Clear visual indication of export source (draft vs published)
  - [ ] Draft state metadata preservation in export without conversation history
  - [ ] Published version integrity verification during export
- [ ] **JSON-Focused Export/Import:**
  - [ ] Primary JSON format for workflow export/import with minimal transformations
  - [ ] Standardized JSON schema validation for exported workflows
  - [ ] Efficient JSON serialization for large workflows
  - [ ] JSON format versioning for future compatibility
- [ ] **Function Reference System:**
  - [ ] Export workflows with function references (not embedded definitions)
  - [ ] Function dependency mapping and version tracking in export
  - [ ] Import-time function resolution against current function library
  - [ ] Dependency conflict detection and resolution interface
- [ ] **Automatic Import Validation:**
  - [ ] Integration with Story 8's streaming validation system for imported workflows
  - [ ] Real-time validation feedback during import process
  - [ ] Automatic json-rules-engine schema validation
  - [ ] Import blocking for workflows with critical validation errors
- [ ] **Integration with Existing Systems:**
  - [ ] Integration with Story 2's functions library for dependency resolution
  - [ ] Draft manager integration from Story 10 for imported workflow state
  - [ ] Validation system integration from Story 8 for import verification
  - [ ] Dual-pane layout integration from Story 9 for export/import actions
- [ ] **Performance and Error Handling:**
  - [ ] Efficient export/import for large workflows (50+ steps)
  - [ ] Comprehensive error handling for corrupted or invalid imports
  - [ ] Progress tracking for long-running import operations
  - [ ] Rollback capability for failed imports
- [ ] **Testing Requirements:**
  - [ ] Comprehensive tests for draft/published export scenarios (90%+ coverage)
  - [ ] Function dependency resolution testing
  - [ ] Import validation integration testing
  - [ ] JSON schema validation and round-trip testing

## Developer Notes

### JSON-Focused Export/Import Architecture
```typescript
interface WorkflowExportJSON {
  formatVersion: string;
  exportDate: Date;
  exportSource: 'draft' | 'published';
  workflow: WorkflowJSON;
  metadata: {
    workflowId: string;
    name: string;
    description: string;
    version: string;
    lastModified: Date;
    exportedBy: string;
  };
  functionReferences: FunctionReference[];
  schemaVersion: string;
}

interface FunctionReference {
  functionId: string;
  functionName: string;
  version: string;
  requiredParameters: Record<string, any>;
  namespace: string;
}

// Export system with draft/published choice
class WorkflowExportManager {
  async exportWorkflow(
    workflowId: string,
    exportOptions: ExportOptions
  ): Promise<WorkflowExportJSON> {
    const sourceWorkflow = exportOptions.source === 'draft' 
      ? await this.draftManager.getCurrentDraft(workflowId)
      : await this.workflowStorage.getPublishedVersion(workflowId);
    
    if (!sourceWorkflow) {
      throw new ExportError(
        `No ${exportOptions.source} version available for workflow ${workflowId}`
      );
    }
    
    // Extract function references without embedding definitions
    const functionReferences = this.extractFunctionReferences(sourceWorkflow);
    
    const exportData: WorkflowExportJSON = {
      formatVersion: '1.0',
      exportDate: new Date(),
      exportSource: exportOptions.source,
      workflow: sourceWorkflow,
      metadata: await this.generateExportMetadata(workflowId, sourceWorkflow),
      functionReferences,
      schemaVersion: this.getSchemaVersion()
    };
    
    // Validate export before returning
    await this.validateExport(exportData);
    
    return exportData;
  }
  
  private extractFunctionReferences(workflow: WorkflowJSON): FunctionReference[] {
    const references: FunctionReference[] = [];
    
    Object.values(workflow.steps).forEach(step => {
      if (step.type === 'action' && step.action?.startsWith('functions.')) {
        const functionName = step.action.replace('functions.', '');
        const functionDef = this.functionsLibrary.getFunction(functionName);
        
        if (functionDef) {
          references.push({
            functionId: functionDef.id,
            functionName: functionDef.name,
            version: functionDef.version,
            requiredParameters: functionDef.parameters,
            namespace: functionDef.namespace
          });
        }
      }
    });
    
    return Array.from(new Map(references.map(ref => [ref.functionId, ref])).values());
  }
}
```

### Function Reference Resolution System
```typescript
class FunctionReferenceResolver {
  async resolveImportDependencies(
    importData: WorkflowExportJSON
  ): Promise<DependencyResolutionResult> {
    const resolutionResults: DependencyResolution[] = [];
    
    for (const functionRef of importData.functionReferences) {
      const resolution = await this.resolveFunctionReference(functionRef);
      resolutionResults.push(resolution);
    }
    
    const hasUnresolvedDependencies = resolutionResults.some(
      result => result.status === 'unresolved'
    );
    
    return {
      allResolved: !hasUnresolvedDependencies,
      resolutions: resolutionResults,
      conflicts: this.detectVersionConflicts(resolutionResults),
      suggestions: await this.generateResolutionSuggestions(resolutionResults)
    };
  }
  
  private async resolveFunctionReference(
    functionRef: FunctionReference
  ): Promise<DependencyResolution> {
    // Try exact match first
    const exactMatch = await this.functionsLibrary.findFunction({
      name: functionRef.functionName,
      version: functionRef.version
    });
    
    if (exactMatch) {
      return {
        functionReference: functionRef,
        resolvedFunction: exactMatch,
        status: 'resolved',
        resolutionType: 'exact_match'
      };
    }
    
    // Try compatible version match
    const compatibleMatch = await this.functionsLibrary.findCompatibleFunction(
      functionRef.functionName,
      functionRef.version
    );
    
    if (compatibleMatch) {
      return {
        functionReference: functionRef,
        resolvedFunction: compatibleMatch,
        status: 'resolved',
        resolutionType: 'compatible_version',
        warnings: [`Version ${functionRef.version} not found, using compatible ${compatibleMatch.version}`]
      };
    }
    
    // No resolution found
    return {
      functionReference: functionRef,
      status: 'unresolved',
      resolutionType: 'not_found',
      errors: [`Function ${functionRef.functionName} not found in current library`]
    };
  }
}
```

### Automatic Import Validation Integration
```typescript
class ImportValidationManager {
  private streamingValidator: StreamingWorkflowValidator;
  private rulesEngine: RulesEngine;
  
  async validateImportedWorkflow(
    importData: WorkflowExportJSON,
    resolutionResult: DependencyResolutionResult
  ): Promise<ImportValidationResult> {
    // First validate JSON schema
    const schemaValidation = await this.validateJSONSchema(importData);
    if (!schemaValidation.isValid) {
      return {
        isValid: false,
        errors: schemaValidation.errors,
        canProceed: false
      };
    }
    
    // Validate workflow structure with resolved functions
    const workflowWithResolvedFunctions = this.applyFunctionResolutions(
      importData.workflow,
      resolutionResult
    );
    
    // Use Story 8's streaming validation system
    const streamingValidation = await this.streamingValidator.validate(
      workflowWithResolvedFunctions,
      {
        context: 'import',
        enforceCriticalErrorBlocking: true,
        skipConversationalRecovery: true // No conversation in import context
      }
    );
    
    // json-rules-engine validation for workflow rules
    const rulesValidation = await this.validateWorkflowRules(
      workflowWithResolvedFunctions
    );
    
    const allErrors = [
      ...streamingValidation.errors,
      ...rulesValidation.errors
    ];
    
    const criticalErrors = allErrors.filter(e => e.severity === 'critical');
    
    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings: streamingValidation.warnings,
      canProceed: criticalErrors.length === 0, // Allow import with non-critical errors
      validatedWorkflow: workflowWithResolvedFunctions,
      dependencyResolution: resolutionResult
    };
  }
  
  private async validateWorkflowRules(
    workflow: WorkflowJSON
  ): Promise<RulesValidationResult> {
    const ruleErrors: ValidationError[] = [];
    
    // Validate each step's conditions against json-rules-engine schema
    Object.entries(workflow.steps).forEach(([stepId, step]) => {
      if (step.condition) {
        try {
          this.rulesEngine.addRule({
            conditions: step.condition,
            event: { type: 'validation' }
          });
        } catch (error) {
          ruleErrors.push({
            stepId,
            severity: 'critical',
            type: 'invalid_rule_condition',
            message: `Invalid json-rules-engine condition in step ${stepId}: ${error.message}`,
            metadata: { originalError: error }
          });
        }
      }
    });
    
    return {
      isValid: ruleErrors.length === 0,
      errors: ruleErrors
    };
  }
}
```

### Integration with Existing Systems
- **Story 2 Integration:** Function library dependency resolution and version management
- **Story 8 Integration:** Streaming validation system for automatic import validation
- **Story 9 Integration:** Export/import actions accessible from dual-pane visualization
- **Story 10 Integration:** Draft manager integration for imported workflow state management
- **json-rules-engine:** Automatic validation of workflow rule conditions
- **Material-UI v7:** File operations using Dialog, Stepper, and Progress components

### Testing Requirements
- **Export/Import Round-trip Tests:** Validate data integrity for draft and published exports (90%+ coverage)
- **Function Dependency Tests:** Resolution testing for various function reference scenarios
- **Validation Integration Tests:** Automatic validation during import with streaming validation system
- **JSON Schema Tests:** Schema validation and version compatibility testing
- **Error Handling Tests:** Corrupted file handling and graceful failure scenarios
- **Performance Tests:** Large workflow export/import benchmarks

### Security Notes
- Validate all imported data for security threats
- Sanitize workflow content before import
- Implement access controls for export/import operations
- Audit log all export/import activities
- Encrypt exported files containing sensitive data
- Implement file size limits for imports