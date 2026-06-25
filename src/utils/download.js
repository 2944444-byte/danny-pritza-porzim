/**
 * download.js
 * -----------------------------------------------------------------------------
 * Trigger a browser "Save As" for a Blob received from the API. Keeps the
 * object-URL lifecycle (create → click → revoke) in one place.
 */

/**
 * @param {Blob} blob
 * @param {string} filename  Fallback filename if the server didn't supply one.
 */
export function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revoke on the next tick so the download has a chance to start.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
