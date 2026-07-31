# Roadmap

Work is divided into very small, reviewable phases. Following the selected end-to-end-first strategy, the earliest phases establish a thin but complete clinic journey before individual areas are expanded.

Responsive behavior is a product-wide requirement for every phase, not work deferred until final polish. Each new page and workflow must support mobile, tablet, and desktop layouts when it is introduced.

## Phase 1 — Open the Clinic ✅

- Configure Hono and the development server
- Add a health check
- Render a simple home page

## Phase 2 — Complete Clinic Journey and Dashboard

- Add navigation destinations as new pages become available
- Reuse the shared header, main content, and footer across every page
- Expand the responsive CSS foundation for multi-page content
- Seed one agent, one ailment, and one therapy
- Show the agent and its care recommendation on one page
- Provide a minimal appointment request form
- Validate an appointment request
- Save it to SQLite
- Show a confirmation page
- Show counts for agents and appointments
- Show the next scheduled appointment
- Link to the working clinic journey

At this point, one agent can move through a complete discovery-to-booking workflow, and clinic staff can see its key activity from the dashboard.

## Phase 3 — Agent Directory

- Add the agents table and seed records
- List agents
- Show one agent’s details and ailments

## Phase 4 — Ailment Catalog

- Add the ailments table
- List and view ailments
- Associate agents with ailments

## Phase 5 — Therapy Catalog

- Add the therapies table
- List and view therapies
- Associate recommended therapies with ailments

## Phase 6 — Appointment Management

- List appointments for staff
- Add appointment status changes
- Handle unavailable or invalid appointment times

## Phase 7 — Dashboard Expansion

- Add useful clinic summaries
- Surface upcoming and unresolved work
- Add links to common staff actions

## Phase 8 — Responsive and Accessible Polish

- Audit and refine the responsive behavior delivered throughout earlier phases
- Verify semantic structure and keyboard navigation
- Add clear focus, validation, and error states

## Phase 9 — Reliability Hardening

- Add route, component, and database tests
- Add not-found and server-error pages
- Add structured request logging
- Verify production build and startup

## Deferred

Authentication, notifications, therapist profiles, reporting, and multi-site operation remain outside the initial roadmap.
