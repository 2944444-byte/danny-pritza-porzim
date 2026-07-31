/**
 * notify.ts
 * -----------------------------------------------------------------------------
 * Centralized notification adapter over Mantine notifications. This is the one
 * place the app raises toasts, so it can be called from anywhere — components
 * and the TanStack Query error handler alike (`notifications.show` works outside
 * React once <Notifications/> is mounted).
 */

import { notifications } from '@mantine/notifications';
import type { ToastTone } from '../types';

const COLOR: Record<ToastTone, string> = {
  info: 'blue',
  success: 'teal',
  error: 'red',
};

/** Raise a toast. Errors linger a little longer. */
export function notify(message: string, tone: ToastTone = 'info'): void {
  notifications.show({
    message,
    color: COLOR[tone],
    autoClose: tone === 'error' ? 7000 : 4500,
    withBorder: true,
  });
}
