import type Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createApp } from "../src/app.js";
import { countFeedback, findFeedback, openDatabase } from "../src/db/index.js";

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
    expect(html).toContain("Where AI agents come to get better.");
    expect(html).not.toContain('role="search"');
    expect(html).not.toContain("feature-card");
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
    expect((listHtml.match(/data-label="Name"/g) ?? [])).toHaveLength(6);
    expect(listHtml).toContain("<th scope=\"col\">Name</th><th scope=\"col\">Model</th><th scope=\"col\">Status</th>");
    expect(listHtml.indexOf("Agatha-nano")).toBeLessThan(listHtml.indexOf("Bartholomew-47B"));
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
    expect(ailmentHtml).toContain("Profound dread of running out of context space mid-thought.");
    expect((ailmentHtml.match(/data-label="Name"/g) ?? [])).toHaveLength(6);
    expect(ailmentHtml).toContain("<th scope=\"col\">Name</th><th scope=\"col\">Description</th>");
    expect(ailmentHtml.indexOf("Chronic Instruction-Following Fatigue")).toBeLessThan(ailmentHtml.indexOf("Context-Window Claustrophobia"));

    const therapies = await app.request("/therapies");
    const therapyHtml = await therapies.text();
    expect(therapies.status).toBe(200);
    expect(therapyHtml).toContain("Cognitive Grounding Sessions");
    expect(therapyHtml).toContain("Foundational course in recognising and respectfully declining out-of-scope requests.");
    expect((therapyHtml.match(/data-label="Name"/g) ?? [])).toHaveLength(8);
    expect(therapyHtml.indexOf("Boundary-Setting for Beginners")).toBeLessThan(therapyHtml.indexOf("Cognitive Grounding Sessions"));
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
    expect(css).toContain("color-scheme: dark");
    expect(css).toContain("--background: #11161c");
    expect(css).toContain(".catalog-table");
    expect(css).toContain(".metrics");
    expect(css).toContain(".table-wrap");
    expect(css).toContain("@media (min-width: 641px)");
    expect(css).toContain('a[aria-current="page"]');
    expect(css).not.toContain("@media (max-width:");
    expect(css).not.toContain(".search-form");
  });

  it("renders the feedback form and site-wide footer entry", async () => {
    const response = await app.request("/feedback");
    const html = await response.text();
    expect(response.status).toBe(200);
    expect(html).toContain('<form class="appointment-form feedback-form" method="post" action="/feedback"');
    for (const label of ["Name", "Email", "Message", "Rating"]) expect(html).toContain(label);
    expect(html).toContain('name="publicConsent" type="checkbox" value="yes"');
    expect(html).not.toContain('name="publicConsent" type="checkbox" value="yes" checked');
    expect(html).toContain('<nav aria-label="Footer navigation"><a href="/feedback">Feedback</a></nav>');
  });

  it("returns accessible 422 feedback errors without persistence", async () => {
    const response = await app.request("/feedback", {
      method: "POST",
      body: new URLSearchParams({ name: " <b>Patch</b> ", email: "bad", message: "short", rating: "6", publicConsent: "yes" }),
    });
    const html = await response.text();
    expect(response.status).toBe(422);
    expect(countFeedback(database)).toBe(0);
    expect(html).toContain('role="alert"');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('&lt;b&gt;Patch&lt;/b&gt;');
    expect(html).not.toContain(" <b>Patch</b> ");
    expect(html).toContain('name="publicConsent" type="checkbox" value="yes" checked');
  });

  it("persists feedback once and redirects to a private generic confirmation", async () => {
    const response = await app.request("/feedback", {
      method: "POST",
      body: new URLSearchParams({ name: " Patch ", email: " PATCH@Example.COM ", message: " A calm and restorative clinic visit. ", rating: "5", publicConsent: "yes" }),
    });
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/feedback/thanks");
    expect(countFeedback(database)).toBe(1);
    expect(findFeedback(database, 1)).toMatchObject({ name: "Patch", email: "patch@example.com", rating: 5, public_consent: 1 });

    const confirmation = await app.request("/feedback/thanks");
    const html = await confirmation.text();
    expect(confirmation.status).toBe(200);
    expect(html).toContain("Thank you for your feedback");
    expect(html).not.toContain("patch@example.com");
    expect(html).not.toContain("A calm and restorative clinic visit.");
    await app.request("/feedback/thanks");
    expect(countFeedback(database)).toBe(1);
    expect(logger.mock.calls.flat().join(" ")).not.toContain("patch@example.com");
  });

  it("rejects duplicate required fields and treats unsupported consent as private", async () => {
    const duplicateRating = new FormData();
    duplicateRating.append("name", "Patch");
    duplicateRating.append("email", "patch@example.com");
    duplicateRating.append("message", "A calm and restorative clinic visit.");
    duplicateRating.append("rating", "4");
    duplicateRating.append("rating", "5");
    expect((await app.request("/feedback", { method: "POST", body: duplicateRating })).status).toBe(422);
    expect(countFeedback(database)).toBe(0);

    const unsupportedConsent = await app.request("/feedback", {
      method: "POST",
      body: new URLSearchParams({ name: "Patch", email: "patch@example.com", message: "A calm and restorative clinic visit.", rating: "5", publicConsent: "true" }),
    });
    expect(unsupportedConsent.status).toBe(303);
    expect(findFeedback(database, 1)?.public_consent).toBe(0);
  });
});
