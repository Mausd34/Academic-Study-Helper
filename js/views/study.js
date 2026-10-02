/**
 * Study — Pomodoro timer plus the study-session log and analytics.
 */
import { esc, formatClock, formatHours, formatDate, todayKey, sortBy, toNumber } from '../core/utils.js';
import { getState, list } from '../core/store.js';
import { studyStats, weeklyStudyMinutes, monthlyStudySeries, minutesOn } from '../core/analytics.js';
import { createTimer, setMode, reset, skip, toggle, timerProgress, MODES } from '../core/timer.js';
import { barChart, lineChart, hBarChart } from '../core/charts.js';
import { openModal, buildForm, bindForm, closeModal, confirmDialog, toastOk, toastErr, notify } from '../core/ui.js';
import { sessionFields } from '../core/forms.js';
import { card, emptyState, badge, statRow } from '../core/parts.js';

const timer = createTimer(getState().settings.pomodoro);
let rootRef = null;

const courseName = (state, id) => state.courses.find((c) => c.id === id)?.code || 'Unassigned';

/* ------------------------------------------------------------------ timer */

function tick() {
  if (!rootRef || !document.getElementById('timerValue')) return;
  document.getElementById('timerValue').textContent = formatClock(timer.secondsLeft);
  const bar = document.getElementById('timerBar');
  if (bar) bar.style.width = `${timerProgress(timer)}%`;
  const status = document.getElementById('timerStatus');
  if (status) status.textContent = timer.running ? 'In progress…' : 'Paused';
  const label = document.getElementById('timerMode');
  if (label) label.textContent = MODES[timer.mode].label;
  const btn = document.getElementById('timerToggle');
  if (btn) btn.textContent = timer.running ? 'Pause' : 'Start';
}

function onComplete(mode) {
  const minutes = Math.round(timer.totalSeconds / 60);
  if (mode === 'focus') {
    list.add('studySessions', {
      courseId: '',
      topic: 'Focus session',
      date: todayKey(),
      start: '',
      end: '',
      minutes,
      rating: 0,
      notes: 'Completed from the Pomodoro timer.',
    });
    toastOk(`Focus session complete 🎉 ${minutes} minutes logged.`);
  } else {
    toastOk('Break finished. Back to work!');
  }
  notify(mode === 'focus' ? 'Focus session complete 🎉' : 'Break over', `${minutes} minutes logged.`);
  if (rootRef) renderStudy(rootRef);
}

timer.onTick = tick;

/* ---------------------------------------------------------------- actions */

export function openSessionForm(id) {
  const existing = id ? list.find('studySessions', id) : null;
  const fields = sessionFields(existing || {});
  openModal({
    title: existing ? 'Edit study session' : 'Log study session',
    body: buildForm(fields, { submitLabel: existing ? 'Save changes' : 'Log session' }),
    onMount: (modal) => {
      bindForm(modal.querySelector('form'), fields, (values) => {
        if (!values.topic) return toastErr('Tell the app what you studied.');
        if (!values.minutes || values.minutes <= 0) return toastErr('Duration must be greater than zero.');
        if (existing) {
          list.patch('studySessions', id, values);
          toastOk('Session updated.');
        } else {
          list.add('studySessions', values);
          toastOk('Study session logged.');
        }
        closeModal();
      });
    },
  });
}

async function removeSession(id) {
  const ok = await confirmDialog({ title: 'Delete session?', message: 'This study session will be removed from your log.', confirmLabel: 'Delete' });
  if (!ok) return;
  list.remove('studySessions', id);
  toastOk('Session deleted.');
}

function timerPanel() {
  const mode = MODES[timer.mode];
  return `
    <section class="card timer-card tone-${mode.tone}">
      <p class="timer-mode" id="timerMode">${esc(mode.label)}</p>
      <div class="timer" id="timerValue" role="timer">${formatClock(timer.secondsLeft)}</div>
      <div class="progress timer-track"><i id="timerBar" style="width:${timerProgress(timer)}%"></i></div>
      <p class="muted small" id="timerStatus">${timer.running ? 'In progress…' : 'Paused'}</p>
      <div class="timer-controls">
        <button class="btn primary" id="timerToggle" data-timer="toggle">${timer.running ? 'Pause' : 'Start'}</button>
        <button class="btn" data-timer="reset">Reset</button>
        <button class="btn" data-timer="skip">Skip</button>
      </div>
      <div class="mode-switch" role="group" aria-label="Timer mode">
        ${Object.values(MODES).map((m) => `<button class="btn small ${timer.mode === m.key ? 'primary' : 'ghost'}" data-mode="${m.key}">${esc(m.label)} (${timer.durations[m.key]}m)</button>`).join('')}
      </div>
      <p class="muted small">Completed focus sessions: <strong>${timer.completedFocusSessions}</strong> · After 4 focus blocks you get a long break.</p>
    </section>`;
}

timer.onComplete = onComplete;


export function renderStudy(root) {
  rootRef = root;
  const state = getState();
  const stats = studyStats(state);
  const week = weeklyStudyMinutes(state);
  const topCourse = state.courses.find((c) => c.id === stats.topCourseId);
  const sessions = sortBy(state.studySessions, { key: 'date', dir: 'desc' }).slice(0, 12);
  const totals = state.studySessions.reduce((map, s) => {
    map.set(s.courseId, (map.get(s.courseId) || 0) + toNumber(s.minutes));
    return map;
  }, new Map());
  const byCourse = [...totals.entries()]
    .map(([courseId, value]) => ({ label: courseName(state, courseId), value: Math.round(value / 60) }))
    .sort((a, b) => b.value - a.value);

  root.innerHTML = `
    ${statRow([
    { label: 'Today', value: formatHours(minutesOn(state, todayKey())), sub: 'focus time' },
    { label: 'This week', value: formatHours(stats.weekMinutes), sub: `${formatHours(stats.averageMinutes)} avg session` },
    { label: 'Total', value: formatHours(stats.totalMinutes), sub: `${stats.sessionCount} sessions` },
    { label: 'Top course', value: topCourse ? topCourse.code : '—', sub: formatHours(stats.topCourseMinutes) },
  ])}

    <div class="study-grid">
      ${timerPanel()}

      ${card('This week', barChart(week.map((d) => ({ label: d.label, value: Math.round(d.value / 6) / 10 })), { height: 150, format: (v) => `${v}h` }),
    { subtitle: formatHours(stats.weekMinutes) })}

      ${card('Monthly trend', lineChart(monthlyStudySeries(state, 6), { height: 150, format: (v) => `${v}h` }))}

      ${card('By course', byCourse.length
    ? hBarChart(byCourse, { format: (v) => `${v}h` })
    : emptyState('No sessions yet', 'Finish a focus block or log a session to see your breakdown.'))}
    </div>

    ${card('Study log', sessions.length
    ? `<div class="table-wrap"><table class="data-table">
        <thead><tr><th scope="col">Date</th><th scope="col">Course</th><th scope="col">Topic</th><th scope="col">Duration</th><th scope="col">Focus</th><th scope="col"></th></tr></thead>
        <tbody>${sessions.map((s) => `<tr>
          <td>${esc(formatDate(s.date))}</td>
          <td>${esc(courseName(state, s.courseId))}</td>
          <td>${esc(s.topic)}</td>
          <td>${esc(formatHours(s.minutes))}</td>
          <td>${s.rating ? badge(`${s.rating}/5`, s.rating >= 4 ? 'success' : 'muted') : '<span class="muted">—</span>'}</td>
          <td class="row-actions">
            <button class="btn small ghost" data-edit-session="${esc(s.id)}">Edit</button>
            <button class="btn small danger" data-del-session="${esc(s.id)}">Delete</button>
          </td>
        </tr>`).join('')}</tbody>
      </table></div>`
    : emptyState('No study sessions yet', 'Start the timer above or log a session manually.', '<button class="btn primary" data-add-session>Log session</button>'),
    { subtitle: 'Most recent 12', actions: '<button class="btn primary small" data-add-session>+ Log session</button>' })}`;

  tick();
  wire(root);
}

function wire(root) {
  root.addEventListener('click', async (event) => {
    const el = event.target.closest('button');
    if (!el) return;
    if (el.dataset.timer === 'toggle') return void toggle(timer);
    if (el.dataset.timer === 'reset') return void reset(timer);
    if (el.dataset.timer === 'skip') return void skip(timer);
    if (el.dataset.mode) return void setMode(timer, el.dataset.mode);
    if (el.hasAttribute('data-add-session')) return openSessionForm();
    if (el.dataset.editSession) return openSessionForm(el.dataset.editSession);
    if (el.dataset.delSession) return removeSession(el.dataset.delSession);
  });
}

/** Used by the command palette to jump straight into a focus block. */
export function startFocus() {
  setMode(timer, 'focus');
  toggle(timer);
  tick();
}
