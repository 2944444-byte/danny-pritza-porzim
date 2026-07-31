/**
 * ClosedPage.tsx
 * -----------------------------------------------------------------------------
 * Full-screen "we're closed" page shown to users when the site is outside its
 * allowed days/hours. The message comes from the backend (Hebrew), so it is
 * rendered right-to-left. A retry button re-checks availability, and a discreet
 * link lets an admin reach the admin page even while the site is closed.
 */

export interface ClosedPageProps {
  message: string;
  onRetry: () => void;
  /** Navigate to the admin page (routing is owned by the parent). */
  onAdmin: () => void;
}

export function ClosedPage({ message, onRetry, onAdmin }: ClosedPageProps) {
  return (
    <div className="closed-page" dir="rtl">
      <div className="closed-card">
        <div className="closed-icon" aria-hidden="true">
          🔒
        </div>
        <p className="closed-message">{message}</p>
        <button type="button" className="btn btn--primary" onClick={onRetry}>
          נסו שוב
        </button>
      </div>
      <button type="button" className="closed-admin-link" onClick={onAdmin} dir="ltr">
        Admin
      </button>
    </div>
  );
}
