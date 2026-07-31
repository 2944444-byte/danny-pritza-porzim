/**
 * queryClient.ts
 * -----------------------------------------------------------------------------
 * Central TanStack Query client with a single, app-wide error-handling layer:
 * any query or mutation error surfaces one toast via the notification store.
 * Individual queries/mutations can still add their own onError for custom
 * behavior; this is the shared default so error handling isn't duplicated.
 */

import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { notify } from './notify';

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong.';
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => notify(toMessage(error), 'error', 7000),
  }),
  mutationCache: new MutationCache({
    onError: (error) => notify(toMessage(error), 'error', 7000),
  }),
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

/** Stable query keys used across the app. */
export const queryKeys = {
  schemaMeta: ['schema-meta'] as const,
  availability: ['availability'] as const,
  schedule: ['schedule'] as const,
  offices: ['offices'] as const,
};
