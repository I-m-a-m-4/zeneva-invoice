const fs = require('fs');
const file = process.argv[2] || 'lint-warn.json';
const rule = process.argv[3] || 'react-hooks/exhaustive-deps';
const report = JSON.parse(fs.readFileSync(file, 'utf8'));
for (const entry of report) {
  const msgs = entry.messages.filter((m) => m.ruleId === rule);
  if (!msgs.length) continue;
  const rel = entry.filePath.replace(/^.*zeneva-invoice[\\/]/, '');
  for (const m of msgs) {
    console.log(`${rel} | ${m.line}:${m.column} | ${m.message}`);
  }
}
