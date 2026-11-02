---
id: "00018"
title: "Development stack launcher"
category: project
type: architecture
status: accepted
date: 2026-11-01
tags: [development, database, workflow]
dependsOn: []
supersedes: []
related: ["00011"]
---

# AI Summary

Provide one project command that applies migrations and supervises both applications after the project database has been prepared separately.

# Context

Running the website and backend locally requires database startup, migration, environment selection, and multiple terminals. Devcontainers must reach host-published Docker ports through `host.docker.internal` rather than their own loopback address.

# Decision

`pnpm dev:stack` is the project development launcher. Prepare PostgreSQL separately using the documented project commands and verify its endpoint from the runner. The launcher applies migrations and supervises the backend on port `3000` and website on port `5173`, using the supplied or project-default `DATABASE_URL`. Preserve existing database bindings and use the verified devcontainer route where necessary. Stopping the launcher stops the application processes; developers stop PostgreSQL separately with `pnpm db:down`.

# Rationale

One command orders migrations and application startup while preserving an explicit database lifecycle and runner-specific connection configuration.

# Consequences

Development startup applies pending migrations. The database remains available after application shutdown and retains its Compose volume unless explicitly removed.

# Implementation Notes

The launcher is project-owned tooling and does not alter the existing single-service commands. This scoped draft is authoritative on this branch but is not promoted project architecture.

# Effective Architecture

Prepare and verify PostgreSQL separately, preserving existing bindings and configuring a route reachable from the runner. Then use `pnpm dev:stack` to migrate the database and supervise the backend on port `3000` and website on port `5173`.

# Provenance

Author: Project owner and implementation agent
Sources: Development workflow request and devcontainer runtime behavior
