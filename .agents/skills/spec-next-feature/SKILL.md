---
name: spec-next-feature
description: Find the next incomplete phase in a repository's specs/roadmap.md, interview the user about its feature specification, create a dedicated Git branch, and write dated plan.md, requirements.md, and validation.md feature specs. Use when the user asks to plan, specify, prepare, or start the next roadmap feature and requires AskUserQuestion before any writes.
---

# Specify the Next Roadmap Feature

## Guardrail

Use AskUserQuestion (`request_user_input`) before every filesystem or Git mutation. Treat creating or switching a branch as a write.

If AskUserQuestion is unavailable, stop without writing anything and ask the user to switch to Plan Mode. Resume only when the tool is available. Never replace the required tool with plain-text questions.

## Discover

1. Read `specs/roadmap.md`, `specs/mission.md`, and `specs/tech-stack.md` completely.
2. Inspect `git status --short --branch` and existing directories under `specs/` without modifying anything.
3. Identify the first incomplete roadmap phase. Do not select a completed or deferred phase unless the user explicitly requests it.
4. Read the most relevant existing feature specs to match the repository's detail and conventions.
5. Summarize the selected phase and the material ambiguities the interview must resolve.

## Interview

Call AskUserQuestion once with exactly three grouped questions. Adapt choices to the selected phase and put the recommended option first:

1. **Scope** — resolve the primary actor, core workflow, must-have behavior, and explicit boundaries.
2. **Decisions** — resolve material product and technical choices, including data, routes, navigation, privacy, permissions, and compatibility where relevant.
3. **Validation** — resolve the expected user journey, acceptance evidence, browser coverage, and merge threshold.

Offer two or three mutually exclusive choices for each question and explain their tradeoffs. Do not ask about facts already settled by the mission, tech stack, roadmap, or existing specs. Use the user's answers as decisions, not suggestions.

Do not create a branch or files until the interview response has been received.

## Create the Feature Workspace

1. Recheck the active branch and working tree. Preserve unrelated user changes; stop if they make safe branch creation ambiguous.
2. Derive a concise lowercase kebab-case feature slug from the phase.
3. Create and switch to a branch named `phase-N-feature-slug`, using the roadmap phase number.
4. Create `specs/YYYY-MM-DD-feature-slug/` using the current local date.
5. Create only these files in that directory:
   - `requirements.md`
   - `plan.md`
   - `validation.md`

Use `apply_patch` for file creation and edits.

## Write requirements.md

Record:

- phase context and product purpose;
- relevant mission, audience, and stack constraints;
- interview decisions and their rationale;
- in-scope user journeys and observable behavior;
- data, routing, navigation, privacy, security, accessibility, responsive, and error-handling requirements where applicable;
- explicit non-goals and deferred work;
- assumptions only when unavoidable, clearly labeled.

Keep the document implementation-guiding without inventing requirements that conflict with the user's answers.

## Write plan.md

Organize implementation as a series of numbered task groups. Number every concrete task globally across the document rather than restarting within each group.

Order groups by dependency, typically:

1. domain and persistence;
2. components and pages;
3. routes and workflows;
4. navigation and presentation;
5. tests and merge readiness.

Adapt or omit groups that do not apply. Keep tasks small, testable, and implementation-ready. Do not implement the feature.

## Write validation.md

Define specific evidence required for merge:

- type checking, unit/route/database tests, production build, and dependency/whitespace gates supported by the repository;
- migration, persistence, and normalization checks where data changes;
- validation-boundary and malformed-input cases;
- successful, empty, error, privacy, accessibility, responsive, and regression scenarios;
- Playwright checks at the viewports required by `specs/tech-stack.md`;
- manual checks only where automation cannot give sufficient confidence;
- a concrete definition of done.

Use exact routes, states, response codes, fields, and assertions whenever the interview or repository establishes them.

## Finish

Verify the branch, directory name, filenames, and diff. Report what was created, the decisions captured, and any intentionally deferred questions. Do not implement, commit, push, merge, or delete branches unless the user separately requests it.
