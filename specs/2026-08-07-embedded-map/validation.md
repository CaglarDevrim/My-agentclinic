# Privacy-Preserving Embedded Map Validation

All required checks must pass before `phase-9-embedded-map` can be merged.

## 1. Complete Automated Gate

Run:

```sh
npm run validate
npm audit --audit-level=moderate
git diff --check
```

Success requires zero typecheck, unit, route, database-regression, browser, production-build, dependency-audit, or whitespace failures.

## 2. Route and Initial Document Contract

- `GET /about` returns `200 OK` with an HTML content type, `About | AgentClinic`, and one `About AgentClinic` H1.
- The response preserves the exact fictional address, demonstration disclosure, and secured external OpenStreetMap search link.
- The initial HTML includes the local About map enhancement script and contains no iframe, external script, map image, tile URL, preload, preconnect, SDK, API key, geolocation behavior, or request-derived map value.
- The privacy explanation states that loading the interactive map contacts OpenStreetMap and may share IP address and browser information.
- Unknown About subpaths and unsupported methods continue through branded not-found handling.

## 3. Progressive Enhancement and Privacy Boundary

- With JavaScript disabled or the local script blocked, the address and external link remain visible and the non-functional load control is not offered.
- Loading `/about` with JavaScript enabled initializes the control without making any request to an OpenStreetMap host.
- Keyboard or pointer activation initiates the first provider request and inserts exactly one iframe.
- The iframe source is the fixed HTTPS export URL centered on `37.7765, -122.3950` and is never influenced by query strings, headers, cookies, form values, or stored data.
- The iframe has the title `Interactive map showing the fictional AgentClinic location`, lazy loading, and `referrerpolicy="no-referrer"`.
- Repeated activation creates no second iframe or provider request.
- Reloading the page restores the pre-activation state; no consent value appears in cookies, local storage, session storage, URLs, sessions, or the database.

## 4. Failure and Fallback Behavior

- Playwright aborts the OpenStreetMap embed request after activation and observes no application navigation, unhandled page error, server error, or automatic retry.
- The exact address, fictional notice, privacy disclosure, and external map link remain visible and operable after the blocked request.
- The external link remains a normal user-initiated new-tab fallback with `target="_blank"` and `rel="noopener noreferrer"`.
- Provider availability is not required for the server response or the automated validation suite.

## 5. Accessibility and Responsive Browser Validation

At `375px x 812px` and `1280px x 800px`, Playwright must:

1. Reach `/about` through primary navigation and verify About is the sole active primary item.
2. Verify the address, fictional notice, privacy disclosure, activation control, and external fallback link are visible.
3. Reach the activation control by keyboard and confirm the established visible focus treatment.
4. Activate it and verify the accessible status, labelled map region, single titled iframe, and preserved fallback content.
5. Confirm the page remains keyboard usable and does not create document-level horizontal overflow before or after activation.
6. Confirm the shared footer and all unrelated navigation labels remain unchanged.

## 6. Security and Regression

- Source and built output contain no inline map script, provider SDK, API token, analytics, tracking pixel, geolocation call, raw HTML injection, or user-controlled provider URL.
- No dependency, migration, table, seed, environment variable, staff permission, public form, or API route is added.
- Existing health, clinic discovery, booking, feedback, reviews, authentication, therapist schedules, notifications, reporting, static security, logging, and branded-error tests continue to pass.
- The compiled production application provides the same About and static-script behavior as the importable test application.
- No local database, build output, browser report, secret, or environment file is staged.

## Definition of Done

- Every automated gate and both required viewport suites pass.
- Recorded browser network evidence proves zero OpenStreetMap requests before explicit activation and one embed request after activation.
- The interactive map remains an optional enhancement; the address and external link remain the dependable no-JavaScript and provider-failure experience.
- The implementation contains no persistence, API key, SDK, new dependency, multi-site behavior, timezone work, or unrelated product expansion.
- Only after these conditions pass may Phase 9 be marked complete and `Embedded maps` be removed from the deferred roadmap list.
