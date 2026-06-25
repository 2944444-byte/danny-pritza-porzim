/**
 * client.js
 * -----------------------------------------------------------------------------
 * A tiny, dependency-free HTTP client wrapper around `fetch`.
 *
 * Responsibilities:
 *  - Prefix every request with the configured API base URL.
 *  - Centralize JSON encoding/decoding.
 *  - Normalize backend/network errors into a single `ApiError` type so the UI
 *    can always show a sensible message (including FastAPI's `{ "detail": ... }`).
 *  - Provide a `requestBlob` helper for file downloads (template / export).
 *
 * Keeping all transport concerns here means components and hooks never touch
 * `fetch` directly and stay easy to test and reason about.
 */

import { API_BASE_URL } from '../config/appConfig.js';

/** Error thrown for any non-2xx response or network failure. */
export class ApiError extends Error {
  /**
   * @param {string} message  Human-readable message (safe to show in the UI).
   * @param {number} [status] HTTP status code, if the request reached the server.
   * @param {unknown} [body]  Parsed response body, when available.
   */
  constructor(message, status, body) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

/** Build a full URL from a path, tolerating leading slashes. */
function buildUrl(path) {
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * Try to extract the most useful error message from a failed response.
 * FastAPI conventionally returns `{ "detail": "..." }`.
 */
async function extractError(response) {
  let body;
  try {
    body = await response.clone().json();
  } catch {
    try {
      body = await response.text();
    } catch {
      body = undefined;
    }
  }

  let message;
  if (body && typeof body === 'object' && 'detail' in body) {
    const { detail } = body;
    message = typeof detail === 'string' ? detail : JSON.stringify(detail);
  } else if (typeof body === 'string' && body.trim()) {
    message = body;
  } else {
    message = `Request failed with status ${response.status}.`;
  }

  return new ApiError(message, response.status, body);
}

/**
 * Perform a JSON request and return the parsed JSON body.
 * @template T
 * @param {string} path
 * @param {RequestInit} [options]
 * @returns {Promise<T>}
 */
export async function requestJson(path, options = {}) {
  let response;
  try {
    response = await fetch(buildUrl(path), {
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options.body && !(options.body instanceof FormData)
          ? { 'Content-Type': 'application/json' }
          : {}),
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

  if (response.status === 204) return /** @type {T} */ (undefined);
  return response.json();
}

/**
 * Perform a request that returns a binary file.
 * @param {string} path
 * @param {RequestInit} [options]
 * @returns {Promise<{ blob: Blob, filename: string | null }>}
 */
export async function requestBlob(path, options = {}) {
  let response;
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
function parseFilename(disposition) {
  if (!disposition) return null;
  const match = /filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i.exec(disposition);
  return match ? decodeURIComponent(match[1]) : null;
}
