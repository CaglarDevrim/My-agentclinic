# Feedback Form Validation

All required checks must pass before `phase-1-feedback-form` can be merged.

## 1. Complete Automated Gate

Run:

```sh
npm run validate
npm audit --audit-level=moderate
git diff --check
```

Success requires zero typecheck, route/database test, browser, production-build, dependency-audit, or whitespace failures.

## 2. Migration and Repository Validation

- A new empty database applies `007_feedback.sql` after existing migrations.
- Applied migration history records the feedback migration exactly once.
- Reopening an already migrated database is a no-op and does not fail.
- The compiled production build contains and locates the feedback migration.
- A valid record receives an integer ID and creation timestamp.
- Stored name and message use trimmed outer boundaries while preserving internal content.
- Stored email is trimmed and lowercase.
- Rating persists as an integer from 1 to 5.
- Missing consent persists as `0`; checked consent persists as `1`.
- Closing and reopening a temporary file-backed database preserves the record.
- Request-derived SQL values are parameterized.
- Database handles and temporary test files are cleaned up.

## 3. Validation Matrix

### Name

- Accept 1 and 100 trimmed characters.
- Reject missing, whitespace-only, and more than 100 trimmed characters.

### Email

- Accept a representative valid address and normalize casing/outer whitespace.
- Reject missing, whitespace-only, malformed, multiple-address, and more than 254-character input.

### Message

- Accept exactly 10 and exactly 2,000 trimmed characters.
- Preserve internal newlines.
- Reject missing, whitespace-only, fewer than 10, and more than 2,000 trimmed characters.

### Rating

- Accept integer values `1`, `2`, `3`, `4`, and `5`.
- Reject missing, `0`, `6`, negative, decimal, non-numeric, and multiple values.

### Consent

- An absent checkbox maps to false.
- The supported checked value maps to true.
- Empty or unsupported values safely map to false.

Every invalid case returns field-specific errors and produces no write.

## 4. Feedback Form Route

- `GET /feedback` returns `200` and HTML.
- The document includes shared header, primary navigation, main, footer, stylesheet, viewport metadata, and no core script dependency.
- The form uses `POST /feedback`.
- Visible labels exist for name, email, message, rating, and public consent.
- Rating choices expose one accessible group label and explicit values 1–5.
- Consent is unchecked by default and explains that publication requires later review.
- The page contains a clear submit action.

## 5. Invalid Submission

- Invalid `POST /feedback` returns `422` and HTML.
- No feedback record is written.
- Safe name, email, message, rating, and consent state are retained.
- Each invalid control uses `aria-invalid` and is associated with its error text.
- An accessible error summary identifies every invalid field.
- Submitted markup is escaped and never emitted as raw HTML.
- Error text is direct and understandable without playful ambiguity.

## 6. Successful Submission and Confirmation

- A valid `POST /feedback` writes exactly one record.
- The response is `303 See Other` with `Location: /feedback/thanks`.
- Following the redirect returns `200` and confirms receipt.
- The confirmation page contains no submitted name, email, message, rating, consent, or database ID.
- Refreshing `/feedback/thanks` does not change the feedback count.
- The confirmation page links to `/` and `/feedback`.
- Direct `GET /feedback/thanks` remains a safe generic page.

## 7. Privacy, Logging, and Security

- No public route lists or retrieves stored feedback records.
- Request logs contain method, path, status, and duration only.
- Logs do not contain form bodies, email, message, rating, or consent values.
- Route errors do not expose SQL, stack traces, database paths, or submitted private values.
- Existing traversal protection and branded `404`/`500` responses continue to pass.
- Automated browser tests use isolated temporary databases.

## 8. Footer and Regression Validation

- The shared footer contains a working Feedback link on Home, catalog, detail, booking, confirmation, dashboard, and error pages.
- The primary header navigation remains exactly Agents, Ailments, Therapies, and Dashboard.
- Existing Home, Health, Patch, catalog, booking, appointment confirmation, dashboard, static CSS, logging, and production-startup contracts do not regress.

## 9. Browser and Responsive Validation

At `375px` and `1280px`, Playwright must:

1. Reach Feedback from the footer.
2. Verify every control and its default state.
3. Submit invalid values and verify visible associated errors plus retained values.
4. Submit valid private feedback and reach the generic confirmation.
5. Return and submit valid consented feedback.
6. Verify confirmation refresh does not duplicate records.

Every checked page must use the compact dark design, retain visible keyboard focus, preserve logical tab order, keep controls usable, and avoid page-level horizontal overflow.

## 10. Tone and Manual Review

- Page headings and hints may use restrained AgentClinic humor.
- Labels clearly identify the requested information.
- Rating values remain explicit even if their descriptions are playful.
- Consent, privacy, validation, confirmation, and error copy are literal and trustworthy.
- The workflow remains meaningful with JavaScript disabled.

## 11. Production Smoke Validation

- A compiled server applies the feedback migration before accepting requests.
- Feedback form, invalid submission, valid submission, confirmation, footer, health, and static routes respond as specified.
- A submitted record survives restart against the same temporary database.
- The database file and feedback contents cannot be requested publicly.
- Invalid submissions do not alter persistent feedback count.

## Definition of Done

- Every automated, browser, production, privacy, tone, responsive, and manual requirement above passes.
- Phase 1 is marked complete in the roadmap only after the implementation gates pass.
- No generated database, build output, browser report, secret, or local environment file is staged.
- The feature remains limited to feedback collection; staff moderation and public reviews stay assigned to Phase 2.
