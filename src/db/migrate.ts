import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { ClinicDatabase } from "./index.js";
import { addUtcMinutes, isValidTimeZone, resolveLegacyLocalMinute } from "../domain/time.js";

const migrationsDirectory = fileURLToPath(new URL("./migrations/", import.meta.url));

async function timezoneCoordinationSql(db: ClinicDatabase): Promise<string> {
  const sitesResult = await db.execute("SELECT id FROM sites ORDER BY id");
  const zones = new Map<number, string>();
  for (const row of sitesResult.rows) {
    const id = Number(row.id);
    const timeZone = "America/Los_Angeles";
    if (!isValidTimeZone(timeZone)) throw new Error("Timezone migration found an unsupported site time zone.");
    zones.set(id, timeZone);
  }

  const slotValues = new Map<number, { siteId: number; local: string; utc: string }>();
  const statements: string[] = [];
  const slots = await db.execute("SELECT id, site_id, scheduled_at FROM therapist_slots ORDER BY id");
  for (const row of slots.rows) {
    const id = Number(row.id);
    const timeZone = zones.get(Number(row.site_id));
    if (!timeZone) throw new Error("Timezone migration found a slot without a valid site.");
    const utc = resolveLegacyLocalMinute(String(row.scheduled_at), timeZone);
    slotValues.set(id, { siteId: Number(row.site_id), local: String(row.scheduled_at), utc });
    statements.push(`UPDATE therapist_slots SET scheduled_at_utc = '${utc}' WHERE id = ${id};`);
  }

  const appointmentUtc = new Map<number, string>();
  const appointments = await db.execute("SELECT id, slot_id, site_id, scheduled_at FROM appointments ORDER BY id");
  for (const row of appointments.rows) {
    const id = Number(row.id);
    const timeZone = zones.get(Number(row.site_id));
    if (!timeZone) throw new Error("Timezone migration found an appointment without a valid site.");
    const utc = resolveLegacyLocalMinute(String(row.scheduled_at), timeZone);
    if (row.slot_id !== null) {
      const slot = slotValues.get(Number(row.slot_id));
      if (!slot || slot.siteId !== Number(row.site_id) || slot.local !== String(row.scheduled_at) || slot.utc !== utc) throw new Error("Timezone migration found a linked appointment/slot mismatch.");
    }
    appointmentUtc.set(id, utc);
    statements.push(`UPDATE appointments SET scheduled_at_utc = '${utc}' WHERE id = ${id};`);
  }

  const notifications = await db.execute("SELECT id, appointment_id, event_kind, scheduled_for FROM notification_outbox ORDER BY id");
  for (const row of notifications.rows) {
    const appointmentId = Number(row.appointment_id);
    const appointment = appointments.rows.find((candidate) => Number(candidate.id) === appointmentId);
    if (!appointment) throw new Error("Timezone migration found an outbox row without an appointment.");
    const appointmentInstant = appointmentUtc.get(appointmentId);
    const timeZone = zones.get(Number(appointment.site_id));
    if (!appointmentInstant || !timeZone) throw new Error("Timezone migration could not resolve an outbox timestamp.");
    const utc = row.event_kind === "appointment_reminder_24h"
      ? addUtcMinutes(appointmentInstant, -24 * 60)
      : resolveLegacyLocalMinute(String(row.scheduled_for), timeZone);
    statements.push(`UPDATE notification_outbox SET scheduled_for_utc = '${utc}' WHERE id = ${Number(row.id)};`);
  }

  statements.push(`
    CREATE UNIQUE INDEX therapist_slots_therapist_utc_unique_idx
    ON therapist_slots (therapist_id, scheduled_at_utc);

    CREATE TRIGGER therapist_slots_timezone_insert
    BEFORE INSERT ON therapist_slots
    WHEN NEW.scheduled_at_utc IS NULL OR length(NEW.scheduled_at_utc) <> 17
      OR NEW.scheduled_at_utc NOT GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]Z'
    BEGIN SELECT RAISE(ABORT, 'missing therapist slot UTC timestamp'); END;

    CREATE TRIGGER therapist_slots_timezone_update
    BEFORE UPDATE OF scheduled_at_utc ON therapist_slots
    WHEN NEW.scheduled_at_utc IS NULL OR length(NEW.scheduled_at_utc) <> 17
      OR NEW.scheduled_at_utc NOT GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]Z'
    BEGIN SELECT RAISE(ABORT, 'missing therapist slot UTC timestamp'); END;

    CREATE TRIGGER appointments_timezone_insert
    BEFORE INSERT ON appointments
    WHEN NEW.scheduled_at_utc IS NULL OR length(NEW.scheduled_at_utc) <> 17
      OR NEW.scheduled_at_utc NOT GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]Z'
      OR (NEW.slot_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM therapist_slots s WHERE s.id = NEW.slot_id
        AND s.site_id = NEW.site_id AND s.scheduled_at = NEW.scheduled_at
        AND s.scheduled_at_utc = NEW.scheduled_at_utc
    ))
    BEGIN SELECT RAISE(ABORT, 'invalid appointment UTC timestamp'); END;

    CREATE TRIGGER appointments_timezone_update
    BEFORE UPDATE OF scheduled_at_utc, scheduled_at, site_id, slot_id ON appointments
    WHEN NEW.scheduled_at_utc IS NULL OR length(NEW.scheduled_at_utc) <> 17
      OR NEW.scheduled_at_utc NOT GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]Z'
      OR (NEW.slot_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM therapist_slots s WHERE s.id = NEW.slot_id
        AND s.site_id = NEW.site_id AND s.scheduled_at = NEW.scheduled_at
        AND s.scheduled_at_utc = NEW.scheduled_at_utc
    ))
    BEGIN SELECT RAISE(ABORT, 'invalid appointment UTC timestamp'); END;

    CREATE TRIGGER notification_outbox_timezone_insert
    BEFORE INSERT ON notification_outbox
    WHEN NEW.scheduled_for_utc IS NULL OR length(NEW.scheduled_for_utc) <> 17
      OR NEW.scheduled_for_utc NOT GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]Z'
    BEGIN SELECT RAISE(ABORT, 'missing notification UTC timestamp'); END;

    CREATE TRIGGER notification_outbox_timezone_update
    BEFORE UPDATE OF scheduled_for_utc ON notification_outbox
    WHEN NEW.scheduled_for_utc IS NULL OR length(NEW.scheduled_for_utc) <> 17
      OR NEW.scheduled_for_utc NOT GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]Z'
    BEGIN SELECT RAISE(ABORT, 'missing notification UTC timestamp'); END;
  `);
  return statements.join("\n");
}

const migrationHooks: Record<string, (db: ClinicDatabase) => Promise<string>> = {
  "015_timezone_coordination.sql": timezoneCoordinationSql,
};

export async function migrateDatabase(db: ClinicDatabase): Promise<void> {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const appliedResult = await db.execute("SELECT filename FROM schema_migrations");
  const applied = new Set(appliedResult.rows.map((row) => String(row.filename)));
  const migrations = readdirSync(migrationsDirectory).filter((filename) => /^\d+_.+\.sql$/.test(filename)).sort();

  for (const filename of migrations) {
    if (applied.has(filename)) continue;
    const migrationSql = readFileSync(`${migrationsDirectory}/${filename}`, "utf8");
    const hookSql = migrationHooks[filename] ? await migrationHooks[filename](db) : "";
    const trustedFilename = filename.replaceAll("'", "''");
    await db.executeMultiple(`
      BEGIN IMMEDIATE;
      ${migrationSql}
      ${hookSql}
      INSERT INTO schema_migrations (filename) VALUES ('${trustedFilename}');
      COMMIT;
    `);
  }
}
