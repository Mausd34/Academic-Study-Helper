/**
 * Career — 4-month roadmap checklist, portfolio projects and goals.
 */
import { esc, clamp, nowISO } from '../core/utils.js';
import { getState, list, update } from '../core/store.js';
import { defaultRoadmap } from '../core/plans.js';
import { ringChart } from '../core/charts.js';
import { openModal, buildForm, bindForm, closeModal, confirmDialog, toastOk, toastErr } from '../core/ui.js';
import { card, emptyState, badge, progressBar, statRow } from '../core/parts.js';

const PROJECT_STATUSES = ['Planned', 'Building', 'Shipped'];

const roadmap = () => getState().roadmap?.length ? getState().roadmap : [];

/** Seed the roadmap on first visit so the page is never empty by surprise. */
export function ensureRoadmap() {
  if (getState().roadmap?.length) return;
  update((draft) => {
    draft.roadmap = defaultRoadmap();
  }, { silent: true });
}

function monthProgress(month) {
  const done = month.items.filter((i) => i.done).length;
  const total = month.items.length;
  return { done, total, percent: total ? (done / total) * 100 : 0 };
}

export const overallProgress = () => {
  const months = roadmap();
  const done = months.reduce((sum, m) => sum + m.items.filter((i) => i.done).length, 0);
  const total = months.reduce((sum, m) => sum + m.items.length, 0);
  return total ? (done / total) * 100 : 0;
};

function toggleItem(monthId, itemId) {
  let title = '';
  update((draft) => {
    const month = draft.roadmap.find((m) => m.id === monthId);
    const item = month?.items.find((i) => i.id === itemId);
    if (!item) return;
    item.done = !item.done;
    title = item.title;
  });
  toastOk(title ? `“${title}” marked as done.` : 'Item updated.');
}

function itemNotes(monthId, itemId) {
  const month = roadmap().find((m) => m.id === monthId);
  const item = month?.items.find((i) => i.id === itemId);
  if (!item) return;
  openModal({
    title: item.title,
    body: `
      <div class="field">
        <label for="itemNotes">Notes</label>
        <textarea id="itemNotes" rows="6">${esc(item.notes || '')}</textarea>
      </div>
      ${item.resources ? `<p class="muted small">Resources: ${esc(item.resources)}</p>` : ''}`,
    actions: [
      { label: 'Cancel', variant: 'ghost' },
      {
        label: 'Save notes',
        variant: 'primary',
        onClick: () => {
          const value = document.getElementById('itemNotes')?.value || '';
          update((draft) => {
            const m = draft.roadmap.find((x) => x.id === monthId);
            const i = m?.items.find((x) => x.id === itemId);
            if (i) i.notes = value;
          });
          toastOk('Notes saved.');
        },
      },
    ],
  });
}


/* --------------------------------------------------------------- projects */

export function openProjectForm(id) {
  const existing = id ? list.find('portfolioProjects', id) : null;
  const fields = [
    { name: 'name', label: 'Project name', type: 'text', value: existing?.name || '', required: true, full: true, placeholder: 'e.g. Student Performance Prediction' },
    { name: 'status', label: 'Status', type: 'select', value: existing?.status || 'Planned', options: PROJECT_STATUSES },
    { name: 'progress', label: 'Progress %', type: 'range', value: existing?.progress ?? 0, min: 0, max: 100, step: 5, unit: '%' },
  ];
  openModal({
    title: existing ? 'Edit project' : 'Add project',
    body: buildForm(fields, { submitLabel: existing ? 'Save' : 'Add project' }),
    onMount: (modal) => {
      bindForm(modal.querySelector('form'), fields, (values) => {
        if (!values.name) return toastErr('Project name is required.');
        const payload = { ...values, progress: clamp(values.progress) };
        if (existing) {
          list.patch('portfolioProjects', id, payload);
          toastOk('Project updated.');
        } else {
          list.add('portfolioProjects', payload);
          toastOk('Project added.');
        }
        closeModal();
      });
    },
  });
}

function monthCard(month) {
  const p = monthProgress(month);
  return `<div class="roadmap-month">
    <header class="roadmap-head">
      <div>
        <span class="badge">Month ${month.month}</span>
        <h3>${esc(month.title)}</h3>
        <p class="muted small">${esc(month.focus)}</p>
      </div>
      <div class="roadmap-progress">
        <strong>${p.done}/${p.total}</strong>
        ${progressBar(p.percent)}
      </div>
    </header>
    <ul class="checklist">
      ${month.items.map((item) => `<li class="${item.done ? 'done' : ''}">
        <label class="check">
          <input type="checkbox" ${item.done ? 'checked' : ''} data-toggle-item="${esc(item.id)}" data-month="${esc(month.id)}">
          <span>
            <strong>${esc(item.title)}</strong>
            <small class="muted">${item.hours}h est.${item.resources ? ` · ${esc(item.resources)}` : ''}</small>
            ${item.notes ? `<small class="note-line">${esc(item.notes)}</small>` : ''}
          </span>
        </label>
        <button class="btn small ghost" data-item-notes="${esc(item.id)}" data-month="${esc(month.id)}" title="Notes">✎</button>
      </li>`).join('')}
    </ul>
  </div>`;
}

/* ---------------------------------------------------------------- render */

export function renderCareer(root) {
  ensureRoadmap();
  const state = getState();
  const months = roadmap();
  const overall = overallProgress();
  const projects = state.portfolioProjects || [];
  const shipped = projects.filter((p) => p.status === 'Shipped').length;

  root.innerHTML = `
    ${statRow([
    { label: 'Roadmap', value: `${Math.round(overall)}%`, sub: '4-month plan complete', tone: overall >= 50 ? 'ok' : 'warn' },
    { label: 'Months', value: String(months.length), sub: 'in the plan' },
    { label: 'Projects', value: String(projects.length), sub: `${shipped} shipped` },
    { label: 'Target roles', value: String((state.profile.interests || []).length), sub: 'in your profile' },
  ])}

    ${card('Four-month roadmap', months.length
    ? months.map(monthCard).join('')
    : emptyState('Roadmap not created yet', 'Load the default four-month plan to get started.', '<button class="btn primary" data-load-plan>Load roadmap</button>'))}

    ${card('Portfolio projects', projects.length ? `<div class="project-grid">${projects.map((project) => `
      <div class="card project-card">
        <div class="skill-head"><span>${esc(project.name)}</span>${badge(project.status, project.status === 'Shipped' ? 'success' : project.status === 'Building' ? 'info' : 'muted')}</div>
        ${progressBar(clamp(project.progress))}
        <div class="skill-meta">
          <small class="muted">${clamp(project.progress)}% complete</small>
          <span class="row-actions">
            <button class="btn small ghost" data-bump="${esc(project.id)}">+10%</button>
            <button class="btn small ghost" data-edit-project="${esc(project.id)}">Edit</button>
            <button class="btn small danger" data-del-project="${esc(project.id)}">Delete</button>
          </span>
        </div>
      </div>`).join('')}</div>` : emptyState('No portfolio projects yet', 'Track the projects you want on your CV.', '<button class="btn primary" data-add-project>Add project</button>'),
    { actions: '<button class="btn primary small" data-add-project>+ Add project</button>' })}

    ${card('Career goals', state.careerGoals?.length ? `<ul class="goal-list">${state.careerGoals.map((goal) => `
      <li>
        <div class="skill-head"><span>${esc(goal.name)}</span><span>${clamp(goal.progress)}%</span></div>
        ${progressBar(clamp(goal.progress))}
        <span class="row-actions">
          <button class="btn small ghost" data-goal="${esc(goal.id)}" data-delta="5">+5</button>
          <button class="btn small ghost" data-goal="${esc(goal.id)}" data-delta="-5">−5</button>
          <button class="btn small danger" data-del-goal="${esc(goal.id)}">Delete</button>
        </span>
      </li>`).join('')}</ul>` : emptyState('No career goals', 'Add a goal to track progress toward your target roles.'))}

    ${card('Target roles', `<ul class="tag-list">${(state.profile.interests || []).map((role) => `<li class="tag">${esc(role)}</li>`).join('') || '<li class="muted">No roles set — add them in your profile.</li>'}</ul>
      <p class="muted small">Career goal: ${esc(state.profile.careerGoal || 'Not set')}</p>`)}`;

  wire(root);
}

function wire(root) {
  root.addEventListener('change', (event) => {
    const input = event.target;
    if (input.dataset.toggleItem) toggleItem(input.dataset.month, input.dataset.toggleItem);
  });

  root.addEventListener('click', async (event) => {
    const el = event.target.closest('button');
    if (!el) return;
    if (el.hasAttribute('data-load-plan')) { ensureRoadmap(); toastOk('Roadmap loaded.'); return; }
    if (el.dataset.itemNotes) return itemNotes(el.dataset.month, el.dataset.itemNotes);
    if (el.hasAttribute('data-add-project')) return openProjectForm();
    if (el.dataset.editProject) return openProjectForm(el.dataset.editProject);
    if (el.dataset.delProject) {
      const ok = await confirmDialog({ title: 'Delete project?', message: 'This project will be removed from your portfolio.', confirmLabel: 'Delete' });
      if (ok) { list.remove('portfolioProjects', el.dataset.delProject); toastOk('Project deleted.'); }
      return;
    }
    if (el.dataset.bump) {
      const project = list.find('portfolioProjects', el.dataset.bump);
      if (!project) return;
      const next = clamp((project.progress || 0) + 10);
      list.patch('portfolioProjects', project.id, { progress: next });
      toastOk(`${project.name}: ${next}%`);
      return;
    }
    if (el.dataset.goal) {
      const goal = list.find('careerGoals', el.dataset.goal);
      if (goal) list.patch('careerGoals', goal.id, { progress: clamp((goal.progress || 0) + Number(el.dataset.delta)) });
      return;
    }
    if (el.dataset.delGoal) {
      list.remove('careerGoals', el.dataset.delGoal);
      toastOk('Goal removed.');
    }
  });
}
