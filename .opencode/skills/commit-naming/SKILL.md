---
name: commit-naming
description: Use when preparing Git commits to write Commitizen-style conventional commit messages with Cinderling provenance.
---

# Commit naming

Write the subject as `type(scope): concise description`, omitting `(scope)` when it adds no useful context. Choose the type that best describes the change: `feat`, `fix`, `docs`, `refactor`, `test`, `build`, `ci`, or `chore`; use another conventional type when appropriate. Use a short, lowercase, imperative description without a trailing period.

Add a body separated by a blank line when the reason or consequences need explanation. Mark an actual breaking change with `!` after the type or scope and explain it in a `BREAKING CHANGE:` footer. Do not mark changes as breaking without evidence.

Keep one causal trigger per commit when practicable. Include a `Phoenix-Trigger: <reference>` trailer identifying the cause, such as an issue reference; bootstrap history is exempt from graph completeness. Preserve other repository commit requirements and inspect status, diff, and recent history before committing. Commit only when explicitly authorized.

Example:

```text
feat(cli): add archive inspection

Expose archive metadata before installation.

Phoenix-Trigger: #123
```
