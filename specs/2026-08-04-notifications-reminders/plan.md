# Visitor Notifications and Reminders Plan

## Task Group 1 - Migration and Notification Domain

1. Add the next ordered migration with nullable appointment notification email/consent fields and a constrained `notification_outbox` table.
2. Preserve legacy appointments unchanged and verify fresh, upgraded, and repeatedly opened databases.
3. Add typed notification event, state, enqueue, claim, completion, failure, suppression, and processing result contracts.
4. Implement strict email normalization/validation and exact affirmative-consent parsing without logging rejected values.
5. Add atomic database operations that combine booking or status transitions with their required outbox records.
6. Enforce one event of each kind per appointment through a database unique constraint and typed duplicate-safe outcomes.

## Task Group 2 - Booking and Status Integration

7. Extend the public booking page with required email and consent controls, privacy guidance, retained safe values, and accessible errors.
8. Extend booking POST parsing to reject missing, duplicated, malformed, control-character, overlong, or non-affirmative notification fields.
9. Atomically create the appointment, immediate creation event, and a 24-hour reminder only when the selected slot is more than 24 hours away.
10. Preserve slot-derived appointment authority, concurrency safety, existing `422` behavior, and the confirmation `303` redirect.
11. Atomically enqueue the first successful confirmation or cancellation event while keeping repeated transitions idempotent.
12. Suppress unprocessed reminders on cancellation and skip all events for legacy appointments without consented contact data.

## Task Group 3 - Processor and Preview Transport

13. Add a transport interface and deterministic notification renderer for safe HTML and plain-text messages.
14. Implement concurrency-safe due-event claiming, deterministic ordering, successful completion, retryable failure, attempt counting, and bounded safe diagnostics.
15. Add the local preview transport using opaque filenames beneath `.agentclinic-notifications/` and add the directory to Git ignore rules.
16. Add `npm run notifications:process` with application database configuration, clinic-local clock handling, redacted output, and a failing exit code when work remains failed.
17. Ensure future, processed, suppressed, cancelled-reminder, and ineligible records are skipped without deleting history.

## Task Group 4 - Security, Privacy, and Presentation

18. Keep recipient addresses out of URLs, public confirmation pages, filenames, logs, exceptions, command summaries, and server error output.
19. Preserve existing staff/therapist authorization, appointment ownership, CSRF, same-origin, session, and slot collision boundaries.
20. Keep notification rendering escaped, provider-independent, free of mutation links and secrets, and usable as both HTML and plain text.
21. Update booking styles only as needed for explicit labels, consent copy, error linking, focus visibility, and overflow-free mobile/desktop presentation.

## Task Group 5 - Validation

22. Add migration and domain tests for compatibility, constraints, event uniqueness, atomicity, time boundaries, cancellation suppression, retry, and concurrent processors.
23. Add route tests for booking validation, status-event integration, idempotency, concurrency losses, privacy, CSRF/origin enforcement, and regression behavior.
24. Add fake-clock and fake-transport tests proving correct due-event selection and exactly-once preview behavior without real filesystem or network use.
25. Add Playwright booking journeys at `375px x 812px` and `1280px x 800px` covering valid submission, email/consent errors, keyboard focus, confirmation, and horizontal overflow.
26. Run type checking, Vitest, Playwright, production compilation/smoke checks, dependency audit, whitespace validation, and secret/artifact review.
27. Create isolated local example appointments, run the processor, manually inspect one HTML and one text preview for each event kind, then confirm the preview directory remains ignored and unstaged.
