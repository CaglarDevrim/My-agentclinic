ALTER TABLE appointments
ADD COLUMN notification_email TEXT;

ALTER TABLE appointments
ADD COLUMN notification_consent_at TEXT;

CREATE TRIGGER appointments_notification_contact_insert
BEFORE INSERT ON appointments
WHEN (NEW.notification_email IS NULL) <> (NEW.notification_consent_at IS NULL)
  OR (NEW.notification_email IS NOT NULL AND (length(trim(NEW.notification_email)) < 3 OR length(NEW.notification_email) > 254))
BEGIN
  SELECT RAISE(ABORT, 'invalid appointment notification contact');
END;

CREATE TRIGGER appointments_notification_contact_update
BEFORE UPDATE OF notification_email, notification_consent_at ON appointments
WHEN (NEW.notification_email IS NULL) <> (NEW.notification_consent_at IS NULL)
  OR (NEW.notification_email IS NOT NULL AND (length(trim(NEW.notification_email)) < 3 OR length(NEW.notification_email) > 254))
BEGIN
  SELECT RAISE(ABORT, 'invalid appointment notification contact');
END;

CREATE TABLE notification_outbox (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  appointment_id INTEGER NOT NULL REFERENCES appointments(id) ON DELETE RESTRICT,
  event_kind TEXT NOT NULL CHECK (event_kind IN (
    'appointment_created',
    'appointment_confirmed',
    'appointment_cancelled',
    'appointment_reminder_24h'
  )),
  recipient_email TEXT NOT NULL CHECK (length(recipient_email) BETWEEN 3 AND 254),
  scheduled_for TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'pending' CHECK (state IN ('pending', 'processing', 'processed', 'failed', 'suppressed')),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processed_at TEXT,
  last_error TEXT,
  UNIQUE (appointment_id, event_kind)
);

CREATE INDEX notification_outbox_due_idx
ON notification_outbox (state, scheduled_for, id);
