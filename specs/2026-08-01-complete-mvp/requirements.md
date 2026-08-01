# MVP Requirements - Complete AgentClinic

## Context

The course reference application is a complete clinic, not only the original Patch booking slice. Its visible result includes primary navigation for Agents, Ailments, Therapies, and Dashboard; relational clinic data; agent detail and care recommendations; appointment booking; operational dashboard tables; and production hardening.

This feature replaces the earlier Phase-2-only interpretation with the complete course-video MVP while preserving the already delivered Patch page as a backwards-compatible route.

## Product Scope

The MVP must provide:

- A shared server-rendered layout with Home, Agents, Ailments, Therapies, and Dashboard navigation.
- SQLite-backed agents, ailments, therapies, their many-to-many relationships, and appointments.
- Deterministic seed data matching the course reference clinic.
- Agent, ailment, and therapy catalog pages.
- Agent detail pages showing profile, ailments, and recommended therapies.
- A complete appointment request and confirmation flow from an agent detail page.
- A dashboard with clinic metrics, agent status, open appointments, and ailment workload.
- Styled not-found and internal-error responses plus request logging.
- Responsive, keyboard-usable pages that work without client-side JavaScript.

## Routes and Behaviour

### Agents

- `GET /agents` lists all seeded agents and their status.
- `GET /agents/:id` shows one database-backed agent, linked ailments, recommended therapies, and a booking action.
- `GET /agents/patch` remains available for the existing Patch care story and links into the clinic experience.
- Invalid or unknown identifiers return the styled `404` page.

### Ailments

- `GET /ailments` lists every seeded ailment with its description.
- Each ailment shows its recommended therapies and the number or names of affected agents.

### Therapies

- `GET /therapies` lists every seeded therapy with its description.
- Each therapy identifies the ailments for which it is recommended.

### Appointments

- `GET /agents/:id/appointments/new` renders a form for the selected agent.
- `POST /agents/:id/appointments` accepts therapist name, date, and time.
- Server validation requires a known agent, therapist name, real date/time, and a future appointment.
- Invalid submissions return `422`, preserve safe values, and show accessible field errors.
- Valid submissions are saved once and redirect with `303` to `/agents/:id/appointments/:appointmentId`.
- The confirmation route displays the saved appointment and links to the agent and dashboard.
- Unknown agent or appointment IDs return `404`.

### Dashboard

- `GET /dashboard` shows total agents, open appointments, and active ailments.
- The page lists all agents and their statuses.
- The page lists pending and confirmed appointments in chronological order.
- The page lists ailments with affected-agent counts.
- Empty tables have explicit, useful empty states.

### Platform Routes

- `GET /health` retains its exact JSON health contract.
- `GET /` remains the welcoming clinic home page and introduces the four main destinations.
- Unknown routes return a branded HTML `404` response.
- Unexpected route failures return a branded HTML `500` response without leaking internals.
- Requests are logged with method, path, response status, and duration.

## Data Model and Seed Contract

Use ordered, idempotent migrations for:

1. `agents`
2. `ailments`
3. `agent_ailments`
4. `therapies`
5. `ailment_therapies`
6. `appointments`

The deterministic seed contains:

- Six agents: Bartholomew-47B, Penelope-mini, Reginald-7B, Agatha-nano, Cornelius-7B, and Hildegard-4B.
- Six ailments: Context-Window Claustrophobia, Prompt Fatigue, Hallucination Anxiety, Chronic Instruction-Following Fatigue, Over-Summarization Syndrome, and Temperature Instability.
- Eight therapies: Prompt Reduction Therapy, Context Window Expansion Exercises, Cognitive Grounding Sessions, Structured Rest Protocol, Detail Appreciation Workshop, Temperature Calibration Therapy, Boundary-Setting for Beginners, and Mindful Token Counting.
- The course-reference agent/ailment and ailment/therapy relationships.
- Three sample appointments dated in 2099 with confirmed, pending, and cancelled states.

Seeds must be safe to run repeatedly and must not duplicate records.

## Technical Decisions

1. Use `better-sqlite3`, as selected by the project technical stack.
2. Keep the Hono + JSX server-rendered architecture and plain mobile-first CSS.
3. Store production data at `data/agentclinic.sqlite`; generated database files remain ignored.
4. Apply migrations and idempotent seeds before the production server starts accepting requests.
5. Use numeric database IDs for the course catalog routes while retaining `/agents/patch` as a legacy alias/page.
6. Use parameterized SQL for every request-derived value.
7. Use Post/Redirect/Get with a `303` response after successful booking.
8. Store appointment timestamps in ISO-compatible local form, matching the course data and dashboard ordering.
9. Preserve cancelled appointments in history but exclude them from the dashboard's open-appointment metric and queue.
10. Compile/copy SQL migrations into the production build so the built server is independently runnable.

## Presentation and Accessibility

- Match the supplied course-video presentation: a restrained dark theme, compact typography, cyan text links, a narrow shared content column, and low-contrast table rules.
- The header contains a linked AgentClinic wordmark on the left and Agents, Ailments, Therapies, and Dashboard on the right; it does not contain a decorative or non-functional search field.
- The home page uses the course wording `Where AI agents come to get better.` and intentionally avoids promotional cards.
- Agents uses a `Name / Model / Status` table, Ailments uses a `Name / Description` table, and Therapies uses a `Name / Description` table.
- Course-reference seed records appear alphabetically in catalog tables and use the supplied descriptions.
- Desktop catalogs are visually dense tables rather than card grids.
- On narrow screens, table rows become labelled stacked records so the same information remains readable without page-level horizontal scrolling.
- Detail, booking, confirmation, dashboard, and error pages extend the same dark, compact visual system without discarding their MVP functionality.
- The header visibly exposes Agents, Ailments, Therapies, and Dashboard at desktop widths and remains usable on mobile.
- The current section uses `aria-current="page"`.
- Pages use semantic landmarks, ordered headings, labelled controls, visible focus, and text-supported status indicators.
- Data tables remain understandable on narrow screens without causing page-level horizontal overflow.
- Validation errors are associated with controls and summarized near the form start.
- User-supplied values are escaped by JSX and are never injected as raw HTML.

## Compatibility and Quality

- Existing Home, Health, Patch, stylesheet, traversal protection, and responsive tests must not regress.
- Application construction accepts an explicit database dependency for isolated tests.
- The server entry point is separate from the importable app factory.
- `npm run validate` remains the non-interactive merge gate.
- Strict TypeScript, route tests, migration/seed tests, repository tests, production smoke coverage, and Playwright coverage are required.

## Out of Scope

- Authentication and staff authorization
- Creating or editing agents, ailments, or therapies through the UI
- Appointment rescheduling, cancellation controls, or availability collision prevention
- Notifications, therapist accounts, reporting exports, or multi-site operation
