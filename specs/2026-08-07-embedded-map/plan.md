# Privacy-Preserving Embedded Map Plan

## Task Group 1 - Map Contract and Progressive Enhancement

1. Define fixed constants for the existing OpenStreetMap search URL, the fictional coordinate `37.7765, -122.3950`, and its HTTPS OpenStreetMap export embed URL without accepting request-derived values.
2. Extend the About location section with visible privacy disclosure, a script-initialized `Load interactive OpenStreetMap map` control, an accessible status target, and a labelled empty map region while preserving the address and external link.
3. Add one dependency-free local static script that reveals the control after initialization and creates exactly one titled, lazy, no-referrer iframe after explicit activation.
4. Make activation idempotent, keep consent in memory for only the current document, and preserve useful focus and status feedback after activation.

## Task Group 2 - Fallback, Security, and Presentation

5. Ensure the server-rendered page remains complete without JavaScript and emits no iframe, external script, preload, preconnect, provider fetch, or automatically requested map resource.
6. Preserve the visible fictional address and secured external OpenStreetMap link as the fallback when JavaScript or the provider is unavailable.
7. Add mobile-first styles for the disclosure, control, status, map frame, and responsive map aspect ratio using existing design tokens and focus conventions.
8. Confirm the map enhancement does not alter primary navigation, footer links, route behavior, persistence, environment configuration, dependencies, or staff authorization.

## Task Group 3 - Automated Tests

9. Update About route and static-asset tests for the privacy copy, progressive-enhancement hooks, local script reference, fixed constants, and initial absence of an iframe or external executable resource.
10. Add negative assertions for map SDKs, API keys, geolocation, tracking, persisted consent, user-controlled map URLs, preloading, and new data infrastructure.
11. Replace the former no-map Playwright scenario with click-to-load coverage at `375px x 812px` and `1280px x 800px`, including keyboard access, visible focus, a single iframe, accessible labelling, responsive layout, and no horizontal overflow.
12. Instrument Playwright network events to prove no OpenStreetMap embed request occurs before activation and exactly one occurs after activation, without following the existing external link.
13. Abort the provider request in a browser test and verify that the page, address, disclosure, activation result, and external fallback link remain usable without automatic retries or application errors.
14. Add a JavaScript-disabled browser case proving that the activation control is not offered while the address and external link remain visible and usable.

## Task Group 4 - Merge Readiness

15. Run type checking, all Vitest tests, the production build, all Playwright projects, dependency audit, and whitespace validation.
16. Inspect the production response and browser network evidence to confirm that only the local enhancement script loads initially and no generated files, secrets, databases, reports, or unrelated changes are staged.
17. Mark Phase 9 complete and remove only `Embedded maps` from the deferred roadmap item after every validation requirement passes; leave multi-site operation and timezone coordination deferred.
