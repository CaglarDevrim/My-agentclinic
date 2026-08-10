# Production Release Readiness Validation

## Automated Merge Gate

- `npm run validate` passes type checking, Vitest, production compilation, and Playwright at `375px` and `1280px`.
- `npm audit --audit-level=moderate` reports no qualifying vulnerabilities.
- `git diff --check` reports no whitespace errors.
- CI installs from `package-lock.json`, installs only Chromium for Playwright, uses no deployment secrets, and reproduces the local gate.
- Release configuration tests parse committed JSON/YAML-facing configuration and verify the expected runtime, migration inclusion, public routing, and least-privilege workflow contracts.

## Runtime Contracts

- `GET /health` remains HTTP 200 with exactly `{ "status": "ok" }`.
- `GET /ready` returns HTTP 200 and `{ "status": "ready" }` for a migrated, seeded database.
- `GET /ready` returns HTTP 503, `{ "status": "unavailable" }`, and no internal error text when the database is missing the latest migration, required seed data, or cannot execute the readiness query.
- `/health`, `/ready`, login, and protected surfaces retain appropriate no-store behavior.
- The Vercel entry point exposes a default Hono application without starting a listening Node server.
- `/static/style.css`, `/static/about-map.js`, and `/static/visitor-time.js` remain available locally and in the production build.

## Security and Privacy

- HTML responses include the chosen CSP, anti-framing, MIME-sniffing, referrer, and permissions restrictions.
- CSP allows only same-origin application assets and the existing consent-gated `https://www.openstreetmap.org` frame.
- Authentication cookies, CSRF enforcement, authorization, return-path validation, and staff no-store headers continue to pass existing tests.
- `/privacy` identifies AgentClinic as a fictional demonstration, describes stored form data and the opt-in map request, explains that notification email is not delivered, and tells visitors not to submit real sensitive data.
- Booking and feedback forms show the same warning without removing labels, validation, values, consent, or submission behavior.

## Live Smoke Evidence

- A successful Preview and Production deployment passes read-only checks for `/health`, `/ready`, `/`, `/agents`, `/agents/1`, `/agents/1/appointments/new`, `/login`, `/privacy`, `/static/style.css`, and the unauthenticated `/dashboard` redirect.
- Smoke rejects credentials in the URL, rejects insecure non-local HTTP targets, follows only expected same-origin redirects, and never sends a state-changing request.
- No response or workflow log contains a Turso token, staff password, visitor email, session cookie, or internal database error.

## Manual Release Checks

- Preview and Production Vercel environments use distinct Turso credentials.
- A provisioned staff account can sign in and sign out over HTTPS; secure cookie, CSRF, and authorization behavior remain correct.
- The OpenStreetMap iframe makes no third-party request until the visitor activates it.
- Vercel request logs show method, path, status, and duration without form values or secrets.
- The documented previous-deployment rollback path is understood before Production promotion.

## Definition of Done

Repository-controlled gates pass, Preview smoke evidence is successful, no secret is committed, release documentation is complete, and Phase 14 is marked complete. Production promotion and the `v1.0.0` tag occur only after the same smoke checks pass on `main`.
