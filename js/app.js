/**
 * Application bootstrap: theme, navigation, routing, keyboard shortcuts,
 * reminders, PWA install and service-worker registration.
 */
import { esc, $, $$, initials, guard } from './core/utils.js';
import { getState, subscribe, setSetting, activeSemester } from './core/store.js';
import { setLanguage, applyDom, t } from './core/i18n.js';
import { route, setContainer, onRouteChange, startRouter, go, bindNavigation, currentRoute, refresh } from './core/router.js';
import { NAV, initPalette, togglePalette, isPaletteOpen } from './core/palette.js';
import { isModalOpen, closeModal, toastErr } from './core/ui.js';
import { startReminders } from './core/reminders.js';
import { applyTheme, cycleTheme, watchSystemTheme } from './core/theme.js';
import { SUPABASE_CONFIGURED, onAuthChange, getUser } from './core/auth.js';
import { enableSync, disableSync, schedulePush } from './core/sync.js';
import { renderLogin } from './views/login.js';

import { renderDashboard } from './views/dashboard.js';
import { renderRoutine } from './views/routine.js';
import { renderAttendance } from './views/attendance.js';
import { renderTasks } from './views/tasks.js';
import { renderExams } from './views/exams.js';
import { renderStudy } from './views/study.js';
import { renderNotes } from './views/notes.js';
import { renderExpenses } from './views/expenses.js';
import { renderSkills } from './views/skills.js';
import { renderCareer } from './views/career.js';
import { renderLearning } from './views/learning.js';
import { renderCoding } from './views/coding.js';
import { renderCalendar } from './views/calendar.js';
import { renderAssistant } from './views/assistant.js';
import { renderAnalytics } from './views/analytics.js';
import { renderSettings } from './views/settings.js';

/* ------------------------------------------------------------------ theme */

function toast(message) {
  const stack = document.getElementById('toastStack');
  if (!stack) return;
  const el = document.createElement('div');
  el.className = 'toast toast-info';
  el.textContent = message;
  stack.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => el.remove(), 2200);
}

function onThemeButton() {
  setSetting('theme', cycleTheme());
  applyTheme();
  toast(`Theme: ${getState().settings.theme}`);
}

/* ----------------------------------------------------------------- routes */

const TITLES = {
  dashboard: 'Dashboard',
  routine: 'Routine',
  attendance: 'Attendance',
  tasks: 'Assignments',
  exams: 'Exams',
  study: 'Study Timer',
  notes: 'Notes',
  expenses: 'Expenses',
  skills: 'Skills',
  career: 'Career',
  learning: 'Learning Plan',
  coding: 'Coding Practice',
  calendar: 'Calendar',
  assistant: 'AI Assistant',
  analytics: 'Analytics',
  settings: 'Settings',
};

/** Pages shown in the mobile bottom bar (the rest live in the sidebar). */
const MOBILE_NAV = ['dashboard', 'routine', 'tasks', 'study', 'assistant'];

/* -------------------------------------------------------------- navigation */

function buildNav() {
  const list = document.getElementById('navList');
  if (list) {
    list.innerHTML = NAV.map((item) => `
      <button class="nav-item" data-nav="${item.key}" type="button">
        <span class="nav-icon" aria-hidden="true">${esc(item.icon)}</span>
        <span class="nav-label">${esc(item.label)}</span>
      </button>`).join('');
  }
  const bottom = document.getElementById('bottomNav');
  if (bottom) {
    bottom.innerHTML = MOBILE_NAV.map((key) => {
      const item = NAV.find((n) => n.key === key);
      return `<button class="bottom-item" data-nav="${key}" type="button">
        <span class="nav-icon" aria-hidden="true">${esc(item.icon)}</span>
        <span>${esc(item.label)}</span>
      </button>`;
    }).join('');
  }
}

function markActive(key) {
  $$('.nav-item, .bottom-item').forEach((node) => {
    const active = node.dataset.nav === key;
    node.classList.toggle('active', active);
    if (active) node.setAttribute('aria-current', 'page');
    else node.removeAttribute('aria-current');
  });
  const title = document.getElementById('pageTitle');
  if (title) title.textContent = TITLES[key] || key;
  const eyebrow = document.getElementById('topEyebrow');
  if (eyebrow) eyebrow.textContent = (activeSemester()?.name || '').toUpperCase();
  closeSidebar();
}

function syncProfile() {
  const state = getState();
  const name = document.getElementById('sidebarName');
  const sub = document.getElementById('sidebarSub');
  const avatar = document.getElementById('sidebarAvatar');
  if (name) name.textContent = state.profile.name || 'Student';
  if (sub) sub.textContent = `${state.profile.university || ''} · ${state.profile.department || ''}`.trim().slice(0, 32);
  if (avatar) avatar.textContent = initials(state.profile.name);
  document.title = `${TITLES[currentRoute()] || 'Academic Study Helper'} · Study Helper`;
}

/* ---------------------------------------------------------------- sidebar */

const openSidebar = () => {
  document.getElementById('sidebar')?.classList.add('open');
  document.getElementById('scrim')?.removeAttribute('hidden');
  document.getElementById('menuBtn')?.setAttribute('aria-expanded', 'true');
};

function closeSidebar() {
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('scrim')?.setAttribute('hidden', '');
  document.getElementById('menuBtn')?.setAttribute('aria-expanded', 'false');
}

/* -------------------------------------------------------------------- PWA */

let installPrompt = null;

function initPwa() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch((error) => {
      console.warn('[pwa] service worker registration failed', error);
    });
  }
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    installPrompt = event;
    const button = document.getElementById('installBtn');
    if (button) button.hidden = false;
  });
  document.getElementById('installBtn')?.addEventListener('click', async () => {
    if (!installPrompt) {
      toast('Use your browser menu → “Install app” or “Add to Home Screen”.');
      return;
    }
    installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
    document.getElementById('installBtn').hidden = true;
  });
}

/* ------------------------------------------------------------------- boot */

function initShortcuts() {
  document.addEventListener('keydown', (event) => {
    const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName) || event.target.isContentEditable;

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      togglePalette();
      return;
    }
    if (event.key === 'Escape') {
      if (isPaletteOpen()) return;
      if (isModalOpen()) { closeModal(); return; }
      closeSidebar();
      return;
    }
    if (typing || event.ctrlKey || event.metaKey || event.altKey) return;
    // Single-key shortcuts for the most frequent pages.
    const map = { d: 'dashboard', r: 'routine', a: 'attendance', t: 'tasks', s: 'study', n: 'notes', c: 'calendar' };
    const target = map[event.key.toLowerCase()];
    if (target) {
      event.preventDefault();
      go(target);
    }
  });
}

function registerRoutes() {
  route('dashboard', renderDashboard);
  route('routine', renderRoutine);
  route('attendance', renderAttendance);
  route('tasks', renderTasks);
  route('exams', renderExams);
  route('study', renderStudy);
  route('notes', renderNotes);
  route('expenses', renderExpenses);
  route('skills', renderSkills);
  route('career', renderCareer);
  route('learning', renderLearning);
  route('coding', renderCoding);
  route('calendar', renderCalendar);
  route('assistant', renderAssistant);
  route('analytics', renderAnalytics);
  route('settings', renderSettings);
}

async function startApp() {
  const state = getState();
  setLanguage(state.settings.language || 'en');
  applyTheme();
  applyDom();

  buildNav();
  registerRoutes();
  setContainer(document.getElementById('viewRoot'));
  onRouteChange((key) => {
    markActive(key);
    syncProfile();
  });

  // Global delegated handlers.
  bindNavigation(document);
  initPalette();
  initShortcuts();
  initPwa();

  document.getElementById('menuBtn')?.addEventListener('click', openSidebar);
  document.getElementById('sidebarClose')?.addEventListener('click', closeSidebar);
  document.getElementById('scrim')?.addEventListener('click', closeSidebar);
  document.getElementById('themeBtn')?.addEventListener('click', onThemeButton);
  document.getElementById('searchBtn')?.addEventListener('click', () => togglePalette());

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-nav]');
    if (!trigger) return;
    event.preventDefault();
    go(trigger.dataset.nav);
  });

  watchSystemTheme(() => applyTheme());

  // Re-render the active view whenever the store changes, so every CRUD
  // action is reflected immediately without a manual refresh.
  subscribe(() => {
    guard('sync-profile', syncProfile);
    guard('view-refresh', () => refresh());
    if (SUPABASE_CONFIGURED) schedulePush();
  });

  startRouter();
  startReminders();
}

let _appStarted = false;

async function boot() {
  const forceAuth = new URLSearchParams(window.location.search).get('auth') === '1';

  if (SUPABASE_CONFIGURED) {
    let authSkip = false;
    const user = await getUser();

    onAuthChange(async ({ user: authUser }) => {
      if (authUser) {
        await enableSync(authUser.id);
        if (!_appStarted) {
          _appStarted = true;
          document.querySelector('.app-shell').style.display = '';
          document.querySelector('.auth-wrap')?.parentElement.remove();
          startApp();
        }
      } else {
        disableSync();
      }
    });

    if (!user && forceAuth && !authSkip) {
      const clearAuthQuery = () => {
        const next = new URL(window.location.href);
        next.searchParams.delete('auth');
        window.history.replaceState({}, '', next);
      };

      document.querySelector('.app-shell').style.display = 'none';
      const div = document.createElement('div');
      document.body.appendChild(div);
      renderLogin(div, () => {
        authSkip = true;
        clearAuthQuery();
        div.remove();
        document.querySelector('.app-shell').style.display = '';
        _appStarted = true;
        startApp();
      });
      return;
    }
  }

  _appStarted = true;
  startApp();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
