---
id: "DRAFT"
title: "TypeScript application and library source"
category: governance
type: architecture
status: draft
date: 2026-10-31
tags: [typescript, workspace, source]
dependsOn: ["00002"]
supersedes: []
related: []
---

# AI Summary

Use TypeScript for new application, library and acceptance implementation source and verify it in automation.

# Context

The initial scaffold used JavaScript despite its Node and TypeScript workspace intent.

# Decision

Application, library and acceptance implementation and tests use TypeScript. Build and architecture checks reject JavaScript source in those locations and type-check the workspace. Tooling distributed by Cinderling and configuration entry points may use JavaScript when required.

# Rationale

The rule makes new project source consistent and catches accidental regressions automatically while respecting existing Cinderling tooling.

# Consequences

Projects maintain TypeScript configuration and dependencies. Existing managed JavaScript tooling remains separate.

# Implementation Notes

Run the source language check and TypeScript compiler in the project build. This decision is a scoped draft until reviewed and promoted.

# Effective Architecture

Application, library and acceptance implementation and tests use TypeScript, enforced by workspace checks; managed tooling and configuration entry points may use JavaScript.

# Provenance

Author: Project owner and implementation agent
Sources: Scaffold review
