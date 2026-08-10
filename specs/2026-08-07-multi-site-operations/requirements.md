# Multi-site Operations Requirements

## Context

Multi-site Operations is Phase 10 of the post-MVP roadmap and advances the first remaining explicitly selected deferred item. AgentClinic currently operates as one implicit clinic: therapist slots and appointments have no location identity, staff dashboards and reports aggregate the whole clinic, visitor notifications omit a location, and the About page presents one fictional address.

This phase delivers one complete multi-site workflow. A therapist opens a slot at a selected clinic site, a visitor books that authoritative slot with its site details, staff inspect operations by site, and the same site identity appears in confirmations, notifications, reports, CSV exports, and public location information. Existing clinic data must upgrade without loss.

The implementation must preserve the server-rendered Hono/TypeScript architecture, libSQL/SQLite compatibility, role-aware authorization, Post/Redirect/Get flows, privacy-preserving map activation, accessible responsive presentation, and JavaScript-independent core workflows.

## Scope

This feature must:

- Add a normalized catalog containing two fixed active fictional clinic sites.
- Associate every therapist slot and appointment with exactly one site after migration.
- Backfill every existing slot and appointment to the existing San Francisco site without changing IDs, times, statuses, therapist snapshots, notification contacts, or outbox history.
- Let therapists select any active site when opening a future slot and display site details throughout their schedule and appointment views.
- Show site name and address in public slot selection, appointment confirmation, and visitor notification previews.
- Let staff filter open dashboard appointments and operational reports by site while retaining an all-sites view.
- Expand the About page to present both sites with independently consented OpenStreetMap embeds.
- Add migration, persistence, collision, filter, authorization, privacy, accessibility, responsive, and full production-browser evidence.

## Site Catalog

Create a `sites` table with:

- stable numeric `id`;
- unique lowercase kebab-case `slug`;
- unique display `name`;
- visible single-line `address`;
- `is_active` constrained to `0` or `1`;
- `created_at` timestamp.

The ordered migration creates these deterministic active records:

1. `context-window-clinic` — `Context Window Clinic` — `42 Context Window Way, San Francisco, CA 94107`
2. `token-harbor-clinic` — `Token Harbor Clinic` — `88 Token Harbor Drive, Oakland, CA 94607`

Site records are read-only application data in this phase. No browser or operator management command may create, edit, deactivate, delete, or reorder them.

## Migration and Compatibility

- Add one ordered migration after `013_visitor_notifications.sql`.
- Add site references to `therapist_slots` and `appointments`, backfill all existing records to `context-window-clinic`, and enforce a required valid site for all future inserts and site changes.
- Use SQLite-compatible constraints or triggers where an in-place `ALTER TABLE` cannot add the final non-null/reference contract safely.
- Existing appointments with a slot and existing legacy appointments without a slot both receive the default site.
- For every appointment linked to a slot, migration must leave the appointment and slot on the same site.
- Preserve the existing therapist-wide `UNIQUE (therapist_id, scheduled_at)` rule. A therapist cannot open the same instant at two sites; different therapists may open the same instant at the same or different sites.
- Preserve appointment slot occupancy uniqueness, cancellation release, notification-event uniqueness, staff sessions, and every historical/public appointment URL.
- Fresh, upgraded, repeated-migration, in-memory, temporary-file, and remote libSQL-compatible paths must behave consistently.
- Any unmappable or internally inconsistent row makes migration fail visibly rather than guessing, deleting, or partially changing records.

## Typed Data Contract

- Add a `ClinicSite` type containing site ID, slug, name, address, and active state.
- Extend `AvailableSlot`, `TherapistSlot`, and `AppointmentRecord` projections with authoritative site ID, slug, name, and address.
- Extend notification delivery projections with site name and address.
- Extend report appointment rows with site name and report results with the selected site filter.
- Never accept a site name, address, slug, or appointment `siteId` from public booking as an authority-bearing value; public booking derives all location data from the selected slot.

## Therapist Schedule Workflow

### `GET /dashboard/schedule`

- List active sites for the signed-in therapist's slot form.
- Add a labelled required site selector before the existing local future date/time input.
- Display site name and address for each existing slot alongside scheduled time and availability state.
- Preserve ownership: therapists see only their own slots across all sites.

### `POST /dashboard/schedule/slots`

- Accept exactly one positive safe-integer `siteId` and one existing `scheduledAt` value.
- Reject missing, duplicated, malformed, unknown, or inactive site input with an accessible `422` page and no slot.
- Retain safe submitted values and associate errors with the site or time control.
- Create the slot only for the authenticated therapist and selected active site.
- Keep the existing future-time validation, PRG success redirect, CSRF, exact-origin, no-store, ownership, and duplicate-time behavior.
- A duplicate therapist/timestamp returns the established validation outcome even if the submitted site differs, preventing cross-site double booking.

## Public Booking and Confirmation

- `GET /agents/:agentId/appointments/new` continues to list only active, future, unoccupied slots from active therapists and active sites.
- Each option identifies therapist, clinic-local date/time, site name, and site address.
- `POST /agents/:agentId/appointments` continues to accept only `slotId` plus the existing optional notification contact/consent fields.
- A successful booking atomically copies the slot's site ID into the appointment alongside its therapist and timestamp authority.
- Stale, inactive-site, occupied, malformed, or concurrently claimed slots return the existing accessible `422` unavailable result without creating an appointment or notification event.
- Confirmation pages show site name and address independently of email consent.
- Cancellation and later rebooking retain the slot's original site.

## Staff Dashboard Filtering

### `GET /dashboard`

- Accept an optional single `site` query parameter containing an active site slug.
- When absent, show `All sites`; when valid, filter the open-appointments count and open-appointments table to that site.
- Total agents, active ailments, and pending reviews remain clinic-wide and are visibly labelled or described as such.
- Provide a labelled GET site selector with `All sites`, `Context Window Clinic`, and `Token Harbor Clinic` options.
- Missing-by-design, unknown, empty, duplicated, overlong, or malformed site filters return an accessible `422` staff page and query no filtered appointment dataset.
- Appointment rows display site name and address in both all-sites and filtered views.
- Filtering is read-only and requires no CSRF token; authentication, staff-only authorization, no-store, and therapist isolation remain unchanged.

## Reporting and CSV Filtering

### `GET /dashboard/reports`

- Extend the existing report form with an optional site selector using the same active-site slug contract as the dashboard.
- Date range and site validation are independent but returned together in one accessible error summary.
- With no site parameter, aggregate all sites. With a valid slug, every total, therapist workload row, agent demand row, and CSV link uses only that site's appointment population.
- The selected report-period description identifies `All sites` or the selected site name.

### `GET /dashboard/reports.csv`

- Apply the exact normalized date and site filters used by the HTML report.
- Change the exact columns to `Scheduled at`, `Agent`, `Therapist`, `Site`, and `Status`.
- Use the site display name in each row and retain existing deterministic ordering, UTF-8, CRLF, RFC 4180 quoting, and spreadsheet-formula protection.
- Generate `agentclinic-appointments-<from>-to-<to>-<site-slug>.csv` or `agentclinic-appointments-<from>-to-<to>-all-sites.csv`.
- Keep IDs, addresses, notification contacts, consent data, account data, sessions, and tokens out of the export.
- Invalid site input returns the existing bounded plain-text `422` behavior and no partial CSV.

## Notifications

- Appointment-created, confirmed, cancelled, and 24-hour reminder preview deliveries include the appointment's site name and address in both text and HTML bodies.
- Notification outbox rows continue to reference only the appointment; site data is resolved through the appointment at delivery time.
- No new recipient, consent, provider, retry, scheduling, or idempotency behavior is introduced.
- Site data must not enter logs, recipient addresses, URLs, event kinds, or uniqueness keys.

## Public About Locations and Maps

- `/about` replaces the single location presentation with two semantic location cards in deterministic site order.
- Each card shows the exact fictional site name and address, an accessible OpenStreetMap search link, privacy disclosure, and its own `Load interactive OpenStreetMap map` control.
- Use fixed HTTPS OpenStreetMap URLs keyed by trusted site slug. The Oakland demonstration marker is centered at `37.8044, -122.2712`; the San Francisco marker remains `37.7765, -122.3950`.
- No provider request occurs before activation. Activating one card creates one iframe only for that site and makes no request for the other site.
- Consent remains page-view-only and is not shared between cards or persisted.
- With JavaScript disabled or provider requests blocked, both names, addresses, and external links remain visible and usable.

## Accessibility, Security, and Responsive Behavior

- Site selectors use visible labels, hints, retained selection, associated errors, and keyboard-visible focus.
- Site identity never depends on color, map availability, or layout alone.
- Tables and mobile labelled rows include understandable site headings; long names and addresses wrap without clipping.
- All affected workflows remain usable without page-level horizontal overflow at `375px` and `1280px`.
- Every request-derived ID or slug is strictly validated before parameterized SQL; JSX continues to escape rendered data.
- Staff and therapist roles remain database-derived. Multi-site support grants no new role, impersonation, or cross-therapist access.
- Public output exposes only fixed site display information plus existing therapist availability; it exposes no emails, sessions, CSRF tokens, notification contacts, or internal IDs.

## Decisions

1. Deliver the full therapist-to-visitor-to-staff multi-site workflow in one phase.
2. Use two fixed database-backed active sites and backfill all legacy records to the existing San Francisco clinic.
3. Allow every therapist to open slots at any active site while preventing the same therapist from being scheduled at the same instant across sites.
4. Keep staff clinic-wide and add filters rather than site-scoped authorization.
5. Extend dashboard, reporting, CSV, confirmation, notification, and About behavior so site identity remains consistent end to end.
6. Require complete migration and two-viewport E2E evidence before merge.

## Out of Scope

- Site creation/editing/deactivation UI, operator commands, configurable map coordinates, or environment-driven site catalogs
- Assigning therapists or staff to one site, per-site roles, per-site sessions, regional administrators, or access isolation
- Timezone fields, conversion, daylight-saving coordination, locale formatting, or cross-timezone scheduling
- Rooms, resources, capacity, travel time, directions, distance, geolocation, site search, transfers, or appointment rescheduling
- Separate site databases, services, deployments, domains, queues, or notification providers
- Editing historical appointment site identity or moving an occupied slot between sites

## Assumptions

- Both demonstration sites use the existing clinic-local clock until the dedicated timezone phase.
- The two addresses and map markers are intentionally fictional demonstration data.
- The site catalog remains stable during this phase, so appointments reference canonical site records without a separate site-name/address snapshot.
