---
id: "00003"
title: "GitHub authentication and change workflow"
category: governance
type: architecture
status: accepted
date: 2026-10-20
tags: [github, credentials, orchestration, security]
dependsOn: ["00000", "00002"]
supersedes: []
related: ["00004"]
---

# AI Summary

Preserve the Calimero direct GitHub REST authentication approach and combined issue-solving workflow. Handle remote credentials in process, without disclosure or surprise auth changes.

# Context

A reproducible OpenCode devcontainer must access GitHub issues and PRs without reconfiguring the user's existing authentication.

# Decision

For the user-selected GitHub workflow, use GitHub REST and derive credentials in process from a validated credential-bearing HTTPS origin push remote. Parse userinfo safely, prefer password when available otherwise username, scope credentials to individual requests, never log them, never persist or rewrite credentials and fail closed if missing. Do not perform state-changing operations without authorization. The solve workflow accepts one or several related issues, uses one branch and PR, bounded plan/implement/test/review/CI retries, and does not merge PRs automatically.

# Rationale

Retains existing project behavior while avoiding agent-auth configuration mutation. Embedding credentials in remote URLs poses local process/config exposure risks, so documentation should recommend safer credential helpers for future versions.

# Consequences

Positive: predictable operation in existing projects. Negative: dependence on credentialed origin and its security tradeoffs.

# Implementation Notes

Port the preferred villa-calimero-alegria prime and solve behavior but remove project-specific commands and rigid model fleets. Do not assume bootstrap prompts implement the REST calls yet.

# Provenance

Author: Repository bootstrap with user direction
Sources: villa-calimero-alegria AGENTS.md and solve command; sample-phoenix GitHub governance
