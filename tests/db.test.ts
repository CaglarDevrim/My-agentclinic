import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { countFeedback, createAppointment, createDatabase, createFeedback, findAgent, findAppointment, findFeedback, getDatabaseConfig, getDashboard, listAgents, listAilments, listTherapies, openDatabase } from "../src/db/index.js";
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
    expect(Number((await db.execute("SELECT COUNT(*) AS count FROM schema_migrations")).rows[0].count)).toBe(7);
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
    db.close();
    db = await openDatabase(path);
    expect(await findFeedback(db, id)).toMatchObject({
      name: "Patch",
      email: "patch@example.com",
      rating: 5,
      public_consent: 1,
    });
    db.close();
  });
});
