# Visitor Notifications and Reminders Validation

All required checks must pass before `phase-7-notifications-reminders` can be merged.

## 1. Complete Automated Gate

Run:

```sh
npm run validate
npm audit --audit-level=moderate
git diff --check
```

Success requires zero typecheck, migration, notification-domain, booking, status-transition, outbox, processor, retry, privacy, route, security, responsive-browser, production-build, dependency-audit, artifact, secret, or whitespace failures.

## 2. Migration and Compatibility

- A fresh database applies all migrations and contains nullable appointment notification fields plus the constrained notification outbox.
- An existing Phase 6 database upgrades without changing or deleting any appointment, therapist, slot, user, session, feedback, review, or agent record.
- Legacy appointments retain null notification data and continue to render and transition through existing routes.
- Repeated database opening and migration execution does not duplicate or rewrite notification data.
- Event kind, state, attempt count, appointment reference, timestamps, and appointment/event uniqueness are enforced by database constraints.
- The production build contains and applies the new ordered migration for both local-file and Turso configurations.

## 3. Booking Contact and Consent

- The booking form contains a labelled required email input, labelled required consent checkbox, concise purpose text, and no disabled-JavaScript dependency.
- A valid email is normalized according to the requirements and stored with a server-generated consent timestamp.
- Missing, duplicated, malformed, control-character, or overlong email values return accessible `422` errors and create no appointment or outbox record.
- Missing, duplicated, false, or unexpected consent values return `422` and create no appointment or outbox record.
- Safe entered values are retained after validation errors without being included in logs, URLs, or branded server errors.
- Client-supplied recipient overrides, event kinds, due times, states, consent timestamps, appointment status, therapist data, or schedule data cannot influence authoritative values.

## 4. Event Creation and Atomicity

- A successful booking atomically creates one pending appointment and one due `appointment_created` event.
- A booking more than 24 hours ahead also creates exactly one reminder due 24 hours before the appointment.
- A booking exactly 24 hours ahead or less creates no reminder event.
- A failed or concurrently lost booking creates neither an appointment nor any notification event.
- The first valid confirmation creates one `appointment_confirmed` event in the same transaction.
- The first valid cancellation creates one `appointment_cancelled` event and suppresses its pending reminder in the same transaction.
- Repeated, concurrent, unauthorized, or invalid transitions create no duplicate event and do not partially change appointment or notification state.
- Legacy appointments without consented contact data continue to transition without notification events.

## 5. Reminder Eligibility and Time Boundaries

- An injected fake clinic-local clock proves reminders become due at the exact 24-hour boundary, not before it.
- Pending and confirmed appointments may produce their scheduled reminder.
- Cancelled appointments, suppressed reminders, future events, processed events, and legacy appointments are never previewed as reminders.
- Cancelling before processing prevents reminder output while preserving the outbox history.
- Processing after the appointment time does not generate a missing or late reminder.
- Timestamp comparison remains deterministic across application, command, test, local-file, and libSQL database paths.

## 6. Processor, Retry, and Concurrency

- `npm run notifications:process` uses the normal database configuration and processes due pending events by due timestamp and ID.
- Two concurrent processors preview each event at most once.
- A successful preview creates one HTML and one text file and marks the event processed with a timestamp.
- Re-running the command does not rewrite or duplicate processed previews.
- A simulated transport failure increments attempts, leaves the event retryable, records only a bounded safe diagnostic, and makes the command report failure.
- A later successful run processes the previously failed event exactly once.
- Operator output reports safe counts, kinds, and opaque identifiers but never a full recipient address, notification body, database URL, or secret.

## 7. Preview Content and Artifact Safety

- Each supported event renders understandable, escaped HTML and plain text containing the correct agent, therapist, event meaning, and clinic-local appointment time.
- Preview content contains no cookie, CSRF token, password, session data, staff email, SQL, filesystem path, database configuration, or authority-bearing mutation link.
- Preview filenames contain only opaque notification IDs and event kinds.
- `.agentclinic-notifications/` is ignored by Git, absent from committed fixtures and build output, and not staged after manual validation.
- Automated tests use synthetic example-domain addresses, temporary directories, and fake transports; they never use a real visitor address.

## 8. Security, Privacy, and Route Contracts

- Recipient email never appears in public confirmations, route parameters, request logs, exception text, branded errors, command summaries, or response headers.
- SQL remains parameterized and notification template values are escaped in HTML output.
- Existing anonymous booking, slot availability, concurrent booking, PRG, session, CSRF, exact-origin, role, ownership, and status rules remain enforced.
- Unauthorized therapist or staff status requests change neither appointment nor outbox state.
- GET, HEAD, and unsupported methods never create, process, retry, suppress, confirm, or cancel notification work.
- A transport or preview filesystem failure cannot roll back an already committed appointment; it affects only retryable outbox processing.

## 9. Accessibility and Browser Validation

At `375px x 812px` and `1280px x 800px`, Playwright must:

1. Open a public agent booking page and verify the slot, email, and consent controls have explicit labels and keyboard-visible focus.
2. Submit missing and malformed email values and missing consent, then verify accessible field-linked errors and retained safe input.
3. Complete a valid booking without client-side JavaScript and verify the existing `303` confirmation journey.
4. Verify the visitor email is absent from the confirmation URL, rendered confirmation, navigation, and browser-visible errors.
5. Confirm that forms, consent copy, errors, buttons, and existing navigation do not overlap, clip, or cause page-level horizontal scrolling.
6. Exercise staff confirmation and cancellation journeys and verify their established role, ownership, CSRF, origin, and redirect behavior remains intact.

## 10. Regression and Manual Evidence

- Existing health, catalogs, agent details, therapist schedules, public booking, appointment confirmations, staff dashboard, appointment status, therapist ownership, feedback, reviews, About, authentication, throttling, logging, and branded-error tests continue to pass.
- Existing local staff and therapist accounts continue to work without being modified or exposing their email addresses.
- No real provider package, API key, SMTP credential, cron endpoint, background service, or production deployment is required.
- Manually create isolated example appointments for each supported event, run `npm run notifications:process`, and inspect one HTML and one text preview per event kind.
- Manual evidence confirms correct wording, safe content, correct local appointment time, redacted command output, idempotent second execution, and ignored preview artifacts.
- No local database, `.env`, preview output, build artifact, Playwright report, credential, private address, or session material is staged.

## Definition of Done

- All automated migration, compatibility, booking, consent, outbox, event, reminder, retry, concurrency, route, security, accessibility, responsive, regression, and production requirements pass.
- Visitor booking and every specified appointment lifecycle event produce durable, idempotent notification work without slowing web requests or requiring a network provider.
- Local HTML and text previews demonstrate creation, confirmation, cancellation, and 24-hour reminder content without exposing sensitive data or entering Git.
- The feature contains no real email provider, therapist/staff notifications, multiple reminders, cron deployment, timezone conversion, marketing, or unrelated roadmap work.
