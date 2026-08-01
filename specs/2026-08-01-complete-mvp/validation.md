# MVP Validation - Complete AgentClinic

The branch is mergeable only when every required section succeeds.

## 1. Complete Gate

Run:

```sh
npm run validate
npm audit --audit-level=moderate
git diff --check
```

Success requires zero command failures, no moderate-or-higher advisories, no whitespace errors, and a runnable compiled server.

## 2. Database and Seed Validation

- All six migrations apply in order to an empty SQLite database.
- Applied migrations are tracked and a second migration run is a no-op.
- Repeated seeding keeps exactly 6 agents, 6 ailments, 8 therapies, and 3 initial appointments.
- The expected many-to-many relationships match the course reference.
- Closing and reopening a file-backed database preserves records.
- Request-derived SQL values are parameterized.
- The production build contains and can locate its SQL migrations.

## 3. Navigation and Catalog Validation

- The shared header contains Agents, Ailments, Therapies, and Dashboard links on every rendered clinic page.
- Active destinations expose `aria-current="page"`.
- `/agents` lists all six seeded agents and their statuses.
- Every numeric agent detail shows its ailments, recommended therapies, and booking action.
- `/agents/patch` still renders the existing Patch story.
- `/ailments` lists all six ailments with affected-agent and therapy context.
- `/therapies` lists all eight therapies with linked ailment context.
- Malformed and unknown numeric IDs return the branded `404` response.

## 4. Appointment Validation

- The nested form identifies the selected agent and labels therapist, date, and time fields.
- Missing/invalid fields return `422`, write nothing, retain safe input, and expose associated error text.
- A past or impossible date/time is rejected.
- A valid submission writes exactly one appointment and returns `303`.
- The redirect location is the new nested confirmation route.
- Refreshing confirmation does not duplicate the appointment.
- Confirmation displays agent, therapist, timestamp, status, and useful navigation links.
- Unknown appointment IDs and agent/appointment mismatches return `404`.
- JSX escaping prevents therapist-name HTML injection.

## 5. Dashboard Validation

- `/dashboard` returns `200` and shows total agents, open appointments, and active ailments.
- Cancelled appointments are excluded from the open count and queue.
- Open appointments are ordered chronologically and identify agent, therapist, time, and status.
- All six agents appear in the status table.
- Ailment workload counts reflect current agent relationships.
- Empty datasets render explicit states rather than broken or blank tables.

## 6. Errors, Logging, and Security

- Unknown routes return branded HTML with status `404`.
- An induced unexpected exception produces branded HTML with status `500` and no stack trace.
- Request logs contain method, path, status, and duration for success, not-found, and error responses.
- `/health` retains its exact JSON response.
- Static assets remain available.
- Encoded Windows traversal attempts cannot expose source, database, or project files.
- User-controlled values are never emitted as raw HTML.

## 7. Browser and Responsive Validation

At `375px` and `1280px`, Playwright must:

1. Open Home and use each of Agents, Ailments, Therapies, and Dashboard navigation links.
2. Open an agent detail and verify ailments and therapy recommendations.
3. Complete a valid booking and reach confirmation.
4. Verify the new appointment appears on Dashboard.
5. Verify the Patch legacy page remains reachable.

Every checked page must have no page-level horizontal overflow, no overlapping navigation or content, visible focus styles, usable controls, logical headings, and meaningful content with JavaScript disabled.

## 8. Production Smoke Validation

- Starting the compiled server creates/migrates/seeds a configured temporary database before accepting requests.
- Health, all four catalog/dashboard destinations, agent detail, booking, confirmation, 404, and static CSS routes respond correctly.
- A newly booked appointment remains after restarting against the same database.
- Database files are not publicly routable.
- The server and database close cleanly during controlled shutdown.

## 9. Video-Parity Review

The rendered result must visibly contain the course outcome's four top-level destinations and their populated pages:

- Agents: six records plus detail/care context
- Ailments: six populated ailment records
- Therapies: eight populated therapy records
- Dashboard: metrics and operational tables

The review also confirms appointment booking, custom error pages, logging, responsive behaviour, and the reference seed names/statuses. Minor visual styling differences are acceptable; missing information architecture or workflows are not.

## Merge Gate

Merge only when all automated checks pass, the compiled persistence smoke test succeeds, manual video-parity review finds no missing feature, existing Patch behaviour remains intact, and no generated databases, build output, secrets, or local environment files are staged.
