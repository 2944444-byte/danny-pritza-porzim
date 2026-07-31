/**
 * HomePage.tsx
 * -----------------------------------------------------------------------------
 * The main phone-mapping page.
 *   - server state via TanStack Query (schema-meta query; validate/upload/
 *     download/email/template mutations)
 *   - client table state & validation lifecycle via usePhoneTable
 *   - errors surface through the centralized Query error handler (toasts);
 *     success/among-valid messages are raised per-mutation.
 *
 * The "validate before export" rule is enforced by usePhoneTable.canExport
 * (buttons) and again on the backend.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Toolbar } from '../components/Toolbar';
import { DataGrid } from '../components/DataGrid';
import { StatusBanner } from '../components/StatusBanner';
import { EmailDialog } from '../components/EmailDialog';
import { usePhoneTable } from '../hooks/usePhoneTable';
import { useSchemaMetaQuery } from '../hooks/queries';
import {
  uploadExcel,
  downloadTemplate,
  downloadExcel,
  sendEmailReport,
  validateTable,
} from '../api/phoneMappingApi';
import { notify } from '../stores/notificationStore';
import { saveBlob } from '../utils/download';
import { toExcelFilename } from '../utils/filename';
import { inspectUploadColumns } from '../utils/uploadNormalizer';
import { COLUMNS } from '../config/columns';
import { DEFAULT_TEMPLATE_FILENAME } from '../config/appConfig';
import type { EmailParams } from '../types';

/** The manager's email, injected at build/runtime if available (optional). */
const DEFAULT_MANAGER_EMAIL = import.meta.env.VITE_MANAGER_EMAIL || '';

export default function HomePage() {
  const schemaQuery = useSchemaMetaQuery();
  const table = usePhoneTable();

  const [emailOpen, setEmailOpen] = useState(false);
  // User-entered title for the whole Excel file → download filename + email.
  const [sheetTitle, setSheetTitle] = useState('');
  const title = sheetTitle.trim();

  // --- Mutations ------------------------------------------------------------

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const { rows, columns } = await uploadExcel(file);
      // Reject files whose columns don't match the schema, with an explanation.
      // (Cell *values* are NOT checked — right columns / bad values still import
      // and fail validation.)
      const { missing, unknownHeaders } = inspectUploadColumns(rows, columns);
      if (missing.length > 0) {
        const expected = COLUMNS.map((c) => c.label).join(', ');
        const miss = missing.map((c) => c.label).join(', ');
        throw new Error(
          `Upload failed — the file's columns don't match. ` +
            `Missing required column(s): ${miss}. Expected columns: ${expected}.`,
        );
      }
      return { rows, unknownHeaders, fileName: file.name };
    },
    onSuccess: ({ rows, unknownHeaders, fileName }) => {
      table.loadUploadedRows(rows);
      let msg = `Loaded ${rows.length} row(s) from “${fileName}”. Please validate.`;
      if (unknownHeaders.length > 0) {
        msg += ` (Ignored unrecognized column(s): ${unknownHeaders.join(', ')}.)`;
      }
      notify(msg, 'success');
    },
  });

  const templateMutation = useMutation({
    mutationFn: downloadTemplate,
    onSuccess: ({ blob, filename }) => {
      saveBlob(blob, filename || DEFAULT_TEMPLATE_FILENAME);
      notify('Template downloaded.', 'success');
    },
  });

  const validateMutation = useMutation({
    mutationFn: () => validateTable(table.getExportRows()),
    onMutate: () => table.setValidating(),
    onSuccess: (raw) => {
      const { isValid, errorCount } = table.applyValidationResult(raw);
      if (isValid) {
        notify('Validation passed — all cells are valid.', 'success');
      } else {
        notify(
          `Validation failed: ${errorCount} invalid cell(s). Hover the red cells for details.`,
          'error',
          7000,
        );
      }
    },
  });

  const downloadMutation = useMutation({
    mutationFn: () => downloadExcel(table.getExportRows(), title || undefined),
    onSuccess: ({ blob }) => {
      saveBlob(blob, toExcelFilename(title));
      notify('Excel file downloaded.', 'success');
    },
  });

  const emailMutation = useMutation({
    mutationFn: (params: EmailParams) =>
      sendEmailReport({ ...params, rows: table.getExportRows(), title: title || undefined }),
    onSuccess: (_data, params) => {
      notify(`Report sent to ${params.recipient}.`, 'success');
      setEmailOpen(false);
    },
  });

  // Any in-flight action blocks the toolbar.
  const busy =
    schemaQuery.isLoading ||
    uploadMutation.isPending ||
    templateMutation.isPending ||
    validateMutation.isPending ||
    downloadMutation.isPending ||
    emailMutation.isPending;

  // --- Render ---------------------------------------------------------------

  const exportRowCount = table.rows.filter((r) =>
    Object.entries(r).some(([k, v]) => k !== '_id' && String(v ?? '').trim() !== ''),
  ).length;

  return (
    <div className="app">
      <header className="app__header">
        <div>
          <h1 className="app__title">Company Phone Mapping</h1>
          <p className="app__subtitle">
            Map each phone to its office, location, department and importance — then validate,
            export, or email the report.
          </p>
        </div>
        <Link className="btn admin-link" to="/admin" title="Site availability settings">
          ⚙ Admin
        </Link>
      </header>

      {schemaQuery.isError && (
        <div className="status-banner status-banner--warning" role="status">
          <span className="status-banner__dot" aria-hidden="true" />
          <span>
            Could not load dropdown options (
            {schemaQuery.error instanceof Error ? schemaQuery.error.message : 'error'}).{' '}
            <button type="button" className="link-btn" onClick={() => void schemaQuery.refetch()}>
              Retry
            </button>
          </span>
        </div>
      )}

      <div className="sheet-title-bar">
        <label className="sheet-title-field">
          <span className="sheet-title-label">Excel file title</span>
          <input
            type="text"
            className="sheet-title-input"
            value={sheetTitle}
            onChange={(e) => setSheetTitle(e.target.value)}
            placeholder="e.g. Q3 Phone Mappings"
          />
        </label>
        <span className="sheet-title-hint">
          Used as the downloaded file name{title ? ` (${toExcelFilename(title)})` : ''} and the
          email report.
        </span>
      </div>

      <Toolbar
        canExport={table.canExport}
        busy={busy}
        onUploadFile={(file) => uploadMutation.mutate(file)}
        onAddRow={table.addRow}
        onDownloadTemplate={() => templateMutation.mutate()}
        onValidate={() => validateMutation.mutate()}
        onDownloadExcel={() => downloadMutation.mutate()}
        onOpenEmail={() => setEmailOpen(true)}
      />

      <StatusBanner
        status={table.status}
        totalErrors={table.totalErrors}
        hasData={table.hasData}
      />

      <DataGrid
        rows={table.rows}
        errorsById={table.errorsById}
        schemaOptions={schemaQuery.data ?? {}}
        onCellChange={table.updateCell}
        onDeleteRow={table.deleteRow}
      />

      <footer className="app__footer">
        <span>
          {table.rows.length} row{table.rows.length === 1 ? '' : 's'} · {table.totalErrors} error
          {table.totalErrors === 1 ? '' : 's'}
        </span>
        <span className="app__hint">* required field</span>
      </footer>

      <EmailDialog
        open={emailOpen}
        defaultRecipient={DEFAULT_MANAGER_EMAIL}
        defaultSubject={title || undefined}
        rowCount={exportRowCount}
        sending={emailMutation.isPending}
        onClose={() => (emailMutation.isPending ? null : setEmailOpen(false))}
        onSend={(params) => emailMutation.mutate(params)}
      />
    </div>
  );
}
