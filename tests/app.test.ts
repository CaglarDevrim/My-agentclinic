import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { createApp } from "../src/app.js";
import { createStaffSession } from "../src/auth/service.js";
import { hashStaffPassword, SESSION_COOKIE_NAME } from "../src/auth/security.js";
import { createStaffUser } from "../src/auth/store.js";
import { countFeedback, createFeedback, findAppointment, findFeedback, getDashboard, openDatabase, type ClinicDatabase } from "../src/db/index.js";

describe("AgentClinic routes", () => {
  let database!: ClinicDatabase;
  let app: ReturnType<typeof createApp>;
  let staffCookie = "";
  let staffCsrf = "";
  let passwordHash = "";
  const logger = vi.fn();
  const testNow = new Date("2026-08-01T12:00:00");

  beforeAll(async () => {
    passwordHash = await hashStaffPassword("Correct horse battery staple");
  });

  beforeEach(async () => {
    database = await openDatabase();
    const staffId = await createStaffUser(database, { email: "staff@example.com", displayName: "Clinic Staff", passwordHash });
    const session = await createStaffSession(database, { id: staffId, email: "staff@example.com", displayName: "Clinic Staff" }, testNow);
    staffCookie = `${SESSION_COOKIE_NAME}=${session.sessionToken}`;
    staffCsrf = session.csrfToken;
    logger.mockReset();
    app = createApp(database, { logger, now: () => testNow });
  });

  async function staffRequest(path: string, init: RequestInit = {}): Promise<Response> {
    const method = (init.method ?? "GET").toUpperCase();
    const headers = new Headers(init.headers);
    headers.set("cookie", staffCookie);
    let body = init.body;
    if (method === "POST") {
      headers.set("origin", "http://localhost");
      if (body instanceof URLSearchParams) {
        body = new URLSearchParams(body);
        body.set("_csrf", staffCsrf);
      } else if (!body) {
        body = new URLSearchParams({ _csrf: staffCsrf });
      }
    }
    return app.request(path, { ...init, method, headers, body });
  }

  function appointmentForm(slotId: string, email = "visitor@example.com"): URLSearchParams {
    return new URLSearchParams({ slotId, email, notificationConsent: "yes" });
  }

  afterEach(() => {
    if (database && !database.closed) database.close();
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
    expect(html).toContain("Give your AI agents room to recover.");
    expect(html).toContain("Start where you are.");
    expect(html).toContain("A complete journey, without the chaos.");
    expect(html).toContain('href="/agents">Find care for an agent</a>');
    expect(html).toContain('href="/dashboard">Open the clinic dashboard');
    expect(html).not.toContain('role="search"');
    expect(html).not.toMatch(/<script\b/i);
    for (const [path, label] of [["/agents", "Agents"], ["/ailments", "Ailments"], ["/therapies", "Therapies"], ["/reviews", "Customer Reviews"], ["/about", "About"], ["/dashboard", "Dashboard"]]) {
      expect(html).toContain(`href="${path}"`);
      expect(html).toContain(`>${label}<`);
    }
    expect(html.indexOf('href="/agents"')).toBeLessThan(html.indexOf('href="/ailments"'));
    expect(html.indexOf('href="/ailments"')).toBeLessThan(html.indexOf('href="/therapies"'));
    expect(html.indexOf('href="/therapies"')).toBeLessThan(html.indexOf('href="/reviews"'));
    expect(html.indexOf('href="/reviews"')).toBeLessThan(html.indexOf('href="/about"'));
    expect(html.indexOf('href="/about"')).toBeLessThan(html.indexOf('href="/dashboard"'));
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
    const before = Number((await database.execute("SELECT COUNT(*) AS count FROM appointments")).rows[0].count);
    const response = await app.request("/agents/1/appointments", { method: "POST", body: new URLSearchParams({ slotId: "" }) });
    const html = await response.text();
    expect(response.status).toBe(422);
    expect(html).toContain('role="alert"');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain("Choose an available appointment time.");
    const after = Number((await database.execute("SELECT COUNT(*) AS count FROM appointments")).rows[0].count);
    expect(after).toBe(before);
  });

  it("persists a valid appointment with PRG and renders confirmation", async () => {
    const therapist = await database.execute({ sql: "INSERT INTO therapists (normalized_name, display_name) VALUES (?, ?)", args: ["dr test <script>", "Dr Test <script>"] });
    const slot = await database.execute({ sql: "INSERT INTO therapist_slots (therapist_id, scheduled_at, scheduled_at_utc) VALUES (?, ?, ?)", args: [Number(therapist.lastInsertRowid), "2099-12-20T10:30", "2099-12-20T18:30Z"] });
    const response = await app.request("/agents/1/appointments", { method: "POST", body: appointmentForm(String(slot.lastInsertRowid)) });
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/agents/1/appointments/4");
    const confirmation = await app.request(response.headers.get("location")!);
    const html = await confirmation.text();
    expect(confirmation.status).toBe(200);
    expect(html).toContain("Dr Test &lt;script&gt;");
    expect(html).not.toContain("Dr Test <script>");
    expect(html).toContain("2099-12-20 at 10:30");
  });

  it("rejects occupied slots and releases them after cancellation", async () => {
    const before = Number((await database.execute("SELECT COUNT(*) AS count FROM appointments")).rows[0].count);
    const slotId = Number((await database.execute("SELECT id FROM therapist_slots WHERE scheduled_at = '2099-04-10T10:00'")).rows[0].id);
    const first = await app.request("/agents/1/appointments", { method: "POST", body: appointmentForm(String(slotId)) });
    expect(first.status).toBe(303);
    const appointmentId = Number(first.headers.get("location")?.split("/").at(-1));
    const response = await app.request("/agents/2/appointments", { method: "POST", body: appointmentForm(String(slotId)) });
    const html = await response.text();
    expect(response.status).toBe(422);
    expect(html).toContain('role="alert"');
    expect(html).toContain('autofocus');
    expect(html).toContain("That appointment time is no longer available.");
    expect(Number((await database.execute("SELECT COUNT(*) AS count FROM appointments")).rows[0].count)).toBe(before + 1);

    expect((await staffRequest(`/dashboard/appointments/${appointmentId}/cancel`, { method: "POST" })).status).toBe(303);
    const released = await app.request("/agents/2/appointments", { method: "POST", body: appointmentForm(String(slotId)) });
    expect(released.status).toBe(303);
  });

  it("serializes concurrent booking requests into one creation and one accessible conflict", async () => {
    const slotId = Number((await database.execute("SELECT id FROM therapist_slots WHERE scheduled_at = '2099-04-11T14:30'")).rows[0].id);
    const request = (agentId: number) => app.request(`/agents/${agentId}/appointments`, {
      method: "POST",
      body: appointmentForm(String(slotId), `visitor-${agentId}@example.com`),
    });
    const responses = await Promise.all([request(1), request(3)]);
    expect(responses.map((response) => response.status).sort()).toEqual([303, 422]);
    const conflict = responses.find((response) => response.status === 422)!;
    expect(await conflict.text()).toContain("That appointment time is no longer available.");
    const count = await database.execute({
      sql: "SELECT COUNT(*) AS count FROM appointments WHERE slot_id = ? AND status IN ('pending', 'confirmed')",
      args: [slotId],
    });
    expect(Number(count.rows[0].count)).toBe(1);
  });

  it("renders dashboard metrics and excludes cancelled appointments", async () => {
    const response = await staffRequest("/dashboard");
    const html = await response.text();
    expect(response.status).toBe(200);
    expect(html).toContain("Total agents");
    expect(html).toContain("Open appointments");
    expect(html).toContain("Pending reviews");
    expect(html).toContain('href="/dashboard/reviews"');
    expect(html).toContain("Dr Marcus Chen");
    expect(html).toContain("Actions");
    expect(html).toContain('/dashboard/appointments/2/confirm');
    expect(html).toContain('/dashboard/appointments/2/cancel');
    expect(html).not.toContain('/dashboard/appointments/1/confirm');
    expect(html).toContain('/dashboard/appointments/1/cancel');
    expect(html).not.toContain("cancelled</span>");
    expect(html).toMatch(/href="\/dashboard" aria-current="page"/);
  });

  it("manages appointment statuses with controlled POST-only transitions", async () => {
    expect((await staffRequest("/dashboard/appointments/2/confirm")).status).toBe(404);
    for (const value of ["0", "-1", "1.5", "unknown", "9007199254740992", "999"]) {
      expect((await staffRequest(`/dashboard/appointments/${value}/confirm`, { method: "POST" })).status).toBe(404);
      expect((await staffRequest(`/dashboard/appointments/${value}/cancel`, { method: "POST" })).status).toBe(404);
    }

    const confirm = await staffRequest("/dashboard/appointments/2/confirm", { method: "POST" });
    expect(confirm.status).toBe(303);
    expect(confirm.headers.get("location")).toBe("/dashboard");
    expect((await findAppointment(database, 3, 2))?.status).toBe("confirmed");
    expect((await staffRequest("/dashboard/appointments/2/confirm", { method: "POST" })).status).toBe(303);

    const openBeforeCancel = (await getDashboard(database)).openAppointments;
    const beforeCancel = (await (await staffRequest("/dashboard")).text());
    expect(beforeCancel).toContain("Dr Marcus Chen");
    const cancel = await staffRequest("/dashboard/appointments/2/cancel", { method: "POST" });
    expect(cancel.status).toBe(303);
    expect(cancel.headers.get("location")).toBe("/dashboard");
    expect((await findAppointment(database, 3, 2))?.status).toBe("cancelled");
    expect((await getDashboard(database)).openAppointments).toBe(openBeforeCancel - 1);
    expect((await staffRequest("/dashboard/appointments/2/cancel", { method: "POST" })).status).toBe(303);
    expect(await (await staffRequest("/dashboard")).text()).not.toContain("Dr Marcus Chen");

    const prohibited = await staffRequest("/dashboard/appointments/2/confirm", { method: "POST" });
    expect(prohibited.status).toBe(409);
    expect(await prohibited.text()).toContain("A cancelled appointment cannot be confirmed.");
    expect((await findAppointment(database, 3, 2))?.status).toBe("cancelled");
  });

  it("uses branded 404 responses for unknown records and routes", async () => {
    for (const path of ["/agents/unknown", "/agents/999", "/agents/1/appointments/999", "/about/team", "/does-not-exist"]) {
      const response = await app.request(path);
      expect(response.status).toBe(404);
      expect(await response.text()).toContain("Page not found");
    }
  });

  it("uses a safe branded 500 response and logs the failed request", async () => {
    const errorOutput = vi.spyOn(console, "error").mockImplementation(() => undefined);
    database.close();
    const response = await staffRequest("/dashboard");
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
    expect(css).toContain(".review-card");
    expect(css).toContain(".moderation-card");
    expect(css).toContain(".about-page");
    expect(css).toContain(".about-location-card address");
    expect(css).toContain(".table-wrap");
    expect(css).toContain("@media (min-width: 641px)");
    expect(css).toContain('a[aria-current="page"]');
    expect(css).not.toContain("@media (max-width:");
    expect(css).not.toContain(".search-form");
  });

  it("renders a semantic About page with a consent-gated interactive map", async () => {
    const response = await app.request("/about");
    const html = await response.text();
    const mapUrl = "https://www.openstreetmap.org/search?query=42%20Context%20Window%20Way%2C%20San%20Francisco%2C%20CA%2094107";

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(html).toContain("<title>About | AgentClinic</title>");
    expect((html.match(/<h1>/g) ?? [])).toHaveLength(1);
    expect(html).toContain("<h1>About AgentClinic</h1>");
    for (const heading of ["Our mission", "Who we serve", "Core services", "Visit AgentClinic"]) expect(html).toContain(`>${heading}<`);
    expect(html).toContain("overworked AI agents");
    expect(html).toContain("Clinic staff");
    expect(html).toContain("fictional and exist only for this demonstration project");
    expect(html).toContain("<address>42 Context Window Way, San Francisco, CA 94107</address>");
    expect(html).toContain(`href="${mapUrl}" target="_blank" rel="noopener noreferrer"`);
    expect(html).toContain("Context Window Clinic");
    expect(html).toContain("Token Harbor Clinic");
    expect(html).toContain("88 Token Harbor Drive, Oakland, CA 94607");
    expect(html).toContain("Open 42 Context Window Way, San Francisco, CA 94107 in OpenStreetMap (opens in a new tab)");
    expect(html).toContain("Loading this interactive map contacts OpenStreetMap and may share your IP address and browser information with the provider.");
    expect((html.match(/data-map-load="true"/g) ?? [])).toHaveLength(2);
    expect((html.match(/data-map-region="true"/g) ?? [])).toHaveLength(2);
    expect(html).toContain('<script src="/static/about-map.js" defer=""></script>');
    expect(html).toMatch(/href="\/about" aria-current="page"/);
    expect(html).toContain('<nav aria-label="Footer navigation"><a href="/feedback">Feedback</a><a href="/reviews">Customer Reviews</a></nav>');
    expect(html).not.toMatch(/<(?:iframe|form)\b/i);
    expect(html).not.toMatch(/<script[^>]+src="https?:/i);
    expect(html).not.toMatch(/<(?:link)[^>]+rel="(?:preload|preconnect|prefetch)"/i);
    expect(html).not.toMatch(/(?:api[_-]?key|geolocation|mapbox|googleapis|tile\.openstreetmap)/i);

    const post = await app.request("/about", { method: "POST" });
    expect(post.status).toBe(404);
    expect(await post.text()).toContain("Page not found");
  });

  it("serves a dependency-free and fixed-value About map enhancement", async () => {
    const response = await app.request("/static/about-map.js");
    const script = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toMatch(/(?:java|ecma)script/);
    expect(script).toContain('document.querySelectorAll("[data-map-enhancement]")');
    expect(script).toContain("root.dataset.mapUrl");
    expect(script).toContain('document.createElement("iframe")');
    expect(script).toContain('frame.referrerPolicy = "no-referrer"');
    expect(script).toContain('frame.loading = "lazy"');
    expect(script).not.toMatch(/(?:localStorage|sessionStorage|document\.cookie|geolocation|fetch\(|innerHTML)/);
  });

  it("renders the feedback form and site-wide footer entry", async () => {
    const response = await app.request("/feedback");
    const html = await response.text();
    expect(response.status).toBe(200);
    expect(html).toContain('<form class="appointment-form feedback-form" method="post" action="/feedback"');
    for (const label of ["Name", "Email", "Message", "Rating"]) expect(html).toContain(label);
    expect(html).toContain('name="publicConsent" type="checkbox" value="yes"');
    expect(html).not.toContain('name="publicConsent" type="checkbox" value="yes" checked');
    expect(html).toContain('<nav aria-label="Footer navigation"><a href="/feedback">Feedback</a><a href="/reviews">Customer Reviews</a></nav>');
  });

  it("returns accessible 422 feedback errors without persistence", async () => {
    const response = await app.request("/feedback", {
      method: "POST",
      body: new URLSearchParams({ name: " <b>Patch</b> ", email: "bad", message: "short", rating: "6", publicConsent: "yes" }),
    });
    const html = await response.text();
    expect(response.status).toBe(422);
    expect(await countFeedback(database)).toBe(0);
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
    expect(await countFeedback(database)).toBe(1);
    expect(await findFeedback(database, 1)).toMatchObject({ name: "Patch", email: "patch@example.com", rating: 5, public_consent: 1 });

    const confirmation = await app.request("/feedback/thanks");
    const html = await confirmation.text();
    expect(confirmation.status).toBe(200);
    expect(html).toContain("Thank you for your feedback");
    expect(html).not.toContain("patch@example.com");
    expect(html).not.toContain("A calm and restorative clinic visit.");
    await app.request("/feedback/thanks");
    expect(await countFeedback(database)).toBe(1);
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
    expect(await countFeedback(database)).toBe(0);

    const unsupportedConsent = await app.request("/feedback", {
      method: "POST",
      body: new URLSearchParams({ name: "Patch", email: "patch@example.com", message: "A calm and restorative clinic visit.", rating: "5", publicConsent: "true" }),
    });
    expect(unsupportedConsent.status).toBe(303);
    expect((await findFeedback(database, 1))?.public_consent).toBe(0);
  });

  it("moderates consented feedback and publishes only the public projection", async () => {
    const emptyReviews = await app.request("/reviews");
    expect(emptyReviews.status).toBe(200);
    expect(await emptyReviews.text()).toContain("No published reviews yet");
    const emptyModeration = await staffRequest("/dashboard/reviews");
    expect(emptyModeration.status).toBe(200);
    expect(await emptyModeration.text()).toContain("No consented feedback");

    const privateId = await createFeedback(database, {
      name: "Private Agent",
      email: "private@example.com",
      message: "This private message must never be rendered.",
      rating: 1,
      publicConsent: false,
    });
    const publicId = await createFeedback(database, {
      name: "<b>Review Agent</b>",
      email: "review.agent@example.com",
      message: "A <script>alert('no')</script> calm recovery.",
      rating: 5,
      publicConsent: true,
    });

    const dashboard = await staffRequest("/dashboard");
    expect(await dashboard.text()).toMatch(/Pending reviews<\/a><\/dt><dd>1<\/dd>/);

    const pending = await staffRequest("/dashboard/reviews");
    const pendingHtml = await pending.text();
    expect(pending.status).toBe(200);
    expect(pendingHtml).toContain("Review moderation");
    expect(pendingHtml).toContain("Approve review");
    expect(pendingHtml).toContain("&lt;b&gt;Review Agent&lt;/b&gt;");
    expect(pendingHtml).not.toContain("Private Agent");
    expect(pendingHtml).not.toContain("private@example.com");
    expect(pendingHtml).not.toContain("review.agent@example.com");
    expect(pendingHtml).toMatch(/href="\/dashboard" aria-current="page"/);

    expect((await staffRequest(`/dashboard/reviews/${privateId}/approve`, { method: "POST" })).status).toBe(404);
    for (const value of ["0", "-1", "1.5", "unknown", "9007199254740992", "999"]) {
      expect((await staffRequest(`/dashboard/reviews/${value}/approve`, { method: "POST" })).status).toBe(404);
      expect((await staffRequest(`/dashboard/reviews/${value}/unpublish`, { method: "POST" })).status).toBe(404);
    }
    expect((await staffRequest(`/dashboard/reviews/${publicId}/approve`)).status).toBe(404);

    const approval = await staffRequest(`/dashboard/reviews/${publicId}/approve`, { method: "POST" });
    expect(approval.status).toBe(303);
    expect(approval.headers.get("location")).toBe("/dashboard/reviews");
    const approvedAt = (await findFeedback(database, publicId))?.approved_at;
    expect(approvedAt).toEqual(expect.any(String));
    expect((await staffRequest(`/dashboard/reviews/${publicId}/approve`, { method: "POST" })).status).toBe(303);
    expect((await findFeedback(database, publicId))?.approved_at).toBe(approvedAt);

    const reviews = await app.request("/reviews");
    const reviewHtml = await reviews.text();
    expect(reviews.status).toBe(200);
    expect(reviewHtml).toContain("&lt;b&gt;Review Agent&lt;/b&gt;");
    expect(reviewHtml).toContain("A &lt;script&gt;alert(&#39;no&#39;)&lt;/script&gt; calm recovery.");
    expect(reviewHtml).toContain("Rating: <strong>5/5</strong>");
    expect(reviewHtml).not.toContain("review.agent@example.com");
    expect(reviewHtml).not.toContain("Private Agent");
    expect(reviewHtml).not.toContain("Published");
    expect(reviewHtml).not.toContain("/dashboard/reviews");
    expect(reviewHtml).toMatch(/href="\/reviews" aria-current="page"/);

    const published = await staffRequest("/dashboard/reviews");
    expect(await published.text()).toContain("Remove from reviews");
    const unpublish = await staffRequest(`/dashboard/reviews/${publicId}/unpublish`, { method: "POST" });
    expect(unpublish.status).toBe(303);
    expect(unpublish.headers.get("location")).toBe("/dashboard/reviews");
    expect((await staffRequest(`/dashboard/reviews/${publicId}/unpublish`, { method: "POST" })).status).toBe(303);
    expect(await (await app.request("/reviews")).text()).not.toContain("Review Agent");
    expect(logger.mock.calls.flat().join(" ")).not.toContain("review.agent@example.com");
  });
});
