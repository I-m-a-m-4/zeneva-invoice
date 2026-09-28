// One-off codemod: escape JSX text entities flagged by react/no-unescaped-entities.
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ENTITY = { "'": '&apos;', '"': '&quot;', '>': '&gt;', '}': '&#125;' };

const prev = require('../lint-out.json');
const files = prev
  .filter(f => f.messages.some(m => m.ruleId === 'react/no-unescaped-entities'))
  .map(f => path.relative(process.cwd(), f.filePath));

const res = spawnSync(process.execPath, [
  path.join('node_modules', 'eslint', 'bin', 'eslint.js'),
  ...files, '-f', 'json', '-o', 'lint-entities.json',
], { stdio: 'inherit' });
if (res.status !== 0 && res.status !== 1) { console.error('eslint failed', res.status); process.exit(1); }

const r = JSON.parse(fs.readFileSync('lint-entities.json', 'utf8'));

let totalApplied = 0, totalSkipped = 0, touched = 0;
for (const f of r) {
  const msgs = f.messages.filter(m => m.ruleId === 'react/no-unescaped-entities');
  if (!msgs.length) continue;
  const lines = fs.readFileSync(f.filePath, 'utf8').split('\n');
  msgs.sort((a, b) => b.line - a.line || b.column - a.column);
  let applied = 0;
  const skipped = [];
  for (const m of msgs) {
    const ch = /^`(.)` can be escaped/.exec(m.message)?.[1];
    const ent = ENTITY[ch];
    const li = m.line - 1, col = m.column - 1;
    if (!ent) { skipped.push(m.line + ':' + m.column + ' unknown char'); continue; }
    if (!lines[li] || lines[li][col] !== ch) {
      skipped.push(m.line + ':' + m.column + ' expected ' + JSON.stringify(ch) + ' found ' + JSON.stringify(lines[li] && lines[li][col]));
      continue;
    }
    lines[li] = lines[li].slice(0, col) + ent + lines[li].slice(col + 1);
    applied++;
  }
  fs.writeFileSync(f.filePath, lines.join('\n'));
  totalApplied += applied; totalSkipped += skipped.length; touched++;
  console.log(f.filePath.split('zeneva-invoice').pop(), 'applied=' + applied, skipped.length ? 'SKIPPED: ' + skipped.join('; ') : '');
}
console.log('---');
console.log('applied ' + totalApplied + ' escapes in ' + touched + ' files, skipped ' + totalSkipped);
