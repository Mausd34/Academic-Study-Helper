/**
 * Parse every JS file in the project and report syntax errors.
 * Run with:  node tools/check-syntax.mjs
 */
import { execFileSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const SKIP = new Set(['.git', 'node_modules', '.github']);

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP.has(entry)) continue;
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(js|mjs)$/.test(entry)) out.push(full);
  }
  return out;
}

const files = walk(root);
let failed = 0;

for (const file of files) {
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
    console.log(`  ok   ${path.relative(root, file)}`);
  } catch (error) {
    failed += 1;
    const message = (error.stderr?.toString() || error.message).split('\n').find((l) => l.includes('Error')) || 'parse error';
    console.error(`  FAIL ${path.relative(root, file)}\n       ${message.trim()}`);
  }
}

console.log(`\n${files.length - failed}/${files.length} files parsed cleanly.`);
process.exit(failed ? 1 : 0);
