---
id: "00000"
title: "Decision records and governance"
category: governance
type: architecture
status: accepted
date: 2026-10-20
tags: [governance, adr, compaction]
dependsOn: []
supersedes: []
related: ["00001"]
---

# AI Summary

Maintain immutable accepted ADRs, editable drafts, and per-category current architecture compactions. This decision establishes template and promotion governance.

# Context

Regenerative development needs stable rationale independent of implementation.

# Decision

ADRs are Markdown/YAML files matching the template, accepted records are immutable and superseded through subsequent records. Drafts may evolve under docs/decision-drafts and must be explicitly promoted. Each ADR has one primary category and arbitrary tags. Only governance is a universal category; all others are project-specific. Promotion updates the decision index and all affected category compactions together and checks traceability. Contradictions halt promotion for review.

# Rationale

Stable historical reasons and concise effective context help models without introducing a proprietary DSL.

# Consequences

Positive: traceability and selective context. Negative: compaction drift unless validated.

# Implementation Notes

Implement a deterministic schema/lifecycle validator and explicit promotion command, using semantic model review where needed. Never claim prose agreement can be proven by syntax alone.

# Provenance

Author: Repository bootstrap with user direction
Sources: Cinderling planning conversation; villa-calimero-alegria, sample-phoenix governance
