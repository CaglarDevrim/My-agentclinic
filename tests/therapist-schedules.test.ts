import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../src/app.js";
import { createStaffSession } from "../src/auth/service.js";
import { hashStaffPassword, SESSION_COOKIE_NAME } from "../src/auth/security.js";
import { createTherapistUser, findStaffAccountByEmail } from "../src/auth/store.js";
import { createAppointmentFromSlot, listAvailableSlots, openDatabase, type ClinicDatabase } from "../src/db/index.js";
import { runTherapistCreate } from "../src/therapist-create.js";

const TEST_PASSWORD = "Therapist test password 2026!";

describe("therapist accounts and schedules", () => {
  let db!: ClinicDatabase;
  let passwordHash = "";
  const now = new Date("2026-08-04T10:00:00");

  beforeAll(async () => {
    passwordHash = await hashStaffPassword(TEST_PASSWORD);
  });

  afterEach(() => {
    if (db && !db.closed) db.close();
  });

  it("provisions and links a therapist account without exposing its password", async () => {
    const databasePath = join(mkdtempSync(join(tmpdir(), "agentclinic-therapist-")), "clinic.sqlite");
    const environment = { AGENTCLINIC_DB: databasePath, AGENTCLINIC_THERAPIST_PASSWORD: TEST_PASSWORD };
    await expect(runTherapistCreate(["--email", " Evelyn@Example.com ", "--name", " Dr Evelyn Watts "], environment)).resolves.toBe("Created therapist account for evelyn@example.com.");
    db = await openDatabase(databasePath);
    const account = await findStaffAccountByEmail(db, "EVELYN@example.com");
    expect(account).toMatchObject({ email: "evelyn@example.com", displayName: "Dr Evelyn Watts", role: "therapist", isActive: true });
    expect(account?.therapistId).toEqual(expect.any(Number));
    expect(account?.passwordHash).not.toContain(TEST_PASSWORD);
    await expect(runTherapistCreate(["--email", "other@example.com", "--name", "dr evelyn watts"], environment)).rejects.toThrow("already exists");
  });

  it("books one authoritative slot and releases it after cancellation", async () => {
    db = await openDatabase();
    const therapistId = Number((await db.execute("SELECT id FROM therapists ORDER BY id LIMIT 1")).rows[0].id);
    await db.execute({ sql: "INSERT INTO therapist_slots (therapist_id, scheduled_at) VALUES (?, ?)", args: [therapistId, "2026-08-04T09:30"] });
    expect((await listAvailableSlots(db, now)).some((slot) => slot.scheduled_at === "2026-08-04T09:30")).toBe(false);
    const slot = (await listAvailableSlots(db, now))[0];
    expect(slot).toBeDefined();
    const first = await createAppointmentFromSlot(db, { agentId: 1, slotId: slot.id, now });
    expect(first).toMatchObject({ status: "created" });
    await expect(createAppointmentFromSlot(db, { agentId: 2, slotId: slot.id, now })).resolves.toEqual({ status: "conflict" });
    if (first.status !== "created") throw new Error("Expected slot booking to succeed.");
    await db.execute({ sql: "UPDATE appointments SET status = 'cancelled' WHERE id = ?", args: [first.appointmentId] });
    await expect(createAppointmentFromSlot(db, { agentId: 2, slotId: slot.id, now })).resolves.toMatchObject({ status: "created" });
  });

  it("enforces therapist navigation, ownership, scheduling, and staff-only boundaries", async () => {
    db = await openDatabase();
    const created = await createTherapistUser(db, { email: "evelyn@example.com", displayName: "Dr Evelyn Watts", passwordHash });
    const session = await createStaffSession(db, { id: created.staffId, email: "evelyn@example.com", displayName: "Dr Evelyn Watts", role: "therapist", therapistId: created.therapistId }, now);
    const cookie = `${SESSION_COOKIE_NAME}=${session.sessionToken}`;
    const app = createApp(db, { now: () => now, logger: () => undefined });

    const request = (path: string, init: RequestInit = {}) => {
      const method = (init.method ?? "GET").toUpperCase();
      const headers = new Headers(init.headers);
      headers.set("cookie", cookie);
      let body = init.body;
      if (method === "POST") {
        headers.set("origin", "http://localhost");
        const form = body instanceof URLSearchParams ? new URLSearchParams(body) : new URLSearchParams();
        form.set("_csrf", session.csrfToken);
        body = form;
      }
      return app.request(path, { ...init, method, headers, body });
    };

    const dashboard = await request("/dashboard");
    expect(dashboard.status).toBe(303);
    expect(dashboard.headers.get("location")).toBe("/dashboard/schedule");
    expect((await request("/dashboard/reviews")).status).toBe(403);
    expect((await request("/dashboard/therapists")).status).toBe(403);
    expect((await request("/dashboard/reports")).status).toBe(403);
    expect(await (await request("/dashboard/schedule")).text()).not.toContain('href="/dashboard/reports"');

    const creation = await request("/dashboard/schedule/slots", { method: "POST", body: new URLSearchParams({ scheduledAt: "2099-08-20T11:15" }) });
    expect(creation.status).toBe(303);
    const scheduleHtml = await (await request("/dashboard/schedule")).text();
    expect(scheduleHtml).toContain("2099-08-20 at 11:15");
    expect(scheduleHtml).toContain("Available");

    const slotId = Number((await db.execute({ sql: "SELECT id FROM therapist_slots WHERE therapist_id = ? AND scheduled_at = ?", args: [created.therapistId, "2099-08-20T11:15"] })).rows[0].id);
    const booking = await app.request("/agents/1/appointments", { method: "POST", body: new URLSearchParams({ slotId: String(slotId), email: "visitor@example.com", notificationConsent: "yes" }) });
    expect(booking.status).toBe(303);
    const appointments = await request("/dashboard/appointments");
    expect(await appointments.text()).toContain("Bartholomew-47B");

    const other = await createTherapistUser(db, { email: "other@example.com", displayName: "Dr Other", passwordHash });
    const otherAppointment = await db.execute({
      sql: "INSERT INTO appointments (agent_id, therapist_name, scheduled_at, status, therapist_id) VALUES (2, 'Dr Other', '2099-09-01T10:00', 'pending', ?)",
      args: [other.therapistId],
    });
    expect((await request(`/dashboard/appointments/${otherAppointment.lastInsertRowid}/confirm`, { method: "POST" })).status).toBe(404);
  });
});
