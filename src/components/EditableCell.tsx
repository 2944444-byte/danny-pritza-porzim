/**
 * EditableCell.tsx
 * -----------------------------------------------------------------------------
 * Renders a single editable cell whose editor depends on the column type:
 *   - dropdown → <select> populated from /schema-meta (current value kept
 *                selectable even if not in the option list, so bad uploaded data
 *                stays visible and fixable)
 *   - integer  → numeric <input>
 *   - wkt/text/phone → text <input>
 *
 * Error presentation (per the requirements): an invalid cell turns red, and
 * hovering shows the backend's error message (native `title` + styled tooltip).
 */

import { memo, type ChangeEvent } from 'react';
import type { CellValue, ColumnDef } from '../types';

export interface EditableCellProps {
  column: ColumnDef;
  value: CellValue;
  error?: string;
  rowId: string;
  dropdownOptions?: string[];
  onChange: (rowId: string, key: string, value: CellValue) => void;
}

function EditableCellBase({
  column,
  value,
  error,
  rowId,
  dropdownOptions,
  onChange,
}: EditableCellProps) {
  const hasError = Boolean(error);
  const commonClass = `cell-input${hasError ? ' cell-input--error' : ''}`;
  const handle = (e: ChangeEvent<HTMLSelectElement | HTMLInputElement>) =>
    onChange(rowId, column.key, e.target.value);

  const isDropdown =
    column.type === 'dropdown' || (dropdownOptions !== undefined && dropdownOptions.length > 0);

  let editor: JSX.Element;
  if (isDropdown) {
    const options = dropdownOptions ?? [];
    const valueMissingFromOptions =
      value !== '' && value != null && !options.includes(String(value));
    editor = (
      <select className={commonClass} value={value ?? ''} onChange={handle}>
        <option value="" disabled>
          {column.placeholder ?? 'Select…'}
        </option>
        {/* Preserve an out-of-range value so the user can see & fix it. */}
        {valueMissingFromOptions && (
          <option value={String(value)}>{String(value)} (invalid)</option>
        )}
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    );
  } else {
    editor = (
      <input
        type={column.type === 'integer' ? 'number' : 'text'}
        className={commonClass}
        value={value ?? ''}
        placeholder={column.placeholder}
        onChange={handle}
        inputMode={
          column.type === 'integer' || column.type === 'phone' ? 'numeric' : undefined
        }
      />
    );
  }

  return (
    <td className={`cell${hasError ? ' cell--error' : ''}`}>
      <div
        className="cell-wrapper"
        // Native tooltip — accessible and always available.
        title={hasError ? error : undefined}
        aria-invalid={hasError || undefined}
      >
        {editor}
        {hasError && (
          <>
            {/* Visual marker + styled tooltip driven entirely by the API error. */}
            <span className="cell-error-badge" aria-hidden="true">
              !
            </span>
            <span className="cell-tooltip" role="tooltip">
              {error}
            </span>
          </>
        )}
      </div>
    </td>
  );
}

/**
 * Memoized to avoid re-rendering every cell on each keystroke elsewhere in the
 * grid. Re-renders only when this cell's value/error/options actually change.
 */
export const EditableCell = memo(EditableCellBase);
