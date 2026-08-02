# Appointment Status Management and Slot-Collision Validation

All required checks must pass before `phase-4-appointment-management` can be merged.

## 1. Complete Automated Gate

Run:

```sh
npm run validate
npm audit --audit-level=moderate
git diff --check
```

Success requires zero typecheck, unit, route, database, concurrency, browser, production-build, dependency-audit, or whitespace failures.

## 2. Migration and Persistence

- A fresh database applies all migrations in order and retains the existing deterministic seeds.
- An existing compatible file-backed database upgrades without losing or rewriting appointments.
- The new partial unique index covers normalized therapist name and exact `scheduled_at` only where status is `pending` or `confirmed`.
- The same normalized therapist and timestamp cannot have two open appointments.
- `Dr Ada`, ` dr ada `, and `DR ADA` collide at the same timestamp after trimming and case-folding.
- Different therapists may use the same timestamp, and the same therapist may use different timestamps.
- A cancelled record does not occupy its former slot; a new pending appointment can use it.
- A database containing pre-existing duplicate open slots fails migration visibly and does not silently delete, cancel, or modify those rows.
- Closing and reopening a file-backed database preserves statuses and collision enforcement.

## 3. Status Transition Contract

- `POST /dashboard/appointments/:appointmentId/confirm` changes `pending` to `confirmed` and redirects to `/dashboard` with `303`.
- Repeating confirm on an already confirmed appointment is idempotent and returns the same redirect without other mutation.
- `POST /dashboard/appointments/:appointmentId/cancel` changes either `pending` or `confirmed` to `cancelled` and redirects with `303`.
- Repeating cancel on an already cancelled appointment is idempotent and returns the same redirect.
- Confirming a cancelled appointment returns `409`, preserves `cancelled`, and renders a safe accessible explanation.
- Malformed, zero, negative, unsafe, or missing appointment IDs return the branded `404` response.
- GET requests to mutation paths do not change state and follow existing not-found behavior.
- No route accepts a form-supplied target status or performs an unrestricted status update.

## 4. Dashboard Workflow

- Pending rows display Confirm and Cancel actions; confirmed rows display Cancel only.
- Action labels identify both the operation and enough appointment context to be understandable to assistive technology.
- After confirmation, the row remains open, displays Confirmed, and no longer offers Confirm.
- After cancellation, the row disappears from Open appointments and the open count decreases by one.
- When no open appointments remain, the existing `No open appointments.` state renders across every table column.
- Status remains readable independently of color, and all controls work without client-side JavaScript.

## 5. Booking Collision Boundary

- A valid unused slot still creates one pending appointment and redirects to its confirmation route with `303`.
- A duplicate open slot returns `422`, creates no row, and preserves therapist, date, and time values.
- The response associates an understandable conflict message with the booking form and moves error-summary focus according to the existing validation pattern.
- An existing cancelled appointment at the same normalized therapist and time does not cause an error.
- An existing appointment for another therapist at the same time does not cause an error.
- Invalid therapist, date, time, real-calendar, and future-time validation continues to run before persistence.
- HTML-significant therapist input remains escaped in forms, dashboard rows, and confirmation pages.
- Two concurrent valid requests for the same normalized therapist and exact timestamp produce exactly one stored appointment; the other request returns the normal `422` collision response, never `500`.

## 6. Accessibility and Responsive Behavior

- Dashboard and conflict responses retain a single H1, logical headings, landmarks, table headers, labels, and visible keyboard focus.
- Status controls are native keyboard-operable forms and buttons with usable target sizes.
- Error meaning does not depend on color alone and is announced through the existing accessible error-summary/field-error structure.
- At `375px`, action controls wrap without overlap, clipping, or document-level horizontal scrolling.
- At `1280px`, the table, status, and action controls remain aligned within the established content width.

## 7. Browser Validation

At `375px x 812px` and `1280px x 800px`, Playwright must:

1. Open `/dashboard`, identify a pending appointment, and verify its Confirm and Cancel actions.
2. Confirm it, follow the PRG redirect, and verify the Confirmed status and absence of the Confirm action.
3. Cancel it, follow the redirect, and verify its removal and the decremented open count.
4. Book a new appointment in the released therapist slot and verify successful confirmation.
5. Attempt the same normalized therapist and slot again and verify the preserved form values and accessible collision error.
6. Complete the action and error journeys with keyboard-operable controls and visible focus.
7. Confirm there is no page-level horizontal overflow at either viewport.

## 8. Regression, Security, and Production Smoke

- Existing health, home, catalog, detail, appointment confirmation, dashboard summary, feedback, moderation, reviews, About, static-asset, logging, traversal, and branded-error tests continue to pass.
- Production build copies and applies the new migration, and the compiled server exposes the same status and collision behavior as the importable test app.
- Responses expose no SQL text, stack traces, filesystem paths, credentials, auth tokens, or database configuration.
- No authentication claim, therapist-account behavior, notification workflow, duration/overlap rule, timezone conversion, or new dependency is introduced.
- No local database, generated build output, Playwright report, secret, or environment file is staged.

## Definition of Done

- Every automated migration, status, collision, concurrency, route, browser, accessibility, responsive, security, regression, and production check above passes.
- The implementation contains only the selected controlled status workflow and exact-slot therapist collision rule.
- Cancelled appointments release their slots, and concurrent requests cannot double-book an open slot.
- The feature branch contains no unrelated product expansion or generated/local artifacts.
