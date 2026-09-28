// Dry-run: verify ESLint entity positions map to the offending characters.
const { execFileSync } = require('child_process');
const fs = require('fs');

const files = ['src/components/admin/user-detail/sections.tsx', 'src/app/download/page.tsx'];
let out;
try {
  out = execFileSync('npx', ['eslint', ...files, '-f', 'json'], { shell: true, maxBuffer: 64 * 1024 * 1024 }).toString();
} catch (e) {
  out = e.stdout.toString();
}
const r = JSON.parse(out);
for (const f of r) {
  const msgs = f.messages.filter(m => m.ruleId === 'react/no-unescaped-entities');
  if (!msgs.length) continue;
  const lines = fs.readFileSync(f.filePath, 'utf8').split('\n');
  for (const m of msgs) {
    const ch = /^`(.)` can be escaped/.exec(m.message)?.[1];
    const at = lines[m.line - 1][m.column - 1];
    console.log(f.filePath.split('zeneva-invoice').pop(), m.line + ':' + m.column, 'expect=' + JSON.stringify(ch), 'found=' + JSON.stringify(at), ch === at ? 'OK' : 'MISMATCH');
  }
}
