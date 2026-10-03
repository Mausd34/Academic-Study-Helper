/**
 * Tiny hash-free router driven by the History API.
 * Works on GitHub Pages without any server rewrite rules.
 */
import { guard } from './utils.js';
import { detach } from './parts.js';

const routes = new Map();
let current = 'dashboard';
let onChange = null;
let container = null;
const params = new Map();

/** Register a view. render(root, params) -> void */
export function route(name, render, options = {}) {
  routes.set(name, { render, ...options });
}

export function setContainer(el) {
  container = el;
}

export function onRouteChange(fn) {
  onChange = fn;
}

export const currentRoute = () => current;
export const currentParams = (key) => params.get(key);

/** Parse "#/tasks?view=Today" into { name, params }. */
function parseHash() {
  const raw = window.location.hash.replace(/^#\/?/, '');
  const [name, query] = raw.split('?');
  const entries = new URLSearchParams(query || '');
  return { name: name || 'dashboard', params: entries };
}

/** Navigate to a view. query is an optional object of params. */
export function go(name, query = {}) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  }
  const suffix = search.toString();
  const target = `#/${name}${suffix ? `?${suffix}` : ''}`;
  if (window.location.hash === target) {
    render();
    return;
  }
  window.location.hash = target;
}

/** Re-render the current view in place. */
export function refresh() {
  render();
}

/** Start routing. Safe to call once. */
export function startRouter() {
  window.addEventListener('hashchange', render);
  if (!window.location.hash) window.location.hash = '#/dashboard';
  render();
}

function render() {
  guard('router', () => {
    const { name, params: query } = parseHash();
    params.clear();
    for (const [key, value] of query) params.set(key, value);
    const entry = routes.get(name) || routes.get('dashboard');
    current = routes.has(name) ? name : 'dashboard';
    if (!container) return;
    // Drop listeners registered by the previous view before clearing it.
    detach(container);
    container.innerHTML = '';
    container.scrollTop = 0;
    document.getElementById('content')?.scrollTo({ top: 0 });
    entry.render(container, Object.fromEntries(params));
    onChange?.(current, Object.fromEntries(params));
  });
}

/** Delegated click handling for [data-go="view"] buttons. */
export function bindNavigation(root = document) {
  root.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-go]');
    if (!trigger) return;
    event.preventDefault();
    const [name, ...rest] = trigger.dataset.go.split(':');
    go(name, rest.length ? { sub: rest.join(':') } : {});
  });
}
