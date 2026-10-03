/**
 * Attendance — per-course tracking, history, and the "how many can I miss"
 * forecast against the configured target.
 */
import { esc, todayKey, formatDate, percent, sortBy, clamp } from '../core/utils.js';
import { getState, list, update, setSetting } from '../core/store.js';
import { attendanceSummary, attendanceTotals } from '../core/analytics.js';
import { attendanceForecast, WEIGHTS } from '../core/recommend.js';
import { hBarChart, donutChart, ringChart } from '../core/charts.js';
import { openModal, buildForm, bindForm, closeModal, confirmDialog, toastOk, toastErr } from '../core/ui.js';
import { attendanceFields } from '../core/forms.js';
import { card, emptyState, badge, progressBar, statRow, attach } from '../core/parts.js';

let filterCourse = 'all';
let showHistory = false;

const TONE = { safe: 'success', risk: 'warning', below: 'danger', empty: 'muted' };

function courseCard(row, target) {
  const f = attendanceForecast({ present: row.present, absent: row.absent, total: row.total, target });
  return `
    <article class="card att-card" style="--course:${esc(row.color || '#635bff')}">
      <header class="att-head">
        <div>
          <h3>${esc(row.code)}</h3>
          <p class="muted small">${esc(row.title)}</p>
        </div>
        ${badge(`${f.current}%`, TONE[f.status])}
      </header>
      ${progressBar(f.current, f.status === 'below' ? 'danger' : f.status === 'risk' ? 'warn' : '')}
      <p class="att-meta">
        <span>${row.present} present</span><span>${row.absent} absent</span><span>${row.total} total</span>
      </p>
      <p class="att-note ${f.status}">${esc(f.status === 'empty'
    ? 'No records yet — mark your first class.'
    : f.status === 'below'
      ? `${f.neededToRecover} more present class${f.neededToRecover === 1 ? '' : 'es'} to reach ${f.target}%`
      : f.status === 'risk'
        ? `At risk — only ${f.missableAhead} more miss${f.missableAhead === 1 ? '' : 'es'} allowed`
        : `Safe — you can miss ${f.missableAhead} more class${f.missibleAhead === 1 ? '' : 'es'}`)}</p>
      <div class="row-actions">
        <button class="btn small primary" data-mark="present" data-course="${esc(row.courseId)}">Present</button>
        <button class="btn small danger" data-mark="absent" data-course="${esc(row.courseId)}">Absent</button>
        <button class="btn small ghost" data-undo="${esc(row.courseId)}">Undo</button>
        <button class="btn small ghost" data-edit-course="${esc(row.courseId)}">Edit</button>
      </div>
    </article>`;
}

function historyTable(state, courseId) {
  const rows = sortBy(
    state.attendance.filter((a) => !courseId || a.courseId === courseId),
    { key: 'date', dir: 'desc' },
  ).slice(0, 40);
  if (!rows.length) {
    return emptyState('No attendance records', 'Mark a class present or absent to build the history.');
  }
  const courses = new Map(state.courses.map((c) => [c.id, c]));
  return `<div class="table-wrap"><table class="data-table">
    <thead><tr><th scope="col">Date</th><th scope="col">Course</th><th scope="col">Status</th><th scope="col">Note</th><th scope="col"></th></tr></thead>
    <tbody>${rows.map((row) => `<tr>
      <td>${esc(formatDate(row.date))}</td>
      <td>${esc(courses.get(row.courseId)?.code || 'Unassigned')}</td>
      <td>${badge(row.status === 'absent' ? 'Absent' : row.status === 'excused' ? 'Excused' : 'Present', TONE[row.status === 'absent' ? 'below' : 'safe'])}</td>
      <td class="muted">${esc(row.note || '—')}</td>
      <td><button class="btn small ghost" data-del-att="${esc(row.id)}">Delete</button></td>
    </tr>`).join('')}</tbody>
  </table></div>`;
}

/* ---------------------------------------------------------------- actions */

function markAttendance(courseId, status) {
  if (!courseId) return toastErr('Pick a course first.');
  update((draft) => {
    const today = todayKey();
    // One record per course per day: update instead of duplicating.
    const existing = draft.attendance.find((a) => a.courseId === courseId && a.date === today && !a.scheduleId);
    if (existing) {
      existing.status = status;
      return;
    }
    draft.attendance.push({
      id: `att_${Date.now().toString(36)}`,
      courseId,
      date: today,
      status,
      note: '',
    });
  });
  toastOk(status === 'present' ? 'Attendance updated — present.' : 'Attendance updated — absent.');
}

function undoAttendance(courseId) {
  let removed = false;
  update((draft) => {
    const before = draft.attendance.length;
    draft.attendance = draft.attendance.filter((a) => !(a.courseId === courseId && a.date === todayKey()));
    removed = draft.attendance.length < before;
  });
  if (removed) toastOk('Last record removed.');
  else toastErr('Nothing to undo for today.');
}

export function openAttendanceForm(id) {
  const existing = id ? list.find('attendance', id) : null;
  const fields = attendanceFields(existing || {});
  openModal({
    title: existing ? 'Edit attendance' : 'Add attendance record',
    body: buildForm(fields, { submitLabel: existing ? 'Save changes' : 'Add record' }),
    onMount: (modal) => {
      bindForm(modal.querySelector('form'), fields, (values) => {
        if (existing) {
          list.patch('attendance', id, values);
          toastOk('Attendance record updated.');
        } else {
          list.add('attendance', values);
          toastOk('Attendance record added.');
        }
        closeModal();
      });
    },
  });
}

export function renderAttendance(root) {
  const state = getState();
  const target = clamp(state.settings.attendanceTarget ?? 75, 0, 100);
  const summary = attendanceSummary(state);
  const totals = attendanceTotals(state);
  const visible = filterCourse === 'all' ? summary : summary.filter((row) => row.courseId === filterCourse);
  const overall = attendanceForecast({ present: totals.present, absent: totals.absent, total: totals.total, target });

  root.innerHTML = `
    ${statRow([
    { label: 'Overall', value: `${totals.percent}%`, sub: `${totals.present}/${totals.total} classes`, tone: TONE[overall.status] },
    { label: 'Target', value: `${target}%`, sub: overall.status === 'below' ? 'below target' : 'on track', tone: overall.status === 'below' ? 'warn' : 'ok' },
    { label: 'Present', value: String(totals.present), sub: 'classes attended' },
    { label: 'Absent', value: String(totals.absent), sub: 'classes missed' },
  ])}

    ${card('Attendance by course', hBarChart(
    summary.filter((r) => r.total > 0).map((r) => ({ label: r.code, value: r.percent, color: r.color })),
    { format: (v) => `${v}%` },
  ), { subtitle: `Target is ${target}%`, actions: '<button class="btn small" data-add-att>+ Record</button>' })}

    ${card('Set target', `<div class="target-row">
        <label for="attTarget">Required attendance</label>
        <input id="attTarget" type="range" min="0" max="100" step="5" value="${target}">
        <output id="attTargetOut">${target}%</output>
      </div>
      <p class="muted small">Changing the target recalculates every warning and forecast instantly.</p>`)}

    <div class="att-grid">${visible.length
    ? visible.map((row) => courseCard(row, target)).join('')
    : emptyState('No attendance data', 'Mark your first class to start tracking.')}</div>

    ${card('History', `<div class="filter-row">
        <button class="btn small ${filterCourse === 'all' ? 'primary' : 'ghost'}" data-filter="all">All courses</button>
        ${summary.map((r) => `<button class="btn small ${filterCourse === r.courseId ? 'primary' : 'ghost'}" data-filter="${esc(r.courseId)}">${esc(r.code)}</button>`).join('')}
      </div><div style="margin-top:12px">${historyTable(state, filterCourse === 'all' ? null : filterCourse)}</div>`,
    { subtitle: 'Most recent 40 records' })}`;

  wire(root);
}

function wire(root) {
  attach(root, ({ signal }) => {
    root.addEventListener('input', (event) => {
      if (event.target.id !== 'attTarget') return;
      const value = Number(event.target.value);
      const out = document.getElementById('attTargetOut');
      if (out) out.textContent = `${value}%`;
      setSetting('attendanceTarget', value);
    }, { signal });

    root.addEventListener('click', async (event) => {
      const el = event.target.closest('button');
      if (!el) return;
      if (el.dataset.mark) return markAttendance(el.dataset.course, el.dataset.mark);
      if (el.dataset.undo) return undoAttendance(el.dataset.undo);
      if (el.dataset.filter) { filterCourse = el.dataset.filter; return renderAttendance(root); }
      if (el.dataset.editCourse) return openAttendanceForm(null);
      if (el.dataset.delAtt) {
        const ok = await confirmDialog({ title: 'Delete record?', message: 'This attendance record will be removed.', confirmLabel: 'Delete' });
        if (ok) { list.remove('attendance', el.dataset.delAtt); toastOk('Record deleted.'); }
        return;
      }
      if (el.hasAttribute('data-add-att')) return openAttendanceForm();
    }, { signal });
  });
}
