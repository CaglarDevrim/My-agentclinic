import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { countFeedback, createAppointment, createFeedback, findAgent, findAppointment, findFeedback, getDashboard, listAgents, listAilments, listTherapies, openDatabase } from "../src/db/index.js";
import { migrateDatabase } from "../src/db/migrate.js";
import { seedDatabase } from "../src/db/seed.js";

describe("clinic database", () => {
  it("migrates and seeds the exact reference data idempotently", () => {
    const db = openDatabase();
    migrateDatabase(db);
    seedDatabase(db);
    expect((db.prepare("SELECT COUNT(*) AS count FROM schema_migrations").get() as { count: number }).count).toBe(7);
    expect(listAgents(db)).toHaveLength(6);
    expect(listAilments(db)).toHaveLength(6);
    expect(listTherapies(db)).toHaveLength(8);
    expect((db.prepare("SELECT COUNT(*) AS count FROM appointments").get() as { count: number }).count).toBe(3);
    expect(findAgent(db, 1)?.therapies.map((item) => item.name)).toContain("Mindful Token Counting");
    db.close();
  });

  it("persists bookings across a file-backed reopen", () => {
    const path = join(mkdtempSync(join(tmpdir(), "agentclinic-")), "clinic.sqlite");
    let db = openDatabase(path);
    const id = createAppointment(db, { agentId: 5, therapistName: "Dr Persistence", scheduledAt: "2099-11-10T14:00" });
    db.close();
    db = openDatabase(path);
    expect(findAppointment(db, 5, id)?.therapist_name).toBe("Dr Persistence");
    expect(getDashboard(db).openAppointments).toBe(3);
    db.close();
  });

  it("persists normalized feedback and consent across a file-backed reopen", () => {
    const path = join(mkdtempSync(join(tmpdir(), "agentclinic-feedback-")), "clinic.sqlite");
    let db = openDatabase(path);
    const id = createFeedback(db, {
      name: "Patch",
      email: "patch@example.com",
      message: "A calm and restorative clinic visit.",
      rating: 5,
      publicConsent: true,
    });
    expect(countFeedback(db)).toBe(1);
    db.close();
    db = openDatabase(path);
    expect(findFeedback(db, id)).toMatchObject({
      name: "Patch",
      email: "patch@example.com",
      rating: 5,
      public_consent: 1,
    });
    db.close();
  });
});
