/**
 * useToasts.js
 * -----------------------------------------------------------------------------
 * Manages a queue of transient toast notifications. Kept separate from the
 * presentational <ToastStack> so both the hook and the component stay
 * single-purpose (and Fast Refresh stays happy).
 */

import { useCallback, useRef, useState } from 'react';

/**
 * @returns {{
 *   toasts: Array<{id:number, message:string, tone:string}>,
 *   notify: (message: string, tone?: string, ttl?: number) => void,
 *   dismiss: (id: number) => void
 * }}
 */
export function useToasts() {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback(
    (message, tone = 'info', ttl = 4500) => {
      idRef.current += 1;
      const id = idRef.current;
      setToasts((prev) => [...prev, { id, message, tone }]);
      if (ttl > 0) setTimeout(() => dismiss(id), ttl);
    },
    [dismiss],
  );

  return { toasts, notify, dismiss };
}
