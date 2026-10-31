---
id: "00004"
title: "Cinderling package adoption and migrations"
category: governance
type: architecture
status: accepted
date: 2026-10-20
tags: [distribution, cli, migration, devcontainer]
dependsOn: ["00000", "00002"]
supersedes: []
related: ["00003"]
---

# AI Summary

Versioned npm package and CLI distribute reusable conventions and managed devcontainer artifacts; consumer projects record adoption and every migration through new ADRs.

# Context

A GitHub template cannot easily propagate later improvements while preserving project modifications.

# Decision

Publish a versioned @scaredfinger/cinderling package and CLI. On init provide project-specific governance/adoption decisions and the exact package version; on every upgrade create a new immutable migration ADR documenting from/to versions, changes and overrides. Never silently overwrite modified project files; provide dry run and reviewable diffs. Consumers define all architecture categories except governance.

# Rationale

Allows safe opt-in evolution without custom forks drifting.

# Consequences

Positive: reproducible adoption history. Negative: merge/override logic and migration tests are required.

# Implementation Notes

A future init/upgrade CLI must enforce these conditions with fixture tests. This repository currently contains no published CLI.

# Provenance

Author: Repository bootstrap with user direction
Sources: Cinderling planning conversation
