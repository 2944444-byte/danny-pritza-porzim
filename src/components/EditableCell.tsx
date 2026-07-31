/**
 * EditableCell.tsx
 * -----------------------------------------------------------------------------
 * One editable table cell (Mantine). Dropdown columns render a <Select> filled
 * from /schema-meta; everything else renders a <TextInput> (integers too, so a
 * bad value like "abc" is preserved and caught by validation rather than being
 * silently coerced away).
 *
 * Error presentation: invalid cells get a red border (Mantine `error`) and a
 * hover Tooltip carrying the backend's exact error message.
 */

import { memo } from 'react';
import { Select, Table, TextInput, Tooltip } from '@mantine/core';
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
  const strValue = value === undefined || value === null ? '' : String(value);
  const isDropdown =
    column.type === 'dropdown' || (dropdownOptions !== undefined && dropdownOptions.length > 0);

  let control: JSX.Element;
  if (isDropdown) {
    const options = dropdownOptions ?? [];
    // Keep an out-of-range value visible & selectable so it can be fixed.
    const data =
      strValue && !options.includes(strValue) ? [...options, `${strValue}`] : options;
    control = (
      <Select
        data={data}
        value={strValue || null}
        placeholder={column.placeholder ?? 'Select…'}
        onChange={(v) => onChange(rowId, column.key, v ?? '')}
        error={hasError}
        comboboxProps={{ withinPortal: true }}
        checkIconPosition="right"
        allowDeselect={false}
        size="sm"
      />
    );
  } else {
    control = (
      <TextInput
        value={strValue}
        placeholder={column.placeholder}
        onChange={(e) => onChange(rowId, column.key, e.currentTarget.value)}
        error={hasError}
        inputMode={column.type === 'integer' || column.type === 'phone' ? 'numeric' : undefined}
        size="sm"
      />
    );
  }

  return (
    <Table.Td>
      <Tooltip
        label={error}
        disabled={!hasError}
        color="red"
        multiline
        w={260}
        withArrow
        position="top-start"
        events={{ hover: true, focus: true, touch: true }}
      >
        <div>{control}</div>
      </Tooltip>
    </Table.Td>
  );
}

/** Memoized so a keystroke in one cell doesn't re-render the whole grid. */
export const EditableCell = memo(EditableCellBase);
