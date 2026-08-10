---
name: find-docs
description: Retrieves up-to-date documentation, API references, and code examples for developer technologies through the Context7 CLI. Use for library, framework, SDK, CLI, cloud-service, API-syntax, configuration, migration, or version-specific questions where current documentation matters.
---

# Find Current Documentation

Use the Context7 CLI to retrieve current, version-aware library documentation and examples. Prefer this workflow over model memory for API details.

## Workflow

1. Resolve the official library name to a Context7 library ID:

   ```bash
   npx ctx7@latest library <name> "<specific documentation question>"
   ```

2. Select the closest official result using name match, source reputation, documentation coverage, and version match.
3. Query the selected ID:

   ```bash
   npx ctx7@latest docs </org/project[/version]> "<specific documentation question>"
   ```

Skip resolution only when the user supplies an exact Context7 ID beginning with `/`.

## Query Rules

- Always provide a focused query; never use a vague single-word query.
- Use a version-specific ID when the user names a version and Context7 exposes that version.
- Keep each query to one documentation topic unless the user asks how topics interact.
- Never send API keys, passwords, credentials, personal data, or proprietary code to Context7.
- Do not run more than three Context7 commands for one question. Use the best available result after that limit.

## Authentication and Failures

- Documentation lookup works without authentication; OAuth login increases rate limits.
- Run Context7 requests outside the default sandbox when network access is restricted.
- If the CLI reports a quota failure, tell the user and recommend `npx ctx7@latest login`.
- If current documentation cannot be retrieved, disclose that before using potentially outdated model knowledge.
