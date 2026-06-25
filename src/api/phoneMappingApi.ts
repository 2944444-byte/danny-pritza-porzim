/**
 * phoneMappingApi.ts
 * -----------------------------------------------------------------------------
 * The application's *only* knowledge of backend route shapes. Every component
 * and hook calls these functions instead of touching URLs or fetch directly.
 *
 * The raw validation/schema response shapes are deliberately NOT interpreted
 * here — that lives in utils/validationAdapter.ts so the mapping logic is
 * isolated and easy to adjust if the backend changes its response format.
 */

import { requestJson, requestBlob, type BlobResult } from './client';
import { ENDPOINTS } from '../config/appConfig';
import type { BackendRow, EmailParams, SchemaMeta } from '../types';

/**
 * Fetch dropdown configuration (e.g. the list of valid office names).
 * Backend: GET /schema-meta → e.g. { "office_name": ["New York HQ", ...] }
 */
export function fetchSchemaMeta(): Promise<SchemaMeta> {
  return requestJson<SchemaMeta>(ENDPOINTS.schemaMeta, { method: 'GET' });
}

/**
 * Validate the full table. The backend decides what's valid for each cell.
 * Backend: POST /validate-table with body = array of row objects.
 * The response shape is normalized elsewhere (validationAdapter).
 */
export function validateTable(rows: BackendRow[]): Promise<unknown> {
  return requestJson<unknown>(ENDPOINTS.validateTable, {
    method: 'POST',
    body: JSON.stringify(rows),
  });
}

/**
 * Upload an Excel file to be parsed into rows.
 * Backend: POST /upload-excel (multipart, field "file") → { "data": [ {row}, ... ] }
 */
export async function uploadExcel(file: File): Promise<Array<Record<string, unknown>>> {
  const formData = new FormData();
  formData.append('file', file);
  const result = await requestJson<unknown>(ENDPOINTS.uploadExcel, {
    method: 'POST',
    body: formData,
  });
  // Backend returns { data: [...] }; tolerate a bare array too.
  if (Array.isArray(result)) return result as Array<Record<string, unknown>>;
  const data = (result as { data?: unknown })?.data;
  return Array.isArray(data) ? (data as Array<Record<string, unknown>>) : [];
}

/**
 * Download the blank Excel template.
 * Backend: GET /download-template → xlsx blob
 */
export function downloadTemplate(): Promise<BlobResult> {
  return requestBlob(ENDPOINTS.downloadTemplate, { method: 'GET' });
}

/**
 * Download the current (validated) data as an Excel file.
 * Backend: POST /download-excel with body = array of row objects → xlsx blob.
 */
export function downloadExcel(rows: BackendRow[]): Promise<BlobResult> {
  return requestBlob(ENDPOINTS.downloadExcel, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(rows),
  });
}

/**
 * Send an email report containing the current (validated) data.
 * Backend: POST /send-email with body = { recipient, data, subject, message }.
 */
export function sendEmailReport(
  params: EmailParams & { rows: BackendRow[] },
): Promise<unknown> {
  const { recipient, rows, subject, message } = params;
  return requestJson<unknown>(ENDPOINTS.sendEmail, {
    method: 'POST',
    body: JSON.stringify({ recipient, data: rows, subject, message }),
  });
}
