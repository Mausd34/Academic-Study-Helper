/** Quick diagnostic: load the app and dump every console/error message. */
import { request } from 'node:http';

const APP_URL = process.argv[2] || 'http://localhost:8123/';
const CDP = 'http://localhost:9222';

const getJson = (path) => new Promise((resolve, reject) => {
  request(`${CDP}${path}`, (res) => {
    let body = '';
    res.on('data', (c) => { body += c; });
    res.on('end', () => { try { resolve(JSON.parse(body)); } catch (e) { reject(e); } });
  }).on('error', reject).end();
});

const targets = await getJson('/json/list');
const target = targets.find((t) => t.type === 'page');
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((res) => ws.addEventListener('open', res, { once: true }));

let id = 0;
const pending = new Map();
ws.addEventListener('message', (event) => {
  const m = JSON.parse(event.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  if (m.method === 'Runtime.exceptionThrown') {
    console.log('\nEXCEPTION:', m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
  }
  if (m.method === 'Runtime.consoleAPICalled') {
    console.log(`CONSOLE[${m.params.type}]:`, m.params.args.map((a) => a.value ?? a.description).join(' '));
  }
  if (m.method === 'Log.entryAdded') {
    console.log(`LOG[${m.params.entry.level}] ${m.params.entry.text} ${m.params.entry.url || ''}`);
  }
});

const send = (method, params = {}) => new Promise((resolve) => {
  id += 1; pending.set(id, resolve);
  ws.send(JSON.stringify({ id, method, params }));
});

await send('Runtime.enable');
await send('Page.enable');
await send('Log.enable');
await send('Network.enable');

const failed = [];
ws.addEventListener('message', (event) => {
  const m = JSON.parse(event.data);
  if (m.method === 'Network.loadingFailed') failed.push(m.params.errorText);
  if (m.method === 'Network.responseReceived' && m.params.response.status >= 400) {
    failed.push(`${m.params.response.status} ${m.params.response.url}`);
  }
});

await send('Page.navigate', { url: APP_URL });
await new Promise((r) => setTimeout(r, 1200));
// Drop any cached service worker so tests always run against current files.
await send('Runtime.evaluate', {
  expression: `(async () => {
    const regs = await navigator.serviceWorker.getRegistrations();
    for (const r of regs) await r.unregister();
    const keys = await caches.keys();
    for (const k of keys) await caches.delete(k);
    localStorage.clear();
    return 'cleared';
  })()`,
  awaitPromise: true,
});
await send('Page.navigate', { url: `${APP_URL}?t=${Date.now()}` });
await new Promise((r) => setTimeout(r, 4500));

const probe = await send('Runtime.evaluate', {
  expression: `(async () => {
    const out = {};
    location.hash = '#/routine';
    await new Promise(r => setTimeout(r, 800));
    const root = document.getElementById('viewRoot');
    out.size = root.innerHTML.length;
    out.navCount = document.querySelectorAll('.nav-item').length;
    try {
      const { getState } = await import('./js/core/store.js');
      const s = getState();
      out.routine = s.routine.length;
      out.courses = s.courses.length;
      out.semesters = s.semesters.length;
      out.profile = s.profile.name;
    } catch (e) { out.storeErr = e.message; }
    return JSON.stringify(out);
  })()`,
  returnByValue: true,
  awaitPromise: true,
});
console.log('\nPROBE:', probe.result?.result?.value ?? JSON.stringify(probe.result));

if (failed.length) console.log('\nFAILED REQUESTS:', [...new Set(failed)].join('\n'));
ws.close();
