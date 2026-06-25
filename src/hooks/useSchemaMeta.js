/**
 * useSchemaMeta.js
 * -----------------------------------------------------------------------------
 * Loads dropdown options from `/schema-meta` once on mount and exposes them,
 * along with loading/error state and a `reload` function.
 *
 * Returns the raw map (e.g. { office_name: [...] }) so EditableCell can look up
 * options by a column's `dropdownKey`.
 */

import { useCallback, useEffect, useState } from 'react';
import { fetchSchemaMeta } from '../api/phoneMappingApi.js';

export function useSchemaMeta() {
  const [options, setOptions] = useState(/** @type {Record<string,string[]>} */ ({}));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(/** @type {string|null} */ (null));

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSchemaMeta();
      setOptions(data && typeof data === 'object' ? data : {});
    } catch (e) {
      setError(e?.message ?? 'Failed to load dropdown options.');
      setOptions({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { options, loading, error, reload };
}
