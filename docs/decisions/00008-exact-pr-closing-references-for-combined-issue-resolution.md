---
id: "00008"
title: "Exact PR closing references for combined issue resolution"
category: governance
type: architecture
status: accepted
date: 2026-10-21
tags: [github, pull-requests, orchestration]
dependsOn: ["00006"]
supersedes: []
related: []
---

# AI Summary

For an approved solve of issues #5, #6, and #7, the PR body must contain three separate lines:

```text
Closes #5
Closes #6
Closes #7
```

Validate the exact approved set immediately before creation and verify those same lines in the persisted PR body. Mention issues outside the resolved set without closing keywords.

# Context

A combined solve needs an explicit closing reference for every issue it resolves. Ambiguous mixed references in a PR body can leave some resolved issues open.

# Decision

The PR-creation step normalizes and validates the user-approved issue set before creation. Each resolved issue receives one standalone closing line in the PR description. Reject missing, duplicate, extra, or inline closing references, check again immediately before creation, and verify the persisted body after creation. Related but unresolved issues do not receive closing keywords. An unpromoted scoped draft keeps the PR in draft; no automatic merge.

# Rationale

Explicit closing lines make combined resolutions unambiguous and independently checkable. A task-loaded skill keeps routine solve context small; a deterministic helper enforces the body contract.

# Consequences

PR creation must stop on ambiguous issue scope or body mismatches. The helper cannot decide whether an issue is actually resolved, and remote persistence requires authenticated verification.

# Implementation Notes

`/solve` loads the PR-creation skill at PR time. `tools/pr-body.mjs` renders and checks bodies. GitHub authentication remains governed by the separate authentication skill.

# Effective Architecture

For a solve PR, normalize the authorized resolved issue set, require exactly one standalone closing line per resolved issue and none for other issues, check immediately before creation, and verify the persisted PR body. Keep PRs with scoped unpromoted ADRs in draft and never merge automatically.

# Provenance

Author: Repository user direction
Sources: GitHub issue #12; draft PR #11; ADR 00006
