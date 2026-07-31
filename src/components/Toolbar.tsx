/**
 * Toolbar.tsx
 * -----------------------------------------------------------------------------
 * Action bar: Upload Excel · Add Row · Download Template · Validate Data ·
 * Download Excel · Send Email Report. Built with Mantine Buttons/Group and a
 * FileButton for uploads. Export actions are disabled until validation passes.
 */

import { Button, FileButton, Group } from '@mantine/core';

export interface ToolbarProps {
  canExport: boolean;
  busy: boolean;
  onUploadFile: (file: File) => void;
  onAddRow: () => void;
  onDownloadTemplate: () => void;
  onValidate: () => void;
  onDownloadExcel: () => void;
  onOpenEmail: () => void;
}

export function Toolbar({
  canExport,
  busy,
  onUploadFile,
  onAddRow,
  onDownloadTemplate,
  onValidate,
  onDownloadExcel,
  onOpenEmail,
}: ToolbarProps) {
  const exportHint = canExport ? undefined : 'Validate the data successfully to enable this action.';

  return (
    <Group justify="space-between" wrap="wrap" gap="sm">
      <Group gap="sm">
        <FileButton accept=".xlsx,.xls" onChange={(file) => file && onUploadFile(file)}>
          {(props) => (
            <Button variant="default" disabled={busy} {...props}>
              ⬆ Upload Excel
            </Button>
          )}
        </FileButton>
        <Button variant="default" disabled={busy} onClick={onAddRow}>
          ＋ Add Row
        </Button>
        <Button variant="default" disabled={busy} onClick={onDownloadTemplate}>
          ⬇ Download Template
        </Button>
      </Group>

      <Group gap="sm">
        <Button disabled={busy} onClick={onValidate}>
          ✔ Validate Data
        </Button>
        <Button color="teal" disabled={busy || !canExport} title={exportHint} onClick={onDownloadExcel}>
          ⬇ Download Excel
        </Button>
        <Button color="teal" disabled={busy || !canExport} title={exportHint} onClick={onOpenEmail}>
          ✉ Send Email Report
        </Button>
      </Group>
    </Group>
  );
}
