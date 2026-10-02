/**
 * Transparent recommendation engine.
 *
 * Every suggestion is a weighted sum of explainable signals — no randomness and
 * no hidden model. `reasons` is always populated so the UI can show exactly
 * why something was suggested.
 */
import { daysUntil, toNumber, clamp } from './utils.js';
import { attendanceSummary } from './analytics.js';
import { courseById } from './routine.js';

export const WEIGHTS = {
  exam: 40,
  deadline: 30,
  attendance: 28,
  skill: 14,
  consistency: 16,
  examPrep: 18,
};

/**
 * Attendance forecast: distance from target, how many classes can still be
 * missed, and how many presents are needed to climb back to the target.
 */
export function attendanceForecast({ present, absent, total, target = 75 }) {
  const p = toNumber(present);
  const a = toNumber(absent);
  const t = p + a;
  const current = t ? Math.round((p / t) * 1000) / 10 : 0;
  const goal = toNumber(target, 75);

  if (!t) {
    return { current: 0, target: goal, status: 'empty', missableAhead: 0, neededToRecover: 0, label: 'No records yet' };
  }

  // How many consecutive absences are absorbed while staying at or above target.
  let missableAhead = 0;
  for (let i = 1; i < 500; i += 1) {
    if ((p / (t + i)) * 100 >= goal) missableAhead = i;
    else break;
  }

  // Presents needed (assuming no further absences) to reach the target.
  let neededToRecover = 0;
  if (current < goal) {
    for (let i = 1; i < 500; i += 1) {
      neededToRecover = i;
      if ((p / (t + i)) * 100 >= goal) break;
    }
  }

  const margin = Math.round((current - goal) * 10) / 10;
  let status = 'safe';
  let label = 'Safe';
  if (current < goal) { status = 'below'; label = `Attendance below ${goal}%`; }
  else if (margin < 5) { status = 'risk'; label = 'Attendance is at risk'; }

  return { current, target: goal, status, label, margin, missableAhead, neededToRecover, total: t };
}


/* ------------------------------------------------------------- priorities */

const PRIORITY_RANK = { Urgent: 4, High: 3, Medium: 2, Low: 1 };

/**
 * Build today's priority list.
 * Returns up to `limit` items: { key, label, courseId, score, reasons[], kind }.
 */
export function buildPriorities(state, { limit = 6 } = {}) {
  const items = new Map();
  const add = (courseId, patch) => {
    if (!courseId) return;
    const existing = items.get(courseId);
    if (existing) {
      existing.score += patch.score || 0;
      existing.reasons.push(...(patch.reasons || []));
      if (patch.title) existing.title = patch.title;
      return;
    }
    items.set(courseId, {
      key: `course:${courseId}`,
      courseId,
      title: '',
      score: 0,
      reasons: [],
      kind: 'study',
      ...patch,
    });
  };

  // 1) Exams — the strongest signal.
  for (const exam of state?.exams || []) {
    const days = daysUntil(exam.date);
    if (days === null || days < 0) continue;
    const urgency = days <= 1 ? 1 : days <= 3 ? 0.85 : days <= 7 ? 0.6 : 0.35;
    const prepGap = 100 - clamp(exam.prep);
    add(exam.courseId, {
      kind: 'exam',
      title: `Prepare for ${exam.title || exam.type || 'exam'}`,
      score: WEIGHTS.exam * urgency,
      reasons: [`${exam.type || 'Exam'} in ${days} day${days === 1 ? '' : 's'}`],
    });
    const entry = items.get(exam.courseId);
    entry.score += WEIGHTS.examPrep * (prepGap / 100);
    if (prepGap > 0) entry.reasons.push(`${prepGap}% of the syllabus is still unprepared`);
  }

  // 2) Task deadlines.
  for (const task of state?.tasks || []) {
    if (task.status === 'completed') continue;
    const days = daysUntil(task.dueDate);
    if (days === null || days < 0) continue;
    const rank = PRIORITY_RANK[task.priority] || 2;
    const urgency = days <= 0 ? 1 : days <= 2 ? 0.8 : days <= 5 ? 0.55 : 0.3;
    add(task.courseId, {
      kind: 'task',
      title: task.title,
      score: WEIGHTS.deadline * urgency * (rank / 4),
      reasons: [`Task due ${days === 0 ? 'today' : `in ${days} day${days === 1 ? '' : 's'}`}`],
    });
  }

  // 3) Attendance recovery.
  for (const risk of attendanceRisks(state)) {
    const penalty = risk.forecast.status === 'below' ? 1 : 0.6;
    add(risk.courseId, {
      kind: 'attendance',
      title: `Recover attendance in ${risk.code}`,
      score: WEIGHTS.attendance * penalty,
      reasons: [risk.forecast.status === 'below'
        ? `Attendance is ${risk.forecast.current}% — under the ${risk.forecast.target}% target`
        : `Only ${risk.forecast.margin}% above the target`],
    });
  }

  // 4) Consistency — least-studied course over the last 14 days.
  const minutesByCourse = new Map();
  for (const session of state?.studySessions || []) {
    const days = daysUntil(session.date);
    if (days === null || days > 14) continue;
    minutesByCourse.set(session.courseId, (minutesByCourse.get(session.courseId) || 0) + toNumber(session.minutes));
  }
  const courseIds = (state?.courses || []).map((c) => c.id);
  if (courseIds.length > 1) {
    const quiet = [...courseIds].sort((a, b) => (minutesByCourse.get(a) || 0) - (minutesByCourse.get(b) || 0))[0];
    if ((minutesByCourse.get(quiet) || 0) < 30) {
      add(quiet, {
        kind: 'consistency',
        title: 'Restart a study block',
        score: WEIGHTS.consistency * 0.5,
        reasons: ['No meaningful study time in the last 14 days'],
      });
    }
  }

  // 5) Weakest tracked skill.
  const skills = (state?.skills || []).filter((s) => toNumber(s.progress) > 0);
  if (skills.length) {
    const weakest = [...skills].sort((a, b) => toNumber(a.progress) - toNumber(b.progress))[0];
    if (toNumber(weakest.progress) < 40) {
      const keyword = String(weakest.name).split(' ')[0];
      const course = (state?.courses || []).find((c) => new RegExp(keyword, 'i').test(c.title) || new RegExp(keyword, 'i').test(c.code));
      add(course?.id, {
        kind: 'skill',
        title: `Practise ${weakest.name}`,
        score: WEIGHTS.skill * (1 - toNumber(weakest.progress) / 100),
        reasons: [`${weakest.name} is your weakest tracked skill at ${weakest.progress}%`],
      });
    }
  }

  return [...items.values()]
    .map((item) => ({
      ...item,
      course: courseById(state, item.courseId),
      label: item.course ? `${item.course.code} — ${item.title}` : item.title,
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/** Courses that need attendance attention, worst first. */
export function attendanceRisks(state) {
  const target = state?.settings?.attendanceTarget ?? 75;
  return attendanceSummary(state)
    .map((row) => ({ ...row, forecast: attendanceForecast({ present: row.present, absent: row.absent, total: row.total, target }) }))
    .filter((row) => row.total > 0 && row.forecast.status !== 'safe')
    .sort((a, b) => a.forecast.current - b.forecast.current);
}
