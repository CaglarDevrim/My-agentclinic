# Clinic Operations Reporting Plan

## Task Group 1 - Filter and Report Domain

1. Add typed report filter, totals, therapist workload, agent demand, report result, and CSV row contracts without changing the database schema.
2. Implement strict clinic-local `YYYY-MM-DD` parsing, real-calendar validation, inclusive-day boundaries, current-month defaults, reversed-range rejection, and the 366-day maximum using an injected clock.
3. Add a live parameterized report query that returns status totals, therapist workload, and agent demand from appointments scheduled inside the normalized range.
4. Add a filtered appointment-detail query with deterministic scheduled-time and ID ordering for CSV generation.
5. Ensure legacy therapist snapshots and current agent links remain reportable while excluding every private contact, account, session, and notification field.

## Task Group 2 - CSV Serialization

6. Implement a dependency-free UTF-8 CSV serializer with the exact four-column contract and CRLF row endings.
7. Add RFC 4180 quoting for commas, quotes, and line breaks plus spreadsheet-formula protection for dangerous textual prefixes.
8. Generate a deterministic attachment filename from normalized dates and return a header-only file for a valid empty range.

## Task Group 3 - Protected Routes and Page

9. Add centralized staff-only authorization for `GET /dashboard/reports` and `GET /dashboard/reports.csv` before any report query.
10. Render the report filter form, selected-period summary, four status metrics, therapist workload table, agent demand table, CSV action, and explicit empty states.
11. Return accessible HTML `422` errors with safe retained values for invalid report-page filters.
12. Return bounded plain-text `422` errors and no dataset for invalid CSV filters.
13. Preserve existing login redirects, safe return paths, no-store behavior, branded `403` responses, HEAD semantics, and safe `500` handling.

## Task Group 4 - Navigation and Presentation

14. Add a Reports destination to staff protected navigation without exposing it to therapists or public navigation.
15. Style report filters, metrics, actions, and tables within the established compact dark system and labelled mobile-table pattern.
16. Preserve semantic headings, explicit labels, associated errors, visible focus, keyboard operation, and no horizontal page overflow at required viewports.

## Task Group 5 - Automated Merge Evidence

17. Add date-domain tests for defaults, leap dates, impossible dates, inclusive boundaries, reversed/partial/duplicated input, and the 366-day limit.
18. Add database tests for status totals, therapist/agent grouping, legacy data, deterministic ties, empty ranges, file-backed persistence, and private-field exclusion.
19. Add CSV tests for column order, sorting, empty export, MIME/disposition headers, CRLF, Unicode, quoting, formula protection, and absence of private fields.
20. Add route and authorization tests for anonymous redirects, staff success, therapist `403`, malformed filters, no-store, HEAD, unsupported methods, and unchanged dashboard behavior.
21. Add Playwright journeys at `375px x 812px` and `1280px x 800px` for staff navigation, filtering, metrics, tables, empty/error states, CSV download, keyboard focus, and overflow prevention.
22. Run type checking, Vitest, production build, Playwright, dependency audit, whitespace validation, secret/artifact review, and clean Git checks before merge.
