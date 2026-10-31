import fs from 'node:fs';

export const parseIssues = value => {
  if (typeof value !== 'string' || !/^\s*[0-9]+\s*(?:,\s*[0-9]+\s*)*$/.test(value)) throw new Error('provide nonempty comma-separated issue numbers');
  const issues = value.split(',').map(part => {
    const number = Number(part.trim());
    if (!Number.isSafeInteger(number) || number < 1) throw new Error('invalid issue number');
    return number;
  });
  if (new Set(issues).size !== issues.length) throw new Error('duplicate issue number');
  return issues;
};

const closing = /\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#([0-9]+)\b/gi;

export const checkBody = (approved, body) => {
  const issues = parseIssues(approved);
  if (typeof body !== 'string') throw new Error('PR body must be text');
  const matches = [...body.matchAll(closing)];
  let fence = null;
  const standalone = body.split(/\r?\n/).filter(line => {
    const delimiter = /^ {0,3}(`{3,}|~{3,})/.exec(line)?.[1];
    if (delimiter && (!fence || delimiter[0] === fence[0] && delimiter.length >= fence.length)) { fence = fence ? null : delimiter; return false; }
    return !fence && /^\s*(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#[0-9]+\s*$/i.test(line);
  });
  const found = matches.map(match => Number(match[1]));
  if (matches.length !== standalone.length || found.some(number => !Number.isSafeInteger(number) || number < 1) || found.length !== issues.length || new Set(found).size !== found.length || found.some(number => !issues.includes(number))) throw new Error(`PR closing references must be standalone and match approved issues: ${issues.map(number => `#${number}`).join(', ')}`);
  return issues;
};

export const renderBody = (approved, body) => {
  const issues = parseIssues(approved);
  if (typeof body !== 'string' || [...body.matchAll(closing)].length) throw new Error('base PR body must not contain closing references');
  const result = `${body.trimEnd()}\n\n${issues.map(number => `Closes #${number}`).join('\n')}\n`;
  checkBody(approved, result);
  return result;
};

if (process.argv[1] && fs.realpathSync(process.argv[1]) === import.meta.filename) {
  try {
    const [command, approved, file] = process.argv.slice(2);
    if (!['render', 'check'].includes(command) || !file) throw new Error('usage: node tools/pr-body.mjs render|check <approved-issues> <body-file|->');
    const body = file === '-' ? fs.readFileSync(0, 'utf8') : fs.readFileSync(file, 'utf8');
    if (command === 'render') process.stdout.write(renderBody(approved, body));
    else { checkBody(approved, body); console.log('PR closing references match approved issues'); }
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
