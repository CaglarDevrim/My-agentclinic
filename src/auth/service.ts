import type { ClinicDatabase } from "../db/index.js";
import { clearLoginThrottle, findStaffAccountByEmail, findStaffSession, getLoginThrottle, recordLoginFailure, revokeStaffSession, rotateStaffSession } from "./store.js";
import { createOpaqueToken, deriveSessionCsrfToken, normalizeStaffEmail, SESSION_MAX_AGE_SECONDS, sha256, verifyStaffPassword } from "./security.js";
import type { AuthenticatedStaff, CredentialResult } from "./types.js";

export async function authenticateStaffCredentials(db: ClinicDatabase, emailValue: string, password: string, now: Date): Promise<CredentialResult> {
  const email = normalizeStaffEmail(emailValue);
  const identityHash = sha256(email);
  const retryAfter = await getLoginThrottle(db, identityHash, now);
  if (retryAfter !== undefined) return { status: "throttled", retryAfter };

  const account = await findStaffAccountByEmail(db, email);
  const passwordMatches = await verifyStaffPassword(password, account?.passwordHash);
  if (!account || !account.isActive || !passwordMatches) {
    const throttledFor = await recordLoginFailure(db, identityHash, now);
    return throttledFor === undefined ? { status: "invalid" } : { status: "throttled", retryAfter: throttledFor };
  }

  await clearLoginThrottle(db, identityHash);
  return { status: "authenticated", staff: { id: account.id, email: account.email, displayName: account.displayName, role: account.role, therapistId: account.therapistId } };
}

export async function createStaffSession(db: ClinicDatabase, staff: { id: number; email: string; displayName: string; role?: "staff" | "therapist"; therapistId?: number }, now: Date, previousSessionToken?: string): Promise<AuthenticatedStaff> {
  const sessionToken = createOpaqueToken();
  const expiresAt = new Date(now.getTime() + SESSION_MAX_AGE_SECONDS * 1_000).toISOString();
  await rotateStaffSession(db, {
    staffId: staff.id,
    tokenHash: sha256(sessionToken),
    previousTokenHash: previousSessionToken ? sha256(previousSessionToken) : undefined,
    createdAt: now.toISOString(),
    expiresAt,
  });
  return { ...staff, role: staff.role ?? "staff", sessionToken, csrfToken: deriveSessionCsrfToken(sessionToken), expiresAt };
}

export async function authenticateStaffSession(db: ClinicDatabase, sessionToken: string | undefined, now: Date): Promise<AuthenticatedStaff | undefined> {
  if (!sessionToken || !/^[A-Za-z0-9_-]{43}$/.test(sessionToken)) return undefined;
  const staff = await findStaffSession(db, sha256(sessionToken), now);
  return staff ? { ...staff, sessionToken, csrfToken: deriveSessionCsrfToken(sessionToken) } : undefined;
}

export async function endStaffSession(db: ClinicDatabase, sessionToken: string): Promise<void> {
  await revokeStaffSession(db, sha256(sessionToken));
}
