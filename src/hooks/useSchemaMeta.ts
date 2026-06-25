/**
 * useSchemaMeta.ts
 * -----------------------------------------------------------------------------
 * Loads dropdown options from `/schema-meta` once on mount and exposes them,
 * along with loading/error state and a `reload` function.
 */

import { useCallback, useEffect, useState } from 'react';
import { fetchSchemaMeta } from '../api/phoneMappingApi';
import type { SchemaMeta } from '../types';

export interface UseSchemaMetaResult {
  options: SchemaMeta;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export function useSchemaMeta(): UseSchemaMetaResult {
  const [options, setOptions] = useState<SchemaMeta>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSchemaMeta();
      setOptions(data && typeof data === 'object' ? data : {});
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load dropdown options.');
      setOptions({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { options, loading, error, reload };
}
