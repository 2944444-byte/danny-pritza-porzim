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
import { ClosedPage } from '../components/ClosedPage';
import { useAvailability } from '../hooks/useAvailability';

const DEFAULT_CLOSED_MESSAGE = 'אנחנו סגורים כרגע, נסו מאוחר יותר';

export default function AvailabilityLayout() {
  const { availability, loading, reload } = useAvailability();
  const navigate = useNavigate();

  if (loading && !availability) {
    return (
      <div className="centered-screen" role="status">
        <span>Loading…</span>
      </div>
    );
  }

  if (availability && !availability.open) {
    return (
      <ClosedPage
        message={availability.message ?? DEFAULT_CLOSED_MESSAGE}
        onRetry={() => void reload()}
        onAdmin={() => navigate('/admin')}
      />
    );
  }

  return <Outlet />;
}
