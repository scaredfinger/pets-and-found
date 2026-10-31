---
name: branch-naming
description: Use when creating an issue branch to choose a Git-safe conventional branch name.
---

# Branch naming

Name a new issue branch `<type>/<issue-numbers>-<description>`. Choose the conventional type that best describes the work: `feat`, `fix`, `docs`, `refactor`, `test`, `build`, `ci`, or `chore`; use another conventional type when appropriate. Use lowercase ASCII letters and digits, with hyphens between description words. Keep the description short and describe the outcome.

Use positive decimal issue numbers without leading zeroes. For related issues, include each approved issue number once in ascending numeric order, separated by hyphens. Use one branch for the approved issue or related issue group. Validate the resulting name with `git check-ref-format --branch` before creating it. Do not rename existing branches solely to apply this convention.

Examples:

- `feat/42-add-archive-inspection`
- `fix/34-allow-tmp-access`
- `docs/51-clarify-installation`
- `feat/22-24-solve-validation` for issues 22 and 24
