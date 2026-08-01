# MVP Plan - Complete AgentClinic

## Task Group 1 - Database Foundation

1. Add SQLite runtime and TypeScript dependencies.
2. Add ordered migrations for agents, ailments, relationships, therapies, therapy recommendations, and appointments.
3. Add migration tracking, database creation, and production-path handling.
4. Copy SQL migrations into the compiled build and ignore generated database files.

## Task Group 2 - Deterministic Clinic Data

1. Define typed database records and query result shapes.
2. Seed the six course agents, six ailments, eight therapies, relationship rows, and three sample appointments.
3. Make seeding transactional and repeatable without duplicates.
4. Add queries for catalogs, details, booking, and dashboard summaries.

## Task Group 3 - Application Composition and Hardening

1. Refactor the Hono application into a database-injected factory.
2. Open, migrate, and seed the persistent database in the server entry point.
3. Add method/path/status/duration request logging.
4. Add branded `404` and safe `500` HTML responses.

## Task Group 4 - Shared Navigation and Home

1. Expand the shared header to Home, Agents, Ailments, Therapies, and Dashboard.
2. Implement correct active-section semantics for all routes.
3. Add home-page entry points into the complete clinic.
4. Preserve the Patch page and connect it to the new catalog.

## Task Group 5 - Agent Directory and Detail

1. Add `/agents` with all agents and readable status labels.
2. Add `/agents/:id` with profile data, ailments, and recommended therapies.
3. Add a booking action for each database-backed agent.
4. Return `404` for malformed and unknown agent IDs while preserving `/agents/patch`.

## Task Group 6 - Ailment and Therapy Catalogs

1. Add `/ailments` with descriptions, affected-agent context, and recommended therapies.
2. Add `/therapies` with descriptions and linked ailments.
3. Render explicit empty states for missing relationships.
4. Link related records to support clinic discovery.

## Task Group 7 - Appointment Journey

1. Add the nested agent appointment form route.
2. Validate therapist, date, time, agent, and future scheduling on the server.
3. Re-render invalid forms with `422`, retained values, and accessible errors.
4. Persist valid appointments using parameterized SQL.
5. Redirect with `303` to a durable confirmation page.
6. Add confirmation links back to the agent and dashboard.

## Task Group 8 - Operational Dashboard

1. Query total agents, open appointments, and active ailments.
2. Render metric cards for those values.
3. Render agent status, open appointment, and ailment workload tables.
4. Use deterministic ordering and clear empty states.

## Task Group 9 - Responsive Visual Completion

1. Replace the oversized light card system with the supplied course video's compact dark visual system.
2. Remove the non-functional header search and align the wordmark and four primary destinations in one desktop row.
3. Reduce the home page to the course heading and `Where AI agents come to get better.` introduction.
4. Render Agents, Ailments, and Therapies as the course-reference tables with alphabetical records and matching descriptions.
5. Extend the same typography, spacing, borders, links, forms, and action treatment to details, booking, confirmation, dashboard, and errors.
6. Convert table rows to labelled stacked records on narrow screens.
7. Keep primary navigation visible and usable from `375px` through `1280px`.
8. Prevent page-level overflow and preserve visible keyboard focus.

## Task Group 10 - Automated Coverage

1. Test migrations and repeatable seeding on isolated databases.
2. Test catalog/detail queries, booking persistence, and dashboard aggregation.
3. Test every public route, validation boundary, redirect, and error response.
4. Retain existing security and Patch regression coverage.
5. Extend Playwright across the four navigation sections and booking journey at mobile and desktop widths.
6. Smoke-test the compiled server with copied migrations and persistent SQLite data.

## Task Group 11 - Merge Readiness

1. Run typecheck, Vitest, build, and Playwright.
2. Run dependency audit and `git diff --check`.
3. Review the result against the course reference navigation, data, and workflows.
4. Update roadmap completion state only after all gates pass.
