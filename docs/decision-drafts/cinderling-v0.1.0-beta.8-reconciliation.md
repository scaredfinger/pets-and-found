---
id: "DRAFT"
title: "Cinderling v0.1.0-beta.8 integration reconciliation"
category: governance
type: architecture
status: draft
date: 2026-11-02
tags: [adoption, migration, reconciliation]
dependsOn: ["00015"]
supersedes: []
related: []
---

# AI Summary

Reconcile the v0.1.0-beta.8 installation after its architecture validation identified project-owned integration changes. Record the reviewed unscoped application identities, application target scripts, and unambiguous development-stack graph ownership without changing the installed release version.

# Decision

Reconcile the exact installed Cinderling v0.1.0-beta.8 release after integrating the project-owned workspace contract. Backend and website are unscoped applications with explicit graph classifications and required application targets. Libraries remain under the @scaffold scope. The semantic graph owns tools/dev-stack.mjs only through tooling.dev-stack.

# Effective Architecture

Same-version reconciliation uses the installed release fingerprint and an explicit reviewed draft. Applications have manifest-derived unscoped identities, package build, test, lint, development, and end-to-end targets, and graph classifications. Project-wide command implementations remain project-owned. The development stack runner and configuration have exactly one semantic owner.

# Provenance

Author: Project owner and implementation agent
Sources: Cinderling v0.1.0-beta.8 architecture evaluation
