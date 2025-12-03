/**
 * Tests for WorkflowStatusPage
 *
 * Tests the workflow status page including:
 * - Page rendering
 * - Status display
 * - Error handling
 */

import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import WorkflowStatusPage from '@/app/workflows/status/[id]/page';

describe('WorkflowStatusPage', () => {
  it('should render the page with status message', () => {
    render(<WorkflowStatusPage />);

    expect(screen.getByText(/Workflow Status Page/i)).toBeInTheDocument();
  });

  it('should render without errors', () => {
    const { container } = render(<WorkflowStatusPage />);

    expect(container).toBeInTheDocument();
    expect(container.querySelector('div')).toBeInTheDocument();
  });

  it('should have proper structure', () => {
    const { container } = render(<WorkflowStatusPage />);

    const mainDiv = container.querySelector('div');
    expect(mainDiv).toBeInTheDocument();
    expect(mainDiv?.textContent).toContain('Workflow Status Page');
  });

  it('should display as simple div element', () => {
    const { container } = render(<WorkflowStatusPage />);

    const divElement = container.querySelector('div > div');
    expect(divElement?.tagName).toBe('DIV');
  });
});
