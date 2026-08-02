# Roadmap

The existing AgentClinic application is the completed MVP baseline. New roadmap phases are ordered from `TODO.md` and are intentionally small, reviewable product increments.

Responsive behavior, accessibility, server-side validation, persistence tests, and production-browser coverage are requirements of every phase rather than work deferred until the end.

## Completed MVP Baseline ✅

- Hono, TypeScript, server-rendered JSX, health check, and production startup
- Shared responsive layout and primary clinic navigation
- SQLite migrations and deterministic agent, ailment, therapy, and appointment seeds
- Agent directory and care details
- Ailment and therapy catalogs
- Appointment booking, validation, persistence, and confirmation
- Staff dashboard with clinic summaries and open appointments
- Branded error pages, request logging, security checks, and automated validation

## Phase 1 — Feedback Form ✅

- Add the minimal feedback persistence model and ordered migration
- Add a public feedback form using established server-rendered patterns
- Validate submissions at the application boundary
- Save valid feedback through Post/Redirect/Get and show confirmation
- Add accessible errors, responsive presentation, route/database tests, and browser coverage

At this point, visitors can submit dependable feedback without requiring client-side JavaScript.

## Phase 2 — Customer Reviews ✅

- Add staff review and approval of stored feedback
- Add a public customer-reviews page
- Publish approved feedback only and keep private submission details private
- Add empty, success, responsive, accessibility, and moderation-state coverage

## Phase 3 — About Us, Address, and Map ✅

- Add an About page describing AgentClinic's mission and audience
- Show a visible, accessible clinic address
- Add an accessible link to an external map provider
- Avoid embedded tracking, map SDKs, and API keys
- Add semantic, responsive, external-link, and production-browser validation

## Phase 4 — Appointment Status Management and Slot-Collision Enforcement ✅

- Add controlled pending, confirmed, and cancelled appointment transitions to the staff dashboard
- Protect open therapist slots with normalized application checks and database uniqueness
- Release cancelled slots and return accessible booking conflicts without losing form values
- Add migration, persistence, concurrency, route, responsive, accessibility, and production-browser coverage

## Phase 5 — Staff Authentication and Authorization ✅

- Add individual staff accounts with versioned scrypt password hashes and secure operator provisioning
- Protect every dashboard read and mutation with revocable, expiring database sessions
- Add secure login/logout, safe return paths, failure throttling, same-origin validation, and CSRF enforcement
- Add migration, crypto, session, authorization, security, responsive, and production-browser coverage

## Deferred

- Notifications and reminders
- Therapist accounts and schedules
- Reporting, embedded maps, multi-site operation, and timezone coordination
