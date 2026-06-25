/**
 * useAvailability.ts
 * -----------------------------------------------------------------------------
 * Polls GET /availability so the UI knows whether the site is currently open
 * (per the admin schedule). Re-checks on an interval so a user sitting on the
 * page gets gated the moment a window closes (and ungated when it reopens).
 */

import { useCallback, useEffect, useState } from 'react';
import { fetchAvailability } from '../api/phoneMappingApi';
import type { Availability } from '../types';

export interface UseAvailabilityResult {
  availability: Availability | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export function useAvailability(pollMs = 60000): UseAvailabilityResult {
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const data = await fetchAvailability();
      setAvailability(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not check availability.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
    if (pollMs <= 0) return undefined;
    const id = window.setInterval(() => void reload(), pollMs);
    return () => window.clearInterval(id);
  }, [reload, pollMs]);

  return { availability, loading, error, reload };
}
