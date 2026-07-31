/**
 * router.tsx
 * -----------------------------------------------------------------------------
 * Centralized React Router configuration.
 *
 * Uses a HASH router so deep links (e.g. `#/admin`) keep working when the SPA is
 * served as static files without server-side route rewrites — matching the
 * previous hash-based navigation.
 *
 * Route map:
 *   /        → AvailabilityLayout (schedule gate) → HomePage
 *   /admin   → AdminPage (NOT gated, so admins can always re-open the site)
 *   *        → redirect to /
 */

import { createHashRouter, Navigate } from 'react-router-dom';
import AvailabilityLayout from './layouts/AvailabilityLayout';
import HomePage from './pages/HomePage';
import AdminPage from './pages/AdminPage';

export const router = createHashRouter([
  {
    element: <AvailabilityLayout />,
    children: [{ index: true, element: <HomePage /> }],
  },
  { path: 'admin', element: <AdminPage /> },
  { path: '*', element: <Navigate to="/" replace /> },
]);
