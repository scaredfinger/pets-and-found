import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import { createRequire } from 'node:module';
import { install, inspectRelease, inspectDefinitions } from './distribution.mjs';
import { ignoredDirectory } from './shared.mjs';

const require = createRequire(import.meta.url);
const validator = name => {
  try { return require(name); } catch (error) {
    if (['MODULE_NOT_FOUND', 'ERR_MODULE_NOT_FOUND'].includes(error.code)) throw new Error('reviewed ADR validation requires the target kit tooling dependencies, including yaml; install them in the CLI environment before applying review');
    throw error;
  }
};
const frontmatter = text => { validator('yaml'); return validator('./shared.mjs').frontmatter(text); };

const digest = data => crypto.createHash('sha256').update(data).digest('hex');
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const ignoredReviewPath = name => typeof name === 'string' && (name.split('/').some(ignoredDirectory) || name === '.cinderling/legacy' || name.startsWith('.cinderling/legacy/'));
const assertReviewSource = name => {
  if (ignoredReviewPath(name)) throw new Error(`review source is inside an ignored runtime or archive directory: ${name}; move it to a project-owned review input path`);
};
const recordIdentity = text => digest(text.replace(/^id:.*$/m, 'id: DRAFT').replace(/^status:.*$/m, 'status: draft'));
const references = (name, text, target) => {
  const literal = new RegExp(`(^|[^\\w./-])${target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=$|[^\\w/-])`);
  return literal.test(text) || [...text.matchAll(/\]\(([^)\s]+)\)/g)].some(match => {
    const link = match[1].split('#')[0];
    return (link.startsWith('/') ? link.slice(1) : path.posix.normalize(path.posix.join(path.posix.dirname(name), link))) === target;
  });
};
const validateState = (root, writes = {}) => {
  validator('yaml');
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'cinderling-decisions-'));
  try {
    const copy = (name, data) => { const file = path.join(temp, name); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, data); };
    for (const name of Object.keys(inventory(root))) if (/^docs\/(?:decisions|decision-drafts|architecture)\/.*\.md$/.test(name)) copy(name, read(root, name));
    for (const [name, data] of Object.entries(writes)) copy(name, data);
    return validator('./decisions.mjs').decisions(temp, { immutable: false, validateDraftSummaries: false });
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
};
const resolveDecision = (root, decision, version) => {
  let target = decision.target;
  const identity = decision.identity || (read(root, target) ? recordIdentity(read(root, target).toString()) : null);
  if (!read(root, target) && identity) {
    const directory = path.join(root, 'docs/decisions');
    const matches = fs.existsSync(directory) ? fs.readdirSync(directory).filter(name => /^\d{5}-[^/]+\.md$/.test(name)).map(name => `docs/decisions/${name}`).filter(name => recordIdentity(read(root, name).toString()) === identity) : [];
    if (matches.length === 1) target = matches[0];
  }
  const data = read(root, target);
  if (!data || !identity || recordIdentity(data.toString()) !== identity || !data.includes(Buffer.from(version))) throw new Error(`adoption evidence inconsistent: ${decision.target}`);
  const state = validateState(root);
  if (state.errors.length || ![...state.accepted, ...state.drafts].some(record => record.file === target)) throw new Error(`adoption record validation failed: ${state.errors.join('; ') || target}`);
  const accepted = state.accepted.find(record => record.file === target);
  if (accepted && !references(`docs/architecture/${accepted.data.category}.md`, read(root, `docs/architecture/${accepted.data.category}.md`).toString(), target)) throw new Error(`promoted adoption record lacks a compaction link: ${target}`);
  return { ...decision, target, identity };
};
const protectedPath = name => ['package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', 'nx.json', 'docs/implementation-graph.json'].includes(name) || name.startsWith('docs/decisions/') || name.startsWith('docs/architecture/') || name.startsWith('consumer-template/') || name.endsWith('.test.mjs') && !['tools/distribution.test.mjs', 'tools/installation.test.mjs', 'tools/bootstrap.test.mjs'].includes(name);
const localPath = (root, name) => {
  if (typeof name !== 'string' || !name || name.includes('\\') || path.posix.normalize(name) !== name || path.isAbsolute(name) || name.split('/').some(part => ['..', '.git', 'node_modules'].includes(part))) throw new Error(`unsafe review path: ${name}`);
  let current = path.resolve(root);
  for (const part of name.split('/')) {
    current = path.join(current, part);
    if (fs.existsSync(current) || fs.lstatSync(current, { throwIfNoEntry: false })) {
      if (fs.lstatSync(current).isSymbolicLink()) throw new Error(`unsupported review symlink: ${name}`);
    }
  }
  return current;
};
const read = (root, name) => {
  const file = localPath(root, name);
  return fs.existsSync(file) ? fs.readFileSync(file) : null;
};
const inventory = root => {
  const files = {};
  const walk = (directory, prefix = '') => {
    if (!fs.existsSync(directory)) return;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const name = prefix + entry.name;
      if (ignoredDirectory(entry.name) || name === '.cinderling/legacy') continue;
      if (entry.isSymbolicLink()) throw new Error(`unsupported review symlink: ${name}`);
      if (entry.isDirectory()) walk(path.join(directory, entry.name), `${name}/`);
      else if (entry.isFile()) files[name] = digest(fs.readFileSync(path.join(directory, entry.name)));
      else throw new Error(`unsupported review file: ${name}`);
    }
  };
  walk(root);
  return files;
};
const installedState = root => {
  const metadata = read(root, '.cinderling/managed.json');
  if (!metadata) {
    const decisions = path.join(root, 'docs/decisions');
    if (fs.existsSync(decisions) && fs.readdirSync(decisions).some(name => /^\d{5}-(?:adoption|migration)-v/.test(name))) throw new Error('partial installation: adoption history exists without managed metadata');
    return null;
  }
  let old;
  try { old = JSON.parse(metadata); } catch { throw new Error('partial installation metadata: invalid JSON'); }
  const legacy = object(old) && Object.keys(old).every(key => ['version', 'files', 'overrides'].includes(key)) && object(old.files) && Object.keys(old.files).length > 0 && Array.isArray(old.overrides) && old.overrides.every(name => typeof name === 'string');
  if (!object(old) || !/^v\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(old.version) || !object(old.files) || !legacy && !/^[a-f0-9]{64}$/.test(old.releaseHash)) throw new Error('partial installation metadata: version, files and releaseHash required unless validated legacy metadata');
  for (const [name, value] of Object.entries(old.files)) {
    localPath(root, name);
    if (!/^[a-f0-9]{64}$/.test(value)) throw new Error(`partial installation metadata: invalid digest ${name}`);
  }
  if (old.installation) {
    if (old.installation.version !== old.version || !Array.isArray(old.installation.decisions) || !old.installation.decisions.length) throw new Error('adoption evidence inconsistent with installed metadata');
    old.installation = { ...old.installation, decisions: old.installation.decisions.map(decision => resolveDecision(root, decision, old.version)) };
  } else {
    const decisions = path.join(root, 'docs/decisions');
    if (!fs.existsSync(decisions) || !fs.readdirSync(decisions).some(name => /(?:adoption|migration)-/.test(name) && fs.readFileSync(localPath(root, `docs/decisions/${name}`), 'utf8').includes(old.version))) throw new Error('adoption evidence missing for installed version');
    if (legacy) {
      const state = validateState(root);
      const record = state.accepted.find(item => ['adoption', 'migration'].some(kind => item.file.endsWith(`-${kind}-${old.version}.md`)) && item.text.includes(old.version));
      if (state.errors.length || !record || !references(`docs/architecture/${record.data.category}.md`, read(root, `docs/architecture/${record.data.category}.md`).toString(), record.file)) throw new Error(`legacy adoption evidence requires a valid accepted registry and compaction links: ${state.errors.join('; ')}`);
    }
  }
  return old;
};

export const reviewInstallation = (root, archive, version, { sha256, reviewPath } = {}) => {
  if (sha256 !== undefined && (!/^[a-f0-9]{64}$/.test(sha256) || digest(archive) !== sha256)) throw new Error('release archive SHA-256 mismatch');
  const release = inspectRelease(archive, version);
  const old = installedState(root);
  if (old?.version === version && !old.releaseHash) throw new Error('legacy metadata has no release fingerprint; upgrade to a new explicit version before reconciliation');
  if (old?.version === version && old.installation?.archiveSha256 && old.installation.archiveSha256 !== digest(archive)) throw new Error('reconcile requires the exact installed archive digest');
  const index = read(root, 'docs/decisions/index.md');
  const governance = read(root, 'docs/architecture/governance.md');
  const decisionDirectory = path.join(root, 'docs/decisions');
  if (index && !governance) throw new Error('partial governance: decisions index requires governance compaction');
  if (fs.existsSync(decisionDirectory) && fs.readdirSync(decisionDirectory).some(name => /^\d{5}.*\.md$/.test(name)) && !index) throw new Error('partial governance: accepted decisions require an index');
  const reviewedFiles = inventory(root);
  if (reviewPath) delete reviewedFiles[path.relative(path.resolve(root), path.resolve(reviewPath)).split(path.sep).join('/')];
  const definitionState = old ? { ...old, files: Object.fromEntries(Object.entries(old.files).filter(([name]) => Object.hasOwn(release.files, name))) } : old;
  const definitions = Object.fromEntries(Object.keys(inspectDefinitions(root, definitionState)).map(name => [name, null]));
  const explicitPaths = [...Object.keys(release.files), ...Object.keys(old?.files || {}), ...(old?.overrides || []), ...Object.keys(definitions).map(name => name.split('#')[0]), '.cinderling/managed.json', 'docs/decisions/index.md', 'docs/architecture/governance.md'];
  for (const name of explicitPaths) if (!Object.hasOwn(reviewedFiles, name)) { const data = read(root, name); reviewedFiles[name] = data ? digest(data) : null; }
  const reviewedModes = Object.fromEntries(Object.entries(reviewedFiles).map(([name, value]) => [name, value === null ? null : fs.statSync(localPath(root, name)).mode & 0o777]));
  const adaptations = Object.fromEntries(Object.entries(old?.installation?.classifications?.adaptations || {}).filter(([name]) => Object.hasOwn(release.files, name) && !protectedPath(name)));
  const preserve = Object.keys(release.files).filter(name => protectedPath(name) || old?.overrides?.includes(name) && !Object.hasOwn(adaptations, name));
  const managed = Object.keys(release.files).filter(name => !preserve.includes(name) && !Object.hasOwn(adaptations, name));
  const removedAssets = Object.fromEntries([...new Set([...Object.keys(old?.files || {}), ...(old?.overrides || [])])].filter(name => !protectedPath(name) && !Object.hasOwn(release.files, name)).map(name => [name, null]));
  const removed = [...new Set([...Object.keys(removedAssets), ...Object.keys(definitions).filter(name => !Object.hasOwn(release.files, name))])];
  const referenceInventory = Object.entries(reviewedFiles).filter(([name, value]) => value && /^docs\/(?:architecture|decisions)\/.*\.md$/.test(name)).flatMap(([name]) => removed.filter(target => references(name, read(root, name).toString(), target)).map(target => ({ path: name, target, kind: /^docs\/decisions\/\d{5}-/.test(name) ? 'accepted-history' : 'active', disposition: null, replacement: null, supersession: null, rationale: '' })));
  return {
    schemaVersion: 1, version, operation: old ? old.version === version ? 'reconcile' : 'upgrade' : 'init', from: old?.version || null,
    archiveSha256: digest(archive), releaseFiles: release.files, releaseModes: release.modes || {}, reviewedFiles, reviewedModes, priorReleaseFingerprint: old?.releaseHash || null,
    governance: { resolution: null, rationale: '', paths: Object.keys(reviewedFiles).filter(name => name.startsWith('docs/architecture/') || name.startsWith('docs/decisions/')), baselineRequired: ['docs/decisions/index.md', 'docs/architecture/governance.md'].filter(name => !read(root, name)), replacements: {} },
    restrictions: { resolution: null, items: [] },
    decisions: [], devcontainer: 'adopt', guidance: [],
    classifications: { managed, preserve, adaptations }, removedAssets, references: referenceInventory,
    definitions,
  };
};

export const installReviewed = (root, archive, version, review, { sha256, dryRun = false, io, reviewPath, legacyBackup } = {}) => {
  const expected = reviewInstallation(root, archive, version, { sha256, reviewPath });
  const fail = message => { throw new Error(`installation review blocked: ${message}`); };
  if (!object(review) || review.schemaVersion !== 1 || review.version !== version || review.from !== expected.from || review.operation !== expected.operation) fail('version or operation mismatch');
  for (const source of [...(Array.isArray(review.guidance) ? review.guidance : []), ...Object.values(review.classifications?.adaptations || {}), ...(Array.isArray(review.decisions) ? review.decisions.map(decision => decision?.source) : []), ...Object.values(review.governance?.replacements || {})]) assertReviewSource(source);
  if (review.archiveSha256 !== expected.archiveSha256 || JSON.stringify(review.releaseFiles) !== JSON.stringify(expected.releaseFiles)) fail('release digest mismatch');
  if (review.priorReleaseFingerprint !== expected.priorReleaseFingerprint) fail('prior release fingerprint mismatch');
  if (JSON.stringify(review.releaseModes) !== JSON.stringify(expected.releaseModes)) fail('release mode evidence mismatch');
  if (!object(review.reviewedFiles)) fail('reviewed file digests required');
  review = { ...review, reviewedFiles: { ...review.reviewedFiles }, reviewedModes: { ...review.reviewedModes } };
  for (const name of Object.keys(review.reviewedFiles)) if (ignoredReviewPath(name) && !Object.hasOwn(expected.reviewedFiles, name)) { delete review.reviewedFiles[name]; delete review.reviewedModes[name]; }
  if (reviewPath) {
    review = { ...review, reviewedFiles: { ...review.reviewedFiles } };
    delete review.reviewedFiles[path.relative(path.resolve(root), path.resolve(reviewPath)).split(path.sep).join('/')];
    review.reviewedModes = { ...review.reviewedModes };
    delete review.reviewedModes[path.relative(path.resolve(root), path.resolve(reviewPath)).split(path.sep).join('/')];
  }
  for (const [name, value] of Object.entries(expected.reviewedFiles)) if (review.reviewedFiles[name] !== value) fail(`stale or missing reviewed digest: ${name}`);
  for (const [name, value] of Object.entries(expected.reviewedModes)) if (review.reviewedModes?.[name] !== value) fail(`stale or missing reviewed mode: ${name}`);
  for (const [name, value] of Object.entries(review.reviewedFiles)) if ((read(root, name) ? digest(read(root, name)) : null) !== value) fail(`stale reviewed digest: ${name}`);
  if (!['retain', 'reconcile'].includes(review.governance?.resolution) || !review.governance.rationale?.trim() || !Array.isArray(review.governance.paths)) fail('explicit governance resolution and rationale required');
  for (const name of expected.governance.paths) if (!review.governance.paths.includes(name)) fail(`governance review missing: ${name}`);
  if (review.restrictions?.resolution !== 'compatible' || !Array.isArray(review.restrictions.items) || review.restrictions.items.some(item => !object(item) || !item.restriction?.trim() || item.resolution !== 'compatible' || !item.rationale?.trim())) fail('unresolved project restrictions');
  if (!['adopt', 'retain'].includes(review.devcontainer)) fail('devcontainer must be adopt or retain');
  const classes = review.classifications;
  if (!object(classes) || !Array.isArray(classes.managed) || !Array.isArray(classes.preserve) || !object(classes.adaptations)) fail('explicit release classifications required');
  const classified = [...classes.managed, ...classes.preserve, ...Object.keys(classes.adaptations)];
  for (const name of Object.keys(expected.releaseFiles)) if (classified.filter(item => item === name).length !== 1) fail(`release asset must have exactly one classification: ${name}`);
  for (const name of classified) if (!Object.hasOwn(expected.releaseFiles, name)) fail(`classification is not a release asset: ${name}`);
  if (!object(review.removedAssets) || Object.keys(review.removedAssets).length !== Object.keys(expected.removedAssets).length) fail('removed assets require explicit preserve or retire classifications');
  for (const name of Object.keys(expected.removedAssets)) {
    if (!['preserve', 'retire'].includes(review.removedAssets[name])) fail(`removed asset requires preserve or retire: ${name}`);
    if (review.removedAssets[name] === 'preserve' && !read(root, name)) fail(`preserved removed asset must exist: ${name}`);
  }
  for (const name of Object.keys(expected.releaseFiles)) {
    if (protectedPath(name) && !classes.preserve.includes(name)) fail(`project-owned asset must be preserved: ${name}`);
    if (name.startsWith('.devcontainer/') && (review.devcontainer === 'retain' ? !classes.preserve.includes(name) : classes.preserve.includes(name))) fail(`devcontainer choice conflicts with classification: ${name}`);
  }
  const checkedRead = name => {
    assertReviewSource(name);
    const data = read(root, name);
    if (!data || review.reviewedFiles[name] !== digest(data)) fail(`source must exist with a reviewed digest: ${name}`);
    return data;
  };
  for (const name of classes.preserve) if (!protectedPath(name) && !name.startsWith('.devcontainer/') && !read(root, name)) fail(`override does not exist: ${name}`);
  const adaptations = {};
  const adaptationModes = {};
  for (const [target, source] of Object.entries(classes.adaptations)) { adaptations[target] = checkedRead(source); adaptationModes[target] = fs.statSync(localPath(root, source)).mode & 0o777; }
  if (!Array.isArray(review.guidance) || !review.guidance.length) fail('project guidance paths required');
  for (const name of review.guidance) checkedRead(name);
  if (!Array.isArray(review.decisions) || !review.decisions.length) fail('explicit reviewed draft adoption or migration decision required');
  const writes = {};
  const selected = [];
  const targets = new Set();
  for (const decision of review.decisions) {
    if (!object(decision) || typeof decision.target !== 'string' || targets.has(decision.target)) fail('decisions must have unique draft targets or explicit existing accepted registry links');
    targets.add(decision.target);
    const data = checkedRead(decision.source);
    const text = data.toString();
    const parsed = frontmatter(text);
    if (!text.includes(version) || (expected.from && !text.includes(expected.from))) fail('decision must identify exact release versions');
    if (/^docs\/decisions\/\d{5}[^/]*\.md$/.test(decision.target) && decision.source === decision.target && decision.existingAccepted === true) {
      if (!/^status:\s*["']?accepted["']?\s*$/m.test(text)) fail('existing accepted decision must already be accepted');
      const id = path.basename(decision.target).slice(0, 5);
      const index = checkedRead('docs/decisions/index.md').toString();
      const governance = checkedRead('docs/architecture/governance.md').toString();
      if (!new RegExp(`\\|\\s*${id}\\s*\\|`).test(index) || !governance.includes(path.basename(decision.target))) fail('existing accepted decision requires coherent index and governance links');
      selected.push({ ...decision, identity: recordIdentity(text), data: parsed });
      continue;
    }
    if (!/^docs\/decision-drafts\/[a-zA-Z0-9._-]+\.md$/.test(decision.target) || path.basename(decision.target) === 'README.md') fail('decisions must have unique direct-child draft targets or explicit existing accepted registry links');
    if (!/^status:\s*["']?draft["']?\s*$/m.test(text)) fail('new decision must be draft');
    if (!validator('./decisions.mjs').validSummary(text)) fail('draft requires meaningful top-level # AI Summary prose');
    const effective = /^# Effective Architecture\r?\n\n([\s\S]*?)(?=\n# |$(?![\s\S]))/m.exec(text)?.[1]?.trim();
    if (!effective || /\b(?:TODO|TBD)\b/i.test(effective)) fail('draft requires reviewed # Effective Architecture prose');
    const existing = read(root, decision.target);
    if (existing && !existing.equals(data)) fail(`decision target already exists: ${decision.target}`);
    writes[decision.target] = data;
    selected.push({ ...decision, identity: recordIdentity(text), data: parsed });
  }
  if (!object(review.governance.replacements)) fail('governance replacement mapping required');
  if (Object.keys(review.governance.replacements).length && review.governance.resolution !== 'reconcile') fail('governance replacements require explicit reconcile resolution');
  for (const [target, source] of Object.entries(review.governance.replacements)) {
    if (!/^docs\/architecture\/[a-z][a-z0-9-]*\.md$/.test(target) && target !== 'docs/decisions/index.md') fail(`only active compactions and the registry may be replaced: ${target}`);
    writes[target] = checkedRead(source);
  }
  for (const name of expected.governance.baselineRequired) if (!writes[name]) fail(`first installation requires a reviewed governance baseline via governance.replacements: ${name}`);
  if (expected.governance.baselineRequired.includes('docs/decisions/index.md')) {
    const index = writes['docs/decisions/index.md'].toString();
    if (!/\|---\|---\|---\|/.test(index) || index.indexOf('\n\n', index.indexOf('|---')) < 0) fail('reviewed baseline requires a promotable decisions index table');
  }
  if (!Array.isArray(review.references) || review.references.length !== expected.references.length) fail('reference inventory requires explicit dispositions');
  for (const reference of expected.references) {
    const choices = review.references.filter(item => item.path === reference.path && item.target === reference.target && item.kind === reference.kind);
    if (choices.length !== 1 || !choices[0].rationale?.trim()) fail(`unresolved governance reference: ${reference.path} -> ${reference.target}`);
    const choice = choices[0];
    if (review.removedAssets[reference.target] === 'preserve') {
      if (choice.disposition !== 'preserved' || !read(root, reference.target)) fail(`preserved reference must resolve: ${reference.target}`);
      continue;
    }
    const supersession = selected.find(decision => decision.target === choice.supersession);
    if (!supersession) fail(`reviewed supersession decision required: ${reference.path}`);
    if (reference.kind === 'accepted-history') {
      const original = frontmatter(checkedRead(reference.path).toString());
      if (choice.disposition !== 'historical' || !Array.isArray(supersession.data.supersedes) || !supersession.data.supersedes.includes(original.id)) fail(`historical accepted reference requires explicit supersession: ${reference.path}`);
    } else {
      if (choice.disposition !== 'replace' || choice.replacement !== review.governance.replacements[reference.path] || !writes[reference.path]) fail(`active reference requires reviewed replacement: ${reference.path}`);
      if (references(reference.path, writes[reference.path].toString(), reference.target)) fail(`replacement still references retired asset: ${reference.path}`);
    }
    const active = Object.keys(writes).filter(name => name.startsWith('docs/architecture/'));
    if (!active.some(name => references(name, writes[name].toString(), supersession.target))) fail(`active compaction must link reviewed supersession: ${supersession.target}`);
  }
  const removed = [...new Set([...Object.keys(review.removedAssets).filter(name => review.removedAssets[name] === 'retire'), ...Object.keys(expected.definitions).filter(name => !Object.hasOwn(expected.releaseFiles, name))])];
  const activePaths = [...new Set([...Object.keys(expected.reviewedFiles).filter(name => name.startsWith('docs/architecture/') && name.endsWith('.md')), ...Object.keys(writes).filter(name => name.startsWith('docs/architecture/')), 'docs/decisions/index.md'])];
  for (const name of activePaths) {
    const data = writes[name] || read(root, name);
    if (data) for (const target of removed) if (references(name, data.toString(), target)) fail(`active governance still references retired asset: ${name} -> ${target}`);
  }
  const state = validateState(root, writes);
  if (state.errors.length) fail(`ADR validation failed: ${state.errors.join('; ')}`);
  for (const decision of selected) if (![...state.accepted, ...state.drafts].some(record => record.file === decision.target)) fail(`decision not registered as a valid ADR: ${decision.target}`);
  if (!object(review.definitions) || Object.keys(review.definitions).length !== Object.keys(expected.definitions).length) fail('definition inventory mismatch');
  for (const name of Object.keys(expected.definitions)) if (!['retain', 'retire'].includes(review.definitions[name])) fail(`definition decision required: ${name}`);
  for (const name of Object.keys(expected.definitions)) if (classes.preserve.includes(name) || review.removedAssets[name] === 'preserve') fail(`active legacy definition cannot be preserved; retain its archive instead: ${name}`);
  const evidence = { ...review, decisions: selected.map(({ data, ...decision }) => decision), verification: 'not-run' };
  const preserve = [...classes.preserve, ...Object.keys(review.removedAssets).filter(name => review.removedAssets[name] === 'preserve')];
  const retire = Object.keys(review.removedAssets).filter(name => review.removedAssets[name] === 'retire');
  return install(root, archive, version, { dryRun, io, legacyBackup, reconcile: expected.operation === 'reconcile', definitionDecisions: review.definitions, reviewedMigration: { reviewedFiles: review.reviewedFiles, reviewedModes: review.reviewedModes, preserve, retire, adaptations, adaptationModes, writes, evidence } });
};
