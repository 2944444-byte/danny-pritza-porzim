/**
 * EmailDialog.jsx
 * -----------------------------------------------------------------------------
 * Modal form for sending the validated data as an email report. Collects the
 * recipient (pre-filled with the manager's address if provided), an optional
 * subject, and an optional message. Submission is delegated to the parent.
 *
 * The dialog can only be opened when the data is valid (the toolbar enforces
 * this), so it does not re-implement that gate; it focuses on capturing input.
 */

import { useEffect, useRef, useState } from 'react';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function EmailDialog({ open, defaultRecipient = '', rowCount, sending, onClose, onSend }) {
  const [recipient, setRecipient] = useState(defaultRecipient);
  const [subject, setSubject] = useState('Phone Mapping Report');
  const [message, setMessage] = useState('');
  const [touched, setTouched] = useState(false);
  const firstFieldRef = useRef(null);

  // Reset fields each time the dialog opens.
  useEffect(() => {
    if (open) {
      setRecipient(defaultRecipient);
      setSubject('Phone Mapping Report');
      setMessage('');
      setTouched(false);
      // Focus the first field for keyboard users.
      setTimeout(() => firstFieldRef.current?.focus(), 0);
    }
  }, [open, defaultRecipient]);

  if (!open) return null;

  const recipientValid = EMAIL_RE.test(recipient.trim());

  const handleSubmit = (e) => {
    e.preventDefault();
    setTouched(true);
    if (!recipientValid) return;
    onSend({ recipient: recipient.trim(), subject: subject.trim(), message: message.trim() });
  };

  return (
    <div className="modal-overlay" role="presentation" onMouseDown={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="email-dialog-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 id="email-dialog-title" className="modal__title">
          Send Email Report
        </h2>
        <p className="modal__subtitle">
          {rowCount} validated row{rowCount === 1 ? '' : 's'} will be attached as an Excel report.
        </p>

        <form onSubmit={handleSubmit} className="form">
          <label className="form__field">
            <span className="form__label">Recipient email *</span>
            <input
              ref={firstFieldRef}
              type="email"
              className={`form__input${touched && !recipientValid ? ' form__input--error' : ''}`}
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="name@company.com"
              required
            />
            {touched && !recipientValid && (
              <span className="form__error">Please enter a valid email address.</span>
            )}
          </label>

          <label className="form__field">
            <span className="form__label">Subject</span>
            <input
              type="text"
              className="form__input"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </label>

          <label className="form__field">
            <span className="form__label">Message (optional)</span>
            <textarea
              className="form__input form__textarea"
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a note for the recipient…"
            />
          </label>

          <div className="modal__actions">
            <button type="button" className="btn" onClick={onClose} disabled={sending}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn--accent"
              disabled={sending || !recipientValid}
            >
              {sending ? 'Sending…' : 'Send Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
