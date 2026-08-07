CREATE TABLE sites (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE CHECK (slug = lower(slug) AND length(slug) BETWEEN 1 AND 80),
  name TEXT NOT NULL UNIQUE CHECK (length(name) BETWEEN 1 AND 100),
  address TEXT NOT NULL CHECK (length(address) BETWEEN 1 AND 200),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO sites (id, slug, name, address) VALUES
  (1, 'context-window-clinic', 'Context Window Clinic', '42 Context Window Way, San Francisco, CA 94107'),
  (2, 'token-harbor-clinic', 'Token Harbor Clinic', '88 Token Harbor Drive, Oakland, CA 94607');

ALTER TABLE therapist_slots ADD COLUMN site_id INTEGER DEFAULT 1;
UPDATE therapist_slots SET site_id = 1 WHERE site_id IS NULL;

ALTER TABLE appointments ADD COLUMN site_id INTEGER DEFAULT 1;
UPDATE appointments SET site_id = 1 WHERE site_id IS NULL;

CREATE INDEX therapist_slots_site_schedule_idx ON therapist_slots (site_id, scheduled_at, therapist_id);
CREATE INDEX appointments_site_schedule_idx ON appointments (site_id, scheduled_at, id);

CREATE TRIGGER therapist_slots_site_insert
BEFORE INSERT ON therapist_slots
WHEN NEW.site_id IS NULL OR NOT EXISTS (SELECT 1 FROM sites WHERE id = NEW.site_id)
BEGIN
  SELECT RAISE(ABORT, 'invalid therapist slot site');
END;

CREATE TRIGGER therapist_slots_site_update
BEFORE UPDATE OF site_id ON therapist_slots
WHEN NEW.site_id IS NULL OR NOT EXISTS (SELECT 1 FROM sites WHERE id = NEW.site_id)
BEGIN
  SELECT RAISE(ABORT, 'invalid therapist slot site');
END;

CREATE TRIGGER appointments_site_insert
BEFORE INSERT ON appointments
WHEN NEW.site_id IS NULL
  OR NOT EXISTS (SELECT 1 FROM sites WHERE id = NEW.site_id)
  OR (NEW.slot_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM therapist_slots WHERE id = NEW.slot_id AND site_id = NEW.site_id
  ))
BEGIN
  SELECT RAISE(ABORT, 'invalid appointment site');
END;

CREATE TRIGGER appointments_site_update
BEFORE UPDATE OF site_id, slot_id ON appointments
WHEN NEW.site_id IS NULL
  OR NOT EXISTS (SELECT 1 FROM sites WHERE id = NEW.site_id)
  OR (NEW.slot_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM therapist_slots WHERE id = NEW.slot_id AND site_id = NEW.site_id
  ))
BEGIN
  SELECT RAISE(ABORT, 'invalid appointment site');
END;
