/**
 * Settings — profile, appearance, language, data management, PWA info.
 */
import { esc, nowISO } from '../core/utils.js';
import {
  getState, update, setProfile, setSetting, replaceState, resetState,
  validateBackup, exportPayload, storageSize,
} from '../core/store.js';
import { SCHEMA_VERSION, STORAGE_KEY } from '../core/storage.js';
import { LANGUAGES, setLanguage, getLanguage } from '../core/i18n.js';
import { openModal, buildForm, bindForm, closeModal, confirmDialog, toastOk, toastErr, requestNotificationPermission } from '../core/ui.js';
import { card, badge, attach } from '../core/parts.js';
import { applyTheme } from '../core/theme.js';
import { SUPABASE_CONFIGURED, getSession, signOut } from '../core/auth.js';
import { getSyncStatus, onSyncStatus } from '../core/sync.js';

const THEMES = ['light', 'dark', 'system'];

/* ---------------------------------------------------------------- profile */

const PROFILE_FIELDS = (p) => [
  { name: 'name', label: 'Full name', type: 'text', value: p.name || '', required: true, full: true },
  { name: 'university', label: 'University', type: 'text', value: p.university || '' },
  { name: 'department', label: 'Department', type: 'text', value: p.department || '' },
  { name: 'studentId', label: 'Student ID', type: 'text', value: p.studentId || '' },
  { name: 'semester', label: 'Semester', type: 'text', value: p.semester || '' },
  { name: 'section', label: 'Section', type: 'text', value: p.section || '' },
  { name: 'email', label: 'Email', type: 'text', value: p.email || '', type: 'email' },
  { name: 'phone', label: 'Phone', type: 'text', value: p.phone || '' },
  { name: 'github', label: 'GitHub URL', type: 'text', value: p.github || '' },
  { name: 'linkedin', label: 'LinkedIn URL', type: 'text', value: p.linkedin || '' },
  { name: 'status', label: 'Current status', type: 'text', value: p.status || '', full: true },
  { name: 'careerGoal', label: 'Career goal', type: 'textarea', value: p.careerGoal || '', full: true, rows: 3 },
  { name: 'interests', label: 'Target roles', type: 'tags', value: p.interests || [], full: true, hint: 'Comma separated' },
];

export function openProfileForm() {
  const state = getState();
  const fields = PROFILE_FIELDS(state.profile);
  openModal({
    title: 'Edit profile',
    size: 'modal-lg',
    body: buildForm(fields, { submitLabel: 'Save profile' }),
    onMount: (modal) => {
      bindForm(modal.querySelector('form'), fields, (values) => {
        if (!values.name) return toastErr('Your name is required.');
        for (const key of ['email', 'github', 'linkedin']) {
          const value = values[key];
          if (value && !/^(https?:\/\/|[\w.+-]+@[\w.-]+\.\w+$)/.test(value)) {
            return toastErr(`Please enter a valid ${key} URL or email.`);
          }
        }
        setProfile({ ...values, interests: values.interests || [] });
        toastOk('Profile saved.');
        closeModal();
      });
    },
  });
}


/* ------------------------------------------------------------ backup I/O */

export function exportBackup() {
  try {
    const blob = new Blob([exportPayload(getState())], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `academic-study-helper-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toastOk('Backup exported.');
  } catch (error) {
    console.error('[export] failed', error);
    toastErr('Could not export your backup.');
  }
}

export function importBackup(file) {
  const reader = new FileReader();
  reader.onload = async () => {
    let payload;
    try {
      payload = JSON.parse(reader.result);
    } catch {
      return toastErr('That file is not valid JSON.');
    }
    const check = validateBackup(payload);
    if (!check.ok) return toastErr(`Import rejected: ${check.reason}`);
    const ok = await confirmDialog({
      title: 'Replace all data?',
      message: 'Importing this backup replaces everything currently in the app. Export first if you are unsure.',
      confirmLabel: 'Import and replace',
    });
    if (!ok) return;
    replaceState(payload);
    toastOk('Backup imported.');
  };
  reader.onerror = () => toastErr('Could not read that file.');
  reader.readAsText(file);
}

export async function resetAll() {
  const ok = await confirmDialog({
    title: 'Reset all data?',
    message: 'Every task, note, attendance record and setting will be permanently deleted from this browser. This cannot be undone.',
    confirmLabel: 'Delete everything',
  });
  if (!ok) return;
  const second = await confirmDialog({
    title: 'Are you absolutely sure?',
    message: 'Last chance — export a backup first if you might need this data again.',
    confirmLabel: 'Yes, reset the app',
  });
  if (!second) return;
  resetState();
  toastOk('App reset to the default state.');
}

/* ---------------------------------------------------------------- render */

export function renderSettings(root) {
  const state = getState();
  const p = state.profile;
  const theme = state.settings.theme || 'system';
  const language = getLanguage();
  const notifPermission = 'Notification' in window ? Notification.permission : 'unsupported';
  const size = storageSize(state);

  root.innerHTML = `
    ${card('Profile', `
      <div class="profile-summary">
        <div class="avatar avatar-lg">${esc((p.name || '?').split(' ').filter(Boolean).map((x) => x[0]).slice(0, 2).join('').toUpperCase() || '?')}</div>
        <div>
          <h2>${esc(p.name || 'Your name')}</h2>
          <p class="muted">${esc(p.status || '')}${p.studentId ? ` · ID ${esc(p.studentId)}` : ''}</p>
          <p class="muted small">${esc(p.university || '')} · ${esc(p.department || '')}${p.semester ? ` · ${esc(p.semester)}` : ''}</p>
        </div>
      </div>
      <dl class="detail-list">
        ${p.email ? `<div><dt>Email</dt><dd>${esc(p.email)}</dd></div>` : ''}
        ${p.phone ? `<div><dt>Phone</dt><dd>${esc(p.phone)}</dd></div>` : ''}
        ${p.github ? `<div><dt>GitHub</dt><dd><a href="${esc(p.github)}" target="_blank" rel="noopener noreferrer">${esc(p.github)}</a></dd></div>` : ''}
        ${p.linkedin ? `<div><dt>LinkedIn</dt><dd><a href="${esc(p.linkedin)}" target="_blank" rel="noopener noreferrer">${esc(p.linkedin)}</a></dd></div>` : ''}
      </dl>
      <p class="muted small"><strong>Career goal:</strong> ${esc(p.careerGoal || 'Not set')}</p>
      ${(p.interests || []).length ? `<ul class="tag-list">${p.interests.map((r) => `<li class="tag">${esc(r)}</li>`).join('')}</ul>` : ''}`,
    { actions: '<button class="btn primary small" data-edit-profile>Edit profile</button>' })}

    ${card('Appearance', `
      <div class="setting-row">
        <span>Theme</span>
        <div class="segmented" role="group" aria-label="Theme">
          ${THEMES.map((t) => `<button class="seg ${theme === t ? 'active' : ''}" data-theme="${t}" aria-pressed="${theme === t}">${t[0].toUpperCase() + t.slice(1)}</button>`).join('')}
        </div>
      </div>
      <div class="setting-row">
        <span>Language</span>
        <div class="segmented" role="group" aria-label="Language">
          ${LANGUAGES.map((l) => `<button class="seg ${language === l.code ? 'active' : ''}" data-lang="${l.code}" aria-pressed="${language === l.code}">${esc(l.native)}</button>`).join('')}
        </div>
      </div>
      <p class="muted small">The interface switches between English and বাংলা. The study assistant answers in the selected language.</p>`)}

    <div id="settingsSyncRoot"></div>

    ${card('Data management', `
      <p class="muted small">Everything is stored only in this browser (${esc(STORAGE_KEY)}, schema v${SCHEMA_VERSION}, about ${esc(bytes(size))}). Nothing is uploaded anywhere. Export a backup before clearing browser data or switching devices.</p>
      <div class="row-actions">
        <button class="btn primary" data-export>Export JSON</button>
        <label class="btn">Import JSON<input id="importFile" type="file" accept="application/json,.json" hidden></label>
        <button class="btn danger" data-reset>Reset all data</button>
      </div>`)}

    ${card('Notifications', `
      <div class="setting-row">
        <span>Browser notifications</span>
        ${badge(notifPermission === 'granted' ? 'Allowed' : notifPermission === 'denied' ? 'Blocked' : 'Not requested', notifPermission === 'granted' ? 'success' : 'muted')}
      </div>
      <p class="muted small">Used for class reminders, assignment deadlines, exam countdowns and finished Pomodoro sessions. At most one reminder per item per day, and never on page load.</p>
      ${notifPermission !== 'granted' ? '<button class="btn small" data-enable-notif>Enable notifications</button>' : ''}`)}

    ${card('Install app', `
      <div class="setting-row">
        <span>Status</span>
        ${badge(installed() ? 'Installed' : 'Running in browser', installed() ? 'success' : 'info')}
      </div>
      <p class="muted small">Install from your browser menu (“Install app” / “Add to Home Screen”) for a full-screen, offline-capable experience.</p>`)}

    ${card('About', `
      <p class="muted small">Academic Study Helper · v4.0.0 · Offline-first PWA · No analytics, no tracking, no API keys in the frontend.</p>
      <p class="muted small">Last updated: ${esc(new Date(state.updatedAt || Date.now()).toLocaleString('en-GB'))}</p>`)}`;

  wire(root);
}

function wire(root) {
  attach(root, ({ signal }) => {
    
    if (SUPABASE_CONFIGURED) {
      const syncRoot = root.querySelector('#settingsSyncRoot');
      const renderSync = async () => {
        if (!syncRoot) return;
        const session = await getSession();
        if (session) {
          const s = getSyncStatus();
          syncRoot.innerHTML = card('Cloud Sync', `
            <div class="setting-row">
              <span>Signed in as <strong>${esc(session.user.email)}</strong></span>
              ${badge(s === 'syncing' ? 'Syncing...' : s === 'error' ? 'Sync error' : 'Synced', s === 'error' ? 'danger' : 'success')}
            </div>
            <p class="muted small">Your data is automatically backed up to the cloud after every change.</p>
            <button class="btn" data-signout>Sign out</button>
          `);
        } else {
          syncRoot.innerHTML = card('Cloud Sync', `
            <div class="setting-row">
              <span>Not signed in</span>
              ${badge('Offline', 'muted')}
            </div>
            <p class="muted small">Sign in to automatically sync your data across devices.</p>
            <button class="btn primary" data-signin>Sign In</button>
          `);
        }
      };
      
      renderSync();
      const unsub = onSyncStatus(renderSync);
      signal.addEventListener('abort', unsub);
    }

    root.addEventListener('change', (event) => {
      if (event.target.id === 'importFile' && event.target.files?.[0]) {
        importBackup(event.target.files[0]);
        event.target.value = '';
      }
    }, { signal });

    root.addEventListener('click', async (event) => {
      const el = event.target.closest('button');
      if (!el) return;
      if (el.hasAttribute('data-edit-profile')) return openProfileForm();
      if (el.hasAttribute('data-export')) return exportBackup();
      if (el.hasAttribute('data-reset')) return resetAll();
      if (el.hasAttribute('data-signin')) {
        const url = new URL(window.location.href);
        url.searchParams.set('auth', '1');
        window.location.href = url.toString();
        return;
      }
      if (el.hasAttribute('data-signout')) {
        await signOut();
        const url = new URL(window.location.href);
        url.searchParams.delete('auth');
        window.location.href = url.toString();
        return;
      }
      if (el.hasAttribute('data-enable-notif')) {
        const result = await requestNotificationPermission();
        if (result === 'granted') { setSetting('notifications', true); toastOk('Notifications enabled.'); }
        else toastErr('Notifications were not enabled. You can change this in browser settings.');
        return renderSettings(root);
      }
      if (el.dataset.theme) {
        // Persist first; the store subscriber re-renders this view for us.
        setSetting('theme', el.dataset.theme);
        applyTheme();
        return;
      }
      if (el.dataset.lang) {
        setLanguage(el.dataset.lang);
        setSetting('language', el.dataset.lang);
      }
    }, { signal });
  });
}

export const bytes = (n) => (n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(2)} MB`);

export const installed = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
