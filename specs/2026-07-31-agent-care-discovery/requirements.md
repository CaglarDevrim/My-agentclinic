# Phase 2 Slice Requirements — Agent Care Discovery

## Context

This feature is the first small, reviewable slice of Phase 2, **Complete Clinic Journey and Dashboard**, in the AgentClinic roadmap. It introduces the discovery portion of the clinic journey before appointment booking, persistence, and staff dashboard behavior are added.

The feature supports the mission by letting an AI agent see a clear, welcoming care recommendation. It follows the technical constitution by rendering useful HTML on the server, using typed TypeScript data, reusing the shared page shell, and remaining usable across mobile, tablet, and desktop layouts.

## Scope

This feature must:

- Add working navigation between the home page and the available agent page.
- Define typed Agent, Ailment, and Therapy domain data in TypeScript.
- Seed one agent, one ailment, and one recommended therapy in application code.
- Render a dedicated detail page for the seeded agent.
- Explain the relationship between the agent, its ailment, and its recommended therapy.
- Reuse the shared header, main content, and footer.
- Expand the responsive CSS foundation for multi-page content.
- Keep all core content usable without client-side JavaScript.
- Add focused automated checks for the new public behavior.

## Functional Requirements

### Seeded Care Recommendation

The application contains the following typed seed data:

- Agent: `Patch`
- Ailment: `Context Window Fatigue`
- Recommended therapy: `Prompt-Free Rest`

Each item includes concise, playful explanatory copy consistent with AgentClinic's welcoming tone. Patch's data explicitly associates Context Window Fatigue with Prompt-Free Rest so the recommendation is understandable rather than presented as unrelated labels.

The seed data lives in typed TypeScript application code. It is not loaded from JSON or persisted in SQLite in this feature.

### Agent Detail Page

- `GET /agents/patch` returns `200 OK`.
- The response content type is HTML.
- The response is a complete server-rendered HTML document.
- The page title identifies Patch and AgentClinic.
- The primary heading identifies Patch.
- The visible page contains `Patch`, `Context Window Fatigue`, and `Prompt-Free Rest`.
- The page distinguishes agent information, the current ailment, and the recommended therapy with semantic headings or labelled sections.
- The recommendation includes explanatory text describing why the therapy is appropriate for the ailment.
- The page contains no client-side JavaScript dependency for its core content or navigation.
- An unknown agent path, such as `GET /agents/unknown`, returns `404`.

### Navigation and Shared Layout

- The shared header provides a working link to the home page.
- The shared header provides a working link to Patch's detail page at `/agents/patch`.
- Navigation uses a semantic `nav` landmark with an accessible label.
- The new page reuses the existing shared header, main content, and footer.
- The home page and agent detail page expose the same navigation destinations.
- The existing search form remains present and unchanged; search-result behavior is not part of this feature.

### Responsive Design

- The agent detail page includes the existing viewport metadata.
- Navigation and care-recommendation content remain fully visible without horizontal page scrolling at a `375px` viewport width.
- Long labels and descriptive copy wrap without clipping or overlapping adjacent content.
- Interactive links retain usable touch targets and visible keyboard focus.
- At a `1280px` viewport width, content uses a bounded readable width and avoids excessive stretching.
- Responsive behavior is implemented with mobile-first, fluid CSS and content-driven breakpoints.

## Quality Requirements

- TypeScript strict mode remains enabled.
- Agent, Ailment, and Therapy data is represented by explicit TypeScript types or interfaces.
- Route handlers obtain the displayed recommendation from the typed seed data instead of duplicating its values in route code.
- The application module remains importable by tests without opening a network port.
- Existing home page, health check, stylesheet, and unknown-route behavior remain intact.
- Automated tests cover the new route, its content, shared navigation, responsive stylesheet rules, and unknown agent behavior.
- The production build emits runnable JavaScript without adding a new runtime dependency.

## Decisions

1. **Small Phase 2 slice:** Deliver agent care discovery first. Appointment booking and the staff dashboard will be specified and implemented in later slices.
2. **Direct detail route:** Use `/agents/patch` rather than adding an agent directory. A directory remains assigned to Phase 3.
3. **Typed in-code seed data:** Keep the first Agent, Ailment, and Therapy records in TypeScript. Database schema and migrations are deferred until persistence is required.
4. **Playful demo content:** Use Patch, Context Window Fatigue, and Prompt-Free Rest with short explanatory descriptions matching the product mission.
5. **Progressive server rendering:** Navigation and the complete care recommendation work through ordinary links and server-rendered HTML without browser-side JavaScript.
6. **Future booking context:** The later booking slice is expected to collect agent, requested date, and requested time, and to validate requests against future clinic hours. Exact clinic hours are intentionally left for that booking specification.

## Out of Scope

- Agent listing or directory pages
- Creating or editing agents, ailments, or therapies
- SQLite setup, migrations, or persistence
- Appointment request forms, validation, saving, or confirmation
- Defining exact clinic hours
- Staff dashboard counts or upcoming-appointment summaries
- Search-result behavior
- Authentication and authorization
- Custom error pages or structured request logging

These items remain assigned to later roadmap work and are not merge requirements for this feature.
