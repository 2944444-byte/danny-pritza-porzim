/**
 * filename.ts
 * -----------------------------------------------------------------------------
 * Turn a user-entered sheet title into a safe `.xlsx` download filename for the
 * whole Excel file. Mirrors the backend's `safe_filename` so the downloaded file
 * and the emailed attachment are named consistently.
 */

const INVALID_FILE_CHARS = /[\\/:*?"<>|]+/g;

export function toExcelFilename(title: string, fallback = 'phone_mappings'): string {
  const cleaned = (title || '')
    .replace(INVALID_FILE_CHARS, '')
    .replace(/\s+/g, ' ')
    .trim();
  const name = cleaned || fallback;
  return name.toLowerCase().endsWith('.xlsx') ? name : `${name}.xlsx`;
}
