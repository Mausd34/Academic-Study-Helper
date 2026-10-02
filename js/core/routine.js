/**
 * Routine helpers: today's classes, next class, course lookups.
 */
import { DAYS, todayKey, dayName, timeToMinutes, minutesToTime, currentTimeString, sortBy } from './utils.js';

/** Class slots for a given weekday, earliest first. */
export function classesOn(state, day) {
  const routine = (state?.routine || []).filter((slot) => slot.day === day);
  return sortBy(routine, { key: (slot) => timeToMinutes(slot.start) ?? 9999 });
}

export const todayClasses = (state) => classesOn(state, dayName(todayKey()));

/** Today's classes annotated with current / next / done / upcoming. */
export function todayClassesWithStatus(state, now = new Date()) {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const day = DAYS[now.getDay()];
  const classes = classesOn(state, day);
  const courses = new Map((state?.courses || []).map((c) => [c.id, c]));
  const scheduled = (state?.routine || []).filter((slot) => slot.day === day);
  const marked = new Map(scheduled.map((slot) => [slot.id, (state?.attendance || []).find((a) => a.scheduleId === slot.id)]));

  return classes.map((slot) => {
    const start = timeToMinutes(slot.start) ?? 0;
    const end = timeToMinutes(slot.end) ?? 0;
    let status = 'upcoming';
    if (nowMinutes >= end) status = 'done';
    else if (nowMinutes >= start) status = 'current';
    const record = marked.get(slot.id);
    if (status === 'done' && record) status = record.status === 'absent' ? 'absent' : 'done';
    return {
      ...slot,
      course: courses.get(slot.courseId) || { code: 'Unknown', title: 'Unassigned course', color: '#94a1b4' },
      status,
      marked: Boolean(record),
      minutes: Math.max(0, end - start),
    };
  });
}

/** The class running right now, otherwise the next one still to start, else null. */
export function nextClass(state, now = new Date()) {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const classes = todayClassesWithStatus(state, now);
  return classes.find((c) => c.status === 'current')
    || classes.find((c) => (timeToMinutes(c.start) ?? 0) > nowMinutes)
    || null;
}

/** Minutes until the next class starts (0 when a class is running). */
export function minutesUntilNext(state, now = new Date()) {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const next = nextClass(state, now);
  if (!next) return null;
  if (next.status === 'current') return 0;
  return (timeToMinutes(next.start) ?? 0) - nowMinutes;
}

export const courseById = (state, id) => (state?.courses || []).find((c) => c.id === id) || null;
export const courseLabel = (course) => (course ? `${course.code} — ${course.title}` : 'Unassigned');

/** Weekly load per course (minutes and class count). */
export function weeklyLoad(state) {
  const totals = new Map();
  for (const slot of state?.routine || []) {
    const minutes = Math.max(0, (timeToMinutes(slot.end) ?? 0) - (timeToMinutes(slot.start) ?? 0));
    const entry = totals.get(slot.courseId) || { minutes: 0, classes: 0 };
    entry.minutes += minutes;
    entry.classes += 1;
    totals.set(slot.courseId, entry);
  }
  return [...totals.entries()]
    .map(([courseId, value]) => ({ courseId, ...value, course: courseById(state, courseId) }))
    .sort((a, b) => b.minutes - a.minutes);
}

/** Class count for the day the user is most likely to be asked about. */
export function routineOverview(state) {
  return DAYS.filter((day) => (state?.routine || []).some((slot) => slot.day === day))
    .map((day) => ({ day, count: (state?.routine || []).filter((slot) => slot.day === day).length }));
}

export { minutesToTime, currentTimeString };
