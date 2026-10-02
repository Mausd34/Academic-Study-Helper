/**
 * Verifies that every relative import in the project actually resolves to a
 * file that exists and exports the named bindings.
 * Run with:  node tools/check-imports.mjs
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = path.resolve(import.meta.dirname, '..');
const SKIP = new Set(['.git', 'node_modules', '.github', 'assets']);

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
let problems = 0;

/** Collect exported names from a module without executing it. */
async function exportsOf(file) {
  const source = readFileSync(file, 'utf8');
  const names = new Set();
  for (const match of source.matchAll(/export\s+(?:async\s+)?function\s+([A-Za-z0-9_$]+)/g)) names.add(match[1]);
  for (const match of source.matchAll(/export\s+(?:const|let|var|class)\s+([A-Za-z0-9_$]+)/g)) names.add(match[1]);
  for (const match of source.matchAll(/export\s*\{([^}]+)\}/g)) {
    for (const part of match[1].split(',')) {
      const name = part.trim().split(/\s+as\s+/).pop().trim();
      if (name) names.add(name);
    }
  }
  if (/export\s+default/.test(source)) names.add('default');
  if (/export\s*\*/.test(source)) names.add('*');
  return names;
}

for (const file of files) {
  const source = readFileSync(file, 'utf8');
  const rel = path.relative(root, file);

  // Relative imports.
  const importRe = /import\s+(?:([\w$]+)\s*,\s*)?(?:\{([^}]*)\})?\s*(?:\*\s+as\s+([\w$]+))?\s*from\s*['"](\.[^'"]+)['"]/g;
  for (const match of source.matchAll(importRe)) {
    const [, defaultName, named, starName, specifier] = match;
    const target = path.resolve(path.dirname(file), specifier);
    if (!existsSync(target)) {
      console.error(`  MISSING  ${rel} → ${specifier}`);
      problems += 1;
      continue;
    }
    const names = await exportsOf(target);
    if (starName && !names.has('*')) {
      console.error(`  NO *     ${rel} → ${specifier}`);
      problems += 1;
    }
    for (const part of (named || '').split(',')) {
      const name = part.trim().split(/\s+as\s+/)[0].trim();
      if (!name) continue;
      if (!names.has(name)) {
        console.error(`  NO EXPORT  ${rel} imports { ${name} } from ${specifier}`);
        problems += 1;
      }
    }
    if (defaultName && !names.has('default')) {
      console.error(`  NO DEFAULT  ${rel} imports default from ${specifier}`);
      problems += 1;
    }
  }

  // Dynamic imports used by the command palette (skip debug-load.mjs where import runs in browser context).
  if (!rel.includes('debug-load.mjs')) {
    for (const match of source.matchAll(/import\(\s*['"](\.[^'"]+)['"]\s*\)/g)) {
      const target = path.resolve(path.dirname(file), match[1]);
      if (!existsSync(target)) {
        console.error(`  MISSING (dynamic)  ${rel} → ${match[1]}`);
        problems += 1;
      }
    }
  }
}

console.log(`\nChecked ${files.length} files — ${problems === 0 ? 'all imports resolve.' : `${problems} problem(s).`}`);
process.exit(problems ? 1 : 0);
