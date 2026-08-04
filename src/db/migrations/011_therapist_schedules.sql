ALTER TABLE staff_users
ADD COLUMN role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('staff', 'therapist'));

CREATE TABLE therapists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  staff_user_id INTEGER UNIQUE REFERENCES staff_users(id) ON DELETE SET NULL,
  normalized_name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL CHECK (length(display_name) BETWEEN 1 AND 100),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO therapists (normalized_name, display_name)
SELECT lower(trim(therapist_name)), min(trim(therapist_name))
FROM appointments
WHERE trim(therapist_name) <> ''
GROUP BY lower(trim(therapist_name));

CREATE TABLE therapist_slots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  therapist_id INTEGER NOT NULL REFERENCES therapists(id) ON DELETE CASCADE,
  scheduled_at TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (therapist_id, scheduled_at)
);

CREATE INDEX therapist_slots_schedule_idx
ON therapist_slots (scheduled_at, therapist_id);

ALTER TABLE appointments
ADD COLUMN therapist_id INTEGER REFERENCES therapists(id) ON DELETE RESTRICT;

ALTER TABLE appointments
ADD COLUMN slot_id INTEGER REFERENCES therapist_slots(id) ON DELETE RESTRICT;

UPDATE appointments
SET therapist_id = (
  SELECT therapists.id
  FROM therapists
  WHERE therapists.normalized_name = lower(trim(appointments.therapist_name))
);

CREATE INDEX appointments_therapist_idx
ON appointments (therapist_id, scheduled_at, id);

CREATE UNIQUE INDEX appointments_open_slot_id_unique_idx
ON appointments (slot_id)
WHERE slot_id IS NOT NULL AND status IN ('pending', 'confirmed');
