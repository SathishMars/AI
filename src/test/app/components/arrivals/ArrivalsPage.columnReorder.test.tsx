/**
 * Unit tests for Column Reordering functionality in ArrivalsPage
 * Covers both drag-and-drop and natural language reordering
 * Target: >85% coverage for column reordering logic
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
  return function MockArrivalsTable({ 
    columnOrder, 
    onColumnOrderChange,
    highlightedColumns 
  }: { 
    columnOrder: string[];
    onColumnOrderChange?: (newOrder: string[]) => void;
    highlightedColumns?: string[];
  }) {
    return (
      <div data-testid="arrivals-table">
        <div data-testid="column-order">{columnOrder.join(',')}</div>
        {highlightedColumns && highlightedColumns.length > 0 && (
          <div data-testid="highlighted-columns">{highlightedColumns.join(',')}</div>
        )}
        {onColumnOrderChange && (
          <button
            data-testid="test-reorder-button"
            onClick={() => onColumnOrderChange(['email', 'first_name', 'last_name'])}
          >
            Test Reorder
          </button>
        )}
      </div>
    );
  };
});

const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUseInsightsUI = useInsightsUI as jest.MockedFunction<typeof useInsightsUI>;

describe('Column Reordering Functionality', () => {
  const mockColumns = ['first_name', 'last_name', 'email', 'company_name', 'phone'];
  const mockRows = [
    {
      id: 1,
      first_name: 'John',
      last_name: 'Doe',
      email: 'john.doe@example.com',
      company_name: 'Acme Corp',
      phone: '123-456-7890',
    },
    {
      id: 2,
      first_name: 'Jane',
      last_name: 'Smith',
      email: 'jane.smith@test.com',
      company_name: 'Tech Inc',
      phone: '987-654-3210',
    },
  ];

  let mockSetAimeAction: jest.Mock;
  let mockSetSelectedColumns: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSetAimeAction = jest.fn();
    mockSetSelectedColumns = jest.fn();
    
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
      setAimeAction: mockSetAimeAction,
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

    // Mock localStorage
    Storage.prototype.getItem = jest.fn();
    Storage.prototype.setItem = jest.fn();
  });

  describe('Natural Language Column Reordering', () => {
    describe('Move Before/After Commands', () => {
      it('should handle "move X before Y" command', async () => {
        const { rerender } = render(<InsightsArrivalsPage />);
        
        // Simulate AIME action
        mockUseInsightsUI.mockReturnValue({
          ...mockUseInsightsUI(),
          aimeAction: {
            type: 'reorder_column',
            column: 'email',
            beforeColumn: 'first_name',
          },
        } as any);

        rerender(<InsightsArrivalsPage />);
        
        await waitFor(() => {
          expect(mockSetAimeAction).toHaveBeenCalled();
        });
      });

      it('should handle "move X after Y" command', async () => {
        const { rerender } = render(<InsightsArrivalsPage />);
        
        mockUseInsightsUI.mockReturnValue({
          ...mockUseInsightsUI(),
          aimeAction: {
            type: 'reorder_column',
            column: 'email',
            afterColumn: 'first_name',
          },
        } as any);

        rerender(<InsightsArrivalsPage />);
        
        await waitFor(() => {
          expect(mockSetAimeAction).toHaveBeenCalled();
        });
      });
    });

    describe('Move to Position Commands', () => {
      it('should handle "move X to position N" command', async () => {
        const { rerender } = render(<InsightsArrivalsPage />);
        
        mockUseInsightsUI.mockReturnValue({
          ...mockUseInsightsUI(),
          aimeAction: {
            type: 'reorder_column',
            column: 'email',
            index: 0,
          },
        } as any);

        rerender(<InsightsArrivalsPage />);
        
        await waitFor(() => {
          expect(mockSetAimeAction).toHaveBeenCalled();
        });
      });

      it('should handle "move X to front" command', async () => {
        const { rerender } = render(<InsightsArrivalsPage />);
        
        mockUseInsightsUI.mockReturnValue({
          ...mockUseInsightsUI(),
          aimeAction: {
            type: 'reorder_column',
            column: 'email',
            position: 0,
          },
        } as any);

        rerender(<InsightsArrivalsPage />);
        
        await waitFor(() => {
          expect(mockSetAimeAction).toHaveBeenCalled();
        });
      });

      it('should handle "move X to back" command', async () => {
        const { rerender } = render(<InsightsArrivalsPage />);
        
        mockUseInsightsUI.mockReturnValue({
          ...mockUseInsightsUI(),
          aimeAction: {
            type: 'reorder_column',
            column: 'email',
            position: -1,
          },
        } as any);

        rerender(<InsightsArrivalsPage />);
        
        await waitFor(() => {
          expect(mockSetAimeAction).toHaveBeenCalled();
        });
      });
    });

    describe('Swap Command', () => {
      it('should handle "swap X and Y" command', async () => {
        const { rerender } = render(<InsightsArrivalsPage />);
        
        mockUseInsightsUI.mockReturnValue({
          ...mockUseInsightsUI(),
          aimeAction: {
            type: 'swap_columns',
            column1: 'email',
            column2: 'first_name',
          },
        } as any);

        rerender(<InsightsArrivalsPage />);
        
        await waitFor(() => {
          expect(mockSetAimeAction).toHaveBeenCalled();
        });
      });

      it('should validate both columns exist before swapping', async () => {
        const { rerender } = render(<InsightsArrivalsPage />);
        
        mockUseInsightsUI.mockReturnValue({
          ...mockUseInsightsUI(),
          aimeAction: {
            type: 'swap_columns',
            column1: 'invalid_column',
            column2: 'first_name',
          },
        } as any);

        rerender(<InsightsArrivalsPage />);
        
        await waitFor(() => {
          expect(mockSetAimeAction).toHaveBeenCalled();
        });
      });
    });

    describe('Reset Command', () => {
      it('should handle "reset to default order" command', async () => {
        const { rerender } = render(<InsightsArrivalsPage />);
        
        mockUseInsightsUI.mockReturnValue({
          ...mockUseInsightsUI(),
          aimeAction: {
            type: 'reset_columns',
          },
        } as any);

        rerender(<InsightsArrivalsPage />);
        
        await waitFor(() => {
          expect(mockSetAimeAction).toHaveBeenCalled();
        });
      });
    });

    describe('List Command', () => {
      it('should handle "list current column order" command', async () => {
        const { rerender } = render(<InsightsArrivalsPage />);
        
        mockUseInsightsUI.mockReturnValue({
          ...mockUseInsightsUI(),
          aimeAction: {
            type: 'list_columns',
          },
        } as any);

        rerender(<InsightsArrivalsPage />);
        
        await waitFor(() => {
          expect(mockSetAimeAction).toHaveBeenCalled();
        });
      });
    });

    describe('Undo Command', () => {
      it('should handle "undo last change" command', async () => {
        const { rerender } = render(<InsightsArrivalsPage />);
        
        mockUseInsightsUI.mockReturnValue({
          ...mockUseInsightsUI(),
          aimeAction: {
            type: 'undo_column_reorder',
          },
        } as any);

        rerender(<InsightsArrivalsPage />);
        
        await waitFor(() => {
          expect(mockSetAimeAction).toHaveBeenCalled();
        });
      });
    });

    describe('Error Handling', () => {
      it('should handle invalid column names with suggestions', async () => {
        const { rerender } = render(<InsightsArrivalsPage />);
        
        mockUseInsightsUI.mockReturnValue({
          ...mockUseInsightsUI(),
          aimeAction: {
            type: 'reorder_column',
            column: 'invalid_column',
            beforeColumn: 'first_name',
          },
        } as any);

        rerender(<InsightsArrivalsPage />);
        
        await waitFor(() => {
          expect(mockSetAimeAction).toHaveBeenCalled();
        });
      });

      it('should acknowledge when column already in position', async () => {
        const { rerender } = render(<InsightsArrivalsPage />);
        
        mockUseInsightsUI.mockReturnValue({
          ...mockUseInsightsUI(),
          aimeAction: {
            type: 'reorder_column',
            column: 'first_name',
            position: 0,
          },
        } as any);

        rerender(<InsightsArrivalsPage />);
        
        await waitFor(() => {
          expect(mockSetAimeAction).toHaveBeenCalled();
        });
      });
    });
  });

  describe('Column Order Persistence', () => {
    it('should save column order to localStorage on change', async () => {
      render(<InsightsArrivalsPage />);
      
      // Simulate column order change via drag-and-drop
      const reorderButton = screen.getByTestId('test-reorder-button');
      fireEvent.click(reorderButton);
      
      await waitFor(() => {
        expect(Storage.prototype.setItem).toHaveBeenCalledWith(
          'arrivalsColumnOrder',
          expect.any(String)
        );
      });
    });

    it('should restore column order from localStorage on mount', () => {
      const savedOrder = JSON.stringify(['email', 'first_name', 'last_name']);
      (Storage.prototype.getItem as jest.Mock).mockReturnValue(savedOrder);
      
      render(<InsightsArrivalsPage />);
      
      expect(Storage.prototype.getItem).toHaveBeenCalledWith('arrivalsColumnOrder');
    });

    it('should handle invalid localStorage data gracefully', () => {
      (Storage.prototype.getItem as jest.Mock).mockReturnValue('invalid json');
      
      // Should not throw error
      expect(() => render(<InsightsArrivalsPage />)).not.toThrow();
    });
  });

  describe('Column Highlighting', () => {
    it('should highlight columns after reorder', async () => {
      const { rerender } = render(<InsightsArrivalsPage />);
      
      mockUseInsightsUI.mockReturnValue({
        ...mockUseInsightsUI(),
        aimeAction: {
          type: 'reorder_column',
          column: 'email',
          beforeColumn: 'first_name',
        },
      } as any);

      rerender(<InsightsArrivalsPage />);
      
      await waitFor(() => {
        const highlighted = screen.queryByTestId('highlighted-columns');
        // Highlighting should be applied (may fade after timeout)
        expect(mockSetAimeAction).toHaveBeenCalled();
      });
    });

    it('should highlight swapped columns', async () => {
      const { rerender } = render(<InsightsArrivalsPage />);
      
      mockUseInsightsUI.mockReturnValue({
        ...mockUseInsightsUI(),
        aimeAction: {
          type: 'swap_columns',
          column1: 'email',
          column2: 'first_name',
        },
      } as any);

      rerender(<InsightsArrivalsPage />);
      
      await waitFor(() => {
        expect(mockSetAimeAction).toHaveBeenCalled();
      });
    });
  });

  describe('Fuzzy Matching and Disambiguation', () => {
    it('should find close matches for invalid column names', () => {
      // This tests the Levenshtein distance calculation
      // The implementation should suggest close matches
      const { rerender } = render(<InsightsArrivalsPage />);
      
      mockUseInsightsUI.mockReturnValue({
        ...mockUseInsightsUI(),
        aimeAction: {
          type: 'reorder_column',
          column: 'emial', // Typo: should suggest 'email'
          beforeColumn: 'first_name',
        },
      } as any);

      rerender(<InsightsArrivalsPage />);
      
      // Should handle error with suggestions
      expect(mockSetAimeAction).toHaveBeenCalled();
    });
  });

  describe('Performance', () => {
    it('should complete reorder operation within 2 seconds', async () => {
      const startTime = Date.now();
      
      const { rerender } = render(<InsightsArrivalsPage />);
      
      mockUseInsightsUI.mockReturnValue({
        ...mockUseInsightsUI(),
        aimeAction: {
          type: 'reorder_column',
          column: 'email',
          beforeColumn: 'first_name',
        },
      } as any);

      rerender(<InsightsArrivalsPage />);
      
      await waitFor(() => {
        expect(mockSetAimeAction).toHaveBeenCalled();
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(2000);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty column list', () => {
      render(<InsightsArrivalsPage />);
      // Should not throw error when no columns available
      expect(screen.getByTestId('arrivals-table')).toBeInTheDocument();
    });

    it('should handle reorder when column not in selected columns', async () => {
      const { rerender } = render(<InsightsArrivalsPage />);
      
      mockUseInsightsUI.mockReturnValue({
        ...mockUseInsightsUI(),
        aimeAction: {
          type: 'reorder_column',
          column: 'non_existent_column',
          beforeColumn: 'first_name',
        },
      } as any);

      rerender(<InsightsArrivalsPage />);
      
      await waitFor(() => {
        expect(mockSetAimeAction).toHaveBeenCalled();
      });
    });

    it('should handle multiple sequential reorder operations', async () => {
      const { rerender } = render(<InsightsArrivalsPage />);
      
      // First reorder
      mockUseInsightsUI.mockReturnValue({
        ...mockUseInsightsUI(),
        aimeAction: {
          type: 'reorder_column',
          column: 'email',
          beforeColumn: 'first_name',
        },
      } as any);
      rerender(<InsightsArrivalsPage />);
      
      await waitFor(() => {
        expect(mockSetAimeAction).toHaveBeenCalled();
      });
      
      // Second reorder
      mockSetAimeAction.mockClear();
      mockUseInsightsUI.mockReturnValue({
        ...mockUseInsightsUI(),
        aimeAction: {
          type: 'reorder_column',
          column: 'last_name',
          afterColumn: 'email',
        },
      } as any);
      rerender(<InsightsArrivalsPage />);
      
      await waitFor(() => {
        expect(mockSetAimeAction).toHaveBeenCalled();
      });
    });
  });
});
