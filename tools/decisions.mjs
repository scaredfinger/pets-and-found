import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { frontmatter, git, listFiles, read } from './shared.mjs';

const keys = ['id', 'title', 'category', 'type', 'status', 'date', 'tags', 'dependsOn', 'supersedes', 'related'];
const slug = title => title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const stripImages = text => {
  const balanced = (start, open, close) => {
    let depth = 0;
    for (let i = start; i < text.length; i++) {
      if (text[i] === '\\') { i++; continue; }
      if (text[i] === open) depth++;
      if (text[i] === close && --depth === 0) return i + 1;
    }
    return -1;
  };
  let result = '';
  for (let i = 0; i < text.length;) {
    if (text[i] === '!' && text[i + 1] === '[' && (i === 0 || text[i - 1] !== '\\')) {
      const labelEnd = balanced(i + 1, '[', ']');
      if (labelEnd > 0) {
        const next = text[labelEnd];
        const end = next === '(' ? balanced(labelEnd, '(', ')') : next === '[' ? balanced(labelEnd, '[', ']') : labelEnd;
        if (end > 0) { i = end; continue; }
      }
    }
    result += text[i++];
  }
  return result.replace(/<img\b[^>]*>/gi, '');
};
export const validSummary = text => {
  let fence = null;
  let comment = false;
  let inSummary = false;
  let count = 0;
  const body = [];
  for (const raw of text.split(/\r?\n/)) {
    let line = raw;
    if (fence) {
      const marker = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
      if (marker && marker[1][0] === fence[0] && marker[1].length >= fence.length && !marker[2].trim()) fence = null;
      continue;
    }
    let visible = '';
    while (line) {
      if (comment) {
        const end = line.indexOf('-->');
        if (end < 0) break;
        comment = false;
        line = line.slice(end + 3);
      } else {
        const start = line.indexOf('<!--');
        if (start < 0) { visible += line; break; }
        visible += line.slice(0, start);
        comment = true;
        line = line.slice(start + 4);
      }
    }
    line = visible;
    const marker = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
    if (marker) { fence = marker[1]; continue; }
    if (/^(?: {4}|\t)/.test(line)) continue;
    if (inSummary && /^ {0,3}(?:=+|-+)[ \t]*$/.test(line) && body.length && body.at(-1).trim()) {
      while (body.length && body.at(-1).trim()) body.pop();
      if (line.trimStart().startsWith('=')) inSummary = false;
      continue;
    }
    const heading = /^ {0,3}(#{1,6})[ \t]+(.+?)[ \t]*#*[ \t]*$/.exec(line);
    if (heading && heading[1] === '#') {
      inSummary = heading[2] === 'AI Summary';
      if (inSummary) count++;
      continue;
    }
    if (inSummary && !heading) body.push(line);
  }
  const prose = stripImages(body.join('\n').replace(/^ {0,3}\[[^\]\n]+\]:[^\n]*$/gm, '')).replace(/[`*_~\[\]()#>\-\s]/g, ' ').trim();
  return count === 1 && /[\p{L}\p{N}]/u.test(prose) && !/\b(?:TODO|TBD|FIXME|placeholder|lorem ipsum|brief searchable summary)\b/i.test(prose) && !/^(?:n\/?a|none|tba|pending|to be determined)[.!\s]*$/i.test(prose);
};
const relocateDraftLinks = (text, activeFile, draftFile, acceptedFile) => {
  const relocate = destination => {
    const angled = destination.startsWith('<');
    const link = angled ? destination.slice(1, -1) : destination;
    if (/^(?:[a-z][a-z0-9+.-]*:|\/|#)/i.test(link)) return destination;
    const split = link.search(/[?#]/);
    const pathname = split < 0 ? link : link.slice(0, split);
    let decoded;
    try { decoded = decodeURIComponent(pathname.replace(/\\([()])/g, '$1')); } catch { return destination; }
    if (path.resolve(path.dirname(activeFile), decoded) !== draftFile) return destination;
    const relocated = encodeURI(path.relative(path.dirname(activeFile), acceptedFile).split(path.sep).join('/')) + (split < 0 ? '' : link.slice(split));
    return angled ? `<${relocated}>` : relocated;
  };
  const inline = /(\]\([ \t]*)(<[^>\r\n]*>|(?:\\.|[^\s()]|\([^()\s]*\))+)(?=[\s)])/g;
  const definitions = /^([ \t]{0,3}\[[^\]\r\n]+\]:[ \t]*)(<[^>\r\n]*>|\S+)(?=[ \t\r\n]|$)/gm;
  return text.replace(inline, (match, prefix, destination) => prefix + relocate(destination)).replace(definitions, (match, prefix, destination) => prefix + relocate(destination));
};

export const decisions = (root, { base = 'main', immutable = true, validateDraftSummaries = true } = {}) => {
  const errors = [];
  if (immutable) {
    try { if (fs.existsSync(path.resolve(root, git(root, 'rev-parse', '--git-path', 'cinderling-promotion.json')))) errors.push('interrupted decision promotion; rerun promote to recover'); } catch { errors.push('cannot locate decision promotion journal'); }
  }
  const accepted = listFiles(root, path.join(root, 'docs/decisions')).filter(file => /^docs\/decisions\/\d{5}-.*\.md$/.test(file));
  const drafts = listFiles(root, path.join(root, 'docs/decision-drafts')).filter(file => file.endsWith('.md') && !file.endsWith('/README.md'));
  let legacy = {};
  try {
    const metadata = JSON.parse(fs.readFileSync(path.join(root, '.cinderling/managed.json'), 'utf8'));
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata) || typeof metadata.version !== 'string' || !metadata.version.trim()) throw new Error('invalid metadata');
    if (metadata.summaryBaseline !== undefined) {
      const baseline = metadata.summaryBaseline;
      if (!baseline || typeof baseline.version !== 'string' || !baseline.files || typeof baseline.files !== 'object' || Array.isArray(baseline.files) || Object.entries(baseline.files).some(([file, hash]) => !/^docs\/decisions\/\d{5}-[^/]+\.md$/.test(file) || typeof hash !== 'string' || !/^[a-f0-9]{64}$/.test(hash))) errors.push('.cinderling/managed.json: invalid summary baseline');
      else legacy = baseline.files;
    }
  } catch (error) {
    if (error.code !== 'ENOENT') errors.push('.cinderling/managed.json: cannot read or parse installation metadata');
  }
  let ancestor;
  if (immutable) try { ancestor = git(root, 'merge-base', base, 'HEAD'); } catch {}
  const unchangedAtBase = (file, text) => {
    if (!ancestor) return false;
    try { return execFileSync('git', ['show', `${ancestor}:${file}`], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) === text; } catch { return false; }
  };
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
      if (drafts.includes(file) && validateDraftSummaries && !validSummary(text) && !unchangedAtBase(file, text)) errors.push(`${file}: requires meaningful top-level # AI Summary prose`);
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
  const superseded = new Set(records.filter(item => accepted.includes(item.file)).flatMap(item => item.data.supersedes));
  for (const record of records.filter(item => accepted.includes(item.file))) {
    if (!index.includes(`| ${record.data.id} | ${record.data.title} | ${record.data.category} |`)) errors.push(`${record.file}: index entry missing`);
    const compaction = `docs/architecture/${record.data.category}.md`;
    const text = fs.existsSync(path.join(root, compaction)) ? read(root, compaction) : '';
    if (superseded.has(record.data.id)) {
      const activeSections = text.split(/^##+ [^\n]+\n/m).slice(1).join('\n');
      if (new RegExp(`^Sources?: [^\\n]*\\b${record.data.id}\\b`, 'm').test(activeSections)) errors.push(`${record.file}: superseded category compaction retains source ${record.data.id}`);
      continue;
    }
    if (!text.includes(record.data.id)) errors.push(`${record.file}: category compaction missing source ${record.data.id}`);
  }
  if (immutable) {
    try {
      if (!ancestor) throw new Error('missing merge base');
      const original = git(root, 'ls-tree', '-r', '--name-only', ancestor, 'docs/decisions').split('\n').filter(file => /^docs\/decisions\/\d{5}-.*\.md$/.test(file));
      for (const file of original) if (!accepted.includes(file)) errors.push(`${file}: accepted decision deleted or renamed from ${base}`);
      for (const [file, hash] of Object.entries(legacy)) {
        if (!accepted.includes(file)) errors.push(`${file}: reviewed historical decision deleted or renamed`);
        else if (crypto.createHash('sha256').update(read(root, file)).digest('hex') !== hash) errors.push(`${file}: reviewed historical decision changed`);
      }
      for (const file of accepted) {
        let previous;
        try { previous = execFileSync('git', ['show', `${ancestor}:${file}`], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); } catch {
          const text = read(root, file);
          if (!legacy[file] && !validSummary(text)) errors.push(`${file}: requires meaningful top-level # AI Summary prose`);
          continue;
        }
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
  if (!validSummary(draft.text)) throw new Error('draft requires meaningful top-level # AI Summary prose');
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
  const staged = new Map([[target, updated], [index, `${indexText.slice(0, insertion)}\n${line}${indexText.slice(insertion)}`], [compaction, `${compactionText.trimEnd()}\n${source}`]]);
  const activeFiles = new Set([index, compaction, ...listFiles(root, path.join(root, 'docs/architecture')).filter(name => name.endsWith('.md')).map(name => path.join(root, name))]);
  for (const name of activeFiles) {
    const relative = path.relative(path.resolve(root), name);
    let current = path.resolve(root);
    for (const part of relative.split(path.sep)) {
      current = path.join(current, part);
      if (fs.lstatSync(current, { throwIfNoEntry: false })?.isSymbolicLink()) throw new Error(`unsupported active architecture symlink: ${current}`);
    }
    const original = staged.get(name) ?? fs.readFileSync(name, 'utf8');
    const relocated = relocateDraftLinks(original, name, file, target);
    if (relocated !== original) staged.set(name, relocated);
  }
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
