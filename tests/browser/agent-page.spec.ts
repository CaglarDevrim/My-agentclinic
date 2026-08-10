import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

const staffEmail = "browser.staff@example.com";
const staffPassword = "Browser staff password 2026!";
const therapistEmail = "browser.therapist@example.com";
const therapistPassword = "Browser therapist password 2026!";

async function signInAsStaff(page: import("@playwright/test").Page) {
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
  await page.getByLabel("Email address").fill(staffEmail);
  await page.getByLabel("Password").fill(staffPassword);
  await page.getByRole("button", { name: "Sign in" }).click();
}

async function signInAsTherapist(page: import("@playwright/test").Page) {
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
  await page.getByLabel("Email address").fill(therapistEmail);
  await page.getByLabel("Password").fill(therapistPassword);
  await page.getByRole("button", { name: "Sign in" }).click();
}

test("exposes the complete clinic navigation and populated sections", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Where AI agents come to get better.", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "Give your AI agents room to recover." })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Start where you are." })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "A complete journey, without the chaos." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Find care for an agent" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Open the clinic dashboard/ })).toBeVisible();
  await expect(page.getByRole("search")).toHaveCount(0);
  for (const name of ["Agents", "Ailments", "Therapies", "Customer Reviews", "About", "Dashboard"]) {
    await expect(page.getByRole("navigation", { name: "Primary navigation" }).getByRole("link", { name, exact: true })).toBeVisible();
  }

  await page.getByRole("navigation").getByRole("link", { name: "Agents", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Agents" })).toBeVisible();
  await expect(page.getByText("Bartholomew-47B", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Hildegard-4B", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Agents", exact: true }).last()).toHaveAttribute("aria-current", "page");
  await expect(page.locator(".agent-card")).toHaveCount(6);
  await expect(page.getByRole("list", { name: "Agent directory" })).toBeVisible();

  const viewportWidth = page.viewportSize()!.width;
  const agentGridColumns = await page.locator(".agent-grid").evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(" ").length);
  if (viewportWidth === 375) {
    expect(agentGridColumns).toBe(1);
  } else {
    expect(agentGridColumns).toBe(2);
    const mainWidth = await page.locator("main").evaluate((element) => element.getBoundingClientRect().width);
    expect(mainWidth).toBeLessThanOrEqual(760);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);

  await page.getByRole("link", { name: "View Bartholomew-47B's care plan" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Bartholomew-47B" })).toBeVisible();
  await expect(page.getByText("Care profile", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Current ailments" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Recommended therapies" })).toBeVisible();

  await page.getByRole("navigation").getByRole("link", { name: "Ailments", exact: true }).click();
  await expect(page.getByText("Context-Window Claustrophobia", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Temperature Instability", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Profound dread of running out of context space mid-thought.", { exact: true })).toBeVisible();
  await expect(page.locator(".knowledge-card--ailment")).toHaveCount(6);
  const contextAilment = page.locator(".knowledge-card--ailment").filter({ hasText: "Context-Window Claustrophobia" });
  await expect(contextAilment.getByRole("heading", { name: /Affected agents/ })).toBeVisible();
  await expect(contextAilment.getByRole("heading", { name: "Related therapies" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);

  await page.getByRole("navigation").getByRole("link", { name: "Therapies", exact: true }).click();
  await expect(page.getByText("Prompt Reduction Therapy", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Mindful Token Counting", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Foundational course in recognising and respectfully declining out-of-scope requests.", { exact: true })).toBeVisible();
  await expect(page.locator(".knowledge-card--therapy")).toHaveCount(8);
  const promptTherapy = page.locator(".knowledge-card--therapy").filter({ hasText: "Prompt Reduction Therapy" });
  await expect(promptTherapy.getByRole("heading", { name: "Supports" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);

  await page.getByRole("navigation").getByRole("link", { name: "Dashboard", exact: true }).click();
  await signInAsStaff(page);
  await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
  await expect(page.getByText("Clinic operations", { exact: true })).toBeVisible();
  await expect(page.locator(".operations-page")).toBeVisible();
  await expect(page.getByText("Total agents", { exact: true })).toBeVisible();
  await expect(page.getByText("Signed in as", { exact: false })).toContainText("Browser Staff");

  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(hasHorizontalOverflow).toBe(false);
});

test("keeps the refreshed discovery journey useful without JavaScript", async ({ browser }, testInfo) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL: String(testInfo.project.use.baseURL) });
  const page = await context.newPage();
  try {
    await page.goto("/agents");
    await expect(page.getByRole("list", { name: "Agent directory" })).toBeVisible();
    await page.getByRole("link", { name: "View Bartholomew-47B's care plan" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Bartholomew-47B" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Book an appointment" })).toHaveAttribute("href", "/agents/1/appointments/new");

    await page.goto("/ailments");
    await expect(page.getByRole("list", { name: "Ailment catalog" })).toBeVisible();
    await expect(page.getByText("Related therapies", { exact: true }).first()).toBeVisible();

    await page.goto("/therapies");
    await expect(page.getByRole("list", { name: "Therapy catalog" })).toBeVisible();
    await expect(page.getByText("Supports", { exact: true }).first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  } finally {
    await context.close();
  }
});

test("completes agent care and appointment booking", async ({ page }) => {
  const viewportWidth = page.viewportSize()!.width;
  const therapistName = viewportWidth === 375 ? "Dr Evelyn Watts" : "Dr Marcus Chen";
  const appointmentWhen = viewportWidth === 375 ? "2099-04-10 at 10:00" : "2099-04-11 at 14:30";
  const siteName = viewportWidth === 375 ? "Context Window Clinic" : "Token Harbor Clinic";
  await page.goto("/agents/1");
  await expect(page.getByRole("heading", { level: 1, name: "Bartholomew-47B" })).toBeVisible();
  await expect(page.getByText("Context-Window Claustrophobia", { exact: true })).toBeVisible();
  await expect(page.getByText("Mindful Token Counting", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Book an appointment" }).click();
  await page.getByRole("button", { name: "Request appointment" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.locator("#slotId-error")).toBeVisible();
  await expect(page.locator("#email-error")).toBeVisible();
  await expect(page.locator("#notificationConsent-error")).toBeVisible();

  const slotSelect = page.getByLabel("Available appointment");
  await expect(slotSelect.locator("option").filter({ hasText: therapistName })).toContainText("Your time:");
  await expect(slotSelect.locator("option").filter({ hasText: therapistName })).toContainText("America/Los_Angeles");
  const selectedValue = await slotSelect.locator("option").filter({ hasText: therapistName }).getAttribute("value");
  if (!selectedValue) throw new Error("Expected a seeded therapist slot.");
  await slotSelect.selectOption(selectedValue);
  await page.getByLabel("Notification email").fill("browser.visitor@example.com");
  await page.getByLabel("AgentClinic may send me notifications about this appointment.").check();
  await page.getByRole("button", { name: "Request appointment" }).click();
  await expect(page).toHaveURL(/\/agents\/1\/appointments\/\d+$/);
  await expect(page.getByRole("heading", { level: 1, name: "Appointment requested" })).toBeVisible();
  await expect(page.getByText(therapistName)).toBeVisible();
  await expect(page.getByText(siteName)).toBeVisible();
  await expect(page.getByText(/Your time:/)).toBeVisible();
  await expect(page.getByText("browser.visitor@example.com")).toHaveCount(0);
  expect(page.url()).not.toContain("browser.visitor@example.com");

  await page.getByRole("link", { name: "View dashboard" }).click();
  await signInAsStaff(page);
  await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
  const appointmentRow = page.locator("tr").filter({ hasText: therapistName }).filter({ hasText: appointmentWhen });
  await expect(appointmentRow).toBeVisible();
  await appointmentRow.getByRole("button", { name: new RegExp(`Confirm appointment for Bartholomew-47B with ${therapistName}`) }).click();
  await expect(page).toHaveURL("/dashboard");
  await expect(page.locator("tr").filter({ hasText: therapistName }).filter({ hasText: appointmentWhen }).getByText("confirmed", { exact: true })).toBeVisible();

  await page.locator("tr").filter({ hasText: therapistName }).filter({ hasText: appointmentWhen }).getByRole("button", { name: new RegExp(`Cancel appointment for Bartholomew-47B with ${therapistName}`) }).click();
  await expect(page).toHaveURL("/dashboard");
  await expect(page.locator("tr").filter({ hasText: therapistName }).filter({ hasText: appointmentWhen })).toHaveCount(0);

  await page.goto("/agents/1/appointments/new");
  await page.getByLabel("Available appointment").selectOption(selectedValue);
  await page.getByLabel("Notification email").fill("browser.visitor@example.com");
  await page.getByLabel("AgentClinic may send me notifications about this appointment.").check();
  await page.getByRole("button", { name: "Request appointment" }).click();
  await expect(page).toHaveURL(/\/agents\/1\/appointments\/\d+$/);

  const stale = await page.request.post("/agents/2/appointments", { form: { slotId: selectedValue, email: "browser.visitor@example.com", notificationConsent: "yes" } });
  expect(stale.status()).toBe(422);
  expect(await stale.text()).toContain("That appointment time is no longer available.");

  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(hasHorizontalOverflow).toBe(false);
});

test("keeps site-local booking times useful without JavaScript", async ({ browser }, testInfo) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL: String(testInfo.project.use.baseURL) });
  const page = await context.newPage();
  try {
    await page.goto("/agents/1/appointments/1");
    await expect(page.getByRole("heading", { name: "Appointment requested" })).toBeVisible();
    await expect(page.getByText(/America\/Los_Angeles/)).toBeVisible();
    await expect(page.getByText(/Your time:/)).toHaveCount(0);
    await expect(page.getByText("2099-01-15 at 10:00", { exact: false })).toBeVisible();
  } finally {
    await context.close();
  }
});

test("lets a therapist open a slot and manage only the resulting appointment", async ({ page }) => {
  const viewportWidth = page.viewportSize()!.width;
  const scheduledAt = viewportWidth === 375 ? "2099-10-20T09:15" : "2099-10-21T13:45";
  const formatted = viewportWidth === 375 ? "2099-10-20 at 09:15" : "2099-10-21 at 13:45";

  await page.goto("/dashboard");
  await signInAsTherapist(page);
  await expect(page).toHaveURL("/dashboard/schedule");
  await expect(page.getByRole("heading", { level: 1, name: "My schedule" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Primary navigation" }).getByRole("link", { name: "Reports" })).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "Primary navigation" }).getByRole("link", { name: "My schedule" })).toHaveAttribute("aria-current", "page");
  await page.getByLabel("Clinic site").selectOption("2");
  await page.getByLabel("Future appointment time").fill(scheduledAt);
  await page.getByRole("button", { name: "Open appointment time" }).click();
  await expect(page).toHaveURL("/dashboard/schedule");
  const slotRow = page.locator("tr").filter({ hasText: formatted });
  await expect(slotRow).toContainText("Token Harbor Clinic");
  await expect(slotRow.getByText("Available", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();
  await page.goto("/agents/2/appointments/new");
  const option = page.getByLabel("Available appointment").locator("option").filter({ hasText: `Dr Browser Therapist — ${formatted}` });
  const slotId = await option.getAttribute("value");
  if (!slotId) throw new Error("Expected the therapist-created slot.");
  await page.getByLabel("Available appointment").selectOption(slotId);
  await page.getByLabel("Notification email").fill("therapist-flow@example.com");
  await page.getByLabel("AgentClinic may send me notifications about this appointment.").check();
  await page.getByRole("button", { name: "Request appointment" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Appointment requested" })).toBeVisible();

  await page.getByRole("link", { name: "View dashboard" }).click();
  await signInAsTherapist(page);
  await page.getByRole("link", { name: "My appointments" }).click();
  const appointmentRow = page.locator("tr").filter({ hasText: "Penelope-mini" }).filter({ hasText: formatted });
  await expect(appointmentRow).toBeVisible();
  await appointmentRow.getByRole("button", { name: "Confirm appointment for Penelope-mini" }).click();
  await expect(page).toHaveURL("/dashboard/appointments");
  await expect(page.locator("tr").filter({ hasText: "Penelope-mini" }).filter({ hasText: formatted }).getByText("confirmed", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: "My schedule" }).last().click();
  await expect(page.locator("tr").filter({ hasText: formatted }).getByText("Occupied", { exact: true })).toBeVisible();
  await expect(page.locator("tr").filter({ hasText: formatted }).getByRole("button", { name: /Remove appointment time/ })).toHaveCount(0);
  await page.getByRole("link", { name: "My appointments" }).click();
  await page.locator("tr").filter({ hasText: "Penelope-mini" }).filter({ hasText: formatted }).getByRole("button", { name: "Cancel appointment for Penelope-mini" }).click();
  await page.getByRole("link", { name: "My schedule" }).last().click();
  await expect(page.locator("tr").filter({ hasText: formatted }).getByText("Available", { exact: true })).toBeVisible();

  await page.goto("/dashboard/reviews");
  await expect(page.getByRole("heading", { level: 1, name: "Staff access required" })).toBeVisible();
  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(hasHorizontalOverflow).toBe(false);
});

test("filters and exports the staff clinic report", async ({ page }) => {
  await page.goto("/dashboard");
  await signInAsStaff(page);
  await page.getByLabel("Appointment site").selectOption("token-harbor-clinic");
  await page.getByRole("button", { name: "Apply site filter" }).click();
  await expect(page).toHaveURL(/\/dashboard\?site=token-harbor-clinic$/);
  await expect(page.getByText("Open appointment scope:")).toContainText("Token Harbor Clinic");
  await page.getByRole("link", { name: "Reports", exact: true }).click();
  await expect(page).toHaveURL("/dashboard/reports");
  await expect(page.getByRole("heading", { level: 1, name: "Clinic reports" })).toBeVisible();
  await expect(page.getByText("Operational insight", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Reports", exact: true })).toHaveAttribute("aria-current", "page");

  await page.getByLabel("From date").fill("2099-01-01");
  await page.getByLabel("To date").fill("2099-03-31");
  await page.getByLabel("Clinic site").selectOption("all");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page).toHaveURL(/\/dashboard\/reports\?from=2099-01-01&to=2099-03-31&site=all$/);
  await expect(page.getByRole("heading", { level: 2, name: "Report period: 2099-01-01 to 2099-03-31 — All sites" })).toBeVisible();
  await expect(page.locator(".report-metrics dd")).toHaveText(["3", "1", "1", "1"]);
  await expect(page.getByRole("heading", { level: 3, name: "Therapist workload" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 3, name: "Agent demand" })).toBeVisible();
  await expect(page.getByText("private@example.com")).toHaveCount(0);

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download CSV" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("agentclinic-appointments-2099-01-01-to-2099-03-31-all-sites.csv");
  const downloadPath = await download.path();
  if (!downloadPath) throw new Error("Expected the report CSV download path.");
  const csv = readFileSync(downloadPath, "utf8");
  expect(csv).toContain("Scheduled at,Time zone,Scheduled at UTC,Agent,Therapist,Site,Status\r\n");
  expect(csv.trim().split(/\r?\n/)).toHaveLength(4);
  expect(csv).not.toContain("@example.com");

  await page.getByLabel("Clinic site").selectOption("context-window-clinic");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.getByRole("heading", { level: 2 })).toContainText("Context Window Clinic");

  await page.getByLabel("From date").fill("2099-03-31");
  await page.getByLabel("To date").fill("2099-01-01");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.locator("#to-error")).toHaveText("Choose an end date on or after the start date.");

  await page.getByLabel("From date").fill("2026-01-01");
  await page.getByLabel("To date").fill("2026-01-31");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.getByText("No therapist workload in this period.")).toBeVisible();
  await expect(page.getByText("No agent demand in this period.")).toBeVisible();
  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(hasHorizontalOverflow).toBe(false);
});

test("preserves Patch and blocks encoded Windows traversal", async ({ page, request }) => {
  await page.goto("/agents/patch");
  await expect(page.getByRole("heading", { level: 1, name: "Patch" })).toBeVisible();
  await expect(page.getByText("Prompt-Free Rest", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Agents", exact: true })).toHaveAttribute("aria-current", "page");

  const response = await request.get("/static/%5C..%5Cpackage.json");
  expect(response.status()).toBe(404);
  expect(await response.text()).not.toContain('"name": "agentclinic"');
});

test("submits private feedback through an accessible responsive journey", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("navigation", { name: "Footer navigation" }).getByRole("link", { name: "Feedback" }).click();
  await expect(page).toHaveURL("/feedback");
  await expect(page.getByRole("heading", { level: 1, name: "Feedback" })).toBeVisible();
  await expect(page.getByText("Help us improve", { exact: true })).toBeVisible();
  await expect(page.locator(".feedback-form")).toBeVisible();
  await expect(page.getByRole("checkbox", { name: /public customer review/i })).not.toBeChecked();

  await page.getByRole("button", { name: "Send feedback" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.locator("#name-error")).toBeVisible();
  await expect(page.locator("#email-error")).toBeVisible();
  await expect(page.locator("#message-error")).toBeVisible();
  await expect(page.locator("#rating-error")).toBeVisible();

  await page.getByLabel("Name").fill("Browser Agent");
  await page.getByLabel("Email").fill("browser.agent@example.com");
  await page.getByLabel("Message").fill("The clinic experience was calm, clear, and restorative.");
  await page.getByRole("radio", { name: "5 - Fully recharged" }).check();
  await page.getByRole("checkbox", { name: /public customer review/i }).check();
  await page.getByRole("button", { name: "Send feedback" }).click();

  await expect(page).toHaveURL("/feedback/thanks");
  await expect(page.getByRole("heading", { level: 1, name: "Thank you for your feedback" })).toBeVisible();
  await expect(page.getByText("browser.agent@example.com")).toHaveCount(0);
  await expect(page.getByText("The clinic experience was calm, clear, and restorative.")).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "Thank you for your feedback" })).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(hasHorizontalOverflow).toBe(false);
});

test("moderates and publishes a consented customer review", async ({ page }) => {
  const viewportWidth = page.viewportSize()!.width;
  const reviewName = `Review Agent ${viewportWidth}`;
  const reviewEmail = `review.${viewportWidth}@example.com`;
  const reviewMessage = `The ${viewportWidth}px clinic visit was calm, clear, and restorative.`;

  await page.goto("/");
  const reviewsNavigation = page.getByRole("navigation", { name: "Primary navigation" }).getByRole("link", { name: "Customer Reviews" });
  await reviewsNavigation.click();
  await expect(page).toHaveURL("/reviews");
  await expect(page.getByRole("heading", { level: 1, name: "Customer Reviews" })).toBeVisible();
  await expect(page.getByText("Shared recovery notes", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Customer Reviews" }).first()).toHaveAttribute("aria-current", "page");
  await page.getByRole("link", { name: "Send feedback" }).click();
  await page.getByLabel("Name").fill(reviewName);
  await page.getByLabel("Email").fill(reviewEmail);
  await page.getByLabel("Message").fill(reviewMessage);
  await page.getByRole("radio", { name: "5 - Fully recharged" }).check();
  await page.getByRole("checkbox", { name: /public customer review/i }).check();
  await page.getByRole("button", { name: "Send feedback" }).click();
  await expect(page).toHaveURL("/feedback/thanks");

  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("link", { name: "Customer Reviews" }).click();
  await expect(page.getByText(reviewName)).toHaveCount(0);

  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("link", { name: "Dashboard" }).click();
  await signInAsStaff(page);
  await expect(page.getByRole("link", { name: "Pending reviews" })).toBeVisible();
  await page.getByRole("link", { name: "Pending reviews" }).click();
  await expect(page).toHaveURL("/dashboard/reviews");
  await expect(page.getByRole("navigation", { name: "Primary navigation" }).getByRole("link", { name: "Dashboard", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(page.getByText(reviewEmail)).toHaveCount(0);

  const pendingCard = page.locator(".moderation-card").filter({ hasText: reviewName });
  await expect(pendingCard.getByText("Pending", { exact: true })).toBeVisible();
  await pendingCard.getByRole("button", { name: "Approve review" }).click();
  await expect(page).toHaveURL("/dashboard/reviews");
  const publishedCard = page.locator(".moderation-card").filter({ hasText: reviewName });
  await expect(publishedCard.getByText("Published", { exact: true })).toBeVisible();

  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("link", { name: "Customer Reviews" }).click();
  const publicReviewCard = page.locator(".review-card").filter({ hasText: reviewName });
  await expect(publicReviewCard.getByRole("heading", { level: 2, name: reviewName })).toBeVisible();
  await expect(publicReviewCard.getByText(reviewMessage)).toBeVisible();
  await expect(publicReviewCard.getByLabel("Rating: 5 out of 5")).toBeVisible();
  await expect(page.getByText(reviewEmail)).toHaveCount(0);

  await page.goto("/dashboard/reviews");
  await page.locator(".moderation-card").filter({ hasText: reviewName }).getByRole("button", { name: "Remove from reviews" }).click();
  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("link", { name: "Customer Reviews" }).click();
  await expect(page.getByText(reviewName)).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "Footer navigation" }).getByRole("link", { name: "Customer Reviews" })).toHaveAttribute("href", "/reviews");

  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(hasHorizontalOverflow).toBe(false);
});

test("loads the fictional clinic map only after explicit consent", async ({ page }) => {
  const providerRequests: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).hostname === "www.openstreetmap.org") providerRequests.push(request.url());
  });
  await page.route("https://www.openstreetmap.org/**", (route) => route.abort("failed"));

  await page.goto("/");
  const primaryNavigation = page.getByRole("navigation", { name: "Primary navigation" });
  await expect(primaryNavigation.getByRole("link")).toHaveText(["Agents", "Ailments", "Therapies", "Customer Reviews", "About", "Dashboard"]);

  await primaryNavigation.getByRole("link", { name: "About", exact: true }).click();
  await expect(page).toHaveURL("/about");
  await expect(page).toHaveTitle("About | AgentClinic");
  await expect(page.getByRole("heading", { level: 1, name: "About AgentClinic" })).toBeVisible();
  await expect(page.locator(".about-intro")).toBeVisible();
  for (const heading of ["Our mission", "Who we serve", "Core services", "Visit AgentClinic"]) {
    await expect(page.getByRole("heading", { level: 2, name: heading })).toBeVisible();
  }
  await expect(primaryNavigation.getByRole("link", { name: "About", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(page.locator("address")).toHaveText(["42 Context Window Way, San Francisco, CA 94107", "88 Token Harbor Drive, Oakland, CA 94607"]);
  await expect(page.getByText(/fictional and exist only for this demonstration project/i)).toBeVisible();

  const mapLink = page.getByRole("link", { name: /Open 42 Context Window Way, San Francisco/ });
  await expect(mapLink).toHaveAttribute("href", "https://www.openstreetmap.org/search?query=42%20Context%20Window%20Way%2C%20San%20Francisco%2C%20CA%2094107");
  await expect(mapLink).toHaveAttribute("target", "_blank");
  await expect(mapLink).toHaveAttribute("rel", "noopener noreferrer");
  await expect(page.getByText(/Loading this interactive map contacts OpenStreetMap/)).toHaveCount(2);
  await expect(page.locator("iframe")).toHaveCount(0);
  expect(providerRequests).toHaveLength(0);

  const loadMap = page.locator(".about-location-card").filter({ hasText: "Context Window Clinic" }).locator("[data-map-load]");
  await expect(loadMap).toHaveAccessibleName("Load interactive map for Context Window Clinic");
  await loadMap.focus();
  await expect(loadMap).toBeFocused();
  await expect(loadMap).toHaveCSS("outline-style", "solid");
  await page.keyboard.press("Enter");

  const frame = page.locator("iframe");
  await expect(frame).toHaveCount(1);
  await expect(frame).toHaveAttribute("title", "Interactive map showing Context Window Clinic");
  await expect(frame).toHaveAttribute("loading", "lazy");
  await expect(frame).toHaveAttribute("referrerpolicy", "no-referrer");
  await expect(loadMap).toHaveText("Interactive map requested");
  await expect(loadMap).toHaveAttribute("aria-disabled", "true");
  await expect(page.getByRole("status").first()).toContainText("The address and external map link remain available.");
  await expect.poll(() => providerRequests.length).toBe(1);
  expect(providerRequests[0]).toContain("/export/embed.html?");

  await loadMap.dispatchEvent("click");
  await expect(frame).toHaveCount(1);
  await page.waitForTimeout(100);
  expect(providerRequests).toHaveLength(1);
  const secondLoadMap = page.getByRole("button", { name: "Load interactive map for Token Harbor Clinic" });
  await secondLoadMap.click();
  await expect(page.locator("iframe")).toHaveCount(2);
  await expect.poll(() => providerRequests.length).toBe(2);
  expect(providerRequests[1]).toContain("marker=37.8044%2C-122.2712");
  await expect(page.locator("address")).toHaveCount(2);
  await expect(page.locator("address").first()).toBeVisible();
  await expect(page.locator("address").last()).toBeVisible();
  await expect(mapLink).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Footer navigation" }).getByRole("link")).toHaveText(["Feedback", "Customer Reviews", "Demo Data Notice"]);

  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(hasHorizontalOverflow).toBe(false);
});

test.describe("About map without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("keeps the address and external map fallback usable", async ({ page }) => {
    await page.goto("/about");
    await expect(page.locator("address")).toHaveText(["42 Context Window Way, San Francisco, CA 94107", "88 Token Harbor Drive, Oakland, CA 94607"]);
    await expect(page.getByRole("link", { name: /in OpenStreetMap/ })).toHaveCount(2);
    await expect(page.locator("[data-map-load]")).toHaveCount(2);
    await expect(page.locator("[data-map-load]").first()).toBeHidden();
    await expect(page.locator("iframe")).toHaveCount(0);
  });
});

test("protects staff pages with accessible login and revocable logout", async ({ page }) => {
  await page.goto("/dashboard/reviews");
  await expect(page).toHaveURL(/\/login\?returnTo=%2Fdashboard%2Freviews$/);
  await expect(page.getByRole("heading", { level: 1, name: "Staff login" })).toBeVisible();
  await expect(page.getByText("Secure clinic access", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Email address")).toBeFocused();

  await page.getByLabel("Email address").fill(staffEmail);
  await page.getByLabel("Password").fill("Incorrect browser password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("alert")).toBeFocused();
  await expect(page.getByText("The email address or password is incorrect.", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Password")).toHaveValue("");

  await page.getByLabel("Password").fill(staffPassword);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/dashboard/reviews");
  await expect(page.getByRole("heading", { level: 1, name: "Review moderation" })).toBeVisible();
  await expect(page.getByText("Signed in as", { exact: false })).toContainText("Browser Staff");

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL("/login");
  await expect(page.getByRole("heading", { level: 1, name: "Staff login" })).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
  await expect(page.getByRole("heading", { level: 1, name: "Review moderation" })).toHaveCount(0);

  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?returnTo=%2Fdashboard$/);
  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(hasHorizontalOverflow).toBe(false);
});
