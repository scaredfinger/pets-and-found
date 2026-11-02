---
id: "00017"
title: "Retire kit evidence pages from this consumer"
category: governance
type: architecture
status: accepted
date: 2026-10-31
tags: [adoption, documentation, migration]
dependsOn: ["00015"]
supersedes: []
related: ["00010"]
---

# AI Summary

Retire three release-managed Cinderling issue evidence pages from this consumer while retaining immutable historical records.

# Context

The installed release copied kit-specific historical issue evidence that is not consumer documentation. Its accepted ADR 00010 historically references one removed page.

# Decision

Remove docs/issue-16-release-verification.md, docs/issue-18-prime-solve-evidence.md and docs/issue-22-github-interaction-evidence.md. Replace active documentation links with a reference to the Cinderling source repository. Preserve accepted ADR 00010 without rewriting its historical reference. Treat these removals and the edited installation guide as reviewed consumer adaptations during the next upgrade; retain original installation metadata as historical evidence.

# Rationale

The source repository owns release evidence and the consumer should not maintain copies. Historical accepted content remains immutable.

# Consequences

The historical ADR reference no longer resolves locally. Future installers must explicitly classify the deleted managed assets and guide adaptation rather than silently restoring them.

# Implementation Notes

The historical records remain available in the Cinderling release and source repository. This draft remains scoped and unpromoted pending review.

# Effective Architecture

Kit issue evidence stays in the Cinderling repository, not this consumer. Installation guidance points to the source repository while historical accepted records remain immutable.

# Provenance

Author: Project owner and implementation agent
Sources: Consumer scaffold review and Cinderling v0.1.0-beta.7 installation metadata
