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
| Testing | Vitest | Fast, TypeScript-friendly tests with a familiar API |
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
- Keep the network-listening server entry point separate from the importable application.
- Run the complete suite non-interactively with `npm test`.

## Initial Constraints

- Support current versions of major modern browsers.
- Support viewport widths from `375px` mobile screens through `1280px` desktop screens.
- Include the viewport meta tag on every rendered page.
- Keep primary content and controls usable without horizontal page scrolling.
- Use a single Node.js service and a single SQLite database.
- Defer authentication, notifications, and distributed infrastructure until the core clinic workflow is proven.
