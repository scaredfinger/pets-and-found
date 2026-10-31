import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { listFiles, json, read } from './shared.mjs';

export const packages = root => {
  const config = YAML.parse(read(root, 'pnpm-workspace.yaml'));
  if (!Array.isArray(config.packages)) throw new Error('invalid pnpm workspace');
  const dirs = new Set(['.']);
  const files = listFiles(root).filter(file => file.endsWith('/package.json'));
  for (const pattern of config.packages) {
    if (typeof pattern !== 'string' || !pattern.endsWith('/*')) throw new Error(`unsupported workspace pattern ${pattern}`);
    const prefix = pattern.slice(0, -2);
    for (const file of files) if (path.posix.dirname(path.posix.dirname(file)) === prefix) dirs.add(path.posix.dirname(file));
  }
  const found = [...dirs].map(dir => ({ dir, manifest: json(root, path.posix.join(dir, 'package.json')) }));
  const names = found.map(item => item.manifest.name);
  if (names.some(name => typeof name !== 'string') || new Set(names).size !== names.length) throw new Error('missing or duplicate package names');
  return found.map(item => ({ ...item, dependencies: Object.keys({ ...item.manifest.dependencies, ...item.manifest.devDependencies, ...item.manifest.peerDependencies }).filter(name => names.includes(name)) }));
};

export const packageForFile = (pkgs, file) => pkgs.filter(pkg => pkg.dir === '.' || file.startsWith(`${pkg.dir}/`)).sort((a, b) => b.dir.length - a.dir.length)[0];
