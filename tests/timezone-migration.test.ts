import { describe, expect, it } from "vitest";

import { createDatabase, type ClinicDatabase } from "../src/db/index.js";
import { migrateDatabase } from "../src/db/migrate.js";

const APPLIED_BEFORE_TIMEZONES = [
  "001_agents.sql", "002_ailments.sql", "003_agent_ailments.sql", "004_therapies.sql",
  "005_ailment_therapies.sql", "006_appointments.sql", "007_feedback.sql", "008_feedback_approval.sql",
  "009_appointment_open_slot_unique.sql", "010_staff_authentication.sql", "011_therapist_schedules.sql",
  "012_therapist_provisioning_triggers.sql", "013_visitor_notifications.sql", "014_multi_site_operations.sql",
];

async function phase14Database(localTime: string): Promise<ClinicDatabase> {
  const db = createDatabase({ url: ":memory:" });
  await db.executeMultiple(`
    CREATE TABLE schema_migrations (filename TEXT PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE sites (id INTEGER PRIMARY KEY, slug TEXT NOT NULL, name TEXT NOT NULL, address TEXT NOT NULL, is_active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE therapist_slots (id INTEGER PRIMARY KEY, therapist_id INTEGER NOT NULL, scheduled_at TEXT NOT NULL, is_active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, site_id INTEGER DEFAULT 1);
    CREATE TABLE appointments (id INTEGER PRIMARY KEY, agent_id INTEGER NOT NULL, therapist_name TEXT NOT NULL, scheduled_at TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, therapist_id INTEGER, slot_id INTEGER, notification_email TEXT, notification_consent_at TEXT, site_id INTEGER DEFAULT 1);
    CREATE TABLE notification_outbox (id INTEGER PRIMARY KEY, appointment_id INTEGER NOT NULL, event_kind TEXT NOT NULL, recipient_email TEXT NOT NULL, scheduled_for TEXT NOT NULL, state TEXT NOT NULL DEFAULT 'pending', attempt_count INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, processed_at TEXT, last_error TEXT);
    INSERT INTO sites (id, slug, name, address) VALUES (1, 'context-window-clinic', 'Context Window Clinic', '42 Context Window Way');
    INSERT INTO therapist_slots (id, therapist_id, scheduled_at, site_id) VALUES (1, 1, '${localTime}', 1);
    INSERT INTO appointments (id, agent_id, therapist_name, scheduled_at, status, therapist_id, slot_id, notification_email, notification_consent_at, site_id)
      VALUES (1, 1, 'Dr Legacy', '${localTime}', 'pending', 1, 1, 'visitor@example.com', '2026-10-01T10:00', 1);
    INSERT INTO notification_outbox (id, appointment_id, event_kind, recipient_email, scheduled_for)
      VALUES (1, 1, 'appointment_reminder_24h', 'visitor@example.com', '2026-10-31T01:30');
  `);
  await db.batch(APPLIED_BEFORE_TIMEZONES.map((filename) => ({ sql: "INSERT INTO schema_migrations (filename) VALUES (?)", args: [filename] })), "write");
  return db;
}

describe("timezone migration", () => {
  it("backfills a legacy overlap to the earlier instant and preserves local snapshots", async () => {
    const db = await phase14Database("2026-11-01T01:30");
    try {
      await migrateDatabase(db);
      expect((await db.execute("SELECT time_zone FROM sites WHERE id = 1")).rows[0].time_zone).toBe("America/Los_Angeles");
      expect((await db.execute("SELECT scheduled_at, scheduled_at_utc FROM therapist_slots WHERE id = 1")).rows[0]).toMatchObject({ scheduled_at: "2026-11-01T01:30", scheduled_at_utc: "2026-11-01T08:30Z" });
      expect((await db.execute("SELECT scheduled_at_utc FROM appointments WHERE id = 1")).rows[0].scheduled_at_utc).toBe("2026-11-01T08:30Z");
      expect((await db.execute("SELECT scheduled_for, scheduled_for_utc FROM notification_outbox WHERE id = 1")).rows[0]).toMatchObject({ scheduled_for: "2026-10-31T01:30", scheduled_for_utc: "2026-10-31T08:30Z" });
      expect(Number((await db.execute("SELECT COUNT(*) AS count FROM schema_migrations")).rows[0].count)).toBe(15);
    } finally {
      db.close();
    }
  });

  it("fails before schema mutation for a nonexistent legacy wall time", async () => {
    const db = await phase14Database("2026-03-08T02:30");
    try {
      await expect(migrateDatabase(db)).rejects.toThrow("Cannot migrate local timestamp");
      const siteColumns = (await db.execute("PRAGMA table_info(sites)")).rows.map((row) => row.name);
      expect(siteColumns).not.toContain("time_zone");
      expect(Number((await db.execute("SELECT COUNT(*) AS count FROM schema_migrations")).rows[0].count)).toBe(14);
    } finally {
      db.close();
    }
  });
});
