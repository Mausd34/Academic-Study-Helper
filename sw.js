/**
 * Service worker — offline-first.
 *  - navigations: network-first, falling back to the cached shell
 *  - same-origin assets: cache-first, refreshed in the background
 *  - cross-origin and non-GET: passthrough
 */
const VERSION = 'v4';
const CACHE = `academic-study-helper-${VERSION}`;

const SHELL = [
  './',
  './index.html',
  './styles.css',
  './manifest.json',
  './assets/icons/favicon.svg',
  './js/app.js',
  './js/core/utils.js',
  './js/core/i18n.js',
  './js/core/storage.js',
  './js/core/store.js',
  './js/core/router.js',
  './js/core/ui.js',
  './js/core/forms.js',
  './js/core/parts.js',
  './js/core/charts.js',
  './js/core/analytics.js',
  './js/core/routine.js',
  './js/core/recommend.js',
  './js/core/assistant.js',
  './js/core/knowledge.js',
  './js/core/plans.js',
  './js/core/timer.js',
  './js/core/palette.js',
  './js/core/reminders.js',
  './js/core/theme.js',
  './js/views/dashboard.js',
  './js/views/routine.js',
  './js/views/attendance.js',
  './js/views/tasks.js',
  './js/views/exams.js',
  './js/views/study.js',
  './js/views/notes.js',
  './js/views/expenses.js',
  './js/views/skills.js',
  './js/views/career.js',
  './js/views/learning.js',
  './js/views/coding.js',
  './js/views/calendar.js',
  './js/views/assistant.js',
  './js/views/analytics.js',
  './js/views/settings.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      // addAll would abort the whole install if a single file 404s.
      .then((cache) => Promise.all(SHELL.map((url) => cache.add(url).catch(() => null))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  if (new URL(request.url).origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put('./index.html', copy));
          return response;
        })
        .catch(() => caches.match('./index.html').then((cached) => cached || caches.match('./'))),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting();
});
