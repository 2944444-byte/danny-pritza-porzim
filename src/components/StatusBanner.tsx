/**
 * StatusBanner.tsx
 * -----------------------------------------------------------------------------
 * A compact, color-coded summary of the current validation status. It tells the
 * user exactly why export/email may be disabled and what to do next.
 */

import { STATUS } from '../hooks/usePhoneTable';
import type { ValidationStatus } from '../types';

export interface StatusBannerProps {
  status: ValidationStatus;
  totalErrors: number;
  hasData: boolean;
}

type Tone = 'info' | 'success' | 'warning' | 'error';

export function StatusBanner({ status, totalErrors, hasData }: StatusBannerProps) {
  let tone: Tone = 'info';
  let text: string;

  if (!hasData) {
    tone = 'info';
    text = 'Add at least one row of data, then validate it to enable export.';
  } else {
    switch (status) {
      case STATUS.VALIDATING:
        tone = 'info';
        text = 'Validating data…';
        break;
      case STATUS.VALID:
        tone = 'success';
        text =
          'All data is valid. You can now download the Excel file or send an email report.';
        break;
      case STATUS.INVALID:
        tone = 'error';
        text = `Validation failed: ${totalErrors} cell${
          totalErrors === 1 ? '' : 's'
        } need attention. Hover a red cell to see how to fix it.`;
        break;
      case STATUS.UNVALIDATED:
      default:
        tone = 'warning';
        text = 'Data has not been validated yet. Click “Validate Data” to check it.';
        break;
    }
  }

  return (
    <div className={`status-banner status-banner--${tone}`} role="status" aria-live="polite">
      <span className="status-banner__dot" aria-hidden="true" />
      <span>{text}</span>
    </div>
  );
}
