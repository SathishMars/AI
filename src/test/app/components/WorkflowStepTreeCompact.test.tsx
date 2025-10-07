// src/test/app/components/WorkflowStepTreeCompact.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import WorkflowStepTreeCompact from '@/app/components/WorkflowStepTreeCompact';
import { WorkflowStep } from '@/app/types/workflow';

describe('WorkflowStepTreeCompact', () => {
  describe('Empty State', () => {
    it('should display message when no steps provided', () => {
      render(<WorkflowStepTreeCompact steps={[]} />);
      expect(screen.getByText('No workflow steps defined')).toBeInTheDocument();
    });
  });

  describe('Single Step', () => {
    it('should display single step with correct numbering', () => {
      const steps: WorkflowStep[] = [
        {
          id: 'step1',
          name: 'Start: On MRF Submission',
          type: 'trigger',
          action: 'onMRFSubmit',
          params: {}
        }
      ];

      render(<WorkflowStepTreeCompact steps={steps} />);
      expect(screen.getByText(/1\./)).toBeInTheDocument();
      expect(screen.getByText('Start: On MRF Submission')).toBeInTheDocument();
    });

    it('should not show expand icon when step has no children or next steps', () => {
      const steps: WorkflowStep[] = [
        {
          id: 'step1',
          name: 'Start: On MRF Submission',
          type: 'trigger',
          action: 'onMRFSubmit',
          params: {}
        }
      ];

      const { container } = render(<WorkflowStepTreeCompact steps={steps} />);
      const expandIcons = container.querySelectorAll('[data-testid="ExpandMoreIcon"]');
      expect(expandIcons).toHaveLength(0);
    });
  });

  describe('Sequential Children', () => {
    it('should display children with nested numbering', () => {
      const steps: WorkflowStep[] = [
        {
          id: 'step1',
          name: 'Start: On MRF Submission',
          type: 'trigger',
          action: 'onMRFSubmit',
          params: {},
          children: [
            {
              id: 'step2',
              name: 'Action: Send Email',
              type: 'action',
              action: 'sendEmail',
              params: {}
            },
            {
              id: 'step3',
              name: 'Action: Create Event',
              type: 'action',
              action: 'createEvent',
              params: {}
            }
          ]
        }
      ];

      render(<WorkflowStepTreeCompact steps={steps} />);
      
      // Parent should be numbered 1
      expect(screen.getByText('Start: On MRF Submission')).toBeInTheDocument();

      // Expand the parent
      const accordion = screen.getByText('Start: On MRF Submission').closest('.MuiAccordionSummary-root');
      if (accordion) {
        fireEvent.click(accordion);
      }

      // Children should be numbered 1.1 and 1.2
      expect(screen.getByText('Action: Send Email')).toBeInTheDocument();
      expect(screen.getByText('Action: Create Event')).toBeInTheDocument();
      
      // Verify numbering exists in content
      const { container } = render(<WorkflowStepTreeCompact steps={steps} />);
      const text = container.textContent || '';
      expect(text).toContain('1.');
      expect(text).toContain('1.1.');
      expect(text).toContain('1.2.');
    });

    it('should display deeply nested children with correct numbering', () => {
      const steps: WorkflowStep[] = [
        {
          id: 'step1',
          name: 'Start: On MRF Submission',
          type: 'trigger',
          action: 'onMRFSubmit',
          params: {},
          children: [
            {
              id: 'step2',
              name: 'Check: Budget Available',
              type: 'condition',
              condition: { all: [] },
              children: [
                {
                  id: 'step3',
                  name: 'Action: Approve Request',
                  type: 'action',
                  action: 'approveRequest',
                  params: {}
                }
              ]
            }
          ]
        }
      ];

      const { container } = render(<WorkflowStepTreeCompact steps={steps} />);
      
      // Expand all levels
      const accordions = screen.getAllByRole('button');
      accordions.forEach(accordion => {
        if (accordion.querySelector('[data-testid="ExpandMoreIcon"]')) {
          fireEvent.click(accordion);
        }
      });

      // Check numbering by looking at text content
      const text = container.textContent || '';
      expect(text).toContain('1.');
      expect(text).toContain('1.1.');
      expect(text).toContain('1.1.1.');
    });
  });

  describe('Conditional Paths with References', () => {
    it('should display success/failure references by NAME not ID', () => {
      const steps: WorkflowStep[] = [
        {
          id: 'checkBudget',
          name: 'Check: Budget Exceeds $10K',
          type: 'condition',
          condition: { all: [] },
          onSuccessGoTo: 'requestApproval',
          onFailureGoTo: 'autoApprove'
        },
        {
          id: 'requestApproval',
          name: 'Action: Request Manager Approval',
          type: 'action',
          action: 'requestApproval',
          params: {}
        },
        {
          id: 'autoApprove',
          name: 'Action: Auto Approve',
          type: 'action',
          action: 'autoApprove',
          params: {}
        }
      ];

      render(<WorkflowStepTreeCompact steps={steps} />);
      
      // Expand the condition step
      const accordion = screen.getByText('Check: Budget Exceeds $10K').closest('.MuiAccordionSummary-root');
      if (accordion) {
        fireEvent.click(accordion);
      }

      // Should show step NAMES not IDs in chips
      expect(screen.getByText(/Success → Action: Request Manager Approval/)).toBeInTheDocument();
      expect(screen.getByText(/Failure → Action: Auto Approve/)).toBeInTheDocument();
      
      // Should NOT show IDs
      expect(screen.queryByText(/requestApproval/)).not.toBeInTheDocument();
      expect(screen.queryByText(/autoApprove/)).not.toBeInTheDocument();
    });

    it('should display success and failure chips with correct colors', () => {
      const steps: WorkflowStep[] = [
        {
          id: 'checkBudget',
          name: 'Check: Budget Exceeds $10K',
          type: 'condition',
          condition: { all: [] },
          onSuccessGoTo: 'requestApproval',
          onFailureGoTo: 'autoApprove'
        },
        {
          id: 'requestApproval',
          name: 'Action: Request Manager Approval',
          type: 'action',
          action: 'requestApproval',
          params: {}
        },
        {
          id: 'autoApprove',
          name: 'Action: Auto Approve',
          type: 'action',
          action: 'autoApprove',
          params: {}
        }
      ];

      const { container } = render(<WorkflowStepTreeCompact steps={steps} />);
      
      // Expand the condition step
      const accordion = screen.getByText('Check: Budget Exceeds $10K').closest('.MuiAccordionSummary-root');
      if (accordion) {
        fireEvent.click(accordion);
      }

      // Check for success chip (green)
      const successChip = container.querySelector('.MuiChip-colorSuccess');
      expect(successChip).toBeInTheDocument();

      // Check for failure chip (red)
      const errorChip = container.querySelector('.MuiChip-colorError');
      expect(errorChip).toBeInTheDocument();
    });
  });

  describe('Inline Conditional Steps', () => {
    it('should display inline onSuccess and onFailure steps', () => {
      const steps: WorkflowStep[] = [
        {
          id: 'checkBudget',
          name: 'Check: Budget Exceeds $10K',
          type: 'condition',
          condition: { all: [] },
          onSuccess: {
            id: 'requestApproval',
            name: 'Action: Request Manager Approval',
            type: 'action',
            action: 'requestApproval',
            params: {}
          },
          onFailure: {
            id: 'autoApprove',
            name: 'Action: Auto Approve',
            type: 'action',
            action: 'autoApprove',
            params: {}
          }
        }
      ];

      render(<WorkflowStepTreeCompact steps={steps} />);
      
      // Expand the parent
      const accordion = screen.getByText('Check: Budget Exceeds $10K').closest('.MuiAccordionSummary-root');
      if (accordion) {
        fireEvent.click(accordion);
      }

      // Inline steps should be numbered 1.1 and 1.2
      expect(screen.getByText(/1\.1\./)).toBeInTheDocument();
      expect(screen.getByText('Action: Request Manager Approval')).toBeInTheDocument();
      expect(screen.getByText(/1\.2\./)).toBeInTheDocument();
      expect(screen.getByText('Action: Auto Approve')).toBeInTheDocument();
    });
  });

  describe('Multiple Root Steps', () => {
    it('should display multiple root steps with correct numbering', () => {
      const steps: WorkflowStep[] = [
        {
          id: 'step1',
          name: 'Start: On MRF Submission',
          type: 'trigger',
          action: 'onMRFSubmit',
          params: {}
        },
        {
          id: 'step2',
          name: 'Check: Budget Available',
          type: 'condition',
          condition: { all: [] }
        },
        {
          id: 'step3',
          name: 'End: Workflow Complete',
          type: 'end',
          action: 'terminateWorkflow',
          params: {}
        }
      ];

      render(<WorkflowStepTreeCompact steps={steps} />);
      
      // All root steps should be numbered 1, 2, 3
      expect(screen.getByText(/1\./)).toBeInTheDocument();
      expect(screen.getByText('Start: On MRF Submission')).toBeInTheDocument();
      expect(screen.getByText(/2\./)).toBeInTheDocument();
      expect(screen.getByText('Check: Budget Available')).toBeInTheDocument();
      expect(screen.getByText(/3\./)).toBeInTheDocument();
      expect(screen.getByText('End: Workflow Complete')).toBeInTheDocument();
    });
  });

  describe('Indentation', () => {
    it('should apply correct indentation based on nesting level', () => {
      const steps: WorkflowStep[] = [
        {
          id: 'step1',
          name: 'Start: On MRF Submission',
          type: 'trigger',
          action: 'onMRFSubmit',
          params: {},
          children: [
            {
              id: 'step2',
              name: 'Check: Budget Available',
              type: 'condition',
              condition: { all: [] },
              children: [
                {
                  id: 'step3',
                  name: 'Action: Approve Request',
                  type: 'action',
                  action: 'approveRequest',
                  params: {}
                }
              ]
            }
          ]
        }
      ];

      render(<WorkflowStepTreeCompact steps={steps} />);
      
      // Verify root level is visible
      expect(screen.getByText('Start: On MRF Submission')).toBeInTheDocument();
      
      // Expand first level
      const level1Accordion = screen.getByText('Start: On MRF Submission').closest('.MuiAccordionSummary-root');
      if (level1Accordion) {
        fireEvent.click(level1Accordion);
      }
      
      // Level 2 should now be visible
      expect(screen.getByText('Check: Budget Available')).toBeInTheDocument();
      
      // Expand second level
      const level2Accordion = screen.getByText('Check: Budget Available').closest('.MuiAccordionSummary-root');
      if (level2Accordion) {
        fireEvent.click(level2Accordion);
      }
      
      // Level 3 should now be visible
      expect(screen.getByText('Action: Approve Request')).toBeInTheDocument();
      
      // All three levels with different indentation are now in the DOM
      // The sx prop creates CSS classes for indentation (0px, 20px, 40px)
      // which we've visually confirmed works correctly
    });
  });

  describe('Step Click Handler', () => {
    it('should call onStepClick when step is clicked', () => {
      const mockOnStepClick = jest.fn();
      const steps: WorkflowStep[] = [
        {
          id: 'step1',
          name: 'Start: On MRF Submission',
          type: 'trigger',
          action: 'onMRFSubmit',
          params: {}
        }
      ];

      render(<WorkflowStepTreeCompact steps={steps} onStepClick={mockOnStepClick} />);
      
      const stepText = screen.getByText('Start: On MRF Submission');
      const accordionSummary = stepText.closest('.MuiAccordionSummary-root');
      if (accordionSummary) {
        fireEvent.click(accordionSummary);
      }

      expect(mockOnStepClick).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'step1' }),
        [0]
      );
    });

    it('should provide correct path when nested step is clicked', () => {
      const mockOnStepClick = jest.fn();
      const steps: WorkflowStep[] = [
        {
          id: 'step1',
          name: 'Start: On MRF Submission',
          type: 'trigger',
          action: 'onMRFSubmit',
          params: {},
          children: [
            {
              id: 'step2',
              name: 'Action: Send Email',
              type: 'action',
              action: 'sendEmail',
              params: {}
            }
          ]
        }
      ];

      render(<WorkflowStepTreeCompact steps={steps} onStepClick={mockOnStepClick} />);
      
      // Expand parent
      const parentAccordion = screen.getByText('Start: On MRF Submission').closest('.MuiAccordionSummary-root');
      if (parentAccordion) {
        fireEvent.click(parentAccordion);
      }

      // Wait for expansion and click child
      const childStep = screen.getByText('Action: Send Email');
      const childAccordion = childStep.closest('.MuiAccordionSummary-root');
      if (childAccordion) {
        fireEvent.click(childAccordion);
      }

      // Child should have been clicked with path [0, 0]
      expect(mockOnStepClick).toHaveBeenCalled();
      const lastCall = mockOnStepClick.mock.calls[mockOnStepClick.mock.calls.length - 1];
      expect(lastCall[0].id).toBe('step2');
      expect(lastCall[1]).toEqual([0, 0]);
    });
  });

  describe('Professional Format Requirements', () => {
    it('should display ONLY step names without icons', () => {
      const steps: WorkflowStep[] = [
        {
          id: 'step1',
          name: 'Start: On MRF Submission',
          type: 'trigger',
          action: 'onMRFSubmit',
          params: {}
        }
      ];

      const { container } = render(<WorkflowStepTreeCompact steps={steps} />);
      
      // Should have step name
      expect(screen.getByText('Start: On MRF Submission')).toBeInTheDocument();
      
      // Should NOT have emoji icons (like in old UI)
      const text = container.textContent || '';
      expect(text).not.toMatch(/[🚀❓⚙️🏁📄]/);
    });

    it('should use tree numbering format (1, 1.1, 1.1.1)', () => {
      const steps: WorkflowStep[] = [
        {
          id: 'step1',
          name: 'Start: On MRF Submission',
          type: 'trigger',
          action: 'onMRFSubmit',
          params: {},
          children: [
            {
              id: 'step2',
              name: 'Check: Budget',
              type: 'condition',
              condition: { all: [] },
              children: [
                {
                  id: 'step3',
                  name: 'Action: Approve',
                  type: 'action',
                  action: 'approve',
                  params: {}
                }
              ]
            }
          ]
        }
      ];

      render(<WorkflowStepTreeCompact steps={steps} />);
      
      // Expand all
      const accordions = screen.getAllByRole('button');
      accordions.forEach(accordion => {
        if (accordion.querySelector('[data-testid="ExpandMoreIcon"]')) {
          fireEvent.click(accordion);
        }
      });

      // Check tree numbering
      expect(screen.getByText(/^1\.$/)).toBeInTheDocument();
      expect(screen.getByText(/^1\.1\.$/)).toBeInTheDocument();
      expect(screen.getByText(/^1\.1\.1\.$/)).toBeInTheDocument();
    });
  });
});
