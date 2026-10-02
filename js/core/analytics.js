/**
 * Derived metrics. Pure functions over state — safe to call from any view.
 */
import { DAYS_SHORT, toNumber, percent, todayKey, addDays, fromDateKey, toDateKey, daysUntil, groupBy } from './utils.js';

/* -------------------------------------------------------------- attendance */

export function attendanceSummary(state) {
  const records = state?.attendance || [];
  const courses = state?.courses || [];
  return courses.map((course) => {
    const rows = records.filter((r) => r.courseId === course.id);
    const present = rows.filter((r) => r.status === 'present' || r.status === 'excused').length;
    const absent = rows.filter((r) => r.status === 'absent').length;
    const total = rows.length;
    return {
      courseId: course.id,
      code: course.code,
      title: course.title,
      color: course.color,
      present,
      absent,
      total,
      percent: percent(present, total),
    };
  });
}

export function attendanceTotals(state) {
  const summary = attendanceSummary(state);
  const present = summary.reduce((n, s) => n + s.present, 0);
  const absent = summary.reduce((n, s) => n + s.absent, 0);
  return { present, absent, total: present + absent, percent: percent(present, present + absent) };
}

/* ------------------------------------------------------------------- tasks */

export function taskCounts(state) {
  const tasks = state?.tasks || [];
  const today = todayKey();
  return {
    total: tasks.length,
    pending: tasks.filter((t) => t.status === 'pending').length,
    inProgress: tasks.filter((t) => t.status === 'in-progress').length,
    completed: tasks.filter((t) => t.status === 'completed').length,
    overdue: tasks.filter((t) => t.status !== 'completed' && t.dueDate && daysUntil(t.dueDate) < 0).length,
    dueToday: tasks.filter((t) => t.status !== 'completed' && t.dueDate === today).length,
  };
}

export function taskCompletionSeries(state, days = 7) {
  const tasks = state?.tasks || [];
  const out = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const key = addDays(todayKey(), -i);
    out.push({
      label: DAYS_SHORT[fromDateKey(key).getDay()],
      value: tasks.filter((t) => t.completedAt && toDateKey(new Date(t.completedAt)) === key).length,
    });
  }
  return out;
}


/* ------------------------------------------------------------------- study */

export function minutesOn(state, dateKey) {
  return (state?.studySessions || [])
    .filter((s) => s.date === dateKey)
    .reduce((sum, s) => sum + toNumber(s.minutes), 0);
}

export function weeklyStudyMinutes(state, days = 7) {
  const out = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const key = addDays(todayKey(), -i);
    out.push({ label: DAYS_SHORT[fromDateKey(key).getDay()], value: minutesOn(state, key), date: key });
  }
  return out;
}

export function monthlyStudySeries(state, months = 6) {
  const out = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const prefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    out.push({
      label: d.toLocaleDateString('en-GB', { month: 'short' }),
      value: (state?.studySessions || []).filter((s) => String(s.date).startsWith(prefix)).reduce((sum, s) => sum + toNumber(s.minutes), 0),
    });
  }
  return out;
}

export function studyStats(state) {
  const sessions = state?.studySessions || [];
  const total = sessions.reduce((sum, s) => sum + toNumber(s.minutes), 0);
  const week = weeklyStudyMinutes(state).reduce((sum, d) => sum + d.value, 0);
  const courseMinutes = new Map();
  const dayMinutes = new Map();
  for (const s of sessions) {
    const minutes = toNumber(s.minutes);
    courseMinutes.set(s.courseId, (courseMinutes.get(s.courseId) || 0) + minutes);
    dayMinutes.set(s.date, (dayMinutes.get(s.date) || 0) + minutes);
  }
  const top = (map) => [...map.entries()].sort((a, b) => b[1] - a[1])[0] || [null, 0];
  const [topCourseId, topCourseMinutes] = top(courseMinutes);
  const [bestDay, bestDayMinutes] = top(dayMinutes);
  return {
    totalMinutes: total,
    todayMinutes: minutesOn(state, todayKey()),
    weekMinutes: week,
    sessionCount: sessions.length,
    averageMinutes: sessions.length ? Math.round(total / sessions.length) : 0,
    topCourseId,
    topCourseMinutes,
    bestDay,
    bestDayMinutes,
  };
}

/* ---------------------------------------------------------------- expenses */

export const monthKey = (dateKey) => String(dateKey || '').slice(0, 7);

export function expenseTotals(state) {
  const rows = state?.expenses || [];
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const weekStart = addDays(todayKey(), -6);
  const sum = (list) => list.reduce((acc, e) => acc + toNumber(e.amount), 0);
  return {
    total: sum(rows),
    month: sum(rows.filter((e) => monthKey(e.date) === thisMonth)),
    week: sum(rows.filter((e) => e.date >= weekStart)),
    today: sum(rows.filter((e) => e.date === todayKey())),
  };
}

export function expenseByCategory(state) {
  const grouped = groupBy(state?.expenses || [], (e) => e.category || 'Other');
  return [...grouped.entries()]
    .map(([label, items]) => ({ label, value: items.reduce((sum, e) => sum + toNumber(e.amount), 0) }))
    .sort((a, b) => b.value - a.value);
}

export function monthlyExpenseSeries(state, months = 6) {
  const rows = state?.expenses || [];
  const now = new Date();
  const out = [];
  for (let i = months - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const prefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    out.push({
      label: d.toLocaleDateString('en-GB', { month: 'short' }),
      value: rows.filter((e) => monthKey(e.date) === prefix).reduce((sum, e) => sum + toNumber(e.amount), 0),
    });
  }
  return out;
}

/* ------------------------------------------------------------------ coding */

export function codingStats(state) {
  const rows = state?.coding || [];
  const by = (key) => groupBy(rows, (r) => r[key] || 'Unspecified');
  const count = (key) => [...by(key).entries()].map(([label, items]) => ({ label, value: items.length }));
  return {
    total: rows.length,
    solved: rows.filter((r) => r.status === 'solved').length,
    attempted: rows.filter((r) => r.status !== 'solved').length,
    byDifficulty: count('difficulty'),
    byPlatform: count('platform'),
  };
}

/* ----------------------------------------------------------------- skills */

export function skillAverage(state) {
  const skills = state?.skills || [];
  if (!skills.length) return 0;
  return Math.round(skills.reduce((sum, s) => sum + toNumber(s.progress), 0) / skills.length);
}

export function skillByGroup(state) {
  const grouped = groupBy(state?.skills || [], (s) => s.group || 'General');
  return [...grouped.entries()].map(([label, items]) => ({
    label,
    value: Math.round(items.reduce((sum, s) => sum + toNumber(s.progress), 0) / items.length),
  }));
}
