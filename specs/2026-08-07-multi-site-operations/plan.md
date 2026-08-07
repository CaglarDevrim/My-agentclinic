# Multi-site Operations Plan

## Task Group 1 - Site Domain and Migration

1. Add migration `014_multi_site_operations.sql` with the normalized sites catalog, deterministic San Francisco and Oakland records, slot/appointment site references, legacy backfill, indexes, and SQLite-compatible enforcement for required valid site identity.
2. Verify every existing appointment and slot is assigned to `context-window-clinic`, linked appointment/slot site identities match, and all IDs, statuses, timestamps, therapist snapshots, notification contacts, and outbox rows remain unchanged.
3. Preserve therapist-wide timestamp uniqueness across sites, open-slot appointment uniqueness, cancellation release behavior, foreign keys, and migration idempotency.
4. Extend seeds with deterministic site-aware slots and appointments without duplicating migration-owned site records.
5. Add typed site, site-filter, site-aware slot, appointment, notification, report, and CSV contracts.
6. Add database operations for listing active sites and resolving one active site by strict ID or slug without exposing internal values publicly.

## Task Group 2 - Site-aware Slots and Booking

7. Extend therapist slot queries with site identity and retain ownership, active/future, occupancy, and deterministic ordering behavior.
8. Update owned slot creation to validate an active site and atomically persist it while keeping therapist/timestamp collisions global across sites.
9. Add the required site selector, retained values, accessible errors, and location display to the therapist schedule page and POST route.
10. Extend public available-slot queries and option labels with trusted site name and address while excluding inactive sites.
11. Update atomic slot booking to derive and persist appointment site identity from the selected slot and reject stale or inactive-site slots through the normal unavailable path.
12. Show the booked site on appointment confirmations and preserve it through confirmation, cancellation, and released-slot reuse.

## Task Group 3 - Notifications and Staff Operations

13. Extend due-notification queries with site name/address and render both fields in created, confirmed, cancelled, and reminder text/HTML previews.
14. Add strict optional site-slug parsing shared by dashboard and report routes, including absent all-sites behavior and duplicate, empty, malformed, unknown, inactive, and overlong rejection.
15. Update the staff dashboard query so the open-appointment metric and table share the selected site filter while clinic-wide metrics remain unchanged.
16. Add the dashboard GET site selector, selected-scope explanation, accessible `422` errors, site columns/labels, and filter-preserving staff navigation behavior.
17. Preserve therapist redirects, role boundaries, no-store responses, safe return paths, and all appointment mutation authorization.

## Task Group 4 - Reports and CSV

18. Extend report parsing with an optional site slug while preserving existing date defaults, inclusive boundaries, 366-day limit, and bounded errors.
19. Apply the normalized site filter consistently to report totals, therapist workload, agent demand, appointment-detail queries, and empty states.
20. Add the site selector and selected site/all-sites description to the report page and propagate the exact filter into its CSV link.
21. Add the `Site` CSV column, safe site value serialization, and deterministic site-aware filename while preserving ordering, CRLF, quoting, formula protection, HEAD, and privacy contracts.
22. Keep report and CSV routes staff-only, read-only, no-store, parameterized, and free of notification contacts or authority-bearing IDs.

## Task Group 5 - Public Locations and Maps

23. Render both fixed sites on `/about` as semantic location cards with exact names, addresses, fictional notices, and secured external OpenStreetMap links.
24. Generalize the local progressive-enhancement script to initialize multiple independent map controls from trusted fixed site configuration.
25. Ensure each activation creates one correctly titled, lazy, no-referrer iframe for only its own site with no persisted or shared consent.
26. Update mobile-first location, form, table, confirmation, schedule, dashboard, report, and map styles using the established tokens and labelled-row patterns.

## Task Group 6 - Automated Merge Evidence

27. Add fresh/upgrade/repeat migration tests for the two sites, complete backfill, slot/appointment agreement, preserved legacy/outbox data, foreign keys, and invalid-site enforcement.
28. Add persistence and concurrency tests for active-site listing, owned cross-site slots, global therapist-time collision, inactive-site rejection, booking derivation, cancellation release, and file-backed durability.
29. Add route/security tests for malformed and duplicated site IDs/slugs, retained errors, role boundaries, dashboard filtering, report consistency, CSV privacy, notification content, and unchanged core workflows.
30. Add CSV tests for the exact five-column contract, all-sites and selected-site datasets, filename safety, sorting, empty output, Unicode, quoting, formula protection, and private-field exclusion.
31. Add Playwright journeys at `375px x 812px` and `1280px x 800px` covering therapist site selection, cross-site collision, visitor booking, confirmation, notification-visible location, staff dashboard/report filtering, CSV download, errors, keyboard focus, and overflow prevention.
32. Add browser network tests proving the two About maps load independently, make no pre-activation provider request, remain idempotent, and preserve both fallbacks with JavaScript disabled or provider requests aborted.
33. Run type checking, all Vitest and Playwright tests, production build/smoke checks, dependency audit, whitespace validation, migration artifact review, secret review, and clean Git checks.
34. Mark Phase 10 complete and remove only multi-site operation from Deferred after every validation requirement passes; leave timezone coordination deferred.
