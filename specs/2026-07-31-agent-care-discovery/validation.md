# Phase 2 Slice Validation — Agent Care Discovery

All required checks must pass before `feature/agent-care-discovery` can be merged.

## 1. Static Validation

Run from `my-agentclinic`:

```sh
npm run typecheck
```

Success means:

- The command exits with code `0`.
- No TypeScript errors are reported.
- Strict mode remains enabled.
- Agent, Ailment, and Therapy use explicit TypeScript types or interfaces.
- Route rendering obtains its content from the typed seed data.

## 2. Production Build

Run:

```sh
npm run build
```

Success means:

- The command exits with code `0`.
- Runnable JavaScript is emitted to the configured output directory.
- No new runtime dependency is required for the feature.

## 3. Automated Route Validation

Run:

```sh
npm test
```

Success means all tests pass and demonstrate:

- `GET /agents/patch` returns `200` and an HTML content type.
- The response is a complete HTML document with the standard viewport metadata.
- The document title and primary heading identify Patch and AgentClinic.
- The visible response contains `Patch`, `Context Window Fatigue`, and `Prompt-Free Rest`.
- The page includes explanatory recommendation copy and semantically distinguishes the agent, ailment, and therapy content.
- The page reuses the shared `header`, `main`, and `footer` landmarks.
- Both `/` and `/agents/patch` include an accessibly labelled `nav` with links to Home and Patch's page.
- The agent page contains no client-side script dependency.
- `GET /agents/unknown` returns `404`.
- The stylesheet includes fluid content sizing, visible keyboard-focus styling, and rules that reflow the navigation and care content for narrow screens.
- Existing home page, health check, stylesheet, and general unknown-route tests continue to pass.

## 4. Running-Server Smoke Test

Start the application:

```sh
npm run dev
```

Then verify:

```sh
curl -i http://localhost:3000/
curl -i http://localhost:3000/agents/patch
curl -i http://localhost:3000/agents/unknown
```

Success means:

- The server starts without an exception.
- `/` and `/agents/patch` return `HTTP 200`.
- `/agents/unknown` returns `HTTP 404`.
- Patch's page returns the required server-rendered care recommendation.
- Following the rendered Home and Patch links moves between the two available pages.

## 5. Browser and Accessibility Validation

Open `/agents/patch` in a current major browser.

Success means:

- The browser tab title identifies Patch and AgentClinic.
- Patch is the primary page heading.
- Agent, ailment, and therapy information is visually distinct and understandable.
- The explanation makes the relationship between Context Window Fatigue and Prompt-Free Rest clear.
- Home and Patch navigation links are visible, work correctly, and have a visible keyboard focus state.
- The existing search form remains visible and accessibly labelled.
- All core content and navigation remain usable when client-side JavaScript is disabled.

Verify at `375px` viewport width:

- Navigation and header content reflow without overlap.
- Links remain easy to activate.
- Long names and descriptive text wrap without clipping.
- The page has no horizontal scrolling.

Verify at `1280px` viewport width:

- Agent and care content use a bounded readable width.
- Navigation, content, and footer use the available space without excessive stretching.

## 6. Scope Validation

Confirm the implementation does not add:

- An agent listing or directory page
- SQLite, migrations, or persistent seed records
- Appointment forms, validation, saving, or confirmation
- Clinic-hour definitions
- Staff dashboard behavior
- Search-result behavior

## Merge Gate

The feature is ready to merge only when:

- Every validation section above passes.
- The implementation stays within the documented discovery-only scope.
- No existing public route regresses.
- No secrets, generated dependency directories, build output, or local environment files are added to version control.
- The roadmap, mission, and tech-stack constraints remain satisfied.
