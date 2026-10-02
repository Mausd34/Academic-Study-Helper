/**
 * Learning plan — structured AI/ML track with per-topic checklists.
 */
import { esc } from '../core/utils.js';
import { getState, update } from '../core/store.js';
import { defaultLearningPlan } from '../core/plans.js';
import { toastOk } from '../core/ui.js';
import { card, emptyState, badge, progressBar, statRow } from '../core/parts.js';

const plan = () => getState().learningPlan || [];

export function ensurePlan() {
  if (getState().learningPlan?.length) return;
  update((draft) => { draft.learningPlan = defaultLearningPlan(); }, { silent: true });
}

function trackProgress(track) {
  const done = track.items.filter((i) => i.done).length;
  const total = track.items.length;
  return { done, total, percent: total ? (done / total) * 100 : 0 };
}

export const planProgress = () => {
  const tracks = plan();
  const done = tracks.reduce((sum, t) => sum + t.items.filter((i) => i.done).length, 0);
  const total = tracks.reduce((sum, t) => sum + t.items.length, 0);
  return { done, total, percent: total ? (done / total) * 100 : 0 };
};

function toggleItem(trackId, itemId) {
  let title = '';
  update((draft) => {
    const track = draft.learningPlan.find((t) => t.id === trackId);
    const item = track?.items.find((i) => i.id === itemId);
    if (!item) return;
    item.done = !item.done;
    title = item.title;
  });
  toastOk(title ? `“${title}” ${title.length > 0 ? 'updated.' : ''}` : 'Topic updated.');
}

function trackCard(track) {
  const p = trackProgress(track);
  return `<div class="roadmap-month">
    <header class="roadmap-head">
      <div>
        <span class="badge">${esc(track.title)}</span>
        <h3>${esc(track.summary)}</h3>
      </div>
      <div class="roadmap-progress">
        <strong>${p.done}/${p.total}</strong>
        ${progressBar(p.percent)}
      </div>
    </header>
    <ul class="checklist">
      ${track.items.map((item) => `<li class="${item.done ? 'done' : ''}">
        <label class="check">
          <input type="checkbox" ${item.done ? 'checked' : ''} data-toggle-track="${esc(item.id)}" data-track="${esc(track.id)}">
          <span>
            <strong>${esc(item.title)}</strong>
            <small class="muted">${item.hours}h est.${item.resources ? ` · ${esc(item.resources)}` : ''}</small>
          </span>
        </label>
      </li>`).join('')}
    </ul>
  </div>`;
}

export function renderLearning(root) {
  ensurePlan();
  const tracks = plan();
  const overall = planProgress();
  const hoursDone = tracks.reduce((sum, t) => sum + t.items.filter((i) => i.done).reduce((s, i) => s + (i.hours || 0), 0), 0);
  const hoursTotal = tracks.reduce((sum, t) => sum + t.items.reduce((s, i) => s + (i.hours || 0), 0), 0);

  root.innerHTML = `
    ${statRow([
    { label: 'Topics done', value: `${overall.done}/${overall.total}`, sub: `${Math.round(overall.percent)}% complete`, tone: overall.percent >= 50 ? 'ok' : 'warn' },
    { label: 'Tracks', value: String(tracks.length), sub: 'Python, Data, ML, Advanced' },
    { label: 'Hours planned', value: `${hoursTotal}h`, sub: 'total estimate' },
    { label: 'Hours done', value: `${hoursDone}h`, sub: 'completed topics' },
  ])}

    ${card('AI / ML learning plan', tracks.length
    ? tracks.map(trackCard).join('')
    : emptyState('No learning plan yet', 'Load the default Python → Data → ML → Advanced track.', '<button class="btn primary" data-load-plan>Load plan</button>'),
    { subtitle: 'Tick topics as you master them' })}

    ${card('How this connects', `<p class="muted">The learning plan feeds two things: your <strong>Skill tracker</strong> (set progress after finishing a topic) and the <strong>AI Assistant</strong>, which can turn the plan into a dated revision schedule when you add an exam.</p>
      <p class="muted small">This is a planning tool with deterministic, offline behaviour — it does not pretend to generate AI content.</p>`)}`;

  root.addEventListener('change', (event) => {
    const input = event.target;
    if (input.dataset.toggleTrack) toggleItem(input.dataset.track, input.dataset.toggleTrack);
  });

  root.addEventListener('click', (event) => {
    const el = event.target.closest('button');
    if (el?.hasAttribute('data-load-plan')) {
      ensurePlan();
      toastOk('Learning plan loaded.');
    }
  });
}
