import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { approveReview, cancelAppointment, confirmAppointment, countFeedback, countPendingReviews, createAppointment, createDatabase, createFeedback, findAgent, findAppointment, findFeedback, getDatabaseConfig, getDashboard, listAgents, listAilments, listPublicReviews, listReviewModerationItems, listTherapies, openDatabase, unpublishReview } from "../src/db/index.js";
import { migrateDatabase } from "../src/db/migrate.js";
import { seedDatabase } from "../src/db/seed.js";

describe("clinic database", () => {
  it("uses a local file by default and requires a token for remote Turso URLs", () => {
    const local = getDatabaseConfig({});
    expect(local.url).toMatch(/^file:.*data\/agentclinic\.sqlite$/);
    expect(local.authToken).toBeUndefined();

    expect(() => getDatabaseConfig({ TURSO_DATABASE_URL: "libsql://agentclinic.example" })).toThrow("TURSO_AUTH_TOKEN");
    expect(getDatabaseConfig({ TURSO_DATABASE_URL: "libsql://agentclinic.example", TURSO_AUTH_TOKEN: "test-token" })).toEqual({
      url: "libsql://agentclinic.example",
      authToken: "test-token",
    });
    expect(() => createDatabase({ url: "https://agentclinic.example" })).toThrow("auth token");
  });

  it("migrates and seeds the exact reference data idempotently", async () => {
    const db = await openDatabase();
    await migrateDatabase(db);
    await seedDatabase(db);
    expect(Number((await db.execute("SELECT COUNT(*) AS count FROM schema_migrations")).rows[0].count)).toBe(13);
    expect(await listAgents(db)).toHaveLength(6);
    expect(await listAilments(db)).toHaveLength(6);
    expect(await listTherapies(db)).toHaveLength(8);
    expect(Number((await db.execute("SELECT COUNT(*) AS count FROM appointments")).rows[0].count)).toBe(3);
    expect((await findAgent(db, 1))?.therapies.map((item) => item.name)).toContain("Mindful Token Counting");
    db.close();
  });

  it("persists bookings across a file-backed reopen", async () => {
    const path = join(mkdtempSync(join(tmpdir(), "agentclinic-")), "clinic.sqlite");
    let db = await openDatabase(path);
    const created = await createAppointment(db, { agentId: 5, therapistName: "  Dr Persistence  ", scheduledAt: "2099-11-10T14:00" });
    expect(created.status).toBe("created");
    if (created.status !== "created") throw new Error("Expected the appointment to be created.");
    db.close();
    db = await openDatabase(path);
    expect((await findAppointment(db, 5, created.appointmentId))?.therapist_name).toBe("Dr Persistence");
    expect((await getDashboard(db)).openAppointments).toBe(3);
    db.close();
  });

  it("enforces normalized open slots and controlled idempotent transitions", async () => {
    const db = await openDatabase();
    const first = await createAppointment(db, { agentId: 1, therapistName: "Dr Slot", scheduledAt: "2099-10-10T10:00" });
    expect(first.status).toBe("created");
    if (first.status !== "created") throw new Error("Expected the first appointment to be created.");

    await expect(createAppointment(db, { agentId: 2, therapistName: "  dr slot  ", scheduledAt: "2099-10-10T10:00" })).resolves.toEqual({ status: "conflict" });
    await expect(createAppointment(db, { agentId: 2, therapistName: "Dr Other", scheduledAt: "2099-10-10T10:00" })).resolves.toMatchObject({ status: "created" });
    await expect(db.execute({
      sql: "INSERT INTO appointments (agent_id, therapist_name, scheduled_at, status) VALUES (?, ?, ?, 'confirmed')",
      args: [3, "DR SLOT", "2099-10-10T10:00"],
    })).rejects.toThrow(/UNIQUE constraint failed/i);

    expect(await confirmAppointment(db, first.appointmentId)).toBe("updated");
    expect(await confirmAppointment(db, first.appointmentId)).toBe("unchanged");
    expect(await cancelAppointment(db, first.appointmentId)).toBe("updated");
    expect(await cancelAppointment(db, first.appointmentId)).toBe("unchanged");
    expect(await confirmAppointment(db, first.appointmentId)).toBe("invalid_transition");
    expect(await confirmAppointment(db, 999_999)).toBe("not_found");

    const replacement = await createAppointment(db, { agentId: 2, therapistName: "DR SLOT", scheduledAt: "2099-10-10T10:00" });
    expect(replacement.status).toBe("created");
    expect((await getDashboard(db)).appointments.some((appointment) => appointment.id === first.appointmentId)).toBe(false);
    db.close();
  });

  it("allows exactly one of two concurrent requests for the same open slot", async () => {
    const db = await openDatabase();
    const results = await Promise.all([
      createAppointment(db, { agentId: 1, therapistName: "Dr Concurrent", scheduledAt: "2099-10-11T11:00" }),
      createAppointment(db, { agentId: 2, therapistName: " dr concurrent ", scheduledAt: "2099-10-11T11:00" }),
    ]);
    expect(results.map((result) => result.status).sort()).toEqual(["conflict", "created"]);
    const count = await db.execute({
      sql: "SELECT COUNT(*) AS count FROM appointments WHERE lower(trim(therapist_name)) = lower(?) AND scheduled_at = ? AND status IN ('pending', 'confirmed')",
      args: ["Dr Concurrent", "2099-10-11T11:00"],
    });
    expect(Number(count.rows[0].count)).toBe(1);
    db.close();
  });

  it("refuses to migrate legacy duplicate open slots without altering them", async () => {
    const db = createDatabase({ url: ":memory:" });
    await db.executeMultiple(`
      CREATE TABLE schema_migrations (filename TEXT PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE appointments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        agent_id INTEGER NOT NULL,
        therapist_name TEXT NOT NULL,
        scheduled_at TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'cancelled')),
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      INSERT INTO schema_migrations (filename) VALUES
        ('001_agents.sql'), ('002_ailments.sql'), ('003_agent_ailments.sql'), ('004_therapies.sql'),
        ('005_ailment_therapies.sql'), ('006_appointments.sql'), ('007_feedback.sql'), ('008_feedback_approval.sql');
      INSERT INTO appointments (agent_id, therapist_name, scheduled_at, status) VALUES
        (1, 'Dr Duplicate', '2099-12-01T10:00', 'pending'),
        (2, ' dr duplicate ', '2099-12-01T10:00', 'confirmed');
    `);

    await expect(migrateDatabase(db)).rejects.toThrow(/UNIQUE constraint failed/i);
    const rows = await db.execute("SELECT therapist_name, status FROM appointments ORDER BY id");
    expect(rows.rows).toMatchObject([
      { therapist_name: "Dr Duplicate", status: "pending" },
      { therapist_name: " dr duplicate ", status: "confirmed" },
    ]);
    db.close();
  });

  it("persists normalized feedback and consent across a file-backed reopen", async () => {
    const path = join(mkdtempSync(join(tmpdir(), "agentclinic-feedback-")), "clinic.sqlite");
    let db = await openDatabase(path);
    const id = await createFeedback(db, {
      name: "Patch",
      email: "patch@example.com",
      message: "A calm and restorative clinic visit.",
      rating: 5,
      publicConsent: true,
    });
    expect(await countFeedback(db)).toBe(1);
    expect(await approveReview(db, id)).toBe(true);
    const approvedAt = (await findFeedback(db, id))?.approved_at;
    expect(approvedAt).toEqual(expect.any(String));
    db.close();
    db = await openDatabase(path);
    expect(await findFeedback(db, id)).toMatchObject({
      name: "Patch",
      email: "patch@example.com",
      rating: 5,
      public_consent: 1,
      approved_at: approvedAt,
    });
    expect(await listPublicReviews(db)).toEqual([{ name: "Patch", message: "A calm and restorative clinic visit.", rating: 5 }]);
    db.close();
  });

  it("moderates only consented feedback with idempotent actions and restricted public projections", async () => {
    const db = await openDatabase();
    const privateId = await createFeedback(db, {
      name: "Private Agent",
      email: "private@example.com",
      message: "This feedback must remain private forever.",
      rating: 2,
      publicConsent: false,
    });
    const firstId = await createFeedback(db, {
      name: "First Agent",
      email: "first@example.com",
      message: "The first consented review message.",
      rating: 4,
      publicConsent: true,
    });
    const secondId = await createFeedback(db, {
      name: "Second Agent",
      email: "second@example.com",
      message: "The second consented review message.",
      rating: 5,
      publicConsent: true,
    });

    expect((await listReviewModerationItems(db)).map((item) => item.id)).toEqual([secondId, firstId]);
    expect(await countPendingReviews(db)).toBe(2);
    expect((await getDashboard(db)).pendingReviews).toBe(2);
    expect(await approveReview(db, privateId)).toBe(false);
    expect(await unpublishReview(db, privateId)).toBe(false);

    expect(await approveReview(db, firstId)).toBe(true);
    const firstApprovedAt = (await findFeedback(db, firstId))?.approved_at;
    expect(firstApprovedAt).toEqual(expect.any(String));
    expect(await approveReview(db, firstId)).toBe(true);
    expect((await findFeedback(db, firstId))?.approved_at).toBe(firstApprovedAt);
    expect(await countPendingReviews(db)).toBe(1);

    await db.execute({ sql: "UPDATE feedback SET approved_at = CURRENT_TIMESTAMP WHERE id = ?", args: [privateId] });
    expect(await approveReview(db, secondId)).toBe(true);
    const publicReviews = await listPublicReviews(db);
    expect(publicReviews.map((review) => review.name)).toEqual(["Second Agent", "First Agent"]);
    expect(Object.keys(publicReviews[0]).sort()).toEqual(["message", "name", "rating"]);
    expect((await listReviewModerationItems(db)).some((item) => item.id === privateId)).toBe(false);

    expect(await unpublishReview(db, secondId)).toBe(true);
    expect(await unpublishReview(db, secondId)).toBe(true);
    expect((await listPublicReviews(db)).map((review) => review.name)).toEqual(["First Agent"]);
    db.close();
  });
});
