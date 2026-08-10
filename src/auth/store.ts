import type { ClinicDatabase } from "../db/index.js";
import { LOGIN_FAILURE_LIMIT, LOGIN_FAILURE_WINDOW_MS, normalizeStaffEmail } from "./security.js";
import type { StaffRole } from "../db/types.js";
import type { StaffAccountSecret, StaffIdentity } from "./types.js";

function firstRow<T>(rows: readonly unknown[]): T | undefined {
  return rows[0] as T | undefined;
}

export async function createStaffUser(db: ClinicDatabase, input: { email: string; displayName: string; passwordHash: string; role?: StaffRole }): Promise<number> {
  const result = await db.execute({
    sql: "INSERT INTO staff_users (email, display_name, password_hash, role) VALUES (?, ?, ?, ?)",
    args: [normalizeStaffEmail(input.email), input.displayName.trim(), input.passwordHash, input.role ?? "staff"],
  });
  if (result.lastInsertRowid === undefined) throw new Error("Staff user insert did not return an ID.");
  return Number(result.lastInsertRowid);
}

export async function findStaffAccountByEmail(db: ClinicDatabase, email: string): Promise<StaffAccountSecret | undefined> {
  const row = firstRow<{ id: number; email: string; display_name: string; password_hash: string; is_active: number; role: StaffRole; therapist_id: number | null; therapist_active: number | null }>((await db.execute({
    sql: `SELECT u.id, u.email, u.display_name, u.password_hash, u.is_active, u.role,
                 t.id AS therapist_id, t.is_active AS therapist_active
          FROM staff_users u LEFT JOIN therapists t ON t.staff_user_id = u.id
          WHERE u.email = ? COLLATE NOCASE`,
    args: [normalizeStaffEmail(email)],
  })).rows);
  return row ? {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    passwordHash: row.password_hash,
    isActive: row.is_active === 1 && (row.role !== "therapist" || row.therapist_active === 1),
    role: row.role,
    therapistId: row.therapist_id ?? undefined,
  } : undefined;
}

export async function createTherapistUser(db: ClinicDatabase, input: { email: string; displayName: string; passwordHash: string }): Promise<{ staffId: number; therapistId: number }> {
  const staffId = await createStaffUser(db, { ...input, role: "therapist" });
  const therapist = firstRow<{ id: number }>((await db.execute({
    sql: "SELECT id FROM therapists WHERE staff_user_id = ?",
    args: [staffId],
  })).rows);
  if (!therapist) throw new Error("Therapist profile creation failed.");
  return { staffId, therapistId: therapist.id };
}

export async function rotateStaffSession(db: ClinicDatabase, input: { staffId: number; tokenHash: string; previousTokenHash?: string; createdAt: string; expiresAt: string }): Promise<void> {
  const statements = [];
  if (input.previousTokenHash) statements.push({ sql: "DELETE FROM staff_sessions WHERE token_hash = ?", args: [input.previousTokenHash] });
  statements.push({
    sql: "INSERT INTO staff_sessions (token_hash, staff_user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
    args: [input.tokenHash, input.staffId, input.createdAt, input.expiresAt],
  });
  await db.batch(statements, "write");
}

export async function findStaffSession(db: ClinicDatabase, tokenHash: string, now: Date): Promise<(StaffIdentity & { expiresAt: string }) | undefined> {
  const row = firstRow<{ staff_id: number; email: string; display_name: string; is_active: number; role: StaffRole; therapist_id: number | null; therapist_active: number | null; expires_at: string }>((await db.execute({
    sql: `SELECT u.id AS staff_id, u.email, u.display_name, u.is_active, u.role,
                 t.id AS therapist_id, t.is_active AS therapist_active, s.expires_at
          FROM staff_sessions s JOIN staff_users u ON u.id = s.staff_user_id
          LEFT JOIN therapists t ON t.staff_user_id = u.id
          WHERE s.token_hash = ?`,
    args: [tokenHash],
  })).rows);
  if (!row) return undefined;
  if (row.is_active !== 1 || (row.role === "therapist" && row.therapist_active !== 1) || new Date(row.expires_at).getTime() <= now.getTime()) {
    await revokeStaffSession(db, tokenHash);
    return undefined;
  }
  return { id: row.staff_id, email: row.email, displayName: row.display_name, role: row.role, therapistId: row.therapist_id ?? undefined, expiresAt: row.expires_at };
}

export async function revokeStaffSession(db: ClinicDatabase, tokenHash: string): Promise<void> {
  await db.execute({ sql: "DELETE FROM staff_sessions WHERE token_hash = ?", args: [tokenHash] });
}

export async function getLoginThrottle(db: ClinicDatabase, identityHash: string, now: Date): Promise<number | undefined> {
  const row = firstRow<{ failure_count: number; window_started_at: string }>((await db.execute({
    sql: "SELECT failure_count, window_started_at FROM staff_login_throttles WHERE identity_hash = ?",
    args: [identityHash],
  })).rows);
  if (!row) return undefined;
  const elapsed = now.getTime() - new Date(row.window_started_at).getTime();
  if (elapsed >= LOGIN_FAILURE_WINDOW_MS || elapsed < 0) {
    await clearLoginThrottle(db, identityHash);
    return undefined;
  }
  if (row.failure_count < LOGIN_FAILURE_LIMIT) return undefined;
  return Math.max(1, Math.ceil((LOGIN_FAILURE_WINDOW_MS - elapsed) / 1_000));
}

export async function recordLoginFailure(db: ClinicDatabase, identityHash: string, now: Date): Promise<number | undefined> {
  const windowStartedAt = now.toISOString();
  const cutoff = new Date(now.getTime() - LOGIN_FAILURE_WINDOW_MS).toISOString();
  const result = await db.execute({
    sql: `INSERT INTO staff_login_throttles (identity_hash, failure_count, window_started_at) VALUES (?, 1, ?)
          ON CONFLICT(identity_hash) DO UPDATE SET
            failure_count = CASE WHEN window_started_at <= ? THEN 1 ELSE failure_count + 1 END,
            window_started_at = CASE WHEN window_started_at <= ? THEN excluded.window_started_at ELSE window_started_at END
          RETURNING failure_count, window_started_at`,
    args: [identityHash, windowStartedAt, cutoff, cutoff],
  });
  const row = firstRow<{ failure_count: number; window_started_at: string }>(result.rows)!;
  if (row.failure_count < LOGIN_FAILURE_LIMIT) return undefined;
  const elapsed = now.getTime() - new Date(row.window_started_at).getTime();
  return Math.max(1, Math.ceil((LOGIN_FAILURE_WINDOW_MS - elapsed) / 1_000));
}

export async function clearLoginThrottle(db: ClinicDatabase, identityHash: string): Promise<void> {
  await db.execute({ sql: "DELETE FROM staff_login_throttles WHERE identity_hash = ?", args: [identityHash] });
}
