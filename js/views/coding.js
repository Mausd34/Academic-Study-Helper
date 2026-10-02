/**
 * Coding practice — LeetCode / Codeforces style problem tracker.
 */
import { esc, formatDate, sortBy, debounce, matches } from '../core/utils.js';
import { getState, list } from '../core/store.js';
import { codingStats } from '../core/analytics.js';
import { donutChart, stackedBar } from '../core/charts.js';
import { openModal, buildForm, bindForm, closeModal, confirmDialog, toastOk, toastErr } from '../core/ui.js';
import { codingFields, PLATFORMS, DIFFICULTIES } from '../core/forms.js';
import { card, emptyState, badge, statRow } from '../core/parts.js';

const DIFF_TONE = { Easy: 'success', Medium: 'warning', Hard: 'danger' };
const PLATFORM_COLOR = { LeetCode: '#f59e0b', Codeforces: '#0ea5e9', HackerRank: '#10b981', CodeChef: '#8b5cf6', AtCoder: '#ec4899' };

let platformFilter = 'all';
let diffFilter = 'all';
let query = '';

function visible(state) {
  return sortBy(state.coding.filter((p) => {
    if (platformFilter !== 'all' && p.platform !== platformFilter) return false;
    if (diffFilter !== 'all' && p.difficulty !== diffFilter) return false;
    if (query && !matches(`${p.problem} ${p.topic} ${p.platform}`, query)) return false;
    return true;
  }), { key: 'date', dir: 'desc' });
}

export function openProblemForm(id) {
  const existing = id ? list.find('coding', id) : null;
  const fields = codingFields(existing || {});
  openModal({
    title: existing ? 'Edit problem' : 'Log problem',
    body: buildForm(fields, { submitLabel: existing ? 'Save' : 'Log problem' }),
    onMount: (modal) => {
      bindForm(modal.querySelector('form'), fields, (values) => {
        if (!values.problem) return toastErr('Problem name is required.');
        if (values.link && !/^https?:\/\//i.test(values.link)) return toastErr('The link must start with http:// or https://');
        if (existing) {
          list.patch('coding', id, values);
          toastOk('Problem updated.');
        } else {
          list.add('coding', values);
          toastOk('Problem logged.');
        }
        closeModal();
      });
    },
  });
}

async function removeProblem(id) {
  const ok = await confirmDialog({ title: 'Delete problem?', message: 'This entry will be removed from your practice stats.', confirmLabel: 'Delete' });
  if (!ok) return;
  list.remove('coding', id);
  toastOk('Problem deleted.');
}

/* ---------------------------------------------------------------- render */

export function renderCoding(root) {
  const state = getState();
  const stats = codingStats(state);
  const rows = visible(state);
  const solveRate = stats.total ? Math.round((stats.solved / stats.total) * 100) : 0;

  root.innerHTML = `
    ${statRow([
    { label: 'Solved', value: String(stats.solved), sub: `of ${stats.total} logged`, tone: 'ok' },
    { label: 'Attempted', value: String(stats.attempted), sub: 'not yet solved' },
    { label: 'Solve rate', value: `${solveRate}%`, sub: 'across all platforms', tone: solveRate >= 50 ? 'ok' : 'warn' },
    { label: 'Platforms', value: String(stats.byPlatform.length), sub: 'in rotation' },
  ])}

    <div class="chart-grid">
      ${card('By difficulty', stackedBar(
    DIFFICULTIES.map((d) => ({ label: d, value: stats.byDifficulty.find((x) => x.label === d)?.value || 0, color: { Easy: '#10b981', Medium: '#f59e0b', Hard: '#ef4444' }[d] })),
  ), { subtitle: 'All logged problems' })}

      ${card('By platform', stats.byPlatform.length
    ? donutChart(stats.byPlatform.map((p) => ({ ...p, color: PLATFORM_COLOR[p.label] })), { size: 140 })
    : emptyState('Nothing logged yet', 'Add your first problem to see the split.'))}
    </div>

    ${card('Problems', `
      <div class="toolbar">
        <input id="codSearch" type="search" placeholder="Search problems or topics…" value="${esc(query)}" aria-label="Search problems">
        <div class="toolbar-right">
          <select id="codPlatform" aria-label="Filter by platform">
            <option value="all"${platformFilter === 'all' ? ' selected' : ''}>All platforms</option>
            ${PLATFORMS.map((p) => `<option value="${esc(p)}"${platformFilter === p ? ' selected' : ''}>${esc(p)}</option>`).join('')}
          </select>
          <select id="codDifficulty" aria-label="Filter by difficulty">
            <option value="all"${diffFilter === 'all' ? ' selected' : ''}>All difficulties</option>
            ${DIFFICULTIES.map((d) => `<option value="${esc(d)}"${diffFilter === d ? ' selected' : ''}>${esc(d)}</option>`).join('')}
          </select>
        </div>
      </div>
      <div style="margin-top:14px">
        ${rows.length
    ? `<div class="table-wrap"><table class="data-table">
        <thead><tr><th scope="col">Date</th><th scope="col">Problem</th><th scope="col">Platform</th><th scope="col">Difficulty</th><th scope="col">Topic</th><th scope="col">Status</th><th scope="col"></th></tr></thead>
        <tbody>${rows.map((p) => `<tr>
          <td>${esc(formatDate(p.date))}</td>
          <td>${p.link ? `<a href="${esc(p.link)}" target="_blank" rel="noopener noreferrer">${esc(p.problem)}</a>` : esc(p.problem)}</td>
          <td>${badge(p.platform, '')}<span class="dot-inline" style="background:${PLATFORM_COLOR[p.platform] || '#94a3b8'}"></span></td>
          <td>${badge(p.difficulty, DIFF_TONE[p.difficulty])}</td>
          <td class="muted">${esc(p.topic || '—')}</td>
          <td>${badge(p.status === 'solved' ? 'Solved' : p.status === 'skipped' ? 'Skipped' : 'Attempted', p.status === 'solved' ? 'success' : 'muted')}</td>
          <td class="row-actions">
            <button class="btn small ghost" data-solve="${esc(p.id)}">${p.status === 'solved' ? 'Unsolve' : 'Mark solved'}</button>
            <button class="btn small ghost" data-edit-prob="${esc(p.id)}">Edit</button>
            <button class="btn small danger" data-del-prob="${esc(p.id)}">Delete</button>
          </td>
        </tr>`).join('')}</tbody>
      </table></div>`
    : emptyState(state.coding.length ? 'No problems match your filters' : 'No problems logged yet',
      state.coding.length ? 'Try another filter or clear the search.' : 'Track LeetCode, Codeforces and HackerRank practice here.',
      '<button class="btn primary" data-add-prob>Log problem</button>')}
      </div>`, { subtitle: `${rows.length} shown`, actions: '<button class="btn primary small" data-add-prob>+ Log problem</button>' })}`;

  wire(root);
}

function wire(root) {
  const search = root.querySelector('#codSearch');
  if (search) {
    search.addEventListener('input', debounce((event) => {
      query = event.target.value;
      renderCoding(root);
      const next = root.querySelector('#codSearch');
      if (next) { next.focus(); next.setSelectionRange(next.value.length, next.value.length); }
    }, 260));
  }
  root.addEventListener('change', (event) => {
    if (event.target.id === 'codPlatform') { platformFilter = event.target.value; renderCoding(root); }
    if (event.target.id === 'codDifficulty') { diffFilter = event.target.value; renderCoding(root); }
  });
  root.addEventListener('click', async (event) => {
    const el = event.target.closest('button');
    if (!el) return;
    if (el.hasAttribute('data-add-prob')) return openProblemForm();
    if (el.dataset.editProb) return openProblemForm(el.dataset.editProb);
    if (el.dataset.delProb) return removeProblem(el.dataset.delProb);
    if (el.dataset.solve) {
      const problem = list.find('coding', el.dataset.solve);
      if (!problem) return;
      const next = problem.status === 'solved' ? 'attempted' : 'solved';
      list.patch('coding', problem.id, { status: next });
      toastOk(next === 'solved' ? `${problem.problem} marked solved 🎉` : `${problem.problem} moved back to attempted.`);
    }
  });
}
