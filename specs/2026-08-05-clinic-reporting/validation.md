# Clinic Operations Reporting Validation

All required checks must pass before `phase-8-clinic-reporting` can be merged.

## 1. Complete Automated Gate

Run:

```sh
npm run validate
npm audit --audit-level=moderate
git diff --check
```

Success requires zero typecheck, report-domain, date-boundary, query, grouping, CSV, route, authorization, privacy, accessibility, responsive-browser, production-build, dependency-audit, artifact, secret, or whitespace failures. No separate manual CSV review is required.

## 2. Date Range Validation

- With neither query parameter present, the injected clinic-local clock produces the first and last dates of its current calendar month.
- Exact valid `from` and `to` values are retained and normalized as `YYYY-MM-DD`.
- Appointments at `fromT00:00` and through the final minute of `to` are included; the following local midnight is excluded.
- Valid leap-day and month/year boundary ranges are accepted.
- Missing-one-side, duplicated, empty, whitespace, wrong-width, timestamp, impossible-calendar, reversed, and non-string values return `422` and trigger no report query.
- A 366-day inclusive range is accepted; a 367-day inclusive range returns `422`.
- HTML errors link to their date controls and retain only safe bounded text; CSV errors contain no rejected value or internal detail.

## 3. Report Query and Aggregation

- The total equals all pending, confirmed, and cancelled appointments scheduled inside the normalized range.
- Pending, confirmed, and cancelled metrics each equal the corresponding filtered appointment count and sum to the total.
- Therapist workload groups by preserved therapist display snapshot and reports total plus each status count.
- Agent demand groups by linked agent identity and reports the filtered appointment count.
- Workload rows sort by total descending, case-insensitive name, and stable identity; repeated execution returns identical order.
- Legacy appointments without slot, canonical therapist, or notification data remain reportable.
- A valid empty range returns zero metrics and empty therapist/agent collections.
- Range filtering uses parameterized SQL and never queries visitor email, consent, account email, session, feedback email, or notification outbox data.
- In-memory, temporary file-backed, compiled local, and Turso-compatible query paths share the same behavior.

## 4. HTML Route and Authorization

- Anonymous `GET /dashboard/reports` requests receive the existing `303` login redirect with a safe report return path and no report data.
- Authenticated staff receive `200`, `Cache-Control: no-store`, the normalized date controls, period description, four metrics, both tables, and matching CSV link.
- Authenticated therapists receive a branded `403` before report queries and see no clinic totals, therapist names, agent names, or report navigation.
- Staff protected navigation exposes Reports; therapist and public navigation do not.
- Valid filter submission is a safe GET URL and does not require or expose a CSRF token.
- Invalid filters return an accessible `422` page with one H1, error summary, field associations, and no SQL or stack trace.
- HEAD returns the correct status/headers without a response body, and unsupported mutation methods never create or alter clinic data.
- The existing `/dashboard` metrics, appointment actions, therapist directory, review moderation, and therapist-owned pages remain unchanged.

## 5. CSV Contract

- A valid staff request returns `text/csv; charset=utf-8` with a safe attachment filename containing only normalized `from` and `to` dates.
- The first row is exactly `Scheduled at,Agent,Therapist,Status` followed by CRLF.
- Each filtered appointment appears exactly once, ordered by `scheduled_at` and appointment ID.
- Stored clinic-local timestamps and controlled lowercase statuses are exported without locale conversion.
- Commas, quotes, CR/LF, and Unicode names serialize without corrupting rows or columns.
- Text whose first non-whitespace character is `=`, `+`, `-`, or `@` is apostrophe-prefixed before CSV quoting.
- A valid empty range returns only the header row.
- CSV output contains no database ID, slot ID, notification email, consent timestamp, account email, review email, token, cookie, SQL, database URL, or filesystem path.
- Anonymous CSV requests redirect to login, therapists receive `403`, and malformed staff requests receive a bounded plain-text `422` with no partial CSV.
- HEAD returns CSV headers and an empty body without querying or mutating more data than required for header validation.

## 6. Accessibility and Responsive Presentation

- The report page has one H1, logical sections, explicit filter labels, understandable hints/errors, semantic metrics, and correctly headed tables.
- Filter, Apply, CSV, dashboard, navigation, and logout controls are keyboard-operable with visible focus.
- Totals and empty/error states remain understandable without color, charts, icons, hover, or client-side JavaScript.
- At `375px`, date controls, actions, metrics, tables, errors, and navigation do not overlap, clip, or create page-level horizontal scrolling.
- At `1280px`, report content follows the established compact width, hierarchy, spacing, alignment, and dark visual system.
- Long safe names wrap within table cells and do not widen the page.

## 7. Browser Validation

At `375px x 812px` and `1280px x 800px`, Playwright must:

1. Sign in as staff, discover Reports in protected navigation, and open the default current-month report.
2. Enter a deterministic valid date range containing synthetic pending, confirmed, and cancelled appointments.
3. Verify the period, total/status metrics, therapist workload, agent demand, deterministic ordering, and no private email content.
4. Download the matching CSV and assert its filename, headers, row count, range, ordering, quoting, and absence of private fields.
5. Submit invalid and reversed ranges and verify `422`, accessible focus/error associations, safe retained values, and no report data leak.
6. Select a valid empty range and verify zero metrics plus explicit empty states.
7. Sign in as a therapist and verify the report route is `403` and Reports is absent from navigation.
8. Complete the journey by keyboard and verify visible focus, JavaScript-independent filtering, and no horizontal overflow.

## 8. Regression, Production, and Artifact Safety

- Existing health, navigation, catalogs, agent details, slot booking, appointment confirmation/status, staff dashboard, therapist schedules/ownership, notifications, feedback, reviews, About, authentication, throttling, CSRF, traversal, logging, and branded-error tests continue to pass.
- No migration is added and fresh or existing databases remain schema-compatible.
- The compiled server starts with local file and Turso configuration and serves identical staff-only report behavior.
- Request logs contain method, path, status, and duration but no rejected filter, CSV row, private email, cookie, token, SQL, filesystem path, or configuration secret.
- No downloaded CSV, local database, `.env`, build output, Playwright report, credential, or session artifact is staged.
- Dependency count remains unchanged unless a separately justified implementation constraint is discovered and approved.

## Definition of Done

- Every automated date, query, aggregation, CSV, authorization, route, privacy, accessibility, responsive, regression, and production requirement passes.
- Staff can filter one inclusive scheduled-date range, understand clinic appointment activity, and download the exact same appointment population as a safe CSV.
- Therapists and anonymous visitors cannot access clinic-wide reporting, and no private contact or authority-bearing data appears on screen or in exports.
- The feature adds no snapshots, migration, charts, reporting infrastructure, embedded map, multi-site behavior, timezone conversion, or unrelated roadmap work.
