---
id: "00005"
title: "Selective command context loading"
category: governance
type: architecture
status: accepted
date: 2026-10-20
tags: [opencode, commands, context, governance]
dependsOn: ["00000"]
supersedes: []
related: ["00003"]
---

# AI Summary

Routine commands load current operational and architectural guidance, not historical decision records. ADRs and decision drafts are loaded only for decision work or a specific conflict requiring their history.

# Context

Commands such as prime and solve need enough context to act consistently, but loading accepted ADRs and active decision drafts for every task consumes attention on historical detail that is not normally operational. Current category compactions and operational guidance already express the effective rules.

# Decision

Routine OpenCode commands must load current operational guidance, current architecture compactions, and task-relevant implementation context. They must not load accepted ADR contents, decision indexes, or active decision drafts by default. Commands may load the specific accepted ADRs and drafts needed when creating, reviewing, promoting, superseding, or resolving a conflict between decisions. Operational procedures shared by multiple commands belong in task-loaded skills rather than in ADR references embedded in command prompts.

# Rationale

Compactions provide the concise effective architecture, while ADRs preserve immutable historical rationale. Separating the two keeps routine context relevant and makes decision-record work deliberate.

# Consequences

Positive: routine command context is smaller and reflects current policy. Negative: command authors must keep current compactions and task-loaded skills accurate.

# Implementation Notes

Prime reads current operational and architectural documents only. Solve loads decision records only when the scoped issue requires decision work. Decision promotion commands load the records required to validate and promote a draft.

# Provenance

Author: Repository user direction
Sources: GitHub issue #8; Cinderling command context discussion
