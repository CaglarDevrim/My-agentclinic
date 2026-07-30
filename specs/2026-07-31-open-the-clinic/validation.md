# Phase 1 Validation — Open the Clinic

All required checks must pass before `feature/open-the-clinic` can be merged.

## 1. Static Validation

Run:

```sh
npm run typecheck
```

Success means:

- The command exits with code `0`.
- No TypeScript errors are reported.
- Strict mode remains enabled.

## 2. Production Build

Run:

```sh
npm run build
```

Success means:

- The command exits with code `0`.
- Runnable JavaScript is emitted to the configured output directory.

## 3. Automated Route Validation

Run:

```sh
npm test
```

Success means all tests pass and demonstrate:

- `GET /health` returns `200`, a JSON content type, and exactly `{ "status": "ok" }`.
- `GET /` returns `200` and an HTML content type.
- The home-page response is a complete HTML document with `html`, `head`, `title`, and `body` elements.
- The document title contains `AgentClinic`.
- The home-page HTML contains an `h1` with `AgentClinic`.
- The home page contains `AgentClinic is open for business`.
- An unknown route returns `404`.
- Importing the application for testing does not start a network server.

## 4. Running-Server Smoke Test

Start the application:

```sh
npm run dev
```

Then verify:

```sh
curl -i http://localhost:3000/health
curl -i http://localhost:3000/
```

Success means:

- The server starts without an exception and reports its address or port.
- Both requests return `HTTP 200`.
- `/health` returns the required JSON body.
- `/` returns the required HTML content.

Repeat the startup with a non-default valid `PORT` value and confirm the server listens on that port.

## 5. Browser Validation

Open the home page in a current major browser.

Success means:

- The page loads without a browser error.
- The browser tab title identifies the page as `AgentClinic`.
- `AgentClinic` appears as the primary heading.
- `AgentClinic is open for business` is visible.
- The content remains present when client-side JavaScript is disabled.

Visual polish, shared navigation, and a reusable layout are not merge requirements in this phase; the shared page shell and responsive CSS belong to Phase 2.

## Merge Gate

The feature is ready to merge only when:

- Every validation section above passes.
- The implementation stays within the documented scope.
- No secrets, generated dependency directories, or local environment files are added to version control.
- The roadmap, mission, and tech-stack constraints remain satisfied.
