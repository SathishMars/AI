// INSIGHTS-SPECIFIC: Pick Columns panel component
"use client";

import { useState, useMemo, useEffect } from "react";
import { useInsightsUI } from "@/app/lib/insights/ui-store";
import { Search, ChevronDown, GripVertical, X } from "lucide-react";

type PickColumnsPanelProps = {
  allColumns: string[];
  selectedColumns: string[];
  onApply: (columns: string[]) => void;
};

export function InsightsPickColumnsPanel({
  allColumns,
  selectedColumns,
  onApply,
}: PickColumnsPanelProps) {
  const { pickColumnsOpen, setPickColumnsOpen } = useInsightsUI();
  const [searchQuery, setSearchQuery] = useState("");
  const [localSelectedColumns, setLocalSelectedColumns] = useState<string[]>(selectedColumns);
  const [columnOrder, setColumnOrder] = useState<string[]>(allColumns); // Track order of all columns
  const [categoryExpanded, setCategoryExpanded] = useState(true);
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  // Initialize local state when panel opens
  useEffect(() => {
    if (pickColumnsOpen) {
      setLocalSelectedColumns(selectedColumns);
      setColumnOrder(allColumns); // Reset to original order
      setSearchQuery("");
    }
  }, [pickColumnsOpen, selectedColumns, allColumns]);

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

  // Handle save changes - maintain order of selected columns based on columnOrder
  const handleSaveChanges = () => {
    // Order selected columns according to columnOrder
    const orderedSelectedColumns = columnOrder.filter(col => localSelectedColumns.includes(col));
    onApply(orderedSelectedColumns);
    setPickColumnsOpen(false);
  };

  // Handle cancel - close panel without applying changes
  const handleCancel = () => {
    // Reset local state to original selected columns
    setLocalSelectedColumns(selectedColumns);
    setPickColumnsOpen(false);
  };

  if (!pickColumnsOpen) return null;

  return (
    <aside className="flex h-full flex-col border-l border-[#e5e7eb] bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#e5e7eb] px-6 py-4">
        <h2 className="text-[16px] font-semibold text-[#111827]">Pick Columns</h2>
        <button
          onClick={handleCancel}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-[#e5e7eb] bg-white text-[#9ca3af] hover:bg-[#f9fafb] transition-colors"
          title="Close"
        >
          <X className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>

      {/* Instructions */}
      <div className="px-6 pt-4 pb-2">
        <p className="text-[12px] text-[#6b7280]">
          Select which columns to display in the data grid. Pinned columns cannot be hidden.
        </p>
      </div>

      {/* Search Bar */}
      <div className="px-6 pb-4">
        <div className="flex items-center rounded-lg border border-[#e5e7eb] bg-white px-3 py-2">
          <Search className="mr-2 h-4 w-4 text-[#9ca3af]" />
          <input
            type="text"
            placeholder="Find Page or Column"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 border-none bg-transparent text-[12px] outline-none placeholder:text-[#9ca3af]"
          />
        </div>
      </div>

      {/* Column List */}
      <div className="flex-1 overflow-y-auto px-6 pb-4">
        {/* Category Header */}
        <button
          onClick={() => setCategoryExpanded(!categoryExpanded)}
          className="flex w-full items-center justify-between py-2 text-left"
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <input
                type="checkbox"
                checked={selectedCount === totalCount && totalCount > 0}
                onChange={toggleAllColumns}
                className="h-4 w-4 rounded border-[#d1d5db] text-[#7c3aed] focus:ring-[#7c3aed]"
                style={{ accentColor: '#7c3aed' }}
              />
            </div>
            <span className="text-[13px] font-medium text-[#111827]">Attendees</span>
            <span className="text-[12px] text-[#6b7280]">
              {selectedCount}/{totalCount}
            </span>
          </div>
          <ChevronDown
            className={`h-4 w-4 text-[#6b7280] transition-transform ${
              categoryExpanded ? "" : "-rotate-90"
            }`}
            strokeWidth={2}
          />
        </button>

        {/* Column Items */}
        {categoryExpanded && (
          <div className="space-y-1">
            {filteredColumns.map((column) => {
              const isSelected = localSelectedColumns.includes(column);
              const isDragging = draggedColumn === column;
              const isDragOver = dragOverColumn === column && !isDragging;
              
              return (
                <div
                  key={column}
                  draggable={true}
                  onDragStart={() => handleDragStart(column)}
                  onDragOver={(e) => handleDragOver(e, column)}
                  onDragLeave={handleDragLeave}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-3 py-1.5 rounded px-2 transition-all ${
                    isDragging
                      ? 'opacity-50 cursor-grabbing'
                      : isDragOver
                      ? 'bg-[#ede9fe] border-t-2 border-[#7c3aed]'
                      : 'hover:bg-[#f9fafb] cursor-move'
                  }`}
                >
                  {/* Drag Handle */}
                  <div className="text-[#9ca3af] cursor-move">
                    <GripVertical className="h-4 w-4" strokeWidth={2} />
                  </div>

                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleColumn(column)}
                    className="h-4 w-4 rounded border-[#d1d5db] text-[#7c3aed] focus:ring-[#7c3aed]"
                    style={{ accentColor: '#7c3aed' }}
                  />

                  {/* Column Name */}
                  <span className="flex-1 text-[12px] text-[#111827]">
                    {column.replace(/_/g, " ")}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 border-t border-[#e5e7eb] px-6 py-4">
        <button
          onClick={handleCancel}
          className="rounded-lg border border-[#e5e7eb] bg-white px-4 py-1.5 text-[12px] font-medium text-[#374151] hover:bg-[#f9fafb] transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSaveChanges}
          className="rounded-lg bg-[#7c3aed] px-4 py-1.5 text-[12px] font-medium text-white hover:bg-[#6d28d9] transition-colors"
        >
          Save Changes
        </button>
      </div>
    </aside>
  );
}

