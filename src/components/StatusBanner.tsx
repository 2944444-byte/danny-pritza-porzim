/**
 * StatusBanner.tsx
 * -----------------------------------------------------------------------------
 * Color-coded validation-status summary (Mantine Alert). Tells the user why
 * export/email may be disabled and what to do next.
 */

import { Alert } from '@mantine/core';
import { STATUS } from '../hooks/usePhoneTable';
import type { ValidationStatus } from '../types';

export interface StatusBannerProps {
  status: ValidationStatus;
  totalErrors: number;
  hasData: boolean;
}

type Tone = 'blue' | 'teal' | 'yellow' | 'red';

export function StatusBanner({ status, totalErrors, hasData }: StatusBannerProps) {
  let color: Tone = 'blue';
  let text: string;

  if (!hasData) {
    text = 'Add at least one row of data, then validate it to enable export.';
  } else {
    switch (status) {
      case STATUS.VALIDATING:
        color = 'blue';
        text = 'Validating data…';
        break;
      case STATUS.VALID:
        color = 'teal';
        text =
          'All data is valid. You can now download the Excel file or send an email report.';
        break;
      case STATUS.INVALID:
        color = 'red';
        text = `Validation failed: ${totalErrors} cell${
          totalErrors === 1 ? '' : 's'
        } need attention. Hover a red cell to see how to fix it.`;
        break;
      case STATUS.UNVALIDATED:
      default:
        color = 'yellow';
        text = 'Data has not been validated yet. Click “Validate Data” to check it.';
        break;
    }
  }

  return (
    <Alert color={color} variant="light" role="status" aria-live="polite">
      {text}
    </Alert>
  );
}
