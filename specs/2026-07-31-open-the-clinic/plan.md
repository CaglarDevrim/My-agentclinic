# Phase 1 Plan — Open the Clinic

## Task Group 1 — Configure the Toolchain

1. Add Hono and the Hono Node.js server adapter as runtime dependencies.
2. Add `tsx` and Vitest as development dependencies.
3. Update TypeScript for Hono JSX and the Node.js runtime while retaining strict type checking.
4. Add scripts for development, type checking, production builds, and tests.

## Task Group 2 — Build the Application

1. Create an importable Hono application separately from the process that starts the server.
2. Add `GET /health`, returning a `200` JSON response with `{ "status": "ok" }`.

## Task Group 3 — Create the Minimal Home Page

1. Create a small Hono JSX home-page component.
2. Render a complete HTML document with a descriptive page title.
3. Add an `h1` containing `AgentClinic`.
4. Add the visible message `AgentClinic is open for business`.
5. Connect `GET /` to the component and return it as server-rendered HTML.

## Task Group 4 — Start the Server

1. Replace the placeholder entry point with a Node.js server entry point.
2. Serve the Hono application on port `3000` by default.
3. Allow the port to be overridden through the `PORT` environment variable.
4. Log the local address when the server starts.

## Task Group 5 — Add Automated Route Checks

1. Add a Vitest suite that calls the importable application without opening a network port.
2. Verify `/health` returns status `200`, JSON content, and the agreed payload.
3. Verify `/` returns status `200` and an HTML content type.
4. Verify the home page contains the expected title, `AgentClinic` heading, and opening message.
5. Verify an unknown route returns `404`.

## Task Group 6 — Verify the Feature

1. Run the type check.
2. Run the production build.
3. Run the automated test suite.
4. Start the development server and smoke-test both routes.
5. Open the home page in a modern browser and confirm that the complete HTML document renders meaningful content without client-side JavaScript.
