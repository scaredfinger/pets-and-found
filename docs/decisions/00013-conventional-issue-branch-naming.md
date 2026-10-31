---
id: "00013"
title: "Conventional issue branch naming"
category: governance
type: architecture
status: accepted
date: 2026-10-30
tags: [git, workflow, opencode, skills]
dependsOn: ["00006"]
supersedes: []
related: ["00008"]
---

# AI Summary

Use a task-loaded skill to name new issue branches with a conventional type, the approved issue numbers and a concise description.

# Context

Issue branches have used inconsistent names, making the purpose and issue scope harder to recognize. Related issues already share one branch and PR.

# Decision

For new issue branches, load the branch-naming skill before creation and use `<type>/<issue-numbers>-<description>`. Use a conventional change type and a lowercase kebab-case description. Represent each approved positive issue number once, in ascending numeric order, separated by hyphens. Verify the name is a valid Git branch name. Existing branches need not be renamed.

# Rationale

A task-loaded convention keeps branch names recognizable while preserving the existing single-branch combined-issue workflow.

# Consequences

The skill and solve command must be distributed together. Branch names are guidance rather than a deterministic enforcement mechanism, and existing branches retain their names.

# Implementation Notes

The scoped draft governs this branch pending explicit review and promotion. Consumer upgrades follow the existing managed-file migration process.

# Effective Architecture

Before creating a new issue branch, load the branch-naming skill. Name it `<type>/<issue-numbers>-<description>`, using a conventional change type, each approved positive issue number once in ascending numeric order separated by hyphens, and a concise lowercase kebab-case description. Validate the name as a Git branch; do not require existing branches to be renamed.

# Provenance

Author: Cinderling contributors
Sources: GitHub issue #36
