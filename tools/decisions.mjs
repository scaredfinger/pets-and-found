import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { frontmatter, git, listFiles, read } from './shared.mjs';

const keys = ['id', 'title', 'category', 'type', 'status', 'date', 'tags', 'dependsOn', 'supersedes', 'related'];
const slug = title => title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const decisions = (root, { base = 'main', immutable = true } = {}) => {
  const errors = [];
  if (immutable) {
    try { if (fs.existsSync(path.resolve(root, git(root, 'rev-parse', '--git-path', 'cinderling-promotion.json')))) errors.push('interrupted decision promotion; rerun promote to recover'); } catch { errors.push('cannot locate decision promotion journal'); }
  }
  const accepted = listFiles(root, path.join(root, 'docs/decisions')).filter(file => /^docs\/decisions\/\d{5}-.*\.md$/.test(file));
  const drafts = listFiles(root, path.join(root, 'docs/decision-drafts')).filter(file => file.endsWith('.md') && !file.endsWith('/README.md'));
  const records = [...accepted, ...drafts].map(file => {
    try {
      const text = read(root, file);
      const data = frontmatter(text);
      for (const key of keys) if (data[key] === undefined || data[key] === null) errors.push(`${file}: missing ${key}`);
      for (const key of ['tags', 'dependsOn', 'supersedes', 'related']) if (!Array.isArray(data[key]) || data[key].some(value => typeof value !== 'string')) errors.push(`${file}: ${key} must be a string array`);
      if (typeof data.title !== 'string' || !data.title.trim() || typeof data.category !== 'string' || !/^[a-z][a-z0-9-]*$/.test(data.category)) errors.push(`${file}: invalid title or category`);
      if (typeof data.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) errors.push(`${file}: invalid date`);
      if (data.type !== 'architecture') errors.push(`${file}: invalid type`);
      if (!text.includes('# Decision') || !text.includes('# Provenance')) errors.push(`${file}: missing decision or provenance`);
      if (accepted.includes(file) && (data.status !== 'accepted' || data.id !== path.basename(file).slice(0, 5))) errors.push(`${file}: accepted ID/status mismatch`);
      if (drafts.includes(file) && (data.status !== 'draft' || data.id !== 'DRAFT')) errors.push(`${file}: draft ID/status mismatch`);
      return { file, text, data };
    } catch (error) { errors.push(`${file}: ${error.message}`); return null; }
  }).filter(Boolean);
  const ids = new Set();
  for (const record of records.filter(item => accepted.includes(item.file))) {
    if (ids.has(record.data.id)) errors.push(`${record.file}: duplicate ID`);
    ids.add(record.data.id);
  }
  for (const record of records) for (const key of ['dependsOn', 'supersedes', 'related']) {
    if (Array.isArray(record.data[key])) for (const id of record.data[key]) if (!ids.has(id) || id === record.data.id) errors.push(`${record.file}: invalid ${key} ${id}`);
  }
  const index = fs.existsSync(path.join(root, 'docs/decisions/index.md')) ? read(root, 'docs/decisions/index.md') : '';
  const entries = [...index.matchAll(/^\| (\d{5}) \| ([^|]+) \| ([^|]+) \|$/gm)];
  if (entries.length !== accepted.length || new Set(entries.map(entry => entry[1])).size !== entries.length) errors.push('docs/decisions/index.md: unexpected or duplicate entries');
  for (const record of records.filter(item => accepted.includes(item.file))) {
    if (!index.includes(`| ${record.data.id} | ${record.data.title} | ${record.data.category} |`)) errors.push(`${record.file}: index entry missing`);
    const compaction = `docs/architecture/${record.data.category}.md`;
    if (!fs.existsSync(path.join(root, compaction)) || !read(root, compaction).includes(record.data.id)) errors.push(`${record.file}: category compaction missing source ${record.data.id}`);
  }
  if (immutable) {
    try {
      const ancestor = git(root, 'merge-base', base, 'HEAD');
      const original = git(root, 'ls-tree', '-r', '--name-only', ancestor, 'docs/decisions').split('\n').filter(file => /^docs\/decisions\/\d{5}-.*\.md$/.test(file));
      for (const file of original) if (!accepted.includes(file)) errors.push(`${file}: accepted decision deleted or renamed from ${base}`);
      for (const file of accepted) {
        let previous;
        try { previous = execFileSync('git', ['show', `${ancestor}:${file}`], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); } catch { continue; }
        if (previous !== read(root, file)) errors.push(`${file}: accepted decision changed from ${base}`);
      }
      const messages = git(root, 'log', '--no-merges', '--format=%B%x00', `${ancestor}..HEAD`).split('\0').filter(Boolean);
      for (const message of messages) if ((message.match(/^Phoenix-Trigger: \S.*$/gm) || []).length !== 1) errors.push('commit requires exactly one Phoenix-Trigger trailer');
    } catch { errors.push(`cannot verify accepted decision immutability against ${base}`); }
  }
  return { errors, accepted: records.filter(item => accepted.includes(item.file)), drafts: records.filter(item => drafts.includes(item.file)) };
};

export const promote = (root, draftFile, { base = 'main', reviewed = false } = {}) => {
  if (!reviewed) throw new Error('explicit semantic conflict review required (--reviewed)');
  const journal = path.resolve(root, git(root, 'rev-parse', '--git-path', 'cinderling-promotion.json'));
  const recover = () => {
    if (!fs.existsSync(journal)) return;
    const saved = JSON.parse(fs.readFileSync(journal, 'utf8'));
    for (const [name, contents] of saved) contents === null ? fs.rmSync(name, { force: true }) : fs.writeFileSync(name, contents);
    fs.unlinkSync(journal);
  };
  recover();
  const file = path.resolve(root, draftFile);
  const draftDir = path.resolve(root, 'docs/decision-drafts');
  if (path.dirname(file) !== draftDir || !file.endsWith('.md')) throw new Error('draft must be a direct Markdown file in docs/decision-drafts');
  const state = decisions(root, { base });
  if (state.errors.length) throw new Error(state.errors.join('\n'));
  const draft = state.drafts.find(item => path.resolve(root, item.file) === file);
  if (!draft) throw new Error('draft not found');
  const compactionSection = /^# Effective Architecture\r?\n\n([\s\S]*?)(?=\n# |$(?![\s\S]))/m.exec(draft.text)?.[1]?.trim();
  if (!compactionSection || /\b(?:TODO|TBD)\b/i.test(compactionSection)) throw new Error('draft requires reviewed # Effective Architecture prose');
  const id = String(Math.max(-1, ...state.accepted.map(item => Number(item.data.id))) + 1).padStart(5, '0');
  if (id.length !== 5) throw new Error('decision ID space exhausted');
  const target = path.join(root, 'docs/decisions', `${id}-${slug(draft.data.title)}.md`);
  if (fs.existsSync(target)) throw new Error('decision file already exists');
  const compaction = path.join(root, 'docs/architecture', `${draft.data.category}.md`);
  const index = path.join(root, 'docs/decisions/index.md');
  const updated = draft.text.replace(/^id:.*$/m, `id: "${id}"`).replace(/^status:.*$/m, 'status: accepted');
  const indexText = fs.readFileSync(index, 'utf8');
  const line = `| ${id} | ${draft.data.title} | ${draft.data.category} |`;
  const insertion = indexText.indexOf('\n\n', indexText.indexOf('|---'));
  if (insertion < 0) throw new Error('decision index table not found');
  const compactionText = fs.existsSync(compaction) ? fs.readFileSync(compaction, 'utf8') : `# ${draft.data.category}\n\n`;
  const source = `\n## ${draft.data.title}\n\nSource: [${id}](../decisions/${path.basename(target)})\n\n${compactionSection}\n`;
  const staged = [[target, updated], [index, `${indexText.slice(0, insertion)}\n${line}${indexText.slice(insertion)}`], [compaction, `${compactionText.trimEnd()}\n${source}`]];
  const backups = [...staged, [file]].map(([name]) => [name, fs.existsSync(name) ? fs.readFileSync(name, 'utf8') : null]);
  fs.writeFileSync(journal, JSON.stringify(backups), { flag: 'wx' });
  try {
    for (const [name, contents] of staged) fs.writeFileSync(name, contents, { flag: name === target ? 'wx' : 'w' });
    fs.unlinkSync(file);
    fs.unlinkSync(journal);
  } catch (error) {
    recover();
    throw error;
  }
  return target;
};
