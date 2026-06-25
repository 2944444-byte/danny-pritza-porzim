/**
 * uploadNormalizer.ts
 * -----------------------------------------------------------------------------
 * Maps the rows returned by `/upload-excel` onto our canonical column keys.
 *
 * The backend cleans Excel headers with `col.strip().lower().replace(" ", "_")`,
 * which can produce keys that don't exactly match our canonical `key`s
 * (e.g. "Geographic Location (WKT)" → "geographic_location_(wkt)"). Each column
 * declares `aliases` in config/columns.ts; here we build a lookup from every
 * alias/cleaned-header to the canonical key and remap incoming rows accordingly.
 */

import { COLUMNS } from '../config/columns';
import { toGridRow } from './rowFactory';
import type { ColumnDef, GridRow } from '../types';

/** Apply the same normalization the backend applies to a header string. */
function cleanHeader(header: string): string {
  return String(header).trim().toLowerCase().replace(/\s+/g, '_');
}

/** alias/cleaned-header → canonical key */
const ALIAS_TO_KEY: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const col of COLUMNS) {
    map[cleanHeader(col.key)] = col.key;
    map[cleanHeader(col.label)] = col.key;
    for (const alias of col.aliases ?? []) map[cleanHeader(alias)] = col.key;
  }
  return map;
})();

/**
 * Convert raw uploaded rows into well-formed grid rows with canonical keys.
 * Unknown columns are ignored; missing columns are filled empty.
 */
export function normalizeUploadedRows(rawRows: Array<Record<string, unknown>>): GridRow[] {
  if (!Array.isArray(rawRows)) return [];
  return rawRows.map((raw) => {
    const remapped: Record<string, unknown> = {};
    for (const [incomingKey, value] of Object.entries(raw ?? {})) {
      const canonical = ALIAS_TO_KEY[cleanHeader(incomingKey)];
      if (canonical) remapped[canonical] = value;
    }
    return toGridRow(remapped);
  });
}

export interface UploadColumnCheck {
  /** Required columns that the uploaded sheet does not provide. */
  missing: ColumnDef[];
  /** Uploaded headers that don't map to any known column (ignored on import). */
  unknownHeaders: string[];
}

/**
 * Check whether an uploaded sheet's columns match our schema.
 *
 * `columns` are the (cleaned) headers reported by the backend; if absent we fall
 * back to the keys present on the data rows. A header matches a column when it
 * equals the column's key, label, or one of its aliases (after cleaning).
 *
 * This only checks *column names* — cell values are NOT inspected here, so a
 * sheet with the right columns but bad values still imports and is caught later
 * by validation.
 */
export function inspectUploadColumns(
  rawRows: Array<Record<string, unknown>>,
  columns: string[] = [],
): UploadColumnCheck {
  const headerKeys = new Set<string>();
  for (const c of columns) headerKeys.add(cleanHeader(c));
  if (headerKeys.size === 0) {
    // No header list supplied → derive from the data rows' keys.
    for (const row of rawRows ?? []) {
      for (const key of Object.keys(row ?? {})) headerKeys.add(cleanHeader(key));
    }
  }

  const recognized = new Set<string>();
  for (const key of headerKeys) {
    const canonical = ALIAS_TO_KEY[key];
    if (canonical) recognized.add(canonical);
  }

  const missing = COLUMNS.filter((c) => c.required && !recognized.has(c.key));
  const unknownHeaders = [...headerKeys].filter((k) => k && !ALIAS_TO_KEY[k]);
  return { missing, unknownHeaders };
}
