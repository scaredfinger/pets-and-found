---
id: "00019"
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

Provide one project command that starts the development database, applies migrations, and runs both applications.

# Context

Running the website and backend locally requires database startup, migration, environment selection, and multiple terminals. Devcontainers must reach host-published Docker ports through `host.docker.internal` rather than their own loopback address.

# Decision

`pnpm dev:stack` is the project development launcher. It starts PostgreSQL, applies migrations, and supervises the backend on port `3000` and website on port `5173`. In a devcontainer it binds PostgreSQL on `0.0.0.0` and defaults `DATABASE_URL` to the documented `host.docker.internal` address. An explicitly provided `DATABASE_URL` takes precedence. Stopping the launcher stops only the application processes; developers stop PostgreSQL separately with `pnpm db:down`.

# Rationale

One command removes setup ordering errors while preserving an explicit database lifecycle and a host-compatible override for non-default environments.

# Consequences

Development startup applies pending migrations. The database remains available after application shutdown and retains its Compose volume unless explicitly removed.

# Implementation Notes

The launcher is project-owned tooling and does not alter the existing single-service commands. This scoped draft is authoritative on this branch but is not promoted project architecture.

# Effective Architecture

Use `pnpm dev:stack` to start the local development stack; it migrates the database, starts the backend on port `3000`, starts the website on port `5173`, and uses the devcontainer-safe database route.

# Provenance

Author: Project owner and implementation agent
Sources: Development workflow request and devcontainer runtime behavior
