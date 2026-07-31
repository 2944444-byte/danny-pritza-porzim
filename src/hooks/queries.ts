/**
 * queries.ts
 * -----------------------------------------------------------------------------
 * TanStack Query hooks for all server state. Components call these instead of
 * fetching directly; the API functions themselves stay in api/phoneMappingApi.
 * Query keys are centralized in lib/queryClient so invalidation is consistent.
 */

import { useQuery } from '@tanstack/react-query';
import {
  fetchSchemaMeta,
  fetchAvailability,
  fetchSchedule,
  fetchOffices,
} from '../api/phoneMappingApi';
import { queryKeys } from '../lib/queryClient';

/** Dropdown options (office names, …). */
export function useSchemaMetaQuery() {
  return useQuery({ queryKey: queryKeys.schemaMeta, queryFn: fetchSchemaMeta });
}

/** Current open/closed status; polls so the gate reacts to schedule changes. */
export function useAvailabilityQuery() {
  return useQuery({
    queryKey: queryKeys.availability,
    queryFn: fetchAvailability,
    refetchInterval: 60_000,
  });
}

/** The weekly availability schedule (admin page). */
export function useScheduleQuery() {
  return useQuery({ queryKey: queryKeys.schedule, queryFn: fetchSchedule });
}

/** The editable offices list (admin page). */
export function useOfficesQuery() {
  return useQuery({ queryKey: queryKeys.offices, queryFn: fetchOffices });
}
