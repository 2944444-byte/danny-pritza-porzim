/**
 * AvailabilityLayout.tsx
 * -----------------------------------------------------------------------------
 * Route layout that gates its child routes behind the site's availability
 * schedule. While the site is closed, users see the ClosedPage instead of the
 * routed page; the admin route lives OUTSIDE this layout so it stays reachable.
 *
 * Fails OPEN: if the availability check errors, the child route still renders
 * (the backend still enforces the schedule on /validate-table).
 */

import { Outlet, useNavigate } from 'react-router-dom';
import { Center, Loader } from '@mantine/core';
import { ClosedPage } from '../components/ClosedPage';
import { useAvailabilityQuery } from '../hooks/queries';

const DEFAULT_CLOSED_MESSAGE = 'אנחנו סגורים כרגע, נסו מאוחר יותר';

export default function AvailabilityLayout() {
  const { data: availability, isLoading: loading, refetch } = useAvailabilityQuery();
  const navigate = useNavigate();

  if (loading && !availability) {
    return (
      <Center mih="100vh" role="status">
        <Loader />
      </Center>
    );
  }

  if (availability && !availability.open) {
    return (
      <ClosedPage
        message={availability.message ?? DEFAULT_CLOSED_MESSAGE}
        onRetry={() => void refetch()}
        onAdmin={() => navigate('/admin')}
      />
    );
  }

  return <Outlet />;
}
