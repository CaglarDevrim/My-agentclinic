---
name: changelog
description: Maintain a project-root CHANGELOG.md from Git commit history, grouped under YYYY-MM-DD headings. Use when the user explicitly invokes $changelog or asks to create, generate, refresh, or update the changelog before merging a branch.
---

# Changelog

1. Identify the intended project root. Use the directory that should contain `CHANGELOG.md`; it may be below the Git repository root.
2. Run the bundled script with that project root:

   ```sh
   node <skill-dir>/scripts/update-changelog.mjs <project-root>
   ```

3. Review the resulting `CHANGELOG.md` and its Git diff.
4. Confirm that it contains one `# Changelog` title, newest-first `## YYYY-MM-DD` headings, and one bullet per commit that affected the project.
5. Report when uncommitted work is absent from the changelog because it has no Git commit yet.
6. Do not commit, merge, or push unless the user separately requests those actions.

The script regenerates the changelog deterministically from scoped Git history. Re-running it without new commits must leave the file unchanged.
