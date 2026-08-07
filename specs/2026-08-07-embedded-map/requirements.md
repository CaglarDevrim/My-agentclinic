# Privacy-Preserving Embedded Map Requirements

## Context

Privacy-Preserving Embedded Map is Phase 9 of the post-MVP roadmap and advances the first explicitly selected deferred item. AgentClinic already has a public About page with a visible fictional address and an accessible OpenStreetMap link. This phase progressively enhances that location section with an interactive map while preserving the privacy, accessibility, and no-JavaScript fallback established in Phase 3.

The feature serves visitors and AI agents locating the fictional demonstration clinic. It must remain a small, public, single-location improvement and must not introduce operational location management.

## Scope

This feature must:

- Add an optional interactive OpenStreetMap map to the existing `GET /about` page.
- Require an explicit visitor action before any OpenStreetMap embed request is made.
- Explain before activation that loading the map contacts OpenStreetMap and may share the visitor's IP address and browser information.
- Preserve the visible fictional address and existing external OpenStreetMap link before and after activation.
- Use a fixed demonstration coordinate without persistence, environment configuration, an API key, an SDK, or a new dependency.
- Add privacy, progressive-enhancement, accessibility, responsive, failure-fallback, route, and production-browser coverage.

## Public Page Contract

- `GET /about` continues to return `200 OK`, server-rendered HTML, the title `About | AgentClinic`, and one page-level heading named `About AgentClinic`.
- The exact visible address remains `42 Context Window Way, San Francisco, CA 94107` and remains explicitly fictional.
- The existing external search link remains:

  `https://www.openstreetmap.org/search?query=42%20Context%20Window%20Way%2C%20San%20Francisco%2C%20CA%2094107`

- The initial document contains no iframe, external map image, map tile request, external script, SDK, or provider API request.
- A small local script may progressively enhance only the About map control. The address and external link remain complete and usable if that script is disabled, blocked, or fails.
- The shared navigation, footer, About active state, and all unrelated public and staff routes remain unchanged.

## Map Activation and Privacy

- The map load control is unavailable until the local enhancement script initializes, preventing a non-functional control when JavaScript is unavailable.
- Before the control, visible copy explains the third-party request and identifies OpenStreetMap.
- Activating the control creates exactly one iframe and initiates the first OpenStreetMap embed request.
- Activation is idempotent: repeated pointer, keyboard, or programmatic activation does not create additional iframes or provider requests.
- Consent applies only to the current page view. Do not store it in cookies, local storage, session storage, the database, URLs, or server sessions.
- Do not contact OpenStreetMap from the server, proxy provider content, preload, preconnect, prefetch, or perform provider availability checks.
- The iframe source is a fixed HTTPS OpenStreetMap export URL centered on the fictional demonstration coordinate `37.7765, -122.3950`; it is not assembled from request or user input.
- The iframe uses an accessible title, lazy loading, and a no-referrer policy.
- The existing new-tab map link keeps `rel="noopener noreferrer"` and remains the dependable fallback.

## Interaction and Failure Behavior

- The load control has the accessible name `Load interactive OpenStreetMap map` and is operable with keyboard and pointer input.
- After activation, the page exposes an accessible status confirming that the interactive map was requested, while preserving a sensible focus location.
- The map region has a stable accessible label and contains at most one iframe.
- If the provider request is slow, blocked, offline, or fails, the page does not remove or obscure the address, privacy explanation, or external link.
- Provider failure must not produce a server error, expose implementation details, retry automatically, or prevent the rest of the page from being used.
- Reloading or revisiting `/about` returns to the unactivated state and requires a new explicit action.

## Accessibility and Responsive Presentation

- Preserve semantic headings, the `<address>` element, meaningful link text, and visible fictional-location disclosure.
- The privacy explanation, activation control, map region, status, and fallback link must not rely on color or layout alone.
- The activation control has the same visible focus treatment and minimum usable target size as existing buttons.
- The iframe receives the title `Interactive map showing the fictional AgentClinic location`.
- The map container uses a responsive aspect ratio with a practical minimum height and never creates page-level horizontal overflow.
- Content and controls remain readable and usable at `375px` and `1280px` viewport widths.

## Security and Reliability

- All provider URLs and coordinates are fixed application constants and never contain request-derived data.
- Add no inline script, dynamic HTML injection, geolocation request, analytics, tracking pixel, API key, provider token, or map-specific dependency.
- The local script must use DOM creation and text APIs rather than assigning untrusted HTML.
- Existing request logging, static traversal protection, branded error handling, authentication, notification privacy, database startup, and clinic workflows remain intact.

## Decisions

1. Use an explicit click-to-load interactive map instead of an always-loaded embed or a local static preview.
2. Keep OpenStreetMap as the provider and use one fixed fictional coordinate in application code.
3. Keep consent ephemeral to the current page view and store no preference or visitor data.
4. Preserve the existing visible address and external map link as the no-JavaScript and provider-failure fallback.
5. Require automated proof that no provider request occurs before activation and full validation at both supported viewport widths.

## Out of Scope

- Multiple clinic sites, location search, branch selection, editable clinic settings, or staff location administration
- Timezone selection, timezone conversion, regionalization, opening hours, directions, travel time, or distance calculation
- Geolocation, location permission prompts, route planning, custom map markers, map search, or map-provider switching
- Persisted consent, consent banners, user profiling, analytics, or tracking
- Google Maps, Mapbox, map SDKs, tile libraries, API keys, new dependencies, database migrations, or environment variables
- Verification that the fictional address or coordinate represents a real premises
