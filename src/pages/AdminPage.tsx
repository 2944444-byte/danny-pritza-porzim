/**
 * AdminPage.tsx
 * -----------------------------------------------------------------------------
 * Admin screen for controlling when the site is reachable. The admin enables
 * specific days and sets an open/close window for each. They can also set the
 * timezone and the (Hebrew) message users see while the site is closed.
 *
 * Reachable at `#/admin`. It stays accessible even when the site is "closed",
 * so the admin can re-open it. Saving requires the admin token only if the
 * server has one configured (ADMIN_TOKEN); otherwise it's open.
 */

import { useEffect, useMemo, useState } from 'react';
import { fetchSchedule, fetchAvailability, saveSchedule } from '../api/phoneMappingApi';
import { ToastStack } from '../components/Toast';
import { useToasts } from '../hooks/useToasts';
import type { Availability, DaySchedule, Schedule } from '../types';

// 0 = Sunday … 6 = Saturday (matches the backend's day keys).
const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const ADMIN_TOKEN_STORAGE_KEY = 'phoneMapping.adminToken';

export default function AdminPage() {
  const { toasts, notify, dismiss } = useToasts();
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [adminToken, setAdminToken] = useState<string>(
    () => localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY) ?? '',
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load the schedule + current status on mount.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [sched, avail] = await Promise.all([fetchSchedule(), fetchAvailability()]);
        if (!active) return;
        setSchedule(sched);
        setAvailability(avail);
      } catch (e) {
        notify(e instanceof Error ? e.message : 'Failed to load schedule.', 'error', 7000);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [notify]);

  const updateDay = (dayKey: string, patch: Partial<DaySchedule>) => {
    setSchedule((prev) =>
      prev
        ? { ...prev, days: { ...prev.days, [dayKey]: { ...prev.days[dayKey], ...patch } } }
        : prev,
    );
  };

  const handleSave = async () => {
    if (!schedule) return;
    setSaving(true);
    try {
      const saved = await saveSchedule(schedule, adminToken || undefined);
      localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, adminToken);
      setSchedule(saved);
      // Refresh the live status after saving.
      setAvailability(await fetchAvailability());
      notify('Schedule saved.', 'success');
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Failed to save schedule.', 'error', 7000);
    } finally {
      setSaving(false);
    }
  };

  const statusLabel = useMemo(() => {
    if (!availability) return null;
    return availability.open
      ? 'OPEN — users can validate and export now.'
      : `CLOSED (${availability.reason}) — users see the closed page.`;
  }, [availability]);

  return (
    <div className="app admin">
      <header className="app__header">
        <div>
          <h1 className="app__title">Admin · Site Availability</h1>
          <p className="app__subtitle">
            Choose which days and hours the site is reachable. Outside these times users see a
            closed page and validation is disabled.
          </p>
        </div>
        <a className="btn" href="#/">
          ← Back to app
        </a>
      </header>

      {availability && (
        <div
          className={`status-banner status-banner--${availability.open ? 'success' : 'error'}`}
          role="status"
        >
          <span className="status-banner__dot" aria-hidden="true" />
          <span>{statusLabel}</span>
        </div>
      )}

      {loading && <p>Loading schedule…</p>}

      {schedule && (
        <>
          <table className="schedule-table">
            <thead>
              <tr>
                <th>Day</th>
                <th>Open?</th>
                <th>From</th>
                <th>To</th>
              </tr>
            </thead>
            <tbody>
              {DAY_LABELS.map((label, idx) => {
                const key = String(idx);
                const day = schedule.days[key];
                if (!day) return null;
                return (
                  <tr key={key} className={day.enabled ? '' : 'schedule-row--off'}>
                    <td>{label}</td>
                    <td>
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={day.enabled}
                          onChange={(e) => updateDay(key, { enabled: e.target.checked })}
                        />
                        <span>{day.enabled ? 'Open' : 'Closed'}</span>
                      </label>
                    </td>
                    <td>
                      <input
                        type="time"
                        className="form__input"
                        value={day.open}
                        disabled={!day.enabled}
                        onChange={(e) => updateDay(key, { open: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        type="time"
                        className="form__input"
                        value={day.close}
                        disabled={!day.enabled}
                        onChange={(e) => updateDay(key, { close: e.target.value })}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="admin-fields">
            <label className="form__field">
              <span className="form__label">Timezone</span>
              <input
                type="text"
                className="form__input"
                value={schedule.timezone}
                onChange={(e) => setSchedule({ ...schedule, timezone: e.target.value })}
                placeholder="Asia/Jerusalem"
              />
            </label>

            <label className="form__field">
              <span className="form__label">Closed message (shown to users)</span>
              <textarea
                className="form__input form__textarea"
                dir="rtl"
                rows={2}
                value={schedule.closed_message}
                onChange={(e) => setSchedule({ ...schedule, closed_message: e.target.value })}
              />
            </label>

            <label className="form__field">
              <span className="form__label">
                Admin token <span className="form__hint">(only if the server requires one)</span>
              </span>
              <input
                type="password"
                className="form__input"
                value={adminToken}
                onChange={(e) => setAdminToken(e.target.value)}
                placeholder="leave blank if not configured"
                autoComplete="off"
              />
            </label>
          </div>

          <div className="admin-actions">
            <button
              type="button"
              className="btn btn--primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save schedule'}
            </button>
          </div>
        </>
      )}

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
