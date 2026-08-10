# Feedback Form Plan

## Task Group 1 - Database

1. Add ordered migration `007_feedback.sql` with constrained name, email, message, rating, public-consent, and creation fields.
2. Define typed feedback input/record boundaries and a parameterized repository creation operation.
3. Add clean migration, migration-idempotence, persistence, normalization, and file-reopen coverage.

## Task Group 2 - Components

4. Build a server-rendered feedback form for name, email, message, rating, and unchecked public consent using existing form patterns.
5. Add retained safe values, accessible field errors, an error summary, rating-group semantics, consent guidance, and trustworthy privacy copy.
6. Build a generic thank-you component that exposes no submitted or stored feedback values.

## Task Group 3 - Page and Routes

7. Add `GET /feedback` with the shared layout and complete form context.
8. Add validated `POST /feedback` with atomic persistence, `422` invalid responses, and a `303` Post/Redirect/Get success response.
9. Add `GET /feedback/thanks` with home and another-feedback links, plus route/method error handling consistent with the application.

## Task Group 4 - Navigation and Presentation

10. Add a site-wide Feedback footer link without changing the four-item primary navigation.
11. Extend the compact dark design for multiline input, rating choices, consent, errors, confirmation, visible focus, and responsive layouts.

## Task Group 5 - Tests and Merge Readiness

12. Add route, validation-boundary, escaping, privacy, logging, regression, and compiled-migration coverage.
13. Add Playwright invalid/valid/confirmation/footer journeys at `375px` and `1280px`, then run every automated, audit, whitespace, and production smoke gate.
