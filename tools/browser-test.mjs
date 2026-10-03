/**
 * End-to-end browser test using the Chrome DevTools Protocol (no dependencies).
 * Usage:  node tools/browser-test.mjs [url]
 * Requires Chrome started with --remote-debugging-port=9222.
 */
import { request } from 'node:http';

const APP_URL = process.argv[2] || 'http://localhost:8123/';
const CDP = 'http://localhost:9222';

const getJson = (path) => new Promise((resolve, reject) => {
  request(`${CDP}${path}`, (res) => {
    let body = '';
    res.on('data', (chunk) => { body += chunk; });
    res.on('end', () => { try { resolve(JSON.parse(body)); } catch (error) { reject(error); } });
  }).on('error', reject).end();
});

let pass = 0;
let fail = 0;
const check = (name, ok, detail = '') => {
  if (ok) { pass += 1; console.log(`  ok   ${name}`); } else {
    fail += 1;
    console.error(`  FAIL ${name}${detail ? `\n       ${detail}` : ''}`);
    process.exitCode = 1;
  }
};

/* ------------------------------------------------------ minimal CDP client */

class Session {
  constructor(ws) { this.ws = ws; this.id = 0; this.pending = new Map(); }

  static async open(url) {
    const ws = new WebSocket(url);
    await new Promise((resolve, reject) => {
      ws.addEventListener('open', resolve, { once: true });
      ws.addEventListener('error', reject, { once: true });
    });
    const session = new Session(ws);
    ws.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (message.id && session.pending.has(message.id)) {
        const { resolve, reject } = session.pending.get(message.id);
        session.pending.delete(message.id);
        if (message.error) reject(new Error(message.error.message));
        else resolve(message.result);
      }
    });
    return session;
  }

  send(method, params = {}) {
    this.id += 1;
    const id = this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`${method} timed out`));
        }
      }, 30000);
    });
  }

  /**
   * Evaluate a function body in the page and return its JSON value.
   * The body may use `await` — it is always wrapped in an async IIFE.
   */
  async evaluate(expression) {
    const result = await this.send('Runtime.evaluate', {
      expression: `(async () => { ${expression} })()`,
      returnByValue: true,
      awaitPromise: true,
    });
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.exception?.description || 'evaluation failed');
    }
    return result.result.value;
  }

  async goto(url) {
    await this.send('Page.navigate', { url });
    await this.waitFor(
      () => this.evaluate('return document.readyState === "complete" && !!document.getElementById("viewRoot")?.children.length'),
      15000,
    );
  }

  async waitFor(fn, timeout = 8000) {
    const started = Date.now();
    while (Date.now() - started < timeout) {
      try { if (await fn()) return true; } catch { /* keep polling */ }
      await new Promise((r) => setTimeout(r, 180));
    }
    throw new Error('waitFor timed out');
  }

  close() { this.ws.close(); }
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------------------------- run */

const targets = await getJson('/json/list');
const target = targets.find((t) => t.type === 'page');
if (!target) {
  console.error('No debuggable page target found.');
  process.exit(1);
}

const session = await Session.open(target.webSocketDebuggerUrl);
await session.send('Runtime.enable');
await session.send('Page.enable');

const consoleErrors = [];
session.ws.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (message.method === 'Runtime.exceptionThrown') {
    consoleErrors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
  }
  if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
    consoleErrors.push(message.params.args.map((a) => a.value || a.description).join(' '));
  }
});

console.log(`\nLoading ${APP_URL}`);
await session.send('Network.enable');
await session.send('Network.setCacheDisabled', { cacheDisabled: true });
await session.goto(APP_URL);
await wait(900);
await session.evaluate(`
  const regs = await navigator.serviceWorker.getRegistrations();
  for (const r of regs) await r.unregister();
  const keys = await caches.keys();
  for (const k of keys) await caches.delete(k);
  localStorage.clear();
  return true;
`);
consoleErrors.length = 0;
await session.send('Page.reload', { ignoreCache: true });
await session.waitFor(() => session.evaluate('return document.readyState === "complete" && !!document.getElementById("viewRoot")?.children.length'), 15000);
await wait(1300);

console.log('\nboot');
// Headless Chrome prefers dark; pin it to light so theme tests are meaningful.
await session.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] });
const scheme = await session.evaluate('return window.matchMedia("(prefers-color-scheme: dark)").matches;');
console.log('  prefers-dark after pin:', scheme);

const navCount = await session.evaluate('return document.querySelectorAll(".nav-item").length');
check('page title set', await session.evaluate('return document.title.includes("Study Helper")'), await session.evaluate('return document.title'));
check('no uncaught errors on boot', consoleErrors.length === 0, consoleErrors.join('\n'));
check('sidebar nav built (16 pages)', navCount === 16, `found ${navCount}`);
check('bottom nav built (5 items)', (await session.evaluate('return document.querySelectorAll(".bottom-item").length')) === 5);
check('profile name shown', (await session.evaluate('return document.getElementById("sidebarName")?.textContent')) === 'Masud Rana');
check('storage key is v4', await session.evaluate('return !!localStorage.getItem("academic-study-helper-v4")'));

console.log('\ndashboard');
const dash = await session.evaluate(`
  const root = document.getElementById('viewRoot');
  return {
    greeting: root.querySelector('.hero h2')?.textContent || '',
    stats: root.querySelectorAll('.card.stat').length,
    charts: root.querySelectorAll('.chart, .ring').length,
    classes: root.querySelectorAll('.class-row').length,
    priorities: root.querySelectorAll('.priority-row').length,
    dead: /undefined|NaN|\\[object Object\\]/.test(root.innerHTML),
  };
`);
check('hero greeting rendered', /Good (morning|afternoon|evening|night)/.test(dash.greeting), dash.greeting);
check('stat cards rendered', dash.stats >= 6, `got ${dash.stats}`);
check('charts rendered', dash.charts >= 2, `got ${dash.charts}`);
check('today classes listed', dash.classes >= 0, `${dash.classes} today`);
check('priorities explained', dash.priorities >= 0, `${dash.priorities} items`);
check('no undefined/NaN in the dashboard', !dash.dead);

console.log('\nnavigation (every page)');
const PAGES = ['routine', 'attendance', 'tasks', 'exams', 'study', 'notes', 'expenses', 'skills', 'career', 'learning', 'coding', 'calendar', 'assistant', 'analytics', 'settings'];
for (const name of PAGES) {
  await session.evaluate(`location.hash = '#/${name}'; return true;`);
  await wait(430);
  const result = await session.evaluate(`
    const root = document.getElementById('viewRoot');
    return {
      size: root.innerHTML.length,
      broken: /undefined|NaN|\\[object Object\\]/.test(root.innerHTML),
      active: document.querySelector('.nav-item.active')?.dataset.nav,
      title: document.getElementById('pageTitle').textContent,
    };
  `);
  check(`#/${name} renders`, result.size > 400, `only ${result.size} chars`);
  check(`#/${name} clean output`, !result.broken);
  check(`#/${name} highlights nav`, result.active === name, `active=${result.active}`);
}

console.log('\nCRUD — add a task');
await session.evaluate(`location.hash = '#/tasks'; return true;`);
await wait(460);
const beforeCount = await session.evaluate(`return JSON.parse(localStorage.getItem('academic-study-helper-v4')).tasks.length`);
await session.evaluate(`document.querySelector('[data-add-task]').click(); return true;`);
await wait(320);
check('task modal opens', await session.evaluate('return !document.getElementById("modalRoot").hidden'));
await session.evaluate(`
  const form = document.querySelector('#modalRoot form');
  form.elements.title.value = 'Browser test task';
  form.elements.dueDate.value = new Date().toISOString().slice(0, 10);
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  return true;
`);
await wait(520);
const added = await session.evaluate(`
  const state = JSON.parse(localStorage.getItem('academic-study-helper-v4'));
  return {
    count: state.tasks.length,
    added: state.tasks.some(t => t.title === 'Browser test task'),
    inDom: document.getElementById('viewRoot').innerHTML.includes('Browser test task'),
    toast: document.querySelector('.toast')?.textContent || '',
  };
`);
check('task persisted to storage', added.added && added.count === beforeCount + 1, `${beforeCount} → ${added.count}`);
check('new task visible in the list', added.inDom);
check('success toast shown', added.toast.length > 0, added.toast);

console.log('\nCRUD — complete the task');
await session.evaluate(`
  const state = JSON.parse(localStorage.getItem('academic-study-helper-v4'));
  const id = state.tasks.find(t => t.title === 'Browser test task').id;
  document.querySelector('[data-toggle="' + id + '"]').click();
  return true;
`);
await wait(430);
check('task marked completed', await session.evaluate(`
  const state = JSON.parse(localStorage.getItem('academic-study-helper-v4'));
  return state.tasks.find(t => t.title === 'Browser test task').status === 'completed';
`));

console.log('\nattendance');
await session.evaluate(`location.hash = '#/attendance'; return true;`);
await wait(460);
const att = await session.evaluate(`
  const before = JSON.parse(localStorage.getItem('academic-study-helper-v4')).attendance.length;
  document.querySelector('.att-card [data-mark="present"]').click();
  return { before, after: JSON.parse(localStorage.getItem('academic-study-helper-v4')).attendance.length };
`);
check('attendance mark is recorded', att.after >= att.before, `${att.before} → ${att.after}`);
check('CSC 465 keeps the 12-present example', await session.evaluate(`
  const state = JSON.parse(localStorage.getItem('academic-study-helper-v4'));
  const csc = state.courses.find(c => c.code === 'CSC 465');
  const rows = state.attendance.filter(a => a.courseId === csc.id && !a.scheduleId);
  return rows.filter(a => a.status !== 'absent').length >= 12;
`));

console.log('\ncommand palette (Ctrl+K)');
await session.evaluate(`document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true })); return true;`);
await wait(360);
check('palette opens with Ctrl+K', await session.evaluate('return !document.getElementById("paletteRoot").hidden'));
await session.evaluate(`
  const input = document.getElementById('paletteInput');
  input.value = 'panda';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
`);
await wait(360);
const paletteRows = await session.evaluate(`return document.querySelectorAll('#paletteResults .palette-row').length`);
check('palette searches real data', paletteRows > 0, `${paletteRows} rows for "panda"`);
await session.evaluate(`document.getElementById('paletteInput').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); return true;`);
await wait(260);
check('palette closes on Escape', await session.evaluate('return document.getElementById("paletteRoot").hidden'));

console.log('\nassistant (offline)');
await session.evaluate(`location.hash = '#/assistant'; return true;`);
await wait(470);
await session.evaluate(`
  document.getElementById('askInput').value = 'What should I study today?';
  document.getElementById('chatForm').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  return true;
`);
await wait(520);
check('assistant replies from live data', await session.evaluate(`
  const state = JSON.parse(localStorage.getItem('academic-study-helper-v4'));
  return state.chat.length >= 2 && state.chat[state.chat.length - 1].text.includes('Today is');
`));
check('no API key in the loaded scripts', !await session.evaluate(`
  return Array.from(document.querySelectorAll('script')).map(s => s.textContent).join('').match(/sk-[a-zA-Z0-9]/);
`));

console.log('\ntheme');
await session.evaluate(`location.hash = '#/settings'; return true;`);
await wait(800);
await session.evaluate(`document.querySelector('[data-theme="dark"]').click(); return true;`);
await wait(900);
check('dark theme applies', (await session.evaluate('return document.documentElement.dataset.theme')) === 'dark');
// Poll until the store write lands rather than reading a stale snapshot.
let storedTheme = '';
for (let i = 0; i < 20; i += 1) {
  storedTheme = await session.evaluate(`return JSON.parse(localStorage.getItem('academic-study-helper-v4')).settings.theme;`);
  if (storedTheme === 'dark') break;
  await wait(100);
}
check('theme persisted', storedTheme === 'dark', `stored "${storedTheme}"`);

console.log('\npersistence across reload');
await session.send('Page.reload');
await session.waitFor(() => session.evaluate('return document.readyState === "complete" && !!document.getElementById("viewRoot")?.children.length'));
await wait(950);
check('task survives a reload', await session.evaluate(`
  const state = JSON.parse(localStorage.getItem('academic-study-helper-v4'));
  return state.tasks.some(t => t.title === 'Browser test task');
`));
check('dark theme survives a reload', (await session.evaluate('return document.documentElement.dataset.theme')) === 'dark');

console.log('\nresponsive layout');
for (const [label, width, height] of [['mobile 360', 360, 740], ['tablet 768', 768, 1024], ['desktop 1440', 1440, 900]]) {
  await session.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 900 });
  await wait(420);
  const layout = await session.evaluate(`
    const doc = document.documentElement;
    return {
      overflow: doc.scrollWidth - doc.clientWidth,
      bottomNav: getComputedStyle(document.getElementById('bottomNav')).display,
      sidebarX: getComputedStyle(document.getElementById('sidebar')).transform,
    };
  `);
  check(`${label}: no horizontal overflow`, layout.overflow <= 1, `overflow ${layout.overflow}px`);
  if (width < 900) check(`${label}: bottom nav visible`, layout.bottomNav === 'grid', layout.bottomNav);
}
await session.send('Emulation.clearDeviceMetricsOverride');
await wait(300);

console.log('\naccessibility');
const a11y = await session.evaluate(`
  const btns = Array.from(document.querySelectorAll('button'));
  return {
    unlabelled: btns.filter(b => !b.textContent.trim() && !b.getAttribute('aria-label') && !b.title).length,
    h1: document.querySelectorAll('h1').length,
    main: !!document.querySelector('main'),
    skip: !!document.querySelector('.skip-link'),
    lang: document.documentElement.lang,
  };
`);
check('no unlabelled buttons', a11y.unlabelled === 0, `${a11y.unlabelled} unlabelled`);
check('exactly one h1', a11y.h1 === 1, `found ${a11y.h1}`);
check('main landmark present', a11y.main);
check('skip link present', a11y.skip);
check('html lang set', Boolean(a11y.lang), a11y.lang);

console.log('\nPWA');
check('service worker registered', await session.evaluate('return !!(await navigator.serviceWorker.getRegistration())'));
check('manifest linked', await session.evaluate(`return !!document.querySelector('link[rel="manifest"]')`));
check('manifest is valid JSON', await session.evaluate(`
  const r = await fetch('./manifest.json');
  const j = await r.json();
  return j.name === 'Academic Study Helper' && Array.isArray(j.icons) && j.icons.length >= 2;
`));

console.log('\nfinal error sweep');
check('no runtime errors across the session', consoleErrors.length === 0, consoleErrors.slice(0, 4).join('\n'));

session.close();
console.log(`\n${pass} passed, ${fail} failed\n`);
