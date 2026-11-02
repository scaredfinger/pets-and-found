import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { ignoredDirectory } from './shared.mjs';

const versionPattern = /^v\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/;
const assetName = version => `cinderling-${version}.tar.gz`;
const managed = file => file === 'package.json' || file === 'pnpm-lock.yaml' || file === 'pnpm-workspace.yaml' || file === 'nx.json' || file === 'AGENTS.md' || /^(?:tools|docs|consumer-template|\.opencode\/(?:agents|commands|skills)|\.devcontainer|\.github\/workflows)\//.test(file) && !file.startsWith('docs/decision-drafts/') && !file.startsWith('docs/combined-issues-') && !['docs/README.md', 'docs/ROADMAP.md', '.github/workflows/release.yml'].includes(file);
const kitIssueEvidence = file => /^docs\/issue-\d+-[^/]+\.md$/.test(file);
const consumerOwned = name => ['package.json', 'pnpm-lock.yaml', 'docs/implementation-graph.json'].includes(name) || name.startsWith('consumer-template/');
const projectArchitecture = name => name.startsWith('docs/decisions/') || name.startsWith('docs/decision-drafts/') || name.startsWith('docs/architecture/') || name === 'docs/implementation-graph.json';
const hash = data => crypto.createHash('sha256').update(data).digest('hex');
const run = (program, args, cwd) => execFileSync(program, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const metadataPath = '.cinderling/managed.json';
const ensureVersion = version => { if (!versionPattern.test(version)) throw new Error('explicit version must be a v-prefixed semver tag'); };
const safeStat = (root, name = '') => {
  if (path.isAbsolute(name) || name.split(/[\\/]/).includes('..')) throw new Error(`unsafe project path: ${name}`);
  const target = path.resolve(root, name);
  const parsed = path.parse(target);
  let current = parsed.root;
  for (const part of target.slice(parsed.root.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    let stat;
    try { stat = fs.lstatSync(current); } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
    if (stat.isSymbolicLink()) throw new Error(`unsupported project path symlink: ${current}`);
  }
  try { return fs.lstatSync(target); } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
};
const consumerAsset = (source, name, root) => {
  const data = fs.readFileSync(path.join(source, name));
  if (name === '.github/workflows/architecture.yml') return Buffer.from("name: Architecture\non:\n  pull_request:\n  push:\n    branches: [main]\njobs:\n  evaluate:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n        with:\n          fetch-depth: 0\n          ref: ${{ github.event.pull_request.head.sha || github.sha }}\n      - uses: actions/setup-node@v4\n        with:\n          node-version: '24'\n      - uses: pnpm/action-setup@v4\n        with:\n          version: 10.32.1\n      - run: pnpm install --frozen-lockfile\n      - run: pnpm test\n      - run: pnpm lint\n        env:\n          ARCH_BASE: ${{ github.event.pull_request.base.sha || github.event.before }}\n      - run: pnpm test:cinderling\n      - run: pnpm build\n");
  if (name === 'package.json') {
    const manifest = JSON.parse(data);
    manifest.name = path.basename(root).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '') || 'consumer-workspace';
    manifest.scripts.build = 'tsc --noEmit';
    manifest.scripts['type-check'] = 'tsc --noEmit';
    manifest.scripts.test = 'node --test src/*.test.ts && pnpm --filter consumer-acceptance test';
    manifest.scripts.lint = 'pnpm test:arch';
    manifest.scripts.e2e = "node -e \"console.error('Project-owned e2e suite is not configured'); process.exit(1)\"";
    return Buffer.from(JSON.stringify(manifest, null, 2) + '\n');
  }
  if (name === 'docs/implementation-graph.json') {
    const model = JSON.parse(data);
    delete model.workspacePolicyVersion;
    delete model.units.release;
    model.relationships = model.relationships.filter(edge => edge.from !== 'release' && edge.to !== 'release');
    delete model.units['consumer-template'];
    model.relationships = model.relationships.filter(edge => edge.to !== 'consumer-template');
    delete model.units.documentation.children.roadmap;
    model.units.documentation.children['consumer-installation'].files = model.units.documentation.children['consumer-installation'].files.filter(file => !kitIssueEvidence(file));
    delete model.units.opencode.children.permissions;
    model.units.tooling.children.graph.files = ['tools/graph.mjs', 'docs/implementation-graph.json'];
    model.units.tooling.children.tests.files = [];
    model.units.tooling.children.tests.tests = ['pnpm test:cinderling'];
    model.units.tooling.package = path.basename(root).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '') || 'consumer-workspace';
    model.units.acceptance = { kind: 'package-unit', package: 'consumer-acceptance', children: { scenario: { files: ['tests/acceptance/adoption.feature', 'tests/acceptance/steps.mjs'], tests: ['pnpm --filter consumer-acceptance test'] } } };
    model.units.project = { kind: 'consumer', children: { domain: { files: ['docs/architecture/project-domain.md'] }, implementation: { files: ['src/index.ts', 'src/index.test.ts', 'tsconfig.json', 'cinderling-source-policy.json'], tests: ['node --test src/*.test.ts', 'pnpm type-check'] } } };
    model.relationships.push({ from: 'acceptance.scenario', to: 'tooling.distribution', type: 'dependsOn' });
    return Buffer.from(JSON.stringify(model, null, 2) + '\n');
  }
  if (name === 'AGENTS.md') return Buffer.from('# Consumer operational guidance\n\nRead docs/architecture/governance.md and relevant category compactions before implementation; read docs/consumer-installation.md before editing managed artifacts. Use compactions as implementation context and follow project governance when reviewing conflicts and consulting decision records. Assess tasks for changes to governance, architectural rules or agent workflow and review any scoped decision drafts against relevant compactions. A valid scoped draft is authoritative on its branch but is not promoted architecture. Decisions are draft-first; accepted decisions are immutable. Keep source comment-free and run pnpm test:arch, pnpm test, pnpm lint and pnpm build. Preserve the devcontainer nested mounts and host-owned authentication. Consumer source, package identity and implementation graph are project-owned.\n\nBefore starting services or running database-, browser-, or container-dependent work, load and follow the devcontainer-runtime skill. Other tasks do not require it unless runtime preparation or diagnosis becomes relevant. Use project-owned documented setup and preflight.\n\nCinderling is distributed as a private GitHub Release asset in scaredfinger/cinderling. For a consumer init or upgrade download, provide GH_TOKEN in the process environment with permission to read that repository; this project\'s own token or remote may not have access. If access is unavailable, stop and request authorized access. Do not print or persist the token. An already obtained release archive can be supplied with --archive. Read docs/consumer-installation.md for bootstrap and target-release upgrade instructions. Direct agent-operated GitHub REST requests follow the github-authentication skill; the consumer CLI uses GH_TOKEN separately.\n');
  return data;
};

export const pack = (root, version, destination) => {
  ensureVersion(version);
  const files = run('git', ['ls-files', '-z'], root).split('\0').filter(file => managed(file) && !kitIssueEvidence(file));
  if (!files.includes('package.json') || !files.includes('tools/cli.mjs')) throw new Error('missing kit assets');
  const stage = fs.mkdtempSync(path.join(os.tmpdir(), 'cinderling-pack-'));
  try {
    const hashes = {};
    const modes = {};
    for (const file of files) {
      if (!fs.lstatSync(path.join(root, file)).isFile()) throw new Error(`unsupported kit asset ${file}`);
      const data = fs.readFileSync(path.join(root, file));
      const target = path.join(stage, file);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, data);
      fs.chmodSync(target, 0o644 | (fs.statSync(path.join(root, file)).mode & 0o111));
      hashes[file] = hash(data);
      modes[file] = fs.statSync(target).mode & 0o777;
    }
    fs.writeFileSync(path.join(stage, 'release.json'), JSON.stringify({ version, files: hashes, modes }, null, 2) + '\n');
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    run('tar', ['-czf', destination, '-C', stage, '.'], root);
    return destination;
  } finally { fs.rmSync(stage, { recursive: true, force: true }); }
};

export const retrieve = async (version, token = process.env.GH_TOKEN) => {
  ensureVersion(version);
  if (!token) throw new Error('GH_TOKEN with private repository read access is required');
  const headers = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' };
  const release = await fetch(new URL(`/repos/scaredfinger/cinderling/releases/tags/${version}`, 'https://api.github.com'), { headers });
  if (!release.ok) throw new Error(`private release lookup failed (${release.status})`);
  const data = await release.json();
  const asset = data.assets?.find(item => item.name === assetName(version));
  if (!asset) throw new Error('release asset missing');
  const response = await fetch(asset.url, { headers: { ...headers, Accept: 'application/octet-stream' } });
  if (!response.ok || !response.headers.get('content-type')?.includes('application/octet-stream')) throw new Error(`release download failed (${response.status})`);
  return Buffer.from(await response.arrayBuffer());
};

const unpack = (archive, version) => {
  const stage = fs.mkdtempSync(path.join(os.tmpdir(), 'cinderling-install-'));
  const file = path.join(stage, 'archive.tar.gz');
  const source = path.join(stage, 'source');
  fs.mkdirSync(source);
  fs.writeFileSync(file, archive);
  try {
    const entries = run('tar', ['-tzf', file], stage).trim().split('\n');
    if (entries.some(entry => !entry.startsWith('./') || entry.split('/').includes('..') || entry.startsWith('./.git/'))) throw new Error('unsafe archive path');
    const types = run('tar', ['-tvzf', file], stage).trim().split('\n');
    if (types.some(line => !['-', 'd'].includes(line[0]))) throw new Error('unsafe archive entry type');
    run('tar', ['-xzf', file, '-C', source, '--no-same-owner', '--same-permissions'], stage);
    const release = JSON.parse(fs.readFileSync(path.join(source, 'release.json'), 'utf8'));
    if (release.version !== version || !release.files || !Object.keys(release.files).length || entries.some(entry => entry !== './' && !entry.endsWith('/') && entry !== './release.json' && !Object.hasOwn(release.files, entry.slice(2)))) throw new Error('archive version mismatch');
    for (const [name, digest] of Object.entries(release.files)) {
      if (!managed(name) || !/^[a-f0-9]{64}$/.test(digest) || hash(fs.readFileSync(path.join(source, name))) !== digest) throw new Error(`invalid archive asset ${name}`);
      if (release.modes && (!Number.isInteger(release.modes[name]) || release.modes[name] < 0 || release.modes[name] > 0o777 || (fs.statSync(path.join(source, name)).mode & 0o777) !== release.modes[name])) throw new Error(`invalid archive asset mode ${name}`);
    }
    return { stage, source, release };
  } catch (error) { fs.rmSync(stage, { recursive: true, force: true }); throw error; }
};

export const inspectRelease = (archive, version) => {
  ensureVersion(version);
  const { stage, release } = unpack(archive, version);
  try { return release; } finally { fs.rmSync(stage, { recursive: true, force: true }); }
};

export const inspectDefinitions = (root, old) => Object.fromEntries(localDefinitions(root, old));

const nextId = root => {
  const dir = path.join(root, 'docs/decisions');
  const ids = fs.existsSync(dir) ? fs.readdirSync(dir).map(name => /^\d{5}/.exec(name)?.[0]).filter(Boolean).map(Number) : [];
  return String(Math.max(-1, ...ids) + 1).padStart(5, '0');
};
const record = (id, title, body) => `---\nid: "${id}"\ntitle: "${title}"\ncategory: governance\ntype: architecture\nstatus: accepted\ndate: ${new Date().toISOString().slice(0, 10)}\ntags: [adoption, migration]\ndependsOn: []\nsupersedes: []\nrelated: []\n---\n\n# AI Summary\n\n${body}\n\n# Decision\n\n${body}\n\n# Provenance\n\nAuthor: Cinderling CLI\nSources: Private release installation\n`;

const parseConfig = (name, text) => {
  let clean = '';
  let string = false;
  let escaped = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (string) {
      clean += char;
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') string = false;
    } else if (char === '"') { string = true; clean += char; }
    else if (char === '/' && text[i + 1] === '/') {
      while (i < text.length && text[i] !== '\n' && text[i] !== '\r') i++;
      clean += '\n';
    } else if (char === '/' && text[i + 1] === '*') {
      const end = text.indexOf('*/', i + 2);
      if (end < 0) throw new Error(`invalid OpenCode config: ${name}`);
      clean += ' ';
      i = end + 1;
    } else clean += char;
  }
  if (string) throw new Error(`invalid OpenCode config: ${name}`);
  let json = '';
  string = false;
  escaped = false;
  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    if (string) {
      json += char;
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') string = false;
    } else if (char === '"') { string = true; json += char; }
    else if (char === ',' && /^[\s]*[}\]]/.test(clean.slice(i + 1))) json += ' ';
    else json += char;
  }
  try {
    const config = JSON.parse(json);
    if (!config || typeof config !== 'object' || Array.isArray(config)) throw new Error();
    return config;
  } catch { throw new Error(`invalid OpenCode config: ${name}`); }
};

const localDefinitions = (root, old) => {
  const found = new Map();
  found.unsupported = [];
  const walk = (name, kind, depth = 0) => {
    const target = path.join(root, name);
    const stat = safeStat(root, name);
    if (!stat) return;
    if (stat.isDirectory()) for (const child of fs.readdirSync(target)) walk(`${name}/${child}`, kind, depth + 1);
    else if (stat.isFile() && (kind === 'skill' || kind === 'external-skill' ? path.basename(name) === 'SKILL.md' : name.endsWith('.md'))) {
      if (name.includes('#')) throw new Error(`unsupported definition path: ${name}`);
      const digest = hash(fs.readFileSync(target));
      if (old?.files?.[name] !== digest) found.set(name, digest);
    }
  };
  const directories = [['.opencode/agent', 'agent'], ['.opencode/agents', 'agent'], ['.opencode/command', 'command'], ['.opencode/commands', 'command'], ['.opencode/skill', 'skill'], ['.opencode/skills', 'skill'], ['.agents/skills', 'external-skill'], ['.claude/skills', 'external-skill']];
  const nested = (dir, relative = '') => {
    if (!safeStat(root, relative)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (ignoredDirectory(entry.name)) continue;
      const name = relative ? `${relative}/${entry.name}` : entry.name;
      if (entry.isSymbolicLink() && ['.opencode', '.agents', '.claude', 'opencode.json', 'opencode.jsonc'].includes(entry.name)) safeStat(root, name);
      if (entry.isDirectory() && !['.git', 'node_modules', '.cinderling', '.opencode', '.agents', '.claude'].includes(entry.name)) nested(path.join(dir, entry.name), name);
      if (relative && (['.opencode', '.agents', '.claude'].includes(entry.name) && entry.isDirectory() || ['opencode.json', 'opencode.jsonc'].includes(entry.name) && entry.isFile())) throw new Error(`unsupported nested OpenCode discovery: ${name}`);
    }
  };
  nested(root);
  for (const name of ['opencode.json', 'opencode.jsonc', '.opencode/opencode.json', '.opencode/opencode.jsonc']) {
    const target = path.join(root, name);
    const stat = safeStat(root, name);
    if (!stat) continue;
    if (!stat.isFile()) throw new Error(`unsupported OpenCode config: ${name}`);
    const text = fs.readFileSync(target, 'utf8');
    const config = parseConfig(name, text);
    for (const key of ['agent', 'command']) if (config[key] && Object.keys(config[key]).length) found.set(`${name}#${key}`, hash(JSON.stringify(config[key])));
    if (config.skills?.paths !== undefined && (!Array.isArray(config.skills.paths) || config.skills.paths.length)) throw new Error(`unsupported configured skill paths: ${name}`);
    if (config.skills?.urls !== undefined && (!Array.isArray(config.skills.urls) || config.skills.urls.length)) throw new Error(`unsupported remote skill discovery: ${name}`);
  }
  for (const [dir, kind] of directories) walk(dir, kind);
  return found;
};

export const install = (root, archive, version, { dryRun = false, keepOverrides = false, definitions, definitionDecisions = {}, reconcile = false, legacyBackup, reviewedMigration, io = fs } = {}) => {
  ensureVersion(version);
  const { stage, source, release } = unpack(archive, version);
  try {
    const state = (base, name) => {
      const stat = safeStat(base, name);
      if (!stat) return null;
      if (!stat.isFile()) throw new Error(`unexpected non-file: ${path.join(base, name)}`);
      return { data: fs.readFileSync(path.join(base, name)), mode: stat.mode & 0o7777 };
    };
    const equalState = (a, b) => a === null || b === null ? a === b : a.mode === b.mode && a.data.equals(b.data);
    const snapshots = new Map();
    const capture = name => {
      if (!snapshots.has(name)) snapshots.set(name, state(root, name));
      return snapshots.get(name);
    };
    const metadata = capture(metadataPath);
    const old = metadata ? JSON.parse(metadata.data.toString('utf8')) : null;
    for (const [name, digest] of Object.entries(reviewedMigration?.reviewedFiles || {})) {
      const snapshot = capture(name);
      if ((snapshot ? hash(snapshot.data) : null) !== digest) throw new Error(`stale installation review: ${name}`);
      if (reviewedMigration.reviewedModes && (snapshot ? snapshot.mode & 0o777 : null) !== reviewedMigration.reviewedModes[name]) throw new Error(`stale installation review mode: ${name}`);
    }
    capture('docs/decisions/index.md');
    capture('docs/architecture/governance.md');
    if (!old && safeStat(root, 'docs/decisions') && !safeStat(root, 'docs/decisions/index.md') && fs.readdirSync(path.join(root, 'docs/decisions')).some(name => /^\d{5}.*\.md$/.test(name))) throw new Error('existing decision history requires a decisions index before adoption');
    if (safeStat(root, 'docs/decisions/index.md') && !safeStat(root, 'docs/architecture/governance.md')) throw new Error('existing decisions index requires docs/architecture/governance.md before adoption');
    const releaseHash = hash(JSON.stringify(Object.entries(release.files).sort(([a], [b]) => a.localeCompare(b))));
    const releaseModeHash = hash(JSON.stringify(Object.keys(release.files).sort().map(name => [name, fs.statSync(path.join(source, name)).mode & 0o777])));
    if (old?.version === version && !reconcile) throw new Error('version already installed; use --reconcile to revisit definitions');
    if (reconcile && (!old || old.version !== version)) throw new Error('reconcile requires the installed version');
    if (reconcile && old.releaseHash !== releaseHash) throw new Error('reconcile requires the exact installed release manifest');
    if (reconcile && old.releaseModeHash && old.releaseModeHash !== releaseModeHash) throw new Error('reconcile requires the exact installed release modes');
    if (old && !versionPattern.test(old.version)) throw new Error('invalid installed version');
    if (definitions && !['retain', 'retire'].includes(definitions)) throw new Error('definitions decision must be retain or retire');
    const inventory = localDefinitions(root, reviewedMigration && old ? { ...old, files: Object.fromEntries(Object.entries(old.files || {}).filter(([name]) => Object.hasOwn(release.files, name))) } : old);
    for (const [name, choice] of Object.entries(definitionDecisions)) if (!inventory.has(name) || !['retain', 'retire'].includes(choice)) throw new Error(`invalid definition decision: ${name}`);
    const decisions = new Map([...inventory].map(([name]) => [name, definitionDecisions[name] || definitions]));
    const pending = [...decisions].filter(([, choice]) => !choice);
    if (pending.length) throw new Error(`project-local OpenCode definitions require --definitions retain or --definitions retire, or per-path --definition decisions:\n${pending.map(([name]) => name).join('\n')}`);
    const retiring = [...decisions.keys()];
    let exportRoot;
    if (retiring.length && legacyBackup) {
      if (!path.isAbsolute(legacyBackup)) throw new Error('an absolute --legacy-backup destination is required');
      exportRoot = path.resolve(legacyBackup);
      const relative = path.relative(path.resolve(root), exportRoot);
      if (!relative || (!relative.startsWith(`..${path.sep}`) && relative !== '..')) throw new Error('legacy backup must be outside the project');
      if (safeStat(exportRoot)) throw new Error('legacy backup destination already exists');
      const parent = path.dirname(exportRoot);
      if (!safeStat(parent)?.isDirectory()) throw new Error('legacy backup parent directory must exist');
      try {
        if (run('git', ['rev-parse', '--is-inside-work-tree'], parent).trim() === 'true') throw new Error('legacy backup must be outside Git worktrees');
      } catch (error) { if (!String(error.stderr).includes('not a git repository')) throw error; }
    }
    const retained = Object.fromEntries([...inventory].filter(([name]) => decisions.get(name) === 'retain'));
    const retired = new Set(old?.definitions?.retired || []);
    for (const name of retiring) if (!release.files[name]) retired.add(name); else retired.delete(name);
    for (const name of Object.keys(release.files)) retired.delete(name);
    const writes = new Map();
    const modes = new Map();
    const archiveRoot = `.cinderling/legacy/${version}${reconcile ? '-reconcile' : ''}`;
    const configs = new Map();
    const sections = new Map();
    if (retiring.length) {
      if (safeStat(root)) {
        let repository = false;
        try { repository = run('git', ['rev-parse', '--is-inside-work-tree'], root).trim() === 'true'; } catch (error) { if (!String(error.stderr).includes('not a git repository')) throw error; }
        if (repository && run('git', ['ls-files', '-z', '--', '.cinderling/legacy'], root)) throw new Error('legacy archive contains Git-tracked paths');
      }
      const legacy = safeStat(root, '.cinderling/legacy');
      if (legacy && (!legacy.isDirectory() || (legacy.mode & 0o077))) throw new Error('legacy archive directory must be private');
      if (safeStat(root, archiveRoot)) throw new Error(`legacy archive already exists: ${archiveRoot}`);
      const ignore = '.cinderling/legacy/.gitignore';
      if (safeStat(root, ignore)) {
        if (fs.readFileSync(path.join(root, ignore), 'utf8') !== '*\n') throw new Error('legacy archive ignore file conflict');
      } else { writes.set(ignore, Buffer.from('*\n')); modes.set(ignore, 0o600); }
    }
    for (const name of retiring) {
      const [file, key] = name.split('#');
      const backup = `${archiveRoot}/${file}`;
      const snapshot = capture(file);
      if (!snapshot) throw new Error(`definition source is not a file: ${file}`);
      if (key) {
        if (!configs.has(file)) {
          const original = snapshot.data;
          configs.set(file, parseConfig(file, original.toString('utf8')));
          const originalPath = `${archiveRoot}/.original-config/${file}`;
          writes.set(originalPath, original);
          modes.set(originalPath, snapshot.mode & 0o600);
        }
        if (hash(JSON.stringify(configs.get(file)[key])) !== inventory.get(name)) throw new Error(`definition changed during inventory: ${name}`);
        if (!sections.has(file)) sections.set(file, {});
        sections.get(file)[key] = configs.get(file)[key];
        delete configs.get(file)[key];
      } else {
        if (hash(snapshot.data) !== inventory.get(name)) throw new Error(`definition changed during inventory: ${name}`);
        writes.set(backup, snapshot.data);
      }
      modes.set(backup, snapshot.mode & 0o600);
    }
    const archiveSkill = name => {
      const stat = safeStat(root, name);
      if (stat.isDirectory()) for (const child of fs.readdirSync(path.join(root, name))) archiveSkill(`${name}/${child}`);
      else if (stat.isFile()) {
        const backup = `${archiveRoot}/${name}`;
        if (!writes.has(backup)) { const snapshot = capture(name); writes.set(backup, snapshot.data); modes.set(backup, snapshot.mode & 0o700); }
      } else throw new Error(`unsupported skill support path: ${name}`);
    };
    for (const name of retiring) if (name.endsWith('/SKILL.md')) archiveSkill(path.posix.dirname(name));
    for (const [name, config] of sections) writes.set(`${archiveRoot}/${name}`, Buffer.from(JSON.stringify(config, null, 2) + '\n'));
    for (const [name, config] of configs) writes.set(name, Buffer.from(JSON.stringify(config, null, 2) + '\n'));
    const overrides = [];
    for (const name of old?.overrides || []) if (!release.files[name] && reviewedMigration?.preserve.includes(name) && safeStat(root, name)) overrides.push(name);
    const files = { ...release.files };
    for (const name of Object.keys(release.files)) {
      if (reviewedMigration?.preserve.includes(name)) { delete files[name]; if (safeStat(root, name)) overrides.push(name); continue; }
      if (name.startsWith('consumer-template/')) { delete files[name]; continue; }
      if (['tools/distribution.test.mjs', 'tools/installation.test.mjs', 'tools/bootstrap.test.mjs'].includes(name)) {
        delete files[name];
        capture(name);
        if (old && safeStat(root, name)) {
          if (!old.files?.[name] || hash(fs.readFileSync(path.join(root, name))) !== old.files[name]) {
            if (!keepOverrides) throw new Error(`project override conflict: ${name}`);
            overrides.push(name);
          } else writes.set(name, null);
        }
        continue;
      }
      const target = path.join(root, name);
      const existing = safeStat(root, name);
      if ((old || safeStat(root, 'docs/decisions/index.md')) && (name.startsWith('docs/decisions/') || name === 'docs/architecture/governance.md')) { delete files[name]; continue; }
      if (old && consumerOwned(name)) { delete files[name]; continue; }
      if (!old && existing && consumerOwned(name)) { delete files[name]; continue; }
      capture(name);
      const desired = reviewedMigration?.adaptations[name] ?? consumerAsset(source, name, root);
      const desiredMode = reviewedMigration?.adaptationModes?.[name] ?? (fs.statSync(path.join(source, name)).mode & 0o777);
      modes.set(name, desiredMode);
      const digest = hash(desired);
      if (consumerOwned(name)) delete files[name];
      else files[name] = digest;
      if (existing && !reviewedMigration && !retiring.includes(name) && hash(fs.readFileSync(target)) !== digest && (!old?.files?.[name] || hash(fs.readFileSync(target)) !== old.files[name])) {
        if (!keepOverrides) throw new Error(`project override conflict: ${name}`);
        overrides.push(name);
        continue;
      }
      if (!existing || hash(fs.readFileSync(target)) !== digest || (existing.mode & 0o777) !== desiredMode) writes.set(name, desired);
    }
    for (const name of retiring) if (!name.includes('#') && !release.files[name]) writes.set(name, null);
    for (const name of Object.keys(old?.files || {})) if (!projectArchitecture(name) && !consumerOwned(name) && !release.files[name] && !Object.hasOwn(retained, name) && !retired.has(name) && safeStat(root, name)) {
      if (reviewedMigration?.preserve.includes(name)) { overrides.push(name); continue; }
      capture(name);
      if (reviewedMigration?.retire?.includes(name)) { writes.set(name, null); continue; }
      if (hash(fs.readFileSync(path.join(root, name))) !== old.files[name]) {
        if (!keepOverrides) throw new Error(`project override conflict: ${name}`);
        overrides.push(name);
      } else writes.set(name, null);
    }
    if (!old && !reviewedMigration) for (const name of ['tests/acceptance/package.json', 'tests/acceptance/adoption.feature', 'tests/acceptance/steps.mjs', 'docs/architecture/project-domain.md', 'src/index.ts', 'src/index.test.ts', ...(!safeStat(root, 'package.json') ? ['tsconfig.json', 'cinderling-source-policy.json'] : [])]) if (!capture(name)) writes.set(name, fs.readFileSync(path.join(source, 'consumer-template', name)));
    for (const name of reviewedMigration?.retire || []) if (safeStat(root, name)) { capture(name); writes.set(name, null); }
    if (old) for (const name of Object.keys(files)) if (name.startsWith('docs/decisions/') || name === 'docs/decisions/index.md' || name === 'docs/architecture/governance.md') delete files[name];
    for (const name of overrides) delete files[name];
    if (old) safeStat(root, 'docs/decisions');
    if (!reviewedMigration) {
      const id = nextId(old || safeStat(root, 'docs/decisions/index.md') ? root : source);
      const title = reconcile ? `Cinderling reconciliation ${version}` : old ? `Cinderling migration ${old.version} to ${version}` : `Cinderling adoption ${version}`;
      const decisionName = `docs/decisions/${id}-${old ? 'migration' : 'adoption'}-${version}.md`;
      if (safeStat(root, decisionName)) throw new Error('decision already exists');
      const body = `${old ? `Upgrade from ${old.version} to ${version}. Changed managed artifacts: ${[...writes.keys()].join(', ') || 'none'}. Project adaptations retained: ${overrides.join(', ') || 'none'}.` : `Adopt exact private Cinderling release ${version}.`} OpenCode definitions archived at ${archiveRoot}: ${retiring.join(', ') || 'none'}. Retain decisions: ${Object.keys(retained).join(', ') || 'none'}; retire decisions: ${retiring.filter(name => decisions.get(name) === 'retire').join(', ') || 'none'}. Fresh-session verification is required.`;
      writes.set(decisionName, Buffer.from(record(id, title, body)));
      safeStat(root, 'docs/decisions/index.md');
      const index = writes.get('docs/decisions/index.md')?.toString() || fs.readFileSync(path.join(root, 'docs/decisions/index.md'), 'utf8');
      if (!/\|---\|---\|---\|\n/.test(index)) throw new Error('unsupported decisions index format');
      writes.set('docs/decisions/index.md', Buffer.from(index.replace(/(\|---\|---\|---\|\n)/, `$1| ${id} | ${title} | governance |\n`)));
      safeStat(root, 'docs/architecture/governance.md');
      const governance = writes.get('docs/architecture/governance.md')?.toString() || fs.readFileSync(path.join(root, 'docs/architecture/governance.md'), 'utf8');
      writes.set('docs/architecture/governance.md', Buffer.from(governance + `\n## ${title}\n\nSource: [${id}](../decisions/${path.basename(decisionName)})\n\n${body}\n`));
    }
    if (reviewedMigration) for (const [name, data] of Object.entries(reviewedMigration.writes)) writes.set(name, data);
    const integration = old?.validationIntegration || (old ? 'unknown-requires-review' : safeStat(root, 'package.json') ? 'project-owned-manifest-requires-integration' : 'generated-manifest-requires-verification');
    const requireFromProject = createRequire(path.resolve(root, 'tools/architecture.mjs'));
    const missingDependencies = ['typescript', '@cucumber/gherkin', '@cucumber/messages', 'yaml'].filter(name => { try { requireFromProject.resolve(name); return false; } catch (error) { if (error.code !== 'MODULE_NOT_FOUND') throw error; return true; } });
    const validation = { integration, missingDependencies, verification: 'not-run' };
    const installationHistory = [...(old?.installationHistory || []), ...(old?.installation ? [old.installation] : [])];
    const summaryBaseline = old?.summaryBaseline ?? (reviewedMigration ? { version, files: Object.fromEntries(Object.entries(reviewedMigration.reviewedFiles).filter(([name, digest]) => /^docs\/decisions\/\d{5}-[^/]+\.md$/.test(name) && typeof digest === 'string')) } : undefined);
    writes.set(metadataPath, Buffer.from(JSON.stringify({ version, releaseHash, releaseModeHash, files, overrides, validationIntegration: integration, definitions: { retained, retired: [...retired] }, ...(summaryBaseline ? { summaryBaseline } : {}), ...(reviewedMigration ? { installation: reviewedMigration.evidence } : {}), ...(reviewedMigration || installationHistory.length ? { installationHistory } : {}) }, null, 2) + '\n'));
    const summary = { version, from: old?.version || null, changed: [...writes.keys()], overrides, validation, definitions: { detected: [...inventory.keys()], retained: Object.keys(retained), retired: retiring, archived: archiveRoot, backup: exportRoot || null, retiredPaths: [...retired], unassessed: inventory.unsupported, acceptance: 'requires-fresh-session-verification' } };
    for (const name of writes.keys()) capture(name);
    const exports = exportRoot ? [['.gitignore', Buffer.from('*\n'), 0o600], ...[...writes].filter(([name]) => name.startsWith(`${archiveRoot}/`)).map(([name, data]) => [`${version}${reconcile ? '-reconcile' : ''}/${name.slice(archiveRoot.length + 1)}`, data, modes.get(name) ?? 0o600])] : [];
    for (const [name] of exports) safeStat(exportRoot, name);
    if (dryRun) return summary;
    const backups = new Map();
    const directories = [];
    const mutatedSources = new Set();
    const verifySources = () => {
      for (const [name, snapshot] of snapshots) if (!mutatedSources.has(name) && !equalState(state(root, name), snapshot)) throw new Error(`project file changed during migration: ${name}`);
    };
    const syncPath = target => {
      const descriptor = io.openSync(target, 'r');
      try { io.fsyncSync(descriptor); } finally { io.closeSync(descriptor); }
    };
    const atomicWrite = (target, data, mode, beforeRename) => {
      const staged = path.join(path.dirname(target), `.${path.basename(target)}.cinderling-${crypto.randomBytes(12).toString('hex')}`);
      let created = false;
      let descriptor;
      try {
        descriptor = io.openSync(staged, 'wx', mode ?? 0o666);
        created = true;
        io.writeFileSync(descriptor, data);
        io.fsyncSync(descriptor);
        io.closeSync(descriptor);
        descriptor = undefined;
        if (mode !== undefined) io.chmodSync(staged, mode);
        beforeRename();
        io.renameSync(staged, target);
      } finally {
        try { if (descriptor !== undefined) io.closeSync(descriptor); } finally { if (created) io.rmSync(staged, { force: true }); }
      }
    };
    let current;
    try {
      const operations = [...exports.map(([name, data, mode]) => ({ name: `export:${name}`, base: exportRoot, file: name, data, mode, privateDir: true })), ...[...writes].map(([name, data]) => ({ name, base: root, file: name, data, mode: modes.get(name), privateDir: name.startsWith('.cinderling/legacy/') }))];
      let exportVerified = false;
      for (const { name, base, file, data, mode, privateDir } of operations) {
        current = name;
        if (base === root) {
          if (exportRoot && !exportVerified) {
            for (const [exportName, expected, exportMode] of exports) if (!equalState(state(exportRoot, exportName), { data: expected, mode: exportMode })) throw new Error(`legacy backup verification failed: ${exportName}`);
            for (const directory of directories.filter(dir => dir === exportRoot || dir.startsWith(`${exportRoot}${path.sep}`)).reverse()) syncPath(directory);
            syncPath(path.dirname(exportRoot));
            exportVerified = true;
          }
          verifySources();
        }
        const target = path.join(base, file);
        const stat = safeStat(base, file);
        if (base === exportRoot && stat) throw new Error(`legacy backup path already exists: ${target}`);
        const backup = { base, file, original: stat ? { data: fs.readFileSync(target), mode: stat.mode & 0o7777 } : null, applied: false, expected: null };
        backups.set(name, backup);
        const missing = [];
        let dir = path.dirname(target);
        while (!fs.existsSync(dir)) { missing.push(dir); dir = path.dirname(dir); }
        for (const directory of missing.reverse()) {
          io.mkdirSync(directory, privateDir ? { mode: 0o700 } : undefined);
          directories.push(directory);
        }
        safeStat(base, file);
        if (base === root && snapshots.has(file) && !equalState(state(root, file), snapshots.get(file))) throw new Error(`project file changed during migration: ${file}`);
        if (data === null) io.rmSync(target);
        else if (base === exportRoot) io.writeFileSync(target, data, { mode, flag: 'wx' });
        else atomicWrite(target, data, mode ?? backup.original?.mode, () => {
          verifySources();
          if (!equalState(state(root, file), snapshots.get(file))) throw new Error(`project file changed during migration: ${file}`);
        });
        backup.applied = true;
        backup.expected = data === null ? null : { data, mode: mode ?? backup.original?.mode ?? (safeStat(base, file).mode & 0o7777) };
        if (base === exportRoot) {
          io.chmodSync(target, mode);
          backup.expected.mode = mode;
          if (!equalState(state(base, file), backup.expected)) throw new Error(`legacy backup verification failed: ${file}`);
          syncPath(target);
        }
        if (base === root && snapshots.has(file)) mutatedSources.add(file);
      }
      verifySources();
      for (const name of mutatedSources) if (!equalState(state(root, name), backups.get(name).expected)) throw new Error(`project file changed during migration: ${name}`);
    } catch (error) {
      const failures = [];
      for (const [name, { base, file, original, applied, expected }] of [...backups].reverse()) {
        if (base === exportRoot && failures.length) continue;
        try {
          const target = path.join(base, file);
          safeStat(base, file);
          if (base !== exportRoot) {
            const currentState = state(base, file);
            if (equalState(currentState, original)) continue;
            if (!applied || !equalState(currentState, expected)) throw new Error('concurrent change preserved during rollback');
          }
          if (original === null) io.rmSync(target, { force: true });
          else atomicWrite(target, original.data, original.mode, () => { if (!equalState(state(base, file), expected)) throw new Error('concurrent change preserved during rollback'); });
        } catch (failure) { failures.push({ name, failure }); }
      }
      const directoryFailures = [];
      for (const directory of directories.reverse()) {
        if (failures.length && exportRoot && (directory === exportRoot || directory.startsWith(`${exportRoot}${path.sep}`))) continue;
        try { io.rmdirSync(directory); } catch (failure) { if (failure.code !== 'ENOENT') directoryFailures.push({ directory, failure }); }
      }
      if (directoryFailures.length && !failures.length) throw new AggregateError([error, ...directoryFailures.map(item => item.failure)], `installation failed at ${current}: ${error.message}; rollback directory cleanup failed:\n${directoryFailures.map(({ directory, failure }) => `${directory}: ${failure.message}`).join('\n')}`);
      if (failures.length) {
        let recovery;
        let recoveryError;
        try {
          recovery = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'cinderling-recovery-'));
          fs.chmodSync(recovery, 0o700);
          const manifest = [];
          for (const [index, { name }] of failures.entries()) {
            const backup = backups.get(name).original;
            const file = backup ? String(index).padStart(5, '0') : null;
            if (backup) { fs.writeFileSync(path.join(recovery, file), backup.data, { mode: 0o600 }); fs.chmodSync(path.join(recovery, file), backup.mode); }
            manifest.push({ path: name.startsWith('export:') ? path.join(backups.get(name).base, backups.get(name).file) : name, file, mode: backup?.mode ?? null });
          }
          fs.writeFileSync(path.join(recovery, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', { mode: 0o600 });
        } catch (failure) { recoveryError = failure; }
        throw new AggregateError([error, ...failures.map(item => item.failure), ...directoryFailures.map(item => item.failure), ...(recoveryError ? [recoveryError] : [])], `installation failed at ${current}: ${error.message}; rollback operation(s) failed:\n${[...failures.map(({ name, failure }) => `${name}: ${failure.message}`), ...directoryFailures.map(({ directory, failure }) => `${directory}: ${failure.message}`)].join('\n')}${exportRoot ? `\nInspect external backup at ${exportRoot}` : ''}\nRecovery ${recoveryError ? `incomplete${recovery ? ` at ${recovery}` : ''}: ${recoveryError.message}` : `saved at ${recovery}`}`);
      }
      throw error;
    }
    return summary;
  } finally { fs.rmSync(stage, { recursive: true, force: true }); }
};
