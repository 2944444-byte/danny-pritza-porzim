/**
 * preferencesStore.ts
 * -----------------------------------------------------------------------------
 * Zustand store for persisted client-side user preferences. Currently holds the
 * admin token (a "remember me" preference for the admin page). Persisted to
 * localStorage via Zustand's `persist` middleware, replacing hand-rolled
 * localStorage sync.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PreferencesState {
  /** Admin token sent as X-Admin-Token when saving admin settings. */
  adminToken: string;
  setAdminToken: (token: string) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      adminToken: '',
      setAdminToken: (adminToken) => set({ adminToken }),
    }),
    { name: 'phoneMapping.preferences' },
  ),
);
