# Phase 1 Requirements — Open the Clinic

## Context

This is the first implementation phase in the AgentClinic roadmap. It proves that the chosen server-side TypeScript stack works end to end before clinic data or larger user workflows are introduced.

The feature supports the mission by opening a small but dependable front door for an approachable AI-agent clinic. It follows the technical constitution by using Node.js, Hono, Hono JSX, strict TypeScript, and Vitest.

## Scope

This phase must:

- Configure a repeatable Hono development and build workflow.
- Expose a machine-readable health endpoint.
- Render a minimal but complete AgentClinic home page on the server.
- Render the page through reusable header, main, and footer components.
- Serve and link the page stylesheet.
- Make application routes testable without starting a listening server.
- Add automated checks for the public route behavior.

## Functional Requirements

### Home Page

- `GET /` returns `200 OK`.
- The response content type is HTML.
- The response is a complete HTML document with `html`, `head`, `title`, and `body` elements.
- The document title identifies the page as `AgentClinic`.
- The HTML contains an `h1` whose text includes `AgentClinic`.
- The visible page includes `AgentClinic is open for business`.
- The document contains semantic `header`, `main`, and `footer` elements.
- The header contains an accessible search form with a search input and labelled submit button.
- The document links `/static/style.css`, and that route returns CSS successfully.
- The page is server-rendered and remains useful without client-side JavaScript.
- The core page content does not depend on browser-side JavaScript.

### Health Check

- `GET /health` returns `200 OK`.
- The response content type is JSON.
- The response body is exactly:

```json
{
  "status": "ok"
}
```

### Server

- The application runs on Node.js.
- The development server uses port `3000` when `PORT` is not set.
- A valid `PORT` environment variable overrides the default.
- Starting the server reports the address or port in the terminal.

## Quality Requirements

- TypeScript strict mode remains enabled.
- The application module must not open a network port when imported by tests.
- The project provides commands for development, type checking, building, and testing.
- Vitest runs in a Node environment and exercises the importable Hono application directly.
- Automated tests cover the home page, health check, stylesheet, and unknown-route behavior.
- The production build emits runnable JavaScript.

## Decisions

1. **Hono on Node.js:** Use Hono with its official Node.js server adapter, consistent with the technical constitution.
2. **Reusable server-rendered shell:** Compose the home page from separate `Layout`, `Header`, `Main`, and `Footer` components. Client-side JavaScript is unnecessary for this phase.
3. **Separate app and server modules:** Export the Hono application from one module and start the network server from another. This prevents tests from binding ports.
4. **Stable health contract:** Use `GET /health` with the minimal `{ "status": "ok" }` response selected during feature discovery.
5. **Automated checks now:** Although broad reliability work comes later, the public behavior introduced here receives focused Vitest coverage.
6. **In-process route testing:** Use Hono's `app.request()` API under Vitest's Node environment to validate responses without binding a port.

## Out of Scope

- Search-result behavior or a search index
- Multi-page navigation beyond the current home-page link
- Database setup or SQLite access
- Agents, ailments, therapies, and appointments
- Dashboard functionality
- Authentication and authorization
- Production deployment or CI configuration
- Custom error pages and structured request logging

These items remain assigned to later roadmap phases.
