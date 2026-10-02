/**
 * Central store: the single source of truth for the UI.
 * Views read `state` and call `update()`; there are no globals to fight with.
 */
import { load, save, migrate, defaultState, validateBackup, exportPayload, clearAll, storageSize } from './storage.js';
import { uid, nowISO, guard } from './utils.js';
import { toastErr } from './ui.js';

let state = load();
const listeners = new Set();

/** Subscribe to changes. Returns an unsubscribe function. */
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Notify every subscriber (views re-render). */
export function emit() {
  for (const fn of listeners) {
    guard('subscriber', () => fn(state));
  }
}

/**
 * Mutate state through a callback and persist.
 * @param {(draft: object) => void|object} mutator
 * @param {{silent?: boolean}} options
 */
export function update(mutator, { silent = false } = {}) {
  try {
    mutator(state);
    save(state);
    if (!silent) emit();
    return true;
  } catch (error) {
    console.error('[store] update failed', error);
    toastErr('Could not save your change. Please try again.');
    return false;
  }
}

export const getState = () => state;
export const settings = () => state.settings;

/** Replace the whole state (import / reset). */
export function replaceState(next, { silent = false } = {}) {
  state = migrate(next);
  save(state);
  if (!silent) emit();
  return state;
}

export const resetState = () => {
  clearAll();
  state = defaultState();
  save(state);
  emit();
  return state;
};

export { validateBackup, exportPayload, storageSize, defaultState };

/* ------------------------------------------------------------- collections */

const COLLECTIONS = ['tasks', 'exams', 'notes', 'expenses', 'studySessions', 'skills', 'coding', 'attendance', 'events', 'chat', 'careerGoals', 'portfolioProjects', 'courses', 'routine', 'semesters'];

/** Generic list helpers. All mutations persist and re-render. */
export const list = {
  all: (name) => state[name] || [],
  find: (name, id) => (state[name] || []).find((item) => item.id === id) || null,

  add(name, record) {
    const entry = { id: uid(name.slice(0, 3)), createdAt: nowISO(), ...record };
    return update((draft) => {
      draft[name] = [entry, ...(draft[name] || [])];
    }) ? entry : null;
  },

  patch(name, id, changes) {
    let updated = null;
    update((draft) => {
      const index = (draft[name] || []).findIndex((item) => item.id === id);
      if (index === -1) return;
      draft[name][index] = { ...draft[name][index], ...changes, updatedAt: nowISO() };
      updated = draft[name][index];
    });
    return updated;
  },

  remove(name, id) {
    return update((draft) => {
      draft[name] = (draft[name] || []).filter((item) => item.id !== id);
    });
  },

  /** Remove every record matching a predicate. */
  removeWhere(name, predicate) {
    return update((draft) => {
      draft[name] = (draft[name] || []).filter((item) => !predicate(item));
    });
  },
};

/** Settings helpers. */
export function setSetting(key, value) {
  return update((draft) => {
    draft.settings[key] = value;
  });
}

export function setProfile(changes) {
  return update((draft) => {
    draft.profile = { ...draft.profile, ...changes };
  });
}

/** Active semester record. */
export const activeSemester = () => state.semesters.find((s) => s.active) || state.semesters[0] || null;

export function setActiveSemester(id) {
  return update((draft) => {
    draft.semesters = draft.semesters.map((s) => ({ ...s, active: s.id === id }));
  });
}

/** Courses that belong to a semester (defaults to the active one). */
export function coursesFor(semesterId) {
  const target = semesterId || activeSemester()?.id;
  const own = state.courses.filter((c) => c.semesterId === target);
  return own.length ? own : state.courses;
}

export const courseName = (id) => {
  const course = list.find('courses', id);
  return course ? `${course.code}` : 'Unassigned';
};

export const courseFull = (id) => {
  const course = list.find('courses', id);
  return course ? `${course.code} — ${course.title}` : 'Unassigned';
};

export { COLLECTIONS };
