import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createClient, type Client, type ResultSet } from "@libsql/client";

import { migrateDatabase } from "./migrate.js";
import { seedDatabase } from "./seed.js";
import type { AgentDetail, AgentRecord, AilmentRecord, AilmentSummary, AppointmentRecord, DashboardData, FeedbackInput, FeedbackRecord, PublicReview, ReviewModerationItem, TherapyRecord, TherapySummary } from "./types.js";

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

export async function createAppointment(db: ClinicDatabase, input: { agentId: number; therapistName: string; scheduledAt: string }): Promise<number> {
  const result = await db.execute({ sql: "INSERT INTO appointments (agent_id, therapist_name, scheduled_at, status) VALUES (?, ?, ?, 'pending')", args: [input.agentId, input.therapistName, input.scheduledAt] });
  if (result.lastInsertRowid === undefined) throw new Error("Appointment insert did not return an ID.");
  return Number(result.lastInsertRowid);
}

export async function findAppointment(db: ClinicDatabase, agentId: number, appointmentId: number): Promise<AppointmentRecord | undefined> {
  return firstAs<AppointmentRecord>(await db.execute({ sql: "SELECT ap.id, ap.agent_id, ag.name AS agent_name, ap.therapist_name, ap.scheduled_at, ap.status, ap.created_at FROM appointments ap JOIN agents ag ON ag.id = ap.agent_id WHERE ap.agent_id = ? AND ap.id = ?", args: [agentId, appointmentId] }));
}

export async function getDashboard(db: ClinicDatabase): Promise<DashboardData> {
  const [agents, appointmentsResult, ailmentsResult, agentCount, appointmentCount, ailmentCount, pendingReviewCount] = await Promise.all([
    listAgents(db),
    db.execute("SELECT ap.id, ap.agent_id, ag.name AS agent_name, ap.therapist_name, ap.scheduled_at, ap.status, ap.created_at FROM appointments ap JOIN agents ag ON ag.id = ap.agent_id WHERE ap.status IN ('pending', 'confirmed') ORDER BY ap.scheduled_at, ap.id"),
    db.execute("SELECT a.id, a.name, a.description, COUNT(aa.agent_id) AS agent_count FROM ailments a LEFT JOIN agent_ailments aa ON aa.ailment_id = a.id GROUP BY a.id ORDER BY a.name"),
    db.execute("SELECT COUNT(*) AS count FROM agents"),
    db.execute("SELECT COUNT(*) AS count FROM appointments WHERE status IN ('pending', 'confirmed')"),
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
  };
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
