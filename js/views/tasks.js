/**
 * Tasks / assignments — full CRUD with views, filters, search and sorting.
 */
import { esc, todayKey, formatDate, countdownLabel, sortBy, nowISO, matches, debounce } from '../core/utils.js';
import { getState, list, update } from '../core/store.js';
import { taskCounts, taskCompletionSeries } from '../core/analytics.js';
import { barChart } from '../core/charts.js';
import { openModal, buildForm, bindForm, closeModal, confirmDialog, toastOk, toastErr } from '../core/ui.js';
import { taskFields, PRIORITIES } from '../core/forms.js';
import { card, emptyState, badge, statRow } from '../core/parts.js';

const VIEWS = ['All', 'Today', 'Upcoming', 'Overdue', 'Completed'];
const PRIORITY_TONE = { Urgent: 'danger', High: 'warning', Medium: 'info', Low: 'muted' };
const STATUS_LABEL = { pending: 'Pending', 'in-progress': 'In Progress', completed: 'Completed' };

let view = 'All';
let query = '';
let sortByKey = 'due';

/* --------------------------------------------------------------- selectors */

function filtered(state) {
  const today = todayKey();
  return state.tasks.filter((task) => {
    if (view === 'Today' && !(task.dueDate === today && task.status !== 'completed')) return false;
    if (view === 'Upcoming' && (task.status === 'completed' || !task.dueDate || task.dueDate < today)) return false;
    if (view === 'Overdue' && !(task.status !== 'completed' && task.dueDate && task.dueDate < today)) return false;
    if (view === 'Completed' && task.status !== 'completed') return false;
    if (query && !matches(`${task.title} ${task.description} ${(task.tags || []).join(' ')} ${courseName(state, task.courseId)}`, query)) return false;
    return true;
  });
}

const courseName = (state, id) => state.courses.find((c) => c.id === id)?.code || 'Unassigned';

function sorted(rows) {
  const rank = { Urgent: 4, High: 3, Medium: 2, Low: 1 };
  if (sortByKey === 'priority') return sortBy(rows, { key: (t) => rank[t.priority] || 0, dir: 'desc' }, { key: 'dueDate' });
  if (sortByKey === 'title') return sortBy(rows, { key: 'title' });
  if (sortByKey === 'created') return sortBy(rows, { key: 'createdAt', dir: 'desc' });
  return sortBy(rows, { key: 'dueDate' }, { key: (t) => -(rank[t.priority] || 0) });
}

function taskRow(state, task) {
  const count = countdownLabel(task.dueDate);
  const done = task.status === 'completed';
  return `
    <li class="task-row ${done ? 'done' : ''}">
      <label class="check">
        <input type="checkbox" ${done ? 'checked' : ''} data-toggle="${esc(task.id)}" aria-label="Mark ${esc(task.title)} ${done ? 'pending' : 'completed'}">
      </label>
      <span class="task-body">
        <strong>${esc(task.title)}</strong>
        <small>${esc(courseName(state, task.courseId))} · ${task.dueDate ? esc(formatDate(task.dueDate)) : 'No due date'}${task.estimateHours ? ` · ${task.estimateHours}h est.` : ''}</small>
        ${(task.tags || []).length ? `<span class="tag-row">${task.tags.map((tag) => `<span class="tag">${esc(tag)}</span>`).join('')}</span>` : ''}
      </span>
      <span class="task-meta">
        ${badge(task.priority, PRIORITY_TONE[task.priority])}
        ${!done && task.dueDate ? badge(count.text, count.tone) : ''}
        ${done ? badge('Completed', 'success') : badge(STATUS_LABEL[task.status], task.status === 'in-progress' ? 'info' : '')}
      </span>
      <span class="row-actions">
        <button class="btn small ghost" data-cycle="${esc(task.id)}" title="Change status">⟳</button>
        <button class="btn small ghost" data-edit="${esc(task.id)}">Edit</button>
        <button class="btn small danger" data-del="${esc(task.id)}">Delete</button>
      </span>
    </li>`;
}

/* ---------------------------------------------------------------- actions */

export function openTaskForm(id) {
  const existing = id ? list.find('tasks', id) : null;
  const fields = taskFields(existing || {});
  openModal({
    title: existing ? 'Edit task' : 'Add task',
    body: buildForm(fields, { submitLabel: existing ? 'Save changes' : 'Add task' }),
    onMount: (modal) => {
      bindForm(modal.querySelector('form'), fields, (values) => {
        if (!values.title) return toastErr('Task title is required.');
        if (existing) {
          list.patch('tasks', id, values);
          toastOk('Task updated.');
        } else {
          list.add('tasks', { ...values, createdAt: nowISO(), completedAt: null });
          toastOk('Task added successfully.');
        }
        closeModal();
      });
    },
  });
}

function toggleTask(id) {
  const task = list.find('tasks', id);
  if (!task) return;
  const next = task.status === 'completed' ? 'pending' : 'completed';
  list.patch('tasks', id, { status: next, completedAt: next === 'completed' ? nowISO() : null });
  toastOk(next === 'completed' ? 'Task completed 🎉' : 'Task reopened.');
}

function cycleStatus(id) {
  const task = list.find('tasks', id);
  if (!task) return;
  const order = ['pending', 'in-progress', 'completed'];
  const next = order[(order.indexOf(task.status) + 1) % order.length];
  list.patch('tasks', id, { status: next, completedAt: next === 'completed' ? nowISO() : null });
  toastOk(`Status: ${STATUS_LABEL[next]}.`);
}

async function removeTask(id) {
  const task = list.find('tasks', id);
  const ok = await confirmDialog({ title: 'Delete task?', message: `“${task?.title || ''}” will be removed permanently.`, confirmLabel: 'Delete' });
  if (!ok) return;
  list.remove('tasks', id);
  toastOk('Task deleted.');
}


/* ----------------------------------------------------------------- render */

export function renderTasks(root) {
  const state = getState();
  const counts = taskCounts(state);
  const rows = sorted(filtered(state));

  root.innerHTML = `
    ${statRow([
    { label: 'All tasks', value: String(counts.total), sub: `${counts.pending} pending` },
    { label: 'In progress', value: String(counts.inProgress), sub: 'being worked on' },
    { label: 'Completed', value: String(counts.completed), sub: 'done', tone: 'ok' },
    { label: 'Overdue', value: String(counts.overdue), sub: 'need attention', tone: counts.overdue ? 'warn' : '' },
  ])}

    ${card('Tasks', `
      <div class="toolbar">
        <div class="segmented" role="tablist">
          ${VIEWS.map((v) => `<button role="tab" class="seg ${v === view ? 'active' : ''}" data-view="${esc(v)}" aria-selected="${v === view}">${esc(v)}</button>`).join('')}
        </div>
        <div class="toolbar-right">
          <input id="taskSearch" type="search" placeholder="Search tasks…" value="${esc(query)}" aria-label="Search tasks">
          <select id="taskSort" aria-label="Sort tasks">
            <option value="due"${sortByKey === 'due' ? ' selected' : ''}>Sort: Due date</option>
            <option value="priority"${sortByKey === 'priority' ? ' selected' : ''}>Sort: Priority</option>
            <option value="title"${sortByKey === 'title' ? ' selected' : ''}>Sort: Title</option>
            <option value="created"${sortByKey === 'created' ? ' selected' : ''}>Sort: Newest</option>
          </select>
        </div>
      </div>
      <div style="margin-top:14px">
        ${rows.length
    ? `<ul class="task-list">${rows.map((task) => taskRow(state, task)).join('')}</ul>`
    : emptyState(
      view === 'All' ? 'No assignments yet' : `No ${view.toLowerCase()} tasks`,
      view === 'All'
        ? 'Add your first assignment to start tracking your semester.'
        : 'Try another view or clear the search.',
      '<button class="btn primary" data-add-task>Add assignment</button>',
    )}
      </div>`, { subtitle: `${rows.length} shown`, actions: '<button class="btn primary small" data-add-task>+ Add task</button>' })}

    ${card('Completed per day', barChart(taskCompletionSeries(state, 7), { height: 140, format: (v) => String(v) }))}`;

  wire(root);
}

function wire(root) {
  const search = root.querySelector('#taskSearch');
  if (search) {
    search.addEventListener('input', debounce((event) => {
      query = event.target.value;
      renderTasks(root);
      const next = root.querySelector('#taskSearch');
      if (next) { next.focus(); next.setSelectionRange(next.value.length, next.value.length); }
    }, 260));
  }

  root.addEventListener('change', (event) => {
    if (event.target.id === 'taskSort') { sortByKey = event.target.value; renderTasks(root); }
    if (event.target.dataset.toggle) toggleTask(event.target.dataset.toggle);
  });

  root.addEventListener('click', async (event) => {
    const el = event.target.closest('button');
    if (!el) return;
    if (el.dataset.view) { view = el.dataset.view; return renderTasks(root); }
    if (el.hasAttribute('data-add-task')) return openTaskForm();
    if (el.dataset.edit) return openTaskForm(el.dataset.edit);
    if (el.dataset.cycle) return cycleStatus(el.dataset.cycle);
    if (el.dataset.del) return removeTask(el.dataset.del);
  });
}
