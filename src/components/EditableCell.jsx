/**
 * EditableCell.jsx
 * -----------------------------------------------------------------------------
 * Renders a single editable cell whose editor depends on the column type:
 *   - dropdown → <select> populated from /schema-meta (with the current value
 *                kept selectable even if it's not in the option list, so bad
 *                uploaded data is still visible and fixable)
 *   - integer  → numeric <input>
 *   - wkt/text/phone → text <input>
 *
 * Error presentation (per the requirements):
 *   - When the cell has a validation error, it turns red.
 *   - Hovering shows the backend's error message as a tooltip. We use both a
 *     native `title` (accessible / always works) and a styled CSS tooltip
 *     (nicer UX). The message text comes straight from the API.
 */

import { memo } from 'react';

function EditableCellBase({ column, value, error, rowId, dropdownOptions, onChange }) {
  const hasError = Boolean(error);
  const commonClass = `cell-input${hasError ? ' cell-input--error' : ''}`;
  const handle = (e) => onChange(rowId, column.key, e.target.value);

  const isDropdown =
    column.type === 'dropdown' || (dropdownOptions && dropdownOptions.length > 0);

  let editor;
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
        inputMode={column.type === 'integer' || column.type === 'phone' ? 'numeric' : undefined}
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
