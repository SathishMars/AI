// INSIGHTS-SPECIFIC: Arrivals table component
import React, { useState, useEffect, useRef, useMemo } from "react";
import { insightsAttendeeColumns } from "@/app/lib/insights/data";

type ArrivalsTableProps = {
  rows: Record<string, any>[];
  columnOrder: string[];
  loading: boolean;
  showAll: boolean;
  filters?: Record<string, string>;
  onFilterChange?: (filters: Record<string, string>) => void;
  sortColumn?: string | null;
  sortDirection?: "asc" | "desc";
  onVisibleRowsChange?: (visibleCount: number, totalCount: number) => void;
  onColumnOrderChange?: (newOrder: string[]) => void;
  highlightedColumns?: string[];
  onDebugInfoChange?: (debugInfo: {
    containerDebug: any;
    scrollbarDebug: any;
  }) => void;
};

// Helper function to detect data type of a column
function getColumnDataType(rows: Record<string, any>[], columnName: string): string {
  if (!rows || rows.length === 0) return "text";

  // Sample a few rows to determine type
  const sampleSize = Math.min(5, rows.length);
  const samples = rows.slice(0, sampleSize).map(row => row[columnName]).filter(val => val !== null && val !== undefined && val !== "");

  if (samples.length === 0) return "text";

  // Check if all samples are numbers
  const allNumbers = samples.every(val => {
    if (typeof val === 'number') return true;
    if (typeof val === 'string') {
      // Check if it's a valid number string
      const num = Number(val);
      return !isNaN(num) && val.trim() !== '';
    }
    return false;
  });

  if (allNumbers) {
    // Check if it's an integer or float
    const hasDecimal = samples.some(val => {
      const str = String(val);
      return str.includes('.');
    });
    return hasDecimal ? "number" : "integer";
  }

  // Check if all samples are dates
  const allDates = samples.every(val => {
    const date = new Date(val);
    return !isNaN(date.getTime());
  });

  if (allDates) return "date";

  // Check if all samples are booleans
  const allBooleans = samples.every(val => typeof val === 'boolean' || val === 'true' || val === 'false');
  if (allBooleans) return "boolean";

  // Default to text
  return "text";
}

export default function InsightsArrivalsTable({
  rows,
  columnOrder,
  loading,
  showAll,
  filters = {},
  onFilterChange,
  onVisibleRowsChange,
  onColumnOrderChange,
  highlightedColumns = [],
  onDebugInfoChange,
}: ArrivalsTableProps) {
  const [localColumnOrder, setLocalColumnOrder] = useState<string[]>(columnOrder);
  const [viewportHeight, setViewportHeight] = useState<number>(0);
  const [rowHeight, setRowHeight] = useState<number>(0);
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const tableWrapperRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const headerRef = useRef<HTMLTableSectionElement>(null);
  const firstRowRef = useRef<HTMLTableRowElement>(null);

  // Sync local order when prop changes
  useEffect(() => {
    setLocalColumnOrder(columnOrder);
  }, [columnOrder]);

  // Handle drag start
  const handleDragStart = (column: string) => {
    setDraggedColumn(column);
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent, targetColumn: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedColumn || draggedColumn === targetColumn) {
      setDragOverColumn(null);
      return;
    }

    setDragOverColumn(targetColumn);

    const draggedIndex = localColumnOrder.indexOf(draggedColumn);
    const targetIndex = localColumnOrder.indexOf(targetColumn);

    if (draggedIndex === -1 || targetIndex === -1) return;
    if (draggedIndex === targetIndex) return;

    const newOrder = [...localColumnOrder];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedColumn);
    setLocalColumnOrder(newOrder);
    
    // Notify parent of order change
    if (onColumnOrderChange) {
      onColumnOrderChange(newOrder);
    }
  };

  // Handle drag leave
  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  // Handle drag end
  const handleDragEnd = () => {
    setDraggedColumn(null);
    setDragOverColumn(null);
  };

  // Calculate viewport height and row height
  useEffect(() => {
    const calculateDimensions = () => {
      if (!tableContainerRef.current) return;

      // Get the full container height first (parent container)
      let fullContainerHeight = 0;
      if (tableContainerRef.current) {
        const containerRect = tableContainerRef.current.getBoundingClientRect();
        fullContainerHeight = containerRect.height;
      }

      // Use table wrapper height if available (this is already calc(100% - 236px) when showAll is false)
      let wrapperHeight = 0;
      if (tableWrapperRef.current) {
        const wrapperRect = tableWrapperRef.current.getBoundingClientRect();
        wrapperHeight = wrapperRect.height;
      }

      // Use wrapper height if available (more accurate), otherwise use container height
      const availableHeight = wrapperHeight > 0 ? wrapperHeight : fullContainerHeight;

      // Measure header height
      let headerHeight = 0;
      if (headerRef.current) {
        headerHeight = headerRef.current.getBoundingClientRect().height;
      }

      // Measure row height (use first row if available)
      let measuredRowHeight = 0;
      if (firstRowRef.current) {
        measuredRowHeight = firstRowRef.current.getBoundingClientRect().height;
      } else {
        // Default row height estimate (including border)
        measuredRowHeight = 40; // Approximate height for a row with padding
      }

      setViewportHeight(availableHeight);
      setRowHeight(measuredRowHeight);
    };

    // Calculate on mount and when showAll changes
    // Use multiple timeouts to ensure DOM is fully rendered
    const timeoutId1 = setTimeout(() => {
      calculateDimensions();
    }, 0);
    
    const timeoutId2 = setTimeout(() => {
      calculateDimensions();
    }, 100);
    
    // Also calculate immediately
    calculateDimensions();

    // Recalculate on window resize
    const handleResize = () => {
      calculateDimensions();
    };

    window.addEventListener('resize', handleResize);
    
    // Observe wrapper for size changes
    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        calculateDimensions();
      });
    });
    
    if (tableWrapperRef.current) {
      resizeObserver.observe(tableWrapperRef.current);
    }
    if (tableContainerRef.current) {
      resizeObserver.observe(tableContainerRef.current);
    }
    
    return () => {
      clearTimeout(timeoutId1);
      clearTimeout(timeoutId2);
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
    };
  }, [showAll, rows.length]);

  // Calculate how many rows fit in viewport
  const maxVisibleRows = useMemo(() => {
    if (showAll || viewportHeight === 0 || rowHeight === 0) {
      return rows.length; // Show all rows if showAll is true or dimensions not calculated
    }

    // Always get fresh measurements from the DOM for accuracy
    let wrapperHeight = 0;
    let parentContainerHeight = 0;
    let grandParentHeight = 0;
    
    // Get actual wrapper height - this is the scrollable container
    if (tableWrapperRef.current) {
      const wrapperRect = tableWrapperRef.current.getBoundingClientRect();
      wrapperHeight = wrapperRect.height;
    }
    
    // Get parent container height (table container) for fallback
    if (tableContainerRef.current) {
      const containerRect = tableContainerRef.current.getBoundingClientRect();
      parentContainerHeight = containerRect.height;
      
      // Try to get grandparent (the div wrapping the table component)
      const grandParent = tableContainerRef.current.parentElement;
      if (grandParent) {
        const grandParentRect = grandParent.getBoundingClientRect();
        grandParentHeight = grandParentRect.height;
      }
    }
    
    // Always use the LARGEST available height to maximize space usage
    // Priority: grandParent > parent > wrapper > viewport
    // If wrapper is smaller than parent, use parent to maximize space
    let actualContainerHeight = 0;
    
    // Use grandparent if available and it's larger than wrapper
    if (grandParentHeight > 0) {
      actualContainerHeight = grandParentHeight;
    } 
    // Use parent container if it's larger than wrapper
    else if (parentContainerHeight > 0) {
      actualContainerHeight = parentContainerHeight;
    }
    // Fallback to wrapper
    else if (wrapperHeight > 0) {
      actualContainerHeight = wrapperHeight;
    }
    // Last resort: viewport
    else if (viewportHeight > 0) {
      actualContainerHeight = viewportHeight;
    }
    
    // CRITICAL: If wrapper is smaller than parent/grandparent, use the larger one
    // This ensures we use ALL available space, not just what wrapper currently has
    if (grandParentHeight > 0 && wrapperHeight > 0 && grandParentHeight > wrapperHeight) {
      actualContainerHeight = grandParentHeight;
    } else if (parentContainerHeight > 0 && wrapperHeight > 0 && parentContainerHeight > wrapperHeight) {
      actualContainerHeight = parentContainerHeight;
    }

    // Measure header height fresh
    const headerHeight = headerRef.current?.getBoundingClientRect().height || 60;
    
    // Use ALL available space for rows - only subtract header height
    // Scrollbar is part of the wrapper's overflow, so it doesn't need to be subtracted from available height
    // Overlay is positioned absolutely, so it doesn't reserve space
    const availableHeight = actualContainerHeight - headerHeight;
    
    // Calculate rows needed to fill the entire available space
    // Be extremely aggressive - fill as much as possible
    // Start with Math.ceil to ensure we fill the space, then add more if needed
    let calculatedRows = Math.ceil(availableHeight / rowHeight);

    // Start with calculated rows, but be aggressive about filling
    let finalRows = Math.max(1, Math.min(calculatedRows, rows.length));
    
    // Aggressively fill the entire available space
    // Keep adding rows until we fill the container completely
    while (finalRows < rows.length) {
      const nextRowHeight = (finalRows + 1) * rowHeight;
      
      // If adding another row would exceed available height, stop
      // Use very tight tolerance (0.5px) to maximize space usage
      if (nextRowHeight > availableHeight + 0.5) {
        break;
      }
      
      // Add another row if it fits
      finalRows += 1;
    }
    
    // Final optimization - check if we can fit one more row with minimal overflow
    const totalHeight = finalRows * rowHeight;
    const remainingSpace = availableHeight - totalHeight;
    
    // If we have space for at least 80% of another row, try to add it
    // This ensures we fill the container as much as possible
    if (remainingSpace > rowHeight * 0.8 && finalRows < rows.length) {
      const nextRowHeight = (finalRows + 1) * rowHeight;
      // Allow up to 5px overflow to fill the space better
      if (nextRowHeight <= availableHeight + 5) {
        finalRows += 1;
      }
    }
    
    // Final safety check - ensure we don't exceed available space by more than 5px
    const finalHeight = finalRows * rowHeight;
    if (finalHeight > availableHeight + 5) {
      // If we're exceeding by more than 5px, reduce by one row
      finalRows = Math.max(1, finalRows - 1);
    }
    
    // Debug logging with detailed measurements
    const spaceUsed = finalRows * rowHeight;
    const spaceRemaining = availableHeight - spaceUsed;
    
    // Row calculation complete
    
    return finalRows;
  }, [showAll, viewportHeight, rowHeight, rows.length]);

  // Limit displayed rows based on viewport height
  const visibleRows = useMemo(() => {
    if (showAll) {
      return rows;
    }
    return rows.slice(0, maxVisibleRows);
  }, [rows, showAll, maxVisibleRows]);

  // Track visible rows (console.log removed for production)
  useEffect(() => {
    // Visible rows tracking
  }, [visibleRows.length, maxVisibleRows, showAll, rows.length]);

  // Force recalculation after render to ensure we fill the space
  useEffect(() => {
    if (visibleRows.length > 0 && !showAll && tableWrapperRef.current && firstRowRef.current) {
      // Force a recalculation after a short delay to ensure DOM is fully rendered
      const forceRecalc = () => {
        if (tableWrapperRef.current && firstRowRef.current && headerRef.current) {
          const wrapperRect = tableWrapperRef.current.getBoundingClientRect();
          const rowRect = firstRowRef.current.getBoundingClientRect();
          const headerRect = headerRef.current.getBoundingClientRect();
          
          const newViewportHeight = wrapperRect.height;
          const newRowHeight = rowRect.height;
          const headerHeight = headerRect.height;
          
          // Only update if we have valid measurements and they're different
          if (newViewportHeight > 0 && newRowHeight > 0) {
            // Force update even if values are similar to trigger recalculation
            setViewportHeight(newViewportHeight);
            setRowHeight(newRowHeight);
            
            const availableForRows = newViewportHeight - headerHeight;
            const calculatedRows = Math.ceil(availableForRows / newRowHeight);
            
            // Force recalculated dimensions
          }
        }
      };
      
      // Multiple timeouts to catch different render phases
      const t1 = setTimeout(forceRecalc, 100);
      const t2 = setTimeout(forceRecalc, 250);
      const t3 = setTimeout(forceRecalc, 500);
      
      // Also trigger on next animation frame
      requestAnimationFrame(() => {
        setTimeout(forceRecalc, 0);
      });
      
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [visibleRows.length, showAll, rows.length]); // Include rows.length to recalc when data changes


  // Notify parent of visible row count
  const prevVisibleCountRef = useRef<number | null>(null);
  const prevTotalCountRef = useRef<number | null>(null);
  
  useEffect(() => {
    if (onVisibleRowsChange) {
      const visibleCount = visibleRows.length;
      const totalCount = rows.length;
      
      // Only call callback if values have actually changed
      if (prevVisibleCountRef.current !== visibleCount || prevTotalCountRef.current !== totalCount) {
        prevVisibleCountRef.current = visibleCount;
        prevTotalCountRef.current = totalCount;
        onVisibleRowsChange(visibleCount, totalCount);
      }
    }
  }, [visibleRows.length, rows.length, onVisibleRowsChange]);

  if (loading) {
    return <div className="p-4 text-sm text-gray-500">Loading table data...</div>;
  }

  if (!rows || rows.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        No data available. Please click "Load Attendee Data" to fetch data.
      </div>
    );
  }

  // Use localColumnOrder if available, fall back to prop or row keys
  const allHeaders = localColumnOrder.length > 0
    ? localColumnOrder
    : columnOrder.length > 0
      ? columnOrder
      : rows.length > 0
        ? Object.keys(rows[0])
        : insightsAttendeeColumns;

  const displayedHeaders = allHeaders;
  const displayedRows = visibleRows;

  // State for scrollbar debug info (for visual display) - COMPREHENSIVE
  const [scrollbarDebugInfo, setScrollbarDebugInfo] = useState<{
    visible: boolean;
    position: { top: number; bottom: number };
    coveringElements: Array<{ tag: string; zIndex: string; top: number; bottom: number }>;
    overflowX: string;
    scrollWidth: number;
    clientWidth: number;
    distanceFromBottom: number;
    inViewport: boolean;
    wrapperHeight: number;
    wrapperBottom: number;
    windowHeight: number;
    wrapperComputedHeight: string;
    wrapperMaxHeight: string;
    wrapperClipped: boolean;
    parentHeight: number;
    parentBottom: number;
    scrollbarDetected: boolean;
    scrollbarActualHeight: number;
    hasHorizontalScrollbar: boolean;
    wrapperBottomInViewport: boolean;
  } | null>(null);

  // Log scrollbar visibility details - COMPREHENSIVE DIAGNOSTICS
  useEffect(() => {
    if (tableWrapperRef.current && tableRef.current) {
      const checkScrollbar = () => {
        const wrapper = tableWrapperRef.current;
        const table = tableRef.current;
        
        if (wrapper && table) {
          const wrapperRect = wrapper.getBoundingClientRect();
          const tableRect = table.getBoundingClientRect();
          const computedStyle = window.getComputedStyle(wrapper);
          const parentRect = wrapper.parentElement?.getBoundingClientRect();
          const grandParentRect = wrapper.parentElement?.parentElement?.getBoundingClientRect();
          
          // Check scrollbar dimensions
          const scrollbarVisible = wrapper.scrollWidth > wrapper.clientWidth;
          const estimatedScrollbarHeight = computedStyle.overflowX === 'auto' && scrollbarVisible ? 18 : 0;
          
          // Calculate scrollbar position
          const scrollbarTop = wrapperRect.bottom - estimatedScrollbarHeight;
          const scrollbarBottom = wrapperRect.bottom;
          
          // Check for any elements that might be covering the scrollbar
          const elementsAtBottom: Array<{element: Element, rect: DOMRect, zIndex: string, tag: string}> = [];
          const allElements = document.elementsFromPoint(wrapperRect.left + wrapperRect.width / 2, wrapperRect.bottom - 5);
          allElements.forEach((el, idx) => {
            if (el !== wrapper && el !== table) {
              const rect = el.getBoundingClientRect();
              const style = window.getComputedStyle(el);
              if (rect.bottom >= scrollbarTop && rect.top <= scrollbarBottom) {
                elementsAtBottom.push({
                  element: el,
                  rect: rect,
                  zIndex: style.zIndex,
                  tag: el.tagName + (el.className ? '.' + el.className.split(' ')[0] : '')
                });
              }
            }
          });
          
          // Check if scrollbar is actually rendered and visible
          // Try to detect scrollbar using various methods
          let scrollbarDetected = false;
          let scrollbarActualHeight = 0;
          
          // Method 1: Check if scrollbar takes up space (scrollHeight vs clientHeight for horizontal)
          const hasHorizontalScrollbar = wrapper.scrollWidth > wrapper.clientWidth;
          
          // Method 2: Check computed scrollbar width
          const scrollbarWidthValue = computedStyle.scrollbarWidth;
          const hasScrollbarWidth = scrollbarWidthValue && scrollbarWidthValue !== 'none' && scrollbarWidthValue !== '0px';
          
          // Method 3: Check if wrapper bottom is within viewport
          const wrapperBottomInViewport = wrapperRect.bottom <= window.innerHeight && wrapperRect.bottom >= 0;
          
          // Method 4: Check if there's a visual scrollbar by checking scrollbar area
          // For webkit browsers, we can't directly query pseudo-elements, but we can infer
          const scrollbarAreaHeight = wrapper.scrollHeight > wrapper.clientHeight ? 18 : 0;
          
          scrollbarDetected = hasHorizontalScrollbar && computedStyle.overflowX === 'auto' && wrapperBottomInViewport;
          scrollbarActualHeight = scrollbarDetected ? 18 : 0;
          
          // CRITICAL FIX: Force max-height to 100% if it has calc()
          // This overrides any CSS or inline styles that might be setting calc(100% - 18px)
          if (computedStyle.maxHeight && computedStyle.maxHeight.includes('calc')) {
            wrapper.style.setProperty('max-height', '100%', 'important');
            // Re-read computed style after fix
            const fixedStyle = window.getComputedStyle(wrapper);
            // Fixed max-height
          }
          
          // Also ensure height fills parent if wrapper is smaller
          if (parentRect && wrapperRect.height < parentRect.height - 2) {
            wrapper.style.setProperty('height', '100%', 'important');
            // Fixed height to 100%
          }
          
          // Re-read styles after potential fixes
          const finalComputedStyle = window.getComputedStyle(wrapper);
          const finalRect = wrapper.getBoundingClientRect();
          
          // Debug info collection removed for production
        }
      };
      
      // Check immediately and after delays
      checkScrollbar();
      const t1 = setTimeout(checkScrollbar, 100);
      const t2 = setTimeout(checkScrollbar, 500);
      const t3 = setTimeout(checkScrollbar, 1000);
      const t4 = setTimeout(checkScrollbar, 2000);
      
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
        clearTimeout(t4);
      };
    }
  }, [displayedHeaders.length, showAll]);

  // CRITICAL: Continuously monitor and fix maxHeight/height issues
  useEffect(() => {
    if (!tableWrapperRef.current) return;
    
    const fixWrapperStyles = () => {
      const wrapper = tableWrapperRef.current;
      if (!wrapper) return;
      
      const computedStyle = window.getComputedStyle(wrapper);
      const parentRect = wrapper.parentElement?.getBoundingClientRect();
      const wrapperRect = wrapper.getBoundingClientRect();
      
      let fixed = false;
      
      // Force fix max-height if it has calc()
      if (computedStyle.maxHeight && computedStyle.maxHeight.includes('calc')) {
        wrapper.style.setProperty('max-height', '100%', 'important');
        fixed = true;
      }
      
      // Force fix height if wrapper is smaller than parent
      if (parentRect && wrapperRect.height < parentRect.height - 2) {
        wrapper.style.setProperty('height', '100%', 'important');
        fixed = true;
      }
      
      if (fixed) {
        // Continuous fix applied
      }
    };
    
    // Fix immediately and continuously every 100ms
    fixWrapperStyles();
    const interval = setInterval(fixWrapperStyles, 100);
    
    return () => clearInterval(interval);
  }, [tableWrapperRef.current, showAll]);

  // CRITICAL: Continuously monitor and fix maxHeight calc() issue
  useEffect(() => {
    if (!tableWrapperRef.current) return;
    
    const fixMaxHeight = () => {
      const wrapper = tableWrapperRef.current;
      if (!wrapper) return;
      
      const computedStyle = window.getComputedStyle(wrapper);
      const parentRect = wrapper.parentElement?.getBoundingClientRect();
      const wrapperRect = wrapper.getBoundingClientRect();
      
      // Force fix max-height if it has calc()
      if (computedStyle.maxHeight && computedStyle.maxHeight.includes('calc')) {
        wrapper.style.setProperty('max-height', '100%', 'important');
        // Fixed max-height
      }
      
      // Force fix height if wrapper is smaller than parent
      if (parentRect && wrapperRect.height < parentRect.height - 2) {
        wrapper.style.setProperty('height', '100%', 'important');
        // Fixed height
      }
    };
    
    // Fix immediately and continuously
    fixMaxHeight();
    const interval = setInterval(fixMaxHeight, 100); // Check every 100ms
    
    return () => clearInterval(interval);
  }, [tableWrapperRef.current, showAll]);

  // CRITICAL: Constrain wrapper to viewport to prevent overflow and ensure scrollbar visibility
  useEffect(() => {
    if (!tableWrapperRef.current) return;
    
    const constrainWrapper = () => {
      const wrapper = tableWrapperRef.current;
      if (!wrapper) return;
      
      const parent = wrapper.parentElement;
      if (!parent) return;
      
      const parentRect = parent.getBoundingClientRect();
      const wrapperRect = wrapper.getBoundingClientRect();
      const windowBottom = window.innerHeight;
      const wrapperBottom = wrapperRect.bottom;
      
      // CRITICAL: If wrapper extends beyond viewport, constrain it
      // Otherwise, fill parent height to maximize space usage
      if (wrapperBottom > windowBottom - 2) {
        // Constrain to viewport with 2px buffer for scrollbar
        const maxAllowedHeight = windowBottom - wrapperRect.top - 2;
        const constrainedHeight = Math.min(parentRect.height, maxAllowedHeight);
        wrapper.style.setProperty('max-height', `${constrainedHeight}px`, 'important');
        wrapper.style.setProperty('height', `${constrainedHeight}px`, 'important');
      } else {
        // Fill parent height exactly to maximize space
        wrapper.style.setProperty('max-height', `${parentRect.height}px`, 'important');
        wrapper.style.setProperty('height', `${parentRect.height}px`, 'important');
        wrapper.style.setProperty('min-height', `${parentRect.height}px`, 'important');
      }
    };
    
    // Use ResizeObserver to monitor both parent and wrapper
    const parent = tableWrapperRef.current.parentElement;
    if (!parent) return;
    
    const resizeObserver = new ResizeObserver(constrainWrapper);
    resizeObserver.observe(parent);
    resizeObserver.observe(tableWrapperRef.current);
    
    // Also check on window resize
    window.addEventListener('resize', constrainWrapper);
    
    // Initial check with slight delay to ensure DOM is ready
    const timeoutId = setTimeout(constrainWrapper, 10);
    
    return () => {
      clearTimeout(timeoutId);
      resizeObserver.disconnect();
      window.removeEventListener('resize', constrainWrapper);
    };
  }, [showAll]);

  // ArrivalsTable rendering complete
  // Debug info calculation removed for production

  return (
    <div 
      className="flex flex-col h-full w-full" 
      ref={(el) => {
        tableContainerRef.current = el;
        // CRITICAL: Force height to 100% via direct DOM manipulation
        if (el) {
          const parent = el.parentElement;
          if (parent) {
            const parentRect = parent.getBoundingClientRect();
            const targetHeight = parentRect.height;
            
            // Set min-height FIRST to force expansion
            el.style.setProperty('min-height', `${targetHeight}px`, 'important');
            el.style.setProperty('height', `${targetHeight}px`, 'important');
            el.style.setProperty('max-height', `${targetHeight}px`, 'important');
            
            // Use ResizeObserver to maintain height
            const resizeObserver = new ResizeObserver(() => {
              if (el && parent) {
                const newParentRect = parent.getBoundingClientRect();
                const currentRect = el.getBoundingClientRect();
                if (Math.abs(currentRect.height - newParentRect.height) > 5) {
                  el.style.setProperty('min-height', `${newParentRect.height}px`, 'important');
                  el.style.setProperty('height', `${newParentRect.height}px`, 'important');
                }
              }
            });
            resizeObserver.observe(parent);
            resizeObserver.observe(el);
          } else {
            // Fallback if parent not available
            el.style.setProperty('height', '100%', 'important');
            el.style.setProperty('max-height', '100%', 'important');
            el.style.setProperty('min-height', '100%', 'important');
          }
        }
      }}
      style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', minHeight: '100%', flex: '1 1 0%', boxSizing: 'border-box' }}
    >
      <div 
        className="rounded-2xl border border-[#e5e7eb] bg-white h-full w-full flex flex-col overflow-hidden" 
        style={{ 
          height: '100%', 
          width: '100%', 
          maxHeight: '100%', 
          display: 'flex', 
          flexDirection: 'column', 
          minHeight: 0, 
          flex: '1 1 0%', 
          boxSizing: 'border-box', 
          position: 'relative', 
          padding: 0, 
          margin: 0,
          overflow: 'hidden' // CRITICAL: Prevent any overflow
        }}
        ref={(el) => {
          // Ensure this container doesn't extend beyond its parent
          if (el) {
            const parent = el.parentElement;
            if (parent) {
              const resizeObserver = new ResizeObserver(() => {
                if (el && parent) {
                  const parentRect = parent.getBoundingClientRect();
                  const currentRect = el.getBoundingClientRect();
                  // Constrain to parent height
                  if (currentRect.height > parentRect.height) {
                    el.style.setProperty('height', `${parentRect.height}px`, 'important');
                    el.style.setProperty('max-height', `${parentRect.height}px`, 'important');
                  }
                }
              });
              resizeObserver.observe(parent);
              resizeObserver.observe(el);
            }
          }
        }}
      >
        {/* Table wrapper with horizontal scrolling */}
        <div 
          ref={(el) => {
            tableWrapperRef.current = el;
            // CRITICAL: Force max-height and height via direct DOM manipulation
            // This overrides any CSS or React inline styles that might set calc()
            if (el) {
              const parent = el.parentElement;
              if (parent) {
                const parentRect = parent.getBoundingClientRect();
                const targetHeight = parentRect.height;
                
                // Set height to match parent exactly to prevent overflow
                el.style.setProperty('max-height', `${targetHeight}px`, 'important');
                el.style.setProperty('height', `${targetHeight}px`, 'important');
                el.style.setProperty('min-height', '0', 'important');
                
                // Use ResizeObserver to maintain height and prevent overflow
                const resizeObserver = new ResizeObserver(() => {
                  if (el && parent) {
                    const newParentRect = parent.getBoundingClientRect();
                    const currentRect = el.getBoundingClientRect();
                    const windowBottom = window.innerHeight;
                    const wrapperBottom = currentRect.bottom;
                    
                    // CRITICAL: Constrain wrapper to fit within viewport
                    // If wrapper extends beyond viewport, reduce its height
                    if (wrapperBottom > windowBottom - 2) {
                      const maxAllowedHeight = windowBottom - currentRect.top - 2; // 2px buffer
                      const constrainedHeight = Math.min(newParentRect.height, maxAllowedHeight);
                      el.style.setProperty('max-height', `${constrainedHeight}px`, 'important');
                      el.style.setProperty('height', `${constrainedHeight}px`, 'important');
                    } else {
                      // Otherwise, match parent height exactly
                      el.style.setProperty('max-height', `${newParentRect.height}px`, 'important');
                      el.style.setProperty('height', `${newParentRect.height}px`, 'important');
                    }
                  }
                });
                resizeObserver.observe(parent);
                resizeObserver.observe(el);
                
                // Also check on window resize
                const handleWindowResize = () => {
                  if (el && parent) {
                    const parentRect = parent.getBoundingClientRect();
                    const currentRect = el.getBoundingClientRect();
                    const windowBottom = window.innerHeight;
                    if (currentRect.bottom > windowBottom - 2) {
                      const maxAllowedHeight = windowBottom - currentRect.top - 2;
                      el.style.setProperty('max-height', `${maxAllowedHeight}px`, 'important');
                      el.style.setProperty('height', `${maxAllowedHeight}px`, 'important');
                    }
                  }
                };
                window.addEventListener('resize', handleWindowResize);
                
                // Cleanup
                return () => {
                  resizeObserver.disconnect();
                  window.removeEventListener('resize', handleWindowResize);
                };
              } else {
                el.style.setProperty('max-height', '100%', 'important');
                el.style.setProperty('height', '100%', 'important');
              }
            }
          }}
          className="w-full custom-horizontal-scrollbar"
          style={{ 
            scrollbarWidth: 'thin',
            scrollbarColor: '#cbd5e1 #f1f5f9',
            minHeight: 0,
            position: 'relative',
            WebkitOverflowScrolling: 'touch',
            overflowX: 'auto',
            overflowY: showAll ? 'auto' : 'hidden',
            height: '100%',
            width: '100%',
            maxWidth: '100%',
            boxSizing: 'border-box',
            flex: '1 1 0%',
            zIndex: 10,
            paddingBottom: '0px',
            marginBottom: '0px',
            scrollbarGutter: 'stable',
            // Ensure scrollbar is always visible when content overflows
            msOverflowStyle: 'scrollbar',
          } as React.CSSProperties}
          onScroll={(e) => {
            // Scrollbar interaction - details shown in debug panel
          }}
        >
          <table 
            ref={tableRef}
            className="border-collapse"
            style={{ 
              width: 'max-content',
              minWidth: '100%',
              tableLayout: 'auto',
              display: 'table',
              borderSpacing: 0,
              // Ensure table expands to show all columns
              whiteSpace: 'nowrap',
            }}
          >
            <thead ref={headerRef} className="bg-[#f3f4f6] sticky top-0 z-10">
              <tr className="text-left text-[12px] text-[#111827]">
                {displayedHeaders.map((col) => {
                  const isDragging = draggedColumn === col;
                  const isDragOver = dragOverColumn === col && !isDragging;
                  const isHighlighted = highlightedColumns.includes(col);
                  
                  return (
                    <th
                      key={col}
                      draggable={!!onColumnOrderChange}
                      onDragStart={() => handleDragStart(col)}
                      onDragOver={(e) => handleDragOver(e, col)}
                      onDragLeave={handleDragLeave}
                      onDragEnd={handleDragEnd}
                      style={{
                        height: 'var(--height-h-10, 40px)',
                        minWidth: '85px',
                        width: '201px',
                        padding: '0 var(--spacing-2, 8px)',
                        borderBottom: 'var(--border-width-border, 1px) solid var(--base-border, #E6EAF0)',
                        background: 'var(--base-muted, #F1F3F7)',
                        verticalAlign: 'middle',
                        textAlign: 'left',
                      }}
                      className={`font-medium whitespace-nowrap relative ${
                        isDragging
                          ? 'opacity-50 cursor-grabbing'
                          : isDragOver
                            ? 'bg-[#ede9fe] border-l-4 border-[#7c3aed] cursor-grabbing'
                            : isHighlighted
                              ? 'bg-yellow-100 animate-pulse'
                              : onColumnOrderChange
                                ? 'cursor-move hover:bg-gray-200 transition-colors'
                                : ''
                      }`}
                    >
                          <span className="capitalize">{col.replace(/_/g, " ")}</span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {displayedRows.length > 0 ? (
                displayedRows.map((row, idx) => (
                  <tr
                    key={row.id || row.email || idx}
                    ref={idx === 0 ? firstRowRef : null}
                    className="border-t border-[#e5e7eb] text-[12px] text-[#111827] hover:bg-gray-50 transition-colors"
                  >
                    {displayedHeaders.map((col) => (
                      <td 
                        key={col} 
                        style={{
                          height: '53px',
                          minWidth: '85px',
                          width: '201px',
                          padding: 'var(--spacing-2, 8px)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          verticalAlign: 'middle',
                        }}
                      >
                        {row[col] || ""}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={displayedHeaders.length}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    No data loaded. Click "Load Attendee Data" to fetch.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

