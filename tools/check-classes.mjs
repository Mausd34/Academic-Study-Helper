/**
 * Markup contract check.
 *
 * `check-css.mjs` only proves styles.css is well-formed. It cannot tell you
 * that a view emits `class="hero-main"` while no rule targets `.hero-main`,
 * which silently renders an unstyled page. This tool closes that gap:
 *
 *   1. every class emitted from a JS template literal must exist in styles.css
 *   2. every id read with getElementById() must exist in index.html
 *   3. every local file referenced by index.html must exist on disk
 *
 * Dynamic class names (template interpolation) are skipped on purpose - they
 * cannot be resolved statically.
 *
 * Run with:  node tools/check-classes.mjs
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
let problems = 0;

/* Collect every .js file under js/ (the browser sources only). */
const jsFiles = [];
const collect = (dir) => {
  for (const entry of readdirSync(dir)) {
    const p = path.join(dir, entry);
    if (statSync(p).isDirectory()) collect(p);
    else if (p.endsWith('.js')) jsFiles.push(p);
  }
};
collect(path.join(root, 'js'));

/** Split a class attribute value into static class names. */
const tokens = (value) => value
  .split(/\s+/)
  .filter(Boolean)
  .filter((c) => /^[a-zA-Z][\w-]*$/.test(c));

const usedClasses = new Map();   // class -> file that emits it
const usedIds = new Map();       // id    -> file that reads it

for (const file of jsFiles) {
  const src = readFileSync(file, 'utf8');
  const rel = path.relative(root, file).replace(/\\/g, '/');

  // class="..." and class='...' inside template literals and plain strings.
  for (const re of [/class="([^"]*)"/g, /class='([^']*)'/g]) {
    for (const m of src.matchAll(re)) {
      for (const c of tokens(m[1])) if (!usedClasses.has(c)) usedClasses.set(c, rel);
    }
  }
  // className="..." / className='...'
  for (const re of [/className="([^"]*)"/g, /className='([^']*)'/g]) {
    for (const m of src.matchAll(re)) {
      for (const c of tokens(m[1])) if (!usedClasses.has(c)) usedClasses.set(c, rel);
    }
  }
  // classList.add('x') / remove / toggle
  for (const m of src.matchAll(/classList\.(?:add|remove|toggle)\(\s*['"]([\w-]+)['"]/g)) {
    if (!usedClasses.has(m[1])) usedClasses.set(m[1], rel);
  }
  // getElementById('x') and $('#x')
  for (const m of src.matchAll(/getElementById\(\s*['"]([\w-]+)['"]\s*\)/g)) {
    if (!usedIds.has(m[1])) usedIds.set(m[1], rel);
  }
  for (const m of src.matchAll(/\$\(\s*['"]#([\w-]+)['"]\s*\)/g)) {
    if (!usedIds.has(m[1])) usedIds.set(m[1], rel);
  }
}

/* ------------------------------------------------- 1. class coverage */
const css = readFileSync(path.join(root, 'styles.css'), 'utf8');
const defined = new Set();
for (const m of css.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) defined.add(m[1]);

const missing = [...usedClasses.entries()]
  .filter(([c]) => !defined.has(c))
  .sort((a, b) => a[0].localeCompare(b[0]));

for (const [c, rel] of missing) {
  console.error(`  MISSING CSS  .${c}  (emitted by ${rel})`);
  problems += 1;
}
console.log(`class coverage : ${usedClasses.size} emitted, ${missing.length} unstyled`);

/* ------------------------------------------------- 2. id coverage */
/*
 * Views build their markup at runtime with root.innerHTML, so most ids they
 * query are legitimately absent from index.html. Collect every id that any
 * template emits, plus anything assigned via .id = , and only report ids that
 * are referenced but neither shipped in index.html nor produced by a template.
 */
const html = readFileSync(path.join(root, 'index.html'), 'utf8');
const htmlIds = new Set();
for (const m of html.matchAll(/\bid="([^"]+)"/g)) htmlIds.add(m[1]);

const runtimeIds = new Set();
for (const file of jsFiles) {
  const src = readFileSync(file, 'utf8');
  for (const m of src.matchAll(/\bid="([^"$]+)"/g)) runtimeIds.add(m[1]);
  for (const m of src.matchAll(/\bid="\$\{[^}]+\}"/g)) runtimeIds.add('DYNAMIC');
  for (const m of src.matchAll(/\.id\s*=\s*['"]([\w-]+)['"]/g)) runtimeIds.add(m[1]);
}

const missingIds = [...usedIds.entries()]
  .filter(([id]) => !htmlIds.has(id) && !runtimeIds.has(id))
  .sort((a, b) => a[0].localeCompare(b[0]));

for (const [id, rel] of missingIds) {
  console.error(`  MISSING HTML #${id}  (read by ${rel})`);
  problems += 1;
}
console.log(`id coverage    : ${usedIds.size} queried, ${missingIds.length} unresolvable`);

/* ------------------------------------------------- 3. local assets */
const refs = [...html.matchAll(/(?:src|href)="([^"#:]+)"/g)]
  .map((m) => m[1])
  .filter((p) => !p.startsWith('http') && !p.startsWith('//') && !p.startsWith('data:'));

const missingFiles = refs.filter((p) => !existsSync(path.join(root, p)));
for (const p of missingFiles) {
  console.error(`  MISSING FILE  ${p}  (referenced by index.html)`);
  problems += 1;
}
console.log(`local assets   : ${refs.length} referenced, ${missingFiles.length} missing`);

console.log(problems === 0
  ? '\nMarkup contract OK.'
  : `\n${problems} contract problem(s).`);
process.exit(problems ? 1 : 0);