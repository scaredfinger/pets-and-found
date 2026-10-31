---
id: "00010"
title: "Endpoint-aware GitHub interaction and CI evidence"
category: governance
type: architecture
status: accepted
date: 2026-10-29
tags: [github, credentials, ci, opencode, skills]
dependsOn: ["00006", "00008"]
supersedes: []
related: ["00007"]
---

# AI Summary

Keep authentication and GitHub interaction in separate task-loaded skills; choose endpoints and permissions explicitly and establish narrowly scoped CI evidence for the current PR head.

# Context

ADR 00006 governs credentials and the change workflow, while ADR 00008 governs approved PR closing references. They do not specify which GitHub endpoints establish a CI result or how to diagnose an endpoint-specific denial. A token can read an Actions workflow run yet lack access to the Checks API. Conflating those requests can obscure a usable result or falsely suggest that all required checks passed.

# Decision

For agent-operated GitHub work, load the authentication skill and a separate interaction skill. The authentication skill remains responsible for validating the credential-bearing HTTPS origin push URL, request-scoped credential protection, explicit mutation authorization and fail-closed behavior under ADR 00006. The interaction skill specifies operation and endpoint selection, fine-grained repository permissions, error diagnosis and result verification. Issue-driven solve loads both. An individual `gh` invocation may receive the validated origin-derived credential through its process environment; a REST request may use a request-scoped Bearer header. Never print, persist or place credentials in arguments or change authentication sources, remotes or configuration silently.

Use the least privilege required by each authorized operation. Isolate a failed endpoint and report only its status, sanitized error, accepted-permissions header and relevant rate-limit information. Stop on a failed required request; an optional denied endpoint is not a pass. An independently successful endpoint supports only its own explicitly stated result. For Actions CI, compare the current PR head SHA with each relevant run's head SHA, require completion and success, and verify the expected workflow and jobs. External required checks remain unverified unless independently inspected. Recheck after a head change and never merge automatically. Continue to follow ADR 00008 for PR closing references.

# Rationale

Separating operation selection from authentication preserves the focused security policy while making permissions and evidence specific to each endpoint. Actions results can be verified without demanding Checks API access when Actions is sufficient for that narrower claim.

# Consequences

Solve requires two skills and must distinguish Actions results from other required checks. Endpoint permissions and GitHub behavior can change and must be reviewed against current documentation. The historical live exercise demonstrates the Actions and denied Checks paths only for the recorded SHA; it does not prove a new PR's CI or any other endpoint.

# Implementation Notes

The interaction skill records the operation and permission mapping; `docs/issue-22-github-interaction-evidence.md` records the authenticated exercise. Consumer release downloads use their separately supplied authorization under ADR 00007. This decision extends ADR 00006 and complements ADR 00008 without superseding either.

# Effective Architecture

For agent-operated GitHub interactions, load the authentication and interaction skills. Preserve ADR 00006's credential and authorization rules and ADR 00008's PR body contract. Select endpoint-specific least privileges, isolate and report denied requests safely, and fail closed on required failures. Verify current-head Actions runs and expected jobs independently; a denied optional Checks endpoint is not a pass, and external checks remain unverified without their own evidence. Never merge automatically.

# Provenance

Author: Cinderling contributors
Sources: Issue 22; ADR 00006; ADR 00008; issue 18 endpoint observations
