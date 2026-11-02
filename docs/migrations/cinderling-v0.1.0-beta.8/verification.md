# Consumer upgrade verification

## Artifact and migration

The exact v0.1.0-beta.8 bootstrap and private release archive were obtained from scaredfinger/cinderling through an authorized reader. The independently supplied archive SHA-256 is `dedba1e7eb2e16defaa38d9fd1bd9f5e5e765fe4c39d9af07115ca6f3c675896` and matched before execution. The project upgraded from v0.1.0-beta.7 through a reviewed dry-run and application. Subsequent integration changes use reviewed same-version reconciliation, retaining prior installation evidence. Drafts remain unpromoted; accepted project records are unchanged.

## Current-runner evidence, 2026-11-02

Environment: Linux workspace, Node 24.22.1, pnpm 10.32.1, OpenCode 1.19.3. The existing PostgreSQL development service was healthy on the host daemon; runner localhost port 55432 was unreachable and host.docker.internal port 55432 was reachable. No service binding, data volume, authentication mount or remote was changed for validation. Service-dependent commands used the development DATABASE_URL in their process environment with the verified host gateway.

- `pnpm setup:browser`: matching Chromium and OS prerequisites available.
- `pnpm runtime:preflight`: project migration, authentication, migration/schema readiness and Chromium launch passed from this runner.
- `pnpm test`: seven unit tests passed across four application/library packages, without a database requirement.
- `pnpm test:cinderling`: all 15 portable tooling tests passed after updating the promotion fixture to include a meaningful summary.
- `pnpm lint`: architecture and workspace TypeScript validation passed.
- `pnpm build`: all package build/type-check tasks passed.
- `pnpm e2e:all`: all five acceptance scenarios, 13 steps and six desktop/mobile Chromium tests passed.
- Development stack smoke: the installed runner completed migrations, started backend and website with temporary test ports 4330/4331, served the website successfully, and terminated with expected SIGTERM status 143. The project default ports were preserved.
- A fresh OpenCode process discovered all nine project-local skills, including devcontainer-runtime, application-development-ports and clerk-authentication. It resolved cinderling-review as a subagent and exposed prime, solve and promote-decision-draft through its local command API.
- `opencode mcp list` reported no configured MCP servers, so there were no project MCP connections to exercise.
- `pnpm graph:impact HEAD` included the installed stack runner, runtime/ports/Clerk skills, installer, project guidance, tooling tests and all six package identities. Reviewed unowned paths were package manifests/lockfile, installation metadata and the managed logo; package identity is manifest-derived and metadata/assets do not imply application implementation changes. Impact remains advisory.

Fresh-process discovery does not establish interactive workflow behavior or reload the already-running conversation. Interactive prime/solve/promotion exercises and two fresh-host devcontainer rebuilds were not performed. No decisions were promoted and no GitHub mutation, commit or merge was performed by this verification.

## Integration resolutions

Preserve project-specific devcontainer identity and nested mounts through explicit devcontainer retention. Preserve the consumer CI database and browser gates through a reproducible workflow adaptation. Keep unit tests independent from acceptance coverage and retain the actual end-to-end suite. Install the reviewed governance and AGENTS adaptations from durable project-owned sources, and add runtime/installation/skill graph relationships against actual project unit IDs. Use the project graph impact command for advisory review rather than assuming automation beyond the installed CLI.
