/**
 * Toolbar.jsx
 * -----------------------------------------------------------------------------
 * The action bar holding every operation the manager needs:
 *   Upload Excel · Add Row · Download Template · Validate Data ·
 *   Download Excel · Send Email Report
 *
 * (Delete-row lives per-row inside the grid.)
 *
 * Export actions (Download Excel / Send Email) are DISABLED until validation
 * passes — enforced here via `canExport` and, defensively, again in the hook.
 * The component is presentational: handlers are injected from App.
 */

import { useRef } from 'react';

export function Toolbar({
  canExport,
  busy,
  onUploadFile,
  onAddRow,
  onDownloadTemplate,
  onValidate,
  onDownloadExcel,
  onOpenEmail,
}) {
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) onUploadFile(file);
    // Reset so selecting the same file again re-triggers onChange.
    e.target.value = '';
  };

  const exportHint = canExport
    ? undefined
    : 'Validate the data successfully to enable this action.';

  return (
    <div className="toolbar" role="toolbar" aria-label="Table actions">
      {/* Hidden native file input, driven by the styled button. */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        className="visually-hidden"
        onChange={handleFileChange}
      />

      <div className="toolbar__group">
        <button
          type="button"
          className="btn"
          disabled={busy}
          onClick={() => fileInputRef.current?.click()}
        >
          ⬆ Upload Excel
        </button>
        <button type="button" className="btn" disabled={busy} onClick={onAddRow}>
          ＋ Add Row
        </button>
        <button type="button" className="btn" disabled={busy} onClick={onDownloadTemplate}>
          ⬇ Download Template
        </button>
      </div>

      <div className="toolbar__group toolbar__group--right">
        <button
          type="button"
          className="btn btn--primary"
          disabled={busy}
          onClick={onValidate}
        >
          ✔ Validate Data
        </button>
        <button
          type="button"
          className="btn btn--accent"
          disabled={busy || !canExport}
          onClick={onDownloadExcel}
          title={exportHint}
        >
          ⬇ Download Excel
        </button>
        <button
          type="button"
          className="btn btn--accent"
          disabled={busy || !canExport}
          onClick={onOpenEmail}
          title={exportHint}
        >
          ✉ Send Email Report
        </button>
      </div>
    </div>
  );
}
