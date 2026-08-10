# Therapist Accounts and Schedules Validation

All required checks must pass before `phase-6-therapist-schedules` can be merged.

## 1. Complete Automated Gate

Run:

```sh
npm run validate
npm audit --audit-level=moderate
git diff --check
```

Success requires zero typecheck, migration, provisioning, role, ownership, slot, booking, concurrency, route, authorization, security, responsive-browser, production-build, dependency-audit, secret, artifact, or whitespace failures.

## 2. Migration and Compatibility

- A fresh database applies every migration in order and contains role-aware staff accounts, therapist profiles, therapist slots, and nullable appointment therapist/slot references.
- An existing Phase 5 database upgrades without deleting or modifying the status, agent, therapist display snapshot, timestamp, or ID of any appointment.
- Existing accounts receive role `staff`; their valid sessions continue to authenticate and retain clinic-wide access.
- Distinct trimmed case-insensitive legacy therapist names produce one therapist profile each, and the matching appointments receive the correct `therapist_id`.
- Legacy appointments retain null `slot_id` and continue to render through existing confirmation and dashboard paths.
- Repeated migration execution does not duplicate profiles, links, slots, or appointment changes.
- Therapist account/profile links, normalized names, therapist timestamps, and open slot occupancy have the specified uniqueness and foreign-key constraints.
- Unsafe or ambiguous legacy data fails migration visibly and is never silently deleted, cancelled, merged, or assigned fabricated credentials.

## 3. Provisioning and Authentication

- `npm run therapist:create -- --email <email> --name <display-name>` creates one active therapist-role account and one linked profile.
- The command reads only `AGENTCLINIC_THERAPIST_PASSWORD`, applies the existing 12-128 character rule and versioned scrypt parameters, and prints no password or hash.
- A matching normalized unlinked legacy profile is claimed rather than duplicated.
- Duplicate email variants, already linked names, invalid names, invalid passwords, missing arguments, and database failures leave no partial account or profile.
- Staff credentials still create staff-role sessions; therapist credentials create sessions containing the database-derived therapist role and profile ID.
- Revoked, expired, inactive-account, inactive-profile, malformed, or unknown sessions authenticate no therapist workflow.
- Login with no permitted return path redirects staff to `/dashboard` and therapists to `/dashboard/schedule`.
- Role data never appears in the session cookie and changing database authorization takes effect on the next authenticated request.

## 4. Slot Persistence and Scheduling

- A therapist can create a slot for their own profile at a real future local `YYYY-MM-DDTHH:mm` timestamp.
- Missing, duplicated, malformed, impossible-calendar, current, or past timestamps return `422` and create no slot.
- The same therapist and timestamp cannot produce two active slot records; another therapist may use the same timestamp.
- `GET /dashboard/schedule` returns only the signed-in therapist's future slots and correctly labels available and occupied states.
- Removing an owned active future unoccupied slot returns `303`, makes it unavailable publicly, and preserves the database row as inactive.
- Removing a pending/confirmed occupied slot returns `409` and changes neither the slot nor appointment.
- Missing, malformed, inactive, past, or another therapist's slot returns `404` without revealing ownership or state.
- Closing and reopening a file-backed database preserves profiles, slots, links, appointment assignments, and availability state.

## 5. Public Booking Boundary

- `GET /agents/:agentId/appointments/new` lists only active future unoccupied slots for active therapists.
- Each option contains a safe therapist display name and understandable local date/time; it contains no email, account status, session data, or internal authority field.
- With no available slots, the page renders an accessible empty state and no enabled booking action.
- A POST containing exactly one valid available `slotId` creates one pending appointment, copies therapist ID/name and slot timestamp server-side, and redirects with `303` to the existing confirmation route.
- Missing, duplicated, non-string, zero, negative, decimal, unsafe, unknown, inactive, past, or occupied slot values return an accessible `422` page and create no appointment.
- Client-supplied therapist name, therapist ID, date, time, role, or status cannot override slot-derived values.
- Two concurrent requests for the same slot create exactly one pending appointment; the loser receives the normal `422` unavailable response, never `500`.
- Pending and confirmed appointments occupy a slot. Cancelling releases it, and a later valid request can book it again.
- Confirmation pages for both legacy and slot-based appointments continue to render the correct safe therapist snapshot.

## 6. Roles, Ownership, and Route Contracts

- Anonymous dashboard requests retain the existing `303` login redirect, safe return path, no-store, CSRF, cookie, and same-origin contracts.
- Staff receive `200` for `/dashboard`, `/dashboard/therapists`, and `/dashboard/reviews` and retain authority over every clinic appointment.
- Therapists requesting `/dashboard` receive `303` to `/dashboard/schedule` before clinic-wide data is queried or rendered.
- Therapists receive `200` for their own `/dashboard/schedule` and `/dashboard/appointments` views.
- Therapists receive branded `403` responses for `/dashboard/therapists`, `/dashboard/reviews`, and other staff-only workflows.
- A therapist appointment list contains only appointments linked to that therapist and excludes other therapist names, agents, IDs, and counts.
- Therapist confirm/cancel actions succeed or remain idempotent only for owned appointments and preserve existing `303` status-transition behavior.
- Another therapist's slot or appointment identifier returns `404`, performs no mutation, and reveals no record state.
- Every authenticated mutation rejects missing, duplicated, malformed, or mismatched CSRF and missing/cross-origin/deceptive Origin with `403` and zero database writes.
- GET, HEAD, and unsupported methods never create slots, remove slots, confirm appointments, or cancel appointments.

## 7. Presentation, Accessibility, and Privacy

- Schedule, therapist-directory, booking, and therapist-appointment pages each have one H1, logical landmarks/headings, explicit labels, understandable errors, and visible keyboard focus.
- Slot and appointment actions have contextual accessible names identifying the intended operation and relevant date/appointment context.
- Available, occupied, inactive, pending, confirmed, and conflict states remain understandable without relying on color.
- User-controlled names are JSX-escaped in options, tables, confirmations, headings, action labels, and errors.
- Public pages expose only therapist display names and available times; private emails and account-link details remain protected.
- Staff and therapist navigation expose only permitted destinations while the authenticated display name and POST logout remain usable.
- At `375px`, forms, selectors, schedule rows/cards, tables, buttons, and errors do not overlap, clip, or cause page-level horizontal scrolling.
- At `1280px`, established content width, table alignment, hierarchy, and action grouping remain consistent.

## 8. Browser Validation

At `375px x 812px` and `1280px x 800px`, Playwright must:

1. Sign in as an isolated therapist account and verify the role-safe `/dashboard/schedule` landing page.
2. Add a future individual slot and verify its available state, semantic form behavior, focus, and absence of horizontal overflow.
3. Sign out, open a public agent booking form, select that slot, book it, and verify the existing confirmation page.
4. Sign back in as the therapist, verify only the owned appointment is visible, and confirm it through a valid CSRF-protected form.
5. Verify the occupied slot cannot be removed, cancel the appointment, and confirm the slot becomes available again.
6. Rebook the released slot and verify a concurrent/stale second submission receives the accessible unavailable response.
7. Attempt staff-only navigation and another therapist's protected identifiers and verify the required `403` or `404` without leaked content.
8. Exercise the journey by keyboard with visible focus and verify responsive navigation, logout, empty states, errors, and no page-level horizontal overflow.

## 9. Regression, Production, and Manual Evidence

- Existing health, public navigation, catalogs, agent details, appointment confirmations, staff dashboard, appointment status, feedback, reviews, About, login/logout, throttling, CSRF, traversal, logging, and branded-error tests continue to pass.
- Existing staff accounts and the `staff:create` command keep their behavior and do not unexpectedly become therapist accounts.
- The compiled server copies and applies the migration, supports local file and Turso configuration, starts without default credentials, and enforces identical role/slot behavior.
- Request logs and branded errors contain no password, email form value, cookie, token, hash, SQL, filesystem path, or configuration secret.
- No local database, `.env`, build output, Playwright report, credential, session artifact, or provisioning secret is staged.
- After automation passes, provision one real local therapist account without exposing its password; retain the existing real local staff account.
- Manually verify staff login and clinic-wide access, therapist login and restricted navigation, slot creation, public booking, therapist-owned appointment management, cross-therapist isolation, logout, and released-slot reuse.
- Manual evidence records outcomes only, never credentials or session material, and does not require Turso or production deployment.

## Definition of Done

- Every automated migration, compatibility, provisioning, authentication, role, ownership, slot, booking, concurrency, route, security, accessibility, responsive, regression, and production requirement passes.
- The complete operator-to-therapist-to-visitor workflow works without client-side JavaScript at both required viewports.
- Existing staff and appointment data remain usable, therapists cannot access clinic-wide or other-therapist data, and public bookings can use only authoritative available slots.
- The real local account smoke journey passes without committing credentials or local database artifacts.
- The feature branch contains no recurrence, timezone, notification, reporting, password-recovery, multi-site, or unrelated roadmap work.
