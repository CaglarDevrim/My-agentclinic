# Timezone Coordination Requirements

## Context

Timezone Coordination is Phase 11 of the post-MVP roadmap and implements the final explicitly selected deferred item. AgentClinic currently stores therapist slots, appointments, and notification due times as timezone-free `YYYY-MM-DDTHH:mm` strings. Future-time checks, ordering, reminder scheduling, and report boundaries therefore depend on the Node process's local clock. Phase 10 added two site identities but intentionally left both on one implicit clinic-local clock.

This phase makes appointment timing independent of the server location while keeping the current server-rendered workflows understandable. Therapists schedule in the selected site's local time, the database gains canonical UTC instants, visitors receive a progressively enhanced browser-local equivalent, and staff reports use each site's calendar correctly. Existing IDs, URLs, local timestamp values, and appointment history must survive the upgrade.

The implementation must preserve Hono/TypeScript server rendering, libSQL/SQLite compatibility, versioned migrations, role-aware authorization, Post/Redirect/Get flows, privacy boundaries, accessible responsive presentation, and a useful no-JavaScript experience.

## Scope

This feature must:

- Add a validated IANA time-zone identifier to every clinic site.
- Store canonical UTC instants for therapist slots, appointments, and notification due times while retaining existing local timestamp columns for compatibility and human-readable site-local values.
- Backfill valid existing records deterministically without changing their IDs, relationships, local schedule text, statuses, recipients, event kinds, or processing states.
- Interpret therapist-entered schedule values in the selected site's time zone and reject daylight-saving gaps and overlaps rather than guessing.
- Use UTC for future checks, collision decisions, sorting, notification eligibility, due processing, and exact 24-hour reminder calculation.
- Show site-local time and its time zone throughout scheduling, booking, confirmations, protected appointment views, reports, CSV, and notification previews.
- Add a browser-local equivalent to visitor booking and confirmation through optional local progressive enhancement.
- Apply report calendar dates in the selected site or, for all sites, independently in every site's local calendar.
- Add migration, persistence, DST-boundary, server-time-zone independence, notification, reporting, accessibility, responsive, and production-browser evidence.

## Site Time-zone Contract

- Add `sites.time_zone` as a required IANA identifier with a bounded non-empty database value.
- Backfill both `context-window-clinic` and `token-harbor-clinic` to `America/Los_Angeles` because both established addresses are in California.
- Return `time_zone` in the typed `ClinicSite` projection and every site-aware schedule, appointment, notification, and report projection that formats a time.
- Site time zones remain fixed seed/catalog data. No public, therapist, staff, or operator workflow may edit them in this phase.
- Application startup must validate persisted site identifiers through the runtime's IANA implementation and fail visibly before serving requests when a configured identifier is unsupported.

## Canonical Timestamp and Migration Contract

- Add `scheduled_at_utc` to `therapist_slots` and `appointments`, and `scheduled_for_utc` to `notification_outbox`.
- Canonical UTC values use lexically sortable minute precision in exact `YYYY-MM-DDTHH:mmZ` form.
- Keep the existing `scheduled_at` and `scheduled_for` strings unchanged as compatibility/site-local snapshots; all instant comparisons and indexes move to the new UTC columns.
- Add database guards so new or updated rows cannot omit canonical fields. Appointment and linked slot UTC values must agree, just as their site identities agree.
- Preserve the therapist-wide collision rule at one instant across sites by enforcing uniqueness on `(therapist_id, scheduled_at_utc)`.
- Preserve the existing internal/legacy `createAppointment` helper contract used by isolated persistence tests: treat its timezone-free value as `context-window-clinic` local time, derive canonical UTC, and apply collision checks by instant without exposing this path as a new browser workflow.
- Migration 015 consists of an ordered SQL schema migration plus a named TypeScript data hook executed by the migration runner in the same write transaction. The migration filename is recorded only after schema changes, backfill, consistency checks, and index/trigger installation all succeed.
- Backfill local slot and appointment timestamps using their canonical site's IANA zone. A repeated autumn clock time maps to the earlier matching UTC instant. A nonexistent spring-forward time, invalid syntax, unsupported site zone, or mismatched linked record aborts the migration without recording it or partially changing data.
- Backfill immediate outbox events by interpreting their existing due value in the appointment site's zone. Backfill a reminder from its appointment's canonical UTC instant minus exactly 24 hours, while leaving its existing local `scheduled_for` snapshot unchanged.
- Continue supporting fresh, upgraded, repeated, in-memory, temporary-file, and remote libSQL-compatible database setup.

## Time Conversion Boundary

- Add a dependency-free domain module built on `Intl.DateTimeFormat` for IANA validation, local-wall-time resolution, UTC serialization, UTC-to-site formatting, and local-calendar report boundaries.
- Accept therapist input only as the existing exact minute-precision local value plus the authoritative selected site ID. Never accept a client-provided UTC instant, offset, time zone, or formatted label as authority.
- A local value with no matching instant because of a daylight-saving gap returns an accessible `422` error.
- A local value with two matching instants because of a daylight-saving overlap returns an accessible `422` error directing the therapist to choose another time; no offset-choice UI is added.
- A successful conversion must round-trip to the same local year, month, day, hour, and minute in the selected IANA zone.
- The injected `Date` used by routes and commands represents an absolute instant. Server-local getters must not participate in appointment, report, or notification decisions.

## Scheduling, Booking, and Appointment Views

### Therapist schedule

- `GET /dashboard/schedule` labels the local input with the selected site's time-zone context and lists every slot with site-local time plus a visible IANA zone.
- `POST /dashboard/schedule/slots` validates site and local time together, derives the UTC instant server-side, and persists both representations atomically.
- Validation retains safe site/time values, links the error to the time control, and creates no slot on malformed, nonexistent, ambiguous, past, or duplicate instants.
- Future-time validation compares the derived UTC instant strictly against the injected current instant.
- Removing a future slot and therapist-wide collision enforcement use canonical UTC, independent of the process `TZ` setting.

### Public booking and confirmation

- Available-slot queries compare and order by UTC but display the site's local timestamp and IANA zone.
- Booking continues to accept only the authoritative `slotId` and notification inputs. The appointment copies local time, UTC instant, site, and therapist identity from the slot atomically.
- Public slot options include trusted UTC metadata for progressive enhancement but no email, internal database configuration, session value, or mutation authority.
- With JavaScript enabled, each slot option adds a concise browser-local equivalent derived from its UTC value. Without JavaScript, the complete site-local label and booking workflow remain usable.
- The appointment confirmation shows site-local time and IANA zone server-side and adds the visitor's browser-local equivalent when available.
- Staff and therapist appointment tables show site-local time and IANA zone; no browser-local conversion is applied to protected operational pages.

## Notifications and Reminders

- Creation, confirmation, and cancellation events are due at the current UTC minute and write matching canonical due values atomically with the appointment change.
- A reminder is created only when the appointment instant is more than 24 hours after the booking instant and is scheduled at appointment UTC minus exactly 24 hours.
- Due ordering, claiming, stale-reminder suppression, retry, and eligibility comparisons use `scheduled_for_utc` and appointment `scheduled_at_utc`.
- Notification text and HTML show the appointment's site-local time, IANA zone, site name, and address; they also include the canonical UTC time for an unambiguous portable reference.
- The transport still has no knowledge of the recipient's browser time zone. No location inference, tracking, or recipient time-zone field is introduced.
- Existing outbox uniqueness, recipient privacy, state transitions, retry behavior, and local preview storage remain unchanged.

## Reporting and CSV

- `from` and `to` remain exact inclusive calendar dates and retain the 366-day limit.
- A selected-site report converts its local start-of-day and next-day-exclusive boundary to UTC using that site's IANA zone.
- An all-sites report applies the same requested local calendar dates independently to every active site's time zone, then combines each site's matching appointment population exactly once.
- Default report dates use the `America/Los_Angeles` calendar shared by the two current sites, not the Node process's local calendar.
- Totals, therapist workload, agent demand, HTML results, and CSV must use the same normalized per-site UTC boundaries.
- Change the exact CSV columns to `Scheduled at`, `Time zone`, `Scheduled at UTC`, `Agent`, `Therapist`, `Site`, and `Status`.
- `Scheduled at` remains the site-local minute value, `Time zone` is the trusted IANA identifier, and `Scheduled at UTC` is the canonical minute value. Existing privacy, formula protection, quoting, ordering, UTF-8, CRLF, HEAD, and safe filename contracts remain in force.

## Accessibility, Privacy, Security, and Responsive Behavior

- Time-zone meaning must be visible in text and cannot depend on color, abbreviations alone, hover, map availability, or JavaScript.
- Browser-local enhancements use the browser's current locale and time zone, have a stable site-local fallback, do not rewrite authority-bearing values, and do not make network requests or persist location information.
- Updated options, hints, error summaries, tables, confirmation details, notification previews, and report controls remain keyboard-accessible and understandable with assistive technology.
- Long IANA identifiers and date labels wrap without clipping or page-level horizontal overflow at `375px` and `1280px`.
- Request-derived dates, IDs, and query values remain strictly validated before parameterized SQL; rendered text remains JSX-escaped.
- No browser time zone, UTC value, offset, or display label grants authority or changes authentication, authorization, ownership, CSRF, origin, or notification-consent rules.

## Decisions

1. Deliver the full therapist-to-visitor-to-staff timezone experience, including optional visitor browser-local display.
2. Use site IANA zones plus canonical UTC columns while preserving existing local timestamp columns for compatibility.
3. Reject new ambiguous and nonexistent therapist inputs; deterministically choose the earlier instant only for valid ambiguous legacy data.
4. Use exact UTC arithmetic for reminders and instant comparisons, independent of server `TZ`.
5. Interpret all-sites report dates in each site's local calendar rather than inventing an organization-wide zone for future sites.
6. Require a complete UTC/DST and cross-server-time-zone validation matrix before merge.

## Out of Scope

- Site or user time-zone management UI, automatic site-zone discovery, geolocation, or browser-zone persistence
- An overlap-offset chooser, appointment rescheduling, recurring schedules, calendar files, or locale/language selection
- Changing the two existing fictional site addresses, adding another site, or changing role/site permissions
- Real notification providers, recipient-zone inference, recipient preference storage, or localized notification delivery
- Rewriting IDs, public URLs, appointment history, local timestamp snapshots, or unrelated audit/session timestamps
- Adding Temporal/polyfill/date libraries or another runtime service

## Assumptions

- Both existing sites legitimately use `America/Los_Angeles`; the data model and tests will still prove behavior with a synthetic second IANA zone.
- The deployed Node runtime includes full `Intl.DateTimeFormat` IANA data for configured sites.
- Minute precision remains sufficient; seconds and milliseconds are intentionally excluded from appointment and notification due-time storage.
- Existing data contains no nonexistent spring-forward local appointment. If it does, visible migration failure is safer than silently changing the scheduled wall time.
