/** Dev helper: report brace/paren depth per top-level declaration. */
import { readFileSync } from 'node:fs';

const file = process.argv[2];
const src = readFileSync(file, 'utf8');
const from = Number(process.argv[3] || 0);
const to = Number(process.argv[4] || src.split('\n').length);
let depth = 0;
let inStr = false;
let quote = '';
let inComment = false;

src.split('\n').forEach((line, index) => {
  const startDepth = depth;
  for (let i = 0; i < line.length; i += 1) {
    const c = line[i];
    const next = line[i + 1];
    if (inComment) { if (c === '*' && next === '/') { inComment = false; i += 1; } continue; }
    if (inStr) { if (c === '\\') { i += 1; continue; } if (c === quote) inStr = false; continue; }
    if (c === '/' && next === '/') break;
    if (c === '/' && next === '*') { inComment = true; i += 1; continue; }
    if (c === "'" || c === '"' || c === '`') { inStr = true; quote = c; continue; }
    if (c === '{' || c === '(' || c === '[') depth += 1;
    if (c === '}' || c === ')' || c === ']') depth -= 1;
  }
  const lineNo = index + 1;
  if (depth === 0 && startDepth !== 0) {
    console.log(`${String(lineNo).padStart(4)}  closes to 0  ${line.trim().slice(0, 50)}`);
  }
  if (process.env.EACH === '1' && lineNo >= from && lineNo <= to) {
    console.log(`${String(lineNo).padStart(4)}  ${String(depth).padStart(3)}  ${line.slice(0, 62)}`);
  }
});
console.log(`\nfinal depth: ${depth}`);
