/**
 * Static sanity check for the Postgres migrations.
 *
 * This does NOT execute SQL - it cannot. There is no local Postgres or
 * Docker in this environment, so the files remain UNVERIFIED against a real
 * database until you run them in the Supabase SQL editor.
 *
 * What it does catch: typos and drift between the two files. A table added
 * to the schema but forgotten in the RLS list is the single most dangerous
 * mistake possible here, because that table silently has no protection.
 *
 * Run with:  node tools/check-sql.mjs
 */
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const dir = path.join(root, 'supabase');

const read = (name) => readFileSync(path.join(dir, name), 'utf8');
const schema = read('001_schema.sql');
const rls = read('002_rls.sql');
const seed = read('003_seed_reference.sql');

let problems = 0;
const fail = (msg) => { console.error(`  FAIL  ${msg}`); problems += 1; };
const ok = (msg) => console.log(`  ok    ${msg}`);

/* ------------------------------------------------- 1. structure */
for (const [name, sql] of [['001_schema.sql', schema], ['002_rls.sql', rls], ['003_seed_reference.sql', seed]]) {
  const opens = (sql.match(/\(/g) || []).length;
  const closes = (sql.match(/\)/g) || []).length;
  if (opens !== closes) fail(`${name}: unbalanced parentheses (${opens} open, ${closes} close)`);
  else ok(`${name}: parentheses balanced (${opens})`);

  // Dollar-quoted bodies must pair up.
  const tags = (sql.match(/\$\$[a-z_]*\$\$/g) || []).length;
  if (tags % 2 !== 0) fail(`${name}: odd number of $$ delimiters (${tags})`);
  else if (tags) ok(`${name}: ${tags / 2} dollar-quoted body block(s)`);
}

/* ------------------------------------------------- 2. tables */
const created = [...schema.matchAll(/create table if not exists public\.(\w+)/gi)]
  .map((m) => m[1].toLowerCase());

if (!created.length) fail('no tables found in 001_schema.sql');
else ok(`${created.length} tables declared`);

const dupes = created.filter((t, i) => created.indexOf(t) !== i);
if (dupes.length) fail(`duplicate create table: ${[...new Set(dupes)].join(', ')}`);

/* ------------------------------------------------- 3. RLS coverage */
const listMatch = rls.match(/tables\s+text\[\]\s*:=\s*array\[([\s\S]*?)\]/);
if (!listMatch) fail('002_rls.sql: could not locate the tables array');

const declared = [...listMatch[1].matchAll(/'([a-z_]+)'/gi)].map((m) => m[1].toLowerCase());

const missingTable = declared.filter((t) => !created.includes(t));
if (missingTable.length) {
  fail(`RLS protects tables that do not exist: ${missingTable.join(', ')}`);
} else {
  ok(`every RLS table exists in the schema (${declared.length})`);
}

const unprotected = created.filter((t) => !declared.includes(t));
if (unprotected.length) {
  fail(`NO RLS COVERAGE for: ${unprotected.join(', ')}`);
} else {
  ok('every declared table has RLS coverage');
}

/* ------------------------------------------------- 4. policies */
/*
 * user_data and profile are keyed by auth.users id directly, so they use
 * `id = auth.uid()` and are written out literally.
 *
 * Every other table gets its four policies from the DO block, where the
 * policy name is built at runtime as `t || '_select_own'`. So for those we
 * must verify the generator covers all four verbs — the finished names never
 * appear as literals in the file.
 */
const idKeyed = ['user_data', 'profile'];
const looped = declared.filter((t) => !idKeyed.includes(t));

for (const t of idKeyed) {
  const verbs = ['select', 'insert', 'update', 'delete'];
  const present = verbs.filter((v) => new RegExp(`${t}_${v}_own\\b`, 'i').test(rls));
  if (present.length !== 4) {
    fail(`${t} is missing policies: ${verbs.filter((v) => !present.includes(v)).join(', ')}`);
  } else {
    ok(`${t}: 4 own-row policies`);
  }
}

// The generator must emit all four verbs for every looped table.
// There are two `foreach ... end loop;` blocks; the policy one is the last.
const loops = [...rls.matchAll(/foreach t in array tables loop([\s\S]*?)end loop;/gi)].map((m) => m[1]);
const loopBody = loops[loops.length - 1];

if (!loopBody) {
  fail('002_rls.sql: expected a policy-generating loop for the collection tables');
} else {
  const body = loopBody;
  for (const verb of ['select', 'insert', 'update', 'delete']) {
    if (!new RegExp(`for\\s+${verb}\\b`, 'i').test(body)) {
      fail(`policy loop does not create a ${verb} policy`);
    }
  }
  // Every generated policy must scope on auth.uid() = user_id.
  // Expected count: select(1) + insert(1) + update(2: using+with check) + delete(1) = 5
  const scopes = (body.match(/auth\.uid\(\)\s*=\s*user_id/gi) || []).length;
  if (scopes !== 5) {
    fail(`policy loop scopes on auth.uid() = user_id ${scopes} time(s); expected exactly 5 (select 1, insert 1, update 2, delete 1)`);
  } else {
    ok(`policy loop emits 4 own-row policies for ${looped.length} tables`);
    ok('policy loop scopes every verb on auth.uid() = user_id (5 clauses)');
  }
}

/* ------------------------------------------------- 5. safety rails */
if (!/enable row level security/i.test(rls)) fail('002_rls.sql never enables RLS');
else ok('RLS is enabled');

if (!/force row level security/i.test(rls)) {
  fail('002_rls.sql does not FORCE rls — the table owner bypasses policies');
} else ok('RLS is FORCED (owner is also subject to policies)');

if (!/revoke all on all tables in schema public from anon/i.test(rls)) {
  fail('anon role still holds default table privileges');
} else ok('anon holds no table privileges');

if (/service_role/i.test(rls) && /grant[^\n]*service_role/i.test(rls)) {
  fail('a grant to service_role was found — remove it');
} else ok('no service_role grants');

/* ------------------------------------------------- 6. seed integrity */
const seedInserts = [...seed.matchAll(/insert into public\.(\w+)/gi)].map((m) => m[1].toLowerCase());
const seedUnknown = seedInserts.filter((t) => !created.includes(t));
if (seedUnknown.length) fail(`seed targets unknown tables: ${seedUnknown.join(', ')}`);
else ok(`seed inserts into ${[...new Set(seedInserts)].length} known table(s)`);

// Every course row the seed inserts, and every id the routine references.
const courseIds = [...seed.matchAll(/\('(crs-[a-z0-9-]+)',\s*target/g)].map((m) => m[1]);
const referencedCourseIds = [...seed.matchAll(/'(crs-[a-z0-9-]+)'/g)].map((m) => m[1]);

if (courseIds.length) {
  const dangling = [...new Set(referencedCourseIds)].filter((id) => !courseIds.includes(id));
  if (dangling.length) {
    fail(`seed references course ids that are never inserted: ${dangling.join(', ')}`);
  } else {
    ok(`seed course references all resolve (${courseIds.length} courses, ${new Set(referencedCourseIds).size} ids used)`);
  }
} else {
  fail('seed: could not find any course rows to validate against');
}

console.log(problems === 0
  ? '\nSQL migrations are internally consistent (not yet executed).'
  : `\n${problems} SQL problem(s).`);
process.exit(problems ? 1 : 0);