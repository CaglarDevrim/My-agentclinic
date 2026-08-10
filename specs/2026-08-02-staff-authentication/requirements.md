# Staff Authentication and Authorization Requirements

## Context

Staff Authentication and Authorization is Phase 5 of the post-MVP roadmap. AgentClinic already exposes a public care journey and a staff dashboard with appointment mutation and review-moderation actions, but every dashboard route is currently anonymous. This phase introduces individual staff identities, dependable sessions, and enforcement around all staff-only reads and writes.

The feature must preserve the existing Hono, TypeScript, server-rendered JSX, libSQL/SQLite, Post/Redirect/Get, responsive, accessible, and JavaScript-optional architecture. It must not require an external identity provider or a second runtime service.

## Scope

This feature must:

- Add individual database-backed staff accounts with one shared `staff` authorization level.
- Add accessible login and logout workflows without public registration.
- Protect every route below `/dashboard`, including dashboard reads, review moderation, appointment confirmation, and appointment cancellation.
- Use opaque, revocable, expiring database sessions and secure cookies.
- Protect login and authenticated mutations against CSRF and open redirects.
- Provide a secure operator command for creating the initial and subsequent staff accounts.
- Add complete persistence, route, security, responsive, accessibility, and production-browser evidence.

Public agent, ailment, therapy, appointment-booking, appointment-confirmation, feedback, review, About, home, health, and static-asset routes remain anonymous.

## Persistence Model

Add one ordered migration after `009_appointment_open_slot_unique.sql` containing:

- `staff_users`: numeric ID, normalized unique email, trimmed display name, versioned password hash, active flag, and creation timestamp.
- `staff_sessions`: unique SHA-256 token hash, owning staff ID with cascading deletion, creation timestamp, and absolute expiry timestamp.
- `staff_login_throttles`: SHA-256 normalized-identity key, failure count, and window start timestamp.
- An expiry index supporting session lookup and cleanup.

Requirements:

- Normalize email with trim plus lowercase before validation, lookup, uniqueness checks, throttle-key derivation, and persistence.
- Accept email lengths from 3 through 254 characters, display names from 1 through 100 trimmed characters, and passwords from 12 through 128 characters.
- Preserve password characters exactly; do not trim, lowercase, normalize, log, return, or persist a plaintext password.
- Store passwords in a versioned `scrypt` representation using a fresh cryptographic 16-byte salt, 64-byte derived key, `N=32768`, `r=8`, and `p=3`.
- Perform the same bounded scrypt work against a fixed dummy hash when an email is unknown so response timing does not reveal account existence.
- Store only a SHA-256 digest of each 32-byte random session token. The raw token exists only in the browser cookie and current request memory.
- Use an eight-hour absolute session lifetime. Expired, inactive-user, revoked, malformed, or unknown sessions authenticate nobody and are removed when safely encountered.
- Allow concurrent sessions on different browsers. A successful login replaces any session presented by that browser but does not revoke the user's other valid sessions.
- Never add a deterministic staff seed, default password, production credential, auth secret, or token to migrations, seed data, source control, logs, or HTML.

## Staff Account Provisioning

- Add an `npm run staff:create -- --email <email> --name <display-name>` operator command.
- Read the password only from `AGENTCLINIC_STAFF_PASSWORD`; never accept it as a command-line argument or print it.
- Reuse the normal validated database configuration so the command works with local libSQL and remote Turso.
- Refuse missing/invalid inputs, an existing normalized email, or a missing password without partially writing a record.
- Create only new active staff accounts. Account editing, password reset, role changes, and account-management UI are outside this phase.

## Login and Logout Contract

### `GET /login`

- Return `200 OK` with a server-rendered login form for anonymous visitors.
- Redirect an already authenticated staff member to the sanitized `returnTo` destination or `/dashboard` with `303`.
- Accept `returnTo` only when it is a relative path beginning with `/dashboard` and contains no scheme, authority, backslash, encoded bypass, control character, or protocol-relative form.
- Issue a fresh 32-byte login-CSRF token in an HttpOnly, `SameSite=Lax`, path-scoped `/login`, ten-minute cookie and render the same value in a hidden field.
- Use `Cache-Control: no-store` and never render whether an account exists.

### `POST /login`

- Require an exact same-origin `Origin` header and a constant-time match between the login-CSRF cookie and hidden field before credential processing.
- Treat duplicated, missing, non-string, malformed, or oversized fields as validation errors and never authenticate them.
- Return an accessible `422` form for malformed email/password input while preserving only the normalized email and safe `returnTo`; never repopulate the password.
- Return `401 Unauthorized` with the same generic message for an unknown email, inactive account, or wrong password.
- Count failed credentials by hashed normalized identity. Five failures inside a rolling 15-minute window produce a generic `429 Too Many Requests` response with `Retry-After`; successful authentication clears that identity's throttle record.
- On success, revoke any valid session token supplied by the same browser, create a fresh unrelated session, set the session cookie, clear the login-CSRF cookie, and redirect with `303` to sanitized `returnTo` or `/dashboard`.

### `POST /logout`

- Require a valid staff session, exact same-origin `Origin`, and valid authenticated CSRF token.
- Revoke only the current session, clear the session cookie using matching attributes, and redirect to `/login` with `303`.
- GET and unsupported methods never log a user out.

## Session Cookie and CSRF Contract

- Use the cookie name `agentclinic_session` with `HttpOnly`, `SameSite=Lax`, `Path=/`, and an eight-hour `Max-Age`.
- Add `Secure` whenever the request origin uses HTTPS; production deployment must serve authentication only over HTTPS.
- Do not place identity data, authorization state, CSRF state, database IDs, or return destinations inside the cookie.
- Derive the authenticated CSRF value from the raw session token using a domain-separated SHA-256 digest and render it only in staff POST forms.
- Validate authenticated CSRF values with constant-time byte comparison.
- Require exact same-origin `Origin` validation in addition to the token for every authenticated POST.
- Missing, duplicated, malformed, expired, or mismatched CSRF input returns a branded `403 Forbidden` response and performs no mutation.
- Authentication, login, dashboard, moderation, and staff mutation responses use `Cache-Control: no-store`.

## Authorization and Navigation

- Apply authorization centrally to all current and future `/dashboard` paths rather than separately relying on each handler.
- Anonymous GET requests below `/dashboard` redirect with `303` to `/login?returnTo=<encoded-path-and-query>`.
- Anonymous POST requests below `/dashboard` perform no action and redirect with `303` to `/login?returnTo=%2Fdashboard`; state-changing requests are never replayed after login.
- Authenticated requests for dashboard pages expose the staff display name to the shared layout and include a CSRF-protected POST logout form.
- Keep the Dashboard item in primary navigation for anonymous visitors; following it leads through login and then back to the dashboard.
- Dashboard remains the active navigation section on every protected dashboard page.
- Authorization checks happen before protected database reads or writes and do not reveal protected record existence.

## Presentation and Accessibility

- The login page uses one H1, explicit email and password labels, autocomplete values `username` and `current-password`, a visible submit button, and an accessible error summary.
- Authentication errors receive focus and are understandable without color, icons, or client-side JavaScript.
- Password values are never echoed into HTML after any response.
- Staff identity and logout controls have unambiguous accessible names and visible keyboard focus.
- Login, authenticated header controls, dashboard tables/forms, and branded `403` responses remain usable without clipping or page-level horizontal overflow at `375px` and `1280px`.

## Security, Privacy, and Reliability

- Use Node.js cryptographic primitives and parameterized SQL; no external authentication service is introduced.
- Compare password hashes, CSRF values, and relevant token material without data-dependent string equality.
- Regenerate sessions after every successful login to prevent fixation.
- Use generic credential errors, dummy password verification, and hashed throttle identities to limit account enumeration.
- Do not log cookies, passwords, email form values, CSRF tokens, session tokens, password hashes, throttle keys, or authorization headers.
- Branded auth errors expose no SQL, stack traces, filesystem paths, configuration, account status, or token details.
- Existing remote Turso configuration remains compatible, and automated tests use only isolated in-memory or temporary databases.

## Decisions

1. Use individual database-backed accounts with one staff authorization level; do not add admin/member roles.
2. Use built-in Node.js scrypt and opaque database sessions rather than signed identity cookies or an external provider.
3. Protect every `/dashboard` read and write while leaving the existing public care journey anonymous.
4. Use an operator-only account-creation command and never ship a default credential.
5. Combine same-origin validation with login and authenticated CSRF tokens.
6. Require the complete automated security, database, route, mobile, desktop, regression, and production merge gate.

## Out of Scope

- Public registration, invitations, email verification, password change/reset, account recovery, or account-management pages
- Admin/staff role separation, fine-grained permissions, audit history, impersonation, or organization membership
- MFA, passkeys, OAuth, OpenID Connect, SAML, Clerk, Auth0, or other external identity services
- Therapist accounts, therapist schedules, patient identities, or authorization for public appointment booking
- Remember-me sessions, refresh tokens, rolling expiry, global sign-out, device lists, or remote session management
- Distributed rate-limiting infrastructure, CAPTCHAs, email security alerts, or breach-detection services
- Client-side authentication state, SPA routing, localStorage/sessionStorage tokens, or new browser JavaScript

## Assumptions

- Production authentication is served only over HTTPS; local development may use HTTP and therefore omits the cookie's `Secure` attribute.
- Operators can supply `AGENTCLINIC_STAFF_PASSWORD` securely when running the account-provisioning command.
- Server clocks are sufficiently synchronized for eight-hour session expiry and 15-minute throttle windows.
