import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, test } from 'node:test';
import { comments, evaluate } from './architecture.mjs';
import { decisions, promote } from './decisions.mjs';
import { graph, impact } from './graph.mjs';

const roots = [];
afterEach(() => { for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true }); });
const fixture = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cinderling-'));
  roots.push(root);
  return root;
};
const put = (root, file, text) => {
  const target = path.join(root, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, text);
};
const record = (id, status, title = 'Example') => `---\nid: "${id}"\ntitle: "${title}"\ncategory: governance\ntype: architecture\nstatus: ${status}\ndate: 2026-10-20\ntags: [governance]\ndependsOn: []\nsupersedes: []\nrelated: []\n---\n\n# Decision\n\nExample rule.\n\n# Effective Architecture\n\nReviewed rule.\n\n# Provenance\n\nAuthor: Tester\n`;
const decisionFixture = () => {
  const root = fixture();
  put(root, 'docs/decisions/00000-example.md', record('00000', 'accepted'));
  put(root, 'docs/decisions/index.md', '# Accepted decisions\n\n| ID | Title | Category |\n|---|---|---|\n| 00000 | Example | governance |\n\nEnd.\n');
  put(root, 'docs/architecture/governance.md', '# governance\n\nSources: 00000\n');
  return root;
};
const graphFixture = () => {
  const root = fixture();
  put(root, 'package.json', JSON.stringify({ name: 'root', scripts: { build: 'true', test: 'true', lint: 'true' } }));
  put(root, 'pnpm-workspace.yaml', 'packages:\n  - "libs/*"\n');
  put(root, 'libs/a/package.json', JSON.stringify({ name: 'a', scripts: { build: 'true', test: 'true', lint: 'true' } }));
  put(root, 'libs/b/package.json', JSON.stringify({ name: 'b', dependencies: { a: '*' }, scripts: { build: 'true', test: 'true', lint: 'true' } }));
  put(root, 'libs/a/src.mjs', 'export const a = 1;\n');
  put(root, 'libs/b/src.mjs', 'export const b = 1;\n');
  put(root, 'docs/implementation-graph.json', JSON.stringify({ version: 1, units: { a: { package: 'a', files: ['libs/a/src.mjs'] }, b: { package: 'b', files: ['libs/b/src.mjs'], tests: ['pnpm --filter b test'] } }, relationships: [{ from: 'b', to: 'a', type: 'dependsOn' }] }));
  return root;
};

test('TypeScript scanner distinguishes comments from string and regexp literals', () => {
  assert.deepEqual(comments(String.raw`const url = "https://example.org"; const re = /\/\//;`), []);
  assert.deepEqual(comments('const x = [ /[//]/ ];'), []);
  assert.equal(comments('const a = 1; /* documentation */').length, 1);
  assert.equal(comments('/** doc */\nconst a = 1;').length, 1);
  assert.deepEqual(comments('const value = <p>// literal text</p>;', true), []);
  assert.equal(comments('const value = <p>// literal text</p>; // real comment', true).length, 1);
});

test('promotion requires reviewed prose and changes record, index, and compaction', () => {
  const root = decisionFixture();
  put(root, 'docs/decision-drafts/example.md', record('DRAFT', 'draft', 'New rule').replace('# Decision', '# AI Summary\n\nRequire the reviewed rules through explicit decision promotion.\n\n# Decision').replace('Reviewed rule.', 'First rule.\n\nSecond rule.'));
  execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: root });
  execFileSync('git', ['add', 'docs/decisions/00000-example.md'], { cwd: root });
  execFileSync('git', ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-qm', 'fixture'], { cwd: root });
  assert.throws(() => promote(root, 'docs/decision-drafts/example.md', { reviewed: false }), /review/);
  const target = promote(root, 'docs/decision-drafts/example.md', { reviewed: true });
  assert.equal(path.basename(target), '00001-new-rule.md');
  assert.match(fs.readFileSync(target, 'utf8'), /status: accepted/);
  assert.match(fs.readFileSync(path.join(root, 'docs/architecture/governance.md'), 'utf8'), /First rule.\n\nSecond rule./);
  assert.deepEqual(decisions(root, { immutable: false }).errors, []);
  assert.equal(fs.existsSync(path.join(root, 'docs/decision-drafts/example.md')), false);
});

test('decision validation rejects missing metadata, references, duplicate IDs and missing compaction', () => {
  const root = decisionFixture();
  put(root, 'docs/decisions/00000-other.md', record('00000', 'accepted', 'Other'));
  put(root, 'docs/decision-drafts/broken.md', record('DRAFT', 'draft').replace('related: []', 'related: ["99999"]').replace('tags: [governance]\n', ''));
  fs.rmSync(path.join(root, 'docs/architecture/governance.md'));
  assert.match(decisions(root, { immutable: false }).errors.join('\n'), /duplicate ID/);
  assert.match(decisions(root, { immutable: false }).errors.join('\n'), /invalid related 99999/);
  assert.match(decisions(root, { immutable: false }).errors.join('\n'), /missing tags/);
  assert.match(decisions(root, { immutable: false }).errors.join('\n'), /compaction missing/);
});

test('graph rejects ambiguous ownership, missing files, dangling refs and dependency cycles', () => {
  const root = graphFixture();
  const file = path.join(root, 'docs/implementation-graph.json');
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  data.units.b.files.push('libs/a/src.mjs', 'missing.mjs');
  data.relationships.push({ from: 'a', to: 'b', type: 'dependsOn' }, { from: 'missing', to: 'b', type: 'loads' });
  fs.writeFileSync(file, JSON.stringify(data));
  const errors = graph(root).errors.join('\n');
  for (const expected of ['ambiguous ownership', 'missing files', 'dangling relationship', 'dependency cycle']) assert.match(errors, new RegExp(expected));
});

test('impact traverses reverse semantic and package dependencies from a Git diff', () => {
  const root = graphFixture();
  execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: root });
  execFileSync('git', ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'add', '.'], { cwd: root });
  execFileSync('git', ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-qm', 'fixture'], { cwd: root });
  put(root, 'libs/a/src.mjs', 'export const a = 2;\n');
  const result = impact(root, 'main');
  assert.deepEqual(result.units, ['a', 'b']);
  assert.deepEqual(result.packages, ['a', 'b']);
  assert.deepEqual(result.tests, ['pnpm --filter b test']);
});

test('evaluation reports invalid Gherkin and source comments', () => {
  const root = graphFixture();
  put(root, 'example.feature', 'Feature: Incomplete\n  Scenario: bad\n    Given step\n  @tag\n');
  put(root, 'libs/a/src.mjs', 'export const a = 1; // comment\n');
  const failures = evaluate(root).join('\n');
  assert.match(failures, /implementation comment/);
  assert.match(failures, /invalid Gherkin/);
});

test('accepted records are immutable and new commits require a trigger', () => {
  const root = decisionFixture();
  execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: root });
  execFileSync('git', ['add', '.'], { cwd: root });
  execFileSync('git', ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-qm', 'baseline'], { cwd: root });
  execFileSync('git', ['switch', '-q', '-c', 'feature'], { cwd: root });
  put(root, 'docs/decisions/00000-example.md', record('00000', 'accepted').replace('Example rule.', 'Changed rule.'));
  assert.match(decisions(root).errors.join('\n'), /accepted decision changed/);
  execFileSync('git', ['add', '.'], { cwd: root });
  execFileSync('git', ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-qm', 'no trailer'], { cwd: root });
  assert.match(decisions(root).errors.join('\n'), /Phoenix-Trigger/);
});

test('accepted record deletion cannot be disguised by updating the index', () => {
  const root = decisionFixture();
  execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: root });
  execFileSync('git', ['add', '.'], { cwd: root });
  execFileSync('git', ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-qm', 'baseline'], { cwd: root });
  execFileSync('git', ['switch', '-q', '-c', 'feature'], { cwd: root });
  fs.rmSync(path.join(root, 'docs/decisions/00000-example.md'));
  put(root, 'docs/decisions/index.md', '# Accepted decisions\n\n| ID | Title | Category |\n|---|---|---|\n');
  assert.match(decisions(root).errors.join('\n'), /accepted decision deleted/);
});

test('deleted files retain historical ownership and parent dependents are traversed', () => {
  const root = graphFixture();
  const file = path.join(root, 'docs/implementation-graph.json');
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  data.units.a = { package: 'a', children: { source: { files: ['libs/a/src.mjs'] } } };
  data.relationships = [{ from: 'b', to: 'a', type: 'dependsOn' }];
  fs.writeFileSync(file, JSON.stringify(data));
  execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: root });
  execFileSync('git', ['add', '.'], { cwd: root });
  execFileSync('git', ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-qm', 'fixture'], { cwd: root });
  fs.rmSync(path.join(root, 'libs/a/src.mjs'));
  delete data.units.a.children.source.files;
  fs.writeFileSync(file, JSON.stringify(data));
  const result = impact(root, 'main');
  assert.ok(result.units.includes('b'));
  assert.ok(result.units.includes('a.source'));
  assert.ok(!result.unowned.includes('libs/a/src.mjs'));
});

test('impact includes test children of a dependent parent unit', () => {
  const root = graphFixture();
  const file = path.join(root, 'docs/implementation-graph.json');
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  data.units.b = { package: 'b', children: { suite: { files: ['libs/b/src.mjs'], tests: ['pnpm --filter b test'] } } };
  fs.writeFileSync(file, JSON.stringify(data));
  execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: root });
  execFileSync('git', ['add', '.'], { cwd: root });
  execFileSync('git', ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-qm', 'fixture'], { cwd: root });
  put(root, 'libs/a/src.mjs', 'export const a = 2;\n');
  assert.ok(impact(root, 'main').tests.includes('pnpm --filter b test'));
});
