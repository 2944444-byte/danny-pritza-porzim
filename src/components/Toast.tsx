/**
 * Toast.tsx
 * -----------------------------------------------------------------------------
 * Presentational toast stack. State is owned by the `useToasts` hook
 * (src/hooks/useToasts.ts); this component only renders the active toasts.
 */

import type { ToastItem } from '../types';

export interface ToastStackProps {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
}

export function ToastStack({ toasts, onDismiss }: ToastStackProps) {
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
