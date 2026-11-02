---
id: "DRAFT"
title: "Cinderling migration v0.1.0-beta.8"
category: governance
type: architecture
status: draft
date: 2026-11-02
tags: [adoption, migration, governance]
dependsOn: ["00015"]
supersedes: ["00010"]
related: []
---

# AI Summary

Upgrade this consumer from Cinderling v0.1.0-beta.7 to v0.1.0-beta.8 through the target release's digest-bound review. Retire obsolete kit issue evidence while preserving accepted history, adopt the reviewed installer workflow and runtime guidance, and retain project-owned packages, graph, tests, and application configuration.

# Decision

Adopt exact private Cinderling release v0.1.0-beta.8 from v0.1.0-beta.7 using the reviewed target-release bootstrap. Reconcile the governance compaction with the scoped migration rules. Retire the three previously managed kit issue-evidence pages, preserve immutable accepted ADR 00010, and supersede its historical local evidence reference with this record.

Adopt the managed devcontainer, commands, tooling, and OpenCode skills. Preserve project-owned manifests, package identities, test suites, semantic graph, and architecture. Integrate the distributed development-stack runner through the project-owned dev-stack configuration, existing database migration command, and backend and website development commands. Adopt the runtime and port guidance; install the Clerk guidance without selecting Clerk as a project authentication provider.

# Effective Architecture

This project upgrades through explicit-version, digest-verified, stale-state-checked Cinderling reviews. Accepted decisions remain immutable. Kit issue evidence is retired from the consumer while accepted historical references remain as superseded history. The project owns its packages, graph, validation commands, runtime configuration, and application topology. The managed development stack invokes the project database migration before the backend and website processes. Runtime-, database-, browser-, and container-dependent work loads the devcontainer-runtime skill and validates readiness from the actual runner. The application-development-ports skill preserves the existing project assignments, and Clerk guidance is available only if the project adopts Clerk.

# Provenance

Author: Project owner and implementation agent
Sources: Cinderling v0.1.0-beta.8 reviewed installation workflow; exact archive SHA-256 dedba1e7eb2e16defaa38d9fd1bd9f5e5e765fe4c39d9af07115ca6f3c675896
