/**
 * usePhoneTable.js
 * -----------------------------------------------------------------------------
 * The heart of the app: a small state machine that owns the table rows, the
 * per-cell validation errors, and the validation lifecycle. It enforces the
 * core business rule:
 *
 *     The data MUST pass validation before it can be downloaded or emailed,
 *     and ANY change to the data invalidates a previous "valid" result.
 *
 * Validation status
 * -----------------
 *   'unvalidated' — never validated, or edited since the last validation.
 *   'validating'  — a /validate-table request is in flight.
 *   'valid'       — last validation passed; export/email are allowed.
 *   'invalid'     — last validation found per-cell errors (cells are red).
 *
 * Errors are keyed by the row's stable `_id` (not array index) so deleting or
 * reordering rows can never paint the wrong cell red. The validation request
 * still uses array index (that's what the backend reports against); we translate
 * index → `_id` immediately after each validation.
 *
 * Returned actions are intentionally granular and side-effect free w.r.t. the
 * network except `validate`, `download*`, and `sendEmail`, so the component
 * layer stays declarative.
 */

import { useCallback, useMemo, useState } from 'react';
import {
  validateTable,
  downloadExcel as apiDownloadExcel,
  sendEmailReport as apiSendEmail,
} from '../api/phoneMappingApi.js';
import { createEmptyRow, toGridRow, toBackendRows } from '../utils/rowFactory.js';
import { normalizeUploadedRows } from '../utils/uploadNormalizer.js';
import { normalizeValidation, pruneUnknownColumns } from '../utils/validationAdapter.js';

export const STATUS = {
  UNVALIDATED: 'unvalidated',
  VALIDATING: 'validating',
  VALID: 'valid',
  INVALID: 'invalid',
};

export function usePhoneTable(initialRows = []) {
  const [rows, setRowsState] = useState(() =>
    initialRows.length ? initialRows.map(toGridRow) : [createEmptyRow()],
  );
  /** errorsById: { [rowId]: { [columnKey]: message } } */
  const [errorsById, setErrorsById] = useState({});
  const [status, setStatus] = useState(STATUS.UNVALIDATED);

  /**
   * Any mutation marks the table stale: clear the "valid/invalid" verdict so
   * export/email are blocked until the user re-validates.
   */
  const markStale = useCallback(() => {
    setStatus(STATUS.UNVALIDATED);
  }, []);

  // --- Row mutations --------------------------------------------------------

  const setRows = useCallback(
    (next) => {
      setRowsState(next);
      setErrorsById({});
      markStale();
    },
    [markStale],
  );

  const addRow = useCallback(() => {
    setRowsState((prev) => [...prev, createEmptyRow()]);
    markStale();
  }, [markStale]);

  const deleteRow = useCallback(
    (rowId) => {
      setRowsState((prev) => {
        const next = prev.filter((r) => r._id !== rowId);
        // Never leave the grid completely empty — keep one editable row.
        return next.length ? next : [createEmptyRow()];
      });
      setErrorsById((prev) => {
        const { [rowId]: _removed, ...rest } = prev;
        return rest;
      });
      markStale();
    },
    [markStale],
  );

  const updateCell = useCallback(
    (rowId, columnKey, value) => {
      setRowsState((prev) =>
        prev.map((r) => (r._id === rowId ? { ...r, [columnKey]: value } : r)),
      );
      // Clear just this cell's error for immediate feedback...
      setErrorsById((prev) => {
        if (!prev[rowId]?.[columnKey]) return prev;
        const rowErrors = { ...prev[rowId] };
        delete rowErrors[columnKey];
        const next = { ...prev, [rowId]: rowErrors };
        if (Object.keys(rowErrors).length === 0) delete next[rowId];
        return next;
      });
      // ...but the table as a whole must be re-validated before export.
      markStale();
    },
    [markStale],
  );

  /** Replace all rows from an uploaded spreadsheet (keys are normalized). */
  const loadUploadedRows = useCallback(
    (rawRows) => {
      const normalized = normalizeUploadedRows(rawRows);
      setRows(normalized.length ? normalized : [createEmptyRow()]);
    },
    [setRows],
  );

  // --- Validation -----------------------------------------------------------

  /**
   * Validate via the backend, map errors onto rows, and update status.
   * @returns {Promise<{ isValid: boolean, errorCount: number }>}
   */
  const validate = useCallback(async () => {
    setStatus(STATUS.VALIDATING);
    const orderedRows = rows; // snapshot: index → _id mapping for this run
    const payload = toBackendRows(orderedRows);

    const raw = await validateTable(payload);
    const normalized = pruneUnknownColumns(normalizeValidation(raw));

    // Translate index-keyed errors onto stable row ids.
    const byId = {};
    for (const [indexStr, cols] of Object.entries(normalized.cellErrors)) {
      const row = orderedRows[Number(indexStr)];
      if (row) byId[row._id] = cols;
    }

    setErrorsById(byId);
    setStatus(normalized.isValid ? STATUS.VALID : STATUS.INVALID);
    return { isValid: normalized.isValid, errorCount: normalized.errorCount };
  }, [rows]);

  // --- Export / email (guarded by validation) -------------------------------

  const ensureValidated = useCallback(() => {
    if (status !== STATUS.VALID) {
      throw new Error('Please validate the data successfully before exporting.');
    }
  }, [status]);

  const getExportRows = useCallback(() => toBackendRows(rows), [rows]);

  const downloadExcel = useCallback(async () => {
    ensureValidated();
    return apiDownloadExcel(getExportRows());
  }, [ensureValidated, getExportRows]);

  const sendEmail = useCallback(
    async ({ recipient, subject, message }) => {
      ensureValidated();
      return apiSendEmail({ recipient, rows: getExportRows(), subject, message });
    },
    [ensureValidated, getExportRows],
  );

  // --- Derived state --------------------------------------------------------

  const totalErrors = useMemo(
    () =>
      Object.values(errorsById).reduce((sum, cols) => sum + Object.keys(cols).length, 0),
    [errorsById],
  );

  const hasData = rows.some((r) =>
    Object.entries(r).some(([k, v]) => k !== '_id' && String(v ?? '').trim() !== ''),
  );

  /** The single gate the UI uses to enable Download / Send-Email. */
  const canExport = status === STATUS.VALID && hasData;

  return {
    // state
    rows,
    errorsById,
    status,
    totalErrors,
    hasData,
    canExport,
    // row actions
    addRow,
    deleteRow,
    updateCell,
    setRows,
    loadUploadedRows,
    // network actions
    validate,
    downloadExcel,
    sendEmail,
  };
}
