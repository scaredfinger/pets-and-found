---
id: "00009"
title: "Project-local OpenCode definition ownership"
category: governance
type: architecture
status: accepted
date: 2026-10-28
tags: [distribution, opencode, migration]
dependsOn: ["00007"]
supersedes: []
related: ["00002"]
---

# AI Summary

Cinderling distributes project-local OpenCode agents, skills and commands and requires an explicit decision about existing definitions during migration.

# Context

Existing definitions can conflict with kit-provided workflows, while project MCP configuration and user-level configuration have different ownership.

# Decision

Package and install kit-owned agents, skills and commands. Inventory project-local definitions during installation and upgrades, requiring an explicit retain or retire decision. Archive both retained and retired definitions outside discovery before removing their active entry points; install kit definitions at colliding paths and prevent legacy definitions from returning. Preserve project MCP configuration, executables, and project-owned architecture and code; do not inspect user configuration. Fail closed when project discovery cannot be resolved safely.

# Rationale

Explicit migration avoids silent loss or accidental resurrection of local workflows.

# Consequences

Consumers review conflicts and restart OpenCode to observe the resulting definitions. Retain means retain in a private, Git-ignored project archive, not as an active competing harness; both choices require a private external export at an explicitly selected durable destination. Inline definitions are archived separately and the full original configuration is privately preserved, including comments and possible secrets; other configuration remains effective. Skill support files are backed up and remain in place. Existing project-owned manifests require explicit validation integration and verification.

# Implementation Notes

This decision is scoped to project-local OpenCode definitions and distribution migration. Existing accepted decisions and project architecture remain authoritative.

# Effective Architecture

Cinderling owns the project-local OpenCode agents, skills and commands it distributes. On initialization and upgrade, inventory existing definitions and require explicit retain or retire decisions before removing their active entry points; archive both choices outside discovery and install Cinderling replacements at colliding paths. Require a private external backup for migrated definitions, preserve project-local MCP configuration and executables and project-owned architecture and code, and do not inspect or modify user-level configuration. Fail closed when project-local discovery cannot be resolved safely. Retained legacy definitions are preserved for review, not kept active as a competing harness.

# Provenance

Author: Cinderling contributors
Sources: Issue 23
