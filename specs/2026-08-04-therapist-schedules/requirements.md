# Therapist Accounts and Schedules Requirements

## Context

Therapist accounts and schedules is Phase 6 of the post-MVP roadmap. AgentClinic already has individual staff accounts, protected dashboard workflows, exact-time appointment collision protection, and public appointment booking. Therapist identity is still stored as free text, every authenticated account has the same clinic-wide access, and visitors may request arbitrary therapist/date/time combinations.

This phase delivers a complete vertical workflow: an operator provisions a therapist account, the therapist signs in and opens individual future appointment slots, a visitor books one of those available slots, and the therapist manages only appointments assigned to that therapist. The feature must preserve the Hono, TypeScript, server-rendered JSX, libSQL/SQLite, Post/Redirect/Get, JavaScript-optional, responsive, and accessible architecture.

## Scope

This feature must:

- Add therapist identities linked to role-aware authenticated accounts.
- Preserve existing staff access and every existing appointment during migration.
- Let a therapist add and remove individual future availability slots.
- Replace free-text public appointment scheduling with a choice of currently available slots.
- Let therapists view, confirm, and cancel only their own appointments.
- Keep clinic staff access to the existing clinic-wide dashboard, review moderation, and all appointment actions.
- Enforce role, ownership, slot availability, and collision rules at both route and persistence boundaries.
- Add migration, provisioning, role, ownership, concurrency, accessibility, responsive, browser, and local-account evidence.

## Account and Therapist Model

- Add a `role` value to `staff_users` with supported values `staff` and `therapist`; existing rows and the existing `staff:create` command remain `staff` by default.
- Store therapist profiles separately from authentication records so legacy therapist names can exist without fabricated credentials.
- A therapist profile contains a stable numeric ID, normalized unique name, preserved display name, active state, optional unique `staff_user_id`, and creation timestamp.
- Every newly provisioned therapist account has role `therapist` and exactly one linked therapist profile. One account cannot own multiple profiles, and one profile cannot belong to multiple accounts.
- Extend authenticated identity and session lookup results with role and optional therapist ID. Authorization data is always reloaded from the database rather than trusted from cookies or form fields.
- Inactive accounts or therapist profiles authenticate no therapist workflow. Existing session expiry, revocation, cookie, throttle, and CSRF behavior remains unchanged.

## Provisioning

- Add `npm run therapist:create -- --email <email> --name <display-name>`.
- Read the password only from `AGENTCLINIC_THERAPIST_PASSWORD`; never accept it on the command line, print it, log it, or store it as plaintext.
- Reuse the existing staff email/name/password validation, normalization, versioned scrypt hashing, and database configuration.
- In one atomic operation, create a therapist-role account and either create a therapist profile or claim an unlinked legacy profile with the same normalized display name.
- Reject duplicate normalized email, an already linked therapist name, invalid input, or database failure without a partial account/profile write.
- Dashboard account creation, invitations, email delivery, password reset, and password-changing UI remain outside this phase.

## Migration and Compatibility

- Add ordered migrations after `010_staff_authentication.sql`, keeping schema/backfill changes separate from provisioning triggers so already-open development databases upgrade safely.
- Create a therapist profile for each distinct normalized `appointments.therapist_name`, preserving a deterministic display spelling and never deleting or rewriting an appointment.
- Add nullable `therapist_id` and `slot_id` references to appointments. Backfill `therapist_id` from normalized legacy names; legacy appointments retain a null `slot_id`.
- Keep `therapist_name` on appointments as the historical display snapshot used by existing confirmations and reports.
- Existing staff accounts default to role `staff`, existing sessions remain usable, and existing public confirmation URLs continue to work.
- Preserve the existing normalized therapist-name/open-time unique index for legacy compatibility and add authoritative uniqueness for new slot-based open appointments.
- A migration encountering data it cannot map safely fails visibly rather than deleting, cancelling, merging, or silently changing clinic records.

## Individual Slot Model

- A slot belongs to one therapist and stores one local `YYYY-MM-DDTHH:mm` future timestamp, active state, and creation timestamp.
- The same therapist cannot own two slots at the same timestamp. Different therapists may expose the same timestamp.
- A slot is bookable only when the therapist and slot are active, the timestamp is in the future, and no pending or confirmed appointment occupies it.
- A therapist may add a valid future slot only for their own profile.
- A therapist may remove only their own active, future, unoccupied slot. Removal deactivates the slot so historical references remain stable.
- A slot occupied by a pending or confirmed appointment returns `409 Conflict` when removal is attempted.
- Cancelling an appointment releases its slot for another booking while leaving the slot active.
- Appointment duration, ranges, overlaps, recurring rules, capacity greater than one, and timezone conversion are not modeled.

## Public Booking Contract

### `GET /agents/:agentId/appointments/new`

- Return the existing server-rendered booking page with a labelled required `slotId` control populated only with active future unoccupied slots.
- Each option identifies the therapist display name and local date/time without exposing account email, database internals, or inactive profiles.
- When no slot is available, render an accessible empty state and no enabled submission action.
- The page remains public and requires no client-side JavaScript.

### `POST /agents/:agentId/appointments`

- Accept exactly one positive safe-integer `slotId`; therapist name, date, time, role, therapist ID, and appointment status are not accepted as authority-bearing form fields.
- Missing, duplicated, malformed, inactive, past, or nonexistent slot values return an accessible `422 Unprocessable Entity` booking page without creating an appointment.
- A valid slot creates one pending appointment using the slot's therapist ID, timestamp, and current display name snapshot, followed by the existing `303` confirmation redirect.
- If another request books the slot first, the losing request receives the same accessible `422` unavailable-slot response and never a `500`.
- Cancelled appointments release the slot for a later booking. Pending and confirmed appointments occupy it.

## Authenticated Routes and Permissions

### Staff access

- `GET /dashboard` remains the clinic-wide staff landing page.
- `GET /dashboard/therapists` lists therapist profiles, linked-account state, active state, and upcoming slot summaries without rendering password data or session details.
- Staff retain access to review moderation and every existing appointment confirm/cancel action.
- Staff do not impersonate therapists and do not create or edit therapist slots in this phase.

### Therapist access

- An authenticated therapist requesting `/dashboard` is redirected with `303` to `/dashboard/schedule`.
- `GET /dashboard/schedule` shows only the signed-in therapist's active future slots, their available/occupied state, and controls permitted for each slot.
- `POST /dashboard/schedule/slots` creates one future slot for the signed-in therapist and redirects with `303` after success.
- `POST /dashboard/schedule/slots/:slotId/remove` deactivates an owned available slot and redirects with `303`; occupied slots return `409`.
- `GET /dashboard/appointments` lists only pending and confirmed appointments belonging to the signed-in therapist.
- Existing appointment confirm/cancel routes allow a therapist mutation only when the appointment belongs to their linked profile. Successful and idempotent transitions preserve the existing `303` behavior.

### Authorization behavior

- Anonymous dashboard requests preserve the existing login redirect, safe return path, no-store, CSRF, and exact same-origin contracts.
- A valid session with the wrong role receives a branded `403 Forbidden` when the route itself is role-restricted.
- A therapist requesting another therapist's slot or appointment by identifier receives `404 Not Found`, and authorization happens before revealing record state.
- Staff-only review moderation, therapist directory, and clinic-wide dashboard data are never rendered to therapist accounts.
- Login redirects staff to `/dashboard` and therapists to `/dashboard/schedule` when no safe permitted destination is supplied. A return path is accepted only when the authenticated role may access it.

## Navigation and Presentation

- Staff navigation retains Dashboard and exposes a discoverable Therapists link within the protected dashboard area.
- Therapist navigation exposes My schedule and My appointments; it does not expose review moderation or clinic-wide operational summaries.
- The authenticated header continues to show the safe display name and CSRF-protected logout control.
- Schedule forms use explicit labels, native date/time controls, accessible error summaries, contextual action names, visible state text, and keyboard-operable buttons.
- Available, occupied, inactive, pending, and confirmed meanings are not conveyed by color alone.
- Booking, schedule, therapist-directory, and therapist-appointment views remain usable without horizontal page overflow at `375px` and `1280px`.

## Security, Privacy, and Reliability

- All authenticated POST routes require a valid session, exact same-origin `Origin`, and the existing session-derived CSRF token.
- Role and ownership checks occur before protected reads or writes and are repeated at the persistence boundary for mutations.
- SQL remains parameterized, rendered user-controlled text remains JSX-escaped, and concurrency is resolved by database constraints rather than pre-checks alone.
- Public pages expose therapist display names and available times only; they never expose email addresses, account state, session data, or unavailable schedules.
- Logs and errors contain no password, cookie, session/CSRF token, password hash, private email, SQL, filesystem path, or database configuration.
- Automated tests use isolated in-memory or temporary databases; local or remote operator credentials are never committed.

## Decisions

1. Deliver the full staff-to-therapist-to-visitor vertical workflow in one phase.
2. Model availability as individual future slots rather than weekly recurrence or hybrid exceptions.
3. Use role-aware database sessions and linked therapist profiles while preserving existing staff accounts and sessions.
4. Backfill canonical therapist profiles from existing appointment names without rewriting historical display snapshots.
5. Require public booking through authoritative slot IDs and preserve collision safety under concurrency.
6. Require the complete automated merge gate plus a real local staff/therapist account smoke journey.

## Out of Scope

- Weekly recurring schedules, working-hour ranges, breaks, leave, date exceptions, bulk slot generation, or calendar import/export
- Appointment durations, overlap detection, rooms, resources, capacity, rescheduling, waitlists, or completed status
- Timezone conversion, multi-site operation, reporting, embedded maps, notifications, reminders, or email delivery
- Browser-based account creation, invitations, password reset/change, account recovery, MFA, OAuth, or therapist profile editing
- Therapists managing other therapists, review moderation, agent records, clinic summaries, or global schedules
- Client-side calendars, SPA state, realtime updates, optimistic UI, or new third-party dependencies

## Assumptions

- Operators can securely provide `AGENTCLINIC_THERAPIST_PASSWORD` when provisioning a therapist account.
- Existing therapist names are sufficiently stable to backfill profiles by trimmed case-insensitive comparison.
- Clinic-local timestamps remain adequate until the deferred timezone phase.
