import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { Parser, AstBuilder, GherkinClassicTokenMatcher } from '@cucumber/gherkin';
import { IdGenerator } from '@cucumber/messages';
import { decisions } from './decisions.mjs';
import { graph } from './graph.mjs';
import { frontmatter, listFiles, read } from './shared.mjs';
import { packages } from './workspace.mjs';

export const comments = (text, jsx = false) => {
  const ast = ts.createSourceFile(jsx ? 'source.tsx' : 'source.ts', text, ts.ScriptTarget.Latest, true, jsx ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const chars = [...text];
  const mask = node => {
    if ([ts.SyntaxKind.JsxText, ts.SyntaxKind.JsxTextAllWhiteSpaces, ts.SyntaxKind.RegularExpressionLiteral].includes(node.kind)) for (let i = node.pos; i < node.end; i++) if (chars[i] !== '\n') chars[i] = ' ';
    ts.forEachChild(node, mask);
  };
  mask(ast);
  text = chars.join('');
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, false, ts.LanguageVariant.Standard, text);
  const found = [];
  for (let token = scanner.scan(); token !== ts.SyntaxKind.EndOfFileToken; token = scanner.scan()) {
    if (token === ts.SyntaxKind.SingleLineCommentTrivia || token === ts.SyntaxKind.MultiLineCommentTrivia) found.push(scanner.getTokenPos());
  }
  return found;
};

export const sourcePolicy = (root, files) => {
  const policyPath = path.join(root, 'cinderling-source-policy.json');
  if (!fs.existsSync(policyPath)) return [];
  const errors = [];
  let policy;
  try { policy = JSON.parse(fs.readFileSync(policyPath, 'utf8')); } catch { return ['cinderling-source-policy.json: invalid JSON']; }
  if (policy.version !== 1 || !Array.isArray(policy.javascriptExceptions)) return ['cinderling-source-policy.json: invalid policy'];
  const allowed = new Set();
  for (const entry of policy.javascriptExceptions) {
    if (!entry || typeof entry.file !== 'string' || !/^(?:src|apps|libs)\/[a-zA-Z0-9_./-]+\.(?:[cm]?js|jsx)$/.test(entry.file) || entry.file.split('/').includes('..') || typeof entry.decision !== 'string' || !/^docs\/(?:decisions|decision-drafts)\/[a-zA-Z0-9_-]+\.md$/.test(entry.decision) || typeof entry.rationale !== 'string' || !entry.rationale.trim()) { errors.push('cinderling-source-policy.json: invalid JavaScript exception'); continue; }
    try {
      const record = frontmatter(read(root, entry.decision));
      if (!['draft', 'accepted'].includes(record.status) || !fs.existsSync(path.join(root, entry.file)) || allowed.has(entry.file)) throw new Error('invalid exception');
      allowed.add(entry.file);
    } catch { errors.push(`cinderling-source-policy.json: invalid exception for ${entry.file}`); }
  }
  for (const file of files) if (/^(?:src|apps|libs)\/.*\.(?:[cm]?js|jsx)$/.test(file) && !/(?:^|\/)[^/]+\.config\.[cm]?js$/.test(file) && !allowed.has(file)) errors.push(`${file}: consumer application and library source must use TypeScript`);
  return errors;
};

export const workspacePolicy = (pkgs, model) => {
  const errors = [];
  if (!Object.hasOwn(model, 'workspacePolicyVersion')) return errors;
  if (model.workspacePolicyVersion !== 1) return ['graph: unsupported workspacePolicyVersion'];
  const applications = model.applications ?? {};
  if (!applications || Array.isArray(applications) || typeof applications !== 'object') return ['graph: invalid application classifications'];
  const apps = pkgs.filter(pkg => pkg.dir.startsWith('apps/'));
  const libs = pkgs.filter(pkg => pkg.dir.startsWith('libs/'));
  if (libs.length && (typeof model.libraryScope !== 'string' || !/^@[a-z0-9][a-z0-9._-]*$/.test(model.libraryScope))) errors.push('graph: missing or invalid libraryScope');
  for (const [name, type] of Object.entries(applications)) {
    if (!apps.some(pkg => pkg.manifest.name === name)) errors.push(`graph: unknown application ${name}`);
    if (typeof type !== 'string' || !/^[a-z][a-z0-9-]*$/.test(type)) errors.push(`graph: invalid application type for ${name}`);
  }
  for (const pkg of pkgs) {
    const name = pkg.manifest.name;
    if (pkg.dir === '.') continue;
    for (const script of Object.keys(pkg.manifest.scripts ?? {})) if (/^(?:build|test|lint|dev|e2e|start):/.test(script)) errors.push(`${pkg.dir}: unsupported target variant ${script}`);
    for (const target of ['build', 'test', 'lint', 'dev', 'e2e', 'start']) if (/(?:^|[\s;&|])(?:pnpm\s+(?:exec\s+)?|npx\s+)?nx(?:\s|$)/.test(pkg.manifest.scripts?.[target] ?? '')) errors.push(`${pkg.dir}: ${target} script invokes nx`);
    if (pkg.dir.startsWith('libs/') && (!model.libraryScope || !name.startsWith(`${model.libraryScope}/`))) errors.push(`${pkg.dir}: library name must use project scope`);
    if (pkg.dir.startsWith('apps/')) {
      if (name.startsWith('@')) errors.push(`${pkg.dir}: application name must be unscoped`);
      if (!Object.hasOwn(applications, name)) errors.push(`${pkg.dir}: missing application classification`);
      for (const target of ['dev', 'e2e', ...(applications[name] === 'web' ? ['start'] : [])]) if (!pkg.manifest.scripts?.[target]) errors.push(`${pkg.dir}: missing ${target} script`);
    }
  }
  return errors;
};

export const evaluate = (root, { base = 'main' } = {}) => {
  const errors = [];
  const files = listFiles(root);
  errors.push(...sourcePolicy(root, files));
  for (const file of files) {
    if (/\.(?:[cm]?[jt]sx?)$/.test(file) && !file.endsWith('.json')) {
      const found = comments(read(root, file), /\.[cm]?[jt]sx$/.test(file));
      if (found.length) errors.push(`${file}: ${found.length} implementation comment(s)`);
    }
    if (file.endsWith('.feature')) {
      try { new Parser(new AstBuilder(IdGenerator.incrementing()), new GherkinClassicTokenMatcher()).parse(read(root, file)); }
      catch (error) { errors.push(`${file}: invalid Gherkin: ${error.message}`); }
    }
    if (file.startsWith('.devcontainer/') && file.endsWith('.sh')) {
      const lines = read(root, file).split('\n');
      for (let i = 0; i < lines.length; i++) if (/^\s*#/.test(lines[i]) && !(i === 0 && lines[i].startsWith('#!'))) errors.push(`${file}:${i + 1}: shell comment`);
    }
  }
  try { errors.push(...decisions(root, { base }).errors); } catch (error) { errors.push(`decisions: ${error.message}`); }
  try { errors.push(...graph(root).errors); } catch (error) { errors.push(`graph: ${error.message}`); }
  try {
    const pkgs = packages(root);
    const model = JSON.parse(read(root, 'docs/implementation-graph.json'));
    errors.push(...workspacePolicy(pkgs, model));
    for (const pkg of pkgs) {
      for (const target of ['build', 'test', 'lint']) if (!pkg.manifest.scripts?.[target]) errors.push(`${pkg.dir}: missing ${target} script`);
      if (model.workspacePolicyVersion !== 1 && pkg.dir.startsWith('apps/') && !pkg.manifest.scripts?.dev) errors.push(`${pkg.dir}: missing dev script`);
      if (fs.existsSync(path.join(root, pkg.dir, 'project.json'))) errors.push(`${pkg.dir}: project.json forbidden`);
    }
  } catch (error) { errors.push(`workspace: ${error.message}`); }
  return errors;
};
