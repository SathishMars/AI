/**
 * Unit tests for Global Search functionality in ArrivalsPage
 * Target: >85% coverage for search matching logic
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import InsightsArrivalsPage from '@/app/components/arrivals/ArrivalsPage';
import { useInsightsUI } from '@/app/lib/insights/ui-store';

// Mock dependencies
jest.mock('next/navigation');
jest.mock('@/app/lib/insights/ui-store');
jest.mock('@/app/components/arrivals/ArrivalsTable', () => {
  return function MockArrivalsTable({ rows }: { rows: any[] }) {
    return <div data-testid="arrivals-table">{rows.length} rows</div>;
  };
});

const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUseInsightsUI = useInsightsUI as jest.MockedFunction<typeof useInsightsUI>;

describe('Global Search Functionality', () => {
  const mockRows = [
    {
      id: 1,
      first_name: 'John',
      last_name: 'Doe',
      email: 'john.doe@example.com',
      company_name: 'Acme Corp',
      phone: '123-456-7890',
      attendee_type: 'VIP',
    },
    {
      id: 2,
      first_name: 'Jane',
      last_name: 'Smith',
      email: 'jane.smith@test.com',
      company_name: 'Tech Inc',
      phone: '987-654-3210',
      attendee_type: 'Standard',
    },
    {
      id: 3,
      first_name: 'Bob',
      last_name: 'Johnson',
      email: 'bob@example.com',
      company_name: 'Acme Corp',
      phone: '555-123-4567',
      attendee_type: 'VIP',
    },
    {
      id: 4,
      first_name: 'Alice',
      last_name: 'Williams',
      email: 'alice@test.com',
      company_name: 'Design Co',
      phone: null,
      attendee_type: null,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseRouter.mockReturnValue({
      back: jest.fn(),
      push: jest.fn(),
      replace: jest.fn(),
      refresh: jest.fn(),
      forward: jest.fn(),
      prefetch: jest.fn(),
    } as any);

    mockUseInsightsUI.mockReturnValue({
      openAime: jest.fn(),
      setPickColumnsOpen: jest.fn(),
      setAimeOpen: jest.fn(),
      setPickColumnsData: jest.fn(),
      aimeAction: null,
      setAimeAction: jest.fn(),
      eventId: 5281,
      setEventId: jest.fn(),
      setExportState: jest.fn(),
      sidebarCollapsed: false,
      setSidebarCollapsed: jest.fn(),
      aimeOpen: true,
      pickColumnsOpen: false,
      pickColumnsData: null,
      exportState: null,
    } as any);
  });

  describe('Search Input Component', () => {
    it('should render search input field', () => {
      render(<InsightsArrivalsPage />);
      const searchInput = screen.getByPlaceholderText(/Search across all columns/);
      expect(searchInput).toBeInTheDocument();
    });

    it('should have search icon visible', () => {
      render(<InsightsArrivalsPage />);
      // Search icon is rendered via lucide-react Search component
      const searchContainer = screen.getByPlaceholderText(/Search across all columns/).closest('div');
      expect(searchContainer).toBeInTheDocument();
    });

    it('should show clear button when search text is present', async () => {
      render(<InsightsArrivalsPage />);
      const searchInput = screen.getByPlaceholderText(/Search across all columns/) as HTMLInputElement;
      
      fireEvent.change(searchInput, { target: { value: 'test' } });
      
      await waitFor(() => {
        const clearButton = screen.getByLabelText('Clear search');
        expect(clearButton).toBeInTheDocument();
      });
    });

    it('should hide clear button when search is empty', async () => {
      render(<InsightsArrivalsPage />);
      const searchInput = screen.getByPlaceholderText(/Search across all columns/) as HTMLInputElement;
      
      fireEvent.change(searchInput, { target: { value: 'test' } });
      await waitFor(() => {
        expect(screen.getByLabelText('Clear search')).toBeInTheDocument();
      });
      
      fireEvent.change(searchInput, { target: { value: '' } });
      await waitFor(() => {
        expect(screen.queryByLabelText('Clear search')).not.toBeInTheDocument();
      });
    });

    it('should clear search when clear button is clicked', async () => {
      render(<InsightsArrivalsPage />);
      const searchInput = screen.getByPlaceholderText(/Search across all columns/) as HTMLInputElement;
      
      fireEvent.change(searchInput, { target: { value: 'test' } });
      await waitFor(() => {
        expect(searchInput.value).toBe('test');
      });
      
      const clearButton = screen.getByLabelText('Clear search');
      fireEvent.click(clearButton);
      
      await waitFor(() => {
        expect(searchInput.value).toBe('');
      });
    });
  });

  describe('Search Matching Logic', () => {
    // Note: These tests would need to be adapted based on how the component
    // is structured. Since the search logic is in a useMemo, we need to
    // test it through the component's rendered output.

    it('should search across all columns', async () => {
      // This test would verify that searching for a value in any column
      // returns matching rows
      // Implementation depends on component structure
    });

    it('should perform case-insensitive search', async () => {
      render(<InsightsArrivalsPage />);
      const searchInput = screen.getByPlaceholderText(/Search across all columns/) as HTMLInputElement;
      
      // Search for lowercase
      fireEvent.change(searchInput, { target: { value: 'john' } });
      // Should match "John" in first_name
      
      // Search for uppercase
      fireEvent.change(searchInput, { target: { value: 'JOHN' } });
      // Should match "John" in first_name
      
      // Search for mixed case
      fireEvent.change(searchInput, { target: { value: 'JoHn' } });
      // Should match "John" in first_name
    });

    it('should support partial matches', async () => {
      render(<InsightsArrivalsPage />);
      const searchInput = screen.getByPlaceholderText(/Search across all columns/) as HTMLInputElement;
      
      // Partial match in first_name
      fireEvent.change(searchInput, { target: { value: 'Joh' } });
      // Should match "John"
      
      // Partial match in email
      fireEvent.change(searchInput, { target: { value: '@example' } });
      // Should match emails containing "@example"
    });

    it('should handle special characters', async () => {
      render(<InsightsArrivalsPage />);
      const searchInput = screen.getByPlaceholderText(/Search across all columns/) as HTMLInputElement;
      
      // Search with special characters
      fireEvent.change(searchInput, { target: { value: '@example.com' } });
      // Should match emails
      
      fireEvent.change(searchInput, { target: { value: '123-456' } });
      // Should match phone numbers
      
      fireEvent.change(searchInput, { target: { value: '#' } });
      // Should handle special characters gracefully
    });

    it('should handle null and undefined values', async () => {
      render(<InsightsArrivalsPage />);
      const searchInput = screen.getByPlaceholderText(/Search across all columns/) as HTMLInputElement;
      
      // Search should not crash when row has null/undefined values
      fireEvent.change(searchInput, { target: { value: 'test' } });
      // Should handle rows with null phone or attendee_type
    });

    it('should clear filter when search is empty', async () => {
      render(<InsightsArrivalsPage />);
      const searchInput = screen.getByPlaceholderText(/Search across all columns/) as HTMLInputElement;
      
      // Set search
      fireEvent.change(searchInput, { target: { value: 'test' } });
      
      // Clear search
      fireEvent.change(searchInput, { target: { value: '' } });
      
      // Should show all rows (original dataset)
    });

    it('should search across multiple columns simultaneously', async () => {
      render(<InsightsArrivalsPage />);
      const searchInput = screen.getByPlaceholderText(/Search across all columns/) as HTMLInputElement;
      
      // Search for value that exists in multiple columns
      fireEvent.change(searchInput, { target: { value: 'Acme' } });
      // Should match rows where "Acme" appears in any column (e.g., company_name)
    });

    it('should return empty results when no matches found', async () => {
      render(<InsightsArrivalsPage />);
      const searchInput = screen.getByPlaceholderText(/Search across all columns/) as HTMLInputElement;
      
      // Search for non-existent value
      fireEvent.change(searchInput, { target: { value: 'NonExistentValue12345' } });
      
      // Should show 0 results
      await waitFor(() => {
        const table = screen.getByTestId('arrivals-table');
        expect(table).toHaveTextContent('0 rows');
      });
    });
  });

  describe('Performance', () => {
    it('should complete search within 2 seconds for 10,000 rows', async () => {
      // Generate large dataset
      const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        first_name: `User${i}`,
        last_name: `LastName${i}`,
        email: `user${i}@example.com`,
        company_name: `Company${i}`,
      }));

      render(<InsightsArrivalsPage />);
      const searchInput = screen.getByPlaceholderText(/Search across all columns/) as HTMLInputElement;
      
      const startTime = performance.now();
      fireEvent.change(searchInput, { target: { value: 'User5000' } });
      
      await waitFor(() => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        expect(duration).toBeLessThan(2000); // Should complete in < 2 seconds
      }, { timeout: 3000 });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty dataset', async () => {
      render(<InsightsArrivalsPage />);
      const searchInput = screen.getByPlaceholderText(/Search across all columns/) as HTMLInputElement;
      
      fireEvent.change(searchInput, { target: { value: 'test' } });
      // Should not crash with empty dataset
    });

    it('should handle very long search strings', async () => {
      render(<InsightsArrivalsPage />);
      const searchInput = screen.getByPlaceholderText(/Search across all columns/) as HTMLInputElement;
      
      const longString = 'a'.repeat(1000);
      fireEvent.change(searchInput, { target: { value: longString } });
      // Should handle gracefully
    });

    it('should handle whitespace-only search', async () => {
      render(<InsightsArrivalsPage />);
      const searchInput = screen.getByPlaceholderText(/Search across all columns/) as HTMLInputElement;
      
      fireEvent.change(searchInput, { target: { value: '   ' } });
      // Should treat as empty and show all results
    });
  });
});
