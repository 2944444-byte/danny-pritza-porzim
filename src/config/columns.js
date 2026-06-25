/**
 * columns.js
 * -----------------------------------------------------------------------------
 * THE single source of truth for the table's columns.
 *
 * This mirrors the backend's column schema (BaseColumn / DropdownColumn /
 * PhoneColumn / WKTGeometryColumn / IntegerColumn / TextColumn). To add, remove,
 * reorder, or relabel a column, edit this array only — the grid, the empty-row
 * factory, the upload normalizer, and the export payload all derive from it.
 *
 * IMPORTANT — keep `key` in sync with the backend
 * ------------------------------------------------
 * `key` MUST equal the backend column's JSON key (BaseColumn.name), because it
 * is the key used in the payloads sent to `/validate-table`, `/download-excel`
 * and `/send-email`, and the key the validation errors come back under. If your
 * backend uses a different key (e.g. "geographic_location_(wkt)"), change `key`
 * here and the whole app follows.
 *
 * `aliases` lets the upload normalizer map messy Excel header variants onto the
 * canonical `key` (see utils/uploadNormalizer.js), so an uploaded sheet whose
 * header cleans to "location" or "geographic_location_(wkt)" still lands in the
 * right column.
 */

/**
 * Supported logical cell types. The renderer (EditableCell) and the empty-row
 * factory switch on these. They are intentionally UI-side hints; the backend
 * remains the authority on validation.
 * @typedef {'phone'|'dropdown'|'wkt'|'text'|'integer'} ColumnType
 */

/**
 * @typedef {Object} ColumnDef
 * @property {string}     key          Canonical backend JSON key (BaseColumn.name).
 * @property {string}     label        Human-friendly header shown in the UI.
 * @property {ColumnType} type         Logical type → drives the cell editor.
 * @property {boolean}    required      Whether empty values are invalid.
 * @property {string}    [dropdownKey] For `dropdown` columns: the key under which
 *                                      `/schema-meta` returns the allowed options.
 *                                      Defaults to `key` when omitted.
 * @property {string[]}  [aliases]     Alternate incoming header keys to map onto `key`.
 * @property {string}    [placeholder] Hint text for the cell editor.
 */

/** @type {ColumnDef[]} */
export const COLUMNS = [
  {
    key: 'phone_number',
    label: 'Phone Number',
    type: 'phone',
    required: true,
    placeholder: 'e.g. 123456',
    aliases: ['phone', 'number', 'phone_no', 'phonenumber'],
  },
  {
    key: 'office_name',
    label: 'Office Name',
    type: 'dropdown',
    required: true,
    dropdownKey: 'office_name',
    placeholder: 'Select an office',
    aliases: ['office', 'office_name'],
  },
  {
    key: 'geographic_location',
    label: 'Geographic Location (WKT)',
    type: 'wkt',
    required: true,
    placeholder: 'e.g. POINT (12.12 13.13)',
    // The template header "Geographic Location (WKT)" cleans to this on upload:
    aliases: ['geographic_location_(wkt)', 'geographic_location', 'location', 'wkt', 'geom'],
  },
  {
    key: 'department_name',
    label: 'Department Name',
    type: 'text',
    required: true,
    placeholder: 'e.g. HR',
    aliases: ['department', 'dept', 'department_name'],
  },
  {
    key: 'importance',
    label: 'Importance',
    type: 'integer',
    required: true,
    placeholder: 'e.g. 5',
    aliases: ['priority', 'rank'],
  },
];

/** Convenience: just the canonical keys, in column order. */
export const COLUMN_KEYS = COLUMNS.map((c) => c.key);

/** Convenience: lookup a column definition by its canonical key. */
export const COLUMN_BY_KEY = Object.fromEntries(COLUMNS.map((c) => [c.key, c]));
