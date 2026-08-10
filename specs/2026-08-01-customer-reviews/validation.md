# Customer Reviews Validation

All required checks must pass before `phase-2-customer-reviews` can be merged.

## 1. Complete Automated Gate

Run:

```sh
npm run validate
npm audit --audit-level=moderate
git diff --check
```

Success requires zero typecheck, route/database test, browser, production-build, dependency-audit, or whitespace failures.

## 2. Migration and Persistence

- A new empty database applies `008_feedback_approval.sql` after `007_feedback.sql`.
- Applied migration history records the approval migration exactly once.
- Reopening an already migrated database is a no-op and does not fail.
- The compiled production build contains and locates the new migration.
- Feedback created before and after the migration has `approved_at = NULL` by default.
- Existing feedback fields and Phase 1 persistence behavior do not change.
- Approving a consented pending record assigns a non-null database timestamp.
- Repeating approval succeeds without changing the first approval timestamp.
- Unpublishing an approved record resets `approved_at` to `NULL` without deleting or changing feedback content.
- Repeating unpublish succeeds without changing other fields.
- Approval and unpublish operations do not update non-consented or missing records.
- Closing and reopening a temporary file-backed database preserves approval state.
- All request-derived SQL values remain parameterized.

## 3. Repository Projections and Ordering

- Moderation queries return only `public_consent = 1` records.
- Pending moderation items appear before published items; each state is ordered newest submission first.
- Pending count includes only consented records with `approved_at IS NULL`.
- Public queries return only consented records with non-null approval timestamps.
- Public reviews sort by `approved_at DESC, id DESC`.
- The public projection contains exactly the data needed to render name, message, and rating and cannot expose email or internal metadata.

## 4. Dashboard and Moderation Page

- `GET /dashboard` still returns `200` and all existing dashboard sections.
- Dashboard displays the correct pending-review count and a working `/dashboard/reviews` link.
- `GET /dashboard/reviews` returns `200`, HTML, the shared layout, and Dashboard as the active primary section.
- The empty moderation state is understandable and contains no private feedback.
- A pending consented item displays name, escaped message, rating, submission time, `Pending`, and an `Approve review` POST form.
- A published item displays the corresponding public-safe content, submission time, `Published`, and a `Remove from reviews` POST form.
- Non-consented feedback and all email addresses are absent from the response.
- Long and markup-like values are escaped and wrap without horizontal page overflow.

## 5. Moderation Actions

- Approving a valid consented ID returns `303 See Other` with `Location: /dashboard/reviews` and changes exactly one eligible record.
- Repeating approval returns the same redirect without changing the original approval timestamp.
- Unpublishing a valid consented ID returns the same redirect and clears approval from exactly one eligible record.
- Repeating unpublish returns the same redirect without changing other fields.
- Missing, zero, negative, decimal, non-numeric, duplicated, and unsafe-integer path IDs return branded `404` responses without writes.
- IDs for non-consented records return branded `404` responses without revealing whether private feedback exists.
- GET requests to moderation action URLs do not mutate state and resolve through normal not-found handling.
- Request logs contain method, path, status, and duration only and never contain feedback fields or email addresses.

## 6. Public Reviews Page

- `GET /reviews` returns `200` and HTML with shared header, primary navigation, main content, footer, stylesheet, and viewport metadata.
- With no approved reviews, it renders a useful empty state and a working `/feedback` link.
- Pending consented feedback is absent.
- Non-consented feedback is absent even if a malformed test fixture gives it an approval timestamp.
- Approved consented feedback displays only the submitter name, escaped message, and an explicit rating from 1 through 5.
- Email, consent, submission time, approval time, status, internal ID, and moderation controls are absent from public markup.
- Newly approved reviews appear in the required deterministic order.
- Unpublishing a review removes it from the next `/reviews` response while preserving its stored feedback record.

## 7. Navigation, Privacy, and Regression

- The shared footer contains working `Feedback` and `Customer Reviews` links on home, catalogs, details, booking, confirmations, dashboard, moderation, feedback, reviews, and error pages.
- Primary navigation contains exactly Agents, Ailments, Therapies, Customer Reviews, and Dashboard, in that order.
- Customer Reviews links to `/reviews` and exposes the active navigation state there.
- Dashboard, rather than Customer Reviews, exposes the active navigation state on `/dashboard/reviews`.
- No public feedback list or detail route is introduced outside `/reviews`.
- Existing feedback submission and generic thank-you privacy contracts continue to pass.
- Existing Home, Health, Patch, catalog, booking, appointment confirmation, dashboard, static CSS, logging, traversal protection, branded error, and production-startup contracts do not regress.
- Automated tests use isolated temporary databases and leave development data unchanged.

## 8. Browser and Responsive Validation

At `375px × 812px` and `1280px × 800px`, Playwright must:

1. Open Customer Reviews from the primary navigation, verify its active state and the empty state, then verify the footer link reaches the same route.
2. Submit consented feedback through `/feedback` and confirm it is not public before approval.
3. Open the dashboard, verify the pending count, and reach `/dashboard/reviews`.
4. Verify the pending item contains no email address and approve it using the visible POST action.
5. Verify the item changes to Published and `/reviews` shows only name, message, and rating.
6. Remove the review from publication and verify it disappears publicly without deleting the stored feedback.
7. Verify keyboard focus, logical tab order, semantic headings, explicit action labels, readable ratings, long-content wrapping, and no page-level horizontal overflow.

The workflow must remain meaningful and fully operable with client-side JavaScript disabled.

## 9. Production Smoke Validation

- A compiled server applies the approval migration before accepting requests.
- Dashboard, moderation, approve, unpublish, reviews, feedback, health, and static routes respond according to their contracts.
- Approval state survives a restart against the same temporary database.
- Approval never makes an email address or non-consented feedback publicly retrievable.
- The SQLite file and feedback contents cannot be requested as static assets.

## Definition of Done

- Every automated, browser, production, privacy, accessibility, responsive, and regression requirement above passes.
- The roadmap marks Phase 2 complete only after implementation and all merge gates pass.
- No generated database, build output, browser report, secret, or local environment file is staged.
- The implementation remains limited to minimal consent-aware approval and public review display; deferred authentication and richer moderation stay out of scope.
