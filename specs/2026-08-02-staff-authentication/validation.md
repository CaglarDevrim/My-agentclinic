# Staff Authentication and Authorization Validation

All required checks must pass before `phase-5-staff-authentication` can be merged.

## 1. Complete Automated Gate

Run:

```sh
npm run validate
npm audit --audit-level=moderate
git diff --check
```

Success requires zero typecheck, crypto, domain, migration, database, route, authorization, CSRF, responsive-browser, production-build, dependency-audit, secret-scan, or whitespace failures.

## 2. Migration and Staff Persistence

- A fresh database applies all ordered migrations and contains empty staff, session, and throttle tables.
- An existing Phase 4 file-backed database upgrades without modifying agents, appointments, feedback, reviews, or other clinic records.
- Running migrations repeatedly does not duplicate or alter authentication records.
- Normalized email uniqueness treats trimmed case variants as the same account.
- Staff projections never expose `password_hash`; database rows never contain plaintext passwords or raw session tokens.
- Session deletion cascades when a staff account is deleted, and the expiry index exists.
- Closing and reopening a file-backed database preserves staff accounts, valid sessions, expiry timestamps, and throttle state.

## 3. Password and Provisioning Security

- Valid password hashes use the documented version, `N=32768`, `r=8`, `p=3`, a unique 16-byte salt, and a 64-byte derived key.
- Identical passwords produce different stored hashes and both verify successfully.
- Wrong, malformed, oversized, and unsupported-version hashes fail safely without throwing sensitive output.
- Unknown-email authentication performs dummy scrypt verification and returns the same external credential result as a wrong password.
- `staff:create` accepts a valid normalized email and trimmed display name, reads the password only from `AGENTCLINIC_STAFF_PASSWORD`, and creates one active account.
- The command rejects missing/invalid values, password lengths outside 12–128, duplicate email variants, and database failures without partial writes.
- Process output, errors, logs, Git diff, built files, and test artifacts contain no provisioning password or password hash fixture derived from a real credential.

## 4. Login Contract

- `GET /login` returns `200`, HTML, `Cache-Control: no-store`, one H1, labelled email/password controls, correct autocomplete values, a hidden safe return path, and a fresh login-CSRF cookie/field pair.
- An authenticated request to `GET /login` redirects with `303` to sanitized `returnTo` or `/dashboard`.
- Valid credentials plus same-origin and CSRF evidence return `303`, issue a new session cookie, clear login CSRF, and redirect to the permitted dashboard destination.
- Session rotation proves a pre-login or prior same-browser session token cannot authenticate after successful login.
- Malformed fields return `422`, preserve only normalized email and safe return path, focus the error summary, and never render the submitted password.
- Unknown email, inactive account, and wrong password return the same generic `401` message, document structure, and cache policy.
- Five failed credentials within 15 minutes cause `429` with a bounded `Retry-After`; unknown and known identities follow the same throttle contract.
- Advancing beyond the throttle window permits another attempt, and successful login clears the identity's failure state.

## 5. Cookie, Session, and Cache Contract

- The session cookie is named `agentclinic_session` and contains only a high-entropy opaque token.
- It includes `HttpOnly`, `SameSite=Lax`, `Path=/`, and eight-hour `Max-Age`; HTTPS responses also include `Secure`, while local HTTP responses remain testable without it.
- Only the token's SHA-256 digest exists in the database.
- Unknown, malformed, revoked, inactive-user, and expired session cookies authenticate nobody and never expose their reason.
- Expired sessions are removed when encountered without affecting other sessions.
- Multiple browsers may hold independent valid sessions for the same account; logout revokes only the current one.
- Login, logout, every dashboard response, and protected error response include `Cache-Control: no-store`.

## 6. Authorization and Safe Redirection

- Anonymous `GET /dashboard` and `GET /dashboard/reviews` return `303` to login with their encoded path/query as a safe `returnTo`.
- Every current dashboard mutation route rejects anonymous requests before looking up or changing its target and redirects to login with dashboard as the post-login destination.
- Authentication restores a valid intended dashboard destination but never replays the original POST.
- Absolute URLs, `//host`, backslashes, encoded slash/backslash/control variants, non-dashboard paths, malformed encodings, and nested open-redirect payloads resolve to `/dashboard`.
- Authenticated dashboard and moderation routes retain their existing `200`, `303`, `404`, and `409` contracts after authorization succeeds.
- Home, health, static content, catalogs, details, public booking/confirmation, feedback, reviews, and About remain anonymously accessible.
- Dashboard remains present in public navigation and active throughout authenticated dashboard routes.

## 7. CSRF and Origin Enforcement

- Login POST requires a same-origin `Origin` and matching, unexpired login-CSRF cookie/field pair.
- Appointment confirm/cancel, review approve/unpublish, and logout require a valid session, exact same-origin `Origin`, and correct session-derived hidden CSRF token.
- Missing, duplicated, malformed, expired, or mismatched CSRF values return branded `403` and perform zero database writes.
- Missing, opaque, `null`, cross-origin, malformed, or deceptive-prefix Origin values return `403` without mutation.
- CSRF tokens are compared in constant time and never appear in logs, URLs, external redirects, local storage, or persisted database columns.
- GET, HEAD, and unsupported methods never perform staff mutations.

## 8. Accessibility and Responsive Browser Validation

At `375px x 812px` and `1280px x 800px`, Playwright must:

1. Follow Dashboard from a public page, verify redirection to `/login`, and confirm the email field receives the intended initial focus without horizontal overflow.
2. Submit invalid credentials, verify generic accessible error focus, unchanged URL safety, and an empty password field.
3. Log in with an isolated test staff account and verify return to the originally requested dashboard page.
4. Verify the staff display name, Dashboard active state, and responsive logout control.
5. Complete one protected appointment or review action and verify its existing result through a valid CSRF-protected form.
6. Log out, verify the login destination and cleared cookie, then use browser back navigation and confirm protected content is not restored from cache.
7. Attempt direct dashboard navigation after logout and verify a fresh login redirect.
8. Complete the entire journey by keyboard with visible focus and no clipping, overlap, or page-level horizontal scrolling.

## 9. Logging, Privacy, Regression, and Production Smoke

- Request logs continue to contain method, path, status, and duration only.
- Logs and branded errors contain no email form values, passwords, cookies, session/CSRF tokens, hashes, throttle keys, auth headers, SQL, filesystem paths, or configuration secrets.
- Existing appointment collision, status management, feedback privacy, review publication, map-link safety, traversal protection, branded errors, and responsive navigation tests continue to pass after authenticated test setup.
- The compiled production server applies the auth migration, accepts a provisioned staff account, enforces the same route/session/CSRF contract, and starts without a default account.
- No local database, `.env`, generated output, browser report, credential, session artifact, or provisioning secret is staged.

## Definition of Done

- Every automated authentication, authorization, password, session, throttle, cookie, CSRF, origin, redirect, accessibility, responsive, regression, and production requirement passes.
- Every `/dashboard` read and write requires an active staff session and every protected mutation additionally requires valid CSRF/origin evidence.
- The public care journey remains anonymous and functional.
- The feature branch contains no default credential, external identity provider, additional role, account-management UI, or unrelated roadmap work.
