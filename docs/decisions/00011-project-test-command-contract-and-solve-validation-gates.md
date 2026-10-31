---
id: "00011"
title: "Project test command contract and solve validation gates"
category: governance
type: architecture
status: accepted
date: 2026-10-29
tags: [testing, validation, solve, consumer]
dependsOn: ["00001", "00006"]
supersedes: []
related: ["00007", "00008"]
---

# AI Summary

Define stable project-root test commands and distinguish implementation, candidate-review and post-review exact-head validation gates.

# Context

Projects can use different package and test orchestration, but issue-solving agents need a stable invocation contract. Existing architecture calls for evaluations and bounded solve validation without defining the full project-level commands or when their evidence is required. An adoption fixture is not a substitute for a project's end-to-end coverage.

# Decision

Projects expose four root commands: `pnpm test` runs all unit tests; `pnpm test:arch` runs all architecture tests; `pnpm test:cinderling` runs Cinderling-specific validations; and `pnpm e2e` runs the project-owned end-to-end suite, including DB-backed and browser coverage where applicable. Projects choose the internal orchestration behind these commands. Existing project-owned manifests must be integrated deliberately, not replaced blindly. A starter without a project-owned e2e suite must report it unconfigured rather than claim that its adoption scenario is full e2e.

During implementation, solve runs affected tests and relevant architecture and Cinderling checks. Before presenting a candidate for review, it runs `pnpm test`, `pnpm test:arch` and `pnpm test:cinderling` on that candidate. After review and before merge, arrange `pnpm e2e` against the reviewed exact-head candidate. Any candidate change invalidates previous final-gate evidence; rerun the applicable gates on the new head. An unavailable, missing or deferred e2e run is reported as pending or blocked, never as passed. Do not merge automatically or claim checks that did not run.

# Rationale

A stable command surface separates agent behavior from Nx, pnpm workspace layout and other implementation choices. Staged gates support fast iteration while preserving concrete pre-review and pre-merge evidence for the exact candidate.

# Consequences

Projects must implement and maintain the command surface and their own end-to-end infrastructure. E2e can be expensive or unavailable; the gate remains explicit when deferred. Starter fixtures establish only their tested behavior and cannot establish DB, browser, live-stack or fresh-host coverage.

# Implementation Notes

The kit's root commands and generated starter manifest expose the contract; existing consumer manifests remain project-owned. The solve command defines the phases and evidence rules. This decision extends the evaluations and solve workflow in ADRs 00001 and 00006 without superseding them.

# Effective Architecture

Expose `pnpm test` for all unit tests, `pnpm test:arch` for all architecture tests, `pnpm test:cinderling` for Cinderling-specific validation and `pnpm e2e` for project-owned end-to-end coverage. During implementation run affected checks; before candidate review run the first three commands; after review and before merge arrange e2e on the reviewed exact head. Candidate changes invalidate earlier final-gate evidence. Report unavailable or deferred e2e as pending or blocked, never as passed, and retain project ownership of command implementations and e2e infrastructure.

# Provenance

Author: Cinderling contributors
Sources: Issue 24; ADR 00001; ADR 00006; sample-phoenix adoption feedback
