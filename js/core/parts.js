/**
 * Small shared presentational pieces reused by several views.
 */
import { esc, formatDate, daysUntil, formatHours, formatMoney } from './utils.js';
import { card, emptyState, badge, progressBar, statCard, segmented } from './ui.js';
import { ringChart } from './charts.js';

export const CLASS_STATUS = {
  current: { label: 'Now', tone: 'live' },
  upcoming: { label: 'Next', tone: 'info' },
  done: { label: 'Done', tone: 'muted' },
  absent: { label: 'Absent', tone: 'danger' },
};

/** A single class row used on the dashboard and the routine page. */
export function classRow(entry, { showDate = false, dateKey = '' } = {}) {
  const meta = CLASS_STATUS[entry.status] || CLASS_STATUS.upcoming;
  return `
    <li class="class-row ${esc(entry.status)}" style="--course:${esc(entry.course.color || '#635bff')}">
      <span class="class-time">${esc(entry.start)}<small>${esc(entry.end)}</small></span>
      <span class="class-info">
        <strong>${esc(entry.course.code)}${showDate ? ` <span class="muted">· ${esc(formatDate(dateKey, { weekday: 'short' }))}</span>` : ''}</strong>
        <small>${esc(entry.course.title)} · Section ${esc(entry.course.section || '—')} · Room ${esc(entry.room || 'TBA')}</small>
      </span>
      ${badge(meta.label, meta.tone)}
    </li>`;
}

/** Deadline list mixing exams and tasks, soonest first. */
export function deadlineList(state, limit = 5) {
  const rows = [
    ...(state.exams || []).map((e) => ({ ...e, kind: 'exam', when: e.date })),
    ...(state.tasks || []).filter((t) => t.status !== 'completed' && t.dueDate).map((t) => ({ ...t, kind: 'task', when: t.dueDate })),
  ]
    .map((row) => ({ ...row, days: daysUntil(row.when) }))
    .filter((row) => row.days !== null && row.days >= 0)
    .sort((a, b) => a.days - b.days)
    .slice(0, limit);

  if (!rows.length) {
    return emptyState('No deadlines', 'Add an exam or assignment and it will appear here.');
  }

  return `<ul class="deadline-list">${rows.map((row) => {
    const course = (state.courses || []).find((c) => c.id === row.courseId);
    const tone = row.days === 0 ? 'danger' : row.days <= 3 ? 'warning' : 'muted';
    return `<li>
      <span class="deadline-kind ${row.kind}">${row.kind === 'exam' ? 'EX' : 'TS'}</span>
      <span class="deadline-body">
        <strong>${esc(row.title || row.type || 'Untitled')}</strong>
        <small>${esc(course?.code || '')} · ${esc(formatDate(row.when))}</small>
      </span>
      ${badge(row.days === 0 ? 'Today' : `${row.days}d`, tone)}
    </li>`;
  }).join('')}</ul>`;
}

/** Goal progress rows. */
export function goalList(goals, limit = 4) {
  if (!goals?.length) return emptyState('No goals yet', 'Add a career goal to track progress.');
  return `<ul class="goal-list">${goals.slice(0, limit).map((goal) => `
    <li>
      <div class="skill-head"><span>${esc(goal.name)}</span><span>${Math.round(goal.progress)}%</span></div>
      ${progressBar(goal.progress)}
    </li>`).join('')}</ul>`;
}

/** Compact stat row used at the top of several pages. */
export const statRow = (items) => `<section class="stat-grid">${items
  .map((item) => statCard(item.label, item.value, item.sub || '', item.tone || ''))
  .join('')}</section>`;

export { card, emptyState, badge, progressBar, statCard, segmented, ringChart, esc, formatDate, formatHours, formatMoney };
