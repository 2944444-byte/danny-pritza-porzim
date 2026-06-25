/**
 * rowFactory.js
 * -----------------------------------------------------------------------------
 * Helpers for creating and shaping table rows.
 *
 * Rows carry a private `_id` used as a stable React key and to track per-row
 * validation independent of array position. The `_id` is stripped before any
 * payload is sent to the backend (see `toBackendRows`).
 */

import { COLUMNS, COLUMN_KEYS } from '../config/columns.js';

let counter = 0;

/** Generate a process-unique row id (stable React key; never sent to backend). */
export function makeRowId() {
  counter += 1;
  return `row_${counter}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Create a blank row with every column key present and empty.
 * @returns {Record<string, unknown>}
 */
export function createEmptyRow() {
  const row = { _id: makeRowId() };
  for (const col of COLUMNS) row[col.key] = '';
  return row;
}

/**
 * Coerce an arbitrary object (e.g. from upload) into a well-formed row:
 * ensures every column key exists, fills missing with '', adds an `_id`.
 * @param {Record<string, unknown>} raw
 * @returns {Record<string, unknown>}
 */
export function toGridRow(raw) {
  const row = { _id: makeRowId() };
  for (const key of COLUMN_KEYS) {
    const value = raw?.[key];
    row[key] = value === undefined || value === null ? '' : value;
  }
  return row;
}

/**
 * Strip UI-only fields (`_id`) so the payload contains only backend keys.
 * @param {Array<Record<string, unknown>>} rows
 * @returns {Array<Record<string, unknown>>}
 */
export function toBackendRows(rows) {
  return rows.map(({ _id, ...rest }) => {
    const clean = {};
    for (const key of COLUMN_KEYS) clean[key] = rest[key] ?? '';
    return clean;
  });
}
