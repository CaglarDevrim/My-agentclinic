# Multi-site Operations Validation

All required checks must pass before `phase-10-multi-site-operations` can be merged.

## 1. Complete Automated Gate

Run:

```sh
npm run validate
npm audit --audit-level=moderate
git diff --check
```

Success requires zero typecheck, migration, database, concurrency, route, authorization, notification, report, CSV, map-privacy, accessibility, responsive-browser, production-build, dependency-audit, secret, artifact, or whitespace failures.

## 2. Migration and Compatibility

- A fresh database applies all migrations and contains exactly the two required active sites with stable slugs, names, and addresses.
- A Phase 9 database upgrades without changing the ID, agent, therapist snapshot/reference, slot reference, scheduled time, status, notification contact, consent timestamp, creation timestamp, or outbox events of any appointment.
- Every pre-existing slot and appointment receives the `context-window-clinic` site; every linked appointment and slot agree on site.
- Future slot and appointment inserts cannot omit or reference an invalid site, including direct database writes.
- Reapplying migration setup is idempotent and neither duplicates sites nor changes backfilled site identity.
- The therapist/timestamp unique rule remains global across sites, appointment open-slot uniqueness remains enforced, and all foreign-key checks pass.
- In-memory and temporary file-backed databases return identical site-aware behavior.

## 3. Therapist Schedule and Collision Rules

- The therapist schedule lists both active sites and requires exactly one valid `siteId` when creating a slot.
- Missing, empty, duplicated, unsafe-integer, malformed, unknown, and inactive site IDs return accessible `422` responses and create no slot.
- Successful creation persists the authenticated therapist, selected site, and valid future local timestamp followed by `303` PRG.
- A therapist cannot create the same timestamp at another site; another therapist may use that timestamp at either site.
- Slot lists show correct site name/address and never expose another therapist's slots or internal site IDs as authority.
- Existing CSRF, exact-origin, session, ownership, occupied-slot removal, and cancellation-release contracts remain unchanged.

## 4. Booking, Confirmation, and Notifications

- Public available-slot options show therapist, clinic-local time, site name, and address for active, future, unoccupied slots at active sites only.
- Booking accepts no public site authority; the appointment site always equals the selected authoritative slot site.
- Malformed, stale, occupied, inactive-site, or concurrently claimed slots create neither an appointment nor an outbox event and return the established `422` behavior.
- Confirmation shows the exact booked site name/address without exposing notification email or internal IDs.
- Created, confirmed, cancelled, and reminder text/HTML previews contain the correct site name/address and preserve recipient privacy, event uniqueness, retry, and scheduling behavior.
- Cancelling and rebooking a slot preserves that slot's site.

## 5. Dashboard Filter Contract

- Anonymous dashboard requests retain the safe `303` login redirect; therapists retain their permitted redirects/`403` boundaries; only staff receive clinic-wide site filtering.
- No `site` parameter selects `All sites`; one known active slug filters both open-appointment metric and table.
- Agents, active ailments, and pending-review metrics remain clinic-wide and are visibly distinguished from the filtered appointment scope.
- Empty, duplicated, malformed, unknown, inactive, and overlong site values return an accessible `422` before the filtered appointment query.
- Every appointment row shows the correct site name/address; a valid site with no open appointments shows a zero metric and explicit empty state.
- Filtering is GET-only, no-store, parameterized, JavaScript-independent, and never changes clinic data.

## 6. Report and CSV Contract

- Report date behavior remains unchanged; optional site filtering applies to totals, therapist workload, agent demand, and detail rows from the same population.
- The report period names `All sites` or the selected site and its CSV link preserves normalized `from`, `to`, and site values.
- Invalid date and site errors are combined accessibly in HTML; invalid CSV input returns bounded plain-text `422` and no dataset.
- CSV header is exactly `Scheduled at,Agent,Therapist,Site,Status` followed by CRLF.
- Selected-site CSV contains only that site; all-sites CSV includes both sites; each appointment appears once in scheduled-time/ID order.
- Filename ends with the selected safe site slug or `all-sites`; RFC 4180 quoting, formula protection, Unicode, HEAD, empty-range, and UTF-8 behavior remain correct.
- CSV contains no address, database/site/appointment/slot ID, notification contact, consent timestamp, account email, token, cookie, SQL, database URL, or path.

## 7. About and Map Privacy

- `/about` renders exactly two semantic site cards in deterministic order with the exact fictional names and addresses.
- Both external OpenStreetMap links use fixed HTTPS URLs, descriptive text, `_blank`, and `noopener noreferrer`.
- Initial page load makes zero OpenStreetMap embed requests and contains no iframe or external executable script.
- Activating San Francisco creates one San Francisco iframe/request and no Oakland request; activating Oakland then creates one Oakland iframe/request.
- Repeated activation creates no duplicate iframe/request, and consent is absent after reload with no cookie or web-storage value.
- With JavaScript disabled or both provider requests aborted, both addresses and external links remain visible and usable without application errors or automatic retries.

## 8. Responsive and Accessible E2E Journey

At `375px x 812px` and `1280px x 800px`, Playwright must:

1. Sign in as a therapist, select Token Harbor Clinic, and create a future slot with visible focus and confirmation in the schedule list.
2. Attempt the same therapist/time at Context Window Clinic and receive an accessible collision error without a second slot.
3. As a visitor, book the Token Harbor slot and verify its site on the option and confirmation.
4. As the therapist, verify the appointment site and complete a permitted status action.
5. As staff, switch dashboard between All sites, each site, and an empty/error state while checking metrics, rows, retained filters, and authorization.
6. Filter the report by date and site, verify all aggregates, download the matching five-column CSV, and confirm private data is absent.
7. Verify both About locations and independently activate their maps under the privacy boundary.
8. Complete controls by keyboard and confirm no affected page has document-level horizontal overflow.

## 9. Regression, Production, and Artifact Safety

- Existing health, catalogs, booking, appointment transitions, therapist ownership, notifications, feedback, reviews, reporting, About, authentication, CSRF, traversal, logging, and branded errors continue to pass.
- The compiled application applies migration 014 before accepting traffic and exposes the same site-aware behavior as the importable test app.
- No new dependency, environment variable, site-specific secret, map API key, local database, CSV download, build output, browser report, credential, or session artifact is staged.
- Request logs and safe error pages contain no contact data, rejected raw inputs, tokens, SQL, database configuration, or filesystem paths.

## Definition of Done

- Every automated migration, domain, concurrency, route, authorization, notification, reporting, CSV, map privacy, accessibility, responsive, regression, and production check passes.
- Site identity remains consistent from therapist slot creation through booking, appointment management, notifications, dashboard filtering, reporting, export, and public location display.
- Existing records are preserved and assigned deterministically to the original clinic.
- The implementation adds no site administration, per-site authorization, timezone conversion, external infrastructure, or unrelated product expansion.
- Only after these conditions pass may Phase 10 be marked complete and multi-site operation removed from the Deferred roadmap entry.
