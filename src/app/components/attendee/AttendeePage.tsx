// INSIGHTS-SPECIFIC: Attendee page component
"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import InsightsAttendeeTable from "./AttendeeTable";
import { Toast, useToast } from "@/components/ui/toast";
import { InsightsPickColumnsPanel } from "./PickColumnsPanel";
import { useInsightsUI } from "@/app/lib/insights/ui-store";
import { Upload, Search, ChevronLeft, Columns3, User, FileDown, LockKeyhole, CheckCircle2, Users } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { apiFetch, getGraphQLUrl } from "@/app/utils/api";
import { logger } from "@/app/lib/logger";

function Input({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50" />;
}

type Attendee = Record<string, any>;

export default function InsightsAttendeePage() {
  const { aimeOpen, setPickColumnsOpen, setAimeOpen, setPickColumnsData, aimeAction, setAimeAction, eventId, setEventId, setExportState } = useInsightsUI();
  
  // Store setExportState in a ref to ensure it's stable
  const setExportStateRef = useRef(setExportState);
  useEffect(() => {
    setExportStateRef.current = setExportState;
  }, [setExportState]);
  const router = useRouter();
  const params = useParams();
  const [eventIdNotFound, setEventIdNotFound] = useState(false);
  const [eventIdInitialized, setEventIdInitialized] = useState(false);
  const DEFAULT_EVENT_ID = 5281;
  
  // Extract eventId from URL path parameter
  useEffect(() => {
    const urlEventId = params?.eventId as string | undefined;
    
    if (urlEventId) {
      const parsedEventId = parseInt(urlEventId, 10);
      if (!isNaN(parsedEventId) && parsedEventId > 0) {
        // Valid eventId - reset 404 state and update eventId
        setEventIdNotFound(false);
        // Only update if eventId actually changed
        if (eventId !== parsedEventId) {
          setEventId(parsedEventId);
        }
        setEventIdInitialized(true);
      } else {
        // Invalid eventId in URL - show 404
        setEventIdNotFound(true);
        setEventIdInitialized(true);
      }
    } else {
      // No eventId in URL - redirect to include default eventId (only on initial mount)
      if (!eventIdInitialized) {
        router.replace(`/insights/attendee/${DEFAULT_EVENT_ID}`);
        setEventId(DEFAULT_EVENT_ID);
        setEventIdInitialized(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);
  const [rows, setRows] = useState<Attendee[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [columnTypes, setColumnTypes] = useState<Record<string, string>>({});
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchStatus, setFetchStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [retryCount, setRetryCount] = useState(0);
  const [fetchMessage, setFetchMessage] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [exportStatus, setExportStatus] = useState<"idle" | "exporting" | "error" | "success">("idle");
  const [exportProgress, setExportProgress] = useState(0);
  const [exportMessage, setExportMessage] = useState("");
  const [showExportSuccess, setShowExportSuccess] = useState(false);
  const [visibleRowCount, setVisibleRowCount] = useState<number>(0);
  const [commandError, setCommandError] = useState<string | null>(null);
  const [globalSearchQuery, setGlobalSearchQuery] = useState<string>("");
  const [columnOrderHistory, setColumnOrderHistory] = useState<string[][]>([]); // For undo functionality
  const [highlightedColumns, setHighlightedColumns] = useState<string[]>([]); // For visual feedback
  const [lastReorderAction, setLastReorderAction] = useState<{ type: string; columns: string[] } | null>(null); // For undo
  const { toast, showToast, dismissToast } = useToast();

  // Helper function to calculate Levenshtein distance for fuzzy matching
  const levenshteinDistance = (str1: string, str2: string): number => {
    const matrix: number[][] = [];
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[str2.length][str1.length];
  };

  // Helper function to find close matches for column names
  const findCloseMatches = (columnName: string, availableColumns: string[]): string[] => {
    const normalized = columnName.toLowerCase().replace(/_/g, " ");
    const matches: Array<{ column: string; distance: number }> = [];
    
    availableColumns.forEach(col => {
      const colNormalized = col.toLowerCase().replace(/_/g, " ");
      const distance = levenshteinDistance(normalized, colNormalized);
      // Also check if column name contains the search term or vice versa
      const containsMatch = colNormalized.includes(normalized) || normalized.includes(colNormalized);
      if (distance <= 3 || containsMatch) {
        matches.push({ column: col, distance });
      }
    });
    
    return matches
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3)
      .map(m => m.column.replace(/_/g, " "));
  };

  // Helper function to validate column exists
  const validateColumn = (columnName: string, availableColumns: string[]): boolean => {
    return availableColumns.includes(columnName);
  };

  // Helper function to get available columns (selected or all)
  const getAvailableColumns = (): string[] => {
    return selectedColumns.length > 0 ? selectedColumns : columns;
  };

  // Load column order from localStorage on mount
  useEffect(() => {
    try {
      const savedOrder = localStorage.getItem('attendeeColumnOrder');
      if (savedOrder) {
        const parsed = JSON.parse(savedOrder);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSelectedColumns(parsed);
        }
      }
    } catch (e) {
      logger.error('Failed to load column order from localStorage:', e);
    }
  }, []);

  // Save column order to localStorage when it changes
  useEffect(() => {
    if (selectedColumns.length > 0) {
      try {
        localStorage.setItem('attendeeColumnOrder', JSON.stringify(selectedColumns));
      } catch (e) {
        logger.error('Failed to save column order to localStorage:', e);
      }
    }
  }, [selectedColumns]);

  // Handle AIME actions
  useEffect(() => {
    if (!aimeAction) return;

    // Clear any previous errors
    setCommandError(null);

    switch (aimeAction.type) {
      case "reorder_column": {
        const { column, position, afterColumn, beforeColumn } = aimeAction;
        const availableCols = getAvailableColumns();
        
        // Validate column exists
        if (!validateColumn(column, availableCols)) {
          const suggestions = findCloseMatches(column, availableCols);
          const errorMsg = suggestions.length > 0
            ? `Column "${column.replace(/_/g, " ")}" not found. Did you mean: ${suggestions.join(", ")}?`
            : `Column "${column.replace(/_/g, " ")}" not found. Available columns: ${availableCols.slice(0, 5).map(c => c.replace(/_/g, " ")).join(", ")}${availableCols.length > 5 ? "..." : ""}`;
          setCommandError(errorMsg);
          setAimeAction(null);
          return;
        }

        setSelectedColumns((prev) => {
          const newCols = prev.length > 0 ? [...prev] : [...availableCols];
          const colIndex = newCols.indexOf(column);
          if (colIndex === -1) return prev;

          // Calculate target index
          let targetIndex = -1;
          if (position === 0) {
            targetIndex = 0;
          } else if (position === -1) {
            targetIndex = newCols.length - 1;
          } else if (afterColumn) {
            const afterIndex = newCols.indexOf(afterColumn);
            if (afterIndex !== -1) {
              targetIndex = afterIndex + 1;
            } else {
              // Target column not found, push to end
              targetIndex = newCols.length;
            }
          } else if (beforeColumn) {
            const beforeIndex = newCols.indexOf(beforeColumn);
            if (beforeIndex !== -1) {
              targetIndex = beforeIndex;
            } else {
              // Target column not found, push to front
              targetIndex = 0;
            }
          } else if (aimeAction.index !== undefined) {
            targetIndex = Math.max(0, Math.min(aimeAction.index, newCols.length));
          }

          // Check if already in requested position
          if (targetIndex !== -1 && colIndex === targetIndex) {
            // Column already in position - acknowledge but don't change
            setCommandError(`The "${column.replace(/_/g, " ")}" column is already in that position.`);
            setAimeAction(null);
            return prev;
          }

          // Save current state to history for undo
          setColumnOrderHistory(prevHistory => [...prevHistory, [...prev]]);
          setLastReorderAction({ type: "reorder", columns: [column, afterColumn || beforeColumn || ""].filter(Boolean) });

          // Perform reorder
          newCols.splice(colIndex, 1);
          if (position === 0) {
            newCols.unshift(column);
            targetIndex = 0;
          } else if (position === -1) {
            newCols.push(column);
            targetIndex = newCols.length - 1;
          } else if (afterColumn) {
            const afterIndex = newCols.indexOf(afterColumn);
            if (afterIndex !== -1) {
              newCols.splice(afterIndex + 1, 0, column);
              targetIndex = afterIndex + 1;
            } else {
              newCols.push(column);
              targetIndex = newCols.length - 1;
            }
          } else if (beforeColumn) {
            const beforeIndex = newCols.indexOf(beforeColumn);
            if (beforeIndex !== -1) {
              newCols.splice(beforeIndex, 0, column);
              targetIndex = beforeIndex;
            } else {
              newCols.unshift(column);
              targetIndex = 0;
            }
          } else if (aimeAction.index !== undefined) {
            const safeIndex = Math.max(0, Math.min(aimeAction.index, newCols.length));
            newCols.splice(safeIndex, 0, column);
            targetIndex = safeIndex;
          }

          // Highlight moved columns
          const columnsToHighlight = [column, afterColumn || beforeColumn || ""].filter(Boolean);
          setHighlightedColumns(columnsToHighlight);
          setTimeout(() => setHighlightedColumns([]), 2000);

          // Show toast with undo option
          const undoAction = () => {
            if (columnOrderHistory.length > 0) {
              const previousOrder = columnOrderHistory[columnOrderHistory.length - 1];
              setColumnOrderHistory(prev => prev.slice(0, -1));
              setSelectedColumns(previousOrder);
              setLastReorderAction(null);
            }
          };
          showToast(`Column "${column.replace(/_/g, " ")}" moved successfully.`, undoAction);

          return newCols;
        });
        break;
      }
      case "filter": {
        setFilters((prev) => ({
          ...prev,
          [aimeAction.column]: aimeAction.value,
        }));
        break;
      }
      case "clear_filter": {
        if (aimeAction.column) {
          setFilters((prev) => {
            const newFilters = { ...prev };
            delete newFilters[aimeAction.column!];
            return newFilters;
          });
        } else {
          setFilters({});
        }
        break;
      }
      case "sort": {
        const availableCols = getAvailableColumns();
        if (!validateColumn(aimeAction.column, availableCols)) {
          setCommandError(
            `Column "${aimeAction.column.replace(/_/g, " ")}" is not available. Available columns: ${availableCols.slice(0, 5).map(c => c.replace(/_/g, " ")).join(", ")}${availableCols.length > 5 ? "..." : ""}`
          );
          // Clear the action to prevent retry
          setAimeAction(null);
          return;
        }
        setSortColumn(aimeAction.column);
        setSortDirection(aimeAction.direction);
        break;
      }
      case "clear_sort": {
        setSortColumn(null);
        setSortDirection("asc");
        break;
      }
      case "reset_columns": {
        setSelectedColumns([]);
        break;
      }
      case "remove_column": {
        setSelectedColumns((prev) => {
          const current = prev.length > 0 ? prev : columns;
          return current.filter(c => c !== aimeAction.column);
        });
        break;
      }
      case "swap_columns": {
        const { column1, column2 } = aimeAction;
        const availableCols = getAvailableColumns();
        
        // Validate both columns exist
        if (!validateColumn(column1, availableCols)) {
          const suggestions = findCloseMatches(column1, availableCols);
          setCommandError(suggestions.length > 0
            ? `Column "${column1.replace(/_/g, " ")}" not found. Did you mean: ${suggestions.join(", ")}?`
            : `Column "${column1.replace(/_/g, " ")}" not found.`);
          setAimeAction(null);
          return;
        }
        if (!validateColumn(column2, availableCols)) {
          const suggestions = findCloseMatches(column2, availableCols);
          setCommandError(suggestions.length > 0
            ? `Column "${column2.replace(/_/g, " ")}" not found. Did you mean: ${suggestions.join(", ")}?`
            : `Column "${column2.replace(/_/g, " ")}" not found.`);
          setAimeAction(null);
          return;
        }

        setSelectedColumns((prev) => {
          const newCols = prev.length > 0 ? [...prev] : [...availableCols];
          const idx1 = newCols.indexOf(column1);
          const idx2 = newCols.indexOf(column2);
          
          if (idx1 !== -1 && idx2 !== -1 && idx1 !== idx2) {
            // Save to history for undo
            setColumnOrderHistory(prevHistory => [...prevHistory, [...prev]]);
            setLastReorderAction({ type: "swap", columns: [column1, column2] });
            
            // Swap columns
            [newCols[idx1], newCols[idx2]] = [newCols[idx2], newCols[idx1]];
            
            // Highlight swapped columns
            setHighlightedColumns([column1, column2]);
            setTimeout(() => setHighlightedColumns([]), 2000);
            
            // Show toast with undo option
            const undoAction = () => {
              if (columnOrderHistory.length > 0) {
                const previousOrder = columnOrderHistory[columnOrderHistory.length - 1];
                setColumnOrderHistory(prev => prev.slice(0, -1));
                setSelectedColumns(previousOrder);
                setLastReorderAction(null);
              }
            };
            showToast(`Swapped "${column1.replace(/_/g, " ")}" and "${column2.replace(/_/g, " ")}" columns.`, undoAction);
            
            return newCols;
          }
          return prev;
        });
        break;
      }
      case "list_columns": {
        const currentOrder = getAvailableColumns();
        const formattedList = currentOrder.map((col, idx) => 
          `${idx + 1}. ${col.replace(/_/g, " ")}`
        ).join(", ");
        // Show as informational message, not error
        showToast(`Current column order: ${formattedList}`);
        setAimeAction(null);
        return;
      }
      case "undo_column_reorder": {
        if (columnOrderHistory.length > 0) {
          const previousOrder = columnOrderHistory[columnOrderHistory.length - 1];
          setColumnOrderHistory(prev => prev.slice(0, -1));
          setSelectedColumns(previousOrder);
          setLastReorderAction(null);
          setCommandError("Column order has been restored to the previous state.");
        } else {
          setCommandError("No previous column order to restore.");
        }
        setAimeAction(null);
        return;
      }
      case "error": {
        setCommandError(aimeAction.message);
        setAimeAction(null);
        return;
      }
    }

    // Clear the action after processing
    setAimeAction(null);
  }, [aimeAction, setAimeAction, columns]);


  // Apply filters, global search, and sorting to rows
  const processedRows = useMemo(() => {
    let result = [...rows];

    // Apply filters
    Object.entries(filters).forEach(([column, value]) => {
      if (value.trim()) {
        result = result.filter(row => {
          const cellValue = String(row[column] || "").toLowerCase();
          return cellValue.includes(value.toLowerCase());
        });
      }
    });

    // Apply global search across all columns
    if (globalSearchQuery.trim()) {
      const searchLower = globalSearchQuery.toLowerCase();
      result = result.filter(row => {
        // Search across all columns in the row
        return Object.values(row).some(cellValue => {
          if (cellValue == null) return false;
          return String(cellValue).toLowerCase().includes(searchLower);
        });
      });
    }

    // Apply sorting
    if (sortColumn) {
      result.sort((a, b) => {
        const aVal = a[sortColumn];
        const bVal = b[sortColumn];

        // Handle null/undefined
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return 1;
        if (bVal == null) return -1;

        // Compare values
        let comparison = 0;
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          comparison = aVal - bVal;
        } else {
          comparison = String(aVal).localeCompare(String(bVal));
        }

        return sortDirection === "asc" ? comparison : -comparison;
      });
    }

    return result;
  }, [rows, filters, globalSearchQuery, sortColumn, sortDirection]);

  // Pass all processed rows to table - it will handle viewport height limiting
  const displayedRows = processedRows;
  // Always show all columns from the dataset if selectedColumns is empty
  const displayedColumns = selectedColumns.length > 0 ? selectedColumns : (columns.length > 0 ? columns : []);
  
  // Ref for hide bar overlay
  const hideBarOverlayRef = useRef<HTMLDivElement>(null);
  
  const mainContainerRef = useRef<HTMLDivElement>(null);
  const tableAreaRef = useRef<HTMLDivElement>(null);
  
  // Debug info removed for production
  

  // CRITICAL: Continuously monitor and fix wrapper div heights
  const wrapperDivRef = useRef<HTMLDivElement | null>(null);
  const innerWrapperDivRef = useRef<HTMLDivElement | null>(null);
  
  
  // CRITICAL: Table height enforcement - runs continuously regardless of state
  useEffect(() => {
    const targetTableHeight = 960;
    
    const fixWrapperHeights = () => {
      // First, ensure main container allows enough space
      if (mainContainerRef.current) {
        const mainEl = mainContainerRef.current;
        // Ensure main container is at least 960px + header space
        // Header is approximately 120px, so we need at least 1080px total
        // But we'll set it to allow the table to be 960px
        mainEl.style.setProperty('min-height', '960px', 'important');
        mainEl.style.setProperty('display', 'flex', 'important');
        mainEl.style.setProperty('flex-direction', 'column', 'important');
      }
      
      // Fix outer wrapper div (table wrapper) - ALWAYS 960px
      if (wrapperDivRef.current) {
        const el = wrapperDivRef.current;
        
        // Force height immediately
        el.style.setProperty('height', `${targetTableHeight}px`, 'important');
        el.style.setProperty('max-height', `${targetTableHeight}px`, 'important');
        el.style.setProperty('min-height', `${targetTableHeight}px`, 'important');
        
        // Also ensure parent allows this height
        const parent = el.parentElement;
        if (parent) {
          parent.style.setProperty('min-height', `${targetTableHeight}px`, 'important');
          parent.style.setProperty('height', 'auto', 'important');
          parent.style.setProperty('display', 'flex', 'important');
          parent.style.setProperty('flex-direction', 'column', 'important');
          parent.style.setProperty('flex', '1 1 0%', 'important');
        }
        
        // Verify height matches - if not, force again
        const wrapperRect = el.getBoundingClientRect();
        if (Math.abs(wrapperRect.height - targetTableHeight) > 1) {
          el.style.setProperty('height', `${targetTableHeight}px`, 'important');
          el.style.setProperty('max-height', `${targetTableHeight}px`, 'important');
          el.style.setProperty('min-height', `${targetTableHeight}px`, 'important');
        }
      }
      
      // Fix inner wrapper div - should fill the 960px wrapper
      if (innerWrapperDivRef.current) {
        const el = innerWrapperDivRef.current;
        const targetHeight = targetTableHeight; // Use fixed 960px
        
        // ALWAYS enforce 960px height - execute unconditionally
        el.style.setProperty('min-height', `${targetHeight}px`, 'important');
        el.style.setProperty('height', `${targetHeight}px`, 'important');
        el.style.setProperty('max-height', `${targetHeight}px`, 'important');
        
        // Remove all constraints
        el.style.setProperty('padding-top', '0', 'important');
        el.style.setProperty('padding-bottom', '0', 'important');
        el.style.setProperty('margin-top', '0', 'important');
        el.style.setProperty('margin-bottom', '0', 'important');
        
        // Force flex to fill
        el.style.setProperty('flex', '1 1 0%', 'important');
        el.style.setProperty('display', 'flex', 'important');
        el.style.setProperty('box-sizing', 'border-box', 'important');
        
        // Verify height
        const innerRect = el.getBoundingClientRect();
        if (Math.abs(innerRect.height - targetHeight) > 1) {
          el.style.setProperty('min-height', `${targetHeight}px`, 'important');
          el.style.setProperty('height', `${targetHeight}px`, 'important');
          el.style.setProperty('max-height', `${targetHeight}px`, 'important');
        }
      }
    };
    
    // Fix immediately
    fixWrapperHeights();
    
    // Use requestAnimationFrame for immediate enforcement after render
    const rafEnforce = () => {
      requestAnimationFrame(() => {
        fixWrapperHeights();
        requestAnimationFrame(() => {
          fixWrapperHeights();
        });
      });
    };
    rafEnforce();
    
    // Multiple timeouts to ensure refs are set
    const timeouts: NodeJS.Timeout[] = [];
    for (let i = 0; i <= 2000; i += 50) {
      timeouts.push(setTimeout(fixWrapperHeights, i));
    }
    
    // Continuous enforcement every 25ms
    const interval = setInterval(fixWrapperHeights, 25);
    
    // Use ResizeObserver to monitor and enforce height changes
    const resizeObserver = new ResizeObserver(() => {
      fixWrapperHeights();
    });
    
    // Use MutationObserver to watch for style/attribute changes and re-enforce
    const mutationObserver = new MutationObserver((mutations) => {
      let shouldEnforce = false;
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes') {
          const target = mutation.target as HTMLElement;
          if (target === wrapperDivRef.current || 
              target === innerWrapperDivRef.current ||
              (wrapperDivRef.current && target.contains(wrapperDivRef.current)) ||
              (innerWrapperDivRef.current && target.contains(innerWrapperDivRef.current))) {
            shouldEnforce = true;
          }
        }
      });
      if (shouldEnforce) {
        fixWrapperHeights();
      }
    });
    
    // Set up observers
    const setupObservers = () => {
      if (wrapperDivRef.current) {
        resizeObserver.observe(wrapperDivRef.current);
        mutationObserver.observe(wrapperDivRef.current, {
          attributes: true,
          attributeFilter: ['style', 'class'],
          subtree: false
        });
        // Also observe parent
        if (wrapperDivRef.current.parentElement) {
          resizeObserver.observe(wrapperDivRef.current.parentElement);
          mutationObserver.observe(wrapperDivRef.current.parentElement, {
            attributes: true,
            attributeFilter: ['style', 'class'],
            subtree: false
          });
        }
      }
      if (innerWrapperDivRef.current) {
        resizeObserver.observe(innerWrapperDivRef.current);
        mutationObserver.observe(innerWrapperDivRef.current, {
          attributes: true,
          attributeFilter: ['style', 'class'],
          subtree: false
        });
      }
    };
    
    setupObservers();
    setTimeout(setupObservers, 0);
    setTimeout(setupObservers, 100);
    setTimeout(setupObservers, 300);
    setTimeout(setupObservers, 500);
    setTimeout(setupObservers, 1000);
    
    // Also enforce on window focus and visibility change
    const handleFocus = () => {
      fixWrapperHeights();
      setTimeout(fixWrapperHeights, 50);
      setTimeout(fixWrapperHeights, 100);
    };
    window.addEventListener('focus', handleFocus);
    
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fixWrapperHeights();
        setTimeout(fixWrapperHeights, 50);
        setTimeout(fixWrapperHeights, 100);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout));
      clearInterval(interval);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []); // Run once on mount - enforcement runs continuously regardless of state
  
  // Additional enforcement when AIME state changes (as backup)
  useEffect(() => {
    const targetTableHeight = 960;
    
    const enforceTableHeight = () => {
      if (wrapperDivRef.current) {
        wrapperDivRef.current.style.setProperty('height', `${targetTableHeight}px`, 'important');
        wrapperDivRef.current.style.setProperty('max-height', `${targetTableHeight}px`, 'important');
        wrapperDivRef.current.style.setProperty('min-height', `${targetTableHeight}px`, 'important');
      }
      if (innerWrapperDivRef.current) {
        innerWrapperDivRef.current.style.setProperty('height', `${targetTableHeight}px`, 'important');
        innerWrapperDivRef.current.style.setProperty('max-height', `${targetTableHeight}px`, 'important');
        innerWrapperDivRef.current.style.setProperty('min-height', `${targetTableHeight}px`, 'important');
      }
    };
    
    // Enforce immediately and after delays
    enforceTableHeight();
    setTimeout(enforceTableHeight, 0);
    setTimeout(enforceTableHeight, 50);
    setTimeout(enforceTableHeight, 100);
    setTimeout(enforceTableHeight, 200);
  }, [aimeOpen]); // Re-enforce when AIME state changes
  
  // Position hide bar overlay above horizontal scrollbar
  useEffect(() => {
    if (!showAll) {
      const adjustOverlayPosition = () => {
        const overlay = hideBarOverlayRef.current;
        if (!overlay) {
          setTimeout(adjustOverlayPosition, 100);
          return;
        }
        
        // Find scrollbar element
        const tableWrapper = document.querySelector('.custom-horizontal-scrollbar') as HTMLElement;
        let scrollbarRect: DOMRect | null = null;
        
        if (tableWrapper) {
          scrollbarRect = tableWrapper.getBoundingClientRect();
          
          // Check if scrollbar is actually visible
          const scrollbarVisible = tableWrapper.scrollWidth > tableWrapper.clientWidth;
          if (!scrollbarVisible) {
            scrollbarRect = null;
          }
        }
        
        const container = overlay.parentElement;
        const containerRect = container?.getBoundingClientRect();
        
        // Dynamically adjust overlay position to sit just above horizontal scrollbar
        if (scrollbarRect && containerRect) {
          const gap = 2; // Small gap between overlay bottom and scrollbar top
          const scrollbarBottom = scrollbarRect.bottom;
          const estimatedScrollbarHeight = 18; // Typical scrollbar height
          const scrollbarTop = scrollbarBottom - estimatedScrollbarHeight;
          const targetOverlayBottom = scrollbarTop - gap;
          
          // Calculate bottom value relative to container
          const targetBottom = containerRect.bottom - targetOverlayBottom;
          
          // Clamp to reasonable values
          const minBottom = 0;
          const maxBottom = containerRect.height - 220; // Overlay height is 220px
          const clampedBottom = Math.max(minBottom, Math.min(targetBottom, maxBottom));
          
          // Only adjust if difference is significant (> 1px) and value is reasonable
          const currentBottom = parseFloat(overlay.style.bottom) || 20;
          if (Math.abs(currentBottom - clampedBottom) > 1 && clampedBottom >= 0 && clampedBottom <= containerRect.height) {
            overlay.style.setProperty('bottom', `${clampedBottom}px`, 'important');
          }
        }
      };
      
      // Wait for DOM to be ready, then adjust
      const timeoutId = setTimeout(adjustOverlayPosition, 100);
      
      // Update on resize/scroll
      window.addEventListener('resize', adjustOverlayPosition);
      window.addEventListener('scroll', adjustOverlayPosition);
      
      // Also check periodically
      const interval = setInterval(adjustOverlayPosition, 500);
      
      return () => {
        clearTimeout(timeoutId);
        window.removeEventListener('resize', adjustOverlayPosition);
        window.removeEventListener('scroll', adjustOverlayPosition);
        clearInterval(interval);
      };
    }
  }, [showAll]);
  // Handle column order change from table drag-and-drop
  const handleColumnOrderChange = useCallback((newOrder: string[]) => {
    // Save to history for undo
    setColumnOrderHistory(prevHistory => [...prevHistory, [...selectedColumns]]);
    setLastReorderAction({ type: "reorder", columns: newOrder });
    
    // Update selected columns with new order
    setSelectedColumns(newOrder);
    
    // Highlight changed columns
    const changedColumns = newOrder.filter((col, idx) => displayedColumns[idx] !== col);
    if (changedColumns.length > 0) {
      setHighlightedColumns(changedColumns);
      setTimeout(() => setHighlightedColumns([]), 2000);
      
      // Do not show toast notification - user requested to remove this
    }
  }, [selectedColumns, displayedColumns]);

  // Auto-load data on component mount or eventId change (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (eventId > 0) {
        fetchAttendees(q, eventId);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [eventId]);

  async function fetchAttendees(search?: string, targetEventId?: number, requestedLimit?: number, abortSignal?: AbortSignal) {
    const maxRetries = 3;
    const retryDelay = 5000; // 5 seconds gap

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        setLoading(true);
        setFetchStatus("loading");
        setRetryCount(attempt);
        setFetchMessage(attempt > 1 ? `Trying to fetch data (Attempt ${attempt} of ${maxRetries})...` : "Loading data...");

        const currentEventId = targetEventId || eventId;
        const query = `
          query Arrivals($q: String, $eventId: Int, $limit: Int!, $offset: Int!) {
            arrivalColumns
            arrivalColumnTypes {
              name
              type
            }
            arrivals(q: $q, eventId: $eventId, limit: $limit, offset: $offset) {
              total
              limit
              offset
              rows {
                first_name
                middle_name
                last_name
                email
                companion_count
                company_name
                phone
                mobile
                attendee_type
                emergency_contact
                registration_status
                manual_status
                room_status
                air_status
                created_at
                updated_at
                concur_login_id
                internal_notes
              }
            }
          }
        `;

        // Connect directly to GraphQL server (no proxy)
        const graphqlUrl = getGraphQLUrl();
        const res = await fetch(graphqlUrl, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query,
            variables: { q: search?.trim() || null, eventId: currentEventId, limit: requestedLimit || 50000, offset: 0 },
          }),
          ...(abortSignal ? { signal: abortSignal } : {}),
        });

        // Check content type before parsing
        const contentType = res.headers.get("content-type") || "";
        const isJsonResponse = contentType.includes("application/json");

        if (!res.ok) {
          const errorText = await res.text();
          logger.error(`GraphQL Fetch Error (Attempt ${attempt}):`, res.status, contentType, errorText.substring(0, 200));
          throw new Error(`Fetch failed: ${res.status} - ${errorText.substring(0, 100)}`);
        }

        // Read response body once and parse appropriately
        let json;
        try {
          // Read response as text first (works for both JSON and non-JSON)
          const responseText = await res.text();
          
          // Check if content type indicates JSON
          if (!isJsonResponse) {
            logger.error(`GraphQL Response is not JSON (Attempt ${attempt}):`, contentType, responseText.substring(0, 200));
            throw new Error(`Invalid response format: expected JSON but got ${contentType || 'unknown'}`);
          }
          
          // Try to parse as JSON
          json = JSON.parse(responseText);
        } catch (parseError: any) {
          // Handle different error types
          if (parseError.message && parseError.message.includes("Invalid response format")) {
            throw parseError; // Re-throw our custom error
          }
          
          // JSON parsing failed
          logger.error(`JSON Parse Error (Attempt ${attempt}):`, parseError.message);
          throw new Error(`Failed to parse JSON response: ${parseError.message}. Content-Type: ${contentType}`);
        }
        
        // Check for GraphQL errors, but allow partial data if arrivalColumnTypes fails
        if (json.errors) {
          const criticalErrors = json.errors.filter((err: any) => 
            !err.path?.includes('arrivalColumnTypes')
          );
          if (criticalErrors.length > 0) {
            const errorMessage = criticalErrors[0].message.toLowerCase();
            // Check if error indicates event not found
            if (errorMessage.includes('event') && (errorMessage.includes('not found') || errorMessage.includes('does not exist') || errorMessage.includes('invalid'))) {
              logger.error(`Event not found (Attempt ${attempt}):`, json.errors);
              setEventIdNotFound(true);
              setFetchStatus("error");
              setFetchMessage(`Event ID ${currentEventId} does not exist.`);
              setLoading(false);
              return [];
            }
            logger.error(`GraphQL Response Errors (Attempt ${attempt}):`, json.errors);
            throw new Error(criticalErrors[0].message);
          }
          // If only arrivalColumnTypes failed, log warning but continue
          logger.warn(`arrivalColumnTypes query failed, continuing without column types:`, json.errors);
        }

        const cols = json?.data?.arrivalColumns ?? [];
        const columnTypesData = json?.data?.arrivalColumnTypes ?? [];
        const payload = json?.data?.arrivals;
        const fetchedRows = payload?.rows ?? [];
        const totalCount = payload?.total ?? 0;
        
        // Check if eventId exists - verify if ANY records exist for this eventId
        if (totalCount === 0) {
          try {
            const verifyQuery = `
              query VerifyEvent($eventId: Int!) {
                eventExists(eventId: $eventId)
              }
            `;
            const verifyRes = await fetch(graphqlUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                query: verifyQuery,
                variables: { eventId: currentEventId },
              }),
            });
            
            if (verifyRes.ok) {
              const verifyJson = await verifyRes.json();
              const eventExists = verifyJson?.data?.eventExists ?? false;
              
              // If event doesn't exist, show 404
              if (!eventExists) {
                setEventIdNotFound(true);
                setFetchStatus("error");
                setFetchMessage(`Event ID ${currentEventId} does not exist.`);
                setLoading(false);
                return [];
              }
              // If event exists but has no attendees, continue normally (show empty state)
            }
          } catch (verifyErr) {
            // If verification fails, continue with normal flow
            logger.warn("Event verification query failed:", verifyErr);
          }
        }

        // Convert column types array to map (handle both array and null/undefined)
        const typesMap: Record<string, string> = {};
        if (Array.isArray(columnTypesData)) {
          columnTypesData.forEach((item: { name: string; type: string }) => {
            if (item && item.name && item.type) {
              typesMap[item.name] = item.type;
            }
          });
        }

        setColumns(cols);
        setColumnTypes(typesMap);
        setRows(fetchedRows);
        setTotal(payload?.total ?? 0);
        setFetchStatus("success");
        setFetchMessage("");
        setRetryCount(0);
        setLoading(false);

        // Initialize selected columns with all columns if not set
        setSelectedColumns((prev) => (prev.length === 0 ? cols : prev));

        return fetchedRows;
      } catch (err: any) {
        // Check if aborted
        if (err?.name === 'AbortError' || abortSignal?.aborted) {
          setLoading(false);
          throw new DOMException('Export cancelled', 'AbortError');
        }

        logger.error(`fetchAttendees error (Attempt ${attempt}):`, err);

        // Don't retry if aborted
        if (abortSignal?.aborted) {
          setLoading(false);
          throw new DOMException('Export cancelled', 'AbortError');
        }

        if (attempt < maxRetries) {
          setFetchMessage(`Attempt ${attempt} failed. Retrying in 5 seconds...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        } else {
          // Check if error indicates event not found
          const errorMessage = err?.message?.toLowerCase() || '';
          if (errorMessage.includes('event') && (errorMessage.includes('not found') || errorMessage.includes('does not exist') || errorMessage.includes('invalid'))) {
            setEventIdNotFound(true);
            setFetchStatus("error");
            setFetchMessage(`Event ID ${targetEventId || eventId} does not exist.`);
            setLoading(false);
            return [];
          }
          setFetchStatus("error");
          setFetchMessage(`Failed to load data after ${maxRetries} attempts. Please check the console for details.`);
          setLoading(false);
          throw err;
        }
      }
    }
  }

  const handleExport = useCallback(async (direct = false) => {
    if (exportStatus === "exporting") return;

    setExportStatus("exporting");
    setExportProgress(0);
    setExportMessage("Preparing export...");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      setExportStatus("error");
      setExportMessage("Export timed out after 30 seconds. Please try again with fewer rows or columns.");
    }, 30000);

    try {
      // For export, ignore global search filter but keep other filters and sorting
      // Start with all rows (not processedRows which includes globalSearchQuery)
      let dataToExport = [...rows];
      
      // Apply filters (but NOT global search)
      Object.entries(filters).forEach(([column, value]) => {
        if (value.trim()) {
          dataToExport = dataToExport.filter(row => {
            const cellValue = String(row[column] || "").toLowerCase();
            return cellValue.includes(value.toLowerCase());
          });
        }
      });

      // Apply sorting
      if (sortColumn) {
        dataToExport.sort((a, b) => {
          const aVal = a[sortColumn];
          const bVal = b[sortColumn];

          // Handle null/undefined
          if (aVal == null && bVal == null) return 0;
          if (aVal == null) return 1;
          if (bVal == null) return -1;

          // Compare values
          let comparison = 0;
          if (typeof aVal === 'number' && typeof bVal === 'number') {
            comparison = aVal - bVal;
          } else {
            comparison = String(aVal).localeCompare(String(bVal));
          }

          return sortDirection === "asc" ? comparison : -comparison;
        });
      }

      const needsFullFetch = total > rows.length;

      // Ensure we have all data if there's more on the server than in memory
      if (direct || needsFullFetch || dataToExport.length === 0) {
        // Check if aborted before starting fetch
        if (controller.signal.aborted) {
          throw new DOMException('Export cancelled', 'AbortError');
        }

        setExportProgress(10);
        setExportMessage("Fetching complete dataset for export...");
        try {
          // Fetch data with a limit equal to the total count (up to backend cap)
          // Pass abort signal to allow cancellation
          const fetched = await fetchAttendees(q, eventId, total || 50000, controller.signal);
          
          // Check if aborted after fetch completes
          if (controller.signal.aborted) {
            throw new DOMException('Export cancelled', 'AbortError');
          }
          
          setExportProgress(40);

          if (direct || needsFullFetch) {
            // Re-apply local filters (but NOT global search) to the newly fetched data
            let filtered = [...fetched];
            Object.entries(filters).forEach(([column, value]) => {
              if (value.trim()) {
                filtered = filtered.filter(row =>
                  String(row[column] || "").toLowerCase().includes(value.toLowerCase())
                );
              }
            });
            
            // Apply sorting
            if (sortColumn) {
              filtered.sort((a, b) => {
                const aVal = a[sortColumn];
                const bVal = b[sortColumn];

                if (aVal == null && bVal == null) return 0;
                if (aVal == null) return 1;
                if (bVal == null) return -1;

                let comparison = 0;
                if (typeof aVal === 'number' && typeof bVal === 'number') {
                  comparison = aVal - bVal;
                } else {
                  comparison = String(aVal).localeCompare(String(bVal));
                }

                return sortDirection === "asc" ? comparison : -comparison;
              });
            }
            
            dataToExport = filtered;
          }
          setExportProgress(50);
        } catch (fetchErr: any) {
          throw fetchErr;
        }
      } else {
        setExportProgress(30);
      }

      if (dataToExport.length === 0) {
        setExportStatus("idle");
        setExportMessage("No data found to export.");
        setTimeout(() => {
          setExportStatus("idle");
          setExportMessage("");
        }, 3000);
        return;
      }

      // Check if aborted before Excel generation
      if (controller.signal.aborted) {
        throw new DOMException('Export cancelled', 'AbortError');
      }

      setExportProgress(60);
      setExportMessage("Preparing columns...");

      // Check if aborted before starting Excel generation
      if (controller.signal.aborted) {
        throw new DOMException('Export cancelled', 'AbortError');
      }

      setExportProgress(70);
      setExportMessage("Generating Excel file...");

      const XLSX = await import("xlsx");

      // Check if aborted after XLSX import (which can take time)
      if (controller.signal.aborted) {
        throw new DOMException('Export cancelled', 'AbortError');
      }

      // Format date: "Wednesday, December 10, 2025, 6:23 AM"
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      const timeStr = now.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      const downloadedTime = `${dateStr}, ${timeStr}`;

      // Build array of arrays (aoa) to ensure exact column order matching displayedColumns
      // This gives us complete control over column ordering
      const aoaData: any[][] = [];
      
      // Add header row first (will be at row 5 after adding metadata rows)
      aoaData.push(displayedColumns.map(col => col));
      
      // Add data rows in the exact same column order
      dataToExport.forEach(row => {
        const rowData = displayedColumns.map(col => row[col] ?? '');
        aoaData.push(rowData);
      });

      // Create worksheet from array of arrays - this preserves exact column order
      const ws = XLSX.utils.aoa_to_sheet(aoaData);

      // Get the range of existing data
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');

      // Create new worksheet data object
      const newData: any = {};

      // Copy header row (row 0) to row 5
      for (let C = range.s.c; C <= range.e.c; C++) {
        const headerCell = XLSX.utils.encode_cell({ r: 0, c: C });
        const newHeaderCell = XLSX.utils.encode_cell({ r: 5, c: C });
        if (ws[headerCell]) {
          newData[newHeaderCell] = ws[headerCell];
        }
      }

      // Shift data rows (rows 1+) down by 5 rows (to rows 6+)
      for (let R = 1; R <= range.e.r; R++) {
        for (let C = range.s.c; C <= range.e.c; C++) {
          const cellAddress = XLSX.utils.encode_cell({ r: R + 5, c: C });
          const oldAddress = XLSX.utils.encode_cell({ r: R, c: C });
          if (ws[oldAddress]) {
            newData[cellAddress] = ws[oldAddress];
          }
        }
      }

      // Add header rows at the top
      newData['A1'] = { t: 's', v: 'Event Data' };
      newData['A2'] = { t: 's', v: 'Downloaded data' };
      newData['A3'] = { t: 's', v: downloadedTime };
      newData['A4'] = { t: 's', v: 'Notice: This report may contain personally identifiable and other client confidential data. Usage and distribution of this report should be governed by relevant regulations and your own organization\'s policies.' };
      // Row 5 is empty (no cell added)

      // Clear old cells and update worksheet with new data
      Object.keys(ws).forEach(key => {
        if (key.startsWith('!')) {
          // Keep worksheet metadata
          return;
        }
        delete ws[key];
      });
      Object.assign(ws, newData);

      // Update the range to include header rows
      ws['!ref'] = XLSX.utils.encode_range({
        s: { r: 0, c: range.s.c },
        e: { r: range.e.r + 5, c: range.e.c }
      });

      // Check if aborted before finalizing
      if (controller.signal.aborted) {
        throw new DOMException('Export cancelled', 'AbortError');
      }

      setExportProgress(85);
      setExportMessage("Finalizing export...");

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Attendees");
      
      // Check if aborted before saving file
      if (controller.signal.aborted) {
        throw new DOMException('Export cancelled', 'AbortError');
      }
      
      setExportProgress(95);
      setExportMessage("Saving file...");
      
      XLSX.writeFile(wb, `Attendee_Report_${new Date().toISOString().split('T')[0]}.xlsx`);

      // Final check before marking as complete
      if (controller.signal.aborted) {
        throw new DOMException('Export cancelled', 'AbortError');
      }

      setExportProgress(100);
      setExportMessage("Export complete!");
      
      // Export complete (removed debug logging)
      
      // Show success notification
      setExportStatus("success");
      setShowExportSuccess(true);
      
      // Hide success notification after 5 seconds
      setTimeout(() => {
        setShowExportSuccess(false);
        setExportStatus("idle");
        setExportMessage("");
        setExportProgress(0);
      }, 5000);
    } catch (err: any) {
      logger.error("Export Error Caught:", err);

      if (err?.name === 'AbortError' || err?.message === 'Export cancelled' || controller.signal.aborted) {
        // Export was cancelled or timed out
        setExportStatus("error");
        setExportMessage("Export was cancelled or timed out. Please try again.");
      } else {
        const errorMessage = err?.message || String(err) || "An unexpected error occurred during export.";
        setExportStatus("error");
        setExportMessage(errorMessage);
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }, [exportStatus, total, rows, q, eventId, filters, sortColumn, sortDirection, displayedColumns, fetchAttendees, setExportStatus, setExportProgress, setExportMessage, setShowExportSuccess]);

  // Sync export state to UI store for Topbar
  const prevExportStateRef = useRef<{ status: string; progress: number; message: string } | null>(null);
  
  // Store callbacks in refs so they don't need to be in dependency array
  const onExportRef = useRef(() => handleExport(false));
  const onRetryRef = useRef(() => handleExport(false));
  const onDismissRef = useRef(() => {
    setExportStatus("idle");
    setExportMessage("");
    setExportProgress(0);
  });
  
  // Update refs when handlers change
  useEffect(() => {
    onExportRef.current = () => handleExport(false);
    onRetryRef.current = () => handleExport(false);
    onDismissRef.current = () => {
      setExportStatus("idle");
      setExportMessage("");
      setExportProgress(0);
    };
  }, [handleExport, setExportStatus, setExportMessage, setExportProgress]);
  
  useEffect(() => {
    const currentState = {
      status: exportStatus,
      progress: exportProgress,
      message: exportMessage
    };
    
    // Only update if the actual values have changed
    const prevState = prevExportStateRef.current;
    if (!prevState || 
        prevState.status !== currentState.status || 
        prevState.progress !== currentState.progress || 
        prevState.message !== currentState.message) {
      prevExportStateRef.current = currentState;
      setExportStateRef.current({
        status: exportStatus,
        progress: exportProgress,
        message: exportMessage,
        onExport: () => onExportRef.current(),
        onRetry: () => onRetryRef.current(),
        onDismiss: () => onDismissRef.current()
      });
    }
  }, [exportStatus, exportProgress, exportMessage]);

  // Memoize the visible rows change callback to prevent infinite loops
  const handleVisibleRowsChange = useCallback((visibleCount: number, totalCount: number) => {
    setVisibleRowCount(visibleCount);
  }, []);

  // Show 404 page if eventId not found
  if (eventIdNotFound) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        width: '100%',
        gap: '16px'
      }}>
        <h1 style={{
          fontFamily: "'Instrument Sans', sans-serif",
          fontSize: '48px',
          fontWeight: 700,
          color: '#111827',
          margin: 0
        }}>404</h1>
        <h2 style={{
          fontFamily: "'Open Sans', sans-serif",
          fontSize: '24px',
          fontWeight: 600,
          color: '#374151',
          margin: 0
        }}>Page Not Found</h2>
        <p style={{
          fontFamily: "'Open Sans', sans-serif",
          fontSize: '16px',
          fontWeight: 400,
          color: '#6b7280',
          margin: 0
        }}>
          The event ID you're looking for does not exist.
        </p>
        <button
          onClick={() => {
            // Navigate to default event - the useEffect will handle state reset
            router.replace(`/insights/attendee/${DEFAULT_EVENT_ID}`);
          }}
          style={{
            marginTop: '24px',
            padding: '8px 16px',
            borderRadius: '8px',
            border: '1px solid #E5E7EB',
            background: '#FFFFFF',
            fontFamily: "'Open Sans', sans-serif",
            fontSize: '14px',
            fontWeight: 500,
            color: '#374151',
            cursor: 'pointer'
          }}
        >
          Go to Default Event
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Main Content */}
      <div 
        ref={mainContainerRef} 
        style={{ 
          display: 'flex',
          width: aimeOpen ? '994px' : '100%',
          maxWidth: aimeOpen ? '994px' : '100%',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: 'var(--spacing-6, 24px)',
          marginTop: '0px', 
          paddingTop: '0', 
          height: '960px',
          maxHeight: '960px',
          minHeight: '960px',
          overflow: 'hidden', 
          background: '#FFFFFF',
          boxSizing: 'border-box'
        }}
      >
      {/* PageHeader */}
      <div 
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 'var(--spacing-6, 24px)',
          alignSelf: 'stretch',
          flexShrink: 0,
        }}
      >
        {/* Left Container - Title Section */}
        <div className="flex flex-col justify-end items-start p-0 gap-2 flex-1">
          {/* Title */}
          <div className="flex flex-row items-center p-0 gap-2">
            <h1 
              style={{
                fontFamily: "'Instrument Sans', sans-serif",
                fontStyle: 'normal',
                fontWeight: 700,
                fontSize: '24px',
                lineHeight: '32px',
                color: '#161C24',
              }}
            >
              Attendee Report
            </h1>
            {/* Badge */}
            <span 
              className="flex flex-row justify-center items-center px-2 py-0.5 gap-1 rounded-lg"
              style={{
                background: '#E0E7FF',
              }}
            >
              <Users className="w-3 h-3" style={{ color: '#312E81', strokeWidth: 1.25 }} />
              <span 
                style={{
                  fontFamily: "'Open Sans', sans-serif",
                  fontStyle: 'normal',
                  fontWeight: 600,
                  fontSize: '12px',
                  lineHeight: '16px',
                  color: '#312E81',
                }}
              >
                Attendance
              </span>
            </span>
          </div>
          {/* Description */}
          <div 
            style={{
              fontFamily: "'Open Sans', sans-serif",
              fontStyle: 'normal',
              fontWeight: 400,
              fontSize: '16px',
              lineHeight: '24px',
              color: '#637584',
            }}
          >
            Realtime data from your event
          </div>
        </div>

        {/* Right Container - Input Group and Button */}
        <div 
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: 'var(--spacing-4, 16px)',
          }}
        >
          {/* Global Search InputGroup - searches across all columns */}
          <div 
            className="flex flex-row items-center gap-2 flex-none rounded-lg"
            role="search"
            style={{
              display: 'flex',
              width: '296px',
              height: 'var(--height-h-9, 36px)',
              maxWidth: '296px',
              padding: 'var(--spacing-1, 4px) var(--spacing-3, 12px)',
              alignItems: 'center',
              gap: 'var(--spacing-2, 8px)',
              borderRadius: 'var(--border-radius-rounded-md, 8px)',
              border: 'var(--border-width-border, 1px) solid var(--base-input, #E6EAF0)',
              background: 'var(--custom-background-dark-input-30, #FFF)',
            }}
          >
            <div className="flex flex-row justify-center items-center p-0 gap-2" style={{ width: '16px', height: '16px', flex: 'none' }}>
              <Search className="w-4 h-4" style={{ color: '#637584', strokeWidth: 1.33, flex: 'none' }} aria-hidden="true" />
            </div>
            <Input
              className="flex-1 border-none bg-transparent p-0 outline-none"
              placeholder="Search (Ctrl+F)"
              value={globalSearchQuery}
              onChange={(e) => {
                const value = e.target.value;
                setGlobalSearchQuery(value);
                // Clear filter when search is removed
                if (!value.trim()) {
                  setGlobalSearchQuery("");
                }
              }}
              onKeyDown={(e) => {
                // Support Ctrl+F / Cmd+F to focus search
                if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                  e.preventDefault();
                  e.currentTarget.focus();
                }
                // Escape to clear search
                if (e.key === 'Escape' && globalSearchQuery) {
                  setGlobalSearchQuery("");
                }
              }}
              aria-label="Search"
              aria-describedby={globalSearchQuery ? "search-results-count" : undefined}
              style={{
                fontFamily: "'Open Sans', sans-serif",
                fontStyle: 'normal',
                fontWeight: 400,
                fontSize: '14px',
                lineHeight: '20px',
                color: '#637584',
                width: '215px',
                height: '20px'
              }}
            />
            {globalSearchQuery && (
              <button
                onClick={() => setGlobalSearchQuery("")}
                className="flex items-center justify-center p-0 flex-none"
                style={{
                  width: '16px',
                  height: '16px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer'
                }}
                aria-label="Clear search"
                type="button"
              >
                <span style={{ color: '#637584', fontSize: '14px' }} aria-hidden="true">×</span>
              </button>
            )}
          </div>
          {/* Search results count - accessible announcement */}
          {globalSearchQuery && (
            <div 
              id="search-results-count" 
              className="sr-only" 
              aria-live="polite"
              style={{
                position: 'absolute',
                width: '1px',
                height: '1px',
                padding: '0',
                margin: '-1px',
                overflow: 'hidden',
                clip: 'rect(0, 0, 0, 0)',
                whiteSpace: 'nowrap',
                borderWidth: '0'
              }}
            >
              {processedRows.length === 0 
                ? 'No results found' 
                : `${processedRows.length} result${processedRows.length === 1 ? '' : 's'} found`}
            </div>
          )}

          {/* Configure Report Button */}
          <button
            onClick={() => {
              setPickColumnsData({
                allColumns: columns,
                selectedColumns: selectedColumns.length > 0 ? selectedColumns : columns,
                columnTypes: columnTypes,
                onApply: (cols) => setSelectedColumns(cols),
              });
              setPickColumnsOpen(true);
            }}
            style={{
              display: 'flex',
              height: 'var(--height-h-9, 36px)',
              padding: 'var(--spacing-2, 8px) var(--spacing-4, 16px)',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 'var(--spacing-2, 8px)',
              borderRadius: 'var(--border-radius-rounded-md, 8px)',
              border: 'var(--border-width-border, 1px) solid var(--base-input, #E6EAF0)',
              background: 'var(--custom-background-dark-input-30, #FFF)',
            }}
          >
            <Columns3 
              style={{ 
                width: '16px',
                height: 'var(--height-h-4, 16px)',
                aspectRatio: '1/1',
                color: 'var(--base-foreground, #161C24)',
                strokeWidth: 1.33,
                flex: 'none'
              }} 
            />
            <span 
              style={{
                fontFamily: 'var(--font-body, "Open Sans")',
                fontSize: 'var(--text-sm-font-size, 14px)',
                fontStyle: 'normal',
                fontWeight: 'var(--font-weight-semibold, 600)',
                lineHeight: 'var(--text-sm-line-height, 20px)',
                color: 'var(--base-foreground, #161C24)',
              }}
            >
              Configure Report
            </span>
          </button>
        </div>
      </div>

      {/* Command Error Display */}
      {commandError && (
        <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded-md flex items-center justify-between" style={{ flexShrink: 0 }}>
          <div className="flex items-center gap-2 text-sm text-red-700">
            <span className="font-medium">Command Error:</span>
            <span>{commandError}</span>
          </div>
          <button
            onClick={() => setCommandError(null)}
            className="text-red-500 hover:text-red-700 text-sm font-medium"
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      {/* Row 5: Status Summary */}
      {fetchMessage && (
        <div className="pb-1 flex items-center gap-3 text-xs text-[#6b7280]" style={{ flexShrink: 0 }}>
          <span>{fetchMessage}</span>
        </div>
      )}

      {/* Table Area */}
      <div 
        ref={tableAreaRef} 
        style={{ 
          flex: '1 1 0%', 
          minHeight: 0, 
          height: '100%', 
          maxHeight: '100%', 
          display: 'flex', 
          flexDirection: 'column', 
          boxSizing: 'border-box', 
          position: 'relative', 
          zIndex: 0,
          overflow: 'hidden',
          width: '100%',
        }}
      >
        {loading ? (
          <div className="p-4 text-center text-gray-500">
            <div className="flex flex-col items-center gap-2">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#a855f7] border-t-transparent"></div>
              <span>{fetchMessage || "Loading data..."}</span>
            </div>
          </div>
        ) : fetchStatus === "error" ? (
          <div className="p-4 flex flex-col items-center justify-center gap-3 min-h-[200px]">
            <div className="flex flex-col items-center gap-2 text-red-500">
              <div className="text-sm font-medium">Failed to load data</div>
              <div className="text-sm text-red-400 max-w-md text-center">
                {fetchMessage || "An error occurred while loading data. Please try again."}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setFetchStatus("idle");
                  fetchAttendees(q, eventId);
                }}
                className="flex items-center gap-2 rounded-md bg-[#a855f7] px-4 py-2 text-sm font-medium text-white hover:bg-[#9333ea] transition-all shadow-sm active:scale-95"
              >
                <span>Retry</span>
              </button>
              <button
                onClick={() => {
                  setFetchStatus("idle");
                  setFetchMessage("");
                }}
                className="flex items-center gap-2 rounded-md border border-[#e5e7eb] bg-white px-4 py-2 text-sm font-medium text-[#374151] hover:bg-[#f9fafb] transition-all"
              >
                Dismiss
              </button>
            </div>
          </div>
        ) : rows.length > 0 ? (
          <div 
            style={{
              display: 'flex',
              flex: '1 1 0%',
              minHeight: '960px',
              height: '960px',
              maxHeight: '960px',
              width: '100%',
              alignItems: 'flex-start',
              alignSelf: 'stretch',
              borderRadius: 'var(--border-radius-rounded-xl, 14px) var(--border-radius-rounded-none, 0) var(--border-radius-rounded-none, 0) 0',
              borderTop: 'var(--border-width-border, 1px) solid var(--base-border, #E6EAF0)',
              borderLeft: 'var(--border-width-border, 1px) solid var(--base-border, #E6EAF0)',
              background: 'var(--tailwind-colors-base-white, #FFF)',
              position: 'relative',
            }}
            ref={(el) => {
              wrapperDivRef.current = el;
              // CRITICAL: Immediately enforce 960px height on table wrapper
              if (el) {
                const targetHeight = 960;
                
                // Force height immediately
                el.style.setProperty('height', `${targetHeight}px`, 'important');
                el.style.setProperty('max-height', `${targetHeight}px`, 'important');
                el.style.setProperty('min-height', `${targetHeight}px`, 'important');
                
                // Also ensure parent allows this height
                const parent = el.parentElement;
                if (parent) {
                  parent.style.setProperty('min-height', `${targetHeight}px`, 'important');
                  parent.style.setProperty('display', 'flex', 'important');
                  parent.style.setProperty('flex-direction', 'column', 'important');
                }
                
                // Verify and re-enforce multiple times
                const verifyAndEnforce = () => {
                  if (el === wrapperDivRef.current) {
                    const rect = el.getBoundingClientRect();
                    if (Math.abs(rect.height - targetHeight) > 1) {
                      el.style.setProperty('height', `${targetHeight}px`, 'important');
                      el.style.setProperty('max-height', `${targetHeight}px`, 'important');
                      el.style.setProperty('min-height', `${targetHeight}px`, 'important');
                    }
                  }
                };
                
                // Verify immediately
                verifyAndEnforce();
                
                // Verify after microtask
                Promise.resolve().then(verifyAndEnforce);
                
                // Verify after multiple delays
                setTimeout(verifyAndEnforce, 0);
                setTimeout(verifyAndEnforce, 50);
                setTimeout(verifyAndEnforce, 100);
                setTimeout(verifyAndEnforce, 200);
                setTimeout(verifyAndEnforce, 500);
              }
            }}
          >
            {globalSearchQuery && processedRows.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center" style={{ height: '200px' }}>
                <Search className="w-12 h-12 mb-4" style={{ color: '#9ca3af', strokeWidth: 1.5 }} />
                <p className="text-lg font-medium" style={{ color: '#374151', marginBottom: '8px' }}>
                  No results found
                </p>
                <p className="text-sm" style={{ color: '#6b7280' }}>
                  No rows match "{globalSearchQuery}". Try a different search term.
                </p>
              </div>
            ) : (
              <div 
                style={{ 
                  flex: '1 1 0%', 
                  minHeight: 0,
                  height: '100%',
                  maxHeight: '100%',
                  display: 'flex', 
                  flexDirection: 'column', 
                  boxSizing: 'border-box', 
                  width: '100%',
                  position: 'relative',
                  zIndex: 0,
                  overflow: 'hidden',
                }}
                ref={(el) => {
                  innerWrapperDivRef.current = el;
                  // CRITICAL: Force height to match parent via direct DOM manipulation
                  if (el) {
                    const parent = el.parentElement;
                    if (parent) {
                      const parentRect = parent.getBoundingClientRect();
                      const targetHeight = parentRect.height;
                      
                      // Set min-height FIRST to force expansion
                      el.style.setProperty('min-height', `${targetHeight}px`, 'important');
                      el.style.setProperty('height', `${targetHeight}px`, 'important');
                      el.style.setProperty('max-height', `${targetHeight}px`, 'important');
                      
                      // Remove all constraints
                      el.style.setProperty('padding-top', '0', 'important');
                      el.style.setProperty('padding-bottom', '0', 'important');
                      el.style.setProperty('margin-top', '0', 'important');
                      el.style.setProperty('margin-bottom', '0', 'important');
                      
                      // Force flex to fill
                      el.style.setProperty('flex', '1 1 0%', 'important');
                      
                      // Ensure display
                      el.style.setProperty('display', 'flex', 'important');
                      el.style.setProperty('box-sizing', 'border-box', 'important');
                      
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
                    }
                  }
                }}
              >
                <InsightsAttendeeTable
                  rows={displayedRows}
                  columnOrder={displayedColumns}
                  loading={loading}
                  showAll={showAll}
                  filters={filters}
                  onFilterChange={setFilters}
                  onVisibleRowsChange={handleVisibleRowsChange}
                  onColumnOrderChange={handleColumnOrderChange}
                  highlightedColumns={highlightedColumns}
                  onDebugInfoChange={undefined}
                />
              </div>
            )}
            
            {/* Hide bar overlay - only show when showAll is false */}
            {!showAll && rows.length > 0 && (
              <div 
                ref={hideBarOverlayRef}
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  width: '100%',
                  height: '220px',
                  zIndex: 1000,
                  pointerEvents: 'none',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.00) 0.32%, #FFF 73.64%)',
                  overflow: 'visible',
                  visibility: 'visible',
                  opacity: 1,
                }}
              >
                {/* Content container */}
                <div 
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    width: '100%',
                    maxWidth: '1056px',
                    padding: '142px 354px 20px 354px',
                    boxSizing: 'border-box',
                    position: 'relative',
                    zIndex: 1001,
                  }}
                >
                  {/* LockKeyhole icon */}
                  <LockKeyhole 
                    style={{ 
                      color: '#637584',
                      strokeWidth: 1.5, 
                      height: '20px', 
                      width: '20px',
                      flexShrink: 0,
                      display: 'block',
                    }} 
                  />
                  
                  {/* Message text */}
                  <div 
                    style={{
                      color: '#637584',
                      textAlign: 'center',
                      fontFamily: '"Open Sans", sans-serif',
                      fontSize: '12px',
                      fontStyle: 'normal',
                      fontWeight: 400,
                      lineHeight: '16px',
                      whiteSpace: 'normal',
                      wordWrap: 'break-word',
                      display: 'block',
                    }}
                  >
                    This view shows a subset of the data.<br />
                    Download the report to see all results!
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : fetchStatus === "success" ? (
          <div className="p-4 text-center text-gray-500">
            No data found. The query returned 0 rows.
          </div>
        ) : null}
      </div>
      </div>

      {/* Export Success Notification */}
      {showExportSuccess && (
        <div 
          className="fixed left-1/2 -translate-x-1/2 bottom-6 flex flex-row items-start p-0 z-50"
          style={{ width: '397px', height: '44px' }}
        >
          <div 
            className="flex flex-row items-center px-4 py-3 gap-3 w-full h-full rounded-[10px]"
            style={{
              background: '#F0FFEC',
              border: '1px solid #447634',
              boxShadow: '0px 4px 6px -1px rgba(0, 0, 0, 0.1), 0px 2px 4px -2px rgba(0, 0, 0, 0.1)'
            }}
          >
            {/* Flex container for icon and text */}
            <div className="flex flex-row items-start p-0 gap-3" style={{ width: '365px', height: '20px', flex: 'none' }}>
              {/* Icon container */}
              <div className="flex flex-row items-start pt-0.5 px-0 pb-0" style={{ width: '16px', height: '18px', flex: 'none' }}>
                <CheckCircle2 
                  className="w-4 h-4" 
                  style={{ color: '#447634', strokeWidth: 1.33, flex: 'none' }}
                />
              </div>
              {/* Text container */}
              <div className="flex flex-col justify-center items-start p-0 gap-1" style={{ width: '337px', height: '20px', flex: 'none' }}>
                <div 
                  className="w-full h-5"
                  style={{
                    fontFamily: 'Open Sans, sans-serif',
                    flex: 'none',
                    fontStyle: 'normal',
                    fontWeight: 500,
                    fontSize: '14px',
                    lineHeight: '20px',
                    color: '#447634',
                    fontStretch: '75%'
                  }}
                >
                  Dashboard export has been exported successfully.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Toast notification */}
      {toast && (
        <Toast
          message={toast.message}
          onUndo={toast.onUndo}
          onDismiss={dismissToast}
        />
      )}

    </>
  );
}
