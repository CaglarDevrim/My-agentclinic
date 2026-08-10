# Clinic Operations Reporting Requirements

## Context

Clinic operations reporting is Phase 8 of the AgentClinic roadmap. The completed product already gives clinic staff a protected operational dashboard, appointment status management, therapist accounts and schedules, visitor notifications, feedback, and review moderation. The dashboard shows current totals and open work, but staff cannot inspect appointment activity for a selected period or export a filtered dataset for offline analysis.

This phase promotes the first item from the deferred reporting bundle into one small, complete increment. Clinic staff receive an on-demand, read-only report based on appointment scheduled dates, with status totals, therapist workload, agent demand, and a CSV export using the same validated date range. Embedded maps, multi-site operation, and timezone coordination remain deferred.

The feature must preserve the Hono, TypeScript, server-rendered JSX, plain CSS, libSQL/SQLite, role-aware authentication, no-client-JavaScript, responsive, accessible, and low-infrastructure architecture.

## Scope

This feature must:

- Add one staff-only clinic operations report page.
- Filter appointments by an inclusive clinic-local scheduled-date range.
- Show appointment status totals, therapist workload, and agent demand for the selected range.
- Export the filtered appointment detail as a safe CSV download.
- Reuse current appointment, agent, therapist, session, role, and database data without a new migration or persisted report snapshot.
- Preserve every existing public, therapist, staff, booking, notification, review, and dashboard workflow.
- Add query, route, permission, CSV, privacy, accessibility, responsive-browser, and regression evidence.

## Reporting Audience and Permissions

- Only an authenticated account whose database-derived role is `staff` may access the report page or CSV export.
- Anonymous requests preserve the existing `303` login redirect, safe return path, session-cookie, and no-store behavior.
- An authenticated therapist receives a branded `403 Forbidden` response before any clinic-wide report data is queried or rendered.
- Reporting is read-only. GET and HEAD requests never change appointments, notification events, sessions, or other clinic records.
- Staff report access does not grant impersonation, therapist schedule mutation, or access to notification recipient data.

## Routes and Navigation

### `GET /dashboard/reports`

- Render a server-side report page with a labelled `from` date, labelled `to` date, Apply filters action, and CSV download link for the current valid range.
- Staff navigation exposes a discoverable Reports destination within the protected dashboard area.
- The report page links back to the main dashboard and retains the authenticated display name and CSRF-protected logout control.
- The current protected section is identified semantically without adding a separate public navigation destination.

### `GET /dashboard/reports.csv`

- Return a downloadable CSV generated from the same normalized `from` and `to` parameters as the HTML report.
- Respond with `Content-Type: text/csv; charset=utf-8` and a safe deterministic attachment filename containing only the normalized dates.
- Do not render a page layout, cookie value, CSRF value, session data, or private contact field in the file.
- HEAD returns the same safe response headers without a body and without changing data.

## Date Range Contract

- `from` and `to` use exact `YYYY-MM-DD` clinic-local calendar dates.
- The range includes every appointment whose `scheduled_at` is at or after `fromT00:00` and before the local day immediately following `to`.
- When both parameters are absent, default to the first and last calendar day of the current clinic-local month using the application's injected clock.
- When only one parameter is present, duplicated, non-string, malformed, impossible, reversed, or wider than 366 inclusive days, return `422 Unprocessable Entity` and query no report dataset.
- The HTML route renders an accessible error summary, retains only safe entered values, and links errors to the affected controls.
- The CSV route returns a bounded generic plain-text `422` response with no rejected values, SQL, stack trace, or database detail.
- Query parameters outside `from` and `to` do not affect report authority or output.
- No timezone selector or conversion is introduced; the displayed and exported dates retain the clinic-local timestamp convention used throughout AgentClinic.

## On-Screen Report

The report page displays:

- Selected inclusive date range.
- Total appointments in the range.
- Pending, confirmed, and cancelled appointment totals.
- A therapist workload table with therapist display name, total, pending, confirmed, and cancelled counts.
- An agent demand table with agent name and total appointment count.

Report behavior:

- Every status total includes only appointments in the selected scheduled-date range.
- Therapist workload uses the appointment's preserved therapist display snapshot so legacy and slot-based appointments remain reportable.
- Agent demand uses the current linked agent name and includes only agents with at least one appointment in the selected range.
- Therapist rows sort by total descending, then display name case-insensitively, then stable identity; agent rows use the same total/name/stable-ID order.
- Aggregate totals are computed from the same filtered appointment population used by the detail export.
- A valid range with no appointments renders zero metrics and explicit empty states for both workload tables.
- The main dashboard's current metrics and open-work tables remain unchanged.

## CSV Export Contract

- The CSV contains one header row followed by one row per filtered appointment.
- Columns are exactly `Scheduled at`, `Agent`, `Therapist`, and `Status`, in that order.
- Rows sort by scheduled timestamp ascending and appointment ID ascending.
- Scheduled timestamps use the stored clinic-local `YYYY-MM-DDTHH:mm` value without locale-dependent conversion.
- Status values are the controlled lowercase values `pending`, `confirmed`, or `cancelled`.
- Encode as UTF-8 and use CRLF row endings.
- Apply RFC 4180 field quoting: double embedded quotes and quote fields containing comma, quote, carriage return, or line feed.
- Prevent spreadsheet formula execution by prefixing textual fields whose first non-whitespace character is `=`, `+`, `-`, or `@` with a single apostrophe before CSV quoting.
- The export includes no appointment ID, agent ID, therapist ID, slot ID, visitor notification email, consent timestamp, account email, review email, session data, or notification outbox data.
- A valid empty range returns the header row only rather than an error or blank file.

## Data and Architecture

- Add typed report filter, totals, therapist workload, agent demand, report result, and CSV row contracts.
- Query live normalized data on demand; do not create reporting tables, materialized views, daily aggregates, jobs, caches, or migrations.
- Use parameterized SQL for range boundaries and deterministic ordering.
- Keep filter validation separate from persistence queries and keep CSV serialization separate from route handling.
- Execute independent aggregate queries consistently against the same normalized range; no query may use visitor contact data.
- The implementation must remain compatible with local file-backed SQLite, isolated in-memory tests, and remote Turso/libSQL.

## Accessibility and Responsive Presentation

- The report page has one H1, logical landmarks/headings, an explicit report-period description, and semantic metric and table markup.
- Date inputs have visible labels, native date controls, understandable hints, associated errors, and keyboard-visible focus.
- Metrics and table meanings remain understandable without color, icons, charts, hover, or client-side JavaScript.
- Empty and error states are announced and do not collapse navigation or headings.
- At `375px`, filters, metrics, report tables, download action, and navigation do not overlap, clip, or cause page-level horizontal scrolling.
- At `1280px`, the established compact content width, table hierarchy, spacing, and dark visual system remain consistent.

## Security, Privacy, and Reliability

- Role checks occur before report queries and are always reloaded through the existing authenticated session boundary.
- Report requests inherit no-store response behavior so private operational data is not browser-cached.
- User-derived query values are validated before SQL use; SQL remains parameterized and rendered text remains JSX-escaped.
- CSV generation never logs or embeds rejected query values, private email, cookie, token, database URL, SQL, filesystem path, or configuration secret.
- Formula protection occurs after string conversion and before CSV quoting for every textual cell.
- Report and export failures use existing safe branded or bounded error behavior and never return partial private output.
- Automated tests use isolated synthetic records and never read the local or production clinic database.

## Decisions

1. Promote reporting alone to Phase 8; keep embedded maps, multi-site operation, and timezone coordination deferred.
2. Serve clinic-wide reporting to staff only; therapists do not receive personal reporting in this phase.
3. Filter by scheduled appointment date, not appointment creation date.
4. Use live on-demand queries and no persisted snapshots or migration.
5. Include a safe CSV appointment-detail export using the same filters as the HTML report.
6. Require the complete automated merge gate, including CSV contract and two-viewport browser coverage, without a separate manual CSV review.

## Out of Scope

- Therapist personal reports, visitor reports, public analytics, or sharing links
- Appointment-created-date trends, notification delivery analytics, feedback/review analytics, or financial reporting
- Charts, client-side visualization libraries, configurable dimensions, saved filters, saved reports, or scheduled exports
- Persisted daily snapshots, materialized views, reporting migrations, data warehouses, queues, or background jobs
- PDF, XLSX, JSON, email delivery, cloud storage, or third-party business-intelligence integrations
- Embedded maps, map SDKs, multi-site operation, site filtering, timezone selection/conversion, or cross-site comparisons
- Editing, confirming, cancelling, rescheduling, or otherwise mutating appointments from the report page

## Assumptions

- The current clinic-local `scheduled_at` representation remains sufficient until the deferred timezone phase.
- A maximum inclusive range of 366 days is sufficient for the first operational report and limits accidental expensive queries.
