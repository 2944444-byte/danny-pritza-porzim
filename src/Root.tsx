/**
 * Root.tsx
 * -----------------------------------------------------------------------------
 * Top-level router + availability gate.
 *
 *   #/admin  → AdminPage (always reachable, even when the site is "closed",
 *              so the admin can re-open it)
 *   else     → the main app, gated by the schedule: when closed, users see the
 *              ClosedPage instead of the phone-mapping UI.
 *
 * If the availability check itself fails (e.g. backend hiccup), we fail OPEN and
 * render the app — the backend still enforces the schedule on /validate-table,
 * so a transient status error can't silently lock everyone out.
 */

import App from './App';
import AdminPage from './pages/AdminPage';
import { ClosedPage } from './components/ClosedPage';
import { useAvailability } from './hooks/useAvailability';
import { useHashRoute } from './hooks/useHashRoute';

const DEFAULT_CLOSED_MESSAGE = 'אנחנו סגורים כרגע, נסו מאוחר יותר';

function Home() {
  const { availability, loading, reload } = useAvailability();

  // First load, before we know the status.
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
      />
    );
  }

  return <App />;
}

export default function Root() {
  const route = useHashRoute();
  if (route === 'admin') return <AdminPage />;
  return <Home />;
}
