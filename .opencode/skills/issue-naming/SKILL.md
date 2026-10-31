---
name: issue-naming
description: Use when creating or renaming GitHub issues to write clear Commitizen-style conventional issue titles.
---

# Issue naming

Write the title as `type(scope): concise description`, omitting `(scope)` when it does not add useful context. Choose the type that best describes the requested work: `feat` for a capability, `fix` for a defect, `docs` for documentation, `refactor` for restructuring, `test` for tests, `build` or `ci` for build and automation, and `chore` for maintenance. Use another conventional type when it better fits.

Use a short, lowercase, imperative description without a trailing period. Name the outcome rather than a proposed implementation when practical; add details and acceptance criteria to the issue body. Avoid inventing a scope or asserting a breaking change without evidence.

Examples:

- `feat(cli): add archive inspection`
- `fix: preserve project overrides during upgrades`
- `docs: clarify release installation prerequisites`

Follow the repository's GitHub authentication and authorization instructions when creating or editing an issue.
