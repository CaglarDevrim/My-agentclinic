# Complete Interface Refresh Requirements

## Context and Purpose

Phase 13 completes the visual refresh begun on the homepage and discovery journey. It aligns every remaining public, appointment, authentication, error, and staff operations surface with AgentClinic's calm, layered visual language while preserving the completed product's behavior.

## Requirements

- Refresh feedback, thanks, customer reviews, About, login, appointment request/confirmation, branded errors, and the legacy Patch care story.
- Refresh dashboard, reporting, moderation, therapist directory, schedule, and therapist appointment workspaces.
- Use shared eyebrow headings, layered form panels, confirmation surfaces, metrics, operational sections, review cards, content panels, and responsive actions.
- Keep staff interfaces denser and more utilitarian than public storytelling pages.
- Preserve all routes, fields, validation, CSRF inputs, authorization, mutations, exports, maps, notification privacy, and server-rendered behavior.
- Preserve useful no-JavaScript operation, visible focus, semantic headings, labelled controls, text statuses, and mobile wrapping.
- Add no data model, migration, dependency, image, API, route, or client-side behavior.

## Decisions

1. Cover all remaining rendered pages in one presentation-only completion phase.
2. Reuse the established CSS palette and components rather than introducing assets or a UI dependency.
3. Keep operational tables as tables and strengthen their containing surfaces rather than converting them to cards.
4. Require full automated validation and representative visual QA at `375px` and `1280px`.

## Non-goals

- New product workflows, content management, search, filters, or data fields
- Changes to authentication, authorization, persistence, privacy, maps, notifications, or exports
- Motion-heavy effects, illustrations, icon packages, analytics, or third-party UI services
