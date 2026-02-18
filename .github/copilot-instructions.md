# Editable Grid Project - AI Agent Instructions

## Project Overview

Next.js 16 app (React 19) implementing an **EditableGrid component** demo using **AG-Grid Community Edition**. The component is a fully-functional, schema-agnostic, immutable-data-overlay grid with visual change tracking and undo capabilities.

**Tech Stack:** Next.js App Router, TypeScript (strict mode), Tailwind CSS v4, Jest + React Testing Library, Playwright (E2E)

## Architecture & Critical Patterns

### EditableGrid Component (IMPLEMENTED)

**Location:** [app/components/EditableGrid.tsx](../app/components/EditableGrid.tsx)  
**Key Architecture:** Immutable data pattern—original `rowData` prop never mutated. All modifications tracked as delta/overlay in component state via `ChangeState<T>`.

```typescript
// Component exposes imperative handle via forwardRef
interface EditableGridHandle<T> {
  addRow(row: T): void;
  deleteSelectedRows(): void;
  reset(): void;
  modifySelectedRows(callback: (row: T) => T): void;
  getChanges(): ChangeState<T>;  // Synchronous access to current changes
}

// Change tracking state
interface ChangeState<T> {
  added: T[];          // Full row objects for new rows
  modified: T[];       // Full row objects with modifications
  deleted: (string | number)[];  // Only IDs of deleted rows
}
```

**Critical Implementation Details:**
1. **Dual state management:** Changes stored in both React state (for rendering) and `useRef` (for synchronous `getChanges()` access)
2. **effectiveRowData calculation:** Merges original `rowData` + modified rows + added rows (deleted rows remain visible but styled)
3. **Deep comparison:** Uses `JSON.stringify()` for object equality checks in `modifySelectedRows` to detect actual changes
4. **Row state priority:** deleted > added > modified (affects visual indicators—see line 113)
5. **Undo column:** Auto-prepended pinned left column with undo buttons (only visible on changed rows)

### Demo Page Implementation

**Location:** [app/page.tsx](../app/page.tsx)  
**Layout:** 50/50 split—grid panel (left) + JSON diff viewer (right)  
**Demo Schema:** `{ name: string, age: number, vegetarian: boolean }` where `name` is `idField`

**Toolbar Actions:**
- **Add Row:** `window.prompt()` for name (validates duplicates), creates row with defaults (age=0, vegetarian=false)
- **Delete Rows:** Marks selected rows as deleted (keeps visible with red background + strike-through)
- **Reset:** Clears all changes, returns to initial 10-row dataset

## Development Workflow

### Running the App
```bash
npm run dev              # Dev server on localhost:3000
npm run build            # Production build (validates TypeScript)
npm run start            # Serve production build
```

### Testing Strategy (Dual-Layer)

**Jest (Unit/Integration)** - Run with `npm test`
- Location: `app/__tests__/EditableGrid.test.tsx` (711 lines)
- Environment: `jsdom` (see [jest.config.ts](../jest.config.ts#L172))
- **CRITICAL:** Jest ignores `/tests/`, `/test-results/`, `/playwright-report/` directories (lines 110-115)
- Coverage: Component logic, state management, change tracking, visual indicators
- Pattern: Uses custom `EditableGridTestWrapper` with `forwardRef` for imperative handle testing
- **NEVER** use `npx jest` to run the tests

**Playwright (E2E)** - Run with `npm run playwright:test`
- Location: `tests/editable-grid.spec.ts` (532 lines)
- Tests real browser interactions, cell editing, visual styling (RGB color validation)
- Must run dev server first (`npm run dev`)
- UI mode: `npm run playwright:test:ui` for interactive debugging

### Testing Anti-Patterns to Avoid
1. **Don't run Playwright tests with Jest** - Jest config explicitly excludes `/tests/` directory
2. **Suppress act() warnings carefully** - Test file shows pattern for imperative API testing (lines 9-22)
3. **Wait for AG-Grid rendering** - Use `await waitFor()` for async grid operations (see test line 70+)

## Project-Specific Conventions

### TypeScript Patterns
- **Strict mode enabled** - All type assertions must be valid
- **Generic constraints:** `T extends Record<string, unknown>` for row data (allows any object shape)
- **Path alias:** `@/*` = project root (e.g., `@/app/components/EditableGrid`)
- **idField validation:** `keyof T` ensures field exists in row type

### Styling with Tailwind v4 (CSS-Based Config)
- **Config location:** [app/globals.css](../app/globals.css) NOT `tailwind.config.js`
- **Import syntax:** `@import "tailwindcss"` (line 1)
- **Theme customization:** Use `@theme inline { ... }` block (lines 8-12)
- **PostCSS plugin:** `@tailwindcss/postcss` in [postcss.config.mjs](../postcss.config.mjs)

### AG-Grid Integration
- **Module registration:** `ModuleRegistry.registerModules([AllCommunityModule])` required before use
- **Styling:** Import `ag-grid-community/styles/ag-theme-quartz.css` + apply `.ag-theme-quartz` class to container
- **Row styling:** Use `getRowStyle` callback for dynamic backgrounds (see EditableGrid line 350+)
- **Cell editing:** Configure `editable: true/false` per column in `columnDefs`

## Key Implementation Files

- `app/components/EditableGrid.tsx` - Main component (453 lines, fully implemented)
- `app/page.tsx` - Demo page with toolbar + split-panel layout
- `requirements.md` - **Complete spec** (239 lines, all requirements met)
- `app/__tests__/EditableGrid.test.tsx` - Jest tests (711 lines)
- `tests/editable-grid.spec.ts` - Playwright E2E tests (532 lines)

## Common Pitfalls

1. **Original data mutation:** Use `deepClone()` before passing to callbacks (EditableGrid line 52)
2. **Change state synchronization:** Update both `changesRef.current` AND `setChanges()` for consistency
3. **Row state calculation:** Always check deleted > added > modified priority (line 113)
4. **AG-Grid API access:** Store `gridApi` in state via `onGridReady` callback before calling methods
5. **Test isolation:** Playwright tests require dev server running; Jest tests are self-contained
6. **Tailwind v4 migration:** Can't use old `tailwind.config.js`—must use CSS `@theme` syntax
