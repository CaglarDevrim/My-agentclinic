import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";

import { migrateDatabase } from "./migrate.js";
import { seedDatabase } from "./seed.js";
import type { AgentDetail, AgentRecord, AilmentRecord, AilmentSummary, AppointmentRecord, DashboardData, TherapyRecord, TherapySummary } from "./types.js";

export function openDatabase(filename = ":memory:"): Database.Database {
  if (filename !== ":memory:") mkdirSync(dirname(filename), { recursive: true });
  const db = new Database(filename);
  db.pragma("foreign_keys = ON");
  migrateDatabase(db);
  seedDatabase(db);
  return db;
}

export function listAgents(db: Database.Database): AgentRecord[] {
  return db.prepare("SELECT id, name, model, status, description FROM agents ORDER BY id").all() as AgentRecord[];
}

export function findAgent(db: Database.Database, id: number): AgentDetail | undefined {
  const agent = db.prepare("SELECT id, name, model, status, description FROM agents WHERE id = ?").get(id) as AgentRecord | undefined;
  if (!agent) return undefined;
  const ailments = db.prepare(`SELECT a.id, a.name, a.description FROM ailments a JOIN agent_ailments aa ON aa.ailment_id = a.id WHERE aa.agent_id = ? ORDER BY a.id`).all(id) as AilmentRecord[];
  const therapies = db.prepare(`SELECT DISTINCT t.id, t.name, t.description FROM therapies t JOIN ailment_therapies at ON at.therapy_id = t.id JOIN agent_ailments aa ON aa.ailment_id = at.ailment_id WHERE aa.agent_id = ? ORDER BY t.id`).all(id) as TherapyRecord[];
  return { ...agent, ailments: ailments.map((ailment) => ({ ...ailment, agent_count: 0, agents: [], therapies: [] })), therapies };
}

export function listAilments(db: Database.Database): AilmentSummary[] {
  const rows = db.prepare("SELECT id, name, description FROM ailments ORDER BY id").all() as AilmentRecord[];
  const agents = db.prepare(`SELECT aa.ailment_id, ag.name FROM agent_ailments aa JOIN agents ag ON ag.id = aa.agent_id ORDER BY ag.id`).all() as Array<{ ailment_id: number; name: string }>;
  const therapies = db.prepare(`SELECT at.ailment_id, t.id, t.name, t.description FROM ailment_therapies at JOIN therapies t ON t.id = at.therapy_id ORDER BY t.id`).all() as Array<TherapyRecord & { ailment_id: number }>;
  return rows.map((row) => {
    const linkedAgents = agents.filter((item) => item.ailment_id === row.id).map((item) => item.name);
    return { ...row, agent_count: linkedAgents.length, agents: linkedAgents, therapies: therapies.filter((item) => item.ailment_id === row.id).map(({ ailment_id: _ailmentId, ...therapy }) => therapy) };
  });
}

export function listTherapies(db: Database.Database): TherapySummary[] {
  const rows = db.prepare("SELECT id, name, description FROM therapies ORDER BY id").all() as TherapyRecord[];
  const ailments = db.prepare(`SELECT at.therapy_id, a.id, a.name, a.description FROM ailment_therapies at JOIN ailments a ON a.id = at.ailment_id ORDER BY a.id`).all() as Array<AilmentRecord & { therapy_id: number }>;
  return rows.map((row) => ({ ...row, ailments: ailments.filter((item) => item.therapy_id === row.id).map(({ therapy_id: _therapyId, ...ailment }) => ailment) }));
}

export function createAppointment(db: Database.Database, input: { agentId: number; therapistName: string; scheduledAt: string }): number {
  const result = db.prepare("INSERT INTO appointments (agent_id, therapist_name, scheduled_at, status) VALUES (?, ?, ?, 'pending')").run(input.agentId, input.therapistName, input.scheduledAt);
  return Number(result.lastInsertRowid);
}

export function findAppointment(db: Database.Database, agentId: number, appointmentId: number): AppointmentRecord | undefined {
  return db.prepare(`SELECT ap.id, ap.agent_id, ag.name AS agent_name, ap.therapist_name, ap.scheduled_at, ap.status, ap.created_at FROM appointments ap JOIN agents ag ON ag.id = ap.agent_id WHERE ap.agent_id = ? AND ap.id = ?`).get(agentId, appointmentId) as AppointmentRecord | undefined;
}

export function getDashboard(db: Database.Database): DashboardData {
  const totalAgents = (db.prepare("SELECT COUNT(*) AS count FROM agents").get() as { count: number }).count;
  const openAppointments = (db.prepare("SELECT COUNT(*) AS count FROM appointments WHERE status IN ('pending', 'confirmed')").get() as { count: number }).count;
  const activeAilments = (db.prepare(`SELECT COUNT(DISTINCT aa.ailment_id) AS count FROM agent_ailments aa JOIN agents ag ON ag.id = aa.agent_id WHERE ag.status = 'active'`).get() as { count: number }).count;
  const appointments = db.prepare(`SELECT ap.id, ap.agent_id, ag.name AS agent_name, ap.therapist_name, ap.scheduled_at, ap.status, ap.created_at FROM appointments ap JOIN agents ag ON ag.id = ap.agent_id WHERE ap.status IN ('pending', 'confirmed') ORDER BY ap.scheduled_at, ap.id`).all() as AppointmentRecord[];
  const ailments = db.prepare(`SELECT a.id, a.name, a.description, COUNT(aa.agent_id) AS agent_count FROM ailments a LEFT JOIN agent_ailments aa ON aa.ailment_id = a.id GROUP BY a.id ORDER BY a.id`).all() as Array<AilmentRecord & { agent_count: number }>;
  return { totalAgents, openAppointments, activeAilments, agents: listAgents(db), appointments, ailments };
}
