# Governance — compacted current rules

Sources: ADRs 00000, 00001, 00002, 00003, 00004, 00005, 00006, 00007, 00008. ADR 00007 supersedes ADR 00004; ADR 00006 supersedes ADR 00003. This document is manually reviewed; promotion tooling appends reviewed, source-linked rules.

- Accepted decisions are immutable; create editable drafts under `docs/decision-drafts` and promote explicitly after validation.
- Keep a unique five-digit ID, stable title, status, primary category, tags, dependsOn/supersedes/related, and provenance. On promotion update the accepted index and impacted compaction.
- Only `governance` is a kit-defined category. Consumer project domains choose their own categories.
- Routine commands load current operational guidance and architecture compactions, not decision indexes, accepted ADRs, or decision drafts. Load specific decision records only for decision work or a conflict requiring their history.
- Changes to kit-managed artifacts require a reviewed migration and adoption/version record. Do not silently overwrite project overrides.
- The official execution environment is a Node 24 devcontainer with pnpm and Nx. OpenCode host configuration/auth is separate from ignored local state; overlapping mounts are intentional.
- Agent-operated GitHub REST workflows load the GitHub authentication skill. It validates the credential-bearing HTTPS origin push remote, keeps credentials in process and request-scoped, never logs, persists, or changes them, and fails closed when unavailable or unauthorized. Consumer release downloads use explicitly supplied private-repository authorization as specified in ADR 00007.
- Implementation source has zero comments; lint as architecture evaluation. Human documentation is outside source.
- Gherkin and its step definitions are colocated within the acceptance project; unit tests with source; architecture tests enforce policies.
- Semantic graph is JSON; git/package manifests supply discoverable facts, graph supplies semantic edges. Blast radius is advisory and reviewed.
- `prime` and `solve` follow the Calimero flow. No automatic PR merges.

## Private GitHub Release distribution

Source: [00007](../decisions/00007-private-github-release-distribution.md)

Distribute Cinderling only as a versioned archive attached to a private GitHub Release whose tag is on validated main history. Require an explicit version and authenticated private-repository access for installation; the consumer CLI uses a request-scoped `GH_TOKEN`, while agent-operated GitHub REST workflows follow ADR 00006. Record installed versions in project metadata and immutable adoption/migration decisions; protect project overrides and provide dry-run upgrades. Never publish to npm or silently select latest.

## Exact PR closing references for combined issue resolution

Source: [00008](../decisions/00008-exact-pr-closing-references-for-combined-issue-resolution.md)

For a solve PR, normalize the authorized resolved issue set, require exactly one standalone closing line per resolved issue and none for other issues, check immediately before creation, and verify the persisted PR body. Keep PRs with scoped unpromoted ADRs in draft and never merge automatically.

## Project-local OpenCode definition ownership

Source: [00009](../decisions/00009-project-local-opencode-definition-ownership.md)

Cinderling owns the project-local OpenCode agents, skills and commands it distributes. On initialization and upgrade, inventory existing definitions and require explicit retain or retire decisions before removing their active entry points; archive both choices outside discovery and install Cinderling replacements at colliding paths. Require a private external backup for migrated definitions, preserve project-local MCP configuration and executables and project-owned architecture and code, and do not inspect or modify user-level configuration. Fail closed when project-local discovery cannot be resolved safely. Retained legacy definitions are preserved for review, not kept active as a competing harness.

## Endpoint-aware GitHub interaction and CI evidence

Source: [00010](../decisions/00010-endpoint-aware-github-interaction-and-ci-evidence.md)

For agent-operated GitHub interactions, load the authentication and interaction skills. Preserve ADR 00006's credential and authorization rules and ADR 00008's PR body contract. Select endpoint-specific least privileges, isolate and report denied requests safely, and fail closed on required failures. Verify current-head Actions runs and expected jobs independently; a denied optional Checks endpoint is not a pass, and external checks remain unverified without their own evidence. Never merge automatically.

## Project test command contract and solve validation gates

Source: [00011](../decisions/00011-project-test-command-contract-and-solve-validation-gates.md)

Expose `pnpm test` for all unit tests, `pnpm test:arch` for all architecture tests, `pnpm test:cinderling` for Cinderling-specific validation and `pnpm e2e` for project-owned end-to-end coverage. During implementation run affected checks; before candidate review run the first three commands; after review and before merge arrange e2e on the reviewed exact head. Candidate changes invalidate earlier final-gate evidence. Report unavailable or deferred e2e as pending or blocked, never as passed, and retain project ownership of command implementations and e2e infrastructure.

## Allow temporary directory access

Source: [00012](../decisions/00012-allow-temporary-directory-access.md)

The Cinderling kit's project-local OpenCode configuration allows external-directory access to `/tmp` and `/tmp/*`. Agents may use `/tmp` for temporary work without asking the user for permission. This kit-specific configuration is not implicitly imposed on consumer projects.

## Conventional issue branch naming

Source: [00013](../decisions/00013-conventional-issue-branch-naming.md)

Before creating a new issue branch, load the branch-naming skill. Name it `<type>/<issue-numbers>-<description>`, using a conventional change type, each approved positive issue number once in ascending numeric order separated by hyphens, and a concise lowercase kebab-case description. Validate the name as a Git branch; do not require existing branches to be renamed.

## Cross-repository GitHub request targets

Source: [00014](../decisions/00014-cross-repository-github-request-targets.md)

For agent-operated GitHub requests, validate the current checkout's credential-bearing HTTPS origin push URL as the credential source and identify the request target separately. An explicitly selected target repository may differ from the origin; use the request-scoped origin-derived credential only for an authorized operation with access to that target. Validate the target and operation, require explicit authorization for mutations, and fail closed on ambiguity, denied access or required request failure. Never expose or persist credentials or silently change authentication sources or remotes. Consumer CLI release authentication remains separate.

## Cinderling adoption v0.1.0-beta.7

Source: [00015](../decisions/00015-adoption-v0.1.0-beta.7.md)

Adopt exact private Cinderling release v0.1.0-beta.7. OpenCode definitions archived at .cinderling/legacy/v0.1.0-beta.7: none. Retain decisions: none; retire decisions: none. Fresh-session verification is required.
