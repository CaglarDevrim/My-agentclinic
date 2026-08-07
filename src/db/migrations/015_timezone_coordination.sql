ALTER TABLE sites
ADD COLUMN time_zone TEXT NOT NULL DEFAULT 'America/Los_Angeles'
CHECK (length(time_zone) BETWEEN 1 AND 100);

ALTER TABLE therapist_slots
ADD COLUMN scheduled_at_utc TEXT;

ALTER TABLE appointments
ADD COLUMN scheduled_at_utc TEXT;

ALTER TABLE notification_outbox
ADD COLUMN scheduled_for_utc TEXT;

CREATE INDEX therapist_slots_site_utc_schedule_idx
ON therapist_slots (site_id, scheduled_at_utc, therapist_id);

CREATE INDEX appointments_site_utc_schedule_idx
ON appointments (site_id, scheduled_at_utc, id);

CREATE INDEX notification_outbox_utc_due_idx
ON notification_outbox (state, scheduled_for_utc, id);
