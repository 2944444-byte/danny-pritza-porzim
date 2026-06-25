/**
 * useToasts.ts
 * -----------------------------------------------------------------------------
 * Manages a queue of transient toast notifications. Kept separate from the
 * presentational <ToastStack> so both stay single-purpose.
 */

import { useCallback, useRef, useState } from 'react';
import type { ToastItem, ToastTone } from '../types';

export interface UseToastsResult {
  toasts: ToastItem[];
  notify: (message: string, tone?: ToastTone, ttl?: number) => void;
  dismiss: (id: number) => void;
}

export function useToasts(): UseToastsResult {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback(
    (message: string, tone: ToastTone = 'info', ttl = 4500) => {
      idRef.current += 1;
      const id = idRef.current;
      setToasts((prev) => [...prev, { id, message, tone }]);
      if (ttl > 0) setTimeout(() => dismiss(id), ttl);
    },
    [dismiss],
  );

  return { toasts, notify, dismiss };
}
