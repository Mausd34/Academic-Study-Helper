/**
 * Shared helpers: escaping, ids, dates, numbers, DOM.
 * Every module imports from here — no globals leaked.
 */

export const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/* ---------------------------------------------------------------- escaping */

const ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Escape a value for safe interpolation into HTML. Always use for user data. */
export function esc(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[&<>"']/g, (ch) => ENTITIES[ch]);
}

/** Strip every tag, used for previews and for search indexing. */
export function stripTags(value) {
  return String(value ?? '').replace(/<[^>]*>/g, ' ');
}

/** Inline markdown applied to already-escaped text. */
function inlineMd(text) {
  return text
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
}

/** Small markdown subset for notes. Input is escaped before any tag is added. */
export function renderMarkdown(source) {
  const text = esc(String(source ?? '').replace(/\r\n/g, '\n'));
  const blocks = text.split(/\n{2,}/).map((block) => {
    const out = [];
    let inList = false;
    for (const raw of block.split('\n')) {
      const line = raw.replace(/\s+$/, '');
      const heading = /^(#{1,4})\s+(.*)$/.exec(line);
      const bullet = /^\s*[-*]\s+(.*)$/.exec(line);
      const quote = /^&gt;\s?(.*)$/.exec(line);
      if (heading) {
        if (inList) { out.push('</ul>'); inList = false; }
        const level = Math.min(heading[1].length + 1, 5);
        out.push(`<h${level}>${inlineMd(heading[2])}</h${level}>`);
      } else if (bullet) {
        if (!inList) { out.push('<ul>'); inList = true; }
        out.push(`<li>${inlineMd(bullet[1])}</li>`);
      } else if (quote) {
        if (inList) { out.push('</ul>'); inList = false; }
        out.push(`<blockquote>${inlineMd(quote[1])}</blockquote>`);
      } else if (line.trim() === '') {
        if (inList) { out.push('</ul>'); inList = false; }
      } else {
        if (inList) { out.push('</ul>'); inList = false; }
        out.push(`<p>${inlineMd(line)}</p>`);
      }
    }
    if (inList) out.push('</ul>');
    return out.join('');
  });
  return blocks.join('') || '<p class="muted">Empty note.</p>';
}

/* --------------------------------------------------------------------- ids */

let idCounter = 0;

/** Collision-resistant id that stays readable in exported JSON. */
export function uid(prefix = 'id') {
  idCounter = (idCounter + 1) % 1000;
  return `${prefix}_${Date.now().toString(36)}${idCounter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export const nowISO = () => new Date().toISOString();


/* ------------------------------------------------------------------- dates */

/** Local YYYY-MM-DD (never UTC — avoids off-by-one in Bangladesh UTC+6). */
export function toDateKey(value = new Date()) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromDateKey(key) {
  if (!key) return null;
  const [y, m, d] = String(key).split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

export function addDays(key, days) {
  const d = fromDateKey(key) || new Date();
  d.setDate(d.getDate() + days);
  return toDateKey(d);
}

export const todayKey = () => toDateKey(new Date());

export function dayName(key) {
  const d = fromDateKey(key);
  return d ? DAYS[d.getDay()] : '';
}

export function formatDate(key, opts = {}) {
  const d = fromDateKey(key);
  if (!d) return '—';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', ...opts });
}

export function formatDateTime(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/** Whole days from today until `key`. Negative means past. */
export function daysUntil(key) {
  const target = fromDateKey(key);
  if (!target) return null;
  return Math.round((target - fromDateKey(todayKey())) / 86400000);
}

export function countdownLabel(key) {
  const diff = daysUntil(key);
  if (diff === null) return { text: 'No date', tone: 'muted' };
  if (diff === 0) return { text: 'Today', tone: 'info' };
  if (diff === 1) return { text: 'Tomorrow', tone: 'info' };
  if (diff < 0) return { text: `${Math.abs(diff)} day${Math.abs(diff) === 1 ? '' : 's'} overdue`, tone: 'danger' };
  return { text: `${diff} day${diff === 1 ? '' : 's'} left`, tone: diff <= 3 ? 'warning' : 'muted' };
}

export function timeAgo(iso) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '—';
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(toDateKey(new Date(then)));
}

/* ------------------------------------------------------------------ numbers */

export const clamp = (n, min = 0, max = 100) => Math.min(max, Math.max(min, Number(n) || 0));

export function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function percent(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 1000) / 10;
}

export function formatMoney(amount) {
  return `৳${toNumber(amount).toLocaleString('en-BD', { maximumFractionDigits: 0 })}`;
}

export function formatHours(minutes) {
  const total = toNumber(minutes);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (!h) return `${m}m`;
  if (!m) return `${h}h`;
  return `${h}h ${m}m`;
}

export function formatClock(seconds) {
  const s = Math.max(0, Math.round(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export function greeting(date = new Date()) {
  const h = date.getHours();
  if (h < 5) return 'Good night';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Good night';
}

/* --------------------------------------------------------------------- time */

/** "09:35" -> 575 minutes. Returns null when unparseable. */
export function timeToMinutes(time) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(time ?? '').trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) return null;
  return h * 60 + m;
}

export function minutesToTime(total) {
  const value = Math.max(0, Math.min(24 * 60 - 1, Math.round(total)));
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
}

export function durationLabel(start, end) {
  const from = timeToMinutes(start);
  const to = timeToMinutes(end);
  if (from === null || to === null || to < from) return '—';
  return `${to - from} min`;
}

export function currentTimeString(date = new Date()) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}


/* ---------------------------------------------------------------------- DOM */

export const $ = (selector, scope = document) => scope.querySelector(selector);
export const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

/** Build an element from an HTML string. */
export function fromHTML(html) {
  const template = document.createElement('template');
  template.innerHTML = String(html).trim();
  return template.content.firstElementChild;
}

/** Case-insensitive substring test. */
export function matches(haystack, needle) {
  if (!needle) return true;
  return String(haystack ?? '').toLowerCase().includes(String(needle).toLowerCase());
}

/** Multi-key sorter: sortBy(list, { key: 'due', dir: 'asc' }, { key: (t) => t.priorityRank }) */
export function sortBy(list, ...selectors) {
  return [...list].sort((a, b) => {
    for (const selector of selectors) {
      const dir = selector.dir === 'desc' ? -1 : 1;
      const get = typeof selector.key === 'function' ? selector.key : (item) => item[selector.key];
      const av = get(a);
      const bv = get(b);
      if (av === bv) continue;
      if (av === null || av === undefined || av === '') return 1;
      if (bv === null || bv === undefined || bv === '') return -1;
      return (typeof av === 'string' ? av.localeCompare(bv) : av - bv) * dir;
    }
    return 0;
  });
}

export function groupBy(list, keyFn) {
  const map = new Map();
  for (const item of list) {
    const key = keyFn(item);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }
  return map;
}

export function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

/** Run `fn` inside try/catch so one broken feature never kills the app. */
export function guard(label, fn, fallback = null) {
  try {
    return fn();
  } catch (error) {
    console.error(`[${label}]`, error);
    return fallback;
  }
}

export function debounce(fn, wait = 220) {
  let handle;
  return (...args) => {
    clearTimeout(handle);
    handle = setTimeout(() => fn(...args), wait);
  };
}
