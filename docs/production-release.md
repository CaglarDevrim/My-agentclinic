# Production Release Runbook

AgentClinic is deployed as a public demonstration. It is not a real clinic and the current release does not send email. Never use production credentials in Preview, CI, local examples, commits, screenshots, or support messages.

## Environment model

Use three isolated database environments:

| Environment | Database | Purpose |
|---|---|---|
| Local and CI | local file, temporary file, or memory | development and automated tests |
| Vercel Preview | dedicated Turso Preview database | pull-request deployment and smoke verification |
| Vercel Production | dedicated Turso Production database | public `main` deployment |

Configure `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` separately in Vercel's Preview and Production scopes. Do not set `AGENTCLINIC_DB` on Vercel. The serverless application applies idempotent migrations and deterministic seeds while opening a cold database connection; operators must still prepare each database before its first deployment so migration failures are discovered before traffic arrives.

## One-time project setup

1. Import the personal GitHub repository into Vercel and keep the detected Hono framework settings.
2. Set the Vercel Production Branch to `main`.
3. Create distinct Turso databases for Preview and Production.
4. Add the corresponding URL and token to the matching Vercel environment scopes.
5. Connect the Vercel GitHub integration so deployments publish GitHub deployment-status events.
6. Protect `main` and require the `Quality / validate` and `Deployment Smoke / smoke` checks before merge.

No Turso or Vercel secret is required by GitHub Actions. Repository CI uses isolated local databases.

## Prepare a remote database

Set the target Turso variables only in the current trusted shell and run:

```powershell
npm run db:setup
```

Provision a unique staff account by setting `AGENTCLINIC_STAFF_PASSWORD` temporarily, then run:

```powershell
npm run staff:create -- staff@example.com "Clinic Staff"
```

Provision therapist accounts in the same way with `AGENTCLINIC_THERAPIST_PASSWORD` and `npm run therapist:create`. Clear temporary password variables from the shell after provisioning. Runtime Vercel environments need only the Turso URL and token.

## Preview release

1. Push `phase-14-production-release-readiness` to the `personal` remote.
2. Open a pull request into `feature/complete-mvp`.
3. Wait for Quality and the Vercel Preview deployment.
4. Confirm Deployment Smoke passes against the deployment URL.
5. Manually verify login/logout over HTTPS, secure cookies, the booking form warning, and consent-gated map loading.
6. Merge only after all checks pass.

## Production release

1. Open the final release pull request from `feature/complete-mvp` into `main`.
2. Confirm the release diff contains no secret, generated preview, database, Playwright artifact, or `.vercel` metadata.
3. Require Quality and Preview smoke evidence before merge.
4. Merge to `main` and wait for the Vercel Production deployment.
5. Confirm Production Deployment Smoke passes and manually verify staff login/logout.
6. Tag the verified commit as `v1.0.0` and publish release notes summarizing the completed roadmap.

For an additional read-only check from a trusted shell:

```powershell
$env:AGENTCLINIC_BASE_URL='https://your-deployment.example'
npm run smoke:release
Remove-Item Env:AGENTCLINIC_BASE_URL
```

## Observability and incident checks

- `/health` proves that the function can respond without depending on the database.
- `/ready` proves that the database is reachable, the latest migration exists, and required reference data is present.
- Vercel logs contain request method, path, status, and duration. They must not contain form bodies, tokens, passwords, emails, or cookies.
- A `503` from `/ready` blocks release promotion. Check scoped Turso variables and run `npm run db:setup` against the affected environment.

## Rollback and demo-data reset

This phase adds no database migration. For a code regression, promote the previous known-good Vercel deployment and rerun the release smoke checks. Do not delete or downgrade the Turso schema during code rollback.

AgentClinic stores demonstration form submissions. Reset the Preview database by replacing it with a newly prepared Preview database rather than running ad-hoc destructive SQL. Production data reset is an explicit operator action: create a replacement database, apply setup, provision accounts, change the scoped Vercel credentials, deploy, verify `/ready`, and only then retire the old database through the Turso control plane.

## Intentionally deferred

Real email delivery and scheduling, a custom domain, legal production privacy terms, automated backups, paid monitoring, analytics, and an uptime SLA are not part of the public-demo release.
