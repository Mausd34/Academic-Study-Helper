/**
 * Analytics — one page with every chart the app can draw.
 */
import { esc, formatHours, formatMoney } from '../core/utils.js';
import { getState } from '../core/store.js';
import {
  attendanceTotals, attendanceSummary, taskCounts, taskCompletionSeries,
  weeklyStudyMinutes, monthlyStudySeries, studyStats,
  expenseTotals, expenseByCategory, monthlyExpenseSeries,
  codingStats, skillAverage, skillByGroup,
} from '../core/analytics.js';
import { barChart, hBarChart, lineChart, donutChart, stackedBar, ringChart } from '../core/charts.js';
import { buildPriorities, attendanceRisks } from '../core/recommend.js';
import { card, emptyState, badge, statRow } from '../core/parts.js';

export function renderAnalytics(root) {
  const state = getState();
  const attendance = attendanceTotals(state);
  const tasks = taskCounts(state);
  const study = studyStats(state);
  const expenses = expenseTotals(state);
  const coding = codingStats(state);
  const skillAvg = skillAverage(state);
  const risks = attendanceRisks(state);
  const priorities = buildPriorities(state, { limit: 5 });
  const attSummary = attendanceSummary(state).filter((r) => r.total > 0);

  root.innerHTML = `
    ${statRow([
    { label: 'Attendance', value: `${attendance.percent}%`, sub: `${attendance.present}/${attendance.total} classes`, tone: attendance.percent >= 75 ? 'ok' : 'warn' },
    { label: 'Study time', value: formatHours(study.totalMinutes), sub: `${study.sessionCount} sessions` },
    { label: 'Tasks done', value: `${tasks.completed}/${tasks.total}`, sub: `${tasks.completed ? Math.round((tasks.completed / tasks.total) * 100) : 0}%`, tone: 'ok' },
    { label: 'Expenses', value: formatMoney(expenses.month), sub: 'this month', tone: 'warn' },
    { label: 'Skills', value: `${skillAvg}%`, sub: `${state.skills.length} tracked` },
    { label: 'Problems solved', value: String(coding.solved), sub: `of ${coding.total} logged` },
  ])}

    ${card('Attendance by course', attSummary.length
    ? hBarChart(attSummary.map((r) => ({ label: r.code, value: r.percent, color: r.color })), { format: (v) => `${v}%` })
    : emptyState('No attendance data', 'Mark some classes to populate this chart.'),
    { subtitle: `Target ${state.settings.attendanceTarget}%` })}

    <div class="chart-grid">
      ${card('Weekly study hours', barChart(weeklyStudyMinutes(state).map((d) => ({ label: d.label, value: Math.round(d.value / 6) / 10 })), { height: 170, format: (v) => `${v}h` }))}
      ${card('Study trend (6 months)', lineChart(monthlyStudySeries(state, 6), { height: 170, format: (v) => formatHours(v * 60) }))}
    </div>

    ${card('Tasks completed per day', barChart(taskCompletionSeries(state, 7), { height: 160, format: (v) => String(v) }), { subtitle: 'Last 7 days' })}

    <div class="chart-grid">
      ${card('Expenses by category', expenseByCategory(state).length
    ? donutChart(expenseByCategory(state), { centerValue: formatMoney(expenses.total), centerLabel: 'all time' })
    : emptyState('No expenses yet', 'Log spending to see the split.'))}

      ${card('Monthly spending', barChart(monthlyExpenseSeries(state, 6), { height: 170, format: (v) => formatMoney(v) }))}
    </div>

    ${card('Problem difficulty', stackedBar([
    { label: 'Easy', value: coding.byDifficulty.find((d) => d.label === 'Easy')?.value || 0, color: '#10b981' },
    { label: 'Medium', value: coding.byDifficulty.find((d) => d.label === 'Medium')?.value || 0, color: '#f59e0b' },
    { label: 'Hard', value: coding.byDifficulty.find((d) => d.label === 'Hard')?.value || 0, color: '#ef4444' },
  ]), { subtitle: `${coding.solved} solved of ${coding.total} logged` })}

    ${card('Skill progress by group', skillByGroup(state).length
    ? hBarChart(skillByGroup(state), { format: (v) => `${v}%` })
    : emptyState('No skills tracked', 'Add skills to compare areas.'),
    { subtitle: `Overall average ${skillAvg}%` })}

    <div class="chart-grid">
      ${card('Attendance overview', `<div class="all-clear">${ringChart(attendance.percent, { size: 160, label: 'overall', tone: attendance.percent >= 75 ? '#10b981' : '#ef4444' })}</div>`)}

      ${card('Current priorities', priorities.length
    ? `<ol class="priority-list">${priorities.map((p, i) => `<li class="priority-row">
        <span class="priority-rank">${i + 1}</span>
        <span class="priority-body"><strong>${esc(p.label)}</strong><small>${esc(p.reasons.join(' · '))}</small></span>
        ${badge(p.kind, 'muted')}
      </li>`).join('')}</ol>`
    : emptyState('Nothing urgent', 'No exam, deadline or attendance risk needs attention.'))}
    </div>

    ${risks.length ? card('Attendance risks', `<ul class="risk-list">${risks.map((r) => `
      <li>
        <div class="risk-head"><strong>${esc(r.code)}</strong>${badge(`${r.forecast.current}%`, r.forecast.status === 'below' ? 'danger' : 'warning')}</div>
        <small class="muted">${esc(r.forecast.status === 'below' ? `${r.forecast.neededToRecover} more present classes needed` : `You can miss ${r.forecast.missableAhead} more classes`)}</small>
      </li>`).join('')}</ul>`) : ''}`;
}
