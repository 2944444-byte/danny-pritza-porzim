/**
 * DataGrid.tsx
 * -----------------------------------------------------------------------------
 * Renders the editable table: a header row derived from COLUMNS, one row per
 * data record (each with a delete button), and an EditableCell per column.
 *
 * A "dumb" presentational component — all state and behavior come in via props
 * from usePhoneTable, which keeps it trivial to test and restyle.
 */

import { COLUMNS } from '../config/columns';
import { EditableCell } from './EditableCell';
import type { CellErrorsById, CellValue, GridRow, SchemaMeta } from '../types';

export interface DataGridProps {
  rows: GridRow[];
  errorsById: CellErrorsById;
  schemaOptions: SchemaMeta;
  onCellChange: (rowId: string, key: string, value: CellValue) => void;
  onDeleteRow: (rowId: string) => void;
}

export function DataGrid({
  rows,
  errorsById,
  schemaOptions,
  onCellChange,
  onDeleteRow,
}: DataGridProps) {
  return (
    <div className="grid-scroll">
      <table className="data-grid">
        <thead>
          <tr>
            <th className="row-index-head" scope="col">
              #
            </th>
            {COLUMNS.map((col) => (
              <th key={col.key} scope="col">
                {col.label}
                {col.required && (
                  <span className="required-mark" title="Required">
                    {' '}
                    *
                  </span>
                )}
              </th>
            ))}
            <th className="actions-head" scope="col">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const rowErrors = errorsById[row._id] ?? {};
            return (
              <tr key={row._id} className={Object.keys(rowErrors).length ? 'row--error' : ''}>
                <td className="row-index">{index + 1}</td>
                {COLUMNS.map((col) => (
                  <EditableCell
                    key={col.key}
                    column={col}
                    rowId={row._id}
                    value={row[col.key]}
                    error={rowErrors[col.key]}
                    dropdownOptions={
                      col.type === 'dropdown'
                        ? schemaOptions[col.dropdownKey ?? col.key]
                        : undefined
                    }
                    onChange={onCellChange}
                  />
                ))}
                <td className="row-actions">
                  <button
                    type="button"
                    className="btn btn--icon btn--danger"
                    onClick={() => onDeleteRow(row._id)}
                    aria-label={`Delete row ${index + 1}`}
                    title="Delete this row"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
