/**
 * UI kit: toasts, modals, confirm dialogs, form builders, empty states.
 * All rendering is plain HTML strings; all user data goes through esc().
 */
import { esc, uid, $ } from './utils.js';

/* ----------------------------------------------------------------- toasts */

/** Show a toast. kind: 'success' | 'error' | 'info' | 'warn' */
export function toast(message, kind = 'success', ms = 2600) {
  const stack = $('#toastStack');
  if (!stack) return;
  const el = document.createElement('div');
  el.className = `toast toast-${kind}`;
  el.setAttribute('role', kind === 'error' ? 'alert' : 'status');
  el.textContent = message;
  stack.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 300);
  }, ms);
}

export const toastOk = (m) => toast(m, 'success');
export const toastErr = (m) => toast(m, 'error', 3600);
export const toastInfo = (m) => toast(m, 'info');

/* ----------------------------------------------------------------- modals */

let lastFocused = null;

/**
 * Open a modal.
 * @param {{title: string, body: string, actions?: Array, onMount?: Function, size?: string}} config
 */
export function openModal({ title, body, actions = [], onMount, size = '' }) {
  const root = $('#modalRoot');
  const modal = $('#modalRoot .modal');
  lastFocused = document.activeElement;
  $('#modalTitle').textContent = title;
  $('#modalBody').innerHTML = body;
  $('#modalFoot').innerHTML = actions
    .map((action, i) => `<button class="btn ${action.variant || ''}" data-action-index="${i}" type="button">${esc(action.label)}</button>`)
    .join('');
  modal.className = `modal ${size}`;
  root.hidden = false;
  document.body.classList.add('modal-open');

  $('#modalFoot').onclick = (event) => {
    const button = event.target.closest('[data-action-index]');
    if (!button) return;
    const action = actions[Number(button.dataset.actionIndex)];
    if (!action) return;
    if (action.onClick) action.onClick();
    if (action.close !== false) closeModal();
  };
  root.querySelector('.modal-scrim').onclick = () => closeModal();
  modal.querySelector('[data-close-modal]').onclick = () => closeModal();

  onMount?.(modal);
  const focusTarget = modal.querySelector('input, textarea, select, button.btn-primary');
  focusTarget?.focus();
}

export function closeModal() {
  const root = $('#modalRoot');
  if (!root || root.hidden) return;
  root.hidden = true;
  $('#modalBody').innerHTML = '';
  document.body.classList.remove('modal-open');
  if (lastFocused && document.contains(lastFocused)) lastFocused.focus();
  lastFocused = null;
}

export const isModalOpen = () => !$('#modalRoot').hidden;

/** Promise-based confirm dialog. @returns {Promise<boolean>} */
export function confirmDialog({ title = 'Are you sure?', message = '', confirmLabel = 'Confirm', danger = true }) {
  return new Promise((resolve) => {
    const root = $('#modalRoot');
    const observer = new MutationObserver(() => {
      if (root.hidden) {
        observer.disconnect();
        resolve(false);
      }
    });
    observer.observe(root, { attributes: true, attributeFilter: ['hidden'] });
    openModal({
      title,
      body: `<p class="confirm-text">${esc(message)}</p>`,
      actions: [
        { label: 'Cancel', variant: 'ghost', close: false, onClick: () => resolve(false) },
        { label: confirmLabel, variant: danger ? 'danger' : 'primary', close: false, onClick: () => resolve(true) },
      ],
    });
  });
}

/* ------------------------------------------------------------------ forms */

let fieldSeq = 0;

/**
 * Build a form from a field spec.
 * fields: [{ name, label, type, value, options, required, placeholder, hint, min, max, step, full, rows }]
 * type: text | number | date | time | textarea | select | checkbox | range | tags
 */
export function buildForm(fields, { submitLabel = 'Save', cancelLabel = 'Cancel', id = `form-${uid('f')}` } = {}) {
  const body = fields.map((field) => renderField(field, id)).join('');
  return `
    <form id="${esc(id)}" class="form-grid" novalidate>
      ${body}
      <div class="form-actions full">
        <button class="btn primary" type="submit">${esc(submitLabel)}</button>
        <button class="btn ghost" type="button" data-cancel>${esc(cancelLabel)}</button>
      </div>
    </form>`;
}

function renderField(field, formId) {
  fieldSeq += 1;
  const fieldId = `${formId}-${field.name}-${fieldSeq}`;
  const common = `id="${esc(fieldId)}" name="${esc(field.name)}"${field.required ? ' required' : ''}${field.placeholder ? ` placeholder="${esc(field.placeholder)}"` : ''}`;
  const wrap = (control) => `
    <div class="field ${field.full ? 'full' : ''}">
      <label for="${esc(fieldId)}">${esc(field.label)}${field.required ? ' <span class="req">*</span>' : ''}</label>
      ${control}
      ${field.hint ? `<small class="hint">${esc(field.hint)}</small>` : ''}
    </div>`;

  switch (field.type) {
    case 'textarea':
      return wrap(`<textarea ${common} rows="${field.rows || 4}">${esc(field.value ?? '')}</textarea>`);
    case 'select':
      return wrap(`<select ${common}>${(field.options || []).map((opt) => {
        const value = typeof opt === 'string' ? opt : opt.value;
        const label = typeof opt === 'string' ? opt : opt.label;
        return `<option value="${esc(value)}"${String(field.value) === String(value) ? ' selected' : ''}>${esc(label)}</option>`;
      }).join('')}</select>`);
    case 'checkbox':
      return `<div class="field field-check">
        <label class="check"><input type="checkbox" id="${esc(fieldId)}" name="${esc(field.name)}"${field.value ? ' checked' : ''}> ${esc(field.label)}</label>
        ${field.hint ? `<small class="hint">${esc(field.hint)}</small>` : ''}
      </div>`;
    case 'range':
      return wrap(`<input type="range" ${common} min="${field.min ?? 0}" max="${field.max ?? 100}" step="${field.step ?? 1}" value="${esc(field.value ?? 0)}"><output class="range-out">${esc(field.value ?? 0)}${esc(field.unit || '')}</output>`);
    case 'number':
      return wrap(`<input type="number" ${common} value="${esc(field.value ?? '')}"${field.min !== undefined ? ` min="${field.min}"` : ''}${field.max !== undefined ? ` max="${field.max}"` : ''}${field.step ? ` step="${field.step}"` : ''}>`);
    case 'tags':
      return wrap(`<input type="text" ${common} value="${esc((field.value || []).join(', '))}" placeholder="comma, separated">`);
    case 'date':
    case 'time':
    case 'text':
    default:
      return wrap(`<input type="${esc(field.type || 'text')}" ${common} value="${esc(field.value ?? '')}">`);
  }
}

/** Read a form into a plain object. Checkboxes → boolean, tags → array. */
export function readForm(formEl, fields) {
  const out = {};
  for (const field of fields) {
    const el = formEl.elements[field.name];
    if (!el) continue;
    if (field.type === 'checkbox') out[field.name] = el.checked;
    else if (field.type === 'tags') out[field.name] = String(el.value || '').split(',').map((s) => s.trim()).filter(Boolean);
    else if (field.type === 'number' || field.type === 'range') out[field.name] = el.value === '' ? null : Number(el.value);
    else out[field.name] = String(el.value ?? '').trim();
  }
  return out;
}

/** Wire submit + cancel for a form rendered by buildForm. */
export function bindForm(formEl, fields, onSubmit) {
  formEl.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!formEl.reportValidity()) {
      toastErr('Please fill in the required fields.');
      return;
    }
    onSubmit(readForm(formEl, fields), formEl);
  });
  formEl.querySelector('[data-cancel]')?.addEventListener('click', () => closeModal());
  const range = formEl.querySelector('input[type="range"]');
  if (range) {
    range.addEventListener('input', () => {
      const out = range.parentElement.querySelector('.range-out');
      if (out) out.textContent = range.value;
    });
  }
}

/* -------------------------------------------------------- shared fragments */

export const emptyState = (title, message, action = '') => `
  <div class="empty">
    <div class="empty-icon" aria-hidden="true">◎</div>
    <strong>${esc(title)}</strong>
    <p class="muted">${esc(message)}</p>
    ${action}
  </div>`;

export const card = (title, body, { subtitle = '', actions = '', className = '' } = {}) => `
  <section class="card ${className}">
    ${title ? `<header class="card-head">
      <div><h2>${esc(title)}</h2>${subtitle ? `<p class="muted small">${esc(subtitle)}</p>` : ''}</div>
      ${actions ? `<div class="card-actions">${actions}</div>` : ''}
    </header>` : ''}
    ${body}
  </section>`;

export const statCard = (label, value, sub = '', tone = '') => `
  <div class="card stat ${tone}">
    <span class="stat-label">${esc(label)}</span>
    <strong class="stat-value">${esc(value)}</strong>
    ${sub ? `<span class="stat-sub">${esc(sub)}</span>` : ''}
  </div>`;

export const progressBar = (value, tone = '') => `
  <div class="progress" role="progressbar" aria-valuenow="${Math.round(value)}" aria-valuemin="0" aria-valuemax="100">
    <i class="${tone}" style="width:${Math.max(0, Math.min(100, value))}%"></i>
  </div>`;

export const badge = (text, tone = '') => `<span class="badge ${tone}">${esc(text)}</span>`;

/** Tab strip. options: string[] or {value,label}[]. */
export const segmented = (options, active, attribute) => `
  <div class="segmented" role="tablist">
    ${options.map((opt) => {
    const value = typeof opt === 'string' ? opt : opt.value;
    const label = typeof opt === 'string' ? opt : opt.label;
    return `<button role="tab" class="seg ${String(value) === String(active) ? 'active' : ''}" aria-selected="${String(value) === String(active)}" ${attribute}="${esc(value)}" type="button">${esc(label)}</button>`;
  }).join('')}
  </div>`;

/** Simple skeleton placeholder for lazy sections. */
export const skeleton = (rows = 3) => `
  <div class="skeleton-wrap" aria-hidden="true">
    ${Array.from({ length: rows }, () => '<div class="skeleton"></div>').join('')}
  </div>`;
