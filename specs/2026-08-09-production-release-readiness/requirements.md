# Production Release Readiness Requirements

## Context and Purpose

Phase 14 turns the completed AgentClinic product into a dependable public demonstration on Vercel backed by Turso. The release must preserve the local Node.js workflow while adding a documented, repeatable, privacy-conscious deployment path with automated quality and live-readiness evidence.

## Decisions

1. Release AgentClinic as a public demonstration rather than a real clinical or notification service.
2. Deploy the Hono application to Vercel and use separate Turso databases and credentials for Preview and Production.
3. Keep the provider-independent notification outbox but do not run the local filesystem preview transport on Vercel.
4. Require repository CI, a successful Vercel Preview deployment, and read-only live smoke checks before merge.
5. Keep `main` as the Production branch; use feature and integration branches only for Preview deployments.

## Requirements

- Preserve the existing local `npm run dev`, production Node server, routes, data contracts, permissions, and server-rendered behavior.
- Provide a Vercel-compatible default Hono export and package every SQL migration needed during a serverless cold start.
- Serve the same `/static/*` assets in local Node and Vercel environments without route or markup changes.
- Pin the supported Node.js release line consistently across package metadata and CI.
- Preserve `/health` as a dependency-free liveness endpoint and add `/ready` as a non-sensitive database readiness endpoint.
- Return readiness only when the Turso/libSQL connection works, the latest migration is applied, and seeded clinic data is present.
- Apply restrictive browser security headers without breaking the consent-gated OpenStreetMap iframe, forms, scripts, or styles.
- Publish a plain-language demonstration data notice and link it from the shared footer.
- Warn booking and feedback users not to submit real, confidential, or sensitive information to the demonstration.
- Run type checking, unit/route/database tests, production build, Playwright at `375px` and `1280px`, dependency audit, and whitespace validation in GitHub Actions.
- Run read-only smoke checks against successful Vercel Preview and Production deployments without logging credentials or form data.
- Document environment configuration, database setup, operator provisioning, branch protection, deployment, verification, data reset, and rollback.
- Never commit Turso tokens, staff passwords, generated notification previews, Vercel project metadata, or live user data.

## Privacy, Security, and Failure Behavior

- Preview and Production must not share database credentials.
- CI tests must use isolated local or in-memory databases and require no deployment secrets.
- `/ready` must return HTTP 503 with a stable generic body when readiness cannot be proven; implementation errors must remain in server logs.
- Authentication, CSRF, no-store behavior, authorization boundaries, and the existing third-party map consent boundary must remain intact.
- Global headers must prohibit framing by other sites, MIME sniffing, unnecessary browser capabilities, and unapproved content origins.
- Smoke checks must use GET/HEAD only and reject non-HTTPS remote targets except explicit localhost development targets.

## Non-goals

- Real email delivery, scheduled notification execution, or a provider account
- A custom domain, analytics, paid error monitoring, or an uptime SLA
- Legal advice or a production-grade privacy policy for real end users
- New database schema, destructive cleanup, or automated production data mutation
- Docker, a second hosting provider, or distributed infrastructure
