# Therapist Accounts and Schedules Plan

## Task Group 1 - Roles, Therapist Profiles, and Migration

1. Add ordered migrations for `staff_users.role`, therapist profiles, individual therapist slots, appointment therapist/slot references, provisioning triggers, supporting indexes, foreign keys, and open-slot uniqueness.
2. Backfill therapist profiles from normalized legacy appointment names, connect existing appointments to those profiles, preserve display snapshots, and keep legacy appointments without fabricated slots or credentials.
3. Extend authentication, session, staff identity, and database projections with role and optional therapist ID while preserving existing account/session behavior.
4. Add typed therapist, slot, availability, ownership, and booking results so routes do not infer domain outcomes from SQL or user-visible strings.
5. Add database operations for listing therapist profiles, finding a linked therapist, and atomically creating or claiming a profile during account provisioning.

## Task Group 2 - Provisioning and Slot Domain

6. Add the `therapist:create` operator command using existing validation, scrypt hashing, database configuration, and `AGENTCLINIC_THERAPIST_PASSWORD`, with atomic account/profile creation and no secret output.
7. Implement strict local future-timestamp parsing and validation using the application's injected clock for deterministic tests.
8. Implement owned slot creation with therapist/timestamp uniqueness and typed duplicate or invalid-state outcomes.
9. Implement owned slot deactivation that returns not-found for non-ownership and conflict for pending/confirmed occupancy while preserving historical records.
10. Implement available-slot queries that return only active therapists, active future slots, and slots without an open appointment.
11. Implement atomic slot booking that derives therapist identity, timestamp, and display snapshot from the selected slot and converts concurrent uniqueness failures into a normal unavailable result.
12. Update cancellation behavior so a cancelled appointment releases its active slot while the existing transition and history contracts remain unchanged.

## Task Group 3 - Role Authorization and Protected Pages

13. Extend authenticated route context and layout/header inputs with role-aware navigation that never trusts role data from cookies or forms.
14. Add centralized helpers for staff-only routes, therapist-only routes, therapist ownership, role-safe login destinations, and branded `403` responses.
15. Keep `/dashboard` as the staff landing page and redirect authenticated therapists from it to `/dashboard/schedule` without exposing clinic-wide data.
16. Add the staff-only `/dashboard/therapists` page with profile, account-link, active, and upcoming-slot summaries.
17. Add `/dashboard/schedule` with owned future slots, available/occupied states, labelled add form, removable-slot controls, empty state, and conflict presentation.
18. Add `/dashboard/appointments` with only the signed-in therapist's open appointments and contextual confirm/cancel actions.
19. Restrict review moderation and clinic-wide dashboard routes to staff while retaining existing no-store, CSRF, origin, and redirect behavior.
20. Make appointment confirm/cancel operations accept authorization scope so staff may manage all appointments and therapists may manage only their own.

## Task Group 4 - Public Booking Workflow

21. Replace the free-text therapist/date/time booking form with a required server-rendered available-slot selector and accessible no-availability state.
22. Change appointment POST parsing to accept one positive `slotId`, reject duplicated or malformed values, and derive every booking property server-side.
23. Return accessible `422` responses for invalid, stale, inactive, past, occupied, or concurrently claimed slots without creating an appointment or exposing internal state.
24. Preserve the existing appointment confirmation route and historical therapist-name presentation after successful `303` Post/Redirect/Get booking.
25. Update schedule, therapist directory, booking, appointment, and authenticated navigation styles for semantic keyboard operation and overflow-free mobile/desktop layouts.

## Task Group 5 - Automated and Manual Validation

26. Add migration tests for fresh databases, Phase 5 upgrades, role defaults, deterministic therapist backfill, old appointment preservation, constraints, and idempotent migration execution.
27. Add provisioning/auth tests for therapist creation, legacy-profile claiming, duplicate rejection, secret hygiene, role-aware sessions, login destinations, and inactive states.
28. Add database/domain tests for slot validation, uniqueness, ownership, deactivation, occupancy, cancellation release, available-slot filtering, and file-backed persistence.
29. Add concurrent booking tests proving one pending appointment and one accessible unavailable result for the same slot.
30. Add route/security tests for every staff/therapist permission boundary, protected-record hiding, CSRF/origin enforcement, malformed inputs, status codes, PRG redirects, and unchanged public/staff behavior.
31. Add Playwright journeys at `375px x 812px` and `1280px x 800px` for therapist login, slot creation, public booking, therapist appointment management, cancellation/rebooking, keyboard use, focus, empty/error states, and horizontal-overflow prevention.
32. Run type checking, Vitest, Playwright, production compilation/smoke checks, dependency audit, whitespace validation, secret/artifact review, and clean Git checks.
33. Provision isolated real local staff and therapist accounts and manually verify role navigation, schedule creation, booking, ownership isolation, appointment actions, logout, and released-slot reuse without recording credentials.
