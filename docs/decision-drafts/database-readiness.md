---
id: "DRAFT"
title: "Database migration readiness"
category: governance
type: architecture
status: draft
date: 2026-10-31
tags: [database, migration, readiness]
dependsOn: ["00015"]
supersedes: []
related: []
---

# AI Summary

Backend startup and readiness require every bundled database migration to have been applied with its original checksum and the currently required tables to be accessible.

# Context

Checking only the first table allowed a partially migrated schema to appear ready.

# Decision

Before listening and for each readiness probe, verify database connectivity, every bundled migration's ledger entry and checksum, and access to the greetings and greeting_templates tables. A missing or changed migration or inaccessible required table means not ready. Startup fails; readiness responds with HTTP 503.

# Rationale

Failing closed ensures the backend does not claim readiness with a known incomplete migration baseline.

# Consequences

Readiness depends on the migration files, ledger and required tables. This does not prove the full schema matches every migration or detect every manual schema change.

# Implementation Notes

Run migrations explicitly before startup. Update the required table probes when the backend's schema requirements change.

# Effective Architecture

Backend startup and readiness require a reachable database, matching ledger entries for all bundled migrations, and accessible required tables; incomplete or mismatched state fails closed.

# Provenance

Author: Project owner and implementation agent
Sources: Scaffold review handoff
