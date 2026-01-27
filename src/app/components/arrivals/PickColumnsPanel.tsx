// INSIGHTS-SPECIFIC: Pick Columns panel component
"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useInsightsUI } from "@/app/lib/insights/ui-store";
import { Search, ChevronDown, GripVertical, X, Loader2 } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

type PickColumnsPanelProps = {
  allColumns: string[];
  selectedColumns: string[];
  columnTypes?: Record<string, string>; // Map of column name to data type
  onApply: (columns: string[]) => void;
};

export function InsightsPickColumnsPanel({
  allColumns,
  selectedColumns,
  columnTypes = {},
  onApply,
}: PickColumnsPanelProps) {
  const { pickColumnsOpen, setPickColumnsOpen, pickColumnsData } = useInsightsUI();
  
  // Use columnTypes from props, or fallback to pickColumnsData if available
  const effectiveColumnTypes = columnTypes || pickColumnsData?.columnTypes || {};
  const [searchQuery, setSearchQuery] = useState("");
  const [localSelectedColumns, setLocalSelectedColumns] = useState<string[]>(selectedColumns);
  const [columnOrder, setColumnOrder] = useState<string[]>(allColumns); // Track order of all columns
  const [categoryExpanded, setCategoryExpanded] = useState(true);
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const columnRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Initialize local state when panel opens
  useEffect(() => {
    if (pickColumnsOpen) {
      setLocalSelectedColumns(selectedColumns);

      // Sync column order: put selected columns (in their current order) first,
      // followed by any unselected columns in their original DB order.
      const unselected = allColumns.filter(c => !selectedColumns.includes(c));
      setColumnOrder([...selectedColumns, ...unselected]);

      setSearchQuery("");
      setIsLoading(false);
      
      // Focus search input when panel opens
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [pickColumnsOpen, selectedColumns, allColumns]);

  // Handle cancel - close panel without applying changes
  const handleCancel = () => {
    // Reset local state to original selected columns
    setLocalSelectedColumns(selectedColumns);
    setPickColumnsOpen(false);
  };

  // Filter columns based on search, but maintain custom order
  const filteredColumns = useMemo(() => {
    if (!searchQuery.trim()) {
      // When no search, show all columns in their custom order
      return columnOrder;
    }
    const query = searchQuery.toLowerCase();
    // When searching, show matching columns in their custom order
    return columnOrder.filter(col => col.toLowerCase().includes(query));
  }, [columnOrder, searchQuery]);

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

    // Reorder all columns (both selected and unselected)
    const draggedIndex = columnOrder.indexOf(draggedColumn);
    const targetIndex = columnOrder.indexOf(targetColumn);

    if (draggedIndex === -1 || targetIndex === -1) return;

    // Only update if position actually changed
    if (draggedIndex === targetIndex) return;

    const newOrder = [...columnOrder];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedColumn);
    setColumnOrder(newOrder);
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

  // Calculate selected count
  const selectedCount = localSelectedColumns.length;
  const totalCount = allColumns.length;

  // Toggle column selection
  const toggleColumn = (column: string) => {
    setLocalSelectedColumns((prev) =>
      prev.includes(column)
        ? prev.filter((c) => c !== column)
        : [...prev, column]
    );
  };

  // Toggle all columns in category
  const toggleAllColumns = () => {
    if (selectedCount === totalCount) {
      setLocalSelectedColumns([]);
    } else {
      setLocalSelectedColumns([...allColumns]);
    }
  };

  // Format column name for display - capitalize first letter of each word
  const formatColumnDisplayName = (column: string): string => {
    return column
      .replace(/_/g, " ")
      .split(" ")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  // Get data source info for a column
  const getColumnDataSource = (column: string): string => {
    // Determine data source based on column name patterns
    if (column.includes('room') || column.includes('air') || column.includes('travel')) {
      return "Source: Travel & Logistics";
    }
    if (column.includes('registration') || column.includes('status')) {
      return "Source: Registration System";
    }
    if (column.includes('companion')) {
      return "Source: Attendee Relationships";
    }
    // Default to main attendee table
    return "Source: public.attendee table";
  };

  // Check if newly selected columns need backend data fetch
  const needsBackendFetch = (newSelected: string[]): boolean => {
    // Check if any newly selected columns were previously hidden
    const previouslyHidden = newSelected.filter(col => !selectedColumns.includes(col));
    // For now, assume all columns are available - can be enhanced later
    // This would check if columns require additional data fetching
    return false; // Placeholder - implement based on actual requirements
  };

  // Handle save changes - maintain order of selected columns based on columnOrder
  const handleSaveChanges = async () => {
    // Order selected columns according to columnOrder
    const orderedSelectedColumns = columnOrder.filter(col => localSelectedColumns.includes(col));
    
    // Check if backend fetch is needed
    if (needsBackendFetch(orderedSelectedColumns)) {
      setIsLoading(true);
      try {
        // Simulate backend fetch - replace with actual implementation
        await new Promise(resolve => setTimeout(resolve, 500));
      } finally {
        setIsLoading(false);
      }
    }
    
    onApply(orderedSelectedColumns);
    setPickColumnsOpen(false);
  };

  if (!pickColumnsOpen) return null;

  return (
    <aside className="flex h-full w-full flex-col border-l border-[#e5e7eb] bg-white px-3 py-3 shadow-[-4px_0_12px_-4px_rgba(0,0,0,0.05)] animate-in slide-in-from-right duration-300" ref={panelRef}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-[13px] font-semibold text-[#111827]">Configure Report</h2>
        <button
          onClick={handleCancel}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-[#e5e7eb] bg-white text-[#9ca3af] hover:bg-[#f9fafb] transition-colors"
          title="Close"
          aria-label="Close column picker"
        >
          –
        </button>
      </div>

      {/* Instructions */}
      <div className="mt-2">
        <p className="text-[11px] text-[#6b7280] leading-relaxed">
          Select which columns to display in the data grid.
        </p>
        <p className="text-[11px] text-[#6b7280] leading-relaxed">
          Pinned columns cannot be hidden.
        </p>
      </div>

      {/* Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Search Bar */}
        <div className="mt-2">
          <div className="flex items-center rounded-xl border border-[#e5e7eb] bg-[#f9fafb] px-3 py-2">
            <Search className="mr-2 h-3.5 w-3.5 text-[#9ca3af]" aria-hidden="true" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Find Page or Column"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 border-none bg-transparent text-[11px] outline-none placeholder:text-[#9ca3af]"
              aria-label="Search columns"
            />
          </div>
        </div>

        {/* Column List */}
        <div className="flex-1 overflow-y-auto mt-4">
        {/* Category Header */}
        <button
          onClick={() => setCategoryExpanded(!categoryExpanded)}
          className="flex w-full items-center justify-between py-2 text-left"
          aria-expanded={categoryExpanded}
          aria-controls="column-list"
          aria-label={`${categoryExpanded ? 'Collapse' : 'Expand'} Attendees category`}
        >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={selectedCount === totalCount && totalCount > 0}
                    onChange={toggleAllColumns}
                    className="h-4 w-4 rounded border-[#d1d5db] text-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]"
                    style={{ accentColor: '#7c3aed' }}
                    aria-label={`${selectedCount === totalCount ? 'Deselect' : 'Select'} all ${totalCount} columns`}
                  />
                </div>
                <span className="text-[13px] font-medium text-[#111827]">Attendees</span>
                <span className="text-[12px] text-[#6b7280]" aria-live="polite" aria-atomic="true">
                  {selectedCount}/{totalCount}
                </span>
              </div>
              <ChevronDown
                className={`h-4 w-4 text-[#6b7280] transition-transform ${categoryExpanded ? "" : "-rotate-90"
                  }`}
                strokeWidth={2}
                aria-hidden="true"
              />
            </button>

        {/* Column Items */}
        {categoryExpanded && (
          <div id="column-list" className="space-y-1 mt-1" role="group" aria-label="Column list">
            {filteredColumns.map((column, index) => {
              const isSelected = localSelectedColumns.includes(column);
              const isDragging = draggedColumn === column;
              const isDragOver = dragOverColumn === column && !isDragging;
              const columnDisplayName = formatColumnDisplayName(column);
              const dataSource = getColumnDataSource(column);
              const columnDataType = effectiveColumnTypes[column];
              
              // Format data type for display (e.g., "character varying" -> "Varchar", "timestamp without time zone" -> "Timestamp")
              const formatDataType = (type: string): string => {
                if (!type) return '';
                const typeMap: Record<string, string> = {
                  'character varying': 'varchar',
                  'character': 'char',
                  'timestamp without time zone': 'timestamp',
                  'timestamp with time zone': 'timestamptz',
                  'double precision': 'float',
                  'numeric': 'decimal',
                  'boolean': 'bool',
                };
                const mappedType = typeMap[type.toLowerCase()] || type.toLowerCase();
                // Capitalize first letter
                return mappedType.charAt(0).toUpperCase() + mappedType.slice(1);
              };
              const displayType = columnDataType ? formatDataType(columnDataType) : '';

              return (
                <div
                  key={column}
                  ref={(el) => { columnRefs.current[index] = el; }}
                  draggable={true}
                  onDragStart={() => handleDragStart(column)}
                  onDragOver={(e) => handleDragOver(e, column)}
                  onDragLeave={handleDragLeave}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-2 py-1.5 rounded-xl px-3 border border-[#e5e7eb] bg-[#f9fafb] transition-all ${isDragging
                      ? 'opacity-50 cursor-grabbing'
                      : isDragOver
                        ? 'bg-[#ede9fe] border-[#7c3aed]'
                        : 'hover:bg-[#f3f4f6] cursor-move'
                    }`}
                  role="listitem"
                >
                  {/* Drag Handle */}
                  <div className="text-[#9ca3af] cursor-move flex-shrink-0" aria-hidden="true">
                    <GripVertical className="h-4 w-4" strokeWidth={2} />
                  </div>

                  {/* Checkbox */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleColumn(column)}
                        className="h-4 w-4 rounded border-[#d1d5db] text-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed] flex-shrink-0"
                        style={{ accentColor: '#7c3aed' }}
                        aria-label={`${isSelected ? 'Hide' : 'Show'} ${columnDisplayName} column`}
                        aria-describedby={`column-${index}-description`}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs">
                      <div className="text-xs">
                        <div className="font-semibold mb-1">{columnDisplayName}</div>
                        <div className="text-[#6b7280] mb-1">{dataSource}</div>
                        {columnDataType && (
                          <div className="text-[#9ca3af] font-mono text-[10px]">
                            Type: {columnDataType}
                          </div>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>

                  {/* Column Name with Data Type */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div 
                        className="flex-1 flex items-center justify-between gap-2 min-w-0 cursor-pointer"
                        onClick={() => toggleColumn(column)}
                        id={`column-${index}-description`}
                      >
                        <span className="text-[11px] text-[#374151] font-medium truncate">
                          {columnDisplayName}
                        </span>
                        {columnDataType && displayType && (
                          <span 
                            className="text-[9px] text-[#6b7280] font-mono whitespace-nowrap flex-shrink-0"
                            title={`Data type: ${columnDataType}`}
                          >
                            {displayType}
                          </span>
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs">
                      <div className="text-xs">
                        <div className="font-semibold mb-1">{columnDisplayName}</div>
                        <div className="text-[#6b7280] mb-1">{dataSource}</div>
                        {columnDataType && (
                          <div className="text-[#9ca3af] font-mono text-[10px]">
                            Type: {columnDataType}
                          </div>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </div>
              );
            })}
          </div>
        )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-[#e5e7eb] mt-2 pt-2 flex-shrink-0">
        {isLoading && (
          <div className="flex items-center gap-2 text-[12px] text-[#6b7280] mr-auto" role="status" aria-live="polite">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            <span>Loading column data...</span>
          </div>
        )}
        <button
          onClick={handleCancel}
          className="rounded-lg border border-[#e5e7eb] bg-white px-3 py-1.5 text-[11px] font-medium text-[#374151] hover:bg-[#f9fafb] transition-colors"
          aria-label="Cancel and close column picker"
          disabled={isLoading}
        >
          Cancel
        </button>
        <button
          onClick={handleSaveChanges}
          className="rounded-lg bg-[#7c3aed] px-3 py-1.5 text-[11px] font-medium text-white hover:bg-[#6d28d9] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Save column selection changes"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin inline mr-2" aria-hidden="true" />
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </button>
        </div>
      </div>
    </aside>
  );
}

