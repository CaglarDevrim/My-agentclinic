# Visitor Notifications and Reminders Requirements

## Context

Visitor notifications and reminders is Phase 7 of the AgentClinic roadmap. Phase 6 introduced therapist accounts, individual future slots, public slot booking, and role-scoped appointment management. Visitors can currently create appointments and revisit the existing browser confirmation, but the booking flow does not collect a contact address and no appointment event produces a notification.

This phase adds a provider-independent notification boundary for visitors. A visitor supplies a notification email and explicit consent while booking. Appointment creation, confirmation, cancellation, and one eligible 24-hour reminder produce durable, idempotent outbox records. Delivery uses a local preview adapter in this phase so the complete workflow can be implemented and verified without a third-party account, network access, or production deployment.

The feature must preserve the existing Hono, TypeScript, server-rendered JSX, libSQL/SQLite, Post/Redirect/Get, JavaScript-optional, responsive, accessible, role-aware, and slot-concurrency architecture.

## Scope

This feature must:

- Collect and validate a visitor notification email and explicit notification consent during public slot booking.
- Preserve every existing appointment and allow legacy appointments without notification details to continue working.
- Create durable visitor notifications for booking creation, confirmation, cancellation, and one eligible 24-hour reminder.
- Guarantee that each notification event is created and processed at most once per appointment.
- Process due notifications through an operator command and a local preview transport.
- Keep recipient addresses and generated notification artifacts out of public pages, request logs, error output, and Git.
- Add migration, domain, route, privacy, accessibility, responsive-browser, retry, and time-boundary evidence.

## Appointment Contact and Consent

- Add nullable notification email and consent timestamp fields to appointments so legacy records remain valid.
- New public bookings require exactly one email value and explicit consent before an appointment may be created.
- Normalize the email by trimming surrounding whitespace and lowercasing the domain while preserving the local part; enforce the existing application length limits plus a conservative maximum of 254 characters.
- Reject missing, duplicated, malformed, control-character, or overlong email values with an accessible `422 Unprocessable Entity` booking page.
- Reject missing, duplicated, or unexpected consent values with `422`; only the form's exact affirmative value is accepted.
- Store the validated address and consent timestamp as the appointment's notification snapshot. Later staff or therapist account changes do not change it.
- Do not add a public email-edit, unsubscribe, reschedule, or consent-withdrawal workflow in this phase.
- Never expose the notification email in a URL, public confirmation page, HTML data attribute, log message, or user-facing error.

## Notification Events

The supported event kinds are:

- `appointment_created`, produced atomically with a successful new booking.
- `appointment_confirmed`, produced atomically the first time an appointment transitions to confirmed.
- `appointment_cancelled`, produced atomically the first time an appointment transitions to cancelled.
- `appointment_reminder_24h`, scheduled atomically with a booking only when the appointment is more than 24 hours in the future.

Each event contains an immutable appointment reference, recipient snapshot, event kind, due timestamp, processing state, attempt count, creation timestamp, and optional processed timestamp. A unique database constraint on appointment and event kind is the authoritative duplicate guard.

- Creation, confirmation, and cancellation notifications are due immediately after their transaction commits.
- A reminder is due exactly 24 hours before the clinic-local appointment timestamp.
- Bookings made at or within 24 hours of the appointment do not create a late reminder; their creation notification is sufficient.
- Pending and confirmed appointments remain eligible for a due reminder.
- Cancelling an appointment suppresses its unprocessed reminder without deleting notification history.
- Repeated or concurrent status submissions preserve the existing idempotent appointment behavior and do not create duplicate events.
- Legacy appointments without a notification address never create notification events.

## Outbox and Processing Contract

- Add a `notification_outbox` table through the next ordered migration, with database checks for supported events, processing states, attempt counts, and required timestamps.
- Appointment writes and their corresponding outbox inserts occur in the same database transaction; neither side may commit alone.
- Add `npm run notifications:process` as the operator entry point for processing all currently due pending notifications.
- The command uses the same database configuration and injected clinic-local clock as the application.
- Claiming and completing a notification must be concurrency-safe. Two processors must not preview the same event twice.
- A successful preview marks the event processed with its processed timestamp.
- A transport failure increments the attempt count, records only a safe bounded diagnostic, leaves the event retryable, and causes the command to report failure without exposing recipient data or generated content.
- A later command run retries pending failed work but skips processed, future, suppressed, and ineligible reminder records.
- Processing order is deterministic by due timestamp and ID.
- The processor has a transport interface so a production provider can replace the preview adapter later without changing appointment or outbox domain logic.

## Local Preview Transport

- The Phase 7 transport writes one HTML preview and one plain-text preview per successfully processed notification beneath a local `.agentclinic-notifications/` directory.
- Preview filenames use only opaque notification identifiers and event kinds; they contain no email address, visitor input, session material, or database URL.
- The preview content identifies the event, agent, therapist, clinic-local appointment time, and safe visitor guidance. It does not include authentication cookies, CSRF tokens, database internals, staff email, or an authority-bearing mutation link.
- The directory is ignored by Git and absent from source archives, tests, and committed fixtures.
- Operator output reports totals, safe event kinds, and opaque IDs while redacting recipient addresses.
- Tests use an in-memory fake transport and temporary directories rather than the developer's real preview directory.

## Public Booking Contract

### `GET /agents/:agentId/appointments/new`

- Preserve the available-slot selector and add a labelled required email input plus a labelled required consent checkbox.
- Explain concisely that the address is used only for appointment notifications in this phase.
- Use appropriate native input attributes without relying on browser validation as the server-side authority.
- Preserve entered email and consent state on safe validation failures, except values containing unsafe control characters.
- Keep the no-availability state unchanged and do not collect notification details when submission is unavailable.

### `POST /agents/:agentId/appointments`

- Accept exactly one authoritative `slotId`, one notification email, and one exact affirmative consent value.
- Validate all fields before attempting the atomic slot booking and outbox write.
- A successful request creates one pending appointment, the immediate creation notification, and an eligible scheduled reminder, then returns the existing `303` confirmation redirect.
- Invalid notification input, an unavailable slot, or a concurrent booking loss returns an accessible `422` response and creates neither an appointment nor an outbox row.
- Client-supplied event kind, due time, processing state, recipient override, consent timestamp, appointment status, therapist identity, or schedule values are ignored and cannot become authority.

## Status Transitions

- Existing staff and therapist authorization, ownership, CSRF, same-origin, status, and redirect behavior remains authoritative.
- The first valid transition to confirmed atomically creates one immediate confirmation notification when the appointment has consented notification data.
- The first valid transition to cancelled atomically creates one immediate cancellation notification and suppresses any pending reminder.
- Repeating an already-completed transition remains idempotent and creates no additional notification.
- A failed or unauthorized transition changes neither the appointment nor notification state.

## Presentation and Accessibility

- The booking form retains one H1, logical landmarks, explicit labels, an accessible error summary, field-linked errors, visible keyboard focus, and understandable consent wording.
- Email and consent errors are understandable without color and do not reveal the rejected value in logs or branded server errors.
- Booking and confirmation pages remain usable without client-side JavaScript or page-level horizontal overflow at `375px` and `1280px`.
- Existing therapist schedule, therapist appointment, staff dashboard, and public confirmation layouts remain unchanged except where their status actions produce outbox events server-side.

## Security, Privacy, and Reliability

- SQL remains parameterized, user-controlled text remains JSX-escaped, and notification uniqueness is enforced by the database.
- Recipient addresses are treated as private data and never appear in request logs, public responses, route parameters, filenames, exception messages, or command summaries.
- Preview files are local sensitive artifacts and must never be staged or committed.
- Notification generation must not weaken existing slot collision, appointment ownership, session, CSRF, origin, or role checks.
- No request waits for notification rendering or filesystem delivery; public and protected routes commit durable outbox work only.
- Tests use synthetic example-domain addresses and isolated databases; no real visitor address, API key, or provider credential is committed.

## Decisions

1. Notify the visitor only; therapist and staff email notifications remain outside this phase.
2. Require a validated email and explicit affirmative consent for every new public booking.
3. Use a transactional outbox with one creation, confirmation, cancellation, and eligible 24-hour reminder event per appointment.
4. Process due work through an operator command with a local preview adapter; do not integrate a real email provider yet.
5. Do not create a reminder for appointments booked at or inside the 24-hour boundary.
6. Require the complete automated gate plus manual inspection of local HTML and text previews.

## Out of Scope

- Resend, SMTP, provider credentials, actual email delivery, webhooks, bounce handling, complaints, reputation, or delivery analytics
- Vercel Cron, public or protected cron endpoints, background workers, queues outside libSQL, or production scheduling
- Therapist/staff notifications, in-app inboxes, SMS, push notifications, WhatsApp, calendar files, or browser notifications
- Multiple reminder intervals, configurable templates, localization, marketing messages, campaigns, or bulk sends
- Email editing, unsubscribe pages, consent withdrawal, rescheduling, waitlists, recurring schedules, or timezone conversion
- Notification administration UI, manual resend UI, outbox browsing UI, or visitor accounts

## Assumptions

- Clinic-local timestamps remain authoritative until the deferred timezone phase.
- An operator or future scheduler can run `npm run notifications:process` frequently enough; production automation is intentionally deferred.
- Local previews provide implementation evidence but are not proof of real inbox delivery.
