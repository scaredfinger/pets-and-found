---
id: "00021"
title: "Complete Cinderling beta.8 runtime and validation integration"
category: governance
type: architecture
status: accepted
date: 2026-11-02
tags: [migration, validation, runtime]
dependsOn: ["00015"]
supersedes: ["00009", "00011"]
related: ["00002", "00010"]
---

# AI Summary

Complete the project-owned integration of Cinderling v0.1.0-beta.8 following the v0.1.0-beta.7 upgrade. Restore the consumer's CI service and browser gates and devcontainer identity, distinguish unit tests from acceptance coverage, provide an executable runner-side preflight, and reconcile governance without changing accepted history.

# Decision

Reconcile the exact v0.1.0-beta.8 archive. Retain the project devcontainer and all intentional nested mounts and authentication overlays. Adapt CI reproducibly to preserve database preparation, Chromium setup, architecture, tool, unit and real end-to-end gates. Keep the unit test command independent of database-dependent acceptance scenarios. Add `test:cinderling`, `graph:impact` and `runtime:preflight` using installed tooling and the existing project database migrations and Playwright client.

Supersede ADR 00009 only to replace mandatory external definition backups with the target release's transactional local archive and optional external export; preserve its sole-harness ownership and MCP boundaries. No competing definitions are detected. Supersede ADR 00011's command surface with `test:all` and `e2e:all`, retaining `test` and `e2e` aliases and the architecture and Cinderling gates. This project has real e2e coverage and must run it; the kit's no-e2e exemption does not apply.

Reconcile active governance through a reviewed source file and retain accepted records byte-for-byte. New drafts require meaningful AI summaries; legacy accepted records are preserved. Review changes to governance and agent workflow through scoped drafts. The Clerk skill remains optional guidance without provider adoption. Keep reproducible adaptation sources in project-owned documentation directories and review the semantic graph for runtime, installation, stack and skill dependencies.

# Effective Architecture

The scoped beta.8 migration guidance is branch-authoritative and unpromoted. Run unit tests, architecture checks, portable Cinderling checks, lint and build before candidate review; run the real acceptance and browser e2e suite against the reviewed candidate before merge. Database and browser work follows the runtime skill and the project preflight from the actual runner. Preserve service routes, nested mounts, host-owned authentication, project package identity, tests and graph. Existing kit definitions are managed; competing definitions require explicit dispositions and local recovery, with external export optional. Accepted decisions remain immutable and promotion requires separate explicit review and approval.

# Provenance

Author: Project owner and implementation agent
Sources: User request to complete the v0.1.0-beta.8 upgrade; target release consumer-installation workflow and accepted kit decisions 00018, 00019, 00023, 00026; project runtime and validation evidence
