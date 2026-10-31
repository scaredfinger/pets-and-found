---
id: "00001"
title: "Phoenix artifact authority and evaluations"
category: governance
type: architecture
status: accepted
date: 2026-10-20
tags: [phoenix, specifications, gherkin, graph, evaluations, code-style]
dependsOn: ["00000"]
supersedes: []
related: ["00002"]
---

# AI Summary

ADRs, category compactions, Gherkin, evaluations and a nested semantic implementation graph govern disposable implementation. Zero implementation code comments is a required evaluated rule.

# Context

Modern coding models reduce the need for complex agent frameworks; durable intent and objective feedback are more valuable.

# Decision

Accepted ADRs preserve historical decisions; category compactions express active architecture; Gherkin expresses expected behavior and is colocated with acceptance steps; evaluations enforce architectural invariants. Implementation source must contain no comments of any kind (including JSDoc, TODO and AI guidance); standalone docs and Gherkin are allowed. Only unavoidable machine-required syntax such as shebangs is excepted. The JSON implementation graph references npm packages, arbitrary nested logical units, semantic dependencies and optional file ownership; technical package dependencies derive from manifests. It supports impact estimates and review, not mandatory file regeneration. Prefer Git history over redundant content-hash registries. Aim for one causal trigger per commit, with appropriately documented bootstrap and migration exceptions.

# Rationale

Keep the source of intent portable and the mechanism small; static graph validators cannot prove semantic correctness or actual full regeneration.

# Consequences

Positive: precise impact planning and reliable architecture evaluations. Negative: semantic dependency and compaction completeness require human/LLM review.

# Implementation Notes

Deterministic checks: ESLint/comment parser, ADR/graph JSON Schema, Git history rules, Gherkin parser, package-script convention, graph structural checks and Nx-dependent task execution.

# Provenance

Author: Repository bootstrap with user direction
Sources: Cinderling planning conversation; sample-phoenix test and Gherkin layout
