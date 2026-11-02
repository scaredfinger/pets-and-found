import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
export const ignoredDirectory = name => ['node_modules', '.git', '.nx', '.opencode-state', '.devcontainer-local'].includes(name);

export const listFiles = (root, dir = root) => {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    if (ignoredDirectory(entry.name)) return [];
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? listFiles(root, file) : [path.relative(root, file).split(path.sep).join('/')];
  });
};

export const read = (root, file) => fs.readFileSync(path.join(root, file), 'utf8');
export const json = (root, file) => JSON.parse(read(root, file));
export const git = (root, ...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
export const frontmatter = text => {
  const YAML = require('yaml');
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(text);
  if (!match) throw new Error('missing YAML frontmatter');
  const doc = YAML.parseDocument(match[1], { uniqueKeys: true });
  if (doc.errors.length) throw new Error(doc.errors.map(error => error.message).join('; '));
  return doc.toJS();
};
export const relative = (root, file) => path.relative(root, file).split(path.sep).join('/');
