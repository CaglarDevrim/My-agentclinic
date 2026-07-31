# Phase 2 Slice Plan — Agent Care Discovery

## Task Group 1 — Define the Care Domain and Seed Data

1. Define explicit TypeScript types or interfaces for Agent, Ailment, and Therapy.
2. Create the seeded Patch agent with a concise description.
3. Create the Context Window Fatigue ailment with explanatory copy.
4. Create the Prompt-Free Rest therapy with explanatory copy.
5. Associate Patch's ailment with the recommended therapy through typed application data.
6. Expose a lookup that can resolve the seeded agent by the stable slug `patch` without introducing persistence or a new dependency.

## Task Group 2 — Extend the Shared Multi-Page Layout

1. Add a semantic, accessibly labelled navigation region to the shared header.
2. Add working navigation links to `/` and `/agents/patch`.
3. Ensure the same navigation destinations appear on the home page and agent detail page.
4. Allow the shared layout to render a page-specific document title while retaining `AgentClinic` branding.
5. Keep the existing search form and its accessible labeling unchanged.

## Task Group 3 — Add the Agent Detail Page

1. Add `GET /agents/patch` to the importable Hono application.
2. Resolve Patch and its care recommendation from the typed seed data.
3. Return `404` when an agent slug does not match a seeded agent.
4. Render Patch in a dedicated server-rendered page using the shared layout.
5. Present agent information, Context Window Fatigue, and Prompt-Free Rest in semantic, clearly labelled sections.
6. Include concise copy explaining why Prompt-Free Rest is recommended for Context Window Fatigue.
7. Keep all page content and navigation functional without client-side JavaScript.

## Task Group 4 — Expand Responsive Styling

1. Style the shared navigation consistently with the existing header and visual system.
2. Give navigation links visible hover and keyboard-focus states with usable touch targets.
3. Add fluid styles for agent details, ailment information, and the therapy recommendation.
4. Ensure long names and descriptions wrap without clipping or overlap.
5. Stack or reflow navigation and care content as needed for a `375px` viewport.
6. Retain a bounded readable content width at a `1280px` viewport.

## Task Group 5 — Add Automated Checks

1. Verify `GET /agents/patch` returns `200`, an HTML content type, and a complete HTML document.
2. Verify the document title and primary heading identify Patch and AgentClinic.
3. Verify the response contains Patch, Context Window Fatigue, Prompt-Free Rest, and the recommendation explanation.
4. Verify the page contains semantic agent, ailment, and therapy structure.
5. Verify both the home page and agent detail page expose working Home and Patch navigation links in an accessible `nav` landmark.
6. Verify an unknown agent slug returns `404`.
7. Verify the new page contains no client-side script dependency.
8. Verify the stylesheet includes fluid multi-page content rules, visible focus styling, and narrow-screen behavior.
9. Retain all existing health, home page, stylesheet, and general unknown-route tests.

## Task Group 6 — Verify the Feature

1. Run the type check.
2. Run the production build.
3. Run the complete automated test suite.
4. Start the development server and smoke-test `/`, `/agents/patch`, and an unknown agent path.
5. Navigate between the home page and Patch's page using only the rendered links.
6. Inspect the agent page at `375px` and `1280px` viewport widths.
7. Confirm the page remains meaningful and usable with client-side JavaScript disabled.
8. Confirm no SQLite, booking, dashboard, or agent-directory behavior was introduced.
