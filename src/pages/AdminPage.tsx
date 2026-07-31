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
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { saveSchedule, saveOffices } from '../api/phoneMappingApi';
import { useScheduleQuery, useOfficesQuery, useAvailabilityQuery } from '../hooks/queries';
import { queryKeys } from '../lib/queryClient';
import { notify } from '../stores/notificationStore';
import { usePreferencesStore } from '../stores/preferencesStore';
import type { DaySchedule, Schedule } from '../types';

// 0 = Sunday … 6 = Saturday (matches the backend's day keys).
const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function AdminPage() {
  const queryClient = useQueryClient();
  const scheduleQuery = useScheduleQuery();
  const officesQuery = useOfficesQuery();
  const availabilityQuery = useAvailabilityQuery();

  // Admin token is a persisted client preference (Zustand).
  const adminToken = usePreferencesStore((s) => s.adminToken);
  const setAdminToken = usePreferencesStore((s) => s.setAdminToken);

  // Editable local copies, seeded from the queries once they load.
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [offices, setOffices] = useState<string[]>([]);

  useEffect(() => {
    if (scheduleQuery.data) setSchedule(scheduleQuery.data);
  }, [scheduleQuery.data]);
  useEffect(() => {
    if (officesQuery.data) setOffices(officesQuery.data);
  }, [officesQuery.data]);

  const loading = scheduleQuery.isLoading || officesQuery.isLoading;
  const availability = availabilityQuery.data ?? null;

  // --- Offices editor ---
  const updateOffice = (index: number, value: string) =>
    setOffices((prev) => prev.map((o, i) => (i === index ? value : o)));
  const addOffice = () => setOffices((prev) => [...prev, '']);
  const removeOffice = (index: number) =>
    setOffices((prev) => prev.filter((_, i) => i !== index));

  const updateDay = (dayKey: string, patch: Partial<DaySchedule>) => {
    setSchedule((prev) =>
      prev
        ? { ...prev, days: { ...prev.days, [dayKey]: { ...prev.days[dayKey], ...patch } } }
        : prev,
    );
  };

  // --- Mutations (invalidate the relevant queries on success) ---
  const scheduleMutation = useMutation({
    mutationFn: (next: Schedule) => saveSchedule(next, adminToken || undefined),
    onSuccess: (saved) => {
      setSchedule(saved);
      queryClient.invalidateQueries({ queryKey: queryKeys.schedule });
      queryClient.invalidateQueries({ queryKey: queryKeys.availability });
      notify('Schedule saved.', 'success');
    },
  });

  const officesMutation = useMutation({
    mutationFn: (next: string[]) => saveOffices(next, adminToken || undefined),
    onSuccess: (saved) => {
      setOffices(saved);
      queryClient.invalidateQueries({ queryKey: queryKeys.offices });
      queryClient.invalidateQueries({ queryKey: queryKeys.schemaMeta });
      notify('Offices saved.', 'success');
    },
  });

  const handleSave = () => {
    if (schedule) scheduleMutation.mutate(schedule);
  };
  const handleSaveOffices = () =>
    officesMutation.mutate(offices.map((o) => o.trim()).filter(Boolean));

  const saving = scheduleMutation.isPending;
  const savingOffices = officesMutation.isPending;

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
        <Link className="btn" to="/">
          ← Back to app
        </Link>
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

          <section className="admin-section">
            <h2 className="admin-section__title">Office dropdown options</h2>
            <p className="app__subtitle">
              The list of offices users can choose for “Office Name”. Saving updates the dropdown
              and what counts as a valid office during validation.
            </p>

            <div className="offices-list">
              {offices.map((office, index) => (
                <div className="office-row" key={index}>
                  <input
                    type="text"
                    className="form__input"
                    value={office}
                    onChange={(e) => updateOffice(index, e.target.value)}
                    placeholder="Office name"
                  />
                  <button
                    type="button"
                    className="btn btn--danger btn--icon"
                    onClick={() => removeOffice(index)}
                    aria-label={`Remove office ${index + 1}`}
                    title="Remove"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <div className="offices-actions">
              <button type="button" className="btn" onClick={addOffice}>
                ＋ Add office
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={handleSaveOffices}
                disabled={savingOffices}
              >
                {savingOffices ? 'Saving…' : 'Save offices'}
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
