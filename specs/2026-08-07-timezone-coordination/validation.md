# Timezone Coordination Validation

All required checks must pass before `phase-11-timezone-coordination` can be merged.

## 1. Complete Automated Gate

Run:

```sh
npm run validate
npm audit --audit-level=moderate
git diff --check
```

Success requires zero typecheck, migration, conversion, DST, persistence, concurrency, route, authorization, notification, report, CSV, accessibility, responsive-browser, production-build, dependency-audit, secret, artifact, or whitespace failures.

## 2. Migration and Compatibility

- A fresh database applies migration 015 and gives both fixed sites `America/Los_Angeles`.
- Slot and appointment rows have matching canonical `YYYY-MM-DDTHH:mmZ` values; outbox rows have canonical due values and required canonical indexes.
- A Phase 10 database upgrades without changing IDs, URLs, site/therapist/slot relationships, local schedule strings, statuses, recipients, event kinds, states, attempt counts, or existing local due strings.
- A normal winter local time and a daylight-saving summer local time backfill to their correct different offsets.
- A legacy autumn overlap chooses the earlier valid instant consistently. A legacy spring gap, invalid local syntax, unsupported site zone, or linked appointment/slot mismatch aborts migration 015 and leaves it unapplied with no partial schema/data commit.
- Reminder canonical due time equals appointment canonical UTC minus exactly 24 hours; immediate event times preserve their prior wall-clock meaning in the appointment site's zone.
- Direct inserts or updates cannot omit canonical values or make a linked appointment disagree with its slot's site, local time, or UTC instant.
- Re-running setup is idempotent. In-memory, temporary file-backed, compiled-production, and remote-compatible paths behave consistently.

## 3. Conversion and DST Boundaries

- Exact local-minute parsing rejects missing, duplicated, overlong, control-character, malformed, impossible-date, second-bearing, and offset-bearing values.
- IANA validation accepts configured zones and rejects unsupported identifiers without silently falling back to the server zone.
- Ordinary, winter, and summer local values resolve to the expected UTC minute and round-trip exactly.
- A spring-forward missing time returns the explicit nonexistent result; an autumn repeated time returns the explicit ambiguous result with both candidate instants.
- New therapist submissions for either result return accessible `422` responses, retain safe inputs, create no slot, and do not select an offset implicitly.
- Future/past decisions at the exact current-minute boundary use UTC and are identical under `TZ=UTC` and `TZ=America/Los_Angeles`.

## 4. Scheduling, Booking, and Collision Rules

- Schedule pages identify the selected site's IANA zone beside the local input and every listed slot.
- A valid site-local value creates one slot with matching local and canonical values followed by the existing `303` PRG flow.
- The same therapist cannot create the same instant through different site-local representations or at different sites; another therapist may use that instant.
- The legacy internal appointment helper retains its existing call signature, interprets its local value in the default site's zone, dual-writes canonical UTC, and detects collisions by instant.
- Available-slot listing and removal use UTC future checks and deterministic UTC ordering regardless of process time zone.
- Public booking accepts no UTC, offset, zone, site, therapist, or timestamp authority from the browser; the appointment always copies both timestamps and site identity from its slot.
- Stale, occupied, inactive, malformed, and concurrent booking failures create neither an appointment nor an outbox event.
- Cancellation, release, and rebooking preserve the slot's local/UTC/site identity and existing authorization behavior.

## 5. Presentation and Progressive Enhancement

- Public booking, confirmation, therapist schedule, therapist appointments, and staff dashboard display the correct site-local time with a visible IANA zone.
- Public UTC metadata uses the exact canonical instant, contains no private or authority-bearing value, and is safe when inspected or altered.
- With JavaScript enabled, slot choices and confirmation append a browser-local equivalent matching the canonical UTC instant and the browser's configured zone.
- Enhancement is idempotent, makes no network request, writes no cookie/storage value, and leaves the authoritative submitted `slotId` unchanged.
- With JavaScript disabled or `Intl` unavailable, site-local labels, validation, booking, confirmation, and protected workflows remain complete and usable.
- Long dates and IANA identifiers remain understandable, labelled, keyboard-operable, and free of page-level overflow at both required viewports.

## 6. Notification and Reminder Timing

- Created, confirmed, and cancelled notifications become due at the injected current UTC minute and remain transactionally coupled to their appointment event.
- A booking more than 24 hours away creates one reminder due at appointment UTC minus exactly 24 hours; a booking at or inside the boundary creates none.
- DST transitions between booking, reminder, and appointment do not change the absolute 24-hour interval.
- Claim order uses canonical due time then ID; future work stays pending and due work is processed identically under different server `TZ` values.
- Cancelled or past reminders are suppressed through canonical comparisons; retry and concurrency cannot preview one event twice.
- Text and HTML previews show correct site-local time, IANA zone, canonical UTC, site name, and address without leaking the recipient in filenames, logs, URLs, or public output.

## 7. Reports and CSV

- Date syntax, inclusive behavior, defaults, reversal checks, and 366-day limit remain intact.
- A selected-site range includes appointments from that site's local `from` midnight through the next local day after `to`, using the correct variable UTC offsets across DST.
- All-sites reporting applies those calendar dates separately to every site's zone and includes each matching appointment exactly once.
- Defaults use the established clinic calendar and return identical dates under different server `TZ` settings.
- Totals, therapist workload, agent demand, detail rows, HTML scope, and CSV use the same normalized population.
- CSV header is exactly `Scheduled at,Time zone,Scheduled at UTC,Agent,Therapist,Site,Status` followed by CRLF.
- Rows contain the correct local value, trusted IANA zone, canonical UTC value, and deterministic UTC/ID ordering while preserving formula protection, quoting, Unicode, empty export, HEAD, filenames, and privacy exclusions.
- Invalid date/site input returns existing bounded accessible `422` behavior and no partial report or CSV.

## 8. Responsive and Accessible E2E Journey

At `375px x 812px` and `1280px x 800px`, Playwright must:

1. Sign in as a therapist and create a valid site-local future slot with a visible time-zone hint.
2. Submit a synthetic DST-gap and overlap value and verify linked accessible errors and no persistence.
3. Book a slot as a visitor and verify the site-local and browser-local labels describe the same canonical instant.
4. Repeat the public path with JavaScript disabled and complete booking using the site-local fallback.
5. Verify the confirmation, therapist appointment, and staff dashboard retain the correct site time and zone.
6. Process an eligible reminder and inspect safe text/HTML timezone content and exact due behavior.
7. Run selected-site and all-sites reports across a DST boundary and download the matching seven-column CSV.
8. Complete controls by keyboard and confirm no affected page has document-level horizontal overflow.

## 9. Regression, Production, and Artifact Safety

- Existing health, catalogs, booking, appointment transitions, therapist ownership, notifications, feedback, reviews, reports, maps, multi-site filtering, authentication, CSRF, logging, and branded errors continue to pass.
- The compiled application applies migration 015 before accepting traffic and produces the same canonical behavior as the importable test app.
- The relevant automated suites produce identical canonical assertions with `TZ=UTC` and `TZ=America/Los_Angeles`.
- No new dependency, environment variable, external request, location tracking, database file, preview artifact, CSV download, build output, browser report, credential, or session artifact is staged.
- Logs and safe errors contain no recipient, raw rejected time value, token, SQL, database configuration, or filesystem path.

## Definition of Done

- Every automated migration, conversion, DST, server-zone independence, persistence, concurrency, route, notification, reporting, CSV, accessibility, responsive, regression, and production check passes.
- Canonical UTC governs every appointment instant and due-time decision while users consistently see the correct site-local time and zone.
- Visitor browser-local display remains optional, private, non-authoritative, and JavaScript-independent at the workflow level.
- Existing valid records and compatibility fields survive migration without silent wall-time changes.
- Only after these conditions pass may Phase 11 be marked complete and `Timezone coordination` be removed from Deferred.
