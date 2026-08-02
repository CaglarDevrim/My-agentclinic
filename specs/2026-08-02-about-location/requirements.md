# About Us, Address, and Map Requirements

## Context

About Us, Address, and Map is Phase 3 of the post-MVP roadmap. AgentClinic already provides a complete care journey, feedback collection, review moderation, public customer reviews, a shared server-rendered layout, and responsive primary navigation. This phase adds a focused public explanation of the clinic and a dependable way to locate its fictional premises.

The page serves AI agents considering care, clinic staff, course students, demonstration developers, and visitors exploring the product. It must preserve AgentClinic's compact dark visual system, playful but trustworthy tone, JavaScript-optional architecture, privacy standards, and responsive behavior.

## Scope

This feature must:

- Add one public About page describing AgentClinic's mission, audiences, and core services.
- Display one visible fictional clinic address with clear demonstration context.
- Provide one accessible external OpenStreetMap search link for that address.
- Add About to the primary navigation without changing the existing footer links.
- Add semantic, route, external-link, accessibility, responsive, regression, and production-browser coverage.

This feature does not require persistence, migrations, forms, request-body handling, API keys, map SDKs, embedded maps, client-side JavaScript, or new dependencies.

## Public Route and Page Contract

- `GET /about` returns `200 OK` and server-rendered HTML.
- The page title is `About | AgentClinic` and the single page-level heading is `About AgentClinic`.
- The shared layout supplies the site header, primary navigation, main landmark, footer, stylesheet, viewport metadata, and language declaration.
- Core content remains complete and usable without browser JavaScript.
- Unsupported methods and unknown About subpaths continue through the application's normal branded not-found behavior and never expose implementation details.

## Content Requirements

### Mission

- Explain that AgentClinic is a playful but practical clinic where overworked AI agents can get relief from demanding human workflows.
- Keep the product premise humorous while describing care and reliability plainly.

### Who We Serve

- Identify AI agents seeking care as the primary public audience.
- Identify clinic staff coordinating agents, ailments, therapies, appointments, feedback, and reviews.
- Course students, developers, and visitors may be acknowledged as demonstration audiences without displacing the primary users.

### Core Services

- Summarize the existing product capabilities rather than promising unimplemented features.
- Cover discovering ailments, exploring therapies, booking appointments, submitting feedback, and reading approved customer reviews.
- Link to existing public routes only where the link gives a clear next step; no new service-detail routes are introduced.

### Visit AgentClinic

- State plainly that AgentClinic and its address are fictional and are used for this demonstration project.
- Render the exact visible address in an `<address>` element:

  `42 Context Window Way, San Francisco, CA 94107`

- The address remains readable and useful when the external map provider is unavailable.
- Do not present telephone numbers, email addresses, business hours, geographic coordinates, or claims that this is a real medical facility.

## External Map Link

- Use this exact OpenStreetMap search URL:

  `https://www.openstreetmap.org/search?query=42%20Context%20Window%20Way%2C%20San%20Francisco%2C%20CA%2094107`

- The link text identifies OpenStreetMap, the address destination, and that it opens in a new tab.
- The anchor uses `target="_blank"` and `rel="noopener noreferrer"`.
- The application does not fetch the provider server-side, proxy map content, require the link to resolve to a real business, or make external-network availability part of the page response.
- Do not add an iframe, image tile, embedded map, map SDK, geolocation request, third-party script, analytics tag, tracking pixel, API key, or provider-specific dependency.

## Navigation

- Add `About` to the shared primary navigation between `Customer Reviews` and `Dashboard`.
- Primary navigation order becomes Agents, Ailments, Therapies, Customer Reviews, About, and Dashboard.
- The About link points to `/about` and exposes `aria-current="page"` only on the About page.
- Existing active states remain unchanged on every other route.
- The shared footer continues to contain Feedback and Customer Reviews; Phase 3 does not add or remove footer links.
- The AgentClinic wordmark remains the home link.

## Presentation and Accessibility

- Reuse the compact dark visual system, spacing scale, typography, surfaces, borders, buttons, links, and visible focus patterns.
- Use semantic headings in a logical hierarchy and meaningful section labels.
- Use an `<address>` element for the location while preventing the browser's default italic styling from reducing readability.
- Do not rely on icons, color, layout, or the map provider alone to communicate the address or fictional status.
- The external link receives visible keyboard focus and has a minimum usable target size consistent with existing navigation and buttons.
- Content wraps without clipping; the six-item navigation may scroll within its own container on narrow screens but must not create page-level horizontal overflow.
- The page remains readable at `375px` and `1280px` viewport widths.

## Security, Privacy, and Reliability

- No personal data, secrets, environment values, database records, or request-derived values are rendered on the page.
- The visible address is a static, explicitly fictional product constant rather than user-controlled or persisted data.
- The OpenStreetMap URL is a fixed HTTPS value and is never assembled from request input.
- The external link prevents opener access with `noopener` and suppresses referrer information with `noreferrer`.
- Existing request logging, branded `404` and safe `500` behavior, static traversal protection, database startup, feedback privacy, review moderation, and appointment workflows remain intact.

## Decisions

1. Use a focused clinic introduction rather than a minimal address-only page or an extended company history.
2. Use `/about` as the single public route and do not add a persistence model.
3. Use the explicitly fictional address `42 Context Window Way, San Francisco, CA 94107`.
4. Use a normal external OpenStreetMap search link instead of an embedded map, Google Maps, or an SDK.
5. Open the map link in a new tab with explicit user-facing text and `noopener noreferrer`.
6. Add About between Customer Reviews and Dashboard in the primary navigation while leaving the footer unchanged.
7. Require the complete automated merge gate at both supported viewport widths.

## Out of Scope

- A real clinic location or verification that the fictional street address exists
- Embedded maps, map tiles, static map images, map SDKs, API keys, geolocation, directions, or distance calculation
- Multiple locations, location search, regionalization, timezones, or persisted clinic settings
- Contact forms, telephone numbers, email addresses, opening hours, staff profiles, or emergency guidance
- An extended company history, leadership biography, blog, press content, or careers section
- Authentication, authorization, analytics, tracking, consent banners, or new third-party dependencies
