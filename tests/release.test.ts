import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { createApp } from "../src/app.js";
import { isDatabaseReady, openDatabase } from "../src/db/index.js";

describe("production release readiness", () => {
  it("reports database readiness without exposing database failures", async () => {
    const database = await openDatabase();
    expect(await isDatabaseReady(database)).toBe(true);

    const readyApp = createApp(database);
    const ready = await readyApp.request("/ready");
    expect(ready.status).toBe(200);
    expect(ready.headers.get("cache-control")).toBe("no-store");
    await expect(ready.json()).resolves.toEqual({ status: "ready" });

    const unavailableApp = createApp({ execute: async () => { throw new Error("secret database detail"); } } as never);
    const unavailable = await unavailableApp.request("/ready");
    expect(unavailable.status).toBe(503);
    expect(await unavailable.text()).toBe('{"status":"unavailable"}');
    expect(unavailable.headers.get("cache-control")).toBe("no-store");
    database.close();
  });

  it("applies restrictive compatible security headers", async () => {
    const database = await openDatabase();
    const response = await createApp(database).request("/");
    expect(response.headers.get("content-security-policy")).toContain("frame-src https://www.openstreetmap.org");
    expect(response.headers.get("content-security-policy")).toContain("frame-ancestors 'none'");
    expect(response.headers.get("permissions-policy")).toBe("camera=(), geolocation=(), microphone=()");
    expect(response.headers.get("referrer-policy")).toBe("same-origin");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("x-frame-options")).toBe("DENY");
    database.close();
  });

  it("publishes the demo data notice and form warnings", async () => {
    const database = await openDatabase();
    const app = createApp(database, { now: () => new Date("2026-08-01T12:00:00Z") });
    const privacy = await app.request("/privacy");
    const privacyHtml = await privacy.text();
    expect(privacy.status).toBe(200);
    expect(privacyHtml).toContain("Demo data notice");
    expect(privacyHtml).toContain("does not send real email or reminders");
    expect(privacyHtml).toContain("not a privacy policy for a real clinical service");

    expect(await (await app.request("/feedback")).text()).toContain("Do not enter real or sensitive personal information");
    expect(await (await app.request("/agents/1/appointments/new")).text()).toContain("This release does not send real email");
    expect(await (await app.request("/")).text()).toContain('href="/privacy">Demo Data Notice</a>');
    database.close();
  });

  it("commits deterministic Vercel, CI, smoke, and public-asset contracts", () => {
    const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as { main: string; engines: { node: string }; scripts: Record<string, string> };
    const vercel = JSON.parse(readFileSync("vercel.json", "utf8")) as {
      buildCommand: string;
      functions: Record<string, { includeFiles: string }>;
      rewrites: Array<{ source: string; destination: string }>;
    };
    const ci = readFileSync(".github/workflows/ci.yml", "utf8");
    const deploymentSmoke = readFileSync(".github/workflows/deployment-smoke.yml", "utf8");
    const tsconfig = JSON.parse(readFileSync("tsconfig.json", "utf8")) as { include: string[] };

    expect(packageJson.main).toBe("dist/server.js");
    expect(packageJson.engines.node).toBe("24.x");
    expect(packageJson.scripts["smoke:release"]).toBe("node scripts/smoke-release.mjs");
    expect(readFileSync("scripts/smoke-release.mjs", "utf8")).toContain("x-vercel-protection-bypass");
    expect(vercel.buildCommand).toBe("npm run build");
    expect(vercel.functions["api/index.ts"].includeFiles).toBe("dist/**");
    expect(vercel.rewrites).toContainEqual({ source: "/(.*)", destination: "/api" });
    expect(readFileSync("api/index.ts", "utf8")).toContain('const compiledEntry = "../dist/index.js"');
    expect(tsconfig.include).toContain("api");
    expect(ci).toContain("permissions:\n  contents: read");
    expect(ci).toContain("npm run validate");
    expect(ci).toContain("npm audit --audit-level=moderate");
    expect(deploymentSmoke).toContain("deployment_status:");
    expect(deploymentSmoke).toContain("AGENTCLINIC_BYPASS_SECRET: ${{ secrets.VERCEL_AUTOMATION_BYPASS_SECRET }}");
    expect(deploymentSmoke).toContain("npm run smoke:release");
    expect(existsSync("public/static/style.css")).toBe(true);
    expect(existsSync("public/static/about-map.js")).toBe(true);
    expect(existsSync("public/static/visitor-time.js")).toBe(true);
  });
});
