---
id: "00014"
title: "Cross-repository GitHub request targets"
category: governance
type: architecture
status: accepted
date: 2026-10-30
tags: [github, credentials, opencode, skills]
dependsOn: ["00006", "00010"]
supersedes: []
related: ["00007"]
---

# AI Summary

Distinguish validation of the current checkout's credential-source origin from selection of an explicitly authorized GitHub request target. The target may be another repository accessible to the origin-derived credential.

# Context

The authentication and interaction skills refer to the expected or validated repository without distinguishing the source of the credential from the destination of a request. This ambiguity led an agent to refuse an explicitly requested issue update in another repository even though the origin-derived credential had the necessary access.

# Decision

For agent-operated GitHub requests, validate the current checkout's credential-bearing HTTPS GitHub origin push URL as the credential source under ADR 00006. Identify the target owner and repository separately from the user's explicit request or the current workflow. An explicitly selected target may differ from the origin repository. Use the origin-derived credential for that target only when the operation is authorized and GitHub grants the necessary access. Validate the target and operation, confirm explicit authorization for mutations, and fail closed on ambiguity, denied access, or a required request failure. Do not change remotes or authentication sources to select a request target.

# Rationale

GitHub credentials can grant access to multiple repositories. Separating credential-source validation from target selection permits authorized cross-repository work without weakening request-scoped credential handling or mutation authorization.

# Consequences

The authentication and interaction skills must use consistent source and target terminology. Access to one repository does not establish access to another; endpoint permissions and target identity must be checked for each operation. Git fetch and push continue to use their specified Git remote. The consumer CLI's private-release `GH_TOKEN` remains a separate authentication path.

# Implementation Notes

This decision extends ADRs 00006 and 00010 without superseding their credential, authorization, endpoint or CI rules.

# Effective Architecture

For agent-operated GitHub requests, validate the current checkout's credential-bearing HTTPS origin push URL as the credential source and identify the request target separately. An explicitly selected target repository may differ from the origin; use the request-scoped origin-derived credential only for an authorized operation with access to that target. Validate the target and operation, require explicit authorization for mutations, and fail closed on ambiguity, denied access or required request failure. Never expose or persist credentials or silently change authentication sources or remotes. Consumer CLI release authentication remains separate.

# Provenance

Author: Cinderling contributors
Sources: User direction; sample-phoenix issue 202 cross-repository update; ADR 00006; ADR 00010
