# Editable Grid Project - AI Agent Instructions

## Project Overview

Next.js 16 app (React 19) for building an **EditableGrid component** demo using **AG-Grid Community Edition**. The core component is NOT yet implemented—it's defined in [requirements.md](../requirements.md) as a schema-agnostic, immutable-data-overlay grid with change tracking.

**Tech Stack:** Next.js App Router, TypeScript (strict mode), Tailwind CSS v4, Jest + React Testing Library

## Architecture & Critical Patterns

### EditableGrid Component (To Be Implemented)

**Location:** Component doesn't exist yet—create in `app/components/EditableGrid.tsx`  
**Key Architecture Decision:** Never mutate the `rowData` prop. All edits (add/modify/delete) are tracked as a delta/overlay in component state.

```typescript
// Expected component signature (from requirements.md)
interface EditableGridProps<T> {
  rowData: T[];
  columnDefs: ColDef[];
  idField: keyof T;  // TypeScript validates this is a valid key
  ref: React.RefObject<EditableGridHandle<T>>;
}

interface EditableGridHandle<T> {
  addRow(row: T): void;
  deleteSelectedRows(): void;
  reset(): void;
  modifySelectedRows(callback: (row: T) => T): void;
}

// Change tracking state structure
interface ChangeState<T> {
  added: T[];      // Full row objects
  modified: T[];   // Full row objects with changes
  deleted: ID[];   // Only IDs, not full objects
}
```

**State Priority for Visual Indicators:** deleted > added > edited (see [requirements.md#L147-L154](../requirements.md#L147-L154))

### Demo Page Implementation

**Location:** [app/page.tsx](../app/page.tsx) (currently boilerplate—replace entirely)  
**Layout:** 50% grid panel + 50% JSON diff panel (side-by-side)  
**Demo Data:** 10 rows of `{ name: string, age: number, vegetarian: boolean }` where `name` is the unique `idField`

**Toolbar Buttons:**
1. **Add Row:** Use `window.prompt()` for name, default values (age=0, vegetarian=false)
2. **Delete Rows:** Calls `gridRef.current.deleteSelectedRows()`
3. **Reset:** Calls `gridRef.current.reset()`

## Development Workflow

### Build & Run
```bash
npm run dev           # Dev server on localhost:3000
npm run build         # Production build
npm run test          # Run Jest tests
npm run lint          # ESLint (flat config)
```

### Testing Requirements
- Use Jest with `jsdom` environment ([jest.config.ts](../jest.config.ts))
- Import `@testing-library/jest-dom` in all test files
- Tests go in `app/__tests__/` or colocated `*.test.tsx` files
- Example: [app/__tests__/page.test.jsx](../app/__tests__/page.test.jsx)
- **Required Coverage** (see [requirements.md#L203-L217](../requirements.md#L203-L217)): data immutability, edit/add/delete operations, undo, visual indicators, column editability

## Project-Specific Conventions

### TypeScript Configuration
- **Strict mode enabled** ([tsconfig.json#L7](../tsconfig.json#L7))
- **Path alias:** `@/*` maps to project root—use `@/app/components/EditableGrid` not relative paths
- **JSX:** React 19 uses `react-jsx` (not `preserve`)

### Styling with Tailwind v4
- **New syntax:** Use `@import "tailwindcss"` in [app/globals.css](../app/globals.css#L1)
- **Theme variables:** Custom properties via `@theme inline` block (see [app/globals.css#L7-L12](../app/globals.css#L7-L12))
- **PostCSS:** Uses `@tailwindcss/postcss` plugin ([postcss.config.mjs](../postcss.config.mjs))

### Component Structure Best Practices
1. **React 19 patterns:** Functional components with `forwardRef` for imperative handles (EditableGrid needs this)
2. **Deep comparison:** Use `JSON.stringify` or deep-equal library to detect actual changes in `modifySelectedRows` (see [requirements.md#L38-L40](../requirements.md#L38-L40))
3. **Client components:** EditableGrid must use `"use client"` directive (AG-Grid requires browser APIs)

## Key External Dependencies

**Not Yet Installed (CRITICAL):**  
The project currently has NO AG-Grid dependencies. Before implementing EditableGrid:
```bash
npm install ag-grid-react ag-grid-community
```

## File Organization

- `app/page.tsx` - Demo page container (replace boilerplate)
- `app/components/` - Create this directory for EditableGrid component
- `app/__tests__/` - Test files (existing structure)
- `requirements.md` - **Source of truth** for all component specs (239 lines)

## Common Pitfalls

1. **Don't mutate rowData prop directly** - Track changes in separate state, apply as overlay
2. **AG-Grid license** - Use Community Edition only (no Enterprise features)
3. **React 19 updates** - Some testing patterns changed; check [Testing Library docs](https://testing-library.com/docs/react-testing-library/intro)
4. **Tailwind v4 migration** - Old `tailwind.config.js` patterns don't work; use CSS-based config
