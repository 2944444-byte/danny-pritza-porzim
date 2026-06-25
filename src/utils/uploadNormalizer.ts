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
import type { GridRow } from '../types';

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
