/**
 * client.ts
 * -----------------------------------------------------------------------------
 * A tiny, dependency-free HTTP client wrapper around `fetch`.
 *
 * Responsibilities:
 *  - Prefix every request with the configured API base URL.
 *  - Centralize JSON encoding/decoding.
 *  - Normalize backend/network errors into a single `ApiError` so the UI can
 *    always show a sensible message (including FastAPI's `{ "detail": ... }`).
 *  - Provide a `requestBlob` helper for file downloads (template / export).
 */

import { API_BASE_URL } from '../config/appConfig';

/** Error thrown for any non-2xx response or network failure. */
export class ApiError extends Error {
  status?: number;
  body?: unknown;

  constructor(message: string, status?: number, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

/** Build a full URL from a path, tolerating leading slashes. */
function buildUrl(path: string): string {
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

/** Type guard for `{ detail: ... }`-style error bodies. */
function hasDetail(body: unknown): body is { detail: unknown } {
  return typeof body === 'object' && body !== null && 'detail' in body;
}

/**
 * Try to extract the most useful error message from a failed response.
 * FastAPI conventionally returns `{ "detail": "..." }`.
 */
async function extractError(response: Response): Promise<ApiError> {
  let body: unknown;
  try {
    body = await response.clone().json();
  } catch {
    try {
      body = await response.text();
    } catch {
      body = undefined;
    }
  }

  let message: string;
  if (hasDetail(body)) {
    message = typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail);
  } else if (typeof body === 'string' && body.trim()) {
    message = body;
  } else {
    message = `Request failed with status ${response.status}.`;
  }

  return new ApiError(message, response.status, body);
}

/** Perform a JSON request and return the parsed JSON body. */
export async function requestJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    const isForm = options.body instanceof FormData;
    response = await fetch(buildUrl(path), {
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options.body && !isForm ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    });
  } catch (networkError) {
    throw new ApiError(
      `Could not reach the server at ${API_BASE_URL}. Is the backend running?`,
      undefined,
      networkError,
    );
  }

  if (!response.ok) {
    throw await extractError(response);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/** Result of a binary (file) request. */
export interface BlobResult {
  blob: Blob;
  filename: string | null;
}

/** Perform a request that returns a binary file. */
export async function requestBlob(path: string, options: RequestInit = {}): Promise<BlobResult> {
  let response: Response;
  try {
    response = await fetch(buildUrl(path), options);
  } catch (networkError) {
    throw new ApiError(
      `Could not reach the server at ${API_BASE_URL}. Is the backend running?`,
      undefined,
      networkError,
    );
  }

  if (!response.ok) {
    throw await extractError(response);
  }

  const blob = await response.blob();
  const filename = parseFilename(response.headers.get('Content-Disposition'));
  return { blob, filename };
}

/** Pull `filename` out of a Content-Disposition header, if present. */
function parseFilename(disposition: string | null): string | null {
  if (!disposition) return null;
  const match = /filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i.exec(disposition);
  return match ? decodeURIComponent(match[1]) : null;
}
