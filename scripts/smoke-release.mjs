const rawBaseUrl = process.env.AGENTCLINIC_BASE_URL;
if (!rawBaseUrl) throw new Error("AGENTCLINIC_BASE_URL is required.");

const baseUrl = new URL(rawBaseUrl);
const vercelBypassSecret = process.env.AGENTCLINIC_BYPASS_SECRET;
const isLocal = baseUrl.hostname === "127.0.0.1" || baseUrl.hostname === "localhost";
if (baseUrl.username || baseUrl.password) throw new Error("The smoke target must not contain credentials.");
if (baseUrl.protocol !== "https:" && !(isLocal && baseUrl.protocol === "http:")) {
  throw new Error("The smoke target must use HTTPS unless it is localhost.");
}
baseUrl.pathname = "/";
baseUrl.search = "";
baseUrl.hash = "";

function target(path) {
  return new URL(path, baseUrl);
}

async function request(path, options = {}) {
  const headers = new Headers(options.headers);
  if (vercelBypassSecret) headers.set("x-vercel-protection-bypass", vercelBypassSecret);
  const response = await fetch(target(path), {
    redirect: "manual",
    signal: AbortSignal.timeout(10_000),
    ...options,
    headers,
  });
  return response;
}

async function expectStatus(path, status, content) {
  const response = await request(path);
  if (response.status !== status) throw new Error(`${path} returned ${response.status}; expected ${status}.`);
  const body = await response.text();
  if (content && !body.includes(content)) throw new Error(`${path} did not contain the expected release marker.`);
  return response;
}

const health = await expectStatus("/health", 200, '"status":"ok"');
if (health.headers.get("cache-control") !== "no-store") throw new Error("/health must be no-store.");

const ready = await expectStatus("/ready", 200, '"status":"ready"');
if (ready.headers.get("cache-control") !== "no-store") throw new Error("/ready must be no-store.");

const home = await expectStatus("/", 200, "Where AI agents come to get better.");
for (const header of ["content-security-policy", "permissions-policy", "referrer-policy", "x-content-type-options", "x-frame-options"]) {
  if (!home.headers.has(header)) throw new Error(`The home page is missing ${header}.`);
}

await expectStatus("/agents", 200, "Agent directory");
await expectStatus("/agents/1", 200, "Care profile");
await expectStatus("/agents/1/appointments/new", 200, "Appointment request");
await expectStatus("/login", 200, "Staff login");
await expectStatus("/privacy", 200, "Demo data notice");

const stylesheet = await expectStatus("/static/style.css", 200, ":root");
if (!stylesheet.headers.get("content-type")?.includes("text/css")) throw new Error("The stylesheet has an unexpected content type.");

const dashboard = await request("/dashboard");
if (dashboard.status !== 303) throw new Error(`/dashboard returned ${dashboard.status}; expected 303.`);
const location = dashboard.headers.get("location");
if (!location?.startsWith("/login?returnTo=")) throw new Error("/dashboard did not redirect to the safe login route.");
if (dashboard.headers.get("cache-control") !== "no-store") throw new Error("The protected dashboard response must be no-store.");

console.log(`AgentClinic release smoke passed for ${baseUrl.origin}.`);
