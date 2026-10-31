import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { Parser, AstBuilder, GherkinClassicTokenMatcher } from '@cucumber/gherkin';
import { IdGenerator } from '@cucumber/messages';
import { decisions } from './decisions.mjs';
import { graph } from './graph.mjs';
import { listFiles, read } from './shared.mjs';
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

export const evaluate = (root, { base = 'main' } = {}) => {
  const errors = [];
  const files = listFiles(root);
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
    for (const pkg of packages(root)) {
      for (const target of ['build', 'test', 'lint']) if (!pkg.manifest.scripts?.[target]) errors.push(`${pkg.dir}: missing ${target} script`);
      if (pkg.dir.startsWith('apps/') && !pkg.manifest.scripts?.dev) errors.push(`${pkg.dir}: missing dev script`);
      if (fs.existsSync(path.join(root, pkg.dir, 'project.json'))) errors.push(`${pkg.dir}: project.json forbidden`);
    }
  } catch (error) { errors.push(`workspace: ${error.message}`); }
  return errors;
};
