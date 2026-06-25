/**
 * useHashRoute.ts
 * -----------------------------------------------------------------------------
 * A dependency-free hash router. Returns the current route name derived from
 * `window.location.hash`:
 *   ''            → 'home'
 *   '#/admin'     → 'admin'
 *
 * Hash routing keeps the admin page reachable (e.g. `…/#/admin`) without adding
 * a routing library or server-side route config.
 */

import { useEffect, useState } from 'react';

function currentRoute(): string {
  return window.location.hash.replace(/^#\/?/, '').split('?')[0] || 'home';
}

export function useHashRoute(): string {
  const [route, setRoute] = useState<string>(currentRoute);

  useEffect(() => {
    const onChange = () => setRoute(currentRoute());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  return route;
}
