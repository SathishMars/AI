import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import MermaidChart from '@/app/components/MermaidChart';

// Mock mermaid library
jest.mock('mermaid', () => ({
  initialize: jest.fn(),
  parse: jest.fn(),
  render: jest.fn()
}));

describe('MermaidChart', () => {
  it('should render loading state initially', () => {
    render(<MermaidChart chart="graph TD; A-->B" />);
    
    expect(screen.getByText('Rendering workflow diagram...')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should not render when chart is empty', () => {
    render(<MermaidChart chart="" />);
    
    // Should still show loading initially
    expect(screen.getByText('Rendering workflow diagram...')).toBeInTheDocument();
  });

  it('should accept custom props', () => {
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
  });
});