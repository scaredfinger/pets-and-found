---
id: "00006"
title: "GitHub authentication skill and change workflow"
category: governance
type: architecture
status: accepted
date: 2026-10-20
tags: [github, credentials, opencode, skills, orchestration, security]
dependsOn: ["00000", "00002", "00005"]
supersedes: ["00003"]
related: ["00004"]
---

# AI Summary

The GitHub REST authentication procedure is a task-loaded OpenCode skill. It preserves the credential-handling and combined issue workflow rules from ADR 00003 without making routine commands load that ADR.

# Context

GitHub REST access requires a security-sensitive repeatable procedure. Embedding it in solve ties one command to a historical ADR and makes the procedure unavailable to other authorized GitHub workflows.

# Decision

Use a task-loaded GitHub authentication skill before GitHub REST requests. The skill validates a credential-bearing HTTPS origin push remote, derives credentials only in process, scopes them to individual requests, never logs, persists, rewrites, or changes credentials or remotes, and fails closed when credentials or authorization are unavailable. State-changing requests require user authorization. The solve workflow may accept one or more related issues, uses one branch and PR, performs bounded plan, implementation, validation, review, and CI retries, and never merges a PR automatically.

# Rationale

A focused skill centralizes a procedure that can be loaded only when needed, while retaining the existing security and change-workflow guarantees.

# Consequences

Positive: reusable authentication procedure without routine ADR loading. Negative: the skill is guidance until a GitHub REST integration is implemented and verified.

# Implementation Notes

Solve loads the skill before GitHub REST access. Commands do not reference ADR 00003. This decision supersedes ADR 00003 in full; its change-workflow rules are retained here.

# Provenance

Author: Repository user direction
Sources: GitHub issue #8; ADR 00003; Cinderling authentication skill discussion
