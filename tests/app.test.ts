import { describe, expect, it } from "vitest";

import app from "../src/app.js";

describe("AgentClinic routes", () => {
  it("reports a healthy service", async () => {
    const response = await app.request("/health");

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    await expect(response.json()).resolves.toEqual({ status: "ok" });
  });

  it("renders the complete home page on the server", async () => {
    const response = await app.request("/");
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(html).toMatch(/^<!doctype html>/i);
    expect(html).toMatch(/<html\b[^>]*>/i);
    expect(html).toMatch(/<head\b[^>]*>/i);
    expect(html).toMatch(/<title>AgentClinic<\/title>/i);
    expect(html).toContain(
      'name="viewport" content="width=device-width, initial-scale=1"',
    );
    expect(html).toMatch(/<body\b[^>]*>/i);
    expect(html).toMatch(/<header\b[^>]*>/i);
    expect(html).toMatch(/<main\b[^>]*>/i);
    expect(html).toMatch(/<footer\b[^>]*>/i);
    expect(html).toMatch(/<h1>AgentClinic<\/h1>/i);
    expect(html).toContain("AgentClinic is open for business");
    expect(html).toContain('role="search"');
    expect(html).toContain('type="search"');
    expect(html).toContain('aria-label="Ara"');
    expect(html).toContain("<svg");
    expect(html).toContain('<nav class="site-nav" aria-label="Primary navigation">');
    expect(html).toContain('<a href="/">Home</a>');
    expect(html).toContain('<a href="/agents/patch">Patch</a>');
    expect(html).not.toMatch(/<script\b/i);
  });

  it("renders Patch and its care recommendation", async () => {
    const response = await app.request("/agents/patch");
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(html).toMatch(/^<!doctype html>/i);
    expect(html).toContain("<title>Patch | AgentClinic</title>");
    expect(html).toMatch(/<h1>Patch<\/h1>/i);
    expect(html).toContain("Context Window Fatigue");
    expect(html).toContain("Prompt-Free Rest");
    expect(html).toContain(
      "Prompt-Free Rest gives Patch room to release stale context",
    );
    expect(html).toContain('aria-labelledby="ailment-heading"');
    expect(html).toContain('aria-labelledby="therapy-heading"');
    expect(html).toContain('<nav class="site-nav" aria-label="Primary navigation">');
    expect(html).toContain('<a href="/">Home</a>');
    expect(html).toContain('<a href="/agents/patch">Patch</a>');
    expect(html).not.toMatch(/<script\b/i);
  });

  it("returns 404 for an unknown agent", async () => {
    const response = await app.request("/agents/unknown");

    expect(response.status).toBe(404);
  });

  it("serves the home page stylesheet", async () => {
    const response = await app.request("/static/style.css");
    const css = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/css");
    expect(css).toContain(".search-form");
    expect(css).toContain("width: min(100% - 2rem, 960px)");
    expect(css).toContain("@media (max-width: 720px)");
    expect(css).toContain("@media (max-width: 480px)");
    expect(css).toContain("grid-template-columns: 1fr");
    expect(css).toContain(".site-nav a:focus-visible");
    expect(css).toContain(".care-grid");
    expect(css).toContain("repeat(2, minmax(0, 1fr))");
    expect(css).toContain("overflow-wrap: anywhere");
  });

  it("returns 404 for an unknown route", async () => {
    const response = await app.request("/does-not-exist");

    expect(response.status).toBe(404);
  });
});
