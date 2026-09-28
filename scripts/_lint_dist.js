const r = require('../lint-out.json');
const path = require('path');
const root = process.cwd() + path.sep;
const perFile = {};
const warnPerRule = {};
for (const f of r) {
  const rel = f.filePath.startsWith(root) ? f.filePath.slice(root.length) : f.filePath;
  for (const m of f.messages) {
    const key = (m.severity === 2 ? 'E:' : 'W:') + (m.ruleId || 'parse');
    if (key === 'E:react/no-unescaped-entities') {
      perFile[rel] = (perFile[rel] || 0) + 1;
    }
    if (m.severity === 1 && ['@next/next/no-img-element', 'react-hooks/exhaustive-deps', '@next/next/no-page-custom-font', '@next/next/google-font-preconnect'].includes(m.ruleId)) {
      warnPerRule[rel] = warnPerRule[rel] || {};
      warnPerRule[rel][m.ruleId] = (warnPerRule[rel][m.ruleId] || 0) + 1;
    }
  }
}
console.log('=== unescaped-entities per file (' + Object.values(perFile).reduce((a,b)=>a+b,0) + ' total) ===');
for (const [k, v] of Object.entries(perFile).sort((a,b)=>b[1]-a[1])) console.log(String(v).padStart(4), k);
console.log('');
console.log('=== warnings per file ===');
for (const [k, rules] of Object.entries(warnPerRule).sort()) {
  console.log(k, JSON.stringify(rules));
}
