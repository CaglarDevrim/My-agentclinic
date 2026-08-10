# Appointment Status Management and Slot-Collision Requirements

## Context

Appointment status management and slot-collision enforcement is Phase 4 of the post-MVP roadmap. AgentClinic already accepts future appointment requests, persists them as `pending`, renders confirmations, and lists `pending` and `confirmed` appointments on the staff dashboard. This phase turns that read-only dashboard list into a minimal staff workflow and prevents a therapist's open slot from being booked twice.

The feature must preserve the existing Hono, TypeScript, server-rendered JSX, libSQL/SQLite, Post/Redirect/Get, JavaScript-optional, responsive, and accessible architecture. Authentication, therapist accounts, appointment durations, and timezone coordination remain deferred.

## Scope

This feature must:

- Let staff confirm or cancel appointments from the existing dashboard.
- Enforce the controlled transitions `pending -> confirmed`, `pending -> cancelled`, and `confirmed -> cancelled`.
- Treat `cancelled` as terminal and exclude it from open-appointment counts and management rows.
- Reject a new appointment when the same normalized therapist already has a `pending` or `confirmed` appointment at the exact requested date and time.
- Release a slot immediately when its occupying appointment becomes `cancelled`.
- Enforce collision safety at both the application and database boundaries, including concurrent requests.
- Add database, route, accessibility, responsive, and production-browser evidence for the complete workflow.

## Status Workflow

- The existing status values remain `pending`, `confirmed`, and `cancelled`; no new status is introduced.
- A `pending` row exposes Confirm and Cancel actions.
- A `confirmed` row exposes Cancel only.
- A successful state change uses a POST request followed by a `303` redirect to `/dashboard`.
- Repeating an action whose target state is already present is idempotent and follows the same redirect.
- Confirming a cancelled appointment is prohibited and returns a safe `409 Conflict` response without changing data.
- Invalid, malformed, or missing appointment identifiers return the established branded `404` response.
- GET and other unsupported methods cannot change appointment state.
- After cancellation, the appointment no longer appears in the open-appointments table and the open count decreases. Historical reporting is outside this phase.

## Route Contract

- `POST /dashboard/appointments/:appointmentId/confirm` confirms a pending appointment.
- `POST /dashboard/appointments/:appointmentId/cancel` cancels a pending or confirmed appointment.
- Both routes parse only positive safe-integer identifiers and perform conditional database updates rather than trusting form-supplied status values.
- Forms contain no editable appointment ID, target status, redirect URL, or other authority-bearing field.
- The dashboard remains usable without client-side JavaScript.

## Slot-Collision Contract

- A slot is the exact stored `scheduled_at` minute for one normalized therapist name; appointment duration and overlapping time ranges are not modeled.
- Therapist names are trimmed before persistence. Collision comparison ignores leading/trailing whitespace and ASCII letter case while preserving the trimmed display value.
- Only `pending` and `confirmed` appointments occupy slots. A `cancelled` appointment never blocks a new request.
- Appointments for different therapists may share the same date and time.
- Appointments for the same agent may share a time when their therapists differ; agent scheduling conflicts are outside this phase.
- The database adds an ordered migration with a partial unique index over normalized therapist name and `scheduled_at` for open statuses.
- The booking workflow performs a friendly pre-check, but database uniqueness is authoritative. A uniqueness failure caused by a race must be converted to the same accessible `422 Unprocessable Entity` form response rather than a `500`.
- On collision, no appointment is inserted, the submitted therapist, date, and time remain visible, and the form identifies that the therapist already has an appointment at that time.
- Existing appointment rows must be preserved. The migration must not silently cancel, delete, or rewrite existing records to resolve pre-existing duplicates.

## Dashboard Presentation

- Keep the existing Open appointments heading, count, ordering, and columns, and add an Actions column.
- Use normal server-rendered forms and buttons for state changes.
- Every action has an unambiguous accessible name that includes the action and appointment context.
- Status text remains visible and is not conveyed by color alone.
- Empty state `No open appointments.` spans the updated table correctly.
- Forms, buttons, status labels, and table/card transformations remain readable, keyboard operable, and free of horizontal page overflow at `375px` and `1280px` widths.

## Security, Privacy, and Reliability

- Status mutation is restricted to explicit POST routes and validated server-side.
- Appointment existence, current state, and transition eligibility are checked atomically at the persistence boundary.
- Collision enforcement must remain correct across multiple application processes sharing the database.
- Responses do not expose SQL, stack traces, filesystem paths, credentials, or database configuration.
- No new personal data is collected or rendered, and existing appointment values remain HTML-escaped by server-rendered JSX.
- The phase does not claim staff authorization: the existing dashboard and new actions remain unauthenticated until the dedicated authentication phase.

## Decisions

1. Use a controlled workflow: pending appointments may be confirmed or cancelled; confirmed appointments may be cancelled; cancelled appointments are terminal.
2. Consider the same therapist's `pending` and `confirmed` appointments at the exact same time to be collisions; cancelled appointments release the slot.
3. Normalize therapist identity for collision comparison by trimming and case-folding while retaining the submitted display casing.
4. Use application validation plus a partial database uniqueness constraint so concurrent requests cannot double-book a slot.
5. Return an accessible `422` booking form on collision and use Post/Redirect/Get for successful status mutations.
6. Require complete automated database, route, concurrent-request, mobile, desktop, accessibility, regression, and production validation.

## Out of Scope

- Authentication, staff roles, authorization, sessions, and CSRF-token infrastructure
- A completed status, reopening cancelled appointments, arbitrary status editing, or status-history/audit records
- Therapist accounts, canonical therapist IDs, availability calendars, schedules, capacity, rooms, or leave management
- Appointment durations, overlap detection, rescheduling, recurring appointments, waitlists, or agent-level collision rules
- Email, SMS, push notifications, and reminders
- Multi-site operation, timezone conversion, reporting, pagination, search, and historical appointment views
- Client-side JavaScript, optimistic updates, realtime synchronization, or new third-party dependencies

## Assumptions

- Existing appointment timestamps continue to use the local `YYYY-MM-DDTHH:mm` representation established by the MVP.
- Therapist names are free text, so case-insensitive trimmed text is the strongest available identity until therapist accounts are introduced.
- If an existing external database already contains duplicate open slots, migration must fail visibly for operator resolution rather than silently altering clinic data.
