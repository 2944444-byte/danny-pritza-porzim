/**
 * rowFactory.ts
 * -----------------------------------------------------------------------------
 * Helpers for creating and shaping table rows.
 *
 * Rows carry a private `_id` used as a stable React key and to track per-row
 * validation independent of array position. The `_id` is stripped before any
 * payload is sent to the backend (see `toBackendRows`).
 */

import { COLUMNS, COLUMN_KEYS } from '../config/columns';
import type { BackendRow, CellValue, GridRow } from '../types';

let counter = 0;

/** Generate a process-unique row id (stable React key; never sent to backend). */
export function makeRowId(): string {
  counter += 1;
  return `row_${counter}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Coerce an arbitrary value into a CellValue (string | number). */
function coerce(value: unknown): CellValue {
  if (value === null || value === undefined) return '';
  return typeof value === 'number' ? value : String(value);
}

/** Create a blank row with every column key present and empty. */
export function createEmptyRow(): GridRow {
  const row: GridRow = { _id: makeRowId() };
  for (const col of COLUMNS) row[col.key] = '';
  return row;
}

/**
 * Coerce an arbitrary object (e.g. from upload) into a well-formed row: ensures
 * every column key exists, fills missing with '', adds an `_id`.
 */
export function toGridRow(raw: Record<string, unknown>): GridRow {
  const row: GridRow = { _id: makeRowId() };
  for (const key of COLUMN_KEYS) row[key] = coerce(raw?.[key]);
  return row;
}

/** Strip UI-only fields (`_id`) so the payload contains only backend keys. */
export function toBackendRows(rows: GridRow[]): BackendRow[] {
  return rows.map((row) => {
    const clean: BackendRow = {};
    for (const key of COLUMN_KEYS) clean[key] = row[key] ?? '';
    return clean;
  });
}
