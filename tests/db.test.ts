import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { approveReview, countFeedback, countPendingReviews, createAppointment, createDatabase, createFeedback, findAgent, findAppointment, findFeedback, getDatabaseConfig, getDashboard, listAgents, listAilments, listPublicReviews, listReviewModerationItems, listTherapies, openDatabase, unpublishReview } from "../src/db/index.js";
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
    expect(Number((await db.execute("SELECT COUNT(*) AS count FROM schema_migrations")).rows[0].count)).toBe(8);
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
    const id = await createAppointment(db, { agentId: 5, therapistName: "Dr Persistence", scheduledAt: "2099-11-10T14:00" });
    db.close();
    db = await openDatabase(path);
    expect((await findAppointment(db, 5, id))?.therapist_name).toBe("Dr Persistence");
    expect((await getDashboard(db)).openAppointments).toBe(3);
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
