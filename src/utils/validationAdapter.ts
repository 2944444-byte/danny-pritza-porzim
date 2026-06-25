/**
 * validationAdapter.ts
 * -----------------------------------------------------------------------------
 * Translates whatever shape `/validate-table` returns into ONE normalized form:
 *
 *     { isValid, cellErrors: { [rowIndex]: { [columnKey]: string } }, errorCount }
 *
 * Why an adapter? The backend's response shape can vary. Rather than couple the
 * UI to one guess, this accepts the common shapes and converts them. Extend
 * `normalizeValidation` here if your backend returns something else.
 *
 * Supported input shapes
 *  A) { errors: [ { row, column, message|error } ] }  (or a bare array)
 *  B) [ { phone_number: "error", office_name: null }, ... ]  (per-row maps)
 *  C) { errors: { "0": { phone_number: "error" } } }  (index-keyed object)
 *  D) { valid: true } / { is_valid: false }  (validity flag, no detail)
 */

import { COLUMN_KEYS } from '../config/columns';
import type { NormalizedValidation } from '../types';

const ROW_KEYS = ['row', 'row_index', 'rowIndex', 'index', 'r'];
const COL_KEYS = ['column', 'col', 'field', 'key', 'name'];
const MSG_KEYS = ['message', 'error', 'detail', 'msg', 'reason'];

/** Narrow an unknown value to a plain record. */
function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** Read the first present key from a list, returning undefined if none match. */
function pick(obj: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null) return obj[k];
  }
  return undefined;
}

export function normalizeValidation(response: unknown): NormalizedValidation {
  const cellErrors: Record<number, Record<string, string>> = {};

  const addError = (rowIndex: unknown, columnKey: unknown, message: unknown): void => {
    const idx = Number(rowIndex);
    if (!Number.isInteger(idx) || !columnKey) return;
    const key = String(columnKey);
    if (!cellErrors[idx]) cellErrors[idx] = {};
    cellErrors[idx][key] = String(message || 'Invalid value.');
  };

  const root = asRecord(response);
  // Unwrap a top-level { errors: ... } / { error: ... } envelope.
  const payload: unknown = root ? (root.errors ?? root.error ?? response) : response;

  if (Array.isArray(payload)) {
    // Could be shape A (error objects) or shape B (per-row maps).
    const looksLikeErrorObjects = payload.some((item) => {
      const rec = asRecord(item);
      return rec !== null && (pick(rec, COL_KEYS) !== undefined || pick(rec, ROW_KEYS) !== undefined);
    });

    if (looksLikeErrorObjects) {
      // Shape A
      payload.forEach((item, i) => {
        const rec = asRecord(item);
        if (!rec) return;
        const rowIndex = pick(rec, ROW_KEYS) ?? i;
        addError(rowIndex, pick(rec, COL_KEYS), pick(rec, MSG_KEYS));
      });
    } else {
      // Shape B: array index == row index, values are per-column messages.
      payload.forEach((rowMap, rowIndex) => {
        const rec = asRecord(rowMap);
        if (!rec) return;
        for (const colKey of Object.keys(rec)) {
          const message = rec[colKey];
          if (message && String(message).trim()) addError(rowIndex, colKey, message);
        }
      });
    }
  } else {
    const rec = asRecord(payload);
    if (rec) {
      // Shape C: { "0": { col: msg } } — or a plain validity flag (shape D).
      for (const rowKey of Object.keys(rec)) {
        const rowMap = asRecord(rec[rowKey]);
        if (rowMap) {
          for (const colKey of Object.keys(rowMap)) {
            const message = rowMap[colKey];
            if (message && String(message).trim()) addError(rowKey, colKey, message);
          }
        }
      }
    }
  }

  const errorCount = Object.values(cellErrors).reduce(
    (sum, row) => sum + Object.keys(row).length,
    0,
  );

  // Respect an explicit validity flag when present and no per-cell errors found.
  const explicitFlag = root
    ? (root.is_valid ?? root.isValid ?? root.valid)
    : undefined;

  const isValid = errorCount === 0 && explicitFlag !== false;

  return { isValid, cellErrors, errorCount };
}

/**
 * Drop any cell errors whose column key isn't a real column, so a backend typo
 * can't produce a permanently "red" but invisible cell.
 */
export function pruneUnknownColumns(normalized: NormalizedValidation): NormalizedValidation {
  const known = new Set(COLUMN_KEYS);
  const cellErrors: Record<number, Record<string, string>> = {};
  for (const [rowIndex, row] of Object.entries(normalized.cellErrors)) {
    for (const [colKey, msg] of Object.entries(row)) {
      if (known.has(colKey)) {
        const idx = Number(rowIndex);
        if (!cellErrors[idx]) cellErrors[idx] = {};
        cellErrors[idx][colKey] = msg;
      }
    }
  }
  const errorCount = Object.values(cellErrors).reduce(
    (s, r) => s + Object.keys(r).length,
    0,
  );
  return { ...normalized, cellErrors, errorCount, isValid: normalized.isValid && errorCount === 0 };
}
