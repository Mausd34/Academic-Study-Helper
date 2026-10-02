/**
 * Command palette + global search.
 * One Ctrl+K entry point for both navigation and data.
 */
import { esc, matches } from './utils.js';
import { getState } from './store.js';
import { formatDate } from './utils.js';
import { go, currentRoute } from './router.js';
import { toastErr } from './ui.js';

let results = [];
let cursor = 0;
let opener = null;

export const NAV = [
  { key: 'dashboard', label: 'Dashboard', icon: '⌂', group: 'Pages' },
  { key: 'routine', label: 'Routine', icon: '▦', group: 'Pages' },
  { key: 'attendance', label: 'Attendance', icon: '✓', group: 'Pages' },
  { key: 'tasks', label: 'Assignments', icon: '☑', group: 'Pages' },
  { key: 'exams', label: 'Exams', icon: '✎', group: 'Pages' },
  { key: 'study', label: 'Study Timer', icon: '⏱', group: 'Pages' },
  { key: 'notes', label: 'Notes', icon: '✎', group: 'Pages' },
  { key: 'expenses', label: 'Expenses', icon: '৳', group: 'Pages' },
  { key: 'skills', label: 'Skills', icon: '⚡', group: 'Pages' },
  { key: 'career', label: 'Career', icon: '🚀', group: 'Pages' },
  { key: 'learning', label: 'Learning Plan', icon: '🧭', group: 'Pages' },
  { key: 'coding', label: 'Coding Practice', icon: '⌨', group: 'Pages' },
  { key: 'calendar', label: 'Calendar', icon: '📅', group: 'Pages' },
  { key: 'assistant', label: 'AI Assistant', icon: '✦', group: 'Pages' },
  { key: 'analytics', label: 'Analytics', icon: '📊', group: 'Pages' },
  { key: 'settings', label: 'Settings', icon: '⚙', group: 'Pages' },
];

/** Quick actions surfaced in the palette. */
export const ACTIONS = [
  { id: 'add-task', label: 'Add task', hint: 'Assignments', run: () => import('../views/tasks.js').then((m) => m.openTaskForm()) },
  { id: 'add-note', label: 'Add note', hint: 'Notes', run: () => import('../views/notes.js').then((m) => m.openNoteForm()) },
  { id: 'add-exam', label: 'Add exam', hint: 'Exams', run: () => import('../views/exams.js').then((m) => m.openExamForm()) },
  { id: 'add-expense', label: 'Add expense', hint: 'Expenses', run: () => import('../views/expenses.js').then((m) => m.openExpenseForm()) },
  { id: 'add-session', label: 'Log study session', hint: 'Study', run: () => import('../views/study.js').then((m) => m.openSessionForm()) },
  { id: 'add-problem', label: 'Log coding problem', hint: 'Coding', run: () => import('../views/coding.js').then((m) => m.openProblemForm()) },
  { id: 'add-attendance', label: 'Add attendance record', hint: 'Attendance', run: () => import('../views/attendance.js').then((m) => m.openAttendanceForm()) },
  { id: 'add-skill', label: 'Add skill', hint: 'Skills', run: () => import('../views/skills.js').then((m) => m.openSkillForm()) },
  { id: 'start-focus', label: 'Start a 25-minute focus session', hint: 'Timer', run: () => import('../views/study.js').then((m) => { go('study'); m.startFocus(); }) },
  { id: 'export', label: 'Export JSON backup', hint: 'Data', run: () => import('../views/settings.js').then((m) => m.exportBackup()) },
];

/** Search across tasks, notes, courses, exams and coding problems. */
function searchData(query) {
  const state = getState();
  const out = [];
  const courseOf = (id) => state.courses.find((c) => c.id === id)?.code || '';

  for (const task of state.tasks || []) {
    if (matches(`${task.title} ${task.description} ${courseOf(task.courseId)}`, query)) {
      out.push({ group: 'Tasks', label: task.title, hint: `${courseOf(task.courseId)}${task.dueDate ? ` · due ${formatDate(task.dueDate)}` : ''}`, go: () => go('tasks') });
    }
  }
  for (const note of state.notes || []) {
    if (matches(`${note.title} ${note.topic} ${note.content} ${(note.tags || []).join(' ')}`, query)) {
      out.push({ group: 'Notes', label: note.title, hint: `${courseOf(note.courseId)}${note.topic ? ` · ${note.topic}` : ''}`, go: () => go('notes') });
    }
  }
  for (const course of state.courses || []) {
    if (matches(`${course.code} ${course.title}`, query)) {
      out.push({ group: 'Courses', label: `${course.code} — ${course.title}`, hint: `Section ${course.section || '—'}`, go: () => go('routine') });
    }
  }
  for (const exam of state.exams || []) {
    if (matches(`${exam.title} ${exam.type} ${courseOf(exam.courseId)}`, query)) {
      out.push({ group: 'Exams', label: exam.title || exam.type, hint: `${formatDate(exam.date)}`, go: () => go('exams') });
    }
  }
  for (const problem of state.coding || []) {
    if (matches(`${problem.problem} ${problem.platform} ${problem.topic}`, query)) {
      out.push({ group: 'Coding', label: problem.problem, hint: `${problem.platform} · ${problem.difficulty}`, go: () => go('coding') });
    }
  }
  return out;
}


/* ------------------------------------------------------------------ render */

function rowHtml(item, index) {
  return `<button class="palette-row ${index === cursor ? 'active' : ''}" data-index="${index}" role="option" aria-selected="${index === cursor}">
    <span class="palette-icon" aria-hidden="true">${esc(item.icon || '→')}</span>
    <span class="palette-label">${esc(item.label)}</span>
    ${item.hint ? `<span class="palette-hint">${esc(item.hint)}</span>` : ''}
  </button>`;
}

function paint() {
  const list = document.getElementById('paletteResults');
  if (!list) return;
  if (!results.length) {
    list.innerHTML = '<div class="palette-empty">No matches. Try a page name, a task or a note.</div>';
    return;
  }
  let html = '';
  let group = null;
  results.forEach((item, index) => {
    if (item.group !== group) {
      group = item.group;
      html += `<div class="palette-group">${esc(group)}</div>`;
    }
    html += rowHtml(item, index);
  });
  list.innerHTML = html;
  list.querySelector('.palette-row.active')?.scrollIntoView({ block: 'nearest' });
}

function compute(query) {
  const q = query.trim();
  if (!q) {
    return [
      ...ACTIONS.slice(0, 5).map((a) => ({ group: 'Quick actions', label: a.label, hint: a.hint, icon: '⚡', run: a.run })),
      ...NAV.map((n) => ({ group: 'Pages', label: n.label, hint: '', icon: n.icon, go: () => go(n.key) })),
    ];
  }
  const pages = NAV.filter((n) => matches(n.label, q)).map((n) => ({ group: 'Pages', label: n.label, icon: n.icon, go: () => go(n.key) }));
  const actions = ACTIONS.filter((a) => matches(`${a.label} ${a.hint}`, q)).map((a) => ({ group: 'Quick actions', label: a.label, hint: a.hint, icon: '⚡', run: a.run }));
  const data = searchData(q).slice(0, 12).map((d) => ({ ...d, icon: '•' }));
  return [...actions, ...pages, ...data];
}

function open(initial = '') {
  const root = document.getElementById('paletteRoot');
  const input = document.getElementById('paletteInput');
  if (!root || !input) return;
  opener = document.activeElement;
  root.hidden = false;
  document.body.classList.add('modal-open');
  input.value = initial;
  cursor = 0;
  results = compute(initial);
  paint();
  input.focus();
  input.select();
}

export function closePalette() {
  const root = document.getElementById('paletteRoot');
  if (!root || root.hidden) return;
  root.hidden = true;
  document.body.classList.remove('modal-open');
  if (opener && document.contains(opener)) opener.focus();
  opener = null;
}

export const isPaletteOpen = () => {
  const root = document.getElementById('paletteRoot');
  return Boolean(root && !root.hidden);
};

export const togglePalette = (initial) => (isPaletteOpen() ? closePalette() : open(initial));

function run(index) {
  const item = results[index];
  if (!item) return;
  closePalette();
  if (item.go) item.go();
  else if (item.run) item.run().catch((error) => { console.error(error); toastErr('That action could not be completed.'); });
}

/** Wire the palette. Safe to call once at boot. */
export function initPalette() {
  const root = document.getElementById('paletteRoot');
  const input = document.getElementById('paletteInput');
  if (!root || !input) return;

  input.addEventListener('input', () => {
    cursor = 0;
    results = compute(input.value);
    paint();
  });

  input.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown') { event.preventDefault(); cursor = Math.min(cursor + 1, results.length - 1); paint(); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); cursor = Math.max(cursor - 1, 0); paint(); }
    else if (event.key === 'Enter') { event.preventDefault(); run(cursor); }
    else if (event.key === 'Escape') { event.preventDefault(); closePalette(); }
  });

  root.addEventListener('click', (event) => {
    if (event.target.closest('[data-close-palette]')) return closePalette();
    const row = event.target.closest('[data-index]');
    if (row) run(Number(row.dataset.index));
  });
}
