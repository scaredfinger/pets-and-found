---
id: "00007"
title: "Private GitHub Release distribution"
category: governance
type: architecture
status: accepted
date: 2026-10-21
tags: [distribution, cli, migration, authentication]
dependsOn: ["00000", "00002", "00006"]
supersedes: ["00004"]
related: ["00003"]
---

# AI Summary

Replace npm registry distribution with private versioned GitHub Releases and explicit consumer migrations.

# Context

The project requires private distribution without publishing to npm. The accepted npm-distribution decision remains an immutable historical record.

# Decision

Release tags with explicit versions on the intended main history identify immutable kit archives attached to private GitHub Releases. Required validation precedes publication. Consumers supply explicit private-repository authorization for an explicit release version; consumer CLI downloads use a request-scoped `GH_TOKEN` and fail closed if access is unavailable. Agent-operated GitHub REST workflows continue to follow ADR 00006 and its authentication skill. Consumers record the exact release version in metadata and an adoption decision, and create a fresh migration decision for each upgrade. Existing project overrides must never be silently overwritten. GitHub Actions run artifacts are not a distribution channel. No public release or registry publication is required.

# Rationale

Git tags and private Releases provide a durable, reviewable source of versions without registry credentials or unpinned upgrades.

# Consequences

Release jobs require tag ancestry and validation gates; users need private-repository read authorization. Migration tooling must protect project-owned files and support dry runs.

# Implementation Notes

The consumer release-download credential is provided explicitly rather than inferred from the consumer's Git remote, which may not yet exist at initialization. The agent-authentication skill remains the authority for agent-operated REST requests. Promotion updates the governance compaction without modifying superseded ADR 00004.

# Effective Architecture

Distribute Cinderling only as a versioned archive attached to a private GitHub Release whose tag is on validated main history. Require an explicit version and authenticated private-repository access for installation; the consumer CLI uses a request-scoped `GH_TOKEN`, while agent-operated GitHub REST workflows follow ADR 00006. Record installed versions in project metadata and immutable adoption/migration decisions; protect project overrides and provide dry-run upgrades. Never publish to npm or silently select latest.

# Provenance

Author: Issue-driven draft
Sources: GitHub issue #5; ADR 00004
