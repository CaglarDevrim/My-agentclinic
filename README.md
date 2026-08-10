# AgentClinic

## Input from stakeholders

- Mary in engineering wants a reliable site with a popular stack based on TypeScript, giving agents and staff a dashboard for easy access.
- Susan in product has a set of features about agents and their ailments, therapies, and booking appointments.
- Steve in marketing wants an attractive site that works well with a modern browser.

## Codex skills workflow

This repository includes project-scoped Codex skills under `.agents/skills` so the specification workflow is visible, repeatable, and available to anyone who opens the repository with Codex.

| Skill | Purpose |
|---|---|
| `spec-next-feature` | Finds the next incomplete roadmap phase, interviews the stakeholder, creates a feature branch, and writes implementation-ready specification documents. |
| `find-docs` | Uses the Context7 CLI to retrieve current, version-aware library and API documentation. |

Start the roadmap workflow in Codex with:

```text
$spec-next-feature
```

Ask for current dependency documentation with prompts such as:

```text
What is the most recent version of SQLite? Use Context7.
```

The Phase 2 workflow produced the Customer Reviews specification in [`specs/2026-08-01-customer-reviews`](specs/2026-08-01-customer-reviews). Context7 authentication is user-local and is never stored in this repository.

## Database development

AgentClinic uses the production-ready `@libsql/client` so the same repository layer can use a local SQLite-compatible file during development and a remote Turso/libSQL database on Vercel.

- Local development defaults to `file:data/agentclinic.sqlite` and requires no database service.
- `AGENTCLINIC_DB` can override the local database path.
- Remote environments require both `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`.
- `npm run db:setup` applies ordered migrations and deterministic seeds to the configured database.
- `npm run notifications:process` processes currently due visitor notifications into the ignored local `.agentclinic-notifications/` preview directory.
- `AGENTCLINIC_NOTIFICATION_PREVIEW_DIR` can override the local preview directory; preview files may contain appointment details and must never be committed.
- Authentication tokens belong in local or Vercel environment variables and must never be committed.

Use [`.env.example`](.env.example) as the variable-name reference when configuring your shell or Vercel project. Normal local development does not require environment variables.

## Release workflow

AgentClinic is prepared for a public demonstration on Vercel with separate Preview and Production Turso databases.

- `npm run validate` is the local and CI merge gate.
- `npm run smoke:release` performs read-only checks against `AGENTCLINIC_BASE_URL`.
- `/health` is the dependency-free liveness endpoint; `/ready` verifies database release readiness.
- Vercel Preview and Production must use different Turso credentials.
- The public demo stores submitted workflow data but does not send real notification email.

Follow [`docs/production-release.md`](docs/production-release.md) for provisioning, deployment, branch protection, verification, rollback, and demo-data reset.
