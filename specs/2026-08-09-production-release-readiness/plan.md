# Production Release Readiness Plan

## Specification and Runtime

1. Add Phase 14 to the roadmap and record the live-demo release boundary.
2. Add a Vercel serverless entry point that exports the configured Hono application while retaining the local Node server entry point.
3. Move browser assets under `public/static` and update local static middleware to use the shared public root.
4. Add Vercel routing, runtime, migration inclusion, and response-header configuration.
5. Extend type checking and package metadata to cover the deployment entry point and supported Node release.

## Readiness and Release Safety

6. Add a database readiness query covering connectivity, the latest migration, and required seed data.
7. Add `/ready` with stable 200/503 JSON contracts and no-store responses while preserving `/health`.
8. Add compatible global security headers and automated regression assertions.
9. Add a public demonstration data notice and form-level warnings without changing form contracts.

## Automation and Documentation

10. Add a least-privilege GitHub Actions quality workflow with deterministic dependency and Playwright installation.
11. Add a read-only release smoke script and a deployment-status workflow for successful Vercel URLs.
12. Add weekly Dependabot configuration for npm and GitHub Actions.
13. Document Preview and Production environment isolation, database preparation, account provisioning, deployment, smoke verification, rollback, and data reset.
14. Update the environment example and README with the supported release workflow and explicit notification limitation.

## Validation and Merge Readiness

15. Add route, readiness failure, security-header, privacy-notice, static-asset, and release-configuration tests.
16. Run type checking, all Vitest and Playwright suites, production build, dependency audit, smoke tests against a local production server, and `git diff --check`.
17. Inspect representative mobile and desktop pages to confirm security and release changes did not regress presentation or no-JavaScript workflows.
18. Mark Phase 14 complete only after every repository-controlled gate passes; then commit the phase for Preview deployment.
