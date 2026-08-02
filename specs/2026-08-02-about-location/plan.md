# About Us, Address, and Map Plan

## Task Group 1 - Page and Content

1. Create a server-rendered About page component with a single H1 and focused Mission, Who We Serve, Core Services, and Visit AgentClinic sections.
2. Add explicit fictional-demonstration copy and render `42 Context Window Way, San Francisco, CA 94107` in a semantic `<address>` element.
3. Add the fixed OpenStreetMap search anchor with descriptive new-tab text, `target="_blank"`, and `rel="noopener noreferrer"`, without scripts, embeds, SDKs, API keys, or request-derived URL construction.

## Task Group 2 - Route and Navigation

4. Add `GET /about` to the Hono application and render the About page through the existing shared layout.
5. Extend the active-section type and add About between Customer Reviews and Dashboard in the primary navigation, active only for `/about`.
6. Preserve the existing Feedback and Customer Reviews footer links and verify unrelated active-navigation states do not change.

## Task Group 3 - Presentation and Accessibility

7. Add mobile-first About, service, and location presentation styles using the existing dark design tokens and content width.
8. Ensure semantic heading order, readable non-italic address text, visible focus, usable link targets, long-content wrapping, narrow navigation containment, and no page-level horizontal overflow.

## Task Group 4 - Tests and Merge Readiness

9. Add route tests for the exact title, headings, mission, audience, service summary, fictional notice, address semantics, fixed OpenStreetMap URL, external-link security attributes, navigation order, active state, and unchanged footer.
10. Add negative assertions proving the page contains no iframe, external script, SDK, API key, geolocation behavior, map tile, form, or new persistence dependency.
11. Add Playwright coverage at `375px × 812px` and `1280px × 800px` for primary-navigation discovery, About active state, visible content and address, external-link attributes, keyboard focus, responsive layout, and horizontal-overflow prevention.
12. Run type checking, all Vitest and Playwright tests, production compilation, dependency audit, whitespace validation, and production smoke checks before marking Phase 3 complete and advancing TODO.
