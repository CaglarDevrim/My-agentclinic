# Staff Authentication and Authorization Plan

## Task Group 1 - Persistence and Cryptography

1. Add the next ordered migration for staff users, hashed opaque sessions, login throttles, foreign keys, uniqueness constraints, and expiry indexes without adding a default account.
2. Add typed staff, session, credential, throttle, and authorization results that keep password hashes and token material out of rendered/public projections.
3. Implement normalized staff-email validation and versioned Node.js scrypt password hashing/verification with fresh salts, fixed production parameters, constant-time comparison, and dummy verification for unknown identities.
4. Implement cryptographically random session creation, SHA-256 token persistence, eight-hour absolute expiry, active-user checks, current-session revocation, and safe expired-session cleanup.
5. Implement hashed-identity failure tracking with five-attempt/15-minute throttling, `Retry-After` calculation, automatic window reset, and success cleanup.

## Task Group 2 - Provisioning and Authentication Domain

6. Add the `staff:create` operator command using the normal database configuration, validated email/name arguments, and `AGENTCLINIC_STAFF_PASSWORD`, with atomic failure and no secret output.
7. Add strict safe-return-path parsing limited to local `/dashboard` paths and reject encoded, protocol-relative, backslash, control-character, scheme, and authority bypasses.
8. Add cookie helpers that serialize and clear login-CSRF and session cookies with matching path, lifetime, SameSite, HttpOnly, and request-origin-dependent Secure attributes.
9. Add login-CSRF generation/verification, session-derived authenticated CSRF values, constant-time comparisons, and exact same-origin validation.

## Task Group 3 - Pages, Layout, and Route Enforcement

10. Add a responsive server-rendered login page with safe email preservation, hidden login-CSRF and return path, password non-repopulation, correct autocomplete attributes, accessible errors, and no-store caching.
11. Extend the shared layout/header to accept authenticated staff context, display the safe staff name, and render a CSRF-protected POST logout form without changing anonymous public navigation.
12. Add branded `403 Forbidden` support consistent with existing `404`, `409`, and `500` error presentation.
13. Add central `/dashboard` authorization middleware that authenticates before protected reads/writes, redirects anonymous GET/POST requests safely, injects staff/session context, and applies no-store caching.
14. Add `GET /login` and `POST /login` with authenticated-user redirect, field validation, generic `401`, throttle `429`, session rotation, secure cookie issuance, login-CSRF cleanup, and sanitized `303` return behavior.
15. Add CSRF and same-origin enforcement to every appointment and review moderation POST form/route, then add `POST /logout` with current-session revocation and matching cookie deletion.
16. Add mobile-first login, staff-identity, compact logout, error, and protected-form styles while retaining visible focus and preventing horizontal page overflow.

## Task Group 4 - Automated Validation and Merge Readiness

17. Add crypto/domain tests for normalization, validation boundaries, versioned scrypt hashes, salt uniqueness, correct/wrong/dummy verification, token hashing, CSRF derivation, constant-time rejection, return-path safety, and cookie serialization.
18. Add migration/database tests for account uniqueness, plaintext absence, session ownership/expiry/revocation, inactive accounts, throttle windows, success cleanup, file-backed persistence, and idempotent migration behavior.
19. Add route tests for login GET/POST, generic failures, validation, throttle/Retry-After, session rotation, cookie flags, safe return paths, logout, no-store headers, and sensitive-value non-disclosure.
20. Add authorization tests proving every dashboard GET/POST is blocked anonymously, public routes remain open, protected record existence is hidden, CSRF/origin failures return `403` without mutation, and valid authenticated actions retain their existing contracts.
21. Add Playwright journeys at `375px x 812px` and `1280px x 800px` for dashboard-to-login redirection, invalid and valid login, target return, appointment/review action CSRF, staff identity, keyboard/focus behavior, logout, back-navigation cache safety, and overflow prevention.
22. Run type checking, all Vitest and Playwright suites, production compilation/smoke validation, dependency audit, whitespace validation, secret/artifact review, and clean Git checks before requesting merge.
