# About Us, Address, and Map Validation

All required checks must pass before `phase-3-about-location` can be merged.

## 1. Complete Automated Gate

Run:

```sh
npm run validate
npm audit --audit-level=moderate
git diff --check
```

Success requires zero typecheck, route, database-regression, browser, production-build, dependency-audit, or whitespace failures.

## 2. Route and Document Contract

- `GET /about` returns `200 OK` with an HTML content type.
- The response contains a complete HTML document with language, viewport metadata, shared stylesheet, header, primary navigation, main landmark, and footer.
- The document title is `About | AgentClinic`.
- Exactly one page-level H1 reads `About AgentClinic`.
- The page contains semantic Mission, Who We Serve, Core Services, and Visit AgentClinic sections in a logical heading hierarchy.
- The route works without client-side JavaScript and emits no core `<script>` dependency.
- Unknown About subpaths and unsupported methods follow existing branded not-found handling without exposing stack traces or paths.

## 3. Content Accuracy and Boundaries

- Mission copy identifies AgentClinic as a playful but practical clinic for overworked AI agents.
- Audience copy identifies AI agents and clinic staff without presenting secondary demonstration audiences as the primary users.
- Service copy mentions only implemented capabilities: ailments, therapies, appointments, feedback, and approved customer reviews.
- The page does not promise notifications, staff accounts, schedules, real medical treatment, embedded maps, or other deferred functionality.
- The location section plainly identifies AgentClinic and the address as fictional demonstration content.

## 4. Address and Map Link

- One semantic `<address>` contains the exact visible text `42 Context Window Way, San Francisco, CA 94107`.
- The address is present independently of the map anchor and remains readable without external network access.
- The OpenStreetMap anchor uses the exact HTTPS URL specified in requirements.
- The anchor's accessible text names OpenStreetMap, communicates the destination, and says it opens in a new tab.
- The anchor contains `target="_blank"` and a `rel` value containing both `noopener` and `noreferrer`.
- The URL is fixed in application code and contains no request-derived values.
- Automated tests inspect link attributes but do not require navigation to or availability of OpenStreetMap.

## 5. No Embed, Tracking, or New Infrastructure

- About markup contains no iframe, map tile, external image, third-party script, geolocation request, analytics tag, tracking pixel, or hidden provider content.
- Source and built output contain no map SDK import, API-key field, provider token, new environment variable, or map-specific dependency.
- Phase 3 adds no migration, table, seed record, repository operation, form submission, database write, or client-side state.
- The dependency lockfile remains unchanged unless an unrelated approved change is explicitly introduced outside this feature.

## 6. Navigation and Shared Layout

- Primary navigation contains exactly Agents, Ailments, Therapies, Customer Reviews, About, and Dashboard, in that order.
- About points to `/about` and has `aria-current="page"` on the About page.
- About is not active on home, catalog, detail, appointment, dashboard, moderation, feedback, reviews, or error pages.
- Existing active states for Agents, Ailments, Therapies, Customer Reviews, and Dashboard remain correct.
- The footer still contains exactly the existing Feedback and Customer Reviews links.
- The AgentClinic wordmark remains a working home link.

## 7. Accessibility and Responsive Presentation

- The page uses one H1 followed by understandable H2 section labels and semantic landmarks.
- The `<address>` is styled for readability and is not dependent on default italic presentation.
- The map link is understandable out of context, keyboard reachable, and visibly focused.
- Link meaning and fictional-address status do not depend on color, layout, or an icon.
- Long text and the address wrap without clipping or overlap.
- At `375px`, the primary navigation remains contained and does not create document-level horizontal scrolling.
- At `1280px`, content stays within the established readable site width and uses the existing visual hierarchy.

## 8. Browser Validation

At `375px × 812px` and `1280px × 800px`, Playwright must:

1. Open the home page and verify About appears between Customer Reviews and Dashboard in primary navigation.
2. Reach `/about` through that link and verify the About link becomes the sole active primary item.
3. Verify the H1, mission, audience, service summary, fictional notice, exact address, and OpenStreetMap link are visible.
4. Inspect the map anchor's exact destination, new-tab target, and `noopener noreferrer` relationship without leaving the test application.
5. Reach the map link by keyboard, confirm visible focus, and verify the address remains visible.
6. Confirm the footer retains Feedback and Customer Reviews and that no iframe or script exists.
7. Confirm the document has no page-level horizontal overflow.

## 9. Regression and Production Smoke Validation

- Existing health, home, catalog, detail, appointment, dashboard, feedback, moderation, customer-review, static-asset, logging, traversal, and branded-error tests continue to pass.
- A compiled production server returns the same `/about` contract as the importable test application.
- Starting the server still applies existing migrations and seeds without any Phase 3 database change.
- No local database, generated build output, browser report, secret, or environment file is staged.

## Definition of Done

- Every automated, production, external-link, semantic, accessibility, responsive, and regression requirement above passes.
- The implementation remains limited to a focused About page, visible fictional address, and external OpenStreetMap link.
- The roadmap marks Phase 3 complete and TODO advances only after the implementation and all merge gates pass.
- The feature branch contains no map embed, tracking, API key, new dependency, or unrelated product expansion.
