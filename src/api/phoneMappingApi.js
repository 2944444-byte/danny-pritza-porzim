/**
 * phoneMappingApi.js
 * -----------------------------------------------------------------------------
 * The application's *only* knowledge of backend route shapes. Every component
 * and hook calls these functions instead of touching URLs or fetch directly.
 *
 * Each function:
 *  - knows its endpoint (from config/appConfig ENDPOINTS),
 *  - sends/receives the payload the backend expects,
 *  - returns plain JS data (or a Blob for downloads).
 *
 * The raw validation/schema response shapes are deliberately NOT interpreted
 * here — that lives in utils/validationAdapter.js so the mapping logic is
 * isolated and easy to adjust if the backend changes its response format.
 */

import { requestJson, requestBlob } from './client.js';
import { ENDPOINTS } from '../config/appConfig.js';

/**
 * Fetch dropdown configuration (e.g. the list of valid office names).
 * Backend: GET /schema-meta  →  e.g. { "office_name": ["New York HQ", ...] }
 * @returns {Promise<Record<string, string[]>>}
 */
export function fetchSchemaMeta() {
  return requestJson(ENDPOINTS.schemaMeta, { method: 'GET' });
}

/**
 * Validate the full table. The backend decides what's valid for each cell.
 * Backend: POST /validate-table  with body = array of row objects.
 * The response shape is normalized elsewhere (validationAdapter).
 * @param {Array<Record<string, unknown>>} rows  Rows keyed by canonical column keys.
 * @returns {Promise<unknown>} Raw validation response.
 */
export function validateTable(rows) {
  return requestJson(ENDPOINTS.validateTable, {
    method: 'POST',
    body: JSON.stringify(rows),
  });
}

/**
 * Upload an Excel file to be parsed into rows.
 * Backend: POST /upload-excel (multipart/form-data, field name "file")
 *          →  { "data": [ { ...row }, ... ] }
 * @param {File} file
 * @returns {Promise<Array<Record<string, unknown>>>} Parsed rows (un-normalized).
 */
export async function uploadExcel(file) {
  const formData = new FormData();
  formData.append('file', file);
  const result = await requestJson(ENDPOINTS.uploadExcel, {
    method: 'POST',
    body: formData,
  });
  // Backend returns { data: [...] }; tolerate a bare array too.
  return Array.isArray(result) ? result : (result?.data ?? []);
}

/**
 * Download the blank Excel template.
 * Backend: GET /download-template  →  xlsx blob
 * @returns {Promise<{ blob: Blob, filename: string | null }>}
 */
export function downloadTemplate() {
  return requestBlob(ENDPOINTS.downloadTemplate, { method: 'GET' });
}

/**
 * Download the current (validated) data as an Excel file.
 * Backend: POST /download-excel  with body = array of row objects → xlsx blob.
 * @param {Array<Record<string, unknown>>} rows
 * @returns {Promise<{ blob: Blob, filename: string | null }>}
 */
export function downloadExcel(rows) {
  return requestBlob(ENDPOINTS.downloadExcel, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(rows),
  });
}

/**
 * Send an email report containing the current (validated) data.
 * Backend: POST /send-email  with body = { recipient, data }.
 * @param {{ recipient: string, rows: Array<Record<string, unknown>>, subject?: string, message?: string }} params
 * @returns {Promise<unknown>}
 */
export function sendEmailReport({ recipient, rows, subject, message }) {
  return requestJson(ENDPOINTS.sendEmail, {
    method: 'POST',
    body: JSON.stringify({ recipient, data: rows, subject, message }),
  });
}
