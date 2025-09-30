# User Story: Workflow JSON Schema and Validation

**As a** workflow system developer  
**I want** a robust JSON schema validation system for workflows  
**So that** all workflows follow consistent structure and can be reliably processed by the workflow engine

## Summary
Implement versioned JSON schema definition and validation for workflow structures using json-rules-engine format, with save-time validation and detailed error feedback through the aime chat interface.

## Epic
[Epic: Workflow Configurator Screen](epic-workflow-configurator.md)

## UI Considerations
- Schema validation occurs on workflow save, not real-time (performance optimization)
- Detailed validation errors are communicated through aime chat interface with conversational explanations
- Error messages should be user-friendly and actionable, with suggested fixes
- Visual indicators in the workflow diagram highlight problematic steps
- Validation progress indicators during save operations
- Schema version compatibility warnings when loading older workflows

## Acceptance Criteria
- [ ] Define versioned JSON schema for workflow structure using json-rules-engine format
- [ ] Implement schema versioning system with backward compatibility
- [ ] Create Zod v4 validators for all workflow components (steps, conditions, actions, triggers)
- [ ] Implement save-time validation with detailed error reporting
- [ ] Create validation error integration with aime chat interface
- [ ] Support validation of nested conditions (all/any operators)
- [ ] Validate function references against dynamic functions library
- [ ] Handle workflow step dependencies and circular reference detection
- [ ] Create TypeScript types from schema with version support
- [ ] Implement schema migration utilities for version upgrades
- [ ] Add functions library registry with dynamic loading
- [ ] Create validation error message catalog with conversational explanations
- [ ] Implement comprehensive unit tests covering all validation scenarios
- [ ] Include integration tests with sample workflow JSONs across schema versions
- [ ] Add performance tests for save-time validation
- [ ] Document schema structure, versioning, and validation rules
- [ ] Create schema evolution guidelines for future updates

## Developer Notes

### Schema Versioning Strategy
```typescript
interface WorkflowSchema {
  version: string; // semantic versioning (e.g., "1.0.0")
  compatibleVersions: string[]; // backward compatible versions
  schema: ZodSchema;
  migrationPath?: SchemaMigration[];
}

interface WorkflowJSON {
  schemaVersion: string;
  metadata: WorkflowMetadata;
  steps: Record<string, WorkflowStep>;
}
```

### Schema Requirements
- Must be compatible with json-rules-engine v7.3.1
- Support for conditional branching (onSuccess/onFailure)
- Validation of fact references and operator types
- Dynamic function validation against functions library
- Step dependency validation to prevent circular references
- Schema evolution with migration paths

### Functions Library Integration
```typescript
interface FunctionsLibrary {
  version: string;
  functions: Record<string, FunctionDefinition>;
  categories: string[];
  loadFunction(id: string): Promise<FunctionDefinition>;
  validateFunction(id: string, params: any): ValidationResult;
}
```

### Save-Time Validation Flow
1. User initiates workflow save
2. Schema validation runs against current version
3. Function references validated against library
4. Detailed errors collected with step references
5. aime chat receives errors for conversational explanation
6. User receives actionable feedback through chat
7. Save completes only after validation passes

### Error Integration with aime Chat
```typescript
interface ValidationError {
  id: string;
  severity: 'error' | 'warning' | 'info';
  stepId?: string;
  fieldPath?: string;
  technicalMessage: string;
  conversationalExplanation: string;
  suggestedFix?: string;
  documentationLink?: string;
}

interface ChatErrorMessage {
  type: 'validation_error';
  errors: ValidationError[];
  workflowContext: string;
  suggestedActions: string[];
}
```

### Testing Requirements
- Unit tests for each validator function (90%+ coverage)
- Integration tests with valid/invalid workflow examples across versions
- Schema migration testing for version upgrades
- Performance tests for save-time validation with large workflows
- Functions library integration testing
- aime chat error integration testing
- Edge case testing (empty workflows, malformed JSON, etc.)

### Security Notes
- Validate all user input to prevent JSON injection attacks
- Sanitize function parameters to prevent code execution
- Implement schema versioning for security updates
- Audit log all validation failures for security monitoring
- Validate functions library integrity before loading
- Implement schema versioning for future compatibility
- Audit log all validation failures for security monitoring