# Customer Reviews Requirements

## Context

Customer Reviews is Phase 2 of the post-MVP roadmap. Phase 1 already stores server-validated feedback with a name, normalized email address, message, rating, public-display consent, and creation timestamp. Phase 2 adds a deliberately small staff moderation workflow and a public review page without changing the existing feedback submission contract.

The feature serves clinic staff reviewing consented feedback and visitors looking for trustworthy customer experiences. It must preserve AgentClinic's server-rendered, JavaScript-optional architecture, compact dark presentation, responsive behavior, and strict handling of private submission data.

Authentication and staff authorization remain deferred by the roadmap. The moderation surface therefore follows the existing unprotected `/dashboard` convention. This limitation must not broaden the data exposed there: feedback without public consent and all feedback email addresses remain unavailable to rendered review interfaces.

## Scope

This feature must:

- Add a minimal persisted approval state to existing feedback.
- Let staff review only feedback whose submitter granted public-display consent.
- Let staff approve pending feedback and remove approved feedback from publication.
- Add a public page that lists approved, consented reviews only.
- Add a pending-review summary and moderation entry point to the dashboard.
- Add Customer Reviews to the primary navigation and retain a site-wide public footer link.
- Provide useful empty, pending, approved, and unpublished states.
- Add migration, repository, route, privacy, accessibility, responsive, and production-browser coverage.

## Persistence and Domain Contract

- Add ordered migration `008_feedback_approval.sql` after `007_feedback.sql`.
- Add nullable text column `approved_at` to `feedback`; `NULL` means pending/unpublished and a database-generated UTC timestamp means approved and publicly eligible.
- Existing rows remain pending after migration. No existing feedback is published automatically.
- A record is publishable only while `public_consent = 1` and `approved_at IS NOT NULL`.
- Approval must update only consented records. It sets `approved_at` with the database current timestamp only when the value is currently `NULL`, so repeated approval is idempotent and does not reorder the review.
- Unpublishing must update only consented records and set `approved_at` to `NULL`. Repeated unpublishing is idempotent.
- Repository operations must use parameterized SQL and report whether the target is an existing consented record so routes can distinguish an eligible target from a missing or private record.
- Public reviews are ordered by `approved_at DESC, id DESC`.
- Moderation records are ordered with pending items first, then newest submission first within each state.
- Extend typed persistence boundaries for the approval timestamp, moderation status, pending-review count, and public-review projection.
- The public-review projection contains only `name`, `message`, and `rating`; it does not expose email, consent, creation time, approval time, or database ID.

## Staff Moderation

### Dashboard Entry Point

- `GET /dashboard` continues to return the existing staff dashboard.
- Add a `Pending reviews` metric counting consented feedback with `approved_at IS NULL`.
- The metric or adjacent action links to `/dashboard/reviews` with understandable link text.
- Existing agent, appointment, and ailment dashboard data remains unchanged.

### Moderation Page

- `GET /dashboard/reviews` returns `200 OK` and server-rendered HTML using the shared layout with Dashboard as the active primary section.
- The page lists consented feedback only and never queries or renders non-consented records.
- Each item shows the submitter name, message, numeric rating, submission time, and a clear `Pending` or `Published` status.
- Email addresses are never selected for, passed to, or rendered by the moderation page.
- Pending items expose an `Approve review` form; published items expose a `Remove from reviews` form.
- Forms use POST and remain fully operable without client-side JavaScript.
- The empty state explains that there is no consented feedback awaiting or receiving publication.
- User-controlled name and message content is rendered only through escaped JSX.

### Approval Route

- `POST /dashboard/reviews/:feedbackId/approve` accepts no user-controlled review fields.
- A positive, safe integer ID identifying an existing consented record is approved idempotently.
- Success returns `303 See Other` with `Location: /dashboard/reviews`.
- A malformed, unsafe, missing, or non-consented target returns the branded `404` response and performs no update.

### Unpublish Route

- `POST /dashboard/reviews/:feedbackId/unpublish` accepts no user-controlled review fields.
- A positive, safe integer ID identifying an existing consented record is unpublished idempotently.
- Success returns `303 See Other` with `Location: /dashboard/reviews`.
- A malformed, unsafe, missing, or non-consented target returns the branded `404` response and performs no update.

## Public Customer Reviews

- `GET /reviews` returns `200 OK` and server-rendered HTML.
- The page uses the shared layout, stylesheet, viewport metadata, header, and footer.
- It lists only records satisfying both `public_consent = 1` and `approved_at IS NOT NULL`.
- Each review displays only the submitted name, escaped message, and explicit numeric rating from 1 through 5.
- The page does not expose email addresses, consent values, timestamps, moderation state, internal IDs, or moderation controls.
- If no review is published, the page renders a welcoming empty state and a link to `/feedback`.
- A footer link labelled `Customer Reviews` points to `/reviews` on every rendered page.
- The existing `Feedback` footer link remains available.
- Primary navigation contains Agents, Ailments, Therapies, Customer Reviews, and Dashboard, in that order.
- Customer Reviews points to `/reviews` and is active on the public reviews page.
- Dashboard remains the active primary item on `/dashboard/reviews`.

## Presentation and Accessibility

- Reuse the compact dark visual system, shared layout, buttons, tables/cards, status text, and focus patterns.
- Use semantic headings and landmarks, and expose ratings with understandable text rather than color or icons alone.
- Moderation actions use explicit button labels and do not rely on ambiguous icon-only controls.
- Long names and messages wrap without clipping or page-level horizontal overflow.
- Moderation content may use a responsive table at desktop only if it transforms into a readable labelled mobile layout; cards are acceptable at both widths.
- Keyboard order follows visual order and every interactive element retains visible focus.
- Core public and moderation workflows work without browser JavaScript.

## Security, Privacy, and Reliability

- Consent alone never publishes feedback; staff approval is also required.
- Approval cannot override missing public consent.
- Removing approval immediately removes a review from the next public response without deleting the submission.
- Do not log request bodies, feedback content, names, email addresses, consent values, or moderation payloads.
- Do not add a public feedback detail endpoint.
- Moderation action URLs may contain the internal ID needed to target a record, but `/reviews` must not emit internal IDs in text, attributes, links, or metadata.
- Existing branded `404`, safe `500`, traversal protection, request logging, migration startup, and isolated-test behavior remain intact.
- Automated tests must use temporary isolated SQLite databases and never change development feedback.

## Decisions

1. Use minimal moderation: consented feedback can be approved or unpublished, but not edited, deleted, replied to, or explicitly rejected.
2. Represent publication with nullable `approved_at` rather than a multi-state status column.
3. Keep approval and unpublishing idempotent and preserve the first approval timestamp until the record is unpublished.
4. Use `/dashboard/reviews` for moderation and `/reviews` for public customer reviews.
5. Publish the submitted name, message, and rating only; never publish email or internal metadata.
6. Sort public reviews by newest approval, then descending feedback ID for deterministic ties.
7. Add Customer Reviews between Therapies and Dashboard in the primary navigation, keep Dashboard active for moderation, and retain Customer Reviews in the shared footer.
8. Require the full automated merge gate at both supported viewport widths.

## Out of Scope

- Authentication, authorization, staff accounts, or role enforcement
- Viewing feedback that lacks public consent in the moderation interface
- Editing, deleting, replying to, or explicitly rejecting feedback
- Moderation notes, reviewer identity, or an audit-history table
- Pagination, search, filtering controls, featured reviews, or aggregate rating statistics
- Public timestamps, email addresses, feedback IDs, or individual review detail routes
- Notifications, analytics, anti-spam services, or client-side application state
