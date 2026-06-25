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
import type {
  Availability,
  BackendRow,
  EmailParams,
  SchemaMeta,
  Schedule,
  UploadResult,
} from '../types';

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
export async function uploadExcel(file: File): Promise<UploadResult> {
  const formData = new FormData();
  formData.append('file', file);
  const result = await requestJson<unknown>(ENDPOINTS.uploadExcel, {
    method: 'POST',
    body: formData,
  });
  // Backend returns { data: [...], columns: [...] }; tolerate a bare array too.
  if (Array.isArray(result)) {
    return { rows: result as Array<Record<string, unknown>>, columns: [] };
  }
  const obj = (result ?? {}) as { data?: unknown; columns?: unknown };
  return {
    rows: Array.isArray(obj.data) ? (obj.data as Array<Record<string, unknown>>) : [],
    columns: Array.isArray(obj.columns) ? (obj.columns as string[]) : [],
  };
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
export function downloadExcel(rows: BackendRow[], title?: string): Promise<BlobResult> {
  const query = title ? `?title=${encodeURIComponent(title)}` : '';
  return requestBlob(`${ENDPOINTS.downloadExcel}${query}`, {
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
  params: EmailParams & { rows: BackendRow[]; title?: string },
): Promise<unknown> {
  const { recipient, rows, subject, message, title } = params;
  return requestJson<unknown>(ENDPOINTS.sendEmail, {
    method: 'POST',
    body: JSON.stringify({ recipient, data: rows, subject, message, title }),
  });
}

/**
 * Current open/closed status (and the closed message).
 * Backend: GET /availability
 */
export function fetchAvailability(): Promise<Availability> {
  return requestJson<Availability>(ENDPOINTS.availability, { method: 'GET' });
}

/**
 * Load the full weekly schedule (admin page).
 * Backend: GET /admin/schedule
 */
export function fetchSchedule(): Promise<Schedule> {
  return requestJson<Schedule>(ENDPOINTS.adminSchedule, { method: 'GET' });
}

/**
 * Save the weekly schedule (admin page). When the server has an ADMIN_TOKEN
 * configured, `adminToken` is sent as the `X-Admin-Token` header.
 * Backend: PUT /admin/schedule
 */
export function saveSchedule(schedule: Schedule, adminToken?: string): Promise<Schedule> {
  return requestJson<Schedule>(ENDPOINTS.adminSchedule, {
    method: 'PUT',
    body: JSON.stringify(schedule),
    headers: adminToken ? { 'X-Admin-Token': adminToken } : undefined,
  });
}

/** Load the admin-editable list of valid office names. GET /admin/offices */
export async function fetchOffices(): Promise<string[]> {
  const result = await requestJson<{ offices?: unknown }>(ENDPOINTS.adminOffices, {
    method: 'GET',
  });
  return Array.isArray(result.offices) ? (result.offices as string[]) : [];
}

/** Replace the offices dropdown list (admin). PUT /admin/offices */
export async function saveOffices(offices: string[], adminToken?: string): Promise<string[]> {
  const result = await requestJson<{ offices?: unknown }>(ENDPOINTS.adminOffices, {
    method: 'PUT',
    body: JSON.stringify({ offices }),
    headers: adminToken ? { 'X-Admin-Token': adminToken } : undefined,
  });
  return Array.isArray(result.offices) ? (result.offices as string[]) : [];
}
