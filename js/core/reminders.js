/**
 * Reminders — one notification per item per day, checked on a slow timer.
 * Deliberately conservative: never fires on page load, never repeats.
 */
import { daysUntil, todayKey, addDays } from './utils.js';
import { getState, update } from './store.js';
import { notify } from './ui.js';
import { minutesUntilNext, courseById } from './routine.js';

const CHECK_INTERVAL = 60000;
let timer = null;

/** True when this reminder has not been sent yet today. */
function shouldFire(key) {
  const state = getState();
  const stamp = state.notified?.[key];
  return stamp !== todayKey();
}

function markFired(key) {
  update((draft) => {
    draft.notified = { ...(draft.notified || {}), [key]: todayKey() };
    // Keep the map small: drop anything older than yesterday.
    const today = todayKey();
    const yesterday = addDays(today, -1);
    for (const [k, v] of Object.entries(draft.notified)) {
      if (v !== today && v !== yesterday) delete draft.notified[k];
    }
  }, { silent: true });
}

/** Notify only when notifications are enabled and permission is granted. */
export function notificationsOn() {
  return getState().settings.notifications && 'Notification' in window && Notification.permission === 'granted';
}

export function checkReminders() {
  if (!notificationsOn()) return;
  const state = getState();
  const courses = (id) => courseById(state, id)?.code || 'Class';

  for (const task of state.tasks || []) {
    const days = daysUntil(task.dueDate);
    if (days === null || days < 0 || task.status === 'completed') continue;
    if (days > 1) continue;
    const key = `task:${task.id}:${task.dueDate}`;
    if (!shouldFire(key)) continue;
    markFired(key);
    notify(
      days === 0 ? 'Assignment due today' : 'Assignment due tomorrow',
      `${task.title} — ${courses(task.courseId)}`,
      { key },
    );
    return;
  }

  for (const exam of state.exams || []) {
    const days = daysUntil(exam.date);
    if (days === null || days < 0) continue;
    if (days > 3) continue;
    const key = `exam:${exam.id}:${exam.date}`;
    if (!shouldFire(key)) continue;
    markFired(key);
    notify(
      days === 0 ? 'Exam today' : `Exam in ${days} day${days === 1 ? '' : 's'}`,
      `${exam.title || exam.type} — ${courses(exam.courseId)}`,
      { key },
    );
    return;
  }

  // Upcoming class within 15 minutes.
  const until = minutesUntilNext(state);
  if (until !== null && until > 0 && until <= 15) {
    const key = `class:${todayKey()}:soon`;
    if (shouldFire(key)) {
      markFired(key);
      const at = new Date(Date.now() + until * 60000);
      const label = `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`;
      notify('Class starting soon', `You have a class at ${label}.`, { key });
    }
  }
}

export function startReminders() {
  stopReminders();
  // First run after a short delay so page load never triggers a notification.
  setTimeout(() => checkReminders(), 20000);
  timer = setInterval(() => guard('reminders', () => checkReminders()), CHECK_INTERVAL);
}

export function stopReminders() {
  clearInterval(timer);
  timer = null;
}
