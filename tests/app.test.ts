import type Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createApp } from "../src/app.js";
import { openDatabase } from "../src/db/index.js";

describe("AgentClinic routes", () => {
  let database: Database.Database;
  let app: ReturnType<typeof createApp>;
  const logger = vi.fn();

  beforeEach(() => {
    database = openDatabase();
    logger.mockReset();
    app = createApp(database, { logger, now: () => new Date("2026-08-01T12:00:00") });
  });

  afterEach(() => {
    if (database.open) database.close();
  });

  it("reports the exact health contract and logs the response", async () => {
    const response = await app.request("/health");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "ok" });
    expect(logger).toHaveBeenCalledWith(expect.stringMatching(/^GET \/health 200 \d+ms$/));
  });

  it("renders complete primary navigation on home", async () => {
    const response = await app.request("/");
    const html = await response.text();
    expect(response.status).toBe(200);
    expect(html).toMatch(/^<!doctype html>/i);
    expect(html).toContain("AgentClinic is open for business");
    expect(html).toContain('role="search"');
    for (const [path, label] of [["/agents", "Agents"], ["/ailments", "Ailments"], ["/therapies", "Therapies"], ["/dashboard", "Dashboard"]]) {
      expect(html).toContain(`href="${path}"`);
      expect(html).toContain(`>${label}<`);
    }
    expect(html).not.toMatch(/<script\b/i);
  });

  it("lists all six agents and renders a care detail", async () => {
    const list = await app.request("/agents");
    const listHtml = await list.text();
    expect(list.status).toBe(200);
    expect(listHtml).toContain("Bartholomew-47B");
    expect(listHtml).toContain("Hildegard-4B");
    expect((listHtml.match(/class="catalog-card"/g) ?? [])).toHaveLength(6);
    expect(listHtml).toMatch(/href="\/agents\/1"/);

    const detail = await app.request("/agents/1");
    const detailHtml = await detail.text();
    expect(detail.status).toBe(200);
    expect(detailHtml).toContain("Context-Window Claustrophobia");
    expect(detailHtml).toContain("Prompt Reduction Therapy");
    expect(detailHtml).toContain('/agents/1/appointments/new');
  });

  it("preserves the Patch care story under the Agents section", async () => {
    const response = await app.request("/agents/patch");
    const html = await response.text();
    expect(response.status).toBe(200);
    expect(html).toContain("Context Window Fatigue");
    expect(html).toContain("Prompt-Free Rest");
    expect(html).toMatch(/href="\/agents" aria-current="page"/);
  });

  it("renders complete ailment and therapy catalogs", async () => {
    const ailments = await app.request("/ailments");
    const ailmentHtml = await ailments.text();
    expect(ailments.status).toBe(200);
    expect(ailmentHtml).toContain("Temperature Instability");
    expect(ailmentHtml).toContain("Mindful Token Counting");
    expect((ailmentHtml.match(/class="catalog-card"/g) ?? [])).toHaveLength(6);

    const therapies = await app.request("/therapies");
    const therapyHtml = await therapies.text();
    expect(therapies.status).toBe(200);
    expect(therapyHtml).toContain("Cognitive Grounding Sessions");
    expect(therapyHtml).toContain("Hallucination Anxiety");
    expect((therapyHtml.match(/class="catalog-card"/g) ?? [])).toHaveLength(8);
  });

  it("returns accessible 422 errors without writing invalid appointments", async () => {
    const before = (database.prepare("SELECT COUNT(*) AS count FROM appointments").get() as { count: number }).count;
    const response = await app.request("/agents/1/appointments", { method: "POST", body: new URLSearchParams({ therapistName: "", date: "2025-01-01", time: "10:00" }) });
    const html = await response.text();
    expect(response.status).toBe(422);
    expect(html).toContain('role="alert"');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain("Choose an appointment in the future.");
    const after = (database.prepare("SELECT COUNT(*) AS count FROM appointments").get() as { count: number }).count;
    expect(after).toBe(before);
  });

  it("persists a valid appointment with PRG and renders confirmation", async () => {
    const response = await app.request("/agents/1/appointments", { method: "POST", body: new URLSearchParams({ therapistName: "Dr Test <script>", date: "2099-12-20", time: "10:30" }) });
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/agents/1/appointments/4");
    const confirmation = await app.request(response.headers.get("location")!);
    const html = await confirmation.text();
    expect(confirmation.status).toBe(200);
    expect(html).toContain("Dr Test &lt;script&gt;");
    expect(html).not.toContain("Dr Test <script>");
    expect(html).toContain("2099-12-20 at 10:30");
  });

  it("renders dashboard metrics and excludes cancelled appointments", async () => {
    const response = await app.request("/dashboard");
    const html = await response.text();
    expect(response.status).toBe(200);
    expect(html).toContain("Total agents");
    expect(html).toContain("Open appointments");
    expect(html).toContain("Dr Marcus Chen");
    expect(html).not.toContain("cancelled</span>");
    expect(html).toMatch(/href="\/dashboard" aria-current="page"/);
  });

  it("uses branded 404 responses for unknown records and routes", async () => {
    for (const path of ["/agents/unknown", "/agents/999", "/agents/1/appointments/999", "/does-not-exist"]) {
      const response = await app.request(path);
      expect(response.status).toBe(404);
      expect(await response.text()).toContain("Page not found");
    }
  });

  it("uses a safe branded 500 response and logs the failed request", async () => {
    const errorOutput = vi.spyOn(console, "error").mockImplementation(() => undefined);
    database.close();
    const response = await app.request("/dashboard");
    const html = await response.text();
    expect(response.status).toBe(500);
    expect(html).toContain("Clinic system error");
    expect(html).not.toContain("TypeError");
    expect(logger).toHaveBeenCalledWith(expect.stringMatching(/^GET \/dashboard 500 \d+ms$/));
    errorOutput.mockRestore();
  });

  it("serves responsive clinic styles", async () => {
    const response = await app.request("/static/style.css");
    const css = await response.text();
    expect(response.status).toBe(200);
    expect(css).toContain(".catalog-grid");
    expect(css).toContain(".metrics");
    expect(css).toContain(".table-wrap");
    expect(css).toContain("@media (min-width: 721px)");
    expect(css).toContain('a[aria-current="page"]');
    expect(css).not.toContain("@media (max-width:");
  });
});
