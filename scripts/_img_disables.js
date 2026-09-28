// Inserts eslint-disable-next-line comments for @next/next/no-img-element findings.
// Uses the TypeScript AST to decide whether the target line lives in JSX children
// ({/* ... */}) or in a JS expression region (// ...), because the two are not
// interchangeable: a // comment inside JSX children renders as text, and a
// {/* */} comment inside a JS expression is a syntax error.
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const ROOT = path.resolve(__dirname, '..');
const report = JSON.parse(fs.readFileSync(path.join(ROOT, 'lint-warn.json'), 'utf8'));
const WRITE = process.argv.includes('--write');

const findings = new Map();
for (const entry of report) {
  const rel = path.relative(ROOT, entry.filePath).replace(/\\/g, '/');
  for (const m of entry.messages) {
    if (m.ruleId !== '@next/next/no-img-element') continue;
    if (!findings.has(rel)) findings.set(rel, new Set());
    findings.get(rel).add(m.line);
  }
}

function reasonFor(lineText, lookahead) {
  const hay = lineText + '\n' + lookahead;
  if (hay.includes('flagcdn')) return 'flagcdn.com is a runtime-selected flag that is not in images.remotePatterns';
  if (hay.includes('flaticon')) return 'third-party icon CDN that is not in images.remotePatterns';
  if (hay.includes('mediaUrl')) return 'chat attachment URL supplied at runtime (may be a blob: or CDN URL)';
  if (hay.includes('logoUrl') || hay.includes('logoIconUrl')) return 'logo URL is configured at runtime and may be an external or data: URL';
  if (hay.includes('/images/')) return 'plain <img> keeps the existing CSS sizing for this static asset';
  return 'runtime image URL that next/image cannot optimize without a remote allowlist';
}

function findInnermost(start, end, pos, node, best) {
  if (node.pos <= pos && pos < node.end) {
    if (!best || node.end - node.pos < best.end - best.pos) best = node;
    ts.forEachChild(node, (child) => {
      best = findInnermost(start, end, pos, child, best);
    });
  }
  return best;
}

function regionFor(sourceFile, pos) {
  // Walk up from the innermost node at the insertion point and stop at the first
  // decisive ancestor: being inside a JSX expression container's expression is a JS
  // context (// comment), while a JSX children slot that is not inside any child is
  // a JSX context ({/* */} comment).
  let node = findInnermost(0, sourceFile.end, pos, sourceFile, null);
  while (node) {
    if (ts.isJsxExpression(node) && node.expression && node.expression.pos <= pos && pos < node.expression.end) {
      return 'js';
    }
    if (ts.isJsxElement(node) || ts.isJsxFragment(node)) {
      const children = node.children;
      if (children && children.pos <= pos && pos < children.end) {
        let insideChild = false;
        for (const child of children) {
          if (child.pos < pos && pos < child.end) { insideChild = true; break; }
        }
        if (!insideChild) return 'jsx';
      }
    }
    node = node.parent;
  }
  return 'js';
}

let inserted = 0;
for (const [rel, lines] of findings) {
  const abs = path.join(ROOT, rel);
  const text = fs.readFileSync(abs, 'utf8');
  const sourceFile = ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const lineStarts = [0];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '\n') lineStarts.push(i + 1);
  }
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const out = [];
  const sorted = [...lines].sort((a, b) => b - a);
  for (const line of sorted) {
    const lineStart = lineStarts[line - 1];
    const lineEnd = text.indexOf('\n', lineStart);
    const rawLine = text.slice(lineStart, lineEnd === -1 ? text.length : lineEnd);
    const indent = rawLine.match(/^\s*/)[0];
    let pos = lineStart + indent.length;
    if (rawLine.slice(indent.length).startsWith('//') || rawLine.includes('eslint-disable-line')) {
      out.push({ line, action: 'skip (already disabled)', region: '-', text: rawLine.trim() });
      continue;
    }
    const region = regionFor(sourceFile, pos);
    const lookaheadEnd = text.indexOf('\n', lineEnd + 1);
    const lookahead = text.slice(lineEnd + 1, (text.indexOf('\n', lookaheadEnd + 1) === -1 ? text.length : text.indexOf('\n', lookaheadEnd + 1)));
    const reason = reasonFor(rawLine, lookahead);
    const comment = region === 'jsx'
      ? `{/* eslint-disable-next-line @next/next/no-img-element -- ${reason} */}`
      : `// eslint-disable-next-line @next/next/no-img-element -- ${reason}`;
    out.push({ line, action: 'insert', region, text: rawLine.trim(), newText: text, insertAt: lineStart, insert: indent + comment + eol });
  }

  // Apply bottom-up so earlier insert offsets stay valid.
  let updated = text;
  for (const item of out) {
    if (item.action !== 'insert') continue;
    updated = updated.slice(0, item.insertAt) + item.insert + updated.slice(item.insertAt);
    inserted++;
  }
  if (WRITE && updated !== text) fs.writeFileSync(abs, updated);

  console.log(`--- ${rel} (${out.length} finding line(s)) ---`);
  for (const item of out) {
    console.log(`  ${item.line} [${item.region}] ${item.action} :: ${item.text.slice(0, 110)}`);
  }
}
console.log(`\ninserted: ${inserted}${WRITE ? ' (written)' : ' (dry run)'}`);
