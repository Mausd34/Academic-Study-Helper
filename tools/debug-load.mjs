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
    const sheets = [...document.styleSheets].map(s => { try { return s.cssRules.length; } catch { return 'blocked'; } });
    out.sheetRuleCounts = sheets;

    // Theme persistence check.
    location.hash = '#/settings';
    await new Promise(r => setTimeout(r, 700));
    const darkBtn = document.querySelector('[data-theme="dark"]');
    out.hasDarkButton = !!darkBtn;
    if (darkBtn) {
      darkBtn.click();
      await new Promise(r => setTimeout(r, 500));
      out.themeAfterClick = document.documentElement.dataset.theme;
      out.storedTheme = JSON.parse(localStorage.getItem('academic-study-helper-v4')).settings.theme;
    }

    // Mobile layout check.
    return JSON.stringify(out);
  })()`,
  returnByValue: true,
  awaitPromise: true,
});
console.log('\nPROBE-1:', probe.result?.result?.value ?? JSON.stringify(probe.result));

await send('Emulation.setDeviceMetricsOverride', { width: 360, height: 740, deviceScaleFactor: 1, mobile: true });
await new Promise((r) => setTimeout(r, 800));

const probe2 = await send('Runtime.evaluate', {
  expression: `(async () => {
    const out = {};
    const nav = document.getElementById('bottomNav');
    const cs = getComputedStyle(nav);
    out.display = cs.display;
    out.position = cs.position;
    out.matches900 = window.matchMedia('(max-width: 900px)').matches;
    out.innerWidth = window.innerWidth;
    out.docClientWidth = document.documentElement.clientWidth;
    out.metaViewport = document.querySelector('meta[name=viewport]')?.content;

    // Which CSS rules actually set display on .bottom-nav?
    const hits = [];
    for (const sheet of document.styleSheets) {
      let rules; try { rules = sheet.cssRules; } catch { continue; }
      for (const rule of rules) {
        if (rule.media) {
          for (const sub of rule.cssRules) {
            if (sub.selectorText && sub.selectorText.includes('bottom-nav') && sub.style.display) {
              hits.push('@media ' + rule.conditionText + ' -> ' + sub.selectorText + ' { display:' + sub.style.display + ' }');
            }
          }
        } else if (rule.selectorText && rule.selectorText.includes('bottom-nav') && rule.style.display) {
          hits.push('base -> ' + rule.selectorText + ' { display:' + rule.style.display + ' }');
        }
      }
    }
    out.rules = hits;
    return JSON.stringify(out);
  })()`,
  returnByValue: true,
  awaitPromise: true,
});
console.log('\nPROBE-2 (mobile 360):', probe2.result?.result?.value ?? JSON.stringify(probe2.result));

if (failed.length) console.log('\nFAILED REQUESTS:', [...new Set(failed)].join('\n'));
ws.close();
