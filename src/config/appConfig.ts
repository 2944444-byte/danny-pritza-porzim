/**
 * appConfig.ts
 * -----------------------------------------------------------------------------
 * Central, environment-aware configuration for talking to the backend API.
 *
 * Everything that depends on *where* the backend lives or *what the routes are
 * called* is defined here, so wiring the UI to a different deployment (or
 * renaming a route on the backend) is a one-line change.
 *
 * The base URL is read from a Vite env var (`VITE_API_BASE_URL`) so it can be
 * configured per environment without code changes. See `.env.example`.
 */

/** Base URL of the FastAPI backend. Falls back to the local dev default. */
export const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || 'http://localhost:8000';

/**
 * All backend routes in one place. These map 1:1 to the FastAPI endpoints.
 * `downloadExcel` / `sendEmail` correspond to the backend's download/email
 * functions — rename here if yours differ.
 */
export const ENDPOINTS = {
  schemaMeta: '/schema-meta',
  validateTable: '/validate-table',
  uploadExcel: '/upload-excel',
  downloadTemplate: '/download-template',
  downloadExcel: '/download-excel',
  sendEmail: '/send-email',
} as const;

/** Default filenames used when the server does not provide a Content-Disposition. */
export const DEFAULT_EXPORT_FILENAME = 'phone_mappings.xlsx';
export const DEFAULT_TEMPLATE_FILENAME = 'phone_mapping_template.xlsx';
