/**
 * EmailDialog.tsx
 * -----------------------------------------------------------------------------
 * Mantine Modal for sending the validated data as an email report. Uses Mantine
 * `useForm` for state + validation (recipient required and well-formed). Fields
 * reset each time the modal opens. Submission is delegated to the parent.
 */

import { useEffect } from 'react';
import { Button, Group, Modal, Stack, Text, Textarea, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import type { EmailParams } from '../types';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface EmailDialogProps {
  open: boolean;
  defaultRecipient?: string;
  defaultSubject?: string;
  rowCount: number;
  sending: boolean;
  onClose: () => void;
  onSend: (params: EmailParams) => void;
}

export function EmailDialog({
  open,
  defaultRecipient = '',
  defaultSubject,
  rowCount,
  sending,
  onClose,
  onSend,
}: EmailDialogProps) {
  const form = useForm<EmailParams>({
    initialValues: {
      recipient: defaultRecipient,
      subject: defaultSubject || 'Phone Mapping Report',
      message: '',
    },
    validate: {
      recipient: (v) =>
        EMAIL_RE.test((v ?? '').trim()) ? null : 'Please enter a valid email address.',
    },
  });

  // Reset the form whenever the modal opens.
  useEffect(() => {
    if (open) {
      form.setValues({
        recipient: defaultRecipient,
        subject: defaultSubject || 'Phone Mapping Report',
        message: '',
      });
      form.resetDirty();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultRecipient, defaultSubject]);

  const handleSubmit = form.onSubmit((values) =>
    onSend({
      recipient: values.recipient.trim(),
      subject: values.subject?.trim(),
      message: values.message?.trim(),
    }),
  );

  return (
    <Modal opened={open} onClose={onClose} title="Send Email Report" centered>
      <form onSubmit={handleSubmit}>
        <Stack>
          <Text size="sm" c="dimmed">
            {rowCount} validated row{rowCount === 1 ? '' : 's'} will be attached as an Excel report.
          </Text>
          <TextInput
            label="Recipient email"
            withAsterisk
            placeholder="name@company.com"
            data-autofocus
            {...form.getInputProps('recipient')}
          />
          <TextInput label="Subject" {...form.getInputProps('subject')} />
          <Textarea
            label="Message (optional)"
            autosize
            minRows={3}
            placeholder="Add a note for the recipient…"
            {...form.getInputProps('message')}
          />
          <Group justify="flex-end" mt="sm">
            <Button variant="default" onClick={onClose} disabled={sending}>
              Cancel
            </Button>
            <Button type="submit" color="teal" loading={sending}>
              Send Report
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
