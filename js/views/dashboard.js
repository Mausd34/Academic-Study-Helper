/**
 * Dashboard — the daily briefing.
 * Greeting, live clock, today's classes, smart priorities and key stats.
 */
import { esc, greeting, currentTimeString, todayKey, formatDate, formatHours, formatMoney, formatClock, daysUntil } from '../core/utils.js';
import { getState, activeSemester } from '../core/store.js';
import { todayClassesWithStatus, nextClass, minutesUntilNext } from '../core/routine.js';
import { attendanceTotals, taskCounts, studyStats, expenseTotals, skillAverage, weeklyStudyMinutes } from '../core/analytics.js';
import { buildPriorities, attendanceRisks } from '../core/recommend.js';
import { ringChart, barChart } from '../core/charts.js';
import { card, emptyState, badge, progressBar, classRow, deadlineList, goalList, statRow, attach } from '../core/parts.js';

const PRIORITY_TONE = { exam: 'danger', task: 'warning', attendance: 'danger', skill: 'info', consistency: 'muted' };

function priorityRow(item, index) {
  return `
    <li class="priority-row">
      <span class="priority-rank">${index + 1}</span>
      <span class="priority-body">
        <strong>${esc(item.label)}</strong>
        <small>${esc(item.reasons.join(' · '))}</small>
      </span>
      ${badge(`${item.kind}`, PRIORITY_TONE[item.kind] || 'muted')}
    </li>`;
}

function riskList(risks) {
  return `<ul class="risk-list">${risks.map((r) => `
    <li>
      <div class="risk-head"><strong>${esc(r.code)}</strong>${badge(`${r.forecast.current}%`, r.forecast.status === 'below' ? 'danger' : 'warning')}</div>
      ${progressBar(r.forecast.current, r.forecast.status === 'below' ? 'danger' : 'warn')}
      <small class="muted">${esc(r.forecast.status === 'below'
    ? `${r.forecast.neededToRecover} more present class${r.forecast.neededToRecover === 1 ? '' : 'es'} to reach ${r.forecast.target}%`
    : `You can still miss ${r.forecast.missableAhead} class${r.forecast.missibleAhead === 1 ? '' : 'es'}`)}</small>
    </li>`).join('')}</ul>`;
}


export function renderDashboard(root) {
  const state = getState();
  const now = new Date();
  const semester = activeSemester();
  const classes = todayClassesWithStatus(state, now);
  const next = nextClass(state, now);
  const untilNext = minutesUntilNext(state, now);
  const attendance = attendanceTotals(state);
  const tasks = taskCounts(state);
  const study = studyStats(state);
  const expenses = expenseTotals(state);
  const priorities = buildPriorities(state, { limit: 5 });
  const risks = attendanceRisks(state);
  const skillAvg = skillAverage(state);
  const nextExam = (state.exams || [])
    .filter((e) => (daysUntil(e.date) ?? -1) >= 0)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))[0];

  root.innerHTML = `
    <section class="hero card">
      <div class="hero-main">
        <p class="hero-date">${esc(formatDate(todayKey(), { weekday: 'long' }))} · <span id="liveClock">${esc(currentTimeString(now))}</span></p>
        <h2>${esc(greeting(now))}, ${esc(state.profile.name.split(' ')[0] || 'there')} 👋</h2>
        <p class="hero-sub">${esc(semester?.name || 'No active semester')} · ${esc(state.profile.university)} · ${esc(state.profile.department)}</p>
        <div class="hero-chips">
          ${classes.length ? badge(`${classes.length} class${classes.length === 1 ? '' : 'es'} today`, 'info') : badge('No classes today', 'muted')}
          ${next && untilNext !== null ? badge(`Next: ${esc(next.course.code)} ${untilNext <= 0 ? 'now' : `in ${formatClock(untilNext * 60)}`}`, 'live') : ''}
          ${tasks.overdue ? badge(`${tasks.overdue} overdue`, 'danger') : ''}
        </div>
      </div>
      <div class="hero-ring">${ringChart(attendance.percent, { label: 'attendance', tone: attendance.percent >= 75 ? '#10b981' : '#ef4444' })}</div>
    </section>

    ${statRow([
    { label: 'Attendance', value: `${attendance.percent}%`, sub: `${attendance.present}/${attendance.total} classes`, tone: attendance.percent >= 75 ? 'ok' : 'warn' },
    { label: 'Tasks', value: `${tasks.completed}/${tasks.total}`, sub: `${tasks.pending} pending · ${tasks.overdue} overdue`, tone: tasks.overdue ? 'warn' : '' },
    { label: 'Study time', value: formatHours(study.todayMinutes), sub: `${formatHours(study.weekMinutes)} this week` },
    { label: 'Expenses', value: formatMoney(expenses.month), sub: `${formatMoney(expenses.week)} this week` },
    { label: 'Skills', value: `${skillAvg}%`, sub: `${state.skills.length} tracked` },
    { label: 'Next exam', value: nextExam ? `${daysUntil(nextExam.date)}d` : '—', sub: nextExam ? `${nextExam.type}` : 'None scheduled', tone: nextExam && daysUntil(nextExam.date) <= 3 ? 'warn' : '' },
  ])}

    <div class="dash-grid">
      ${card("Today's classes", classes.length
    ? `<ul class="class-list">${classes.map((c) => classRow(c)).join('')}</ul>`
    : emptyState('No classes today', 'Use the free time for a focus session or revision.', '<button class="btn primary" data-go="study">Start studying</button>'),
    { subtitle: esc(formatDate(todayKey(), { weekday: 'long' })), actions: '<button class="btn small" data-go="routine">Full routine</button>' })}

      ${card("Today's priority", priorities.length
    ? `<ol class="priority-list">${priorities.map(priorityRow).join('')}</ol>
       <p class="muted small">Scored from exam dates, deadlines, attendance risk and study history.</p>`
    : emptyState('Nothing urgent', 'No exam, deadline or attendance risk needs you right now.'),
    { subtitle: 'Ranked by urgency and impact' })}

      ${card('Weekly study hours', barChart(
    weeklyStudyMinutes(state).map((d) => ({ label: d.label, value: Math.round((d.value / 60) * 10) / 10 })),
    { height: 150, format: (v) => `${v}h` },
  ), { subtitle: `${formatHours(study.weekMinutes)} in the last 7 days`, actions: '<button class="btn small" data-go="study">Log session</button>' })}

      ${risks.length
    ? card('Attendance warnings', riskList(risks), { subtitle: 'At or below your target' })
    : card('Attendance', `<div class="all-clear">${ringChart(attendance.percent, { label: 'overall', tone: '#10b981' })}<p class="muted">Every course is above target. Keep it up.</p></div>`, { actions: '<button class="btn small" data-go="attendance">Details</button>' })}

      ${card('Upcoming deadlines', deadlineList(state), { actions: '<button class="btn small" data-go="tasks">All tasks</button>' })}

      ${card('Career progress', goalList(state.careerGoals), { actions: '<button class="btn small" data-go="career">Roadmap</button>' })}
    </div>`;

  startLiveClock();
  // Detach any listeners left by a previous dashboard render.
  attach(root, () => {});
}

/** Keep the header clock fresh without re-rendering the whole view. */
let clockHandle = null;
function startLiveClock() {
  clearInterval(clockHandle);
  clockHandle = setInterval(() => {
    const el = document.getElementById('liveClock');
    if (!el) { clearInterval(clockHandle); return; }
    el.textContent = currentTimeString(new Date());
  }, 1000);
}
