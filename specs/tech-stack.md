# Tech Stack

AgentClinic is a server-rendered TypeScript web application. The stack favors reliability, a small operational footprint, and straightforward development.

## Core Choices

| Layer | Choice | Rationale |
|---|---|---|
| Language | TypeScript | Provides type safety across routes, domain models, and views |
| Runtime | Node.js | Mature, popular, and widely supported |
| Web framework | Hono | TypeScript-first, lightweight, and well suited to server-rendered applications |
| Rendering | Hono JSX | Produces accessible HTML on the server with reusable typed components |
| Styling | Plain CSS with custom properties | Keeps the browser experience fast and the visual system easy to maintain |
| Data store | SQLite with `better-sqlite3` | Provides durable local data with minimal infrastructure |
| Database changes | Versioned SQL migrations | Keeps schema evolution explicit and reviewable |
| Testing | Vitest and Playwright | Vitest covers routes and domain behavior; Playwright verifies compiled browser behavior at required viewports |
| Development | `tsx` | Runs TypeScript directly during development |
| Production build | `tsc` | Creates checked JavaScript output for Node.js |

## Architecture Principles

- Render useful HTML on the server; JavaScript is not required for core workflows.
- Keep routes, domain logic, persistence, and presentation separate.
- Validate all external input at the application boundary.
- Prefer semantic HTML and progressive enhancement.
- Build layouts mobile-first with fluid sizing, flexible grids, and content-driven breakpoints.
- Avoid fixed page widths or controls that create horizontal scrolling on narrow screens.
- Keep dependencies few and introduce new infrastructure only when a demonstrated need appears.

## Testing Strategy

- Use Vitest in its Node environment for automated validation.
- Import the Hono application and call `app.request()` so route tests do not open a network port.
- Cover response status, content type, payload, semantic page structure, and static assets.
- Use Playwright against the compiled application for responsive layout, navigation, focus, and production-server checks.
- Run browser checks at the required `375px` and `1280px` viewport widths.
- Keep the network-listening server entry point separate from the importable application.
- Run the complete validation suite non-interactively with `npm run validate`.

## Operations and Quality Standards

- Read deployment-specific values from validated environment configuration and provide safe local defaults where appropriate.
- Apply versioned migrations and deterministic seeds before the production server accepts requests.
- Keep automated tests isolated from development and production SQLite files.
- Log request method, path, status, and duration without recording secrets or sensitive form values.
- Return branded, non-sensitive not-found and server-error responses.
- Validate and normalize every request-derived value before persistence, and use parameterized SQL for database writes and lookups.
- Escape user-controlled output through server-rendered JSX and never insert it as raw HTML.
- Treat semantic structure, visible focus, labelled controls, understandable errors, and keyboard operation as merge requirements.
- Require responsive validation at `375px` and `1280px`, with no page-level horizontal overflow.
- Use `npm run validate` as the merge gate for type checking, route and database tests, production compilation, and Playwright coverage.
- Run dependency auditing and `git diff --check` before merging dependency or release changes.

## External Content and Maps

- Prefer a visible textual clinic address and an accessible link to an external map provider.
- Do not require an embedded map, third-party tracking script, map SDK, or API key for the About page.
- Provide meaningful link text and preserve the address when the external map provider is unavailable.

## Initial Constraints

- Support current versions of major modern browsers.
- Support viewport widths from `375px` mobile screens through `1280px` desktop screens.
- Include the viewport meta tag on every rendered page.
- Keep primary content and controls usable without horizontal page scrolling.
- Use a single Node.js service and a single SQLite database.
- Defer authentication, notifications, and distributed infrastructure until the core clinic workflow is proven.
