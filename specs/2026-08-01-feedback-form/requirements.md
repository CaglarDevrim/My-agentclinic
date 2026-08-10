# Feedback Form Requirements

## Context

Feedback Form is Phase 1 of the post-MVP roadmap and the current `Now` item in `TODO.md`. AgentClinic already provides a complete care journey, dashboard, compact dark visual system, SQLite persistence, server-rendered validation patterns, and isolated production-browser tests. This feature reuses those patterns to let visitors send dependable feedback without requiring client-side JavaScript.

The feature must support AgentClinic's primary agent and staff audiences while also serving course students, demonstration developers, and visitors. Its tone may remain playful, but privacy, validation, confirmation, and error copy must be direct and trustworthy.

## Scope

This feature must:

- Add durable SQLite persistence for feedback submissions.
- Add a public server-rendered feedback form.
- Collect name, email, message, rating, and optional public-display consent.
- Validate every value at the server boundary.
- Preserve safe form values and render accessible errors after invalid submissions.
- Persist valid feedback exactly once.
- Use Post/Redirect/Get to a generic confirmation page.
- Add a site-wide Feedback link in the footer.
- Match the existing compact dark responsive design.
- Add migration, repository, route, production, and browser coverage.

## Public Routes

### Feedback Form

- `GET /feedback` returns `200 OK` and server-rendered HTML.
- The page uses the shared layout, stylesheet, viewport metadata, footer, and primary navigation.
- The page contains one form with `method="post"` and `action="/feedback"`.
- Every control has a visible label.
- The form remains fully useful without client-side JavaScript.

### Feedback Submission

- `POST /feedback` accepts form-encoded `name`, `email`, `message`, `rating`, and optional `publicConsent`.
- Invalid input returns `422 Unprocessable Content` and re-renders the form.
- The invalid response preserves safe submitted name, email, message, rating, and consent values.
- Field errors are associated with their controls and summarized near the start of the form.
- Invalid submissions write no feedback record.
- Valid input writes exactly one feedback record and returns `303 See Other`.
- The redirect `Location` is `/feedback/thanks`.
- Refreshing the redirected page does not create another submission.

### Confirmation

- `GET /feedback/thanks` returns `200 OK` and server-rendered HTML.
- It confirms receipt in generic language.
- It does not display the submitted name, email, message, rating, consent value, or database ID.
- It links back to the clinic home page and to another feedback form.

## Field Contract

### Name

- Required after trimming leading and trailing whitespace.
- Length must be between 1 and 100 characters after trimming.
- Internal spacing and the submitter's original casing are preserved.

### Email

- Required after trimming.
- Must use a practical single-address email format with text on both sides of `@` and a valid domain portion.
- Maximum length is 254 characters.
- Store the trimmed email in lowercase for consistent future staff workflows.
- Never render the email on the confirmation page or include it in request logs.

### Message

- Required after trimming leading and trailing whitespace.
- Length must be between 10 and 2,000 characters after trimming.
- Internal newlines and spacing are preserved.
- The message is never rendered as raw HTML.

### Rating

- Required.
- Must be an integer from 1 through 5 inclusive.
- The interface exposes five understandable choices with an accessible group label.
- Labels may use restrained AgentClinic personality, but the numeric meaning remains explicit.

### Public Consent

- Optional and unchecked by default.
- Submitted checkbox value maps to a boolean `public_consent` field.
- Missing, empty, or unsupported values are treated as false rather than as validation errors.
- Consent means the feedback may be considered for a future public review; it does not publish the feedback.
- Staff approval and public display remain Phase 2 work.

## Persistence

- Add ordered migration `007_feedback.sql` through the existing migration runner.
- Create a `feedback` table with:
  - Integer auto-incrementing `id`
  - Non-null `name`
  - Non-null normalized `email`
  - Non-null `message`
  - Non-null integer `rating` constrained from 1 to 5
  - Non-null integer `public_consent` constrained to 0 or 1 and defaulting to 0
  - Non-null creation timestamp
- Add typed feedback input and stored-record boundaries.
- Add a parameterized repository operation for creating feedback.
- Keep application construction database-injectable for isolated tests.
- Apply the migration before production startup and copy it into the compiled build.
- Phase 1 does not add approval, publication, editing, or deletion fields.

## Form and Presentation

- Reuse the compact dark form, button, error, and focus patterns already used by appointment booking.
- Use a bounded readable form width and mobile-first layout.
- Name and email use text-like inputs, message uses a multiline control, rating uses a semantic grouped choice, and consent uses a checkbox.
- The submit action has a clear label such as `Send feedback`.
- Playful or satirical copy is limited to headings, descriptions, labels, placeholders, and hints.
- Validation, privacy, consent, confirmation, and error language remains literal and unambiguous.
- No page may create horizontal document overflow at supported viewports.

## Navigation

- Add a `Feedback` link to the shared footer on every rendered page.
- Preserve the four-item course-reference primary navigation: Agents, Ailments, Therapies, and Dashboard.
- The wordmark remains the home link.
- The feedback page does not add a fifth primary-navigation item.

## Security, Privacy, and Reliability

- Render user-controlled values only through escaped JSX.
- Do not log request bodies, email addresses, messages, or consent values.
- Do not expose stored feedback through a public detail or list route.
- Invalid requests never write partial records.
- Confirmation must not rely on a public numeric feedback identifier.
- Existing branded `404`, safe `500`, request logging, traversal protection, and production-startup behavior remain intact.
- Automated browser tests use an isolated temporary SQLite database and never modify development data.

## Decisions

1. Use the Legacy Support field set: name, email, message, rating, and public visibility consent.
2. Require name, email, message, and rating; keep consent optional.
3. Use rating values 1 through 5.
4. Store normalized lowercase email and trimmed text boundaries.
5. Keep public consent unchecked and false by default.
6. Treat consent as future eligibility only; staff approval and publication are Phase 2.
7. Use `POST /feedback` followed by `303 /feedback/thanks`.
8. Use a generic privacy-safe confirmation with no submitted values.
9. Place Feedback in the shared footer and preserve the reference header navigation.
10. Require no client-side JavaScript for the core workflow.

## Out of Scope

- Staff feedback listing, moderation, or approval
- Public customer-review pages
- Immediate publication after consent
- Authentication or authorization
- Editing or deleting feedback
- Email delivery or notifications
- Attachments or file uploads
- CAPTCHA, third-party anti-spam services, or rate limiting
- Analytics, reporting, or sentiment analysis
