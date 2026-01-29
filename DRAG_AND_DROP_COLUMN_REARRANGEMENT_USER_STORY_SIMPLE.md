# Drag-and-Drop Column Rearrangement - User Story

## User Story

**As a user**,  
I want to rearrange columns using drag-and-drop UI controls,  
**So that** I can customize my report layout and organize columns in my preferred order.

---

## Acceptance Criteria

1. Users can drag-and-drop columns to rearrange order
2. Visual feedback shows preview of new column position during drag
3. Column rearrangement order is retained for export
4. Column order is maintained across conversation turns
5. All operations update preview within 2 seconds

---

## Backend Tasks

### Task 1: Column Order Persistence (Optional)
**Description**: Store user's column order preferences in backend database

**Tasks**:
- Create database table for column order preferences
- Create API endpoint: `POST /api/user/preferences/column-order`
- Create API endpoint: `GET /api/user/preferences/column-order`

**Priority**: LOW (Client-side localStorage is sufficient for MVP)

---

### Task 2: State Synchronization
**Description**: Ensure drag-and-drop updates sync with AIME conversation actions

**Tasks**:
- Share `selectedColumns` state between UI and AIME actions
- Both methods update same state

**Priority**: HIGH

---

## Frontend Tasks

### Task 1: Drag-and-Drop in Configure Report Panel
**Description**: Implement drag-and-drop functionality in "Configure Report" panel

**Tasks**:
- Add drag handles (GripVertical icon) to column items
- Implement drag handlers (`onDragStart`, `onDragOver`, `onDragLeave`, `onDragEnd`)
- Update column order state during drag

**Priority**: HIGH

---

### Task 2: Visual Feedback During Drag
**Description**: Add visual feedback to show drag state and drop target

**Tasks**:
- Opacity feedback for dragged column (50% opacity)
- Highlight drop target (purple background and border)
- Cursor changes (`cursor-move`, `cursor-grabbing`)

**Priority**: HIGH

---

### Task 3: Drag-and-Drop in Main Table Headers
**Description**: Add drag-and-drop directly to table headers

**Tasks**:
- Add `draggable={true}` to table headers
- Implement drag handlers on headers
- Add `onColumnOrderChange` callback

**Priority**: HIGH

---

### Task 4: Column Order Persistence
**Description**: Save column order to localStorage and restore on page load

**Tasks**:
- Save column order to localStorage on change
- Restore column order on component mount
- Handle invalid localStorage data gracefully

**Priority**: HIGH

---

### Task 5: Export Order Preservation
**Description**: Ensure Excel export maintains column order from drag-and-drop

**Tasks**:
- Use `displayedColumns` array for export
- Preserve exact order in Excel file

**Priority**: HIGH

---

### Task 6: Undo Functionality
**Description**: Add undo button in toast notification after drag operation

**Tasks**:
- Create toast component with undo button
- Track column order history
- Restore previous order on undo

**Priority**: MEDIUM

---

### Task 7: Column Highlighting
**Description**: Highlight moved columns briefly after reorder

**Tasks**:
- Add `highlightedColumns` state
- Apply yellow background with pulse animation
- Auto-fade after 2 seconds

**Priority**: MEDIUM

---

### Task 8: Touch-Friendly Drag Targets (Optional)
**Description**: Optimize drag handles for mobile/tablet devices

**Tasks**:
- Increase drag handle size to 44x44px minimum
- Add touch event handlers (`touchstart`, `touchmove`, `touchend`)
- Add haptic feedback for mobile

**Priority**: MEDIUM

---

## Summary

### Backend Tasks
- **Total**: 2 tasks
- **Optional**: 1 task

### Frontend Tasks
- **Total**: 8 tasks
- **Optional**: 1 task
