import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { git, json, listFiles } from './shared.mjs';
import { packages, packageForFile } from './workspace.mjs';

const match = (pattern, file) => {
  const escaped = pattern.split(/(\*\*|\*)/).map(part => part === '**' ? '.*' : part === '*' ? '[^/]*' : part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('');
  return new RegExp(`^${escaped}$`).test(file);
};

export const graph = root => {
  const errors = [];
  const data = json(root, 'docs/implementation-graph.json');
  const pkgs = packages(root);
  if (data.version !== 1 || !data.units || typeof data.units !== 'object' || !Array.isArray(data.relationships)) throw new Error('invalid graph root');
  const units = new Map();
  const visit = (items, parent = null) => {
    for (const [key, unit] of Object.entries(items)) {
      const id = parent ? `${parent}.${key}` : key;
      if (!/^[a-z][a-z0-9-]*$/.test(key) || !unit || typeof unit !== 'object' || units.has(id)) errors.push(`invalid unit ${id}`);
      else {
        units.set(id, { ...unit, id, parent });
        if (unit.files && (!Array.isArray(unit.files) || unit.files.some(file => typeof file !== 'string' || !fs.existsSync(path.join(root, file))))) errors.push(`${id}: missing files`);
        if (unit.globs && (!Array.isArray(unit.globs) || unit.globs.some(glob => typeof glob !== 'string'))) errors.push(`${id}: invalid globs`);
        if (unit.tests && (!Array.isArray(unit.tests) || unit.tests.some(test => typeof test !== 'string'))) errors.push(`${id}: invalid tests`);
        if (unit.package && !pkgs.some(pkg => pkg.manifest.name === unit.package)) errors.push(`${id}: unknown package`);
        if (unit.children) visit(unit.children, id);
      }
    }
  };
  visit(data.units);
  const dependencies = new Map([...units.keys()].map(id => [id, new Set()]));
  for (const edge of data.relationships) {
    if (!units.has(edge.from) || !units.has(edge.to)) errors.push(`dangling relationship ${edge.from} -> ${edge.to}`);
    else if (!['dependsOn', 'loads', 'contains'].includes(edge.type)) errors.push(`invalid relationship type ${edge.type}`);
    else if (edge.type === 'contains' && units.get(edge.to).parent !== edge.from) errors.push(`invalid contains ${edge.from} -> ${edge.to}`);
    else if (edge.type !== 'contains') dependencies.get(edge.from).add(edge.to);
  }
  const seen = new Set();
  const active = new Set();
  const check = id => {
    if (active.has(id)) { errors.push(`dependency cycle at ${id}`); return; }
    if (seen.has(id)) return;
    active.add(id);
    for (const dep of dependencies.get(id)) check(dep);
    active.delete(id);
    seen.add(id);
  };
  for (const id of units.keys()) check(id);
  const ownership = new Map();
  for (const file of listFiles(root)) {
    const owners = [...units.values()].filter(unit => unit.files?.includes(file) || unit.globs?.some(glob => match(glob, file)));
    if (owners.length > 1) errors.push(`${file}: ambiguous ownership ${owners.map(owner => owner.id).join(', ')}`);
    if (owners.length) ownership.set(file, owners[0].id);
  }
  return { errors, units, dependencies, ownership, pkgs };
};

export const impact = (root, base, { includeWorktree = true } = {}) => {
  const state = graph(root);
  if (state.errors.length) throw new Error(state.errors.join('\n'));
  const changed = new Set(git(root, 'diff', '--no-renames', '--name-only', `${base}...HEAD`).split('\n').filter(Boolean));
  if (includeWorktree) {
    const status = execFileSync('git', ['status', '--porcelain', '-z', '-uall'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
    for (let i = 0; i < status.length; i++) {
      const entry = status[i];
      changed.add(entry.slice(3));
      if (entry[0] === 'R' || entry[1] === 'R' || entry[0] === 'C' || entry[1] === 'C') changed.add(status[++i]);
    }
  }
  let historical;
  try { historical = JSON.parse(git(root, 'show', `${base}:docs/implementation-graph.json`)); } catch { historical = null; }
  const historicalOwners = new Map();
  const visit = (items, prefix = '') => {
    for (const [key, unit] of Object.entries(items)) {
      const id = prefix ? `${prefix}.${key}` : key;
      for (const file of changed) if (unit.files?.includes(file) || unit.globs?.some(glob => match(glob, file))) historicalOwners.set(file, id);
      if (unit.children) visit(unit.children, id);
    }
  };
  if (historical?.units) visit(historical.units);
  const owner = file => state.ownership.get(file) || (state.units.has(historicalOwners.get(file)) ? historicalOwners.get(file) : null);
  const seeds = new Set([...changed].map(owner).filter(Boolean));
  const impacted = new Set(seeds);
  const expanded = new Set(seeds);
  let updated = true;
  while (updated) {
    updated = false;
    for (const id of state.units.keys()) if (!impacted.has(id) && [...expanded].some(parent => id.startsWith(`${parent}.`))) { impacted.add(id); updated = true; }
    for (const id of state.units.keys()) if (!impacted.has(id) && [...state.dependencies.get(id)].some(dep => impacted.has(dep))) { impacted.add(id); expanded.add(id); updated = true; }
    for (const id of [...impacted]) {
      const parent = state.units.get(id).parent;
      if (parent && !impacted.has(parent)) { impacted.add(parent); updated = true; }
    }
  }
  const affectedPackages = new Set([...changed].map(file => packageForFile(state.pkgs, file)?.manifest.name).filter(Boolean));
  for (const id of impacted) if (state.units.get(id).package) affectedPackages.add(state.units.get(id).package);
  updated = true;
  while (updated) {
    updated = false;
    for (const pkg of state.pkgs) if (!affectedPackages.has(pkg.manifest.name) && pkg.dependencies.some(dep => affectedPackages.has(dep))) { affectedPackages.add(pkg.manifest.name); updated = true; }
  }
  const unowned = [...changed].filter(file => !owner(file));
  return { changed: [...changed].sort(), units: [...impacted].sort(), packages: [...affectedPackages].sort(), tests: [...impacted].flatMap(id => state.units.get(id).tests || []), unowned, advisory: 'Semantic completeness and scope deviations require human review.' };
};
