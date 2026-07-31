/**
 * AdminPage.tsx
 * -----------------------------------------------------------------------------
 * Admin screen for controlling when the site is reachable, plus the office
 * dropdown list. Built with Mantine (Container/Stack/Group/Table/Switch/
 * TimeInput/TextInput/Textarea/PasswordInput/Button). Reads via TanStack Query,
 * writes via mutations (invalidating the relevant queries). The admin token is a
 * persisted Zustand preference.
 *
 * Reachable at `#/admin`, and stays reachable even while the site is "closed",
 * so the admin can re-open it.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ActionIcon,
  Alert,
  Button,
  Container,
  Divider,
  Group,
  Loader,
  PasswordInput,
  Stack,
  Switch,
  Table,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core';
import { TimeInput } from '@mantine/dates';
import { saveSchedule, saveOffices } from '../api/phoneMappingApi';
import { useScheduleQuery, useOfficesQuery, useAvailabilityQuery } from '../hooks/queries';
import { queryKeys } from '../lib/queryClient';
import { notify } from '../lib/notify';
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
    <Container size="lg" py="lg">
      <Stack gap="md">
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <div>
            <Title order={1} fz="1.6rem">
              Admin · Site Availability
            </Title>
            <Text c="dimmed" size="sm" maw="60ch">
              Choose which days and hours the site is reachable. Outside these times users see a
              closed page and validation is disabled.
            </Text>
          </div>
          <Button component={Link} to="/" variant="default">
            ← Back to app
          </Button>
        </Group>

        {availability && (
          <Alert color={availability.open ? 'teal' : 'red'} variant="light" role="status">
            {statusLabel}
          </Alert>
        )}

        {loading && (
          <Group gap="xs">
            <Loader size="sm" />
            <Text size="sm">Loading settings…</Text>
          </Group>
        )}

        {schedule && (
          <>
            <Table withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Day</Table.Th>
                  <Table.Th>Open?</Table.Th>
                  <Table.Th>From</Table.Th>
                  <Table.Th>To</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {DAY_LABELS.map((label, idx) => {
                  const key = String(idx);
                  const day = schedule.days[key];
                  if (!day) return null;
                  return (
                    <Table.Tr key={key}>
                      <Table.Td>{label}</Table.Td>
                      <Table.Td>
                        <Switch
                          checked={day.enabled}
                          onChange={(e) => updateDay(key, { enabled: e.currentTarget.checked })}
                          label={day.enabled ? 'Open' : 'Closed'}
                        />
                      </Table.Td>
                      <Table.Td>
                        <TimeInput
                          value={day.open}
                          disabled={!day.enabled}
                          onChange={(e) => updateDay(key, { open: e.currentTarget.value })}
                          w={130}
                        />
                      </Table.Td>
                      <Table.Td>
                        <TimeInput
                          value={day.close}
                          disabled={!day.enabled}
                          onChange={(e) => updateDay(key, { close: e.currentTarget.value })}
                          w={130}
                        />
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>

            <Group grow align="flex-start">
              <TextInput
                label="Timezone"
                placeholder="Asia/Jerusalem"
                value={schedule.timezone}
                onChange={(e) => setSchedule({ ...schedule, timezone: e.currentTarget.value })}
              />
              <Textarea
                label="Closed message (shown to users)"
                dir="rtl"
                autosize
                minRows={2}
                value={schedule.closed_message}
                onChange={(e) => setSchedule({ ...schedule, closed_message: e.currentTarget.value })}
              />
              <PasswordInput
                label="Admin token"
                description="Only if the server requires one"
                placeholder="leave blank if not configured"
                autoComplete="off"
                value={adminToken}
                onChange={(e) => setAdminToken(e.currentTarget.value)}
              />
            </Group>

            <Group justify="flex-end">
              <Button onClick={handleSave} loading={saving}>
                Save schedule
              </Button>
            </Group>

            <Divider my="sm" />

            <div>
              <Title order={2} fz="1.15rem">
                Office dropdown options
              </Title>
              <Text c="dimmed" size="sm" maw="60ch">
                The list of offices users can choose for “Office Name”. Saving updates the dropdown
                and what counts as a valid office during validation.
              </Text>
            </div>

            <Stack gap="xs" maw={480}>
              {offices.map((office, index) => (
                <Group key={index} gap="xs" wrap="nowrap">
                  <TextInput
                    flex={1}
                    placeholder="Office name"
                    value={office}
                    onChange={(e) => updateOffice(index, e.currentTarget.value)}
                  />
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    onClick={() => removeOffice(index)}
                    aria-label={`Remove office ${index + 1}`}
                    title="Remove"
                  >
                    ✕
                  </ActionIcon>
                </Group>
              ))}
            </Stack>

            <Group justify="space-between" maw={480}>
              <Button variant="default" onClick={addOffice}>
                ＋ Add office
              </Button>
              <Button onClick={handleSaveOffices} loading={savingOffices}>
                Save offices
              </Button>
            </Group>
          </>
        )}
      </Stack>
    </Container>
  );
}
