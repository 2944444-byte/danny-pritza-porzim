/**
 * notify.ts
 * -----------------------------------------------------------------------------
 * A tiny app-wide notification store, callable from anywhere — including outside
 * React (e.g. TanStack Query's centralized error handler). Backed by a module
 * singleton + `useSyncExternalStore`, so no Context/provider is required.
 *
 * (In a later step this can be folded into a Zustand store; for now it is a
 * plain external store so the Query error handler has a notification system.)
 */

import { useSyncExternalStore } from 'react';
import type { ToastItem, ToastTone } from '../types';

let toasts: ToastItem[] = [];
let counter = 0;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

/** Push a notification. Auto-dismisses after `ttl` ms (0 = sticky). */
export function notify(message: string, tone: ToastTone = 'info', ttl = 4500): void {
  counter += 1;
  const id = counter;
  toasts = [...toasts, { id, message, tone }];
  emit();
  if (ttl > 0) setTimeout(() => dismiss(id), ttl);
}

export function dismiss(id: number): void {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

/** React hook: subscribe to the current toast list. */
export function useToasts(): ToastItem[] {
  return useSyncExternalStore(
    subscribe,
    () => toasts,
    () => toasts,
  );
}
