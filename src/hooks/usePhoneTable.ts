/**
 * usePhoneTable.ts
 * -----------------------------------------------------------------------------
 * The heart of the app: a small state machine that owns the table rows, the
 * per-cell validation errors, and the validation lifecycle. It enforces the
 * core business rule:
 *
 *     The data MUST pass validation before it can be downloaded or emailed,
 *     and ANY change to the data invalidates a previous "valid" result.
 *
 * Errors are keyed by the row's stable `_id` (not array index) so deleting or
 * reordering rows can never paint the wrong cell red. The validation request
 * uses array index (what the backend reports against); we translate index → id
 * immediately after each validation.
 */

import { useCallback, useMemo, useState } from 'react';
import {
  validateTable,
  downloadExcel as apiDownloadExcel,
  sendEmailReport as apiSendEmail,
} from '../api/phoneMappingApi';
import { createEmptyRow, toGridRow, toBackendRows } from '../utils/rowFactory';
import { normalizeUploadedRows } from '../utils/uploadNormalizer';
import { normalizeValidation, pruneUnknownColumns } from '../utils/validationAdapter';
import type {
  BlobResult,
} from '../api/client';
import type {
  CellErrorsById,
  CellValue,
  EmailParams,
  GridRow,
  ValidationStatus,
} from '../types';

export const STATUS = {
  UNVALIDATED: 'unvalidated',
  VALIDATING: 'validating',
  VALID: 'valid',
  INVALID: 'invalid',
} as const satisfies Record<string, ValidationStatus>;

export interface UsePhoneTableResult {
  rows: GridRow[];
  errorsById: CellErrorsById;
  status: ValidationStatus;
  totalErrors: number;
  hasData: boolean;
  canExport: boolean;
  addRow: () => void;
  deleteRow: (rowId: string) => void;
  updateCell: (rowId: string, columnKey: string, value: CellValue) => void;
  setRows: (next: GridRow[]) => void;
  loadUploadedRows: (rawRows: Array<Record<string, unknown>>) => void;
  validate: () => Promise<{ isValid: boolean; errorCount: number }>;
  downloadExcel: (title?: string) => Promise<BlobResult>;
  sendEmail: (params: EmailParams & { title?: string }) => Promise<unknown>;
}

export function usePhoneTable(initialRows: GridRow[] = []): UsePhoneTableResult {
  const [rows, setRowsState] = useState<GridRow[]>(() =>
    initialRows.length ? initialRows.map((r) => toGridRow(r)) : [createEmptyRow()],
  );
  const [errorsById, setErrorsById] = useState<CellErrorsById>({});
  const [status, setStatus] = useState<ValidationStatus>(STATUS.UNVALIDATED);

  /**
   * Any mutation marks the table stale: clear the "valid/invalid" verdict so
   * export/email are blocked until the user re-validates.
   */
  const markStale = useCallback(() => {
    setStatus(STATUS.UNVALIDATED);
  }, []);

  // --- Row mutations --------------------------------------------------------

  const setRows = useCallback(
    (next: GridRow[]) => {
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
    (rowId: string) => {
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
    (rowId: string, columnKey: string, value: CellValue) => {
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
    (rawRows: Array<Record<string, unknown>>) => {
      const normalized = normalizeUploadedRows(rawRows);
      setRows(normalized.length ? normalized : [createEmptyRow()]);
    },
    [setRows],
  );

  // --- Validation -----------------------------------------------------------

  const validate = useCallback(async () => {
    setStatus(STATUS.VALIDATING);
    const orderedRows = rows; // snapshot: index → _id mapping for this run
    const payload = toBackendRows(orderedRows);

    const raw = await validateTable(payload);
    const normalized = pruneUnknownColumns(normalizeValidation(raw));

    // Translate index-keyed errors onto stable row ids.
    const byId: CellErrorsById = {};
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

  const downloadExcel = useCallback(
    async (title?: string) => {
      ensureValidated();
      return apiDownloadExcel(getExportRows(), title);
    },
    [ensureValidated, getExportRows],
  );

  const sendEmail = useCallback(
    async ({ recipient, subject, message, title }: EmailParams & { title?: string }) => {
      ensureValidated();
      return apiSendEmail({ recipient, rows: getExportRows(), subject, message, title });
    },
    [ensureValidated, getExportRows],
  );

  // --- Derived state --------------------------------------------------------

  const totalErrors = useMemo(
    () => Object.values(errorsById).reduce((sum, cols) => sum + Object.keys(cols).length, 0),
    [errorsById],
  );

  const hasData = rows.some((r) =>
    Object.entries(r).some(([k, v]) => k !== '_id' && String(v ?? '').trim() !== ''),
  );

  /** The single gate the UI uses to enable Download / Send-Email. */
  const canExport = status === STATUS.VALID && hasData;

  return {
    rows,
    errorsById,
    status,
    totalErrors,
    hasData,
    canExport,
    addRow,
    deleteRow,
    updateCell,
    setRows,
    loadUploadedRows,
    validate,
    downloadExcel,
    sendEmail,
  };
}
