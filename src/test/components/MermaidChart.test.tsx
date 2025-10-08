import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import MermaidChart from '@/app/components/MermaidChart';

// Mock mermaid library
jest.mock('mermaid', () => ({
  initialize: jest.fn(),
  parse: jest.fn(),
  render: jest.fn().mockResolvedValue({ svg: '<svg></svg>' })
}));

describe('MermaidChart', () => {
  it('should render loading state initially', async () => {
    render(<MermaidChart chart="graph TD; A-->B" />);
    
    expect(screen.getByText('Rendering workflow diagram...')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
  });

  it('should not render when chart is empty', async () => {
    render(<MermaidChart chart="" />);

    await waitFor(() => {
      expect(screen.queryByText('Rendering workflow diagram...')).not.toBeInTheDocument();
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
  });

  it('should accept custom props', async () => {
    const onError = jest.fn();
    render(
      <MermaidChart 
        chart="graph TD; A-->B" 
        id="test-chart"
        className="custom-chart"
        onError={onError}
      />
    );
    
    // Component should render without crashing
    expect(screen.getByText('Rendering workflow diagram...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText('Rendering workflow diagram...')).not.toBeInTheDocument();
    });
  });
});