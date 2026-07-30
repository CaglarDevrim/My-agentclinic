# Roadmap

Work is divided into very small, reviewable phases. Following the selected end-to-end-first strategy, the earliest phases establish a thin but complete clinic journey before individual areas are expanded.

## Phase 1 — Open the Clinic

- Configure Hono and the development server
- Add a health check
- Render a simple home page

## Phase 2 — Shared Page Shell

- Add header, navigation, main content, and footer components
- Add a small responsive CSS foundation
- Render a consistent shell for every page

## Phase 3 — Thin Clinic Journey

- Seed one agent, one ailment, and one therapy
- Show the agent and its care recommendation on one page
- Provide a minimal appointment request form

## Phase 4 — Appointment Completion

- Validate an appointment request
- Save it to SQLite
- Show a confirmation page

At this point, one agent can move through a complete discovery-to-booking workflow.

## Phase 5 — Minimal Dashboard

- Show counts for agents and appointments
- Show the next scheduled appointment
- Link to the working clinic journey

## Phase 6 — Agent Directory

- Add the agents table and seed records
- List agents
- Show one agent’s details and ailments

## Phase 7 — Ailment Catalog

- Add the ailments table
- List and view ailments
- Associate agents with ailments

## Phase 8 — Therapy Catalog

- Add the therapies table
- List and view therapies
- Associate recommended therapies with ailments

## Phase 9 — Appointment Management

- List appointments for staff
- Add appointment status changes
- Handle unavailable or invalid appointment times

## Phase 10 — Dashboard Expansion

- Add useful clinic summaries
- Surface upcoming and unresolved work
- Add links to common staff actions

## Phase 11 — Responsive and Accessible Polish

- Refine layouts for small and large screens
- Verify semantic structure and keyboard navigation
- Add clear focus, validation, and error states

## Phase 12 — Reliability Hardening

- Add route, component, and database tests
- Add not-found and server-error pages
- Add structured request logging
- Verify production build and startup

## Deferred

Authentication, notifications, therapist profiles, reporting, and multi-site operation remain outside the initial roadmap.
