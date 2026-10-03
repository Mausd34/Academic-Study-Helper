/**
 * Skills — self-assessed proficiency tracker with levels and charts.
 */
import { esc, clamp, sortBy, groupBy, nowISO } from '../core/utils.js';
import { getState, list } from '../core/store.js';
import { skillAverage, skillByGroup } from '../core/analytics.js';
import { hBarChart, ringChart } from '../core/charts.js';
import { openModal, buildForm, bindForm, closeModal, confirmDialog, toastOk, toastErr } from '../core/ui.js';
import { skillFields } from '../core/forms.js';
import { card, emptyState, badge, progressBar, statRow, attach } from '../core/parts.js';

export const LEVELS = [
  { name: 'Beginner', min: 0, max: 25, tone: 'muted' },
  { name: 'Elementary', min: 25, max: 50, tone: 'info' },
  { name: 'Intermediate', min: 50, max: 75, tone: 'warning' },
  { name: 'Advanced', min: 75, max: 101, tone: 'success' },
];

export const levelFor = (progress) => LEVELS.find((l) => clamp(progress) >= l.min && clamp(progress) < l.max) || LEVELS[0];

/* --------------------------------------------------------------- actions */

export function openSkillForm(id) {
  const existing = id ? list.find('skills', id) : null;
  const fields = skillFields(existing || {});
  openModal({
    title: existing ? 'Update skill' : 'Add skill',
    body: buildForm(fields, { submitLabel: existing ? 'Save skill' : 'Add skill' }),
    onMount: (modal) => {
      bindForm(modal.querySelector('form'), fields, (values) => {
        if (!values.name) return toastErr('Skill name is required.');
        const payload = { ...values, progress: clamp(values.progress), updatedAt: nowISO() };
        if (existing) {
          list.patch('skills', id, payload);
          toastOk(`${values.name} updated to ${payload.progress}%.`);
        } else {
          list.add('skills', payload);
          toastOk(`${values.name} added.`);
        }
        closeModal();
      });
    },
  });
}

function nudge(id, delta) {
  const skill = list.find('skills', id);
  if (!skill) return;
  const next = clamp((skill.progress || 0) + delta);
  list.patch('skills', id, { progress: next, updatedAt: nowISO() });
  toastOk(`${skill.name}: ${next}%`);
}

/* ---------------------------------------------------------------- render */

export function renderSkills(root) {
  const state = getState();
  const skills = sortBy(state.skills, { key: 'progress', dir: 'desc' });
  const average = skillAverage(state);
  const strongest = skills[0];
  const weakest = skills[skills.length - 1];
  const groups = skillByGroup(state);

  root.innerHTML = `
    ${statRow([
    { label: 'Average', value: `${average}%`, sub: `${skills.length} skills`, tone: average >= 60 ? 'ok' : 'warn' },
    { label: 'Strongest', value: strongest ? strongest.name : '—', sub: strongest ? `${strongest.progress}%` : '' },
    { label: 'Focus next', value: weakest ? weakest.name : '—', sub: weakest ? `${weakest.progress}%` : '', tone: 'warn' },
    { label: 'Advanced', value: String(skills.filter((s) => clamp(s.progress) >= 75).length), sub: 'at 75% or more' },
  ])}

    <div class="chart-grid">
      ${card('Overall', `<div class="all-clear">${ringChart(average, { size: 150, label: 'average' })}<p class="muted">Drag a skill with the +5 / −5 buttons, or edit it for an exact value.</p></div>`)}

      ${card('By group', groups.length ? hBarChart(groups, { format: (v) => `${v}%` }) : emptyState('No groups yet', 'Group your skills to compare areas.'))}
    </div>

    ${card('All skills', skills.length ? `<div class="skill-grid">${skills.map((skill) => {
    const level = levelFor(skill.progress);
    return `<div class="card skill-card">
        <div class="skill-head">
          <span>${esc(skill.name)}</span>
          ${badge(`${clamp(skill.progress)}%`, level.tone)}
        </div>
        ${progressBar(clamp(skill.progress), level.tone)}
        <div class="skill-meta">
          <small class="muted">${esc(level.name)}${skill.group ? ` · ${esc(skill.group)}` : ''}</small>
          <span class="row-actions">
            <button class="btn small ghost" data-nudge="-5" data-skill="${esc(skill.id)}" aria-label="Decrease ${esc(skill.name)}">−5</button>
            <button class="btn small ghost" data-nudge="5" data-skill="${esc(skill.id)}" aria-label="Increase ${esc(skill.name)}">+5</button>
            <button class="btn small ghost" data-edit-skill="${esc(skill.id)}">Edit</button>
            <button class="btn small danger" data-del-skill="${esc(skill.id)}">Delete</button>
          </span>
        </div>
      </div>`;
  }).join('')}</div>` : emptyState('No skills tracked yet', 'Add the skills you want to grow this semester.', '<button class="btn primary" data-add-skill>Add skill</button>'),
    { subtitle: 'Sorted by progress', actions: '<button class="btn primary small" data-add-skill>+ Add skill</button>' })}

    ${card('Levels', `<ul class="legend-list">
      ${LEVELS.map((level) => `<li>${badge(level.name, level.tone)} <span class="muted">${level.min}–${level.max > 100 ? 100 : level.max - 1}%</span></li>`).join('')}
    </ul>`)}`;

  wire(root);
}

function wire(root) {
  attach(root, ({ signal }) => {
    root.addEventListener('click', async (event) => {
      const el = event.target.closest('button');
      if (!el) return;
      if (el.hasAttribute('data-add-skill')) return openSkillForm();
      if (el.dataset.editSkill) return openSkillForm(el.dataset.editSkill);
      if (el.dataset.nudge) return nudge(el.dataset.skill, Number(el.dataset.nudge));
      if (el.dataset.delSkill) return removeSkill(el.dataset.delSkill);
    }, { signal });
  });
}

async function removeSkill(id) {
  const skill = list.find('skills', id);
  const ok = await confirmDialog({ title: 'Remove skill?', message: `“${skill?.name || ''}” will be removed from your tracker.`, confirmLabel: 'Remove' });
  if (!ok) return;
  list.remove('skills', id);
  toastOk('Skill removed.');
}
