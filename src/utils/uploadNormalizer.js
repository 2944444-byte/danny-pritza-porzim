/**
 * uploadNormalizer.js
 * -----------------------------------------------------------------------------
 * Maps the rows returned by `/upload-excel` onto our canonical column keys.
 *
 * The backend cleans Excel headers with `col.strip().lower().replace(" ", "_")`,
 * which can produce keys that don't exactly match our canonical `key`s
 * (e.g. "Geographic Location (WKT)" → "geographic_location_(wkt)"). Each column
 * declares `aliases` in config/columns.js; here we build a lookup from every
 * alias/cleaned-header to the canonical key and remap incoming rows accordingly.
 *
 * This keeps the rest of the app working purely in canonical keys, regardless of
 * how the source spreadsheet was labeled.
 */

import { COLUMNS } from '../config/columns.js';
import { toGridRow } from './rowFactory.js';

/** Apply the same normalization the backend applies to a header string. */
function cleanHeader(header) {
  return String(header).trim().toLowerCase().replace(/\s+/g, '_');
}

/** alias/cleaned-header (cleaned) → canonical key */
const ALIAS_TO_KEY = (() => {
  const map = {};
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
 * @param {Array<Record<string, unknown>>} rawRows
 * @returns {Array<Record<string, unknown>>}
 */
export function normalizeUploadedRows(rawRows) {
  if (!Array.isArray(rawRows)) return [];
  return rawRows.map((raw) => {
    const remapped = {};
    for (const [incomingKey, value] of Object.entries(raw ?? {})) {
      const canonical = ALIAS_TO_KEY[cleanHeader(incomingKey)];
      if (canonical) remapped[canonical] = value;
    }
    return toGridRow(remapped);
  });
}
