/**
 * Validates styles.css: balanced braces, every declaration block closed, and
 * no rule left dangling. Browsers silently drop everything after an unclosed
 * block, which is invisible to JS-level tests.
 *
 * Run with:  node tools/check-css.mjs
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';

const file = path.resolve(import.meta.dirname, '../styles.css');
const source = readFileSync(file, 'utf8');

let problems = 0;
const stack = [];
let inString = false;
let quote = '';
let inComment = false;
let line = 1;

const stackOf = (i) => {
  const before = source.slice(0, i);
  return before.split('\n').length;
};

for (let i = 0; i < source.length; i += 1) {
  const c = source[i];
  const next = source[i + 1];

  if (c === '\n') line += 1;

  if (inComment) {
    if (c === '*' && next === '/') { inComment = false; i += 1; }
    continue;
  }
  if (inString) {
    if (c === '\\') { i += 1; continue; }
    if (c === quote) inString = false;
    continue;
  }
  if (c === '/' && next === '*') { inComment = true; i += 1; continue; }
  if (c === '"' || c === "'") { inString = true; quote = c; continue; }

  if (c === '{') {
    const openLine = line;
    const selector = source.slice(source.lastIndexOf('}', i) + 1, i).trim().split('\n').pop().trim();
    stack.push({ line: openLine, selector });
    continue;
  }
  if (c === '}') {
    if (!stack.length) {
      console.error(`  EXTRA '}' at line ${line}`);
      problems += 1;
    } else {
      stack.pop();
    }
  }
}

for (const open of stack) {
  console.error(`  UNCLOSED BLOCK opened at line ${open.line}: ${open.selector || '(anonymous)'}`);
  problems += 1;
}

// A declaration block should contain at least one ';' before closing.
const emptyBlocks = source.match(/\{[^{}]*\}/g) || [];
for (const block of emptyBlocks) {
  if (!block.includes(':')) {
    const at = stackOf(source.indexOf(block));
    console.error(`  EMPTY RULE at ~line ${at}: ${block.slice(0, 60)}`);
    problems += 1;
  }
}

console.log(`\n${problems === 0 ? 'styles.css is well-formed.' : `${problems} CSS problem(s).`}`);
process.exit(problems ? 1 : 0);
