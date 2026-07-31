/**
 * Toast.tsx
 * -----------------------------------------------------------------------------
 * Presentational toast stack. Reads the active toasts from the app-wide
 * notification store (src/lib/notify.ts) and is mounted once at the app root, so
 * notifications appear on every route.
 */

import { useToasts, dismiss } from '../lib/notify';

export function ToastStack() {
  const toasts = useToasts();
  return (
    <div className="toast-stack" aria-live="assertive">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast--${t.tone}`} role="alert">
          <span className="toast__message">{t.message}</span>
          <button
            type="button"
            className="toast__close"
            aria-label="Dismiss notification"
            onClick={() => dismiss(t.id)}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
