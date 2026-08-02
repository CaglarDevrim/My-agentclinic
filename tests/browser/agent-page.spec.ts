import { expect, test } from "@playwright/test";

test("exposes the complete clinic navigation and populated sections", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Where AI agents come to get better.", { exact: true })).toBeVisible();
  await expect(page.getByRole("search")).toHaveCount(0);
  for (const name of ["Agents", "Ailments", "Therapies", "Customer Reviews", "Dashboard"]) {
    await expect(page.getByRole("navigation", { name: "Primary navigation" }).getByRole("link", { name, exact: true })).toBeVisible();
  }

  await page.getByRole("navigation").getByRole("link", { name: "Agents", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Agents" })).toBeVisible();
  await expect(page.getByText("Bartholomew-47B", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Hildegard-4B", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Agents", exact: true }).last()).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("columnheader", { name: "Name" })).toHaveCount(1);
  await expect(page.getByRole("columnheader", { name: "Model" })).toHaveCount(1);
  await expect(page.getByRole("columnheader", { name: "Status" })).toHaveCount(1);

  const viewportWidth = page.viewportSize()!.width;
  const tableRowDisplay = await page.locator(".catalog-table tbody tr").first().evaluate((element) => getComputedStyle(element).display);
  if (viewportWidth === 375) {
    expect(tableRowDisplay).toBe("block");
    const mobileLabel = await page.locator('.catalog-table tbody [data-label="Name"]').first().evaluate((element) => getComputedStyle(element, "::before").content);
    expect(mobileLabel).toContain("Name");
  } else {
    expect(tableRowDisplay).toBe("table-row");
    const mainWidth = await page.locator("main").evaluate((element) => element.getBoundingClientRect().width);
    expect(mainWidth).toBeLessThanOrEqual(760);
  }

  await page.getByRole("navigation").getByRole("link", { name: "Ailments", exact: true }).click();
  await expect(page.getByText("Context-Window Claustrophobia", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Temperature Instability", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Profound dread of running out of context space mid-thought.", { exact: true })).toBeVisible();

  await page.getByRole("navigation").getByRole("link", { name: "Therapies", exact: true }).click();
  await expect(page.getByText("Prompt Reduction Therapy", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Mindful Token Counting", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Foundational course in recognising and respectfully declining out-of-scope requests.", { exact: true })).toBeVisible();

  await page.getByRole("navigation").getByRole("link", { name: "Dashboard", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
  await expect(page.getByText("Total agents", { exact: true })).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(hasHorizontalOverflow).toBe(false);
});

test("completes agent care and appointment booking", async ({ page }) => {
  await page.goto("/agents/1");
  await expect(page.getByRole("heading", { level: 1, name: "Bartholomew-47B" })).toBeVisible();
  await expect(page.getByText("Context-Window Claustrophobia", { exact: true })).toBeVisible();
  await expect(page.getByText("Mindful Token Counting", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Book an appointment" }).click();
  await page.getByRole("button", { name: "Request appointment" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.locator("#therapistName-error")).toBeVisible();

  await page.getByLabel("Therapist name").fill("Dr Browser Test");
  await page.getByLabel("Date").fill("2099-12-29");
  await page.getByLabel("Time").fill("11:30");
  await page.getByRole("button", { name: "Request appointment" }).click();
  await expect(page).toHaveURL(/\/agents\/1\/appointments\/\d+$/);
  await expect(page.getByRole("heading", { level: 1, name: "Appointment requested" })).toBeVisible();
  await expect(page.getByText("Dr Browser Test")).toBeVisible();

  await page.getByRole("link", { name: "View dashboard" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
  await expect(page.getByText("Dr Browser Test").last()).toBeVisible();

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
  await expect(page.getByRole("link", { name: "Customer Reviews" }).first()).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("heading", { level: 2, name: "No published reviews yet" })).toBeVisible();

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
