import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const load = (rel) => import(pathToFileURL(path.join(root, rel)).href);
const utils = await load('js/core/utils.js');
const storage = await load('js/core/storage.js');

let pass = 0;
const t = (name, fn) => {
  try { fn(); pass++; console.log('ok  ' + name); }
  catch (e) { console.error('FAIL ' + name + '\n     ' + e.message); process.exitCode = 1; }
};

t('default state shape', () => {
  const s = storage.defaultState();
  assert.equal(s.version, 4);
  assert.equal(s.semesters.filter(x => x.active).length, 1);
  assert.equal(s.semesters.find(x => x.active).name, 'Fall 2026');
  assert.equal(s.courses.length, 6);
  assert.equal(s.routine.length, 16);
  assert.equal(s.profile.name, 'Masud Rana');
  assert.equal(s.settings.attendanceTarget, 75);
  assert.equal(s.settings.theme, 'system');
});

t('fall 2026 seed matches the real timetable', () => {
  const s = storage.defaultState();
  const c = s.courses.find(x => x.code === 'CSC 465');
  const slots = s.routine.filter(r => r.courseId === c.id);
  assert.equal(slots.length, 3);
  assert.deepEqual(slots.map(x => x.day).sort(), ['Monday','Tuesday','Wednesday']);
  const een = s.courses.find(x => x.code === 'EEN 184');
  const lab = s.routine.filter(r => r.courseId === een.id);
  assert.equal(lab.length, 2);
  assert.ok(lab.every(x => x.room === 'EEELab1'));
  const cse3308 = s.courses.find(x => x.code === 'CSE 3308');
  const two = s.routine.filter(r => r.courseId === cse3308.id);
  assert.equal(two.length, 2);
  assert.ok(two.every(x => x.room === 'EEELab6' && x.day === 'Monday'));
});

t('every routine slot points at a real course', () => {
  const s = storage.defaultState();
  const ids = new Set(s.courses.map(x => x.id));
  assert.ok(s.routine.every(r => ids.has(r.courseId)));
  assert.ok(s.routine.every(r => r.start < r.end));
});

t('migrates legacy v3 without losing data', () => {
  const legacy = {
    att: { 'CSC 465': { p: 12, a: 2 } },
    tasks: [{ id: 'x', title: 'Old task', course: 'CSC 465', due: '2026-10-01', priority: 'High', done: false }],
    notes: [{ id: 'n', title: 'Old note', body: 'tcp notes', course: 'CSC 465', date: '2026-09-01' }],
    expenses: [{ id: 'e', amount: 120, desc: 'Food', cat: 'Food', date: '2026-09-01' }],
    skills: [{ name: 'Python', value: 55 }],
    goals: [{ name: 'Python + SQL', value: 45, target: 100 }],
    study: { sessions: 3, minutes: 75 },
    profile: { name: 'Masud Rana', id: '22303062' },
    theme: 'dark',
  };
  const out = storage.migrate(legacy);
  assert.equal(out.version, 4);
  assert.equal(out.tasks[0].title, 'Old task');
  assert.equal(out.notes[0].content, 'tcp notes');
  assert.equal(out.expenses[0].amount, 120);
  assert.equal(out.settings.theme, 'dark');
  assert.equal(out.profile.studentId, '22303062');
  assert.equal(out.skills[0].progress, 55);
  const csc = out.courses.find(x => x.code === 'CSC 465');
  const rows = out.attendance.filter(a => a.courseId === csc.id);
  assert.equal(rows.length, 14);
  assert.equal(rows.filter(a => a.status === 'present').length, 12);
  assert.equal(rows.filter(a => a.status === 'absent').length, 2);
});

t('migrate repairs junk payloads', () => {
  const out = storage.migrate({ tasks: 'nope', courses: [{ code: null }], attendance: 'x' });
  assert.equal(out.version, 4);
  assert.ok(Array.isArray(out.tasks));
  assert.ok(Array.isArray(out.attendance));
});

t('migrate is idempotent on its own output', () => {
  const once = storage.migrate({ tasks: [], att: { 'EEN 184': { p: 1, a: 0 } } });
  const twice = storage.migrate(JSON.parse(JSON.stringify(once)));
  assert.equal(twice.courses.length, once.courses.length);
  assert.equal(twice.attendance.length, once.attendance.length);
  assert.equal(twice.version, 4);
});

t('validateBackup rejects malformed payloads', () => {
  assert.equal(storage.validateBackup(null).ok, false);
  assert.equal(storage.validateBackup('{}').ok, false);
  assert.equal(storage.validateBackup({ random: true }).ok, false);
  assert.equal(storage.validateBackup({ profile: {}, semesters: [], courses: [], routine: [], version: 99 }).ok, false);
  assert.equal(storage.validateBackup(storage.defaultState()).ok, true);
});

t('export payload round-trips', () => {
  const s = storage.defaultState();
  const json = storage.exportPayload(s);
  const back = JSON.parse(json);
  assert.equal(storage.validateBackup(back).ok, true);
  assert.equal(back.courses.length, s.courses.length);
});

console.log('\n' + pass + ' checks passed' + (process.exitCode ? ' (with failures)' : '.'));
