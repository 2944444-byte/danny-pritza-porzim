/**
 * validationAdapter.js
 * -----------------------------------------------------------------------------
 * Translates whatever shape `/validate-table` returns into ONE normalized form
 * the UI understands:
 *
 *     { isValid: boolean, cellErrors: { [rowIndex]: { [columnKey]: string } } }
 *
 * Why an adapter? The backend's `schema_manager.validate_table` was not provided,
 * so its exact response shape is unknown. Rather than couple the UI to a guess,
 * this module accepts the common shapes and converts them. If your backend uses
 * a shape not handled here, this is the single, well-documented place to extend.
 *
 * Supported input shapes
 * ----------------------
 *  A) List of error objects (most common):
 *       { errors: [ { row: 0, column: "phone_number", message|error: "..." } ] }
 *     or just the bare array: [ { row, column, message } ]
 *
 *  B) Per-row map, parallel to the input rows:
 *       [ { phone_number: "error..", office_name: null }, { ... } ]
 *     (a non-empty string at a key means that cell is invalid)
 *
 *  C) Nested object keyed by row index:
 *       { errors: { "0": { phone_number: "error.." } } }
 *
 *  D) A simple validity flag with no per-cell detail:
 *       { valid: true } / { is_valid: false }
 *
 * The function never throws on an unexpected shape; it degrades gracefully to
 * "valid with no cell errors" so the UI stays usable, and callers can decide
 * how strict to be.
 */

import { COLUMN_KEYS } from '../config/columns.js';

/**
 * @typedef {Object} NormalizedValidation
 * @property {boolean} isValid
 * @property {Record<number, Record<string, string>>} cellErrors  rowIndex → (columnKey → message)
 * @property {number} errorCount
 */

const ROW_KEYS = ['row', 'row_index', 'rowIndex', 'index', 'r'];
const COL_KEYS = ['column', 'col', 'field', 'key', 'name'];
const MSG_KEYS = ['message', 'error', 'detail', 'msg', 'reason'];

/** Read the first present key from a list, returning undefined if none match. */
function pick(obj, keys) {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null) return obj[k];
  }
  return undefined;
}

/**
 * @param {unknown} response  Raw value returned by validateTable().
 * @returns {NormalizedValidation}
 */
export function normalizeValidation(response) {
  const cellErrors = {};

  const addError = (rowIndex, columnKey, message) => {
    const idx = Number(rowIndex);
    if (!Number.isInteger(idx) || !columnKey) return;
    if (!cellErrors[idx]) cellErrors[idx] = {};
    cellErrors[idx][columnKey] = String(message || 'Invalid value.');
  };

  // Unwrap a top-level { errors: ... } / { error: ... } envelope.
  const payload =
    response && typeof response === 'object' && !Array.isArray(response)
      ? response.errors ?? response.error ?? response
      : response;

  if (Array.isArray(payload)) {
    // Could be shape A (error objects) or shape B (per-row maps).
    const looksLikeErrorObjects = payload.some(
      (item) =>
        item &&
        typeof item === 'object' &&
        (pick(item, COL_KEYS) !== undefined || pick(item, ROW_KEYS) !== undefined),
    );

    if (looksLikeErrorObjects) {
      // Shape A
      payload.forEach((item, i) => {
        if (!item || typeof item !== 'object') return;
        const rowIndex = pick(item, ROW_KEYS) ?? i;
        const columnKey = pick(item, COL_KEYS);
        const message = pick(item, MSG_KEYS);
        addError(rowIndex, columnKey, message);
      });
    } else {
      // Shape B: array index == row index, values are per-column messages.
      payload.forEach((rowMap, rowIndex) => {
        if (!rowMap || typeof rowMap !== 'object') return;
        for (const colKey of Object.keys(rowMap)) {
          const message = rowMap[colKey];
          if (message && String(message).trim()) {
            addError(rowIndex, colKey, message);
          }
        }
      });
    }
  } else if (payload && typeof payload === 'object') {
    // Shape C: { "0": { col: msg } }  — or a plain validity flag (shape D).
    for (const rowKey of Object.keys(payload)) {
      const rowMap = payload[rowKey];
      if (rowMap && typeof rowMap === 'object') {
        for (const colKey of Object.keys(rowMap)) {
          const message = rowMap[colKey];
          if (message && String(message).trim()) addError(rowKey, colKey, message);
        }
      }
    }
  }

  const errorCount = Object.values(cellErrors).reduce(
    (sum, row) => sum + Object.keys(row).length,
    0,
  );

  // Respect an explicit validity flag when present and no per-cell errors found.
  const explicitFlag =
    response && typeof response === 'object' && !Array.isArray(response)
      ? response.is_valid ?? response.isValid ?? response.valid
      : undefined;

  const isValid = errorCount === 0 && explicitFlag !== false;

  return { isValid, cellErrors, errorCount };
}

/**
 * Defensive helper: drop any cell errors whose column key isn't a real column,
 * so a backend typo can't produce a permanently "red" but invisible cell.
 * @param {NormalizedValidation} normalized
 * @returns {NormalizedValidation}
 */
export function pruneUnknownColumns(normalized) {
  const known = new Set(COLUMN_KEYS);
  const cellErrors = {};
  for (const [rowIndex, row] of Object.entries(normalized.cellErrors)) {
    for (const [colKey, msg] of Object.entries(row)) {
      if (known.has(colKey)) {
        if (!cellErrors[rowIndex]) cellErrors[rowIndex] = {};
        cellErrors[rowIndex][colKey] = msg;
      }
    }
  }
  const errorCount = Object.values(cellErrors).reduce(
    (s, r) => s + Object.keys(r).length,
    0,
  );
  return { ...normalized, cellErrors, errorCount, isValid: normalized.isValid && errorCount === 0 };
}
