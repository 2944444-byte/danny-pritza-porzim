/**
 * Toast.jsx
 * -----------------------------------------------------------------------------
 * Presentational toast stack. State is owned by the `useToasts` hook
 * (src/hooks/useToasts.js); this component only renders the active toasts.
 */

/** Renders the active toasts in a fixed stack. */
export function ToastStack({ toasts, onDismiss }) {
  return (
    <div className="toast-stack" aria-live="assertive">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast--${t.tone}`} role="alert">
          <span className="toast__message">{t.message}</span>
          <button
            type="button"
            className="toast__close"
            aria-label="Dismiss notification"
            onClick={() => onDismiss(t.id)}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
