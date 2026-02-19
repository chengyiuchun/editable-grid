import '@testing-library/jest-dom';
import React from 'react';
import {act, render, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EditableGrid, {ChangeState, EditableGridHandle, RowModificationState} from '../components/EditableGrid';
import type {ColDef} from 'ag-grid-community';

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

interface TestRow extends Record<string, unknown> {
  id: string;
  name: string;
  score: number;
  active: boolean;
}

/** Returns a fresh array each time so mutation tests stay independent. */
function mockInitialData(): TestRow[] {
  return [
    { id: '1', name: 'Alice',   score: 28, active: true },
    { id: '2', name: 'Bob',     score: 35, active: false },
    { id: '3', name: 'Charlie', score: 42, active: true },
  ];
}

const mockColumnDefs: ColDef<TestRow>[] = [
  { field: 'name',   headerName: 'Name',   editable: false },
  { field: 'score',  headerName: 'Score',  editable: true, cellDataType: 'number' },
  { field: 'active', headerName: 'Active', editable: true, cellDataType: 'boolean' },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('EditableGrid', () => {

  describe('on initial load', () => {

    it('displays all rows from the provided data', async () => {
      const { container, getAllByRole } = render(
        <EditableGrid
          rowData={mockInitialData()}
          columnDefs={mockColumnDefs}
          idField="id"
        />
      );

      await waitForRows(getAllByRole, 3);

      expect(extractGridContent(container)).toEqual([
        ['', 'Name', 'Score', 'Active', ''],
        ['false', 'Alice',   '28', 'true',  ''],
        ['false', 'Bob',     '35', 'false', ''],
        ['false', 'Charlie', '42', 'true',  ''],
      ]);
    });

    it('renders empty initial data without errors', async () => {
      const { container, getAllByRole } = render(
        <EditableGrid
          rowData={[]}
          columnDefs={mockColumnDefs}
          idField="id"
        />
      );

      await waitForRows(getAllByRole, 0);

      expect(extractGridContent(container)).toEqual([
        ['', 'Name', 'Score', 'Active', ''],
      ]);
    });

  });

  describe('when a row is added', () => {

    const newRow: TestRow = { id: '4', name: 'Diana', score: 50, active: false };

    let container: HTMLElement;
    let getAllByRole: (role: string) => HTMLElement[];
    let onChangeMock: jest.Mock;
    let gridRef: React.RefObject<EditableGridHandle<TestRow> | null>;
    let initialData: TestRow[];

    beforeEach(async () => {
      initialData  = mockInitialData();
      onChangeMock = jest.fn<void, [ChangeState<Record<string, unknown>>]>();
      gridRef      = React.createRef<EditableGridHandle<TestRow>>();

      ({ container, getAllByRole } = render(
        <EditableGrid
          ref={gridRef}
          rowData={initialData}
          columnDefs={mockColumnDefs}
          idField="id"
          onChange={onChangeMock}
        />
      ));

      await waitForRows(getAllByRole, 3);

      act(() => { gridRef.current!.addRow(newRow); });

      await waitForRows(getAllByRole, 4);
    });

    it('appends the new row at the bottom of the grid', () => {
      expect(extractGridContent(container)).toEqual([
        ['', 'Name', 'Score', 'Active', ''],
        ['false', 'Alice',   '28', 'true',  ''],
        ['false', 'Bob',     '35', 'false', ''],
        ['false', 'Charlie', '42', 'true',  ''],
        ['false', 'Diana',   '50', 'false', 'Undo'],
      ]);
    });

    it('gives the new row a green background', () => {
      const dianaRows = getRowElements(container, 5);
      expect(dianaRows.length).toBeGreaterThan(0);
      dianaRows.forEach(row => expect(row).toHaveClass('!bg-green-100'));
    });

    it('reports the new row as "added" via onChange', () => {
      expect(onChangeMock).toHaveBeenLastCalledWith({
        '4': { type: RowModificationState.Added, data: newRow },
      });
    });

    it('does not mutate the original data array', () => {
      expect(initialData).toEqual(mockInitialData());
    });

    it('removes the added row and clears changes when its Undo button is clicked', async () => {
      await clickUndoForRow(container, 5);
      await waitForRows(getAllByRole, 3);
      expect(extractGridContent(container)).toEqual([
        ['', 'Name', 'Score', 'Active', ''],
        ['false', 'Alice',   '28', 'true',  ''],
        ['false', 'Bob',     '35', 'false', ''],
        ['false', 'Charlie', '42', 'true',  ''],
      ]);
      expect(onChangeMock).toHaveBeenLastCalledWith({});
    });

  });

  describe('when selected rows are deleted', () => {

    let container: HTMLElement;
    let getAllByRole: (role: string) => HTMLElement[];
    let onChangeMock: jest.Mock;
    let gridRef: React.RefObject<EditableGridHandle<TestRow> | null>;
    let initialData: TestRow[];

    beforeEach(async () => {
      initialData  = mockInitialData();
      onChangeMock = jest.fn<void, [ChangeState<Record<string, unknown>>]>();
      gridRef      = React.createRef<EditableGridHandle<TestRow>>();

      ({ container, getAllByRole } = render(
        <EditableGrid
          ref={gridRef}
          rowData={initialData}
          columnDefs={mockColumnDefs}
          idField="id"
          onChange={onChangeMock}
        />
      ));

      await waitForRows(getAllByRole, 3);

      // Select Bob's row and delete it
      await selectRowAt(container, 3);
      act(() => { gridRef.current!.deleteSelectedRows(); });
    });

    it('keeps the deleted row visible in the grid', () => {
      expect(extractGridContent(container)).toEqual([
        ['', 'Name', 'Score', 'Active', ''],
        ['false', 'Alice',   '28', 'true',  ''],
        ['false', 'Bob',     '35', 'false', 'Undo'],
        ['false', 'Charlie', '42', 'true',  ''],
      ]);
    });

    it('gives the deleted row a red background', () => {
      const bobRows = getRowElements(container, 3);
      expect(bobRows.length).toBeGreaterThan(0);
      bobRows.forEach(row => expect(row).toHaveClass('!bg-red-100'));
    });

    it('applies line-through styling to the deleted row cells', () => {
      const bobValueCells = getValueCells(container, 3);
      expect(bobValueCells.length).toBeGreaterThan(0);
      bobValueCells.forEach(cell => expect(cell).toHaveClass('line-through'));
    });

    it('reports the row as "deleted" via onChange', () => {
      expect(onChangeMock).toHaveBeenLastCalledWith({
        '2': { type: RowModificationState.Deleted, data: null },
      });
    });

    it('does not mutate the original data array', () => {
      expect(initialData).toEqual(mockInitialData());
    });

    it('restores the deleted row to its original state when its Undo button is clicked', async () => {
      await clickUndoForRow(container, 3);
      await waitFor(() => {
        expect(extractGridContent(container)[2][4]).toBe('');
      });
      expect(extractGridContent(container)).toEqual([
        ['', 'Name', 'Score', 'Active', ''],
        ['false', 'Alice',   '28', 'true',  ''],
        ['false', 'Bob',     '35', 'false', ''],
        ['false', 'Charlie', '42', 'true',  ''],
      ]);
      expect(onChangeMock).toHaveBeenLastCalledWith({});
    });

  });

  describe('when selected rows are modified programmatically', () => {

    let container: HTMLElement;
    let getAllByRole: (role: string) => HTMLElement[];
    let onChangeMock: jest.Mock;
    let gridRef: React.RefObject<EditableGridHandle<TestRow> | null>;
    let initialData: TestRow[];

    beforeEach(async () => {
      initialData  = mockInitialData();
      onChangeMock = jest.fn<void, [ChangeState<Record<string, unknown>>]>();
      gridRef      = React.createRef<EditableGridHandle<TestRow>>();

      ({ container, getAllByRole } = render(
        <EditableGrid
          ref={gridRef}
          rowData={initialData}
          columnDefs={mockColumnDefs}
          idField="id"
          onChange={onChangeMock}
        />
      ));

      await waitForRows(getAllByRole, 3);

      // Select Alice's row and update her score to 99
      await selectRowAt(container, 2);
      act(() => {
        gridRef.current!.modifySelectedRows((row) => {
          (row as TestRow).score = 99;
        });
      });
    });

    it('updates the displayed value in the grid immediately', async () => {
      expect(extractGridContent(container)).toEqual([
        ['', 'Name', 'Score', 'Active', ''],
        ['true',  'Alice',   '99', 'true',  'Undo'],
        ['false', 'Bob',     '35', 'false', ''],
        ['false', 'Charlie', '42', 'true',  ''],
      ]);
    });

    it('gives the modified row a yellow background', () => {
      const aliceRows = getRowElements(container, 2);
      expect(aliceRows.length).toBeGreaterThan(0);
      aliceRows.forEach(row => expect(row).toHaveClass('!bg-yellow-100'));
    });

    it('reports the updated row as "modified" via onChange', () => {
      expect(onChangeMock).toHaveBeenLastCalledWith({
        '1': {
          type: RowModificationState.Modified,
          data: { id: '1', name: 'Alice', score: 99, active: true },
        },
      });
    });

    it('does not mutate the original data array', () => {
      expect(initialData).toEqual(mockInitialData());
    });

    it('reverts the modified row to its original values when its Undo button is clicked', async () => {
      await clickUndoForRow(container, 2);
      await waitFor(() => {
        expect(extractGridContent(container)[1][4]).toBe('');
      });
      expect(extractGridContent(container)).toEqual([
        ['', 'Name', 'Score', 'Active', ''],
        ['true',  'Alice',   '28', 'true',  ''],  // row remains selected after undo
        ['false', 'Bob',     '35', 'false', ''],
        ['false', 'Charlie', '42', 'true',  ''],
      ]);
      expect(onChangeMock).toHaveBeenLastCalledWith({});
    });

  });

  describe('when a user edits a cell directly in the grid', () => {

    let container: HTMLElement;
    let getAllByRole: (role: string) => HTMLElement[];
    let onChangeMock: jest.Mock;
    let gridRef: React.RefObject<EditableGridHandle<TestRow> | null>;
    let initialData: TestRow[];

    beforeEach(async () => {
      initialData  = mockInitialData();
      onChangeMock = jest.fn<void, [ChangeState<Record<string, unknown>>]>();
      gridRef      = React.createRef<EditableGridHandle<TestRow>>();

      ({ container, getAllByRole } = render(
        <EditableGrid
          ref={gridRef}
          rowData={initialData}
          columnDefs={mockColumnDefs}
          idField="id"
          onChange={onChangeMock}
        />
      ));

      await waitForRows(getAllByRole, 3);

      // Double-click Alice's Score cell, type 98, confirm with Enter
      const aliceScoreCell = container.querySelector<HTMLElement>(
        '[role="row"][aria-rowindex="2"] [col-id="score"]'
      );
      expect(aliceScoreCell).not.toBeNull();

      await userEvent.dblClick(aliceScoreCell!);

      const input = aliceScoreCell!.querySelector<HTMLInputElement>('input');
      expect(input).not.toBeNull();

      await userEvent.clear(input!);
      await userEvent.type(input!, '98');
      await userEvent.keyboard('{Enter}');

      // Wait for the grid to settle before any assertion runs
      await waitFor(() => {
        expect(extractGridContent(container)[1][4]).toBe('Undo');
      });
    });

    it('updates the displayed value after the edit is confirmed', () => {
      expect(extractGridContent(container)).toEqual([
        ['', 'Name', 'Score', 'Active', ''],
        ['false', 'Alice',   '98', 'true',  'Undo'],
        ['false', 'Bob',     '35', 'false', ''],
        ['false', 'Charlie', '42', 'true',  ''],
      ]);
    });

    it('gives the edited row a yellow background', () => {
      const aliceRows = getRowElements(container, 2);
      expect(aliceRows.length).toBeGreaterThan(0);
      aliceRows.forEach(row => expect(row).toHaveClass('!bg-yellow-100'));
    });

    it('reports the updated row as "modified" via onChange', () => {
      expect(onChangeMock).toHaveBeenLastCalledWith({
        '1': {
          type: RowModificationState.Modified,
          data: { id: '1', name: 'Alice', score: 98, active: true },
        },
      });
    });

    it('does not mutate the original data array', () => {
      expect(initialData).toEqual(mockInitialData());
    });

    it('reverts the edited cell to its original value when its row Undo button is clicked', async () => {
      await clickUndoForRow(container, 2);
      await waitFor(() => {
        expect(extractGridContent(container)[1][4]).toBe('');
      });
      expect(extractGridContent(container)).toEqual([
        ['', 'Name', 'Score', 'Active', ''],
        ['false', 'Alice',   '28', 'true',  ''],
        ['false', 'Bob',     '35', 'false', ''],
        ['false', 'Charlie', '42', 'true',  ''],
      ]);
      expect(onChangeMock).toHaveBeenLastCalledWith({});
    });

  });

  describe('when a row is added then deleted', () => {

    const newRow: TestRow = { id: '4', name: 'Diana', score: 50, active: false };

    it('clears changes and reports an empty change set', async () => {
      const onChangeMock = jest.fn<void, [ChangeState<Record<string, unknown>>]>();
      const gridRef = React.createRef<EditableGridHandle<TestRow>>();

      const { container, getAllByRole } = render(
          <EditableGrid
              ref={gridRef}
              rowData={mockInitialData()}
              columnDefs={mockColumnDefs}
              idField="id"
              onChange={onChangeMock}
          />
      );

      await waitForRows(getAllByRole, 3);

      act(() => { gridRef.current!.addRow(newRow); });
      await waitForRows(getAllByRole, 4);

      await selectRowAt(container, 5);
      act(() => { gridRef.current!.deleteSelectedRows(); });

      await waitForRows(getAllByRole, 3);

      expect(onChangeMock).toHaveBeenLastCalledWith({});
    });

  });

  describe('when a row is added then modified', () => {

    const newRow: TestRow = { id: '4', name: 'Diana', score: 50, active: false };

    it('keeps the row as added with the latest values', async () => {
      const onChangeMock = jest.fn<void, [ChangeState<Record<string, unknown>>]>();
      const gridRef = React.createRef<EditableGridHandle<TestRow>>();

      const { container, getAllByRole } = render(
          <EditableGrid
              ref={gridRef}
              rowData={mockInitialData()}
              columnDefs={mockColumnDefs}
              idField="id"
              onChange={onChangeMock}
          />
      );

      await waitForRows(getAllByRole, 3);

      act(() => { gridRef.current!.addRow(newRow); });
      await waitForRows(getAllByRole, 4);

      await selectRowAt(container, 5);
      act(() => {
        gridRef.current!.modifySelectedRows((row) => {
          (row as TestRow).score = 77;
        });
      });

      await waitFor(() => {
        expect(onChangeMock).toHaveBeenLastCalledWith({
          '4': {
            type: RowModificationState.Added,
            data: { id: '4', name: 'Diana', score: 77, active: false },
          },
        });
      });
    });

  });

  describe('when a user edits a cell back to its original value', () => {

    it('clears the change set after reverting inline edits', async () => {
      const onChangeMock = jest.fn<void, [ChangeState<Record<string, unknown>>]>();

      const { container, getAllByRole } = render(
        <EditableGrid
          rowData={mockInitialData()}
          columnDefs={mockColumnDefs}
          idField="id"
          onChange={onChangeMock}
        />
      );

      await waitForRows(getAllByRole, 3);

      const aliceScoreCell = container.querySelector<HTMLElement>(
        '[role="row"][aria-rowindex="2"] [col-id="score"]'
      );
      expect(aliceScoreCell).not.toBeNull();

      await userEvent.dblClick(aliceScoreCell!);
      const input = aliceScoreCell!.querySelector<HTMLInputElement>('input');
      expect(input).not.toBeNull();

      await userEvent.clear(input!);
      await userEvent.type(input!, '30');
      await userEvent.keyboard('{Enter}');

      await waitFor(() => {
        expect(extractGridContent(container)[1][4]).toBe('Undo');
      });

      await userEvent.dblClick(aliceScoreCell!);
      const inputSecond = aliceScoreCell!.querySelector<HTMLInputElement>('input');
      expect(inputSecond).not.toBeNull();

      await userEvent.clear(inputSecond!);
      await userEvent.type(inputSecond!, '28');
      await userEvent.keyboard('{Enter}');

      await waitFor(() => {
        expect(extractGridContent(container)[1][4]).toBe('');
      });

      expect(onChangeMock).toHaveBeenLastCalledWith({});
    });

  });

  describe('when no rows are selected', () => {

    it('treats deleteSelectedRows and modifySelectedRows as no-ops', async () => {
      const onChangeMock = jest.fn<void, [ChangeState<Record<string, unknown>>]>();
      const gridRef = React.createRef<EditableGridHandle<TestRow>>();

      const { getAllByRole } = render(
        <EditableGrid
          ref={gridRef}
          rowData={mockInitialData()}
          columnDefs={mockColumnDefs}
          idField="id"
          onChange={onChangeMock}
        />
      );

      await waitForRows(getAllByRole, 3);

      act(() => {
        gridRef.current!.deleteSelectedRows();
        gridRef.current!.modifySelectedRows((row) => {
          (row as TestRow).score = 123;
        });
      });

      expect(onChangeMock).toHaveBeenLastCalledWith({});
    });

  });

  describe('when all three edit types are applied together (add, delete, modify)', () => {

    const newRow: TestRow = { id: '4', name: 'Diana', score: 50, active: false };

    let container: HTMLElement;
    let getAllByRole: (role: string) => HTMLElement[];
    let onChangeMock: jest.Mock;
    let gridRef: React.RefObject<EditableGridHandle<TestRow> | null>;
    let initialData: TestRow[];

    beforeEach(async () => {
      initialData  = mockInitialData();
      onChangeMock = jest.fn<void, [ChangeState<Record<string, unknown>>]>();
      gridRef      = React.createRef<EditableGridHandle<TestRow>>();

      ({ container, getAllByRole } = render(
        <EditableGrid
          ref={gridRef}
          rowData={initialData}
          columnDefs={mockColumnDefs}
          idField="id"
          onChange={onChangeMock}
        />
      ));

      await waitForRows(getAllByRole, 3);

      // 1. Add a new row (Diana)
      act(() => { gridRef.current!.addRow(newRow); });
      await waitForRows(getAllByRole, 4);

      // 2. Select Bob (rowindex 3) and delete him
      await selectRowAt(container, 3);
      act(() => { gridRef.current!.deleteSelectedRows(); });

      // 3. Select Alice (rowindex 2) and modify her score programmatically
      await selectRowAt(container, 2);
      act(() => {
        gridRef.current!.modifySelectedRows((row) => {
          (row as TestRow).score = 99;
        });
      });

      // Wait until Alice's Undo button is visible before any assertion runs
      await waitFor(() => {
        expect(extractGridContent(container)[1][4]).toBe('Undo');
      });
    });

    it('reflects all three edits in the grid simultaneously', () => {
      expect(extractGridContent(container)).toEqual([
        ['', 'Name', 'Score', 'Active', ''],
        ['true',  'Alice',   '99', 'true',  'Undo'], // modified (selected, yellow)
        ['false', 'Bob',     '35', 'false', 'Undo'], // deleted (red, strike-through)
        ['false', 'Charlie', '42', 'true',  ''],     // unchanged
        ['false', 'Diana',   '50', 'false', 'Undo'], // added (green)
      ]);
    });

    it('applies the correct row background colours for each edit type', () => {
      const aliceRows  = getRowElements(container, 2);
      const bobRows    = getRowElements(container, 3);
      const dianaRows  = getRowElements(container, 5);

      aliceRows.forEach(row  => expect(row).toHaveClass('!bg-yellow-100'));
      bobRows.forEach(row    => expect(row).toHaveClass('!bg-red-100'));
      dianaRows.forEach(row  => expect(row).toHaveClass('!bg-green-100'));
    });

    it('reports all three edits in a single onChange payload', () => {
      expect(onChangeMock).toHaveBeenLastCalledWith({
        '1': { type: RowModificationState.Modified, data: { id: '1', name: 'Alice', score: 99, active: true } },
        '2': { type: RowModificationState.Deleted,  data: null },
        '4': { type: RowModificationState.Added,    data: newRow },
      });
    });

    it('does not mutate the original data array', () => {
      expect(initialData).toEqual(mockInitialData());
    });

    it('reverts the grid to its original state when reset is called', async () => {
      act(() => { gridRef.current!.reset(); });
      await waitForRows(getAllByRole, 3);
      expect(extractGridContent(container)).toEqual([
        ['', 'Name', 'Score', 'Active', ''],
        ['true', 'Alice',   '28', 'true',  ''],
        ['false', 'Bob',     '35', 'false', ''],
        ['false', 'Charlie', '42', 'true',  ''],
      ]);
      expect(onChangeMock).toHaveBeenLastCalledWith({});
    });

  });

});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * AG Grid splits pinned and non-pinned columns into separate DOM row elements
 * sharing the same aria-rowindex. Groups them by aria-rowindex and merges
 * their cells (sorted by aria-colindex) into one logical row, producing a
 * 2-D array of [headers, ...dataRows].
 */
function extractGridContent(container: HTMLElement): string[][] {
  const allRows = Array.from(container.querySelectorAll('[role="row"]'));

  const byRowIndex = new Map<string, Element[]>();
  for (const row of allRows) {
    const idx = row.getAttribute('aria-rowindex') ?? '';
    if (!byRowIndex.has(idx)) byRowIndex.set(idx, []);
    byRowIndex.get(idx)!.push(row);
  }

  const sortedRowGroups = [...byRowIndex.entries()]
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([, rows]) => rows);

  return sortedRowGroups.map(rowGroup => {
    const allCells: { colIndex: number; text: string }[] = [];

    for (const row of rowGroup) {
      const headerCells = Array.from(row.querySelectorAll('[role="columnheader"]'));
      const gridCells   = Array.from(row.querySelectorAll('[role="gridcell"]'));

      for (const cell of [...headerCells, ...gridCells]) {
        const colIndex = Number(cell.getAttribute('aria-colindex'));
        const isHeader = cell.getAttribute('role') === 'columnheader';
        const checkbox = !isHeader
          ? cell.querySelector<HTMLInputElement>('input[type="checkbox"]')
          : null;
        const text = checkbox
          ? String(checkbox.checked)
          : (cell.textContent?.trim() ?? '');
        allCells.push({ colIndex, text });
      }
    }

    return allCells
      .sort((a, b) => a.colIndex - b.colIndex)
      .map(c => c.text);
  });
}

/** Waits until all three initial data rows have been rendered by AG Grid. */
async function waitForRows(getAllByRole: (role: string) => HTMLElement[], count: number) {
  await waitFor(() => {
    const dataRows = getAllByRole('row').filter(
      r => Number((r as Element).getAttribute('aria-rowindex')) >= 2
    );
    expect(dataRows).toHaveLength(count * 2); // 2 DOM elements (pinned + scrollable)
  });
}

/** Clicks the row-selection checkbox for the given aria-rowindex. */
async function selectRowAt(container: HTMLElement, ariaRowIndex: number) {
  const checkboxes = container.querySelectorAll<HTMLInputElement>(
    `[role="row"][aria-rowindex="${ariaRowIndex}"] input[type="checkbox"]`
  );
  expect(checkboxes.length).toBeGreaterThan(0);
  await userEvent.click(checkboxes[0]);
}

/** Returns all DOM row elements for the given aria-rowindex. */
function getRowElements(container: HTMLElement, ariaRowIndex: number): Element[] {
  return Array.from(
    container.querySelectorAll(`[role="row"][aria-rowindex="${ariaRowIndex}"]`)
  );
}

/** Returns value-bearing gridcells (those with ag-cell-value) for a given aria-rowindex. */
function getValueCells(container: HTMLElement, ariaRowIndex: number): Element[] {
  return Array.from(
    container.querySelectorAll(
      `[role="row"][aria-rowindex="${ariaRowIndex}"] [role="gridcell"].ag-cell-value`
    )
  );
}

/** Finds and clicks the Undo button within the row at the given aria-rowindex. */
async function clickUndoForRow(container: HTMLElement, ariaRowIndex: number) {
  const undoButton = Array.from(
    container.querySelectorAll<HTMLElement>(
      `[role="row"][aria-rowindex="${ariaRowIndex}"] button`
    )
  ).find(btn => btn.textContent?.trim() === 'Undo');
  expect(undoButton).not.toBeNull();
  await userEvent.click(undoButton!);
}
