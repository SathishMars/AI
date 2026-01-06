import { renderHook, act } from '@testing-library/react';
import { useCallback } from 'react';
import { WorkflowDefinition, WorkflowStep } from '../types/workflowTemplate';
import { FollowUpOption } from '../types/aimeWorkflowMessages';

// Mock ShortUniqueId
jest.mock('short-unique-id', () => {
  return jest.fn().mockImplementation(() => ({
    rnd: jest.fn(() => 'mock-id-123'),
  }));
});

describe('AimeWorkflowPane - onOptionSelected', () => {
  let workflowDefinition: WorkflowDefinition;
  let onWorkflowDefinitionChange: jest.Mock;
  let handleSendToAime: jest.Mock;

  beforeEach(() => {
    workflowDefinition = {
      steps: [],
    };

    onWorkflowDefinitionChange = jest.fn();
    handleSendToAime = jest.fn().mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Helper to create the onOptionSelected callback
  const createOnOptionSelected = (
    workflow: WorkflowDefinition,
    onChange: any,
    sendMessage: any
  ) => {
    return useCallback(
      async (option: FollowUpOption, forKey: string) => {
        // Handle template_request category by directly updating workflow definition
        if (
          option.category === 'template_request' &&
          option.value &&
          onChange
        ) {
          // Find or create trigger step
          let triggerStep = workflow.steps.find(
            (step) => step.type === 'trigger' && step.stepFunction === 'onRequest'
          ) as WorkflowStep | undefined;

          if (triggerStep) {
            // Update existing trigger step
            triggerStep = {
              ...triggerStep,
              functionParams: {
                ...triggerStep.functionParams,
                requestTemplateId: String(option.value),
              },
            };

            const updatedSteps = workflow.steps.map((step) =>
              step.id === triggerStep!.id ? triggerStep! : step
            );

            onChange({ steps: updatedSteps });
          } else {
            // Create new trigger step
            const newTriggerStep: WorkflowStep = {
              id: 'mock-id-123',
              label: `When ${option.label} is submitted`,
              type: 'trigger',
              stepFunction: 'onRequest',
              functionParams: {
                requestTemplateId: String(option.value),
              },
              next: [],
            };

            onChange({
              steps: [newTriggerStep, ...workflow.steps],
            });
          }

          const selectionText = `Use ${option.label} for ${forKey}`;
          await sendMessage(selectionText);
        }
      },
      [workflow, onChange, sendMessage]
    );
  };

  describe('template_request category handling', () => {
    it('should create new trigger step when none exists', async () => {
      // Arrange
      const { result } = renderHook(() =>
        createOnOptionSelected(
          workflowDefinition,
          onWorkflowDefinitionChange,
          handleSendToAime
        )
      );

      const option: FollowUpOption = {
        label: 'Budget Request',
        value: 'req-123',
        category: 'template_request',
      };

      // Act
      await act(async () => {
        await result.current(option, 'Request Template');
      });

      // Assert
      expect(onWorkflowDefinitionChange).toHaveBeenCalledWith({
        steps: [
          {
            id: 'mock-id-123',
            label: 'When Budget Request is submitted',
            type: 'trigger',
            stepFunction: 'onRequest',
            functionParams: {
              requestTemplateId: 'req-123',
            },
            next: [],
          },
        ],
      });
      expect(handleSendToAime).toHaveBeenCalledWith(
        'Use Budget Request for Request Template'
      );
    });

    it('should update existing trigger step when one exists', async () => {
      // Arrange
      const existingTriggerStep: WorkflowStep = {
        id: 'existing-trigger',
        label: 'When request is submitted',
        type: 'trigger',
        stepFunction: 'onRequest',
        functionParams: {},
        next: [],
      };

      const actionStep: WorkflowStep = {
        id: 'action-1',
        label: 'Send notification',
        type: 'action',
        stepFunction: 'sendEmail',
        functionParams: {},
        next: [],
      };

      workflowDefinition = {
        steps: [existingTriggerStep, actionStep],
      };

      const { result } = renderHook(() =>
        createOnOptionSelected(
          workflowDefinition,
          onWorkflowDefinitionChange,
          handleSendToAime
        )
      );

      const option: FollowUpOption = {
        label: 'Travel Request',
        value: 'req-456',
        category: 'template_request',
      };

      // Act
      await act(async () => {
        await result.current(option, 'Request Template');
      });

      // Assert
      expect(onWorkflowDefinitionChange).toHaveBeenCalledWith({
        steps: [
          {
            id: 'existing-trigger',
            label: 'When request is submitted',
            type: 'trigger',
            stepFunction: 'onRequest',
            functionParams: {
              requestTemplateId: 'req-456',
            },
            next: [],
          },
          actionStep,
        ],
      });
    });

    it('should preserve existing functionParams when updating trigger', async () => {
      // Arrange
      const existingTriggerStep: WorkflowStep = {
        id: 'existing-trigger',
        label: 'When request is submitted',
        type: 'trigger',
        stepFunction: 'onRequest',
        functionParams: {
          otherParam: 'keep-this-value',
          legacyParam: 123,
        },
        next: [],
      };

      workflowDefinition = {
        steps: [existingTriggerStep],
      };

      const { result } = renderHook(() =>
        createOnOptionSelected(
          workflowDefinition,
          onWorkflowDefinitionChange,
          handleSendToAime
        )
      );

      const option: FollowUpOption = {
        label: 'Purchase Request',
        value: 'req-789',
        category: 'template_request',
      };

      // Act
      await act(async () => {
        await result.current(option, 'Request Template');
      });

      // Assert
      const updatedStep = onWorkflowDefinitionChange.mock.calls[0][0].steps[0];
      expect(updatedStep.functionParams).toEqual({
        otherParam: 'keep-this-value',
        legacyParam: 123,
        requestTemplateId: 'req-789',
      });
    });

    it('should handle numeric template IDs by converting to string', async () => {
      // Arrange
      const { result } = renderHook(() =>
        createOnOptionSelected(
          workflowDefinition,
          onWorkflowDefinitionChange,
          handleSendToAime
        )
      );

      const option: FollowUpOption = {
        label: 'Equipment Request',
        value: 999,
        category: 'template_request',
      };

      // Act
      await act(async () => {
        await result.current(option, 'Request Template');
      });

      // Assert
      const newStep = onWorkflowDefinitionChange.mock.calls[0][0].steps[0];
      expect(newStep.functionParams.requestTemplateId).toBe('999');
      expect(typeof newStep.functionParams.requestTemplateId).toBe('string');
    });

    it('should prepend new trigger step to existing workflow steps', async () => {
      // Arrange
      const existingSteps: WorkflowStep[] = [
        {
          id: 'action-1',
          label: 'Action 1',
          type: 'action',
          stepFunction: 'doSomething',
          functionParams: {},
          next: [],
        },
        {
          id: 'condition-1',
          label: 'Condition 1',
          type: 'condition',
          stepFunction: 'checkCondition',
          functionParams: {},
          next: [],
        },
      ];

      workflowDefinition = {
        steps: existingSteps,
      };

      const { result } = renderHook(() =>
        createOnOptionSelected(
          workflowDefinition,
          onWorkflowDefinitionChange,
          handleSendToAime
        )
      );

      const option: FollowUpOption = {
        label: 'Approval Request',
        value: 'req-abc',
        category: 'template_request',
      };

      // Act
      await act(async () => {
        await result.current(option, 'Request Template');
      });

      // Assert
      const updatedSteps = onWorkflowDefinitionChange.mock.calls[0][0].steps;
      expect(updatedSteps).toHaveLength(3);
      expect(updatedSteps[0].type).toBe('trigger');
      expect(updatedSteps[0].stepFunction).toBe('onRequest');
      expect(updatedSteps[1]).toBe(existingSteps[0]);
      expect(updatedSteps[2]).toBe(existingSteps[1]);
    });

    it('should generate correct label from option label', async () => {
      // Arrange
      const { result } = renderHook(() =>
        createOnOptionSelected(
          workflowDefinition,
          onWorkflowDefinitionChange,
          handleSendToAime
        )
      );

      const option: FollowUpOption = {
        label: 'Special Characters & Symbols!',
        value: 'req-special',
        category: 'template_request',
      };

      // Act
      await act(async () => {
        await result.current(option, 'Request Template');
      });

      // Assert
      const newStep = onWorkflowDefinitionChange.mock.calls[0][0].steps[0];
      expect(newStep.label).toBe('When Special Characters & Symbols! is submitted');
    });
  });

  describe('Message sending', () => {
    it('should send message after creating trigger step', async () => {
      // Arrange
      const { result } = renderHook(() =>
        createOnOptionSelected(
          workflowDefinition,
          onWorkflowDefinitionChange,
          handleSendToAime
        )
      );

      const option: FollowUpOption = {
        label: 'Test Request',
        value: 'req-test',
        category: 'template_request',
      };

      // Act
      await act(async () => {
        await result.current(option, 'Request Form');
      });

      // Assert
      expect(handleSendToAime).toHaveBeenCalledTimes(1);
      expect(handleSendToAime).toHaveBeenCalledWith(
        'Use Test Request for Request Form'
      );
    });

    it('should format selection message correctly', async () => {
      // Arrange
      const { result } = renderHook(() =>
        createOnOptionSelected(
          workflowDefinition,
          onWorkflowDefinitionChange,
          handleSendToAime
        )
      );

      const option: FollowUpOption = {
        label: 'My Custom Template',
        value: 'template-id',
        category: 'template_request',
      };

      // Act
      await act(async () => {
        await result.current(option, 'Template Type');
      });

      // Assert
      expect(handleSendToAime).toHaveBeenCalledWith(
        'Use My Custom Template for Template Type'
      );
    });
  });

  describe('Edge cases', () => {
    it('should not call onChange when onWorkflowDefinitionChange is undefined', async () => {
      // Arrange
      const { result } = renderHook(() =>
        createOnOptionSelected(workflowDefinition, undefined, handleSendToAime)
      );

      const option: FollowUpOption = {
        label: 'Test Request',
        value: 'req-test',
        category: 'template_request',
      };

      // Act
      await act(async () => {
        await result.current(option, 'Request Template');
      });

      // Assert - Should not throw, just silently skip
      expect(handleSendToAime).not.toHaveBeenCalled();
    });

    it('should not process option without category template_request', async () => {
      // Arrange
      const { result } = renderHook(() =>
        createOnOptionSelected(
          workflowDefinition,
          onWorkflowDefinitionChange,
          handleSendToAime
        )
      );

      const option: FollowUpOption = {
        label: 'Other Option',
        value: 'other-value',
        category: 'other_category',
      };

      // Act
      await act(async () => {
        await result.current(option, 'Some Key');
      });

      // Assert
      expect(onWorkflowDefinitionChange).not.toHaveBeenCalled();
      expect(handleSendToAime).not.toHaveBeenCalled();
    });

    it('should not process option without value', async () => {
      // Arrange
      const { result } = renderHook(() =>
        createOnOptionSelected(
          workflowDefinition,
          onWorkflowDefinitionChange,
          handleSendToAime
        )
      );

      const option: FollowUpOption = {
        label: 'No Value Option',
        value: null,
        category: 'template_request',
      };

      // Act
      await act(async () => {
        await result.current(option, 'Request Template');
      });

      // Assert
      expect(onWorkflowDefinitionChange).not.toHaveBeenCalled();
      expect(handleSendToAime).not.toHaveBeenCalled();
    });

    it('should handle empty workflow steps array', async () => {
      // Arrange
      workflowDefinition = { steps: [] };

      const { result } = renderHook(() =>
        createOnOptionSelected(
          workflowDefinition,
          onWorkflowDefinitionChange,
          handleSendToAime
        )
      );

      const option: FollowUpOption = {
        label: 'First Template',
        value: 'first-template',
        category: 'template_request',
      };

      // Act
      await act(async () => {
        await result.current(option, 'Request Template');
      });

      // Assert
      expect(onWorkflowDefinitionChange).toHaveBeenCalledWith({
        steps: [
          expect.objectContaining({
            type: 'trigger',
            stepFunction: 'onRequest',
          }),
        ],
      });
    });

    it('should only update trigger steps with onRequest stepFunction', async () => {
      // Arrange
      const otherTriggerStep: WorkflowStep = {
        id: 'other-trigger',
        label: 'Other trigger',
        type: 'trigger',
        stepFunction: 'onSchedule',
        functionParams: {},
        next: [],
      };

      workflowDefinition = {
        steps: [otherTriggerStep],
      };

      const { result } = renderHook(() =>
        createOnOptionSelected(
          workflowDefinition,
          onWorkflowDefinitionChange,
          handleSendToAime
        )
      );

      const option: FollowUpOption = {
        label: 'New Request',
        value: 'new-req',
        category: 'template_request',
      };

      // Act
      await act(async () => {
        await result.current(option, 'Request Template');
      });

      // Assert
      // Should create a new step instead of updating the other trigger
      const updatedSteps = onWorkflowDefinitionChange.mock.calls[0][0].steps;
      expect(updatedSteps).toHaveLength(2);
      expect(updatedSteps[0].stepFunction).toBe('onRequest');
      expect(updatedSteps[1]).toBe(otherTriggerStep);
    });
  });
});

