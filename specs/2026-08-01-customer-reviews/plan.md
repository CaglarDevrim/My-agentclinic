# Customer Reviews Plan

## Task Group 1 - Domain and Persistence

1. Add ordered migration `008_feedback_approval.sql` with a nullable `approved_at` column that leaves every existing feedback record pending.
2. Extend feedback record, moderation item, public review, and dashboard data types without widening the public projection to private fields.
3. Add parameterized repository operations to list consented moderation items, count pending consented items, approve idempotently, unpublish idempotently, and list approved public reviews in deterministic order.
4. Add migration, reopen, legacy-row, consent-boundary, idempotence, ordering, and projection tests using isolated in-memory and temporary file-backed databases.

## Task Group 2 - Components and Pages

5. Build an accessible server-rendered moderation page for consented pending and published feedback, with explicit status text and state-appropriate POST forms.
6. Build a public Customer Reviews page that renders only name, escaped message, and numeric rating, including a feedback-linked empty state.
7. Extend the dashboard with a pending-review metric and a clear link to the moderation page.

## Task Group 3 - Routes and Workflows

8. Add `GET /dashboard/reviews` with Dashboard navigation context and privacy-safe moderation data.
9. Add `POST /dashboard/reviews/:feedbackId/approve` with strict positive-ID parsing, consent enforcement, idempotent persistence, branded `404` failures, and a `303` redirect.
10. Add `POST /dashboard/reviews/:feedbackId/unpublish` with the same validation, privacy, idempotence, error, and redirect contract.
11. Add `GET /reviews` backed only by the restricted public-review repository projection.

## Task Group 4 - Navigation and Presentation

12. Add Customer Reviews between Therapies and Dashboard in the primary navigation, make it active on `/reviews`, keep Dashboard active on `/dashboard/reviews`, and retain Customer Reviews beside Feedback in the shared footer.
13. Extend the compact dark stylesheet for review lists, ratings, moderation statuses, empty states, long-content wrapping, visible focus, and responsive layouts at `375px` and `1280px`.

## Task Group 5 - Tests and Merge Readiness

14. Add route tests for empty, pending, approved, unpublished, repeated-action, malformed-ID, missing-record, non-consented, escaping, logging, and public-projection behavior.
15. Add Playwright journeys that submit consented feedback, moderate it, verify public publication, unpublish it, and confirm responsive privacy and accessibility behavior at both required viewports.
16. Run type checking, all Vitest and Playwright tests, the production build, dependency audit, whitespace validation, and production smoke checks before marking Phase 2 complete.
