import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createClient, type Client, type ResultSet } from "@libsql/client";

import { migrateDatabase } from "./migrate.js";
import { seedDatabase } from "./seed.js";
import { normalizeNotificationEmail } from "../domain/notifications.js";
import { addUtcMinutes, isValidTimeZone, localMinuteInZone, resolveLegacyLocalMinute, resolveLocalMinute, utcBoundaryForLocalDate, utcMinute } from "../domain/time.js";
import type { AgentDemand, AgentDetail, AgentRecord, AilmentRecord, AilmentSummary, AppointmentRecord, AppointmentStatus, AvailableSlot, ClinicReport, ClinicReportTotals, ClinicSite, DashboardData, FeedbackInput, FeedbackRecord, NotificationDelivery, PublicReview, ReportAppointmentRow, ReportDateRange, ReviewModerationItem, TherapistSlot, TherapistSummary, TherapistWorkload, TherapyRecord, TherapySummary } from "./types.js";

export type ClinicDatabase = Client;

export interface DatabaseConfig {
  url: string;
  authToken?: string;
}

function isRemoteUrl(url: string): boolean {
  return /^(?:libsql|https?|wss?):\/\//i.test(url);
}

function normalizeDatabaseUrl(value: string): string {
  if (value === ":memory:" || /^(?:libsql|https?|wss?|file):/i.test(value)) return value;
  const path = resolve(value);
  mkdirSync(dirname(path), { recursive: true });
  return `file:${path.replaceAll("\\", "/")}`;
}

export function getDatabaseConfig(environment: NodeJS.ProcessEnv = process.env): DatabaseConfig {
  if (environment.TURSO_DATABASE_URL) {
    if (!environment.TURSO_AUTH_TOKEN) throw new Error("TURSO_AUTH_TOKEN is required when TURSO_DATABASE_URL is set.");
    return { url: environment.TURSO_DATABASE_URL, authToken: environment.TURSO_AUTH_TOKEN };
  }
  return { url: normalizeDatabaseUrl(environment.AGENTCLINIC_DB ?? "data/agentclinic.sqlite") };
}

export function createDatabase(config: DatabaseConfig): ClinicDatabase {
  const url = normalizeDatabaseUrl(config.url);
  if (isRemoteUrl(url) && !config.authToken) throw new Error("An auth token is required for a remote database URL.");
  return createClient({ url, authToken: config.authToken, intMode: "number", timeout: 5_000 });
}

export async function openDatabase(value: string | DatabaseConfig = ":memory:"): Promise<ClinicDatabase> {
  const db = createDatabase(typeof value === "string" ? { url: value } : value);
  try {
    await db.execute("PRAGMA foreign_keys = ON");
    await migrateDatabase(db);
    const configuredZones = await db.execute("SELECT time_zone FROM sites");
    if (configuredZones.rows.some((row) => !isValidTimeZone(String(row.time_zone)))) throw new Error("The database contains an unsupported clinic site time zone.");
    await seedDatabase(db);
    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}

function rowsAs<T>(result: ResultSet): T[] {
  return result.rows as unknown as T[];
}

function firstAs<T>(result: ResultSet): T | undefined {
  return result.rows[0] as unknown as T | undefined;
}

export async function listAgents(db: ClinicDatabase): Promise<AgentRecord[]> {
  return rowsAs<AgentRecord>(await db.execute("SELECT id, name, model, status, description FROM agents ORDER BY name"));
}

export async function listActiveSites(db: ClinicDatabase): Promise<ClinicSite[]> {
  return rowsAs<ClinicSite>(await db.execute("SELECT id, slug, name, address, time_zone, is_active FROM sites WHERE is_active = 1 ORDER BY id"));
}

export async function findActiveSiteBySlug(db: ClinicDatabase, slug: string): Promise<ClinicSite | undefined> {
  return firstAs<ClinicSite>(await db.execute({ sql: "SELECT id, slug, name, address, time_zone, is_active FROM sites WHERE slug = ? AND is_active = 1", args: [slug] }));
}

export async function findActiveSiteById(db: ClinicDatabase, id: number): Promise<ClinicSite | undefined> {
  return firstAs<ClinicSite>(await db.execute({ sql: "SELECT id, slug, name, address, time_zone, is_active FROM sites WHERE id = ? AND is_active = 1", args: [id] }));
}

export async function findAgent(db: ClinicDatabase, id: number): Promise<AgentDetail | undefined> {
  const agent = firstAs<AgentRecord>(await db.execute({ sql: "SELECT id, name, model, status, description FROM agents WHERE id = ?", args: [id] }));
  if (!agent) return undefined;
  const ailments = rowsAs<AilmentRecord>(await db.execute({ sql: "SELECT a.id, a.name, a.description FROM ailments a JOIN agent_ailments aa ON aa.ailment_id = a.id WHERE aa.agent_id = ? ORDER BY a.id", args: [id] }));
  const therapies = rowsAs<TherapyRecord>(await db.execute({ sql: "SELECT DISTINCT t.id, t.name, t.description FROM therapies t JOIN ailment_therapies at ON at.therapy_id = t.id JOIN agent_ailments aa ON aa.ailment_id = at.ailment_id WHERE aa.agent_id = ? ORDER BY t.id", args: [id] }));
  return { ...agent, ailments: ailments.map((ailment) => ({ ...ailment, agent_count: 0, agents: [], therapies: [] })), therapies };
}

export async function listAilments(db: ClinicDatabase): Promise<AilmentSummary[]> {
  const [rowsResult, agentsResult, therapiesResult] = await Promise.all([
    db.execute("SELECT id, name, description FROM ailments ORDER BY name"),
    db.execute("SELECT aa.ailment_id, ag.name FROM agent_ailments aa JOIN agents ag ON ag.id = aa.agent_id ORDER BY ag.id"),
    db.execute("SELECT at.ailment_id, t.id, t.name, t.description FROM ailment_therapies at JOIN therapies t ON t.id = at.therapy_id ORDER BY t.id"),
  ]);
  const rows = rowsAs<AilmentRecord>(rowsResult);
  const agents = rowsAs<{ ailment_id: number; name: string }>(agentsResult);
  const therapies = rowsAs<TherapyRecord & { ailment_id: number }>(therapiesResult);
  return rows.map((row) => {
    const linkedAgents = agents.filter((item) => item.ailment_id === row.id).map((item) => item.name);
    return { ...row, agent_count: linkedAgents.length, agents: linkedAgents, therapies: therapies.filter((item) => item.ailment_id === row.id).map(({ ailment_id: _ailmentId, ...therapy }) => therapy) };
  });
}

export async function listTherapies(db: ClinicDatabase): Promise<TherapySummary[]> {
  const [rowsResult, ailmentsResult] = await Promise.all([
    db.execute("SELECT id, name, description FROM therapies ORDER BY name"),
    db.execute("SELECT at.therapy_id, a.id, a.name, a.description FROM ailment_therapies at JOIN ailments a ON a.id = at.ailment_id ORDER BY a.id"),
  ]);
  const rows = rowsAs<TherapyRecord>(rowsResult);
  const ailments = rowsAs<AilmentRecord & { therapy_id: number }>(ailmentsResult);
  return rows.map((row) => ({ ...row, ailments: ailments.filter((item) => item.therapy_id === row.id).map(({ therapy_id: _therapyId, ...ailment }) => ailment) }));
}

export type AppointmentCreationResult =
  | { status: "created"; appointmentId: number }
  | { status: "conflict" };

export type AppointmentTransitionResult = "updated" | "unchanged" | "not_found" | "invalid_transition";
export type SlotCreationResult = "created" | "duplicate";
export type SlotRemovalResult = "removed" | "not_found" | "occupied";

async function hasOpenAppointmentSlot(db: ClinicDatabase, therapistName: string, scheduledAtUtc: string): Promise<boolean> {
  return Boolean(firstAs<{ id: number }>(await db.execute({
    sql: "SELECT id FROM appointments WHERE lower(trim(therapist_name)) = lower(?) AND scheduled_at_utc = ? AND status IN ('pending', 'confirmed') LIMIT 1",
    args: [therapistName.trim(), scheduledAtUtc],
  })));
}

function isSqliteConstraintError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: unknown; message?: unknown };
  return String(candidate.code ?? "").includes("SQLITE_CONSTRAINT") || String(candidate.message ?? "").includes("UNIQUE constraint failed");
}

export async function createAppointment(db: ClinicDatabase, input: { agentId: number; therapistName: string; scheduledAt: string }): Promise<AppointmentCreationResult> {
  const therapistName = input.therapistName.trim();
  const site = await findActiveSiteById(db, 1);
  if (!site) throw new Error("The default clinic site is unavailable.");
  const scheduledAtUtc = resolveLegacyLocalMinute(input.scheduledAt, site.time_zone);
  if (await hasOpenAppointmentSlot(db, therapistName, scheduledAtUtc)) return { status: "conflict" };

  try {
    const result = await db.execute({ sql: "INSERT INTO appointments (agent_id, therapist_name, scheduled_at, scheduled_at_utc, site_id, status) VALUES (?, ?, ?, ?, ?, 'pending')", args: [input.agentId, therapistName, input.scheduledAt, scheduledAtUtc, site.id] });
    if (result.lastInsertRowid === undefined) throw new Error("Appointment insert did not return an ID.");
    return { status: "created", appointmentId: Number(result.lastInsertRowid) };
  } catch (error) {
    if (isSqliteConstraintError(error) && await hasOpenAppointmentSlot(db, therapistName, scheduledAtUtc)) return { status: "conflict" };
    throw error;
  }
}

export async function listAvailableSlots(db: ClinicDatabase, now: Date): Promise<AvailableSlot[]> {
  return rowsAs<AvailableSlot>(await db.execute({
    sql: `SELECT s.id, s.therapist_id, t.display_name AS therapist_name, s.scheduled_at, s.scheduled_at_utc,
                 site.id AS site_id, site.slug AS site_slug, site.name AS site_name, site.address AS site_address, site.time_zone AS site_time_zone
          FROM therapist_slots s JOIN therapists t ON t.id = s.therapist_id
          JOIN sites site ON site.id = s.site_id
          WHERE s.is_active = 1 AND t.is_active = 1 AND site.is_active = 1 AND s.scheduled_at_utc > ?
            AND NOT EXISTS (
              SELECT 1 FROM appointments a
              WHERE a.slot_id = s.id AND a.status IN ('pending', 'confirmed')
            )
          ORDER BY s.scheduled_at_utc, t.display_name, s.id`,
    args: [utcMinute(now)],
  }));
}

export async function createAppointmentFromSlot(db: ClinicDatabase, input: { agentId: number; slotId: number; now: Date; notificationEmail?: string }): Promise<AppointmentCreationResult> {
  try {
    const slot = firstAs<{ scheduled_at: string; scheduled_at_utc: string; time_zone: string }>(await db.execute({
      sql: "SELECT s.scheduled_at, s.scheduled_at_utc, site.time_zone FROM therapist_slots s JOIN sites site ON site.id = s.site_id WHERE s.id = ?",
      args: [input.slotId],
    }));
    if (!slot) return { status: "conflict" };
    const currentUtc = utcMinute(input.now);
    const currentLocal = localMinuteInZone(input.now, slot.time_zone);
    const reminderUtc = addUtcMinutes(slot.scheduled_at_utc, -24 * 60);
    const reminderLocal = localMinuteInZone(new Date(reminderUtc), slot.time_zone);
    const notificationEmail = input.notificationEmail ? normalizeNotificationEmail(input.notificationEmail) : undefined;
    const results = await db.batch([{
      sql: `INSERT INTO appointments (agent_id, therapist_name, scheduled_at, scheduled_at_utc, status, therapist_id, slot_id, notification_email, notification_consent_at, site_id)
            SELECT ?, t.display_name, s.scheduled_at, s.scheduled_at_utc, 'pending', s.therapist_id, s.id, ?, ?, s.site_id
            FROM therapist_slots s JOIN therapists t ON t.id = s.therapist_id
            JOIN sites site ON site.id = s.site_id
            WHERE s.id = ? AND s.is_active = 1 AND t.is_active = 1 AND site.is_active = 1 AND s.scheduled_at_utc > ?
              AND NOT EXISTS (
                SELECT 1 FROM appointments a
                WHERE a.slot_id = s.id AND a.status IN ('pending', 'confirmed')
              )`,
      args: [input.agentId, notificationEmail ?? null, notificationEmail ? currentUtc : null, input.slotId, currentUtc],
    }, {
      sql: `INSERT INTO notification_outbox (appointment_id, event_kind, recipient_email, scheduled_for, scheduled_for_utc)
            SELECT ap.id, 'appointment_created', ap.notification_email, ?, ?
            FROM appointments ap
            WHERE ap.slot_id = ? AND ap.status = 'pending' AND ap.notification_consent_at = ?
              AND ap.notification_email = ? AND changes() = 1
            UNION ALL
            SELECT ap.id, 'appointment_reminder_24h', ap.notification_email, ?, ?
            FROM appointments ap
            WHERE ap.slot_id = ? AND ap.status = 'pending' AND ap.notification_consent_at = ?
              AND ap.notification_email = ? AND changes() = 1
              AND ap.scheduled_at_utc > ?`,
      args: [currentLocal, currentUtc, input.slotId, currentUtc, notificationEmail ?? null, reminderLocal, reminderUtc, input.slotId, currentUtc, notificationEmail ?? null, addUtcMinutes(currentUtc, 24 * 60)],
    }], "write");
    const result = results[0];
    if (result.rowsAffected === 0 || result.lastInsertRowid === undefined) return { status: "conflict" };
    const appointmentId = Number(result.lastInsertRowid);
    return { status: "created", appointmentId };
  } catch (error) {
    if (isSqliteConstraintError(error)) return { status: "conflict" };
    throw error;
  }
}

export async function findAppointment(db: ClinicDatabase, agentId: number, appointmentId: number): Promise<AppointmentRecord | undefined> {
  return firstAs<AppointmentRecord>(await db.execute({ sql: `SELECT ap.id, ap.agent_id, ag.name AS agent_name, ap.therapist_name, ap.therapist_id, ap.slot_id,
    ap.site_id, site.slug AS site_slug, site.name AS site_name, site.address AS site_address, site.time_zone AS site_time_zone,
    ap.scheduled_at, ap.scheduled_at_utc, ap.status, ap.created_at
    FROM appointments ap JOIN agents ag ON ag.id = ap.agent_id JOIN sites site ON site.id = ap.site_id
    WHERE ap.agent_id = ? AND ap.id = ?`, args: [agentId, appointmentId] }));
}

async function notificationDueValues(db: ClinicDatabase, appointmentId: number, now: Date): Promise<{ local: string; utc: string }> {
  const row = firstAs<{ time_zone: string }>(await db.execute({
    sql: "SELECT site.time_zone FROM appointments ap JOIN sites site ON site.id = ap.site_id WHERE ap.id = ?",
    args: [appointmentId],
  }));
  const utc = utcMinute(now);
  return { local: row ? localMinuteInZone(now, row.time_zone) : utc.slice(0, -1), utc };
}

async function findAppointmentStatus(db: Pick<ClinicDatabase, "execute">, appointmentId: number): Promise<AppointmentStatus | undefined> {
  return firstAs<{ status: AppointmentStatus }>(await db.execute({
    sql: "SELECT status FROM appointments WHERE id = ?",
    args: [appointmentId],
  }))?.status;
}

export async function confirmAppointment(db: ClinicDatabase, appointmentId: number, therapistId?: number, now = new Date()): Promise<AppointmentTransitionResult> {
  const due = await notificationDueValues(db, appointmentId, now);
  const results = await db.batch([{
    sql: "UPDATE appointments SET status = 'confirmed' WHERE id = ? AND status = 'pending' AND (? IS NULL OR therapist_id = ?)",
    args: [appointmentId, therapistId ?? null, therapistId ?? null],
  }, {
    sql: `INSERT OR IGNORE INTO notification_outbox (appointment_id, event_kind, recipient_email, scheduled_for, scheduled_for_utc)
          SELECT id, 'appointment_confirmed', notification_email, ?, ? FROM appointments
          WHERE id = ? AND changes() = 1 AND notification_email IS NOT NULL AND notification_consent_at IS NOT NULL`,
    args: [due.local, due.utc, appointmentId],
  }], "write");
  if (results[0].rowsAffected > 0) return "updated";
  const status = await findAppointmentStatusForScope(db, appointmentId, therapistId);
  if (!status) return "not_found";
  return status === "confirmed" ? "unchanged" : "invalid_transition";
}

export async function cancelAppointment(db: ClinicDatabase, appointmentId: number, therapistId?: number, now = new Date()): Promise<AppointmentTransitionResult> {
  const due = await notificationDueValues(db, appointmentId, now);
  const results = await db.batch([{
      sql: "UPDATE appointments SET status = 'cancelled' WHERE id = ? AND status IN ('pending', 'confirmed') AND (? IS NULL OR therapist_id = ?)",
      args: [appointmentId, therapistId ?? null, therapistId ?? null],
  }, {
    sql: `INSERT OR IGNORE INTO notification_outbox (appointment_id, event_kind, recipient_email, scheduled_for, scheduled_for_utc)
          SELECT id, 'appointment_cancelled', notification_email, ?, ? FROM appointments
          WHERE id = ? AND changes() = 1 AND notification_email IS NOT NULL AND notification_consent_at IS NOT NULL`,
    args: [due.local, due.utc, appointmentId],
  }, {
    sql: `UPDATE notification_outbox SET state = 'suppressed'
          WHERE appointment_id = ? AND event_kind = 'appointment_reminder_24h'
            AND state IN ('pending', 'failed')
            AND EXISTS (SELECT 1 FROM appointments WHERE id = ? AND status = 'cancelled')`,
    args: [appointmentId, appointmentId],
  }], "write");
  if (results[0].rowsAffected > 0) return "updated";
  const status = await findAppointmentStatusForScope(db, appointmentId, therapistId);
  if (!status) return "not_found";
  return status === "cancelled" ? "unchanged" : "invalid_transition";
}

async function findAppointmentStatusForScope(db: Pick<ClinicDatabase, "execute">, appointmentId: number, therapistId?: number): Promise<AppointmentStatus | undefined> {
  if (therapistId === undefined) return findAppointmentStatus(db, appointmentId);
  return firstAs<{ status: AppointmentStatus }>(await db.execute({
    sql: "SELECT status FROM appointments WHERE id = ? AND therapist_id = ?",
    args: [appointmentId, therapistId],
  }))?.status;
}

export async function prepareNotificationRun(db: ClinicDatabase, now: Date): Promise<void> {
  await db.batch([{
    sql: "UPDATE notification_outbox SET state = 'pending' WHERE state = 'failed'",
    args: [],
  }, {
    sql: `UPDATE notification_outbox SET state = 'suppressed'
          WHERE event_kind = 'appointment_reminder_24h' AND state IN ('pending', 'failed')
            AND EXISTS (
              SELECT 1 FROM appointments ap
              WHERE ap.id = notification_outbox.appointment_id
                AND (ap.status = 'cancelled' OR ap.scheduled_at_utc <= ?)
            )`,
    args: [utcMinute(now)],
  }], "write");
}

export async function claimNextDueNotification(db: ClinicDatabase, now: Date): Promise<NotificationDelivery | undefined> {
  const claimed = firstAs<Pick<NotificationDelivery, "id">>(await db.execute({
    sql: `UPDATE notification_outbox
          SET state = 'processing', attempt_count = attempt_count + 1, last_error = NULL
          WHERE id = (
            SELECT n.id FROM notification_outbox n JOIN appointments ap ON ap.id = n.appointment_id
            WHERE n.state = 'pending' AND n.scheduled_for_utc <= ?
              AND (n.event_kind <> 'appointment_reminder_24h' OR (ap.status IN ('pending', 'confirmed') AND ap.scheduled_at_utc > ?))
            ORDER BY n.scheduled_for_utc, n.id LIMIT 1
          ) AND state = 'pending'
          RETURNING id`,
    args: [utcMinute(now), utcMinute(now)],
  }));
  if (!claimed) return undefined;
  return firstAs<NotificationDelivery>(await db.execute({
    sql: `SELECT n.id, n.appointment_id, n.event_kind, n.recipient_email, n.scheduled_for, n.scheduled_for_utc, n.attempt_count,
                 ag.name AS agent_name, ap.therapist_name, ap.scheduled_at AS appointment_scheduled_at,
                 ap.scheduled_at_utc AS appointment_scheduled_at_utc, site.time_zone AS site_time_zone,
                 site.name AS site_name, site.address AS site_address
          FROM notification_outbox n
          JOIN appointments ap ON ap.id = n.appointment_id
          JOIN agents ag ON ag.id = ap.agent_id
          JOIN sites site ON site.id = ap.site_id
          WHERE n.id = ? AND n.state = 'processing'`,
    args: [claimed.id],
  }));
}

export async function completeNotification(db: ClinicDatabase, notificationId: number, now: Date): Promise<void> {
  await db.execute({
    sql: "UPDATE notification_outbox SET state = 'processed', processed_at = ?, last_error = NULL WHERE id = ? AND state = 'processing'",
    args: [utcMinute(now), notificationId],
  });
}

export async function failNotification(db: ClinicDatabase, notificationId: number): Promise<void> {
  await db.execute({
    sql: "UPDATE notification_outbox SET state = 'failed', last_error = 'Preview transport failed' WHERE id = ? AND state = 'processing'",
    args: [notificationId],
  });
}

export async function listTherapists(db: ClinicDatabase, now: Date): Promise<TherapistSummary[]> {
  return rowsAs<TherapistSummary>(await db.execute({
    sql: `SELECT t.id, t.display_name, t.is_active, u.email AS account_email,
                 COUNT(CASE WHEN s.is_active = 1 AND s.scheduled_at_utc > ? THEN 1 END) AS upcoming_slots
          FROM therapists t LEFT JOIN staff_users u ON u.id = t.staff_user_id
          LEFT JOIN therapist_slots s ON s.therapist_id = t.id
          GROUP BY t.id ORDER BY t.display_name`,
    args: [utcMinute(now)],
  }));
}

export async function listTherapistSlots(db: ClinicDatabase, therapistId: number, now: Date): Promise<TherapistSlot[]> {
  return rowsAs<TherapistSlot>(await db.execute({
    sql: `SELECT s.id, s.therapist_id, t.display_name AS therapist_name, s.scheduled_at, s.scheduled_at_utc, s.is_active,
                 site.id AS site_id, site.slug AS site_slug, site.name AS site_name, site.address AS site_address, site.time_zone AS site_time_zone,
                 CASE WHEN EXISTS (
                   SELECT 1 FROM appointments a WHERE a.slot_id = s.id AND a.status IN ('pending', 'confirmed')
                 ) THEN 1 ELSE 0 END AS is_occupied
          FROM therapist_slots s JOIN therapists t ON t.id = s.therapist_id JOIN sites site ON site.id = s.site_id
          WHERE s.therapist_id = ? AND s.is_active = 1 AND s.scheduled_at_utc > ?
          ORDER BY s.scheduled_at_utc, s.id`,
    args: [therapistId, utcMinute(now)],
  }));
}

export async function createTherapistSlot(db: ClinicDatabase, therapistId: number, scheduledAt: string, siteId = 1): Promise<SlotCreationResult> {
  try {
    const site = await findActiveSiteById(db, siteId);
    if (!site) return "duplicate";
    const resolved = resolveLocalMinute(scheduledAt, site.time_zone);
    if (resolved.status !== "valid") return "duplicate";
    await db.execute({
      sql: "INSERT INTO therapist_slots (therapist_id, scheduled_at, scheduled_at_utc, site_id) SELECT ?, ?, ?, id FROM sites WHERE id = ? AND is_active = 1",
      args: [therapistId, scheduledAt, resolved.utc, siteId],
    });
    return "created";
  } catch (error) {
    if (isSqliteConstraintError(error)) return "duplicate";
    throw error;
  }
}

export async function removeTherapistSlot(db: ClinicDatabase, therapistId: number, slotId: number, now: Date): Promise<SlotRemovalResult> {
  const slot = firstAs<{ is_occupied: number }>(await db.execute({
    sql: `SELECT CASE WHEN EXISTS (
                   SELECT 1 FROM appointments a WHERE a.slot_id = s.id AND a.status IN ('pending', 'confirmed')
                 ) THEN 1 ELSE 0 END AS is_occupied
          FROM therapist_slots s
          WHERE s.id = ? AND s.therapist_id = ? AND s.is_active = 1 AND s.scheduled_at_utc > ?`,
    args: [slotId, therapistId, utcMinute(now)],
  }));
  if (!slot) return "not_found";
  if (slot.is_occupied === 1) return "occupied";
  const result = await db.execute({
    sql: "UPDATE therapist_slots SET is_active = 0 WHERE id = ? AND therapist_id = ? AND is_active = 1",
    args: [slotId, therapistId],
  });
  return result.rowsAffected > 0 ? "removed" : "not_found";
}

export async function listTherapistAppointments(db: ClinicDatabase, therapistId: number): Promise<AppointmentRecord[]> {
  return rowsAs<AppointmentRecord>(await db.execute({
    sql: `SELECT ap.id, ap.agent_id, ag.name AS agent_name, ap.therapist_name, ap.therapist_id, ap.slot_id,
                 ap.site_id, site.slug AS site_slug, site.name AS site_name, site.address AS site_address, site.time_zone AS site_time_zone,
                 ap.scheduled_at, ap.scheduled_at_utc, ap.status, ap.created_at
          FROM appointments ap JOIN agents ag ON ag.id = ap.agent_id JOIN sites site ON site.id = ap.site_id
          WHERE ap.therapist_id = ? AND ap.status IN ('pending', 'confirmed')
          ORDER BY ap.scheduled_at_utc, ap.id`,
    args: [therapistId],
  }));
}

export async function getDashboard(db: ClinicDatabase, siteId?: number): Promise<DashboardData> {
  const siteArgs = [siteId ?? null, siteId ?? null];
  const [agents, appointmentsResult, ailmentsResult, agentCount, appointmentCount, ailmentCount, pendingReviewCount] = await Promise.all([
    listAgents(db),
    db.execute({ sql: `SELECT ap.id, ap.agent_id, ag.name AS agent_name, ap.therapist_name, ap.therapist_id, ap.slot_id,
      ap.site_id, site.slug AS site_slug, site.name AS site_name, site.address AS site_address, site.time_zone AS site_time_zone,
      ap.scheduled_at, ap.scheduled_at_utc, ap.status, ap.created_at
      FROM appointments ap JOIN agents ag ON ag.id = ap.agent_id JOIN sites site ON site.id = ap.site_id
      WHERE ap.status IN ('pending', 'confirmed') AND (? IS NULL OR ap.site_id = ?) ORDER BY ap.scheduled_at_utc, ap.id`, args: siteArgs }),
    db.execute("SELECT a.id, a.name, a.description, COUNT(aa.agent_id) AS agent_count FROM ailments a LEFT JOIN agent_ailments aa ON aa.ailment_id = a.id GROUP BY a.id ORDER BY a.name"),
    db.execute("SELECT COUNT(*) AS count FROM agents"),
    db.execute({ sql: "SELECT COUNT(*) AS count FROM appointments WHERE status IN ('pending', 'confirmed') AND (? IS NULL OR site_id = ?)", args: siteArgs }),
    db.execute("SELECT COUNT(DISTINCT aa.ailment_id) AS count FROM agent_ailments aa JOIN agents ag ON ag.id = aa.agent_id WHERE ag.status = 'active'"),
    db.execute("SELECT COUNT(*) AS count FROM feedback WHERE public_consent = 1 AND approved_at IS NULL"),
  ]);
  return {
    totalAgents: firstAs<{ count: number }>(agentCount)?.count ?? 0,
    openAppointments: firstAs<{ count: number }>(appointmentCount)?.count ?? 0,
    activeAilments: firstAs<{ count: number }>(ailmentCount)?.count ?? 0,
    pendingReviews: firstAs<{ count: number }>(pendingReviewCount)?.count ?? 0,
    agents,
    appointments: rowsAs<AppointmentRecord>(appointmentsResult),
    ailments: rowsAs<Array<AilmentRecord & { agent_count: number }>[number]>(ailmentsResult),
    selectedSite: siteId ? await findActiveSiteById(db, siteId) ?? null : null,
  };
}

export async function getClinicReport(db: ClinicDatabase, range: ReportDateRange, siteId?: number): Promise<ClinicReport> {
  const { sql: predicate, args } = await reportUtcPredicate(db, range, siteId, "appointments");
  const agentPredicate = predicate.replaceAll("appointments.", "ap.");
  const [totalsResult, therapistResult, agentResult] = await db.batch([{
    sql: `SELECT COUNT(*) AS total,
                 SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
                 SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) AS confirmed,
                 SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled
          FROM appointments WHERE ${predicate}`,
    args,
  }, {
    sql: `SELECT therapist_name, COUNT(*) AS total,
                 SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
                 SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) AS confirmed,
                 SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled
          FROM appointments WHERE ${predicate}
          GROUP BY therapist_name
          ORDER BY total DESC, lower(therapist_name), therapist_name`,
    args,
  }, {
    sql: `SELECT ag.id AS agent_id, ag.name AS agent_name, COUNT(*) AS total
          FROM appointments ap JOIN agents ag ON ag.id = ap.agent_id
          WHERE ${agentPredicate}
          GROUP BY ag.id, ag.name
          ORDER BY total DESC, lower(ag.name), ag.name, ag.id`,
    args,
  }], "read");
  const totals = firstAs<ClinicReportTotals>(totalsResult) ?? { total: 0, pending: 0, confirmed: 0, cancelled: 0 };
  return {
    range,
    totals: {
      total: Number(totals.total ?? 0),
      pending: Number(totals.pending ?? 0),
      confirmed: Number(totals.confirmed ?? 0),
      cancelled: Number(totals.cancelled ?? 0),
    },
    therapistWorkload: rowsAs<TherapistWorkload>(therapistResult),
    agentDemand: rowsAs<AgentDemand>(agentResult),
    selectedSite: siteId ? await findActiveSiteById(db, siteId) ?? null : null,
  };
}

export async function listReportAppointments(db: ClinicDatabase, range: ReportDateRange, siteId?: number): Promise<ReportAppointmentRow[]> {
  const { sql: predicate, args } = await reportUtcPredicate(db, range, siteId, "ap");
  return rowsAs<ReportAppointmentRow>(await db.execute({
    sql: `SELECT ap.scheduled_at, ap.scheduled_at_utc, site.time_zone AS site_time_zone,
                 ag.name AS agent_name, ap.therapist_name, site.name AS site_name, ap.status
          FROM appointments ap JOIN agents ag ON ag.id = ap.agent_id JOIN sites site ON site.id = ap.site_id
          WHERE ${predicate}
          ORDER BY ap.scheduled_at_utc, ap.id`,
    args,
  }));
}

async function reportUtcPredicate(db: ClinicDatabase, range: ReportDateRange, siteId: number | undefined, alias: string): Promise<{ sql: string; args: Array<string | number> }> {
  const sites = rowsAs<Pick<ClinicSite, "id" | "time_zone">>(await db.execute({
    sql: "SELECT id, time_zone FROM sites WHERE is_active = 1 AND (? IS NULL OR id = ?) ORDER BY id",
    args: [siteId ?? null, siteId ?? null],
  }));
  if (sites.length === 0) return { sql: "0", args: [] };
  const clauses: string[] = [];
  const args: Array<string | number> = [];
  for (const site of sites) {
    clauses.push(`(${alias}.site_id = ? AND ${alias}.scheduled_at_utc >= ? AND ${alias}.scheduled_at_utc < ?)`);
    args.push(site.id, utcBoundaryForLocalDate(range.from, site.time_zone), utcBoundaryForLocalDate(range.toExclusive.slice(0, 10), site.time_zone));
  }
  return { sql: `(${clauses.join(" OR ")})`, args };
}

export async function createFeedback(db: ClinicDatabase, input: FeedbackInput): Promise<number> {
  const result = await db.execute({
    sql: "INSERT INTO feedback (name, email, message, rating, public_consent) VALUES (?, ?, ?, ?, ?)",
    args: [input.name, input.email, input.message, input.rating, input.publicConsent ? 1 : 0],
  });
  if (result.lastInsertRowid === undefined) throw new Error("Feedback insert did not return an ID.");
  return Number(result.lastInsertRowid);
}

export async function findFeedback(db: ClinicDatabase, id: number): Promise<FeedbackRecord | undefined> {
  return firstAs<FeedbackRecord>(await db.execute({ sql: "SELECT id, name, email, message, rating, public_consent, created_at, approved_at FROM feedback WHERE id = ?", args: [id] }));
}

export async function countFeedback(db: ClinicDatabase): Promise<number> {
  return firstAs<{ count: number }>(await db.execute("SELECT COUNT(*) AS count FROM feedback"))?.count ?? 0;
}

export async function listReviewModerationItems(db: ClinicDatabase): Promise<ReviewModerationItem[]> {
  return rowsAs<ReviewModerationItem>(await db.execute(`
    SELECT id, name, message, rating, created_at, approved_at
    FROM feedback
    WHERE public_consent = 1
    ORDER BY (approved_at IS NOT NULL), created_at DESC, id DESC
  `));
}

export async function countPendingReviews(db: ClinicDatabase): Promise<number> {
  return firstAs<{ count: number }>(await db.execute("SELECT COUNT(*) AS count FROM feedback WHERE public_consent = 1 AND approved_at IS NULL"))?.count ?? 0;
}

async function consentedFeedbackExists(db: ClinicDatabase, id: number): Promise<boolean> {
  return Boolean(firstAs<{ id: number }>(await db.execute({
    sql: "SELECT id FROM feedback WHERE id = ? AND public_consent = 1",
    args: [id],
  })));
}

export async function approveReview(db: ClinicDatabase, id: number): Promise<boolean> {
  const result = await db.execute({
    sql: "UPDATE feedback SET approved_at = CURRENT_TIMESTAMP WHERE id = ? AND public_consent = 1 AND approved_at IS NULL",
    args: [id],
  });
  return result.rowsAffected > 0 || consentedFeedbackExists(db, id);
}

export async function unpublishReview(db: ClinicDatabase, id: number): Promise<boolean> {
  const result = await db.execute({
    sql: "UPDATE feedback SET approved_at = NULL WHERE id = ? AND public_consent = 1 AND approved_at IS NOT NULL",
    args: [id],
  });
  return result.rowsAffected > 0 || consentedFeedbackExists(db, id);
}

export async function listPublicReviews(db: ClinicDatabase): Promise<PublicReview[]> {
  return rowsAs<PublicReview>(await db.execute(`
    SELECT name, message, rating
    FROM feedback
    WHERE public_consent = 1 AND approved_at IS NOT NULL
    ORDER BY approved_at DESC, id DESC
  `));
}
