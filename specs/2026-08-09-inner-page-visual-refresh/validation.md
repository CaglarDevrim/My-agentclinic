# Inner Page Visual Refresh Validation

Phase 12 is mergeable only when every required section succeeds.

## 1. Complete Gate

Run:

```sh
npm run validate
npm audit --audit-level=moderate
git diff --check
```

All type checks, Vitest tests, production compilation, Playwright projects, dependency checks, and whitespace checks must pass.

## 2. Route and Content Contracts

- `/agents`, `/ailments`, `/therapies`, and numeric agent detail routes retain their existing response status, document title, one H1, active navigation state, and content ordering.
- Agents render as a semantic card list containing every seeded name, model, description, text status, and detail URL.
- Ailment cards contain every seeded description plus affected-agent and related-therapy context.
- Therapy cards contain every seeded description plus supported-ailment context.
- Agent detail retains its description, identity, current ailments, recommended therapies, breadcrumbs, and exact appointment destination.
- Empty catalogs and empty relationship groups render explicit, labelled states.
- No catalog page depends on table headers, `data-label` pseudo-labels, or client-side JavaScript.

## 3. Accessibility and Responsive Behavior

- Each page has one H1 and logical section/card heading levels.
- Catalog collections use semantic lists and cards use semantic articles.
- Decorative monograms and geometry are hidden from assistive technology.
- Status meaning is present as text and does not rely on color.
- Links remain understandable out of context, keyboard reachable, and visibly focused.
- At `375px`, cards use one column and all text, tags, and actions wrap without horizontal overflow.
- At `1280px`, catalog grids use available space without exceeding the established main content width.

## 4. Browser Journeys

At `375px × 812px` and `1280px × 800px`, Playwright must:

1. Navigate from the homepage to Agents and verify the refreshed intro and every profile card.
2. Open an agent card, verify the identity and care sections, and reach the unchanged appointment form.
3. Navigate to Ailments and verify description, affected-agent, and related-therapy content.
4. Navigate to Therapies and verify description and supported-ailment content.
5. Confirm active navigation, visible focus, responsive grid behavior, and no page-level horizontal overflow.
6. Repeat core discovery assertions with JavaScript disabled.

## 5. Visual QA

- Capture or inspect all four refreshed page types at both required viewport sizes.
- Confirm the surfaces, gradients, borders, typography, spacing, and actions clearly belong to the same product as the homepage.
- Confirm pages remain calmer and less visually dense than the homepage hero.
- Confirm mobile cards do not clip long names, descriptions, relationship tags, or status labels.

## 6. Regression and Boundaries

- Booking, confirmation, dashboard, authentication, schedules, reports, feedback, reviews, About/map, notifications, errors, health, and static assets continue to pass existing tests.
- No migration, database query, data type, route, dependency, image, script, environment variable, or generated artifact is introduced.
- The implementation does not redesign any page outside the agreed discovery journey.

## Definition of Done

Every automated gate and visual review passes, the refreshed discovery journey remains complete without JavaScript, and the roadmap marks Phase 12 complete only after the implementation is demonstrably merge-ready.
