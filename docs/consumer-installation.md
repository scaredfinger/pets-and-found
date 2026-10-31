# Private consumer installation

Only a private GitHub Release with an explicit tag such as `v0.1.0` is a distribution source. A repository reader needs `GH_TOKEN` with authorization to read `scaredfinger/cinderling` releases. Never place the token in a command argument, workspace file, archive, or shell trace. An existing authenticated CLI can run `node tools/cinderling.mjs init v0.1.0 --dir path/to/empty-project`; a release archive may also be passed with `--archive path/to/cinderling-v0.1.0.tar.gz` for offline review. The binary is `cinderling` when installed or linked. No registry publication or anonymous download is required.

The token must be authorized for the **Cinderling repository**, not just the implementing project. For a fine-grained GitHub token, select `scaredfinger/cinderling` and grant repository contents read access; the issuing user must also have access to that private repository. Apply any required organization SSO authorization. A token that can access only the consumer repository will not work. GitHub can return 404 as well as 403 for an inaccessible private release. If lookup or asset download fails, verify the exact tag, repository access, token repository selection and permissions, expiration, and any organization authorization without exposing the token; ask the user for authorized access if unavailable. The consumer CLI reads `GH_TOKEN` directly, whereas agent-operated GitHub REST requests use the repository's `github-authentication` skill. If an authorized party has already obtained the exact archive, use `--archive` instead of a release download; do not substitute a different version.

## First install without a CLI

On a host with Node 24, Git, tar, pnpm 10.32.1 and a private-repository read token in `GH_TOKEN`, set `CINDERLING_VERSION=v0.1.0` and `CONSUMER_DIR=/path/to/empty-project`, then run the following in a trusted shell with tracing disabled. The token stays in the process environment; do not paste it into a URL or command argument.

```sh
node --input-type=module <<'NODE'
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const version = process.env.CINDERLING_VERSION;
if (!/^v\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/.test(version) || !process.env.GH_TOKEN || !process.env.CONSUMER_DIR) throw new Error('explicit version, GH_TOKEN and CONSUMER_DIR required');
const headers = { Authorization: `Bearer ${process.env.GH_TOKEN}`, Accept: 'application/vnd.github+json' };
const release = await fetch(`https://api.github.com/repos/scaredfinger/cinderling/releases/tags/${version}`, { headers });
if (!release.ok) throw new Error(`release lookup failed (${release.status})`);
const asset = (await release.json()).assets?.find(item => item.name === `cinderling-${version}.tar.gz`);
if (!asset) throw new Error('release asset missing');
const download = await fetch(asset.url, { headers: { ...headers, Accept: 'application/octet-stream' } });
if (!download.ok || !download.headers.get('content-type')?.includes('application/octet-stream')) throw new Error(`asset download failed (${download.status})`);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cinderling-bootstrap-'));
try {
  const archive = path.join(tmp, 'kit.tar.gz');
  const kit = path.join(tmp, 'kit');
  fs.mkdirSync(kit);
  fs.writeFileSync(archive, Buffer.from(await download.arrayBuffer()));
  execFileSync('tar', ['-xzf', archive, '-C', kit]);
  execFileSync('node', [path.join(kit, 'tools/cinderling.mjs'), 'init', version, '--archive', archive, '--dir', process.env.CONSUMER_DIR], { stdio: 'inherit' });
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }
NODE
```

The CLI checks the archive version and file hashes before writing. The release archive itself supplies the CLI; no npm publication or preinstalled Cinderling is required. Release evidence remains in the Cinderling source repository.

Use the **target release's CLI** for upgrades: older installed CLIs may reject asset types introduced by newer releases. Download the explicit target archive using the authenticated bootstrap above, then extract it into a temporary directory and run its CLI, for example:

```sh
KIT_DIR=$(mktemp -d)
tar -xzf "$CINDERLING_ARCHIVE" -C "$KIT_DIR"
node "$KIT_DIR/tools/cinderling.mjs" upgrade "$CINDERLING_VERSION" --archive "$CINDERLING_ARCHIVE" --dir "$CONSUMER_DIR" --dry-run
```

Review the plan and project Git diff, repeat without `--dry-run`, then remove the temporary directory. In the download bootstrap above, replace `init` with `upgrade` and add `--dry-run` to preview; repeat the download/bootstrap to apply. Modified managed files stop an upgrade; `--keep-overrides` explicitly retains them and records the adaptations in the migration ADR. On write failure the installer attempts to restore all prior contents and modes, reporting any restoration failures for manual recovery. New migration records are created for each successful version transition, and the installed version is stored in `.cinderling/managed.json`. Accepted ADRs remain immutable; keep the project governance and category compactions under review. A real tag and private release download must be exercised before calling this a verified installation path.

If any rollback restoration fails, the error identifies each affected path and reports a private recovery directory. Its `manifest.json` maps project-relative paths or absolute external-export paths to numbered backup files and original modes; a null file means the path was originally absent. An external export is preserved when project restoration fails; inspect it and the reported recovery information before retrying. Restore entries manually after resolving the reported error, verify the project, and remove the recovery directory. If saving recovery data itself fails, the error reports that failure and any partial directory. Installer discovery and managed destinations reject symlinks, including dangling symlinks and symlinked ancestors.

### Migrating OpenCode definitions

Init accepts populated projects. Existing project manifests, graph, decision history, source, and unrelated validation files are preserved; managed-file conflicts require review and `--keep-overrides` to preserve an adaptation. Existing project architecture and package scripts may require manual integration with the kit. Init and upgrade inventory project-local `.opencode/agent`, `.opencode/agents`, `.opencode/command`, `.opencode/commands`, `.opencode/skill`, `.opencode/skills`, `.agents/skills`, and `.claude/skills`, plus inline `agent` and `command` entries in project `opencode.json` or `opencode.jsonc` at the root or under `.opencode`. Configured custom `skills.paths` and symlinked paths stop the operation for review. User-level configuration is not read. Project MCP settings and executables are preserved.

If definitions are found, the operation stops and lists their paths. Review them, then preview with `--definitions retain --dry-run` or `--definitions retire --dry-run`; repeat without `--dry-run` after review. For mixed decisions, repeat `--definition retain:path` or `--definition retire:path` for individual listed paths; per-path decisions override the default. Both choices archive definition content under `.cinderling/legacy/<version>/` outside discovery, then remove its active entry point; retain records the intent to preserve it for later review, not to keep it active. Kit assets replace colliding definitions. Skill support files are included in the local archive and remain in place. Inline `agent` and `command` sections are archived separately; the full original config, including comments, formatting and any MCP secrets, is also preserved in `.original-config/`. The active config is rewritten as JSON. Review the migration ADR, archive, metadata and diff.

The local legacy directory is private to the project owner, archived files never receive broader permissions than their originals, and a dedicated `.cinderling/legacy/.gitignore` excludes it without changing the project's ignore files. Tracked legacy archive paths, a non-private existing legacy directory, or a conflicting archive ignore file stop the operation. The original config and definitions can contain secrets. Committed Git history can recover tracked content; it does not contain untracked or ignored files or uncommitted edits. The ignored local archive is lost on clone or cleanup, so review and preserve any needed content before removing it. Never commit secrets. An optional `--legacy-backup /absolute/new-directory` exports a private copy; its parent must exist, and the destination must be outside the project and Git worktrees. Dry run creates nothing.

The installer verifies optional export contents and modes, syncs exported files and directories, and checks snapshots of project files scheduled for replacement or deletion, including definitions, metadata, the decision index and governance. Project file replacements are staged in the destination directory and renamed into place; a failed staging write leaves the original intact. If a change is detected during migration, it stops; rollback preserves changes it detects rather than overwriting them. **Do not allow concurrent project edits during migration.** These checks, renames and deletions are separate operations and cannot provide atomic coordination with external editors; a change between the final check and mutation may not be detected.

To restore a single export into a clone with no existing `.cinderling/legacy`, on a trusted host:

```sh
umask 077
mkdir -p "$CONSUMER_DIR/.cinderling"
cp -a "$BACKUP_DIR" "$CONSUMER_DIR/.cinderling/legacy"
```

Verify ownership and private permissions before use. Merge additional exports only after reviewing collisions; never overwrite an existing archive without review. An existing decisions index without a governance compaction must be repaired before adoption.

The install result and dry run report `validation.integration`, `validation.missingDependencies`, and `validation.verification`. An existing project manifest is preserved, so `project-owned-manifest-requires-integration` means the kit validator scripts and dependencies have not been integrated or verified. `missingDependencies` reports validator modules not resolvable from the consumer at planning time; an empty list is not proof that validation runs. Integrate the scripts and dependencies deliberately, then run the project and kit checks in the consumer environment. An older consumer without recorded integration state is reported as `unknown-requires-review`.

To migrate newly discovered definitions without a version change, run `cinderling upgrade <installed-version> --reconcile --definitions retire --dry-run` with the exact installed release archive or authenticated release, then repeat without `--dry-run`. Reconciliation requires the stored release-manifest fingerprint, records a new governance decision, and applies the same conflict checks and rollback as an upgrade. Consumers installed before manifest fingerprints were recorded must first upgrade to a newer release. A reconciliation archive collision stops the operation for review.

Nested project OpenCode configuration and nested `.opencode`, `.agents` or `.claude` directories stop discovery for manual review. Any nonempty configured skill paths or remote skill URLs also stop the operation rather than being treated as inventoried. Only Markdown agent and command definitions and `SKILL.md` skill entry points are inventoried; unrelated files and skill support files are not retirement targets. External OpenCode environment settings and user configuration are outside this inventory; inspect the effective configuration in the fresh-session verification.

OpenCode's [skill documentation](https://opencode.ai/docs/skills/) describes `.agents/skills/<name>/SKILL.md` and `.claude/skills/<name>/SKILL.md`; OpenCode [v1.2.10 source](https://github.com/anomalyco/opencode/blob/v1.2.10/packages/opencode/src/skill/skill.ts) scans those paths recursively. Cinderling inventories nested skill entry points as well as recursive `.opencode` definitions. These source observations are version-specific, not fresh-session verification.

After applying the migration, exit OpenCode completely and start a fresh session in the project. Inspect the available agents, skills and commands, exercise the intended workflows, and verify the project MCP connections. Compare the observed paths and behavior with the migration decision and record the actual results and environment. Fixture coverage does not establish fresh-session behavior; this verification has not been performed here.

The archive contains managed configuration, devcontainer files with intentionally overlapping mounts, pnpm workspace manifests, architecture checks and OpenCode commands and skills. Releases containing the `issue-naming` and `commit-naming` skills install them under `.opencode/skills/` on init or upgrade; existing consumers must upgrade to a release containing them. Node 24, pnpm, Git, tar, OpenCode, and a devcontainer-capable host are prerequisites. Run `pnpm install --frozen-lockfile`, `pnpm test:arch`, `pnpm test`, `pnpm lint`, and `pnpm build` after reviewing the init diff. Init derives the root package identity from the target directory and provides a consumer-owned source unit, project category and runnable colocated acceptance scenario; package and semantic graph are consumer-owned after init and require deliberate migration review on upgrade. A new project must configure its own Git origin. To activate changed OpenCode commands and skills, quit and restart OpenCode.

The release archive includes the kit's distribution fixture suite for release validation, but the installer does not install `tools/distribution.test.mjs` into consumers: that suite requires kit-only templates and Cinderling Git history. Consumer `pnpm test:tools` runs the remaining portable tool tests. Upgrades remove an unmodified previously managed copy of the kit-only suite; a modified copy requires an explicit override decision.

### Project test contract

Initialized starter projects expose `pnpm test` for unit tests, `pnpm test:arch` for architecture checks, and `pnpm test:cinderling` for Cinderling tool validations. The starter `pnpm e2e` deliberately fails with an unconfigured message: the adoption scenario is not a project end-to-end suite. The project owns the real e2e command, including DB and browser coverage where applicable, and can choose any internal orchestration for all four commands. Existing project manifests are preserved, so integrate this command surface deliberately rather than replacing project scripts. Before candidate review run the first three commands; arrange `pnpm e2e` on the reviewed exact head before merge. Report a missing, unavailable or deferred e2e suite as pending, not passed, and repeat final gates after a candidate changes.

## Release checklist

1. Verify accepted ADR 00007 and the release implementation are reviewed before a release. Merge reviewed changes to `main`; do not tag a PR head.
2. Tag a deliberate `vX.Y.Z` or prerelease on intended main history and push the tag. Release CI checks ancestry, test, architecture lint, build and archive listing before creating a private Release. Verify the release asset name and access with a private repository reader; GitHub Actions artifacts are temporary validation outputs.
3. Initialize a new clean fixture from the actual authenticated release, verify the exact adoption record and package task inference, then upgrade through two real releases. Verify a new migration record at each step and a retained override conflict. Rebuild a fresh-host devcontainer twice; record checks and gaps before claiming release readiness.

## Existing repository migrations

- `sample-phoenix`: inventory accepted ADRs, category compactions and colocated Gherkin first; stage managed files in a separate branch, map package names to the nested semantic graph, run its acceptance suites, and resolve overrides explicitly.
- `villa-calimero-alegria`: compare existing prime/solve workflows and authentication to the scoped command guidance; retain nested devcontainer mounts and host-owned authentication state; review project-specific architecture before adopting managed files.
- `ops-hub`: audit its compact agent/task boundaries and existing OpenCode configuration before applying commands; retain local overrides and verify package-script inference and acceptance placement.

These are migration plans only; no external repository was changed.
