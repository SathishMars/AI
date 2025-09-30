// src/test/app/components/EditModeIndicator.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import EditModeIndicator from '@/app/components/EditModeIndicator';
import { WorkflowJSON } from '@/app/types/workflow';

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

const mockWorkflow: WorkflowJSON = {
  schemaVersion: '1.0',
  metadata: {
    id: 'test-workflow',
    name: 'Test Workflow',
    version: '1.0.0',
    status: 'draft',
    tags: [],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02')
  },
  steps: {}
};

describe('EditModeIndicator', () => {
  describe('Status Display', () => {
    it('displays draft status correctly', () => {
      renderWithTheme(<EditModeIndicator workflow={mockWorkflow} />);
      
      expect(screen.getByText('Draft')).toBeInTheDocument();
    });

    it('displays published status correctly', () => {
      const publishedWorkflow = {
        ...mockWorkflow,
        metadata: {
          ...mockWorkflow.metadata,
          status: 'published' as const
        }
      };
      
      renderWithTheme(<EditModeIndicator workflow={publishedWorkflow} />);
      
      expect(screen.getByText('Published')).toBeInTheDocument();
    });

    it('displays version information', () => {
      renderWithTheme(<EditModeIndicator workflow={mockWorkflow} />);
      
      expect(screen.getByText('v1.0.0')).toBeInTheDocument();
    });

    it('shows unsaved changes indicator when hasUnsavedChanges is true', () => {
      renderWithTheme(<EditModeIndicator workflow={mockWorkflow} hasUnsavedChanges={true} />);
      
      expect(screen.getByText('Unsaved Changes')).toBeInTheDocument();
    });

    it('does not show unsaved changes indicator when hasUnsavedChanges is false', () => {
      renderWithTheme(<EditModeIndicator workflow={mockWorkflow} hasUnsavedChanges={false} />);
      
      expect(screen.queryByText('Unsaved Changes')).not.toBeInTheDocument();
    });
  });
});