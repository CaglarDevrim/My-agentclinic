import { expect, test } from "@playwright/test";

test("renders a responsive, keyboard-accessible care journey", async ({
  page,
}) => {
  await page.goto("/agents/patch");

  await expect(page).toHaveTitle("Patch | AgentClinic");
  await expect(
    page.getByRole("heading", { level: 1, name: "Patch" }),
  ).toBeVisible();
  await expect(
    page.getByText("Context Window Fatigue", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Prompt-Free Rest", { exact: true })).toBeVisible();

  const patchLink = page.getByRole("link", { name: "Patch", exact: true });
  const homeLink = page.getByRole("link", { name: "Home", exact: true });

  await expect(patchLink).toHaveAttribute("aria-current", "page");
  await expect(homeLink).not.toHaveAttribute("aria-current", "page");

  const hasHorizontalOverflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);

  const homeLinkBox = await homeLink.boundingBox();
  expect(homeLinkBox).not.toBeNull();
  expect(homeLinkBox!.height).toBeGreaterThanOrEqual(44);

  await homeLink.focus();
  const focusStyle = await homeLink.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      color: style.outlineColor,
      style: style.outlineStyle,
      width: style.outlineWidth,
    };
  });
  expect(focusStyle).toEqual({
    color: "rgb(29, 78, 216)",
    style: "solid",
    width: "3px",
  });

  const cards = page.locator(".care-card");
  await expect(cards).toHaveCount(2);
  const cardBoxes = await cards.evaluateAll((elements) =>
    elements.map((element) => {
      const box = element.getBoundingClientRect();
      return {
        bottom: box.bottom,
        left: box.left,
        right: box.right,
        top: box.top,
      };
    }),
  );

  if (page.viewportSize()!.width === 375) {
    expect(cardBoxes[1].top).toBeGreaterThan(cardBoxes[0].bottom);
  } else {
    expect(Math.abs(cardBoxes[1].top - cardBoxes[0].top)).toBeLessThan(1);
    expect(cardBoxes[1].left).toBeGreaterThan(cardBoxes[0].right);
  }

  await homeLink.click();
  await expect(page).toHaveURL("/");
  await expect(
    page.getByRole("link", { name: "Home", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await page.getByRole("link", { name: "Patch", exact: true }).click();
  await expect(page).toHaveURL("/agents/patch");
});

test("does not expose files through encoded Windows path traversal", async ({
  request,
}) => {
  const response = await request.get("/static/%5C..%5Cpackage.json");

  expect(response.status()).toBe(404);
  expect(await response.text()).not.toContain('"name": "agentclinic"');
});
