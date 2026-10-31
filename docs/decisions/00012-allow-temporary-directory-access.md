---
id: "00012"
title: "Allow temporary directory access"
category: governance
type: architecture
status: accepted
date: 2026-10-30
tags: [opencode, permissions, development-workspace]
dependsOn: ["00002"]
supersedes: []
related: []
---

# AI Summary

Allow OpenCode to access `/tmp` for temporary work in the Cinderling kit without asking the user for permission.

# Context

Temporary files outside the workspace are useful during implementation and verification. OpenCode's external-directory permission can otherwise interrupt this work with a permission request.

# Decision

The kit's project-local OpenCode configuration allows external-directory access to `/tmp` and `/tmp/*`. Agents may use `/tmp` for temporary work as needed without asking the user and should proceed directly with implementation.

# Rationale

An explicit permission and working agreement make routine temporary work available without an avoidable interruption. Restricting the configured exception to `/tmp` retains the existing handling of other external directories.

# Consequences

Temporary work can proceed without a separate user approval for `/tmp`. Temporary files are outside the repository and should not be treated as durable project artifacts. The permission is specific to the kit's project-local configuration; it is not automatically installed in consumer projects by this change.

# Implementation Notes

`opencode.json` defines the permission, and `AGENTS.md` records the working agreement. The implementation graph tracks the kit configuration; consumer graph generation removes that kit-only unit. In this session, `apply_patch` successfully created `/tmp/cinderling-permission-validation/nested/written.txt` with the requested content.

# Effective Architecture

The Cinderling kit's project-local OpenCode configuration allows external-directory access to `/tmp` and `/tmp/*`. Agents may use `/tmp` for temporary work without asking the user for permission. This kit-specific configuration is not implicitly imposed on consumer projects.

# Provenance

Author: Cinderling contributors
Sources: Issue 34; commit 62556d1; temporary-file permission validation in this session
