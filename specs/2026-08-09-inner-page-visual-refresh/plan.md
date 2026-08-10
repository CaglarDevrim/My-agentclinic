# Inner Page Visual Refresh Plan

## Feature Workspace

1. Create and work on `phase-12-inner-page-visual-refresh` from the merged Phase 11 and homepage-refresh baseline.
2. Add Phase 12 to the roadmap as incomplete until every validation requirement passes.
3. Record the agreed scope, presentation decisions, boundaries, and merge evidence in the dated feature specifications.

## Shared Presentation

4. Extend the shared page-heading pattern with an optional eyebrow and useful description while preserving one H1.
5. Add reusable semantic structures for discovery intros, catalog grids, metadata, relationship tags, status treatments, empty states, and closing actions.
6. Build all new presentation with plain mobile-first CSS, existing custom properties, and CSS-only decorative elements.

## Discovery Pages

7. Replace the Agents table with semantic profile cards containing monograms, identity, description, status, and detail actions.
8. Strengthen the agent detail header, identity facts, care panels, and appointment call to action without changing destinations or content contracts.
9. Replace the Ailments table with cards exposing descriptions, affected-agent context, and related therapies from existing summaries.
10. Replace the Therapies table with cards exposing descriptions and supported ailments from existing summaries.
11. Add explicit empty states for empty catalogs and empty relationship groups.

## Tests and Merge Readiness

12. Update route tests from table markup assertions to semantic card, relationship, ordering, empty-state, and escaping assertions.
13. Update Playwright discovery coverage for card content, active navigation, focusable actions, detail navigation, and responsive grid behavior.
14. Verify all four refreshed page types at `375px × 812px` and `1280px × 800px`, including JavaScript-disabled discovery content and page-level overflow.
15. Run `npm run validate`, `npm audit --audit-level=moderate`, and `git diff --check`.
16. Perform final visual comparison against the refreshed homepage and mark Phase 12 complete only after all gates pass.
