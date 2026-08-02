# Appointment Status Management and Slot-Collision Plan

## Task Group 1 - Persistence and Domain Rules

1. Add the next ordered appointment migration with a partial unique index that permits only one `pending` or `confirmed` row per normalized therapist name and exact `scheduled_at` value.
2. Add typed persistence results for appointment transitions and slot conflicts so routes can distinguish success, idempotent success, missing records, prohibited transitions, and booking collisions without parsing user-visible error strings.
3. Add conditional confirm and cancel operations that enforce the allowed transition graph at the database boundary and keep repeated target-state requests idempotent.
4. Normalize therapist names consistently, pre-check open-slot availability, and translate the authoritative unique-index failure into a collision result safe under concurrent booking attempts.
5. Preserve the existing dashboard query and open count semantics so only pending and confirmed appointments appear and cancelled appointments immediately release their slot.

## Task Group 2 - Dashboard Components and Presentation

6. Extend the open-appointments table with an Actions column containing POST forms for the actions allowed by each row's current status.
7. Give each button a contextual accessible name, retain visible status text, and update the empty row's column span.
8. Add minimal responsive styles for compact action forms and buttons while preserving keyboard focus, mobile table/card readability, and page-level overflow behavior.
9. Add a safe, accessible conflict presentation for prohibited status transitions without exposing implementation details.

## Task Group 3 - Routes and Booking Workflow

10. Add the confirm and cancel POST routes under `/dashboard/appointments/:appointmentId`, using the existing positive-ID parser and `303` dashboard redirects on successful or idempotent changes.
11. Return branded `404` responses for malformed or missing IDs and `409 Conflict` for a prohibited transition such as confirming a cancelled appointment.
12. Update appointment creation to keep submitted values on collision, render an accessible field-associated message with `422`, and ensure race-time uniqueness failures do not reach the global `500` handler.
13. Keep mutation authority server-side: accept no client-supplied status, appointment identity, or redirect target beyond the validated route parameter.

## Task Group 4 - Automated Validation

14. Add migration and database tests for the unique partial index, case/whitespace normalization, different-therapist allowance, open-status collisions, cancelled-slot reuse, valid transitions, idempotency, terminal-state rejection, and file-backed persistence.
15. Add a concurrent booking test proving two requests for the same normalized therapist and exact slot create one appointment and produce one accessible collision response.
16. Add route tests for dashboard action rendering, POST-only mutation, ID validation, PRG redirects, updated counts and rows, `409` prohibited transitions, `422` collision preservation, HTML escaping, and unchanged branded errors.
17. Add Playwright journeys at `375px x 812px` and `1280px x 800px` for confirming, cancelling, released-slot rebooking, duplicate-slot rejection, keyboard operation, focus visibility, and horizontal-overflow prevention.
18. Run type checking, all Vitest and Playwright suites, production compilation and smoke coverage, dependency audit, whitespace validation, and Git hygiene checks before requesting merge.
