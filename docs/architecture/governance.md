# Governance — compacted current rules

Baseline: accepted project ADRs 00000–00022. ADR 00007 supersedes 00004 and ADR 00006 supersedes 00003. Migration sources: [beta.8 migration](../decisions/00019-cinderling-migration-v0-1-0-beta-8.md), [workspace reconciliation](../decisions/00020-cinderling-v0-1-0-beta-8-integration-reconciliation.md), and [validation completion](../decisions/00021-complete-cinderling-beta-8-runtime-and-validation-integration.md).

## Decision lifecycle and implementation context

Sources: [00000](../decisions/00000-decision-records-and-governance.md), [00001](../decisions/00001-phoenix-artifacts-and-evaluations.md), [00005](../decisions/00005-selective-command-context-loading.md), [scoped completion](../decisions/00021-complete-cinderling-beta-8-runtime-and-validation-integration.md).

Accepted decisions are immutable. Author scoped drafts first; promote only after semantic review, validation and explicit approval. Keep unique five-digit accepted IDs, stable titles, status, primary category, tags, dependency/supersession/related references and provenance. New drafts require a meaningful top-level AI Summary and Effective Architecture prose; preserve legacy accepted records. Update the accepted registry and reconcile affected compactions on promotion. Only governance is kit-defined; project domains own their categories.

Use current operational guidance and relevant category compactions for implementation. Consult only decision records required for decision creation, review, promotion or supersession. Assess direct requests and issue-driven work for governance, architecture or workflow changes and create or update scoped drafts when needed. Ordinary implementation details do not require a new decision. Scoped drafts are not promoted architecture.

Implementation source has zero comments. Gherkin and step definitions are colocated in the acceptance project; unit tests are colocated with source. Package manifests provide discoverable identities, the JSON semantic graph supplies reviewed relationships, and impact is advisory. Do not introduce project.json or Nx-specific semantic identities.

## Reviewed private-release installation

Sources: [00007](../decisions/00007-private-github-release-distribution.md), [00015](../decisions/00015-adoption-v0.1.0-beta.7.md), [scoped migration](../decisions/00019-cinderling-migration-v0-1-0-beta-8.md).

Use only an explicit versioned archive from the private Cinderling GitHub Release; never npm or implicit latest. Use the target release bootstrap and independently trusted digest, complete a stale-state-bound review, preserve project overrides, classify every release path and removed asset explicitly, and record distinct previous/target evidence. Supplied archives need no download token; CLI downloads use a process-environment GH_TOKEN authorized for scaredfinger/cinderling. Installation never promotes decisions or rewrites accepted history. Keep reproducible adaptation sources and review the diff.

The project adopted v0.1.0-beta.7 under ADR 00015 and upgrades to v0.1.0-beta.8 under the scoped migration. Retire the three obsolete kit evidence pages; preserve ADR 00010 byte-for-byte, with its local evidence reference superseded by the scoped migration. Kit issue evidence belongs in the kit repository.

## Harness ownership and recovery

Sources: [00009](../decisions/00009-project-local-opencode-definition-ownership.md), [scoped completion](../decisions/00021-complete-cinderling-beta-8-runtime-and-validation-integration.md).

Cinderling owns its distributed project-local definitions. Inventory competing definitions and explicitly retain or retire each; both archive the original outside discovery and remove its active entry point before installing kit replacements. Preserve project-owned assets, MCP configuration and executables; leave user configuration and authentication untouched. Fail closed on unresolved discovery. The scoped completion supersedes ADR 00009's mandatory external export with transactional local staging and rollback and optional external export. Preserve untracked, ignored, modified or secret-bearing legacy material deliberately. Verify discovery in a fresh OpenCode process.

## Workspace and validation

Sources: [00002](../decisions/00002-devcontainer-and-workspace.md), [00011](../decisions/00011-project-test-command-contract-and-solve-validation-gates.md), [workspace reconciliation](../decisions/00020-cinderling-v0-1-0-beta-8-integration-reconciliation.md), [scoped completion](../decisions/00021-complete-cinderling-beta-8-runtime-and-validation-integration.md).

Use Node 24, pnpm and Nx package-script inference. Backend and website have unscoped manifest-derived identities, libraries retain the @scaffold scope, and the graph classifies application roles. Packages expose build, test and lint; applications also expose dev and e2e, and the website exposes start. Existing project command implementations remain project-owned.

The scoped completion supersedes ADR 00011's command surface: run pnpm test:all for unit tests, pnpm test:arch for architecture and language policies, and pnpm test:cinderling for portable tool checks before candidate review. pnpm test remains the all-unit alias. Run lint and build. The real project acceptance and desktop/mobile browser suite is required through pnpm e2e:all (pnpm e2e alias) on the reviewed candidate before merge. Missing or deferred required evidence is pending or blocked, never passed. Candidate changes invalidate final-gate evidence. Preserve the project CI database and browser setup steps; do not substitute kit fixtures for project e2e.

## Runtime, development stack and optional skills

Sources: [00002](../decisions/00002-devcontainer-and-workspace.md), [scoped migration](../decisions/00019-cinderling-migration-v0-1-0-beta-8.md), [scoped completion](../decisions/00021-complete-cinderling-beta-8-runtime-and-validation-integration.md).

Preserve intentionally nested mounts and host-owned authentication overlays. Before service-, database-, browser- or container-dependent work, load devcontainer-runtime and follow docs/runtime.md. Verify connectivity, authentication, migrations and browser launch from the actual runner using pnpm runtime:preflight. Apply documented recoverable setup, preserve data and routes, and do not infer readiness from container health. Fresh-host rebuild evidence remains separate from current-runner evidence.

Use the installed stack runner with project-owned dev-stack.json: ordered migration then backend and website development processes, with seeding only when explicitly configured and requested. Preserve ports 3000 and 5173 and browser-test ports 4318 and 4317. Load application-development-ports for new applications or port/URL changes; use devcontainer forwarding for application access. Clerk guidance is on demand and does not select an authentication provider.

## GitHub and change workflow

Sources: [00006](../decisions/00006-github-authentication-skill-and-change-workflow.md), [00008](../decisions/00008-exact-pr-closing-references-for-combined-issue-resolution.md), [00010](../decisions/00010-endpoint-aware-github-interaction-and-ci-evidence.md), [00013](../decisions/00013-conventional-issue-branch-naming.md), [00014](../decisions/00014-cross-repository-github-request-targets.md).

Load GitHub authentication and interaction skills before agent-operated GitHub requests. Validate the credential-bearing HTTPS origin push URL in process and validate an explicit request target separately. Credentials are request-scoped, never printed or persisted; do not change remotes or authentication. Require explicit authorization for mutations and fail closed on required denied requests. Verify exact-head Actions runs and expected jobs independently; denied optional Checks are not passes. Preserve ADR 00010's CI requirements while its obsolete evidence link remains immutable historical content.

Load branch-naming before creating an issue branch: use a conventional type, each approved positive issue number once in ascending order, and concise lowercase kebab-case description; validate with Git. Do not rename existing branches automatically. Follow prime/solve, require exactly one standalone closing line per approved resolved issue in solve PRs, verify the persisted body and keep PRs with scoped unpromoted decisions in draft. Never merge automatically. ADR 00012's temporary-directory access is kit-specific and not automatically imposed on consumers.

## TypeScript application and library source

Source: [00016](../decisions/00016-typescript-application-and-library-source.md)

Application, library and acceptance implementation and tests use TypeScript, enforced by workspace checks; managed tooling and configuration entry points may use JavaScript.

## Retire kit evidence pages from this consumer

Source: [00017](../decisions/00017-retire-kit-evidence-pages-from-this-consumer.md)

Kit issue evidence stays in the Cinderling repository, not this consumer. Installation guidance points to the source repository while historical accepted records remain immutable.

## Cinderling migration v0.1.0-beta.8

Source: [00019](../decisions/00019-cinderling-migration-v0-1-0-beta-8.md)

This project upgrades through explicit-version, digest-verified, stale-state-checked Cinderling reviews. Accepted decisions remain immutable. Kit issue evidence is retired from the consumer while accepted historical references remain as superseded history. The project owns its packages, graph, validation commands, runtime configuration, and application topology. The managed development stack invokes the project database migration before the backend and website processes. Runtime-, database-, browser-, and container-dependent work loads the devcontainer-runtime skill and validates readiness from the actual runner. The application-development-ports skill preserves the existing project assignments, and Clerk guidance is available only if the project adopts Clerk.

## Cinderling v0.1.0-beta.8 integration reconciliation

Source: [00020](../decisions/00020-cinderling-v0-1-0-beta-8-integration-reconciliation.md)

Same-version reconciliation uses the installed release fingerprint and an explicit reviewed draft. Applications have manifest-derived unscoped identities, package build, test, lint, development, and end-to-end targets, and graph classifications. Project-wide command implementations remain project-owned. The development stack runner and configuration have exactly one semantic owner.

## Complete Cinderling beta.8 runtime and validation integration

Source: [00021](../decisions/00021-complete-cinderling-beta-8-runtime-and-validation-integration.md)

Run unit tests, architecture checks, portable Cinderling checks, lint and build before candidate review; run the real acceptance and browser e2e suite against the reviewed candidate before merge. Database and browser work follows the runtime skill and the project preflight from the actual runner. Preserve service routes, nested mounts, host-owned authentication, project package identity, tests and graph. Existing kit definitions are managed; competing definitions require explicit dispositions and local recovery, with external export optional. Accepted decisions remain immutable and promotion requires separate explicit review and approval.

## Database migration readiness

Source: [00022](../decisions/00022-database-migration-readiness.md)

Backend startup and readiness require a reachable database, matching ledger entries for all bundled migrations, and accessible required tables; incomplete or mismatched state fails closed.
