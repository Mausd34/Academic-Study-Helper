/**
 * Headless tests for the core logic (no DOM required).
 * Run with:  node tools/test-core.mjs
 */
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const load = (rel) => import(pathToFileURL(path.join(root, rel)).href);

const utils = await load('js/core/utils.js');
const storage = await load('js/core/storage.js');
const analytics = await load('js/core/analytics.js');
const recommend = await load('js/core/recommend.js');
const routine = await load('js/core/routine.js');
const assistant = await load('js/core/assistant.js');
const plans = await load('js/core/plans.js');
const charts = await load('js/core/charts.js');
const i18n = await load('js/core/i18n.js');

let pass = 0;
let fail = 0;
const t = (name, fn) => {
  try { fn(); pass += 1; console.log(`  ok   ${name}`); } catch (e) {
    fail += 1; console.error(`  FAIL ${name}\n       ${e.message}`); process.exitCode = 1;
  }
};

const state = storage.defaultState();
const today = utils.todayKey();

console.log('\nutils — safety');
t('esc blocks html injection', () => {
  assert.equal(utils.esc('<script>alert(1)</script>'), '&lt;script&gt;alert(1)&lt;/script&gt;');
  assert.equal(utils.esc('"><img src=x onerror=alert(1)>'), '&quot;&gt;&lt;img src=x onerror=alert(1)&gt;');
});
t('renderMarkdown escapes first', () => {
  const out = utils.renderMarkdown('# Hi <script>alert(1)</script>\n\n- **bold** `code`');
  assert.ok(!out.includes('<script>'));
  assert.ok(out.includes('<strong>bold</strong>'));
  assert.ok(out.includes('<code>code</code>'));
});
t('renderMarkdown blocks javascript links', () => {
  assert.ok(!utils.renderMarkdown('[x](javascript:alert(1))').includes('<a href'));
  assert.ok(utils.renderMarkdown('[ok](https://example.com)').includes('href="https://example.com"'));
});
t('uid never repeats', () => {
  assert.equal(new Set(Array.from({ length: 1000 }, () => utils.uid('t'))).size, 1000);
});
t('date maths use local time', () => {
  assert.equal(utils.toDateKey(new Date(2026, 0, 1)), '2026-01-01');
  assert.equal(utils.addDays('2026-02-27', 2), '2026-03-01');
  assert.equal(utils.daysUntil(today), 0);
  assert.equal(utils.dayName(today), utils.DAYS[new Date().getDay()]);
});
t('countdown and percent', () => {
  assert.equal(utils.countdownLabel(utils.addDays(today, -4)).tone, 'danger');
  assert.equal(utils.percent(12, 14), 85.7);
  assert.equal(utils.percent(0, 0), 0);
});
t('time parsing rejects junk', () => {
  assert.equal(utils.timeToMinutes('9:35'), 575);
  assert.equal(utils.timeToMinutes('abc'), null);
  assert.equal(utils.timeToMinutes('25:00'), null);
});

console.log('\nattendance engine');
t('CSC 465 sample matches the spec example', () => {
  const row = analytics.attendanceSummary(state).find((r) => r.code === 'CSC 465');
  assert.equal(row.present, 12);
  assert.equal(row.absent, 2);
  assert.equal(row.total, 14);
  assert.equal(row.percent, 85.7);
});
t('forecast: safe course can still miss classes', () => {
  const f = recommend.attendanceForecast({ present: 12, absent: 2, total: 14, target: 75 });
  assert.equal(f.status, 'safe');
  assert.ok(f.missableAhead > 0);
});
t('forecast: below target reports recovery need', () => {
  const f = recommend.attendanceForecast({ present: 6, absent: 6, total: 12, target: 75 });
  assert.equal(f.status, 'below');
  assert.ok(f.neededToRecover > 0);
  assert.equal(f.missableAhead, 0);
});
t('forecast: at-risk band', () => {
  const f = recommend.attendanceForecast({ present: 76, absent: 24, total: 100, target: 75 });
  assert.equal(f.status, 'risk', 'only 1% above target should read as at risk');
  assert.equal(f.missableAhead, 1, '76/101 is still 75.2%, so exactly one miss is affordable');
});
t('forecast: empty is safe to render', () => {
  assert.equal(recommend.attendanceForecast({ present: 0, absent: 0, total: 0 }).status, 'empty');
});

console.log('\nrecommendations');
t('priorities are sorted and explained', () => {
  const out = recommend.buildPriorities(state, { limit: 5 });
  assert.ok(out.length > 0);
  for (let i = 1; i < out.length; i += 1) assert.ok(out[i - 1].score >= out[i].score);
  for (const item of out) assert.ok(item.reasons.length > 0, 'each item needs a reason');
});
t('urgent exam outranks a distant one', () => {
  const base = state.courses[0].id;
  const soon = { ...state, exams: [{ id: 'e1', courseId: base, type: 'Quiz', title: 'Soon', date: utils.addDays(today, 1), prep: 0 }] };
  const far = { ...state, exams: [{ id: 'e2', courseId: base, type: 'Final', title: 'Far', date: utils.addDays(today, 60), prep: 0 }] };
  assert.ok(recommend.buildPriorities(soon)[0].score > recommend.buildPriorities(far)[0].score);
});
t('never throws on a blank state', () => {
  assert.ok(Array.isArray(recommend.buildPriorities({})));

console.log('\nanalytics');
t('task counts classify correctly', () => {
  const counts = analytics.taskCounts(state);
  assert.equal(counts.total, state.tasks.length);
  assert.equal(counts.overdue, state.tasks.filter((x) => x.status !== 'completed' && utils.daysUntil(x.dueDate) < 0).length);
});
t('series always have the right number of buckets', () => {
  assert.equal(analytics.weeklyStudyMinutes(state).length, 7);
  assert.equal(analytics.monthlyStudySeries(state, 6).length, 6);
  assert.equal(analytics.taskCompletionSeries(state, 7).length, 7);
});
t('expense totals and categories reconcile', () => {
  const totals = analytics.expenseTotals(state);
  assert.ok(totals.total > 0);
  assert.ok(totals.month <= totals.total);
  const cats = analytics.expenseByCategory(state);
  assert.equal(cats.reduce((s, c) => s + c.value, 0), totals.total);
  assert.ok(cats[0].value >= cats[cats.length - 1].value);
});
t('coding stats split solved vs attempted', () => {
  const stats = analytics.codingStats(state);
  assert.equal(stats.total, state.coding.length);
  assert.equal(stats.solved + stats.attempted, stats.total);
});
t('analytics survives a blank state', () => {
  for (const fn of [analytics.attendanceSummary, analytics.taskCounts, analytics.studyStats, analytics.expenseTotals, analytics.codingStats, analytics.skillAverage, analytics.skillByGroup]) {
    assert.doesNotThrow(() => fn({}));
  }
});

console.log('\nassistant');
t('answers known topics', () => {
  assert.ok(assistant.answer('Explain TCP/IP simply', { state }).text.includes('TCP'));
  assert.ok(assistant.answer('compiler phases', { state }).text.toLowerCase().includes('lexical'));
  assert.ok(assistant.answer('python plan', { state }).text.includes('Week 1'));
  assert.ok(assistant.answer('ml viva', { state }).text.toLowerCase().includes('overfitting'));
  assert.ok(assistant.answer('networking mcq', { state }).text.includes('Q1'));
});
t('bangla answers use bangla script', () => {
  assert.ok(/[\u0980-\u09FF]/.test(assistant.answer('TCP/IP সহজ করে বুঝাও', { state, language: 'bn' }).text));
});
t('live answers use real data', () => {
  const out = assistant.answer('What should I study today?', { state });
  assert.equal(out.source, 'live');
  assert.ok(out.text.includes('Today is'));
  assert.ok(assistant.answer('how is my attendance', { state }).text.includes('%'));
  assert.ok(assistant.answer('study plan for my exam', { state }).text.includes('Revision plan'));
});
t('handles empty, whitespace, huge and hostile input', () => {
  for (const q of ['', '   ', null, undefined, '???', 'x'.repeat(2000), '<script>alert(1)</script>']) {
    assert.doesNotThrow(() => assistant.answer(q, { state }));
  }
});
t('never leaks a key and reports offline mode', () => {
  assert.equal(assistant.backendMode().enabled, false);
  assert.equal(assistant.backendMode().url, '');
});

console.log('\nplans & charts');
t('default roadmap has the four specified months', () => {
  const r = plans.defaultRoadmap();
  assert.equal(r.length, 4);
  assert.deepEqual(r.map((m) => m.month), [1, 2, 3, 4]);
  assert.ok(r[0].items.some((i) => /python/i.test(i.title)));
  assert.ok(r[2].items.some((i) => /machine learning/i.test(i.title)));
  assert.ok(r[3].items.some((i) => /portfolio|cv/i.test(i.title)));
});
t('default learning plan has the four tracks', () => {
  const p = plans.defaultLearningPlan();
  assert.deepEqual(p.map((x) => x.key), ['python', 'data', 'ml', 'advanced']);
  assert.ok(p.every((x) => x.items.length >= 6));
});
t('charts render, escape and handle empty data', () => {
  assert.ok(charts.barChart([{ label: 'Mon', value: 5 }]).includes('bar-fill'));
  assert.equal((charts.barChart([{ label: 'a', value: 1 }, { label: 'b', value: 2 }]).match(/bar-col/g) || []).length, 2);
  assert.ok(charts.barChart([]).includes('No data'));
  assert.ok(!charts.barChart([{ label: '<b>x</b>', value: 1 }]).includes('<b>'));
  assert.ok(charts.hBarChart([{ label: 'A', value: 1 }]).includes('hbar-fill'));
  assert.ok(charts.donutChart([{ label: 'A', value: 2 }]).includes('<circle'));
  assert.ok(charts.lineChart([{ label: 'a', value: 1 }, { label: 'b', value: 2 }]).includes('<path'));
  assert.ok(charts.lineChart([{ label: 'a', value: 1 }]).includes('at least two'));
  assert.ok(charts.ringChart(50).includes('50%'));
  assert.ok(charts.stackedBar([{ label: 'x', value: 3 }]).includes('stacked'));
  assert.ok(charts.stackedBar([]).includes('No data'));
});

console.log('\ni18n');
t('every key exists in both languages', () => {
  const keys = Object.keys(i18n.en);
  assert.ok(keys.length > 50, `only ${keys.length} keys`);
  for (const k of keys) assert.ok(i18n.bn[k], `missing bn: ${k}`);
  assert.equal(Object.keys(i18n.bn).length, keys.length);
});
t('t() falls back safely', () => {
  assert.equal(i18n.t('nav.dashboard', 'en'), 'Dashboard');
  assert.equal(i18n.t('nope.missing', 'bn'), 'nope.missing');
});

console.log(`\n${pass} passed, ${fail} failed\n`);

  assert.ok(Array.isArray(recommend.attendanceRisks({})));
});

console.log('\nroutine');
t('today detection uses the real weekday', () => {
  const todayName = utils.DAYS[new Date().getDay()];
  assert.ok(routine.classesOn(state, todayName).every((c) => c.day === todayName));
  assert.equal(routine.todayClasses(state).length, routine.classesOn(state, todayName).length);
});
t('classes are ordered by start time', () => {
  const starts = routine.classesOn(state, 'Monday').map((c) => utils.timeToMinutes(c.start));
  assert.deepEqual(starts, [...starts].sort((a, b) => a - b));
});
t('status is derived from the clock, not the real day', () => {
  // Monday 5 Jan 2026. ENG 250 runs 08:30–09:30, CSE 4357 runs 09:35–10:35.
  const at = (h, m) => routine.todayClassesWithStatus(state, new Date(2026, 0, 5, h, m));
  const codeAt = (h, m) => at(h, m).map((c) => `${c.course.code}:${c.status}`);
  assert.deepEqual(codeAt(9, 0), ['ENG 250:current', 'CSE 4357:upcoming', 'CSC 465:upcoming', 'CSE 3308:upcoming', 'CSE 3308:upcoming']);
  assert.deepEqual(codeAt(9, 45), ['ENG 250:done', 'CSE 4357:current', 'CSC 465:upcoming', 'CSE 3308:upcoming', 'CSE 3308:upcoming']);
  assert.equal(at(10, 40)[1].status, 'done');
  assert.equal(at(9, 45).length, routine.classesOn(state, 'Monday').length);
});
t('nextClass returns null on a day with no classes', () => {
  const empty = { ...state, routine: state.routine.filter((r) => r.day !== utils.DAYS[new Date().getDay()]) };
  assert.equal(routine.nextClass(empty), null);
});
t('weekly load sums minutes per course', () => {
  const load = routine.weeklyLoad(state);
  assert.ok(load.length > 0);
  assert.ok(load[0].minutes >= load[load.length - 1].minutes);
});
