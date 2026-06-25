/**
 * App.tsx
 * -----------------------------------------------------------------------------
 * Top-level container that composes the feature:
 *   - loads dropdown options (useSchemaMeta)
 *   - owns table state & validation lifecycle (usePhoneTable)
 *   - wires toolbar/grid/dialog handlers to the API
 *   - surfaces results via toasts and the status banner
 *
 * App stays thin: it orchestrates hooks and components but delegates all rules
 * (e.g. "must validate before export") to usePhoneTable, and all transport to
 * the api/ layer.
 */

import { useCallback, useState } from 'react';
import { Toolbar } from './components/Toolbar';
import { DataGrid } from './components/DataGrid';
import { StatusBanner } from './components/StatusBanner';
import { EmailDialog } from './components/EmailDialog';
import { ToastStack } from './components/Toast';
import { useToasts } from './hooks/useToasts';
import { usePhoneTable } from './hooks/usePhoneTable';
import { useSchemaMeta } from './hooks/useSchemaMeta';
import { uploadExcel, downloadTemplate as apiDownloadTemplate } from './api/phoneMappingApi';
import { saveBlob } from './utils/download';
import { toExcelFilename } from './utils/filename';
import { DEFAULT_TEMPLATE_FILENAME } from './config/appConfig';
import type { EmailParams } from './types';

/** The manager's email, injected at build/runtime if available (optional). */
const DEFAULT_MANAGER_EMAIL = import.meta.env.VITE_MANAGER_EMAIL || '';

export default function App() {
  const { options: schemaOptions, loading: schemaLoading, error: schemaError, reload } =
    useSchemaMeta();
  const table = usePhoneTable();
  const { toasts, notify, dismiss } = useToasts();

  // `busy` blocks the toolbar during any in-flight network action.
  const [busy, setBusy] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [sending, setSending] = useState(false);
  // User-entered title for the whole Excel file → download filename + email.
  const [sheetTitle, setSheetTitle] = useState('');

  /** Run an async action with shared busy state + uniform error toasts. */
  const runAction = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
      setBusy(true);
      try {
        return await fn();
      } catch (e) {
        notify(e instanceof Error ? e.message : 'Something went wrong.', 'error', 7000);
        return undefined;
      } finally {
        setBusy(false);
      }
    },
    [notify],
  );

  // --- Action handlers ------------------------------------------------------

  const handleUpload = useCallback(
    (file: File) =>
      runAction(async () => {
        const rawRows = await uploadExcel(file);
        table.loadUploadedRows(rawRows);
        notify(`Loaded ${rawRows.length} row(s) from “${file.name}”. Please validate.`, 'success');
      }),
    [runAction, table, notify],
  );

  const handleDownloadTemplate = useCallback(
    () =>
      runAction(async () => {
        const { blob, filename } = await apiDownloadTemplate();
        saveBlob(blob, filename || DEFAULT_TEMPLATE_FILENAME);
        notify('Template downloaded.', 'success');
      }),
    [runAction, notify],
  );

  const handleValidate = useCallback(
    () =>
      runAction(async () => {
        const { isValid, errorCount } = await table.validate();
        if (isValid) {
          notify('Validation passed — all cells are valid.', 'success');
        } else {
          notify(
            `Validation failed: ${errorCount} invalid cell(s). Hover the red cells for details.`,
            'error',
            7000,
          );
        }
      }),
    [runAction, table, notify],
  );

  const handleDownloadExcel = useCallback(
    () =>
      runAction(async () => {
        const title = sheetTitle.trim();
        const { blob } = await table.downloadExcel(title || undefined);
        // The user's title is the name of the file.
        saveBlob(blob, toExcelFilename(title));
        notify('Excel file downloaded.', 'success');
      }),
    [runAction, table, notify, sheetTitle],
  );

  const handleSendEmail = useCallback(
    ({ recipient, subject, message }: EmailParams) =>
      runAction(async () => {
        setSending(true);
        try {
          await table.sendEmail({ recipient, subject, message, title: sheetTitle.trim() || undefined });
          notify(`Report sent to ${recipient}.`, 'success');
          setEmailOpen(false);
        } finally {
          setSending(false);
        }
      }),
    [runAction, table, notify, sheetTitle],
  );

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
        <a className="btn admin-link" href="#/admin" title="Site availability settings">
          ⚙ Admin
        </a>
      </header>

      {schemaError && (
        <div className="status-banner status-banner--warning" role="status">
          <span className="status-banner__dot" aria-hidden="true" />
          <span>
            Could not load dropdown options ({schemaError}).{' '}
            <button type="button" className="link-btn" onClick={() => void reload()}>
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
          Used as the downloaded file name{sheetTitle.trim() ? ` (${toExcelFilename(sheetTitle.trim())})` : ''} and the email report.
        </span>
      </div>

      <Toolbar
        canExport={table.canExport}
        busy={busy || schemaLoading}
        onUploadFile={handleUpload}
        onAddRow={table.addRow}
        onDownloadTemplate={handleDownloadTemplate}
        onValidate={handleValidate}
        onDownloadExcel={handleDownloadExcel}
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
        schemaOptions={schemaOptions}
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
        defaultSubject={sheetTitle.trim() || undefined}
        rowCount={exportRowCount}
        sending={sending}
        onClose={() => (sending ? null : setEmailOpen(false))}
        onSend={handleSendEmail}
      />

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
