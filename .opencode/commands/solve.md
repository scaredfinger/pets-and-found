---
description: Plan and solve one or more related GitHub issues, with one PR
---

Accept $1 as comma-separated issue numbers, $2 as optional base branch (default current branch), and $3 as maximum combined iterations (default 5). If missing $1 stop with a concise request.

Prime current operational guidance, roadmap, and category compactions. Do not load decision indexes, accepted ADRs, or decision drafts unless the scoped work creates, reviews, promotes, supersedes, or requires resolving a specific decision conflict. Determine current package graph and semantic impact as far as existing tools allow.

Before GitHub interactions, load and follow the `github-authentication` and `github-interaction` skills. If authentication or required authorization is unavailable, stop. On bootstrap do not assume package automation is already installed.

Create one combined plan with issue-by-issue acceptance criteria, semantic dependencies, test impact and minimal validation. Before creating a branch, load and follow the `branch-naming` skill. Use one branch for the combined issues, based on the selected base branch. Never discard unrelated worktree changes or force push.

Implement with a competent primary agent; use independent reviewer as available. Keep architecture docs/issue bodies out of delegated context unless necessary. Run the minimum relevant tests, lint and architecture evaluations **when implemented**. Iterate on actionable failures up to max iterations across local/CI/review. Never claim unimplemented checks passed.

Use the stable project-root contract: `pnpm test` runs all unit tests, `pnpm test:arch` all architecture tests, `pnpm test:cinderling` Cinderling-specific validations, and `pnpm e2e` the project-owned end-to-end suite, including DB and browser coverage when applicable. During implementation run affected tests and relevant architecture and Cinderling checks. Before presenting a candidate for review, run all of `pnpm test`, `pnpm test:arch`, and `pnpm test:cinderling`. After review and before merge, arrange `pnpm e2e` against the reviewed exact-head candidate. Any candidate change invalidates prior final-gate evidence; rerun the appropriate gates against the new head. Missing, unavailable, or deferred e2e is a blocker or explicitly pending, never a pass; do not represent the starter adoption scenario as full project e2e. Projects choose their underlying orchestration without changing these commands.

Create draft ADRs for governance changes, and keep PR in draft while unpromoted ADRs remain. A valid scoped draft is authoritative on its branch but not part of promoted architecture. Never edit accepted ADRs.

Before PR validate graph reachability/blast-radius assumptions, decision governance, no-comments policy, and behavior test coverage; note any checks not yet implemented. Before an authorized commit load and follow the `commit-naming` skill; commit only intended files with one Phoenix-Trigger trailer (unless bootstrap exception). Before creating the PR load and follow the `pr-creation` skill, validating the approved issue set and complete closing references immediately before creation and checking the persisted body afterward. Push and create one PR, do not merge. Observe CI against exact head SHA; if failing fix within retry limit, otherwise report blockers. Report branch, PR and validation state.

When a draft decision is in scope, distinguish its branch authority from promoted compactions. Require exact issue references in the PR and report incomplete acceptance without claiming it passed. Treat a release integration or fresh-host check as pending until it actually runs.
