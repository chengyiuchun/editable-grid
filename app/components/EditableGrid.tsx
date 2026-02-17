"use client";

import {forwardRef, useCallback, useImperativeHandle, useMemo, useState, type Ref} from 'react';
import {castDraft, produce, type Draft} from 'immer';
import {AgGridReact} from 'ag-grid-react';
import type {CellEditRequestEvent, ColDef, GridApi, GridReadyEvent, RowClassRules} from 'ag-grid-community';
import {AllCommunityModule, ModuleRegistry} from 'ag-grid-community';
import 'ag-grid-community/styles/ag-theme-quartz.css';

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule]);

/**
 * Props for the EditableGrid component
 * @template T The type of row data
 */
export interface EditableGridProps<T extends Record<string, unknown>> {
  rowData: T[];
  columnDefs: ColDef[];
  idField: keyof T;
  onChange?: (changes: ChangeState<T>) => void;
}

/**
 * Handle interface exposed via ref
 * @template T The type of row data
 */
export interface EditableGridHandle<T extends Record<string, unknown>> {
  addRow(row: T): void;
  deleteSelectedRows(): void;
  reset(): void;
  modifySelectedRows(callback: (row: Draft<T>) => void): void;
  getChanges(): ChangeState<T>;
}

/**
 * Enum representing the modification state of a row
 */
export enum RowModificationState {
  Added = 'added',
  Modified = 'modified',
  Deleted = 'deleted',
}

/**
 * A single row's modification record
 * @template T The type of row data
 */
export type Modification<T extends Record<string, unknown>> =
  | {
      type: RowModificationState.Added | RowModificationState.Modified;
      /** Latest complete row data */
      data: T;
    }
  | {
      type: RowModificationState.Deleted;
      /** No row data when type is 'deleted' */
      data: null;
    };

/**
 * Map of row ID → modification record, tracking all pending changes.
 * Only rows with changes appear as keys.
 * @template T The type of row data
 */
export type ChangeState<T extends Record<string, unknown>> = Record<string | number, Modification<T>>;

/**
 * Deep equality comparison for objects
 */
function deepEqual(obj1: unknown, obj2: unknown): boolean {
  return JSON.stringify(obj1) === JSON.stringify(obj2);
}

/**
 * EditableGrid Component
 * A schema-agnostic editable grid with change tracking and undo capabilities
 * 
 * @template T The type of row data
 */
const EditableGrid = forwardRef(<T extends Record<string, unknown>>(
  props: EditableGridProps<T>,
  ref: Ref<EditableGridHandle<T>>
) => {
  const { rowData, columnDefs, idField, onChange } = props;
  
  const [changes, setChanges] = useState<ChangeState<T>>({});

  /**
   * Notify parent of changes
   */
  const updateChanges = useCallback((newChanges: ChangeState<T>) => {
    setChanges(newChanges);
    if (onChange) {
      onChange(newChanges);
    }
  }, [onChange]);

  const [gridApi, setGridApi] = useState<GridApi<T> | null>(null);

  /**
   * Get the ID value from a row
   */
  const getRowId = useCallback((row: T): string | number => {
    return row[idField] as string | number;
  }, [idField]);

  /**
   * Get the current modification state of a row, or null if unchanged
   */
  const getRowModificationState = useCallback((row: T): RowModificationState | null => {
    const id = getRowId(row);
    const type = changes[id]?.type;
    if (!type) return null;
    return type;
  }, [changes, getRowId]);

  /**
   * Merge original rowData with changes to create effective grid data
   */
  const effectiveRowData = useMemo(() => {
    const result: T[] = [];

    // Add original rows (with modifications applied where applicable)
    for (const originalRow of rowData) {
      const id = getRowId(originalRow);
      const mod = changes[id];
      if (mod?.type === RowModificationState.Modified && mod.data) {
        result.push(mod.data);
      } else {
        result.push(originalRow);
      }
    }

    // Append newly added rows
    for (const [, mod] of Object.entries(changes)) {
      if (mod.type === RowModificationState.Added && mod.data) {
        result.push(mod.data);
      }
    }

    return result;
  }, [rowData, changes, getRowId]);

  /**
   * Undo changes for a specific row
   */
  const undoRow = useCallback((row: T) => {
    const id = getRowId(row);
    updateChanges(produce(changes, draft => { delete draft[id]; }));
  }, [changes, getRowId, updateChanges]);

  /**
   * Undo cell renderer for the first column
   */
  const undoCellRenderer = useCallback((params: { data: T }) => {
    const row = params.data;
    const state = getRowModificationState(row);
    
    if (state === null) {
      return null;
    }
    
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          undoRow(row);
        }}
        className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded"
      >
        Undo
      </button>
    );
  }, [getRowModificationState, undoRow]);

  /**
   * Enhanced column definitions with undo button column
   */
  const enhancedColumnDefs = useMemo(() => {
    const undoColumn: ColDef = {
      headerName: '',
      width: 80,
      pinned: 'left',
      cellRenderer: undoCellRenderer,
      editable: false,
      sortable: false,
      filter: false,
      suppressHeaderMenuButton: true
    };
    
    return [undoColumn, ...columnDefs];
  }, [columnDefs, undoCellRenderer]);

  /**
   * Add a new row
   */
  const addRow = useCallback((row: T) => {
    const id = getRowId(row);
    const modification: Modification<T> = {
      type: RowModificationState.Added,
      data: row
    };
    updateChanges(produce(changes, draft => { draft[id] = castDraft(modification); }));
  }, [changes, getRowId, updateChanges]);

  /**
   * Delete selected rows
   */
  const deleteSelectedRows = useCallback(() => {
    if (!gridApi) return;

    const selectedRows = gridApi.getSelectedRows();
    const newChanges = produce(changes, draft => {
      for (const row of selectedRows) {
        const id = getRowId(row);
        if (draft[id]?.type === RowModificationState.Added) {
          // Newly added row - simply remove from tracking
          delete draft[id];
        } else {
          // Original row - mark as deleted
          draft[id] = { type: RowModificationState.Deleted, data: null };
        }
      }
    });

    updateChanges(newChanges);
    gridApi.deselectAll();
  }, [changes, gridApi, getRowId, updateChanges]);

  /**
   * Reset all changes
   */
  const reset = useCallback(() => {
    updateChanges({});
  }, [updateChanges]);

  /**
   * Modify selected rows using a callback
   */
  const modifySelectedRows = useCallback((callback: (row: Draft<T>) => void) => {
    if (!gridApi) return;

    const selectedRows = gridApi.getSelectedRows();
    const newChanges = produce(changes, draft => {
      selectedRows.forEach(selectedRow => {
        const id = getRowId(selectedRow);
        const currentMod = draft[id];

        // Don't modify deleted rows
        if (currentMod?.type === RowModificationState.Deleted) return;

        // Apply callback via Immer produce (handles deep clone + immutability)
        const modifiedRow = produce(selectedRow, callback);

        if (currentMod?.type === RowModificationState.Added) {
          // Keep it as 'added' but update the data if changed
          if (!deepEqual(selectedRow, modifiedRow)) {
            draft[id] = castDraft({ type: RowModificationState.Added, data: modifiedRow });
          }
        } else {
          // For original rows, compare against original
          const originalRow = rowData.find(r => getRowId(r) === id);
          if (originalRow && !deepEqual(originalRow, modifiedRow)) {
            draft[id] = castDraft({ type: RowModificationState.Modified, data: modifiedRow });
          } else if (originalRow && deepEqual(originalRow, modifiedRow)) {
            // Reverted to original - remove from tracking
            delete draft[id];
          }
        }
      });
    });

    updateChanges(newChanges);
  }, [changes, gridApi, rowData, getRowId, updateChanges]);

  /**
   * Handle cell edit requests (read-only edit mode)
   */
  const onCellEditRequest = useCallback((event: CellEditRequestEvent<T>) => {
    const row = event.data;
    const field = event.colDef.field;
    const newValue = event.newValue;

    if (!field) return;

    const id = getRowId(row);

    // Don't track changes for deleted rows
    if (changes[id]?.type === RowModificationState.Deleted) return;

    const updatedRow = { ...row, [field]: newValue } as T;

    const newChanges = produce(changes, draft => {
      const currentMod = draft[id];
      if (currentMod?.type === RowModificationState.Added) {
        // Keep as 'added', update the data
        draft[id] = castDraft({ type: RowModificationState.Added, data: updatedRow });
      } else {
        // For original rows
        const originalRow = rowData.find(r => getRowId(r) === id);
        if (originalRow) {
          if (!deepEqual(originalRow, updatedRow)) {
            draft[id] = castDraft({ type: RowModificationState.Modified, data: updatedRow });
          } else {
            // Edited back to original - remove from tracking
            delete draft[id];
          }
        }
      }
    });

    updateChanges(newChanges);
  }, [changes, rowData, getRowId, updateChanges]);

  /**
   * Get current changes
   */
  const getChanges = useCallback(() => {
    return changes;
  }, [changes]);

  /**
   * Expose methods via ref
   */
  useImperativeHandle(ref, () => ({
    addRow,
    deleteSelectedRows,
    reset,
    modifySelectedRows,
    getChanges
  }), [addRow, deleteSelectedRows, reset, modifySelectedRows, getChanges]);

  /**
   * Handle grid ready
   */
  const onGridReady = useCallback((event: GridReadyEvent) => {
    setGridApi(event.api);
  }, []);

  const enableByRowModificationState = useCallback((state: RowModificationState): (params: { data: T | undefined }) => boolean => {
    return (params) => !!params.data && getRowModificationState(params.data) === state
  }, [getRowModificationState]);

  const defaultColDef = useMemo<ColDef<T>>(() => ({
    cellClassRules: {
      'line-through': enableByRowModificationState(RowModificationState.Deleted)
    },
  }), [enableByRowModificationState]);

  const rowClassRules = useMemo<RowClassRules<T>>(() => ({
    '!bg-red-100': enableByRowModificationState(RowModificationState.Deleted),
    '!bg-green-100': enableByRowModificationState(RowModificationState.Added),
    '!bg-yellow-100': enableByRowModificationState(RowModificationState.Modified),
  }), [enableByRowModificationState]);

  return (
    <div className="ag-theme-quartz" style={{ height: '100%', width: '100%' }}>
      <AgGridReact
        rowData={effectiveRowData}
        columnDefs={enhancedColumnDefs}
        rowSelection={{
          mode: 'multiRow',
          enableClickSelection: false,
          selectAll: 'filtered'
        }}
        onGridReady={onGridReady}
        readOnlyEdit={true}
        onCellEditRequest={onCellEditRequest}
        getRowId={(params) => String(getRowId(params.data))}
        defaultColDef={defaultColDef}
        rowClassRules={rowClassRules}
      />
    </div>
  );
});

EditableGrid.displayName = 'EditableGrid';

export default EditableGrid;
