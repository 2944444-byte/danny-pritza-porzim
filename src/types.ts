/**
 * types.ts
 * -----------------------------------------------------------------------------
 * Shared, app-wide TypeScript types. Centralizing them keeps the data model in
 * one place so the API layer, hooks, and components all speak the same language.
 */

/** Logical cell types that drive the cell editor + empty-row factory. */
export type ColumnType = 'phone' | 'dropdown' | 'wkt' | 'text' | 'integer';

/** Definition of a single table column (see config/columns.ts). */
export interface ColumnDef {
  /** Canonical backend JSON key (BaseColumn.name). */
  key: string;
  /** Human-friendly header shown in the UI. */
  label: string;
  /** Logical type → drives the cell editor. */
  type: ColumnType;
  /** Whether empty values are invalid. */
  required: boolean;
  /** For dropdown columns: the /schema-meta key holding the options. */
  dropdownKey?: string;
  /** Alternate incoming header keys to map onto `key` on upload. */
  aliases?: string[];
  /** Hint text for the cell editor. */
  placeholder?: string;
}

/** A single cell's value. */
export type CellValue = string | number;

/** A row as held in the grid: canonical keys → values, plus a stable UI id. */
export type GridRow = { _id: string } & Record<string, CellValue>;

/** A row as sent to / received from the backend (no UI-only fields). */
export type BackendRow = Record<string, CellValue>;

/** Dropdown options as returned by GET /schema-meta, e.g. { office_name: [...] }. */
export type SchemaMeta = Record<string, string[]>;

/** Lifecycle of the validate-before-export state machine. */
export type ValidationStatus = 'unvalidated' | 'validating' | 'valid' | 'invalid';

/** Validation errors keyed by row array-index → (columnKey → message). */
export type CellErrorsByIndex = Record<number, Record<string, string>>;

/** Validation errors keyed by stable row id → (columnKey → message). */
export type CellErrorsById = Record<string, Record<string, string>>;

/** Normalized result of a /validate-table call (see utils/validationAdapter). */
export interface NormalizedValidation {
  isValid: boolean;
  cellErrors: CellErrorsByIndex;
  errorCount: number;
}

/** Toast notification model. */
export type ToastTone = 'info' | 'success' | 'error';
export interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

/** Parameters collected by the email dialog. */
export interface EmailParams {
  recipient: string;
  subject?: string;
  message?: string;
}
