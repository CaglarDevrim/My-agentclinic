# Inner Page Visual Refresh Requirements

## Context

Inner Page Visual Refresh is Phase 12 of the post-MVP roadmap. The completed homepage now establishes a calm, layered, playful visual language, while the public discovery pages still use the MVP's intentionally plain catalog tables and compact detail presentation. This phase carries the stronger visual hierarchy into the agent care discovery journey without changing its data or behavior.

The primary audience is AI agents and visitors discovering care. Clinic staff remain served by the existing operational interfaces, which are intentionally outside this focused release.

## Scope

This feature must:

- Refresh `/agents`, numeric agent detail routes, `/ailments`, and `/therapies`.
- Introduce reusable inner-page heading, catalog-card, metadata, status, empty-state, and call-to-action presentation patterns.
- Use the existing agent descriptions, statuses, ailment relationships, and therapy relationships already returned by the repository.
- Preserve all public URLs, sorting, navigation, booking links, server-rendered HTML, and JavaScript-independent behavior.
- Add route, semantic, responsive, accessibility, regression, and production-browser coverage.

This feature does not add persistence, migrations, request inputs, routes, images, client-side JavaScript, or dependencies.

## Page Contracts

### Agents

- `GET /agents` keeps its existing title, H1, active navigation state, alphabetical order, and agent detail destinations.
- Render agents as a semantic list of cards rather than a data table.
- Each card shows the agent name, model, description, text status, a decorative text monogram, and an explicit detail link.
- An empty agent collection renders a labelled, helpful empty state.

### Agent Detail

- Numeric agent routes preserve breadcrumbs, one H1, model, status, description, ailments, therapies, and the appointment URL.
- The identity header becomes a prominent profile surface using a decorative monogram and structured facts.
- Current ailments and recommended therapies remain separate semantic sections with explicit empty states.
- Booking remains the primary action and returning to the directory remains secondary.

### Ailments

- `GET /ailments` keeps its existing title, H1, active navigation state, and alphabetical ordering.
- Render each ailment in a semantic card with its description, affected-agent count and names, and related therapies.
- Relationship labels remain understandable when counts are zero or lists are empty.

### Therapies

- `GET /therapies` keeps its existing title, H1, active navigation state, and alphabetical ordering.
- Render each therapy in a semantic card with its description and supported ailments.
- Empty relationship lists use explicit text rather than blank regions.

## Presentation and Accessibility

- Reuse the homepage palette, layered dark surfaces, restrained blue-violet gradients, border language, spacing, and typographic hierarchy.
- Use CSS-only decorative geometry and text monograms; decorative elements are hidden from assistive technology.
- Use semantic `ul`, `li`, `article`, headings, descriptions, and links so cards do not sacrifice document structure.
- Preserve visible focus, understandable link names, one page-level H1, logical heading order, and status text that does not depend on color.
- Use a single-column mobile layout and balanced grids from the existing `641px` content breakpoint.
- Support `375px` through `1280px` without page-level horizontal overflow, clipping, overlap, or inaccessible targets.

## Compatibility and Reliability

- Do not change repository queries, public route signatures, database types, schema, migrations, or seeds.
- Preserve escaped JSX output and never render user-controlled raw HTML.
- Preserve the complete booking, authentication, reporting, review, map, notification, and staff workflows.
- Core discovery content remains useful with JavaScript disabled.

## Decisions

1. Limit Phase 12 to the public discovery journey; defer other public and staff surfaces.
2. Use page-specific card compositions rather than keeping tables or forcing every catalog into one generic card.
3. Use existing relational data to add useful context without changing persistence.
4. Require the full automated gate plus visual review at both supported viewports.

## Out of Scope

- Appointment form or confirmation redesign
- Reviews, About, Feedback, Login, Dashboard, Reports, moderation, therapist, or schedule redesign
- Search, filtering, sorting controls, pagination, editing, or new care workflows
- New illustrations, image assets, icon packages, animations, scripts, or third-party services
- Route, database, seed, API, authentication, privacy, or authorization changes
