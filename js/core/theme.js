/**
 * Theme handling (light / dark / system) kept separate so both the app
 * bootstrap and the settings view can apply it without a circular import.
 */
import { getState } from './store.js';

const media = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null;

export const isDark = () => {
  const choice = getState().settings?.theme || 'system';
  return choice === 'dark' || (choice === 'system' && Boolean(media?.matches));
};

/** Applies the stored theme to <html> and syncs the toggle icon. */
export function applyTheme() {
  const dark = isDark();
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  const icon = document.getElementById('themeIcon');
  if (icon) icon.textContent = dark ? '☀' : '☾';
  const button = document.getElementById('themeBtn');
  if (button) {
    button.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
    button.setAttribute('title', dark ? 'Switch to light theme' : 'Switch to dark theme');
  }
  return dark;
}

/** Cycles light → dark → system. */
export function cycleTheme() {
  const order = ['light', 'dark', 'system'];
  const current = getState().settings?.theme || 'system';
  return order[(order.indexOf(current) + 1) % order.length];
}

/** Subscribes to OS-level theme changes while "system" is selected. */
export function watchSystemTheme(onChange) {
  if (!media) return () => {};
  const handler = () => {
    if ((getState().settings?.theme || 'system') === 'system') onChange();
  };
  media.addEventListener('change', handler);
  return () => media.removeEventListener('change', handler);
}
