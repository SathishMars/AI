# Frontend Panels Documentation

## 📋 Overview

The Insights application uses a **3-column layout** with multiple panels that can be shown/hidden based on user actions and page context.

---

## 🏗️ Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│                    Topbar (Header)                          │
├──────────┬──────────────────────────────┬──────────────────┤
│          │                              │                  │
│ Sidebar  │      Main Content Area       │   Right Panel   │
│ (Left)   │      (Center)                │   (Right)       │
│          │                              │                  │
│          │  - Arrivals Table            │  - AIME Panel   │
│          │  - System Reports            │  - Pick Columns │
│          │  - Other Pages              │                  │
│          │                              │                  │
└──────────┴──────────────────────────────┴──────────────────┘
```

---

## 📦 Panel Components

### **1. Topbar (Header Panel)**

**File**: `src/app/components/Shell/Topbar.tsx`  
**Component**: `InsightsTopbar`  
**Position**: Top of the screen (fixed)  
**Height**: 56px (h-14)

#### **Features:**

**On Arrivals Page:**
- **Left**: Back button (navigates to previous page)
- **Right**: Export controls
  - "Save to My Reports" button
  - "Export" button (with download icon)
  - Export progress indicator (when exporting)
  - Export error display (with retry option)

**On Other Pages:**
- **Left**: 
  - Groupize.ai logo
  - "Demo" dropdown button
- **Right**:
  - US Flag icon (language/region selector)
  - Help icon (question mark)
  - User profile icon

#### **State Management:**
- Uses `useInsightsUI()` hook for export state
- Reads `exportState` for export progress/errors
- Conditionally renders based on `pathname` (arrivals vs other pages)

---

### **2. Sidebar (Left Panel)**

**File**: `src/app/components/Shell/Sidebar.tsx`  
**Component**: `InsightsSidebar`  
**Position**: Left side (fixed)  
**Width**: 
- Expanded: 260px
- Collapsed: 72px

#### **Features:**

**Navigation Menu Items:**
1. **Setup** (Grid3x3 icon)
2. **Expenses** (Wallet icon, has dropdown)
3. **eBids** (Handshake icon)
4. **Attendees** (Users icon)
5. **Registration** (FilePenLine icon, has dropdown)
6. **Website & App** (Monitor icon, has dropdown)
7. **Travel** (Plane icon, has dropdown)
8. **Communications** (MessageSquare icon, has dropdown)
9. **Reports** (FileBarChart icon)
10. **Insights** (FileBarChart icon, badge: "Beta", active: true)
11. **Meetings Assistant** (UserCircle icon, badge: "Beta")
12. **SmartBids** (Handshake icon, badge: "Beta")
13. **Scout** (MapPin icon, badge: "Beta")
14. **Budget** (Wallet icon, badge: "In Progress")
15. **Support** (Headphones icon, badge: "In Progress")

**Controls:**
- **Collapse/Expand Button**: Toggles sidebar width
- **Back to Events Button**: (shown when expanded)

#### **State Management:**
- Uses `useInsightsUI()` hook
- `sidebarCollapsed` state controls width
- `setSidebarCollapsed()` toggles collapse state

#### **Visibility:**
- **Hidden on Arrivals Page**: Sidebar is completely hidden when on `/arrivals` route
- **Visible on Other Pages**: Shown on all other insights pages

---

### **3. Main Content Area (Center Panel)**

**Position**: Center (flexible width)  
**Content**: Varies by page

#### **On Arrivals Page (`/arrivals`):**
- **ArrivalsTable Component**: Main data table
- **Page Header**: Title and filters
- **Global Search**: Search input
- **Table Controls**: Column picker button, filters, sorting
- **Hide Bar Overlay**: Fade-out overlay at bottom (when `showAll` is false)

#### **On Other Pages:**
- **System Reports**: List of available reports
- **Other Insights Pages**: Page-specific content

---

### **4. AIME Panel (Right Panel - Default)**

**File**: `src/app/components/Shell/AimePanel.tsx`  
**Component**: `InsightsAimePanel`  
**Position**: Right side (slides in/out)  
**Width**: 360px (when open)

#### **Features:**

**Chat Interface:**
- **Message History**: Scrollable list of user/assistant messages
- **Input Field**: Text input for questions (min 3 chars, max 200 chars)
- **Send Button**: Enabled when input is valid
- **Typing Indicator**: Shows when AI is processing

**Message Display:**
- **User Messages**: Right-aligned, user avatar
- **Assistant Messages**: Left-aligned, AI icon (Sparkles)
- **Markdown Support**: Uses ReactMarkdown for formatted responses
- **SQL Display**: Shows SQL queries when available
- **Data Tables**: Displays query results in tables
- **Export Button**: Appears for substantial data (2+ rows, 2+ columns)

**Export Functionality:**
- **Excel Export**: Downloads data as `.xlsx` file
- **Smart Detection**: Only shows export for tabular data
- **Metadata**: Includes download timestamp in file

**Command History:**
- **CommandHistory Component**: Shows recent commands
- **Repeat Commands**: Click to repeat previous commands

**Suggestions:**
- **Suggested Prompts**: Shows AI-generated suggestions
- **Quick Actions**: Pre-defined query templates

#### **State Management:**
- Uses `useInsightsUI()` hook
- `aimeOpen` controls visibility
- `setAimeOpen()` toggles panel
- `setAimeAction()` handles UI actions from AI
- `eventId` for context

#### **Visibility:**
- **Shown by Default**: Panel is visible when `aimeOpen` is true
- **Hidden When**: Pick Columns panel is open (takes priority)
- **Auto-opens**: When user clicks "Customize" on a report

---

### **5. Pick Columns Panel (Right Panel - Overlay)**

**File**: `src/app/components/arrivals/PickColumnsPanel.tsx`  
**Component**: `InsightsPickColumnsPanel`  
**Position**: Right side (overlays AIME panel)  
**Width**: 360px (when open)

#### **Features:**

**Column Selection:**
- **Search Bar**: Filter columns by name
- **Column List**: Scrollable list of all available columns
- **Checkboxes**: Toggle column visibility
- **Select All/None**: Bulk selection toggle
- **Column Count**: Shows "X of Y selected"

**Column Organization:**
- **Drag and Drop**: Reorder columns (when implemented)
- **Pinned Columns**: Cannot be hidden (first name, last name, etc.)
- **Column Types**: Shows data type indicators (text, number, date, etc.)
- **Category Grouping**: Groups columns by category (when available)

**Actions:**
- **Apply Button**: Applies selected columns to table
- **Cancel Button**: Closes panel without changes
- **Close Button**: X button in header

**Column Display:**
- **Formatted Names**: Converts `snake_case` to "Title Case"
- **Type Indicators**: Visual indicators for data types
- **Tooltips**: Hover for column descriptions

#### **Props:**
```typescript
{
  allColumns: string[];              // All available columns
  selectedColumns: string[];         // Currently selected columns
  columnTypes?: Record<string, string>; // Column data types
  onApply: (columns: string[]) => void; // Callback when Apply clicked
}
```

#### **State Management:**
- Uses `useInsightsUI()` hook
- `pickColumnsOpen` controls visibility
- `pickColumnsData` contains column data
- `setPickColumnsOpen()` toggles panel
- Local state for temporary selections before Apply

#### **Visibility:**
- **Shown When**: User clicks "Pick Columns" button
- **Overlays AIME**: Takes priority over AIME panel when open
- **Hidden When**: User clicks Apply, Cancel, or Close

---

## 🔄 Panel Interactions

### **Right Panel Priority**

The right panel shows **one panel at a time**:

1. **Pick Columns Panel** (highest priority)
   - Shown when `pickColumnsOpen && pickColumnsData` is true
   - Overlays/replaces AIME panel temporarily

2. **AIME Panel** (default)
   - Shown when Pick Columns is closed
   - Always available for chat

### **Panel Width Calculation**

```typescript
const rightPanelWidth = (aimeOpen || pickColumnsOpen) ? 360 : 0;
```

- **360px**: When either panel is open
- **0px**: When both panels are closed

### **Grid Layout**

```typescript
gridTemplateColumns: `${sidebarWidth}px 1fr ${rightPanelWidth}px`
```

- **Column 1**: Sidebar (260px expanded, 72px collapsed, 0px hidden on arrivals)
- **Column 2**: Main content (flexible, fills remaining space)
- **Column 3**: Right panel (360px when open, 0px when closed)

---

## 🎨 Panel States

### **Sidebar States**

| State | Width | Visibility |
|-------|-------|------------|
| Expanded | 260px | ✅ Visible (on non-arrivals pages) |
| Collapsed | 72px | ✅ Visible (on non-arrivals pages) |
| Hidden | 0px | ❌ Hidden (on arrivals page) |

### **Right Panel States**

| State | Panel Shown | Width |
|-------|-------------|-------|
| Both Closed | None | 0px |
| AIME Open | AIME Panel | 360px |
| Pick Columns Open | Pick Columns Panel | 360px |
| Both Open | Pick Columns Panel (priority) | 360px |

---

## 📱 Responsive Behavior

### **Desktop (Default)**
- All panels visible simultaneously
- Sidebar can be collapsed/expanded
- Right panel slides in/out

### **Tablet/Mobile** (Future)
- Sidebar may become a drawer/modal
- Right panel may become a modal overlay
- Main content takes full width

---

## 🎯 User Interactions

### **Opening Panels**

1. **AIME Panel**:
   - Click "Customize" button on report card
   - Click AIME icon/button (if available)
   - Auto-opens on certain actions

2. **Pick Columns Panel**:
   - Click "Pick Columns" button in table header
   - Click column picker icon

3. **Sidebar**:
   - Always visible (except on arrivals page)
   - Click collapse button to toggle width

### **Closing Panels**

1. **AIME Panel**:
   - Click close button (if available)
   - Programmatically via `setAimeOpen(false)`

2. **Pick Columns Panel**:
   - Click "Apply" button (applies changes)
   - Click "Cancel" button (discards changes)
   - Click "X" close button

3. **Sidebar**:
   - Click collapse button to minimize
   - Cannot be completely closed (except on arrivals page)

---

## 🔧 State Management

All panel states are managed via **Zustand store**:

**File**: `src/app/lib/insights/ui-store.ts`

**State Properties:**
```typescript
{
  sidebarCollapsed: boolean;      // Sidebar collapse state
  aimeOpen: boolean;              // AIME panel visibility
  pickColumnsOpen: boolean;        // Pick Columns panel visibility
  pickColumnsData: {...} | null;   // Column picker data
  aimeAction: {...} | null;        // UI action from AI
  eventId: string | null;          // Current event ID
  exportState: {...} | null;       // Export progress/state
}
```

**Actions:**
```typescript
setSidebarCollapsed(collapsed: boolean)
setAimeOpen(open: boolean)
setPickColumnsOpen(open: boolean)
setPickColumnsData(data: {...} | null)
setAimeAction(action: {...} | null)
setEventId(id: string | null)
setExportState(state: {...} | null)
```

---

## 📊 Panel Summary Table

| Panel | Component | File | Width | Position | Visibility Control |
|-------|-----------|------|-------|----------|-------------------|
| **Topbar** | `InsightsTopbar` | `Topbar.tsx` | Full width | Top | Always visible |
| **Sidebar** | `InsightsSidebar` | `Sidebar.tsx` | 260px/72px/0px | Left | Hidden on arrivals |
| **Main Content** | Page-specific | Various | Flexible | Center | Always visible |
| **AIME Panel** | `InsightsAimePanel` | `AimePanel.tsx` | 360px | Right | `aimeOpen` state |
| **Pick Columns** | `InsightsPickColumnsPanel` | `PickColumnsPanel.tsx` | 360px | Right | `pickColumnsOpen` state |

---

## 🎨 Visual Hierarchy

1. **Topbar**: Highest z-index, always on top
2. **Sidebar**: Fixed left, below topbar
3. **Main Content**: Center, below topbar
4. **Right Panels**: Fixed right, below topbar, overlay main content

---

## 🔍 Key Files Reference

- **App Shell**: `src/app/components/Shell/AppShell.tsx`
- **Topbar**: `src/app/components/Shell/Topbar.tsx`
- **Sidebar**: `src/app/components/Shell/Sidebar.tsx`
- **AIME Panel**: `src/app/components/Shell/AimePanel.tsx`
- **Pick Columns Panel**: `src/app/components/arrivals/PickColumnsPanel.tsx`
- **State Store**: `src/app/lib/insights/ui-store.ts`

---

**Last Updated**: January 2026
