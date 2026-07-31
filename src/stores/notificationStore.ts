/**
 * notificationStore.ts
 * -----------------------------------------------------------------------------
 * Zustand store for app-wide toast notifications — genuine client/UI state that
 * is shared across pages (HomePage, AdminPage) and the TanStack Query error
 * handler, and rendered once by <ToastStack> at the root.
 *
 * `notify` / `dismiss` are exported as plain functions (backed by the store's
 * `getState()`) so they can be called from outside React, e.g. the centralized
 * Query error handler.
 */

import { create } from 'zustand';
import type { ToastItem, ToastTone } from '../types';

interface NotificationState {
  toasts: ToastItem[];
  notify: (message: string, tone?: ToastTone, ttl?: number) => void;
  dismiss: (id: number) => void;
}

let counter = 0;

export const useNotificationStore = create<NotificationState>((set, get) => ({
  toasts: [],
  notify: (message, tone = 'info', ttl = 4500) => {
    counter += 1;
    const id = counter;
    set((state) => ({ toasts: [...state.toasts, { id, message, tone }] }));
    if (ttl > 0) setTimeout(() => get().dismiss(id), ttl);
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

/** Call from anywhere (including non-React code) to raise a toast. */
export const notify = (message: string, tone?: ToastTone, ttl?: number): void =>
  useNotificationStore.getState().notify(message, tone, ttl);

/** Dismiss a toast by id from anywhere. */
export const dismiss = (id: number): void => useNotificationStore.getState().dismiss(id);

/** Hook: subscribe to the current toast list (selector avoids extra re-renders). */
export const useToasts = (): ToastItem[] => useNotificationStore((s) => s.toasts);
