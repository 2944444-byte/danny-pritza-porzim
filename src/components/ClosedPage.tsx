/**
 * ClosedPage.tsx
 * -----------------------------------------------------------------------------
 * Full-screen "we're closed" page shown to users outside the allowed days/hours.
 * The message comes from the backend (Hebrew) and is rendered right-to-left.
 */

import { Anchor, Button, Center, Paper, Stack, Text } from '@mantine/core';

export interface ClosedPageProps {
  message: string;
  onRetry: () => void;
  /** Navigate to the admin page (routing is owned by the parent). */
  onAdmin: () => void;
}

export function ClosedPage({ message, onRetry, onAdmin }: ClosedPageProps) {
  return (
    <Center
      mih="100vh"
      p="md"
      style={{ background: 'linear-gradient(160deg, #1f2733 0%, #2f3b4c 100%)' }}
    >
      <Stack align="center" gap="lg">
        <Paper
          radius="lg"
          p={40}
          maw={520}
          ta="center"
          bg="rgba(255,255,255,0.06)"
          style={{ border: '1px solid rgba(255,255,255,0.12)' }}
        >
          <Text fz={48} lh={1} mb="sm" aria-hidden>
            🔒
          </Text>
          <Text c="white" fw={600} fz="xl" dir="rtl" mb="lg">
            {message}
          </Text>
          <Button size="md" onClick={onRetry}>
            נסו שוב
          </Button>
        </Paper>
        <Anchor component="button" type="button" c="gray.5" size="sm" onClick={onAdmin}>
          Admin
        </Anchor>
      </Stack>
    </Center>
  );
}
