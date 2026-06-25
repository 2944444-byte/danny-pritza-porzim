/**
 * DataGrid.jsx
 * -----------------------------------------------------------------------------
 * Renders the editable table: a header row derived from COLUMNS, one row per
 * data record (each with a delete button), and an EditableCell per column.
 *
 * It is a "dumb" presentational component — all state and behavior come in via
 * props from usePhoneTable, which keeps it trivial to test and restyle.
 */

import { COLUMNS } from '../config/columns.js';
import { EditableCell } from './EditableCell.jsx';

/**
 * @param {Object} props
 * @param {Array<Record<string, unknown>>} props.rows
 * @param {Record<string, Record<string, string>>} props.errorsById
 * @param {Record<string, string[]>} props.schemaOptions  /schema-meta result
 * @param {(rowId: string, key: string, value: unknown) => void} props.onCellChange
 * @param {(rowId: string) => void} props.onDeleteRow
 */
export function DataGrid({ rows, errorsById, schemaOptions, onCellChange, onDeleteRow }) {
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
                {col.required && <span className="required-mark" title="Required"> *</span>}
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
