# Timezone Coordination Plan

## Task Group 1 - Time Domain and Migration

1. Add a dependency-free time domain module for exact local-minute parsing, IANA validation, local-to-UTC candidate resolution, UTC serialization, site-local formatting, and per-zone calendar boundaries.
2. Define explicit successful, malformed, nonexistent, and ambiguous conversion results so routes and migrations do not infer DST policy.
3. Add migration `015_timezone_coordination.sql` with site time zones, canonical UTC columns, canonical indexes, and temporary nullable schema needed for safe backfill.
4. Extend the migration runner with a filename-scoped transactional data hook that backfills migration 015 before recording it as applied and rolls back the whole migration on conversion or consistency failure.
5. Backfill slot and appointment UTC instants from site-local values, choosing the earlier candidate for legacy overlaps and rejecting gaps or invalid site zones.
6. Backfill outbox canonical due instants, deriving reminders from appointment UTC minus 24 hours and immediate events from their preserved local due values.
7. Install final database guards for required canonical values and linked appointment/slot site, local-time, and UTC agreement.
8. Replace therapist instant uniqueness and due/schedule indexes with canonical UTC equivalents while preserving slot occupancy, event uniqueness, and foreign keys.
9. Update deterministic seeds so fresh databases populate matching local and UTC values without duplicating migration-owned sites.

## Task Group 2 - Typed Persistence and Scheduling

10. Extend site, slot, appointment, notification, report, and CSV types with IANA and canonical UTC fields.
11. Return site time zones and canonical instants from every database projection that formats, compares, exports, or delivers appointment time.
12. Convert available-slot, therapist-slot, removal, dashboard, and appointment ordering/future checks from server-local strings to UTC fields.
13. Update therapist slot creation to resolve the submitted local minute in the selected active site's zone and atomically dual-write local and UTC values.
14. Return accessible field errors for malformed, past, nonexistent, ambiguous, inactive-site, and duplicate instants while retaining safe submitted values.
15. Update slot booking to copy local and UTC authority from the slot, and update the legacy internal appointment helper to derive UTC in the default site's zone while retaining its call signature and test role.
16. Replace every appointment transition and notification enqueue timestamp based on server-local formatting with canonical UTC minute serialization.

## Task Group 3 - Time-aware Presentation

17. Introduce shared server-rendered time presentation helpers that show the trusted site-local value with its visible IANA zone and machine-readable UTC instant.
18. Update therapist schedule hints, slot rows, appointment rows, staff dashboard, public booking options, and confirmation details with consistent site-time labels.
19. Add a local progressive-enhancement script that appends the visitor browser-local equivalent to public slot options and confirmation content from trusted UTC metadata.
20. Preserve complete site-local labels and booking behavior when JavaScript or `Intl` enhancement is unavailable, and make the enhancement idempotent without network or storage access.
21. Update notification text and HTML previews with site-local time, IANA zone, and canonical UTC while preserving recipient privacy and safe escaping.
22. Adjust mobile-first styles for long time-zone labels, enhanced option text, tables, details, and validation errors at required viewports.

## Task Group 4 - Reports and CSV

23. Change report defaults to use the established clinic zone rather than the Node process's local getters.
24. Convert validated date ranges into one selected-site UTC interval or a set of active-site UTC intervals for all-sites queries.
25. Apply the same per-site boundaries to totals, therapist workload, agent demand, appointment detail, empty states, and CSV.
26. Keep all report queries parameterized and ensure each appointment is included once even when future sites use different IANA zones.
27. Expand CSV serialization to the exact seven-column timezone-aware contract while preserving deterministic UTC/ID ordering, formula protection, quoting, CRLF, UTF-8, HEAD, filenames, and private-field exclusions.
28. Clarify report hints and result descriptions so calendar dates are explicitly interpreted in the selected site or each site's local calendar.

## Task Group 5 - Automated Merge Evidence

29. Add time-domain unit tests for ordinary offsets, winter/summer conversion, spring gaps, autumn overlaps, exact round trips, invalid IANA identifiers, and UTC/calendar boundaries.
30. Add fresh, upgrade, repeat, rollback, in-memory, and file-backed migration tests covering canonical backfill, earlier-overlap policy, gap failure, linked-record agreement, constraints, indexes, and preserved legacy fields.
31. Add persistence and concurrency tests for UTC future checks, therapist-wide instant collisions across sites, slot booking derivation, cancellation release, due ordering, and exact 24-hour reminders.
32. Add route tests for schedule errors, retained values, no client authority, time labels, protected views, notification previews, site/all-sites report boundaries, and the exact CSV contract.
33. Run equivalent time-sensitive domain, route, notification, and reporting cases under at least `TZ=UTC` and `TZ=America/Los_Angeles` and require identical canonical outcomes.
34. Add Playwright journeys at `375px x 812px` and `1280px x 800px` for therapist scheduling, DST validation, visitor browser-local enhancement, no-JavaScript fallback, confirmation, dashboard, reports, CSV, focus, and overflow.
35. Run type checking, all Vitest and Playwright tests, production build/smoke checks, dependency audit, whitespace validation, migration artifact review, privacy/secret review, and clean Git checks.
36. Mark Phase 11 complete and remove `Timezone coordination` from Deferred only after every validation requirement passes.
