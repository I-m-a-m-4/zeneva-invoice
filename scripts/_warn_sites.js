const r = require('../' + (process.argv[2] || 'lint-warn.json'));
const fs = require('fs');
for (const f of r) {
  const lines = fs.readFileSync(f.filePath, 'utf8').split('\n');
  for (const m of f.messages) {
    const src = (lines[m.line - 1] || '').trim();
    console.log([f.filePath.split('zeneva-invoice').pop(), m.line + ':' + m.column, m.ruleId, '::', src.slice(0, 150)].join(' | '));
  }
}
