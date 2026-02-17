"use client";

import { useRef, useState } from 'react';
import EditableGrid, { EditableGridHandle, ChangeState } from '@/app/components/EditableGrid';
import type { ColDef } from 'ag-grid-community';

// Demo data schema
interface DemoRow extends Record<string, unknown> {
  name: string;      // Unique identifier
  age: number;
  vegetarian: boolean;
}

// Initial demo data: 10 rows
const INITIAL_DATA: DemoRow[] = [
  { name: "Alice", age: 28, vegetarian: true },
  { name: "Bob", age: 35, vegetarian: false },
  { name: "Charlie", age: 42, vegetarian: true },
  { name: "Diana", age: 31, vegetarian: false },
  { name: "Eve", age: 26, vegetarian: true },
  { name: "Frank", age: 39, vegetarian: false },
  { name: "Grace", age: 33, vegetarian: true },
  { name: "Henry", age: 45, vegetarian: false },
  { name: "Ivy", age: 29, vegetarian: true },
  { name: "Jack", age: 37, vegetarian: false },
];

// Column definitions with all fields editable
const COLUMN_DEFS: ColDef<DemoRow>[] = [
  {
    field: 'name',
    headerName: 'Name',
    editable: false,
    filter: 'agTextColumnFilter',
  },
  {
    field: 'age',
    headerName: 'Age',
    editable: true,
    filter: 'agNumberColumnFilter',
    cellDataType: 'number',
  },
  {
    field: 'vegetarian',
    headerName: 'Vegetarian',
    editable: true,
    filter: 'agSetColumnFilter',
    cellDataType: 'boolean',
  },
];

export default function Home() {
  const gridRef = useRef<EditableGridHandle<DemoRow>>(null);
  const [changes, setChanges] = useState<ChangeState<Record<string, unknown>>>({});

  // Handle changes from the grid
  const handleChanges = (newChanges: ChangeState<Record<string, unknown>>) => {
    setChanges(newChanges);
  };

  const handleAddRow = () => {
    const name = window.prompt("Enter unique name for the new row:");
    
    if (!name) {
      alert("Name is required!");
      return;
    }

    if (!name.trim()) {
      alert("Name cannot be empty!");
      return;
    }

    // Check for duplicate names in the initial data
    const isDuplicate = INITIAL_DATA.some(row => row.name.toLowerCase() === name.toLowerCase());
    if (isDuplicate) {
      alert("A row with this name already exists!");
      return;
    }

    const newRow: DemoRow = {
      name: name.trim(),
      age: 0,
      vegetarian: false,
    };

    gridRef.current?.addRow(newRow);
  };

  const handleDeleteRows = () => {
    gridRef.current?.deleteSelectedRows();
  };

  const handleReset = () => {
    gridRef.current?.reset();
  };

  const handleToggleVegetarian = () => {
    gridRef.current?.modifySelectedRows((row) => {
      row.vegetarian = !row.vegetarian;
    });
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left Panel - Grid with Toolbar */}
      <div className="flex flex-col w-1/2 border-r border-gray-300">
        {/* Toolbar */}
        <div className="flex gap-2 p-4 bg-white border-b border-gray-300">
          <button
            onClick={handleAddRow}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
          >
            Add Row
          </button>
          <button
            onClick={handleDeleteRows}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Delete Rows
          </button>
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Reset
          </button>
          <button
            onClick={handleToggleVegetarian}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
          >
            Toggle Vegetarian
          </button>
        </div>

        {/* Grid */}
        <div className="flex-1 p-4 ag-theme-quartz">
          <EditableGrid
            ref={gridRef}
            rowData={INITIAL_DATA}
            columnDefs={COLUMN_DEFS}
            idField="name"
            onChange={handleChanges}
          />
        </div>
      </div>

      {/* Right Panel - JSON Diff Display */}
      <div className="flex flex-col w-1/2">
        <div className="p-4 bg-white border-b border-gray-300">
          <h2 className="text-xl font-semibold text-gray-800">Changes (Delta/Diff)</h2>
        </div>
        <div className="flex-1 overflow-auto p-4">
          <pre className="bg-gray-100 p-4 rounded text-sm font-mono">
            {JSON.stringify(changes, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
