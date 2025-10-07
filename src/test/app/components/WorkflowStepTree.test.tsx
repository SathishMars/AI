// src/test/app/components/WorkflowStepTree.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import WorkflowStepTree from '@/app/components/WorkflowStepTree';
import { WorkflowStep } from '@/app/types/workflow';

describe('WorkflowStepTree', () => {
  describe('Empty State', () => {
    it('should display message when no steps provided', () => {
      render(<WorkflowStepTree steps={[]} />);
      expect(screen.getByText('No workflow steps defined')).toBeInTheDocument();
    });
  });

  describe('Single Step', () => {
    it('should display single step with type chip and name', () => {
      const steps: WorkflowStep[] = [
        {
          id: 'step1',
          name: 'Start: On MRF Submission',
          type: 'trigger',
          action: 'onMRFSubmit',
          params: {}
        }
      ];

      render(<WorkflowStepTree steps={steps} />);
      expect(screen.getByText('Trigger')).toBeInTheDocument();
      expect(screen.getByText('Start: On MRF Submission')).toBeInTheDocument();
    });
  });

  describe('Nested Steps', () => {
    it('should display nested children steps', () => {
      const steps: WorkflowStep[] = [
        {
          id: 'trigger',
          name: 'Start: On MRF Submission',
          type: 'trigger',
          action: 'onMRFSubmit',
          params: {},
          children: [
            {
              id: 'condition',
              name: 'Check: Budget Exceeds Limit',
              type: 'condition',
              condition: { all: [] }
            }
          ]
        }
      ];

      render(<WorkflowStepTree steps={steps} />);
      expect(screen.getByText('Start: On MRF Submission')).toBeInTheDocument();
      expect(screen.getByText('Check: Budget Exceeds Limit')).toBeInTheDocument();
    });

    it('should display inline onSuccess and onFailure steps', () => {
      const steps: WorkflowStep[] = [
        {
          id: 'condition',
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

      render(<WorkflowStepTree steps={steps} />);
      
      // All steps should be visible (no hidden content in accordions)
      expect(screen.getByText('Check: Budget Exceeds $10K')).toBeInTheDocument();
      expect(screen.getByText('Action: Request Manager Approval')).toBeInTheDocument();
      expect(screen.getByText('Action: Auto Approve')).toBeInTheDocument();
      
      // Check for success/failure indicators
      expect(screen.getAllByText('✓').length).toBeGreaterThan(0);
      expect(screen.getAllByText('✗').length).toBeGreaterThan(0);
    });
  });

  describe('Edit Functionality', () => {
    it('should call onStepEdit when edit icon is clicked', () => {
      const mockOnStepEdit = jest.fn();
      const steps: WorkflowStep[] = [
        {
          id: 'step1',
          name: 'Start: On MRF Submission',
          type: 'trigger',
          action: 'onMRFSubmit',
          params: {}
        }
      ];

      render(<WorkflowStepTree steps={steps} onStepEdit={mockOnStepEdit} />);
      
      // Find the tree item and hover to show edit button
      const stepContainer = screen.getByText('Start: On MRF Submission').closest('.MuiTreeItem-content');
      expect(stepContainer).toBeInTheDocument();
      
      // Find and click edit button
      const editButton = screen.getByRole('button', { hidden: true });
      fireEvent.click(editButton);
      
      expect(mockOnStepEdit).toHaveBeenCalledWith(steps[0]);
    });
  });

  describe('Step Type Chips', () => {
    it('should display correct type chip for each step type', () => {
      const steps: WorkflowStep[] = [
        { id: 'trigger1', name: 'Trigger Step', type: 'trigger', action: 'test', params: {} },
        { id: 'condition1', name: 'Condition Step', type: 'condition', condition: { all: [] } },
        { id: 'action1', name: 'Action Step', type: 'action', action: 'test', params: {} },
        { id: 'end1', name: 'End Step', type: 'end', action: 'terminate', params: {} }
      ];

      render(<WorkflowStepTree steps={steps} />);
      
      expect(screen.getByText('Trigger')).toBeInTheDocument();
      expect(screen.getByText('Condition')).toBeInTheDocument();
      expect(screen.getByText('Action')).toBeInTheDocument();
      expect(screen.getByText('End')).toBeInTheDocument();
    });
  });

  describe('User Workflow - OR Logic with Inline Steps', () => {
    it('should render complete 5-step workflow with all nodes visible', () => {
      const steps: WorkflowStep[] = [
        {
          id: 'mrfSubmissionTrigger',
          name: 'Start: On MRF Submission',
          type: 'trigger',
          action: 'onMRFSubmit',
          params: { mrfTemplateName: 'all' },
          children: [
            {
              id: 'checkLocationOrAttendees',
              name: 'Check: Location Not US OR Attendees Over 100',
              type: 'condition',
              condition: {
                any: [
                  { fact: 'mrf.location', operator: 'notEqual', value: 'US' },
                  { fact: 'mrf.maxAttendees', operator: 'greaterThan', value: 100 }
                ]
              },
              onSuccess: {
                id: 'requestManagerApproval',
                name: 'Action: Request Manager Approval',
                type: 'action',
                action: 'requestApproval',
                params: { to: 'manager@example.com' }
              },
              onFailure: {
                id: 'createEventAction',
                name: 'Action: Create Event',
                type: 'action',
                action: 'createEvent',
                params: { mrfID: 'dynamic' }
              }
            }
          ]
        },
        {
          id: 'workflowEnd',
          name: 'End: Workflow Complete',
          type: 'end',
          action: 'terminateWorkflow',
          params: { result: 'success' }
        }
      ];

      render(<WorkflowStepTree steps={steps} />);

      // All 5 steps should be visible WITHOUT expanding anything
      expect(screen.getByText('Start: On MRF Submission')).toBeInTheDocument();
      expect(screen.getByText('Check: Location Not US OR Attendees Over 100')).toBeInTheDocument();
      expect(screen.getByText('Action: Request Manager Approval')).toBeInTheDocument();
      expect(screen.getByText('Action: Create Event')).toBeInTheDocument();
      expect(screen.getByText('End: Workflow Complete')).toBeInTheDocument();
      
      // Check for success/failure indicators on inline steps
      expect(screen.getAllByText('✓').length).toBeGreaterThan(0);
      expect(screen.getAllByText('✗').length).toBeGreaterThan(0);
    });
  });
});
