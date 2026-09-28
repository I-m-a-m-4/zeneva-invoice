const r = require('../lint-out.json');
const realRules = new Set([
  'react-hooks/rules-of-hooks',
  'react/jsx-no-undef',
  '@next/next/no-html-link-for-pages',
  'react/display-name',
]);
const root = process.cwd() + require('path').sep;
for (const f of r) {
  for (const m of f.messages) {
    if (realRules.has(m.ruleId)) {
      const rel = f.filePath.startsWith(root) ? f.filePath.slice(root.length) : f.filePath;
      console.log(rel + ':' + m.line + ':' + m.column + '  ' + m.ruleId + '  ' + m.message.slice(0, 160));
    }
  }
}
