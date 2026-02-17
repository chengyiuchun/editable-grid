# Editable Grid Demo - Requirements Documentation

## Overview
This document outlines the requirements for building a demo application featuring an editable data grid component using AG-Grid Community Edition.

## Component Architecture

### EditableGrid Component
A React component that provides a fully-featured editable grid interface with change tracking capabilities.

**Component Props:**
- `rowData`: Array of data objects (generic type)
- `columnDefs`: AG-Grid column definitions (includes editability, renderers, etc.)
- `idField`: String property name that uniquely identifies rows (with TypeScript validation that it exists in rowData type)
- `ref`: React ref exposing methods for external components

**Component Methods (via ref):**
- `addRow(row: T)`: Adds a valid row object to the grid and tracks it as added
- `deleteSelectedRows()`: Marks all currently selected rows as deleted
- `reset()`: Clears all modifications and returns grid to initial state
- `modifySelectedRows(callback: (row: T) => T)`: Modifies all currently selected rows
  - Deep clones each row before passing to callback
  - Callback can mutate the cloned row directly
  - Returns modified row from callback
  - Grid performs deep comparison to check if row actually changed
  - Only tracks as modified if changes detected

## Functional Requirements

### 1. Grid Framework
- **Framework**: AG-Grid Community Edition
- **Component Type**: React functional component
- **Component Name**: `EditableGrid`

### 2. Data Management

#### 2.1 Initial Data Loading
- Initial row data (`rowData`) is loaded from server-side
- **Demo Implementation**: Data will be provided via component prop for demonstration purposes
- The component must NOT mutate the provided `rowData` prop
- All edits should be maintained as an overlay/delta on top of the original data
- Edit state managed through React component state

#### 2.2 Row Identification
- Each row must have a unique identifier field
- The identifier field name is passed via `idField` prop
- TypeScript validation ensures `idField` is a valid property of the row data type
- **Demo Implementation**: Uses `name` field as the unique identifier

#### 2.3 Schema Agnostic Design
- The grid component should work with any row data schema
- No hardcoded assumptions about field names or types
- **Demo Schema**: `{ name: string, age: number, vegetarian: boolean }`

#### 2.4 Data Immutability
- The original `rowData` prop must remain unchanged
- All modifications (edits, additions, deletions) tracked separately
- Changes applied as an overlay when rendering the grid

### 3. Column Configuration

#### 3.1 Column Definitions
- Component accepts AG-Grid `columnDefs` prop directly
- Column definitions include all configuration:
  - Field mappings
  - Editability (`editable: true/false`)
  - Custom cell renderers
  - Display formatting
  - Column headers
  - Any other AG-Grid column options

### 4. Grid Operations

#### 4.1 Edit Rows
- Users can edit cells in editable columns directly in the grid
- External components can modify selected rows via `modifySelectedRows()` ref method
- Changes tracked in component state
- Grid performs deep comparison to detect actual changes
- Visual indication when row has been modified

#### 4.2 Add Rows
- Component exposes `addRow(row)` method via React ref
- External components call this method with a valid row object
- New rows are appended to the end of the grid
- If column sorting is active, AG-Grid handles positioning automatically
- New rows tracked in modification state as added
- Visual indication for newly added rows (light green background)
- **Demo Implementation**: 
  - Toolbar "Add Row" button at top of grid
  - Button uses browser `prompt()` to ask for unique ID (name)
  - Generates row with default values: numbers = 0, booleans = false
  - Calls exposed `addRow` handle with generated row

#### 4.3 Remove Rows
- Toolbar "Delete Rows" button positioned next to "Add Row" button
- Grid supports multi-row selection (AG-Grid row selection)
- Clicking delete button marks all selected rows as deleted
- Removed rows remain visible in the grid (not hidden)
- Removed rows tracked by their ID only (not full row object)
- Visual indication:
  - Light red background
  - Strike-through text on all cells

#### 4.4 Undo Row Changes
- Undo button displayed in the first column of each row
- **Only visible** on rows that are modified, added, or deleted
- Undo resets the row back to its original unedited state:
  - **Edited rows**: Reverts all field changes
  - **Added rows**: Removes the row completely from grid
  - **Deleted rows**: Restores the row to active state
- Removes visual indicators (background colors, strike-through)

#### 4.5 Reset All Changes
- Toolbar "Reset" button clears all modifications
- Removes all added rows
- Reverts all edited rows to original state
- Restores all deleted rows
- Returns grid to initial state as if freshly loaded

### 5. Change Tracking

#### 5.1 Delta/Diff State
- Component maintains a complete delta/diff of all changes
- Tracks three types of changes:
  - **Added**: Complete row objects for new rows
  - **Modified**: Complete row objects for edited rows
  - **Deleted**: Array of IDs only (not full row objects)
- State structure example:
  ```typescript
  {
    added: T[],      // Full row objects
    modified: T[],   // Full row objects with changes
    deleted: ID[]    // Just the unique identifiers
  }
  ```

#### 5.2 Diff Visualization
- **Demo Implementation**: Display the diff state as JSON
- Render in a `<pre>` tag positioned side-by-side with the grid
- JSON should be formatted for readability
- Updates in real-time as changes are made

### 6. Visual Indicators

#### 6.1 Row State Colors
The grid must provide clear visual feedback for row states:
- **Added Rows**: Light green background
- **Removed Rows**: Light red background
- **Edited Rows**: Light yellow background
- **Unchanged Rows**: Default/white background

#### 6.2 Color Behavior
- Colors update immediately when row state changes
- Undo action removes the background color and strike-through
- Only one state color per row
- **State Priority**: deleted > added > edited
  - If a newly added row is then edited, it remains green (added state takes precedence)
  - If an edited row is then deleted, it becomes red (deleted state takes precedence)
- Strike-through text applies only to deleted rows

### 7. Testing Requirements

#### 7.1 Test Framework
- **Framework**: Jest
- **Coverage**: Comprehensive test coverage required

#### 7.2 Test Coverage Areas
- Component rendering
- Data initialization and immutability
- Edit operations and state updates
- Add row functionality
- Remove row functionality
- Undo operations
- Delta/diff calculation
- Visual indicator logic
- Custom cell renderers
- Column editability configuration

## Technical Constraints

1. Use AG-Grid Community Edition (not Enterprise)
2. React functional component with hooks
3. TypeScript for type safety
4. No mutation of props
5. State management via React hooks (useState, useReducer, etc.)

## Demo-Specific Implementation Notes

### Data Schema
```typescript
interface DemoRow {
  name: string;      // Unique identifier
  age: number;
  vegetarian: boolean;
}
```

### Initial Data
- Demo should include 10 rows of initial data
- Each row follows the `DemoRow` schema
- Provides sufficient data to demonstrate grid operations and change tracking

### Layout
- 50% width for grid panel
- 50% width for diff panel
- Diff state displayed in JSON format in `<pre>` tag
- Grid and diff panels positioned side-by-side

### Toolbar Controls
Positioned at the top of the grid:
1. **Add Row** button
   - Uses `window.prompt()` to ask for name (unique ID)
   - Generates row: `{ name: <input>, age: 0, vegetarian: false }`
   - Calls `gridRef.current.addRow(newRow)`
2. **Delete Rows** button
   - Calls `gridRef.current.deleteSelectedRows()`
   - Marks all selected rows as deleted
3. **Reset** button
   - Calls `gridRef.current.reset()`
   - Clears all modifications

### Configuration
- `idField` prop set to `"name"`
- Column definitions specify editability per field
- Initial data provided via component prop (simulates server-side data)
- No actual server communication required for demo

## Success Criteria

1. Grid displays initial data correctly
2. Users can edit, add, and remove rows
3. All changes tracked accurately in diff state
4. Visual indicators clearly show row states
5. Undo functionality works correctly for all row types
6. Original data remains unchanged
7. Comprehensive test coverage with passing tests
8. Custom cell renderers work as configured
9. Column editability respects configuration
10. Real-time JSON diff updates alongside grid