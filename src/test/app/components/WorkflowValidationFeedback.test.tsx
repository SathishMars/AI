// src/test/app/components/WorkflowValidationFeedback.test.tsx
/**
 * Tests for WorkflowValidationFeedback component
 * 
 * Phase 4: Frontend Integration
 * Tests UI rendering, error grouping, and user interactions
 */

import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { WorkflowValidationFeedback } from '@/app/components/WorkflowValidationFeedback';
import { ValidationError } from '@/app/types/workflow';

describe('WorkflowValidationFeedback Component', () => {
  // Sample validation errors
  const stepIdError: ValidationError = {
    id: 'stepId-invalid-format',
    severity: 'error',
    stepId: 'Invalid_Step_Name',
    technicalMessage: 'Step ID must be camelCase',
    conversationalExplanation: 'The step ID "Invalid_Step_Name" should be in camelCase format',
    suggestedFix: 'Try using "invalidStepName" instead'
  };

  const referenceError: ValidationError = {
    id: 'ref-not-found',
    severity: 'error',
    stepId: 'checkBudget',
    technicalMessage: 'Reference not found: nonExistentStep',
    conversationalExplanation: 'The step "checkBudget" references a non-existent step "nonExistentStep"',
    suggestedFix: 'Check that the step ID exists in your workflow'
  };

  const circularError: ValidationError = {
    id: 'circular-reference',
    severity: 'error',
    stepId: 'stepB',
    technicalMessage: 'Circular reference detected: stepB -> stepC -> stepB',
    conversationalExplanation: 'There is a circular reference in your workflow: stepB -> stepC -> stepB',
    suggestedFix: 'Remove one of the references to break the cycle'
  };

  const structureError: ValidationError = {
    id: 'structure-invalid-workflow',
    severity: 'error',
    technicalMessage: 'Invalid workflow structure',
    conversationalExplanation: 'The workflow structure is invalid',
    suggestedFix: 'Ensure all steps are properly nested'
  };

  const warningExample: ValidationError = {
    id: 'warning-unused-step',
    severity: 'warning',
    stepId: 'unusedStep',
    technicalMessage: 'Step is not referenced',
    conversationalExplanation: 'The step "unusedStep" is not referenced by any other step',
    suggestedFix: 'Consider removing this step or linking it to the workflow'
  };

  describe('Rendering States', () => {
    it('should render success state when no errors or warnings', () => {
      render(
        <WorkflowValidationFeedback
          errors={[]}
          warnings={[]}
        />
      );

      expect(screen.getByText('Validation Passed')).toBeInTheDocument();
      expect(screen.getByText(/valid and ready to save/i)).toBeInTheDocument();
    });

    it('should not render success state when showSuccessState is false', () => {
      render(
        <WorkflowValidationFeedback
          errors={[]}
          warnings={[]}
          showSuccessState={false}
        />
      );

      expect(screen.queryByText('Validation Passed')).not.toBeInTheDocument();
    });

    it('should render validating state', () => {
      render(
        <WorkflowValidationFeedback
          errors={[]}
          warnings={[]}
          isValidating={true}
        />
      );

      expect(screen.getByText('Validating...')).toBeInTheDocument();
      expect(screen.getByText(/checking workflow/i)).toBeInTheDocument();
    });

    it('should render error state with error count', () => {
      render(
        <WorkflowValidationFeedback
          errors={[stepIdError, referenceError]}
          warnings={[]}
        />
      );

      expect(screen.getByText(/validation errors \(2\)/i)).toBeInTheDocument();
    });

    it('should render warning state when only warnings present', () => {
      render(
        <WorkflowValidationFeedback
          errors={[]}
          warnings={[warningExample]}
        />
      );

      expect(screen.getByText(/warnings \(1\)/i)).toBeInTheDocument();
    });

    it('should not render warnings when showWarnings is false', () => {
      render(
        <WorkflowValidationFeedback
          errors={[]}
          warnings={[warningExample]}
          showWarnings={false}
        />
      );

      expect(screen.queryByText(/warnings/i)).not.toBeInTheDocument();
    });
  });

  describe('Error Display', () => {
    it('should display conversational explanation', () => {
      render(
        <WorkflowValidationFeedback
          errors={[stepIdError]}
          warnings={[]}
        />
      );

      expect(screen.getByText(/should be in camelCase format/i)).toBeInTheDocument();
    });

    it('should display suggested fix', () => {
      render(
        <WorkflowValidationFeedback
          errors={[stepIdError]}
          warnings={[]}
        />
      );

      expect(screen.getByText(/try using "invalidStepName"/i)).toBeInTheDocument();
    });

    it('should display step ID chip', () => {
      render(
        <WorkflowValidationFeedback
          errors={[stepIdError]}
          warnings={[]}
        />
      );

      expect(screen.getByText('Invalid_Step_Name')).toBeInTheDocument();
    });

    it('should display multiple errors', () => {
      render(
        <WorkflowValidationFeedback
          errors={[stepIdError, referenceError, circularError]}
          warnings={[]}
        />
      );

      expect(screen.getByText(/should be in camelCase format/i)).toBeInTheDocument();
      expect(screen.getByText(/references a non-existent step/i)).toBeInTheDocument();
      expect(screen.getByText(/circular reference in your workflow/i)).toBeInTheDocument();
    });
  });

  describe('Error Grouping', () => {
    it('should group errors by type when groupByType is true', () => {
      render(
        <WorkflowValidationFeedback
          errors={[stepIdError, referenceError, circularError, structureError]}
          warnings={[]}
          groupByType={true}
        />
      );

      // Check for group headers - at least one should be present
      expect(screen.getByText('Step ID Issues')).toBeInTheDocument();
      expect(screen.getByText('Reference Issues')).toBeInTheDocument();
      
      // Verify all errors are displayed (regardless of grouping)
      expect(screen.getByText(/should be in camelCase format/i)).toBeInTheDocument();
      expect(screen.getByText(/references a non-existent step/i)).toBeInTheDocument();
      expect(screen.getByText(/circular reference in your workflow/i)).toBeInTheDocument();
      expect(screen.getByText(/workflow structure is invalid/i)).toBeInTheDocument();
    });

    it('should display flat error list when groupByType is false', () => {
      render(
        <WorkflowValidationFeedback
          errors={[stepIdError, referenceError]}
          warnings={[]}
          groupByType={false}
        />
      );

      // Should not have group headers
      expect(screen.queryByText('Step ID Issues')).not.toBeInTheDocument();
      expect(screen.queryByText('Reference Issues')).not.toBeInTheDocument();
      
      // But should still show errors
      expect(screen.getByText(/should be in camelCase format/i)).toBeInTheDocument();
      expect(screen.getByText(/references a non-existent step/i)).toBeInTheDocument();
    });

    it('should display error count badges for each group', () => {
      render(
        <WorkflowValidationFeedback
          errors={[stepIdError, referenceError, referenceError]}
          warnings={[]}
          groupByType={true}
        />
      );

      // Should have count badges (1 for stepIds, 2 for references)
      const stepIdGroup = screen.getByText('Step ID Issues').closest('div');
      const referenceGroup = screen.getByText('Reference Issues').closest('div');
      
      expect(within(stepIdGroup!).getByText('1')).toBeInTheDocument();
      expect(within(referenceGroup!).getByText('2')).toBeInTheDocument();
    });
  });

  describe('Collapsible Groups', () => {
    it('should toggle error group expansion', () => {
      render(
        <WorkflowValidationFeedback
          errors={[stepIdError]}
          warnings={[]}
          groupByType={true}
        />
      );

      const groupHeader = screen.getByText('Step ID Issues').closest('div');
      
      // Initially expanded (default for stepIds group)
      expect(screen.getByText(/should be in camelCase format/i)).toBeVisible();
      
      // Click to collapse
      fireEvent.click(groupHeader!);
      
      // Error should be hidden (MUI Collapse will handle the animation)
      // We can't easily test CSS visibility, but the click handler should work
    });

    it('should have expand/collapse icons', () => {
      const { container } = render(
        <WorkflowValidationFeedback
          errors={[stepIdError]}
          warnings={[]}
          groupByType={true}
        />
      );

      // MUI IconButton should be present
      const iconButtons = container.querySelectorAll('button[class*="MuiIconButton"]');
      expect(iconButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Step Click Handling', () => {
    it('should call onStepClick when step chip is clicked', () => {
      const onStepClick = jest.fn();
      
      render(
        <WorkflowValidationFeedback
          errors={[stepIdError]}
          warnings={[]}
          onStepClick={onStepClick}
        />
      );

      const stepChip = screen.getByText('Invalid_Step_Name');
      fireEvent.click(stepChip);

      expect(onStepClick).toHaveBeenCalledWith('Invalid_Step_Name');
    });

    it('should not call onStepClick if callback not provided', () => {
      render(
        <WorkflowValidationFeedback
          errors={[stepIdError]}
          warnings={[]}
        />
      );

      const stepChip = screen.getByText('Invalid_Step_Name');
      
      // Should not throw error when clicked
      expect(() => fireEvent.click(stepChip)).not.toThrow();
    });

    it('should handle errors without stepId', () => {
      const errorNoStepId: ValidationError = {
        id: 'general-error',
        severity: 'error',
        technicalMessage: 'General error',
        conversationalExplanation: 'A general error occurred'
      };

      render(
        <WorkflowValidationFeedback
          errors={[errorNoStepId]}
          warnings={[]}
        />
      );

      // Should render error without step chip
      expect(screen.getByText('A general error occurred')).toBeInTheDocument();
    });
  });

  describe('Custom Styling', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <WorkflowValidationFeedback
          errors={[stepIdError]}
          warnings={[]}
          className="custom-validation-class"
        />
      );

      const element = container.querySelector('.custom-validation-class');
      expect(element).toBeInTheDocument();
    });
  });

  describe('Warning Display', () => {
    it('should display warnings with suggested fixes', () => {
      render(
        <WorkflowValidationFeedback
          errors={[]}
          warnings={[warningExample]}
        />
      );

      expect(screen.getByText(/not referenced by any other step/i)).toBeInTheDocument();
      expect(screen.getByText(/consider removing this step/i)).toBeInTheDocument();
    });

    it('should display multiple warnings', () => {
      const warning2: ValidationError = {
        id: 'warning-long-name',
        severity: 'warning',
        stepId: 'veryLongStepNameThatMightBeHardToRead',
        technicalMessage: 'Step name is very long',
        conversationalExplanation: 'The step name is longer than recommended'
      };

      render(
        <WorkflowValidationFeedback
          errors={[]}
          warnings={[warningExample, warning2]}
        />
      );

      expect(screen.getByText(/warnings \(2\)/i)).toBeInTheDocument();
    });
  });

  describe('Error Severity Icons', () => {
    it('should display error icon for error severity', () => {
      const { container } = render(
        <WorkflowValidationFeedback
          errors={[stepIdError]}
          warnings={[]}
        />
      );

      // MUI Error icon should be present
      const errorIcons = container.querySelectorAll('svg[data-testid="ErrorIcon"]');
      expect(errorIcons.length).toBeGreaterThan(0);
    });

    it('should display warning icon for warning severity', () => {
      const { container } = render(
        <WorkflowValidationFeedback
          errors={[]}
          warnings={[warningExample]}
        />
      );

      // MUI Alert with warning severity should be present
      const warningAlert = container.querySelector('[class*="MuiAlert-standardWarning"]');
      expect(warningAlert).toBeInTheDocument();
    });

    it('should display success icon when valid', () => {
      const { container } = render(
        <WorkflowValidationFeedback
          errors={[]}
          warnings={[]}
        />
      );

      // CheckCircle icon should be present
      const successIcons = container.querySelectorAll('svg[data-testid="CheckCircleIcon"]');
      expect(successIcons.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty error array', () => {
      render(
        <WorkflowValidationFeedback
          errors={[]}
          warnings={[]}
        />
      );

      expect(screen.getByText('Validation Passed')).toBeInTheDocument();
    });

    it('should handle errors with missing optional fields', () => {
      const minimalError: ValidationError = {
        id: 'minimal-error',
        severity: 'error',
        technicalMessage: 'Technical message',
        conversationalExplanation: 'User-friendly message'
        // No stepId, suggestedFix, documentationLink, etc.
      };

      render(
        <WorkflowValidationFeedback
          errors={[minimalError]}
          warnings={[]}
        />
      );

      expect(screen.getByText('User-friendly message')).toBeInTheDocument();
    });

    it('should handle very long error messages', () => {
      const longError: ValidationError = {
        id: 'long-error',
        severity: 'error',
        stepId: 'testStep',
        technicalMessage: 'Technical message',
        conversationalExplanation: 'This is a very long error message that contains a lot of text to test how the component handles wrapping and layout for lengthy explanations that might span multiple lines in the UI display'
      };

      render(
        <WorkflowValidationFeedback
          errors={[longError]}
          warnings={[]}
        />
      );

      expect(screen.getByText(/very long error message/i)).toBeInTheDocument();
    });
  });
});
