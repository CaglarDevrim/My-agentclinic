import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../src/app.js";
import { authenticateStaffCredentials, authenticateStaffSession, createStaffSession } from "../src/auth/service.js";
import { constantTimeStringEqual, createLoginCsrfToken, createOpaqueToken, deriveSessionCsrfToken, hashStaffPassword, isFreshLoginCsrfToken, isValidStaffEmail, normalizeStaffEmail, safeDashboardReturnTo, SESSION_COOKIE_NAME, sha256, verifyStaffPassword } from "../src/auth/security.js";
import { createStaffUser, findStaffAccountByEmail } from "../src/auth/store.js";
import { openDatabase } from "../src/db/index.js";
import { runStaffCreate } from "../src/staff-create.js";

const TEST_PASSWORD = "Correct horse battery staple";

function hiddenCsrf(html: string): string {
  const match = /name="_csrf" value="([^"]+)"/.exec(html);
  if (!match) throw new Error("CSRF field was not found.");
  return match[1];
}

function cookiePair(response: Response, name: string): string {
  const value = response.headers.get("set-cookie") ?? "";
  const match = new RegExp(`(?:^|,\\s*)${name}=([^;]*)`).exec(value);
  if (!match) throw new Error(`${name} cookie was not found.`);
  return `${name}=${match[1]}`;
}

describe("staff authentication security", () => {
  let passwordHash = "";

  beforeAll(async () => {
    passwordHash = await hashStaffPassword(TEST_PASSWORD);
  });

  it("normalizes identities, validates safe returns, and produces versioned salted hashes", async () => {
    expect(normalizeStaffEmail("  Staff@Example.COM ")).toBe("staff@example.com");
    expect(isValidStaffEmail("staff@example.com")).toBe(true);
    expect(isValidStaffEmail("not-an-email")).toBe(false);
    expect(safeDashboardReturnTo("/dashboard/reviews?state=pending")).toBe("/dashboard/reviews?state=pending");
    for (const unsafe of ["https://evil.example/dashboard", "//evil.example", "/dashboard\\evil", "/dashboard%252f%252fevil.example", "/dashboarding", "/about", "%00/dashboard"]) {
      expect(safeDashboardReturnTo(unsafe)).toBe("/dashboard");
    }

    const secondHash = await hashStaffPassword(TEST_PASSWORD);
    expect(passwordHash).toMatch(/^scrypt\$1\$32768\$8\$3\$/);
    expect(secondHash).not.toBe(passwordHash);
    await expect(verifyStaffPassword(TEST_PASSWORD, passwordHash)).resolves.toBe(true);
    await expect(verifyStaffPassword("This password is incorrect", passwordHash)).resolves.toBe(false);
    await expect(verifyStaffPassword(TEST_PASSWORD, "malformed")).resolves.toBe(false);
  });

  it("creates opaque token material and fresh constant-time CSRF values", () => {
    const token = createOpaqueToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(sha256(token)).toMatch(/^[a-f0-9]{64}$/);
    expect(deriveSessionCsrfToken(token)).not.toBe(token);
    expect(constantTimeStringEqual(deriveSessionCsrfToken(token), deriveSessionCsrfToken(token))).toBe(true);
    expect(constantTimeStringEqual("left", "right")).toBe(false);
    const now = new Date("2026-08-02T10:00:00.000Z");
    const loginCsrf = createLoginCsrfToken(now);
    expect(isFreshLoginCsrfToken(loginCsrf, now)).toBe(true);
    expect(isFreshLoginCsrfToken(loginCsrf, new Date(now.getTime() + 601_000))).toBe(false);
  });

  it("persists accounts and revocable expiring sessions without raw secrets", async () => {
    const db = await openDatabase();
    const staffId = await createStaffUser(db, { email: "staff@example.com", displayName: "Clinic Staff", passwordHash });
    await expect(createStaffUser(db, { email: "  STAFF@example.com ", displayName: "Duplicate", passwordHash })).rejects.toThrow(/UNIQUE constraint failed/i);
    expect(await findStaffAccountByEmail(db, "STAFF@example.com")).toMatchObject({ id: staffId, email: "staff@example.com", displayName: "Clinic Staff", isActive: true });

    const now = new Date("2026-08-02T10:00:00.000Z");
    const session = await createStaffSession(db, { id: staffId, email: "staff@example.com", displayName: "Clinic Staff" }, now);
    const stored = await db.execute("SELECT token_hash FROM staff_sessions");
    expect(stored.rows[0].token_hash).toBe(sha256(session.sessionToken));
    expect(String(stored.rows[0].token_hash)).not.toContain(session.sessionToken);
    await expect(authenticateStaffSession(db, session.sessionToken, new Date(now.getTime() + 7 * 60 * 60 * 1_000))).resolves.toMatchObject({ displayName: "Clinic Staff" });
    await expect(authenticateStaffSession(db, session.sessionToken, new Date(now.getTime() + 9 * 60 * 60 * 1_000))).resolves.toBeUndefined();
    expect((await db.execute("SELECT COUNT(*) AS count FROM staff_sessions")).rows[0].count).toBe(0);
    db.close();
  });

  it("throttles repeated generic credential failures and clears them on success", async () => {
    const db = await openDatabase();
    await createStaffUser(db, { email: "staff@example.com", displayName: "Clinic Staff", passwordHash });
    const now = new Date("2026-08-02T10:00:00.000Z");
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      await expect(authenticateStaffCredentials(db, "STAFF@example.com", "Definitely the wrong password", now)).resolves.toEqual({ status: "invalid" });
    }
    await expect(authenticateStaffCredentials(db, "staff@example.com", "Definitely the wrong password", now)).resolves.toMatchObject({ status: "throttled", retryAfter: 900 });
    await expect(authenticateStaffCredentials(db, "staff@example.com", TEST_PASSWORD, now)).resolves.toMatchObject({ status: "throttled" });
    const later = new Date(now.getTime() + 901_000);
    await expect(authenticateStaffCredentials(db, "staff@example.com", TEST_PASSWORD, later)).resolves.toMatchObject({ status: "authenticated" });
    expect((await db.execute("SELECT COUNT(*) AS count FROM staff_login_throttles")).rows[0].count).toBe(0);
    db.close();
  });

  it("provisions a file-backed account without exposing the password", async () => {
    const databasePath = join(mkdtempSync(join(tmpdir(), "agentclinic-staff-")), "clinic.sqlite");
    const environment = { AGENTCLINIC_DB: databasePath, AGENTCLINIC_STAFF_PASSWORD: TEST_PASSWORD };
    await expect(runStaffCreate(["--email", " Staff@Example.com ", "--name", " Clinic Staff "], environment)).resolves.toBe("Created staff account for staff@example.com.");
    await expect(runStaffCreate(["--email", "STAFF@example.com", "--name", "Duplicate"], environment)).rejects.toThrow("already exists");
    const db = await openDatabase(databasePath);
    const account = await findStaffAccountByEmail(db, "staff@example.com");
    expect(account?.displayName).toBe("Clinic Staff");
    expect(account?.passwordHash).not.toContain(TEST_PASSWORD);
    db.close();
  });
});

describe("staff authentication routes", () => {
  let passwordHash = "";

  beforeAll(async () => {
    passwordHash = await hashStaffPassword(TEST_PASSWORD);
  });

  async function setup() {
    const db = await openDatabase();
    const staffId = await createStaffUser(db, { email: "staff@example.com", displayName: "Clinic Staff", passwordHash });
    let clock = new Date("2026-08-02T10:00:00.000Z");
    const app = createApp(db, { logger: () => undefined, now: () => clock });
    return { app, db, staffId, setClock: (value: Date) => { clock = value; } };
  }

  async function loginForm(app: ReturnType<typeof createApp>, returnTo = "/dashboard") {
    const response = await app.request(`http://localhost/login?returnTo=${encodeURIComponent(returnTo)}`);
    const html = await response.text();
    return { response, csrf: hiddenCsrf(html), cookie: cookiePair(response, "agentclinic_login_csrf"), html };
  }

  it("keeps public routes open and redirects every anonymous dashboard request before mutation", async () => {
    const { app, db } = await setup();
    for (const path of ["/", "/agents", "/feedback", "/reviews", "/about", "/health"]) expect((await app.request(path)).status).toBe(200);
    const dashboard = await app.request("/dashboard?view=open");
    expect(dashboard.status).toBe(303);
    expect(dashboard.headers.get("location")).toBe("/login?returnTo=%2Fdashboard%3Fview%3Dopen");
    expect(dashboard.headers.get("cache-control")).toBe("no-store");
    const before = (await db.execute("SELECT status FROM appointments WHERE id = 2")).rows[0].status;
    const mutation = await app.request("http://localhost/dashboard/appointments/2/confirm", { method: "POST" });
    expect(mutation.status).toBe(303);
    expect(mutation.headers.get("location")).toBe("/login?returnTo=%2Fdashboard");
    expect((await db.execute("SELECT status FROM appointments WHERE id = 2")).rows[0].status).toBe(before);
    db.close();
  });

  it("renders secure login cookies and rejects malformed, cross-origin, and generic bad credentials", async () => {
    const { app, db } = await setup();
    const form = await loginForm(app, "https://evil.example/dashboard");
    expect(form.response.status).toBe(200);
    expect(form.response.headers.get("cache-control")).toBe("no-store");
    const loginCookieHeader = form.response.headers.get("set-cookie") ?? "";
    expect(loginCookieHeader).toContain("agentclinic_login_csrf=");
    for (const attribute of ["Max-Age=600", "Path=/login", "HttpOnly", "SameSite=Lax"]) expect(loginCookieHeader).toContain(attribute);
    expect(form.html).toContain('autocomplete="username"');
    expect(form.html).toContain('autocomplete="current-password"');
    expect(form.html).toContain('name="returnTo" value="/dashboard"');

    const crossOrigin = await app.request("http://localhost/login", {
      method: "POST",
      headers: { cookie: form.cookie, origin: "https://evil.example" },
      body: new URLSearchParams({ _csrf: form.csrf, returnTo: "/dashboard", email: "staff@example.com", password: TEST_PASSWORD }),
    });
    expect(crossOrigin.status).toBe(403);

    const malformed = await app.request("http://localhost/login", {
      method: "POST",
      headers: { cookie: form.cookie, origin: "http://localhost" },
      body: new URLSearchParams({ _csrf: form.csrf, returnTo: "/dashboard", email: "invalid", password: "short" }),
    });
    expect(malformed.status).toBe(422);
    const malformedHtml = await malformed.text();
    expect(malformedHtml).toContain('role="alert"');
    expect(malformedHtml).not.toContain('value="short"');

    const retryForm = await loginForm(app);
    const invalid = await app.request("http://localhost/login", {
      method: "POST",
      headers: { cookie: retryForm.cookie, origin: "http://localhost" },
      body: new URLSearchParams({ _csrf: retryForm.csrf, returnTo: "/dashboard", email: "unknown@example.com", password: TEST_PASSWORD }),
    });
    expect(invalid.status).toBe(401);
    expect(await invalid.text()).toContain("The email address or password is incorrect.");

    const secureForm = await app.request("https://agentclinic.example/login");
    expect(secureForm.headers.get("set-cookie")).toMatch(/; Secure/i);
    db.close();
  });

  it("returns route-level throttling and secure HTTPS session attributes", async () => {
    const { app, db } = await setup();
    const identityHash = sha256("staff@example.com");
    await db.execute({
      sql: "INSERT INTO staff_login_throttles (identity_hash, failure_count, window_started_at) VALUES (?, 5, ?)",
      args: [identityHash, "2026-08-02T10:00:00.000Z"],
    });
    const throttledForm = await loginForm(app);
    const throttled = await app.request("http://localhost/login", {
      method: "POST",
      headers: { cookie: throttledForm.cookie, origin: "http://localhost" },
      body: new URLSearchParams({ _csrf: throttledForm.csrf, returnTo: "/dashboard", email: "staff@example.com", password: TEST_PASSWORD }),
    });
    expect(throttled.status).toBe(429);
    expect(throttled.headers.get("retry-after")).toBe("900");
    expect(await throttled.text()).toContain("Too many sign-in attempts. Try again later.");

    await db.execute("DELETE FROM staff_login_throttles");
    const secureGet = await app.request("https://agentclinic.example/login");
    const secureHtml = await secureGet.text();
    const secureCsrf = hiddenCsrf(secureHtml);
    const secureLogin = await app.request("https://agentclinic.example/login", {
      method: "POST",
      headers: { cookie: cookiePair(secureGet, "agentclinic_login_csrf"), origin: "https://agentclinic.example" },
      body: new URLSearchParams({ _csrf: secureCsrf, returnTo: "/dashboard", email: "staff@example.com", password: TEST_PASSWORD }),
    });
    expect(secureLogin.status).toBe(303);
    expect(secureLogin.headers.get("set-cookie")).toMatch(/agentclinic_session=[^;]+;[^,]*Secure/i);
    db.close();
  });

  it("rotates sessions, authorizes CSRF-protected actions, and revokes logout", async () => {
    const { app, db, staffId } = await setup();
    const now = new Date("2026-08-02T10:00:00.000Z");
    const oldSession = await createStaffSession(db, { id: staffId, email: "staff@example.com", displayName: "Clinic Staff" }, now);
    const form = await loginForm(app, "/dashboard/reviews");
    const login = await app.request("http://localhost/login", {
      method: "POST",
      headers: { cookie: `${form.cookie}; ${SESSION_COOKIE_NAME}=${oldSession.sessionToken}`, origin: "http://localhost" },
      body: new URLSearchParams({ _csrf: form.csrf, returnTo: "/dashboard/reviews", email: "STAFF@example.com", password: TEST_PASSWORD }),
    });
    expect(login.status).toBe(303);
    expect(login.headers.get("location")).toBe("/dashboard/reviews");
    const sessionCookie = cookiePair(login, SESSION_COOKIE_NAME);
    const sessionCookieHeader = login.headers.get("set-cookie") ?? "";
    expect(sessionCookieHeader).toContain("agentclinic_session=");
    for (const attribute of ["Max-Age=28800", "Path=/", "HttpOnly", "SameSite=Lax"]) expect(sessionCookieHeader).toContain(attribute);
    expect((await app.request("/dashboard", { headers: { cookie: `${SESSION_COOKIE_NAME}=${oldSession.sessionToken}` } })).status).toBe(303);

    const dashboard = await app.request("/dashboard", { headers: { cookie: sessionCookie } });
    const dashboardHtml = await dashboard.text();
    expect(dashboard.status).toBe(200);
    expect(dashboard.headers.get("cache-control")).toBe("no-store");
    expect(dashboardHtml).toContain("Signed in as <strong>Clinic Staff</strong>");
    const csrf = hiddenCsrf(dashboardHtml);

    const missingCsrf = await app.request("http://localhost/dashboard/appointments/2/confirm", { method: "POST", headers: { cookie: sessionCookie, origin: "http://localhost" } });
    expect(missingCsrf.status).toBe(403);
    expect((await db.execute("SELECT status FROM appointments WHERE id = 2")).rows[0].status).toBe("pending");
    const validAction = await app.request("http://localhost/dashboard/appointments/2/confirm", {
      method: "POST",
      headers: { cookie: sessionCookie, origin: "http://localhost" },
      body: new URLSearchParams({ _csrf: csrf }),
    });
    expect(validAction.status).toBe(303);
    expect((await db.execute("SELECT status FROM appointments WHERE id = 2")).rows[0].status).toBe("confirmed");

    const logout = await app.request("http://localhost/logout", {
      method: "POST",
      headers: { cookie: sessionCookie, origin: "http://localhost" },
      body: new URLSearchParams({ _csrf: csrf }),
    });
    expect(logout.status).toBe(303);
    expect(logout.headers.get("location")).toBe("/login");
    expect(logout.headers.get("set-cookie")).toMatch(/agentclinic_session=;/);
    expect((await app.request("/dashboard", { headers: { cookie: sessionCookie } })).status).toBe(303);
    db.close();
  });

  it("expires sessions and never restores protected access", async () => {
    const { app, db, staffId, setClock } = await setup();
    const now = new Date("2026-08-02T10:00:00.000Z");
    const session = await createStaffSession(db, { id: staffId, email: "staff@example.com", displayName: "Clinic Staff" }, now);
    const cookie = `${SESSION_COOKIE_NAME}=${session.sessionToken}`;
    expect((await app.request("/dashboard", { headers: { cookie } })).status).toBe(200);
    setClock(new Date(now.getTime() + 8 * 60 * 60 * 1_000 + 1));
    const expired = await app.request("/dashboard", { headers: { cookie } });
    expect(expired.status).toBe(303);
    expect(expired.headers.get("location")).toBe("/login?returnTo=%2Fdashboard");
    expect((await db.execute("SELECT COUNT(*) AS count FROM staff_sessions")).rows[0].count).toBe(0);
    db.close();
  });
});
