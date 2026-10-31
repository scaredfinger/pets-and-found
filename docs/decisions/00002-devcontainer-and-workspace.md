---
id: "00002"
title: "Development workspace and OpenCode runtime"
category: governance
type: architecture
status: accepted
date: 2026-10-20
tags: [devcontainer, opencode, pnpm, nx]
dependsOn: ["00001"]
supersedes: []
related: ["00003"]
---

# AI Summary

Node 24, pnpm and Nx inferred scripts operate inside a kit-managed devcontainer. Preserve host OpenCode credential mounts separately from persistent project-local runtime state and keep nested mounts intentionally.

# Context

Agents require reproducible execution and continuity of host configuration/auth without root-owned mount directories.

# Decision

Use a standard Node 24 image-based devcontainer with Docker-outside-of-Docker and pnpm/Nx. Derive project tasks from package.json scripts and pnpm-workspace.yaml, with no Nx project.json and no Nx-specific semantic graph identities. Keep the Calimero-style overlapping mounts and host-owned OpenCode configuration/auth separation, prepared by host initialization before container start. Distribute kit-managed devcontainer configuration via explicit, reviewable upgrades that preserve consumer overrides.

# Rationale

Matches working repo conventions and prevents accidental root-owned bind mount creation.

# Consequences

Positive: consistent tools and persistent local agent state. Negative: host-directory dependency, Docker socket trust, and platform compatibility work.

# Implementation Notes

The devcontainer should avoid duplicative runtime services, use host init to precreate mounts, map tool state to ignored local paths, and install pinned OpenCode if configured. Verify credential mount overlays on a real host.

# Provenance

Author: Repository bootstrap with user direction
Sources: villa-calimero-alegria .devcontainer and ADRs 00028, 00029
