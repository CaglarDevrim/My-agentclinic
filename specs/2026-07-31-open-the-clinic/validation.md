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
- The home-page response begins with an HTML5 doctype and contains `html`, `head`, `title`, and `body` elements.
- The document title contains `AgentClinic`.
- The document contains semantic `header`, `main`, and `footer` elements.
- The home-page HTML contains an `h1` with `AgentClinic`.
- The home page contains `AgentClinic is open for business`.
- The header contains an accessible search form, search input, labelled submit button, and search icon.
- `GET /static/style.css` returns `200`, a CSS content type, and the expected search-form styles.
- The page contains no client-side script dependency.
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
- The header, search form, main content, and footer are visible and styled.
- The search form remains usable at narrow viewport widths.
- The content remains present when client-side JavaScript is disabled.

Search-result behavior and multi-page navigation are not merge requirements in this phase.

## Merge Gate

The feature is ready to merge only when:

- Every validation section above passes.
- The implementation stays within the documented scope.
- No secrets, generated dependency directories, or local environment files are added to version control.
- The roadmap, mission, and tech-stack constraints remain satisfied.
