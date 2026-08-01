# Roadmap

Work is divided into very small, reviewable phases. Following the selected end-to-end-first strategy, the earliest phases establish a thin but complete clinic journey before individual areas are expanded.

Responsive behavior is a product-wide requirement for every phase, not work deferred until final polish. Each new page and workflow must support mobile, tablet, and desktop layouts when it is introduced.

## Phase 1 — Open the Clinic ✅

- Configure Hono and the development server
- Add a health check
- Render a simple home page

## Phase 2 — Complete Clinic Journey and Dashboard ✅

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

## Phase 3 — Agent Directory ✅

- Add the agents table and seed records
- List agents
- Show one agent’s details and ailments

## Phase 4 — Ailment Catalog ✅

- Add the ailments table
- List and view ailments
- Associate agents with ailments

## Phase 5 — Therapy Catalog ✅

- Add the therapies table
- List and view therapies
- Associate recommended therapies with ailments

## Phase 6 — Appointment Management

- List appointments for staff
- Add appointment status changes
- Handle unavailable or invalid appointment times

The course-video MVP now lists open appointments on the dashboard and rejects invalid or past appointment times. Staff-driven status changes and slot-collision handling remain post-MVP work.

## Phase 7 — Dashboard Expansion ✅

- Add useful clinic summaries
- Surface upcoming and unresolved work
- Add links to common staff actions

## Phase 8 — Responsive and Accessible Polish ✅

- Audit and refine the responsive behavior delivered throughout earlier phases
- Verify semantic structure and keyboard navigation
- Add clear focus, validation, and error states

## Phase 9 — Reliability Hardening ✅

- Add route, component, and database tests
- Add not-found and server-error pages
- Add structured request logging
- Verify production build and startup

## Phase 10 — Feedback Persistence Foundation

- Define the minimal feedback record and repository boundary
- Add an ordered SQLite migration for feedback submissions
- Add isolated migration, persistence, and repeatable-startup tests

## Phase 11 — Public Feedback Journey

- Add a public feedback form linked from the shared site navigation or footer
- Validate required feedback fields at the server boundary
- Save valid submissions and use Post/Redirect/Get for confirmation
- Add accessible validation, responsive layout, route tests, and browser coverage

At this point, visitors can submit feedback reliably without requiring client-side JavaScript.

## Phase 12 — Staff Feedback Review

- Add a dashboard destination for stored feedback
- List submissions in a deterministic order with a useful empty state
- Keep user-provided content escaped and readable on mobile and desktop
- Add dashboard aggregation, route, and browser regression tests

## Phase 13 — Review Approval Workflow

- Add an explicit approval state to stored feedback
- Let staff approve or withdraw feedback for public display
- Validate state transitions and preserve unapproved feedback as private clinic data
- Add persistence, authorization-boundary preparation, and failure-path tests

## Phase 14 — Public Customer Reviews

- Add a public customer-reviews page
- Show approved feedback only and omit private submission details
- Add navigation, empty-state, responsive, accessibility, and browser coverage

## Phase 15 — About and Clinic Address

- Add an About page describing AgentClinic's mission and audience
- Show a visible, accessible clinic address
- Keep address content configurable without introducing a client framework
- Add semantic, responsive, and route validation

## Phase 16 — External Map Link and Hardening

- Add an accessible external map link derived from the displayed address
- Avoid embedded tracking, map SDKs, and API keys
- Verify safe external-link behavior and a useful no-provider fallback
- Run the complete validation, dependency audit, and production smoke gates

## Deferred

Authentication enforcement, notifications, therapist profiles, reporting, embedded maps, and multi-site operation remain outside the initial roadmap.
