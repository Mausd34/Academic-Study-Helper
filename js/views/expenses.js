/**
 * Expenses — Bangladeshi Taka budget tracking with category analysis.
 */
import { esc, formatMoney, formatDate, todayKey, sortBy, toNumber, debounce, matches } from '../core/utils.js';
import { getState, list } from '../core/store.js';
import { expenseTotals, expenseByCategory, monthlyExpenseSeries } from '../core/analytics.js';
import { donutChart, barChart } from '../core/charts.js';
import { openModal, buildForm, bindForm, closeModal, confirmDialog, toastOk, toastErr } from '../core/ui.js';
import { expenseFields, EXPENSE_CATEGORIES } from '../core/forms.js';
import { card, emptyState, badge, statRow } from '../core/parts.js';

let categoryFilter = 'all';
let query = '';

const TONE = { Food: '#f59e0b', Transport: '#0ea5e9', Education: '#635bff', Internet: '#10b981', Mobile: '#8b5cf6', Books: '#ec4899', Software: '#14b8a6', Other: '#94a1b8' };

function rows(state) {
  return sortBy(
    state.expenses.filter((e) => (categoryFilter === 'all' || e.category === categoryFilter)
      && (!query || matches(`${e.description} ${e.category}`, query))),
    { key: 'date', dir: 'desc' },
  );
}

/* --------------------------------------------------------------- actions */

export function openExpenseForm(id) {
  const existing = id ? list.find('expenses', id) : null;
  const fields = expenseFields(existing || {});
  openModal({
    title: existing ? 'Edit expense' : 'Add expense',
    body: buildForm(fields, { submitLabel: existing ? 'Save changes' : 'Add expense' }),
    onMount: (modal) => {
      bindForm(modal.querySelector('form'), fields, (values) => {
        if (!values.amount || values.amount <= 0) return toastErr('Enter an amount greater than zero.');
        if (existing) {
          list.patch('expenses', id, values);
          toastOk('Expense updated.');
        } else {
          list.add('expenses', values);
          toastOk('Expense added.');
        }
        closeModal();
      });
    },
  });
}

async function removeExpense(id) {
  const ok = await confirmDialog({ title: 'Delete expense?', message: 'This entry will be removed from your totals.', confirmLabel: 'Delete' });
  if (!ok) return;
  list.remove('expenses', id);
  toastOk('Expense deleted.');
}

/* ---------------------------------------------------------------- render */

export function renderExpenses(root) {
  const state = getState();
  const totals = expenseTotals(state);
  const byCategory = expenseByCategory(state);
  const all = rows(state);
  const shown = all.slice(0, 30);

  root.innerHTML = `
    ${statRow([
    { label: 'This month', value: formatMoney(totals.month), sub: 'current month', tone: 'warn' },
    { label: 'This week', value: formatMoney(totals.week), sub: 'last 7 days' },
    { label: 'Today', value: formatMoney(totals.today), sub: 'today only' },
    { label: 'All time', value: formatMoney(totals.total), sub: `${state.expenses.length} entries` },
  ])}

    <div class="chart-grid">
      ${card('By category', byCategory.length
    ? donutChart(byCategory.map((c) => ({ ...c, color: TONE[c.label] })), { centerValue: formatMoney(totals.month), centerLabel: 'this month' })
    : emptyState('No expenses yet', 'Add your first expense to see the breakdown.'),
    { subtitle: 'All time' })}

      ${card('Monthly spending', barChart(monthlyExpenseSeries(state, 6), { height: 170, format: (v) => formatMoney(v) }))}
    </div>

    ${card('Transactions', `
      <div class="toolbar">
        <input id="expSearch" type="search" placeholder="Search expenses…" value="${esc(query)}" aria-label="Search expenses">
        <div class="toolbar-right">
          <select id="expCategory" aria-label="Filter by category">
            <option value="all"${categoryFilter === 'all' ? ' selected' : ''}>All categories</option>
            ${EXPENSE_CATEGORIES.map((c) => `<option value="${esc(c)}"${categoryFilter === c ? ' selected' : ''}>${esc(c)}</option>`).join('')}
          </select>
        </div>
      </div>
      <div style="margin-top:14px">
        ${shown.length
    ? `<div class="table-wrap"><table class="data-table">
        <thead><tr><th scope="col">Date</th><th scope="col">Description</th><th scope="col">Category</th><th scope="col">Amount</th><th scope="col"></th></tr></thead>
        <tbody>${shown.map((e) => `<tr>
          <td>${esc(formatDate(e.date))}</td>
          <td>${esc(e.description || '—')}</td>
          <td>${badge(e.category, '')}<span class="dot-inline" style="background:${TONE[e.category] || '#94a1b8'}"></span></td>
          <td><strong>${esc(formatMoney(e.amount))}</strong></td>
          <td class="row-actions">
            <button class="btn small ghost" data-edit-exp="${esc(e.id)}">Edit</button>
            <button class="btn small danger" data-del-exp="${esc(e.id)}">Delete</button>
          </td>
        </tr>`).join('')}</tbody>
      </table>${all.length > shown.length ? `<p class="muted small">Showing ${shown.length} of ${all.length}.</p>` : ''}</div>`
    : emptyState(state.expenses.length ? 'No expenses match your filter' : 'No expenses yet',
      state.expenses.length ? 'Try another category or clear the search.' : 'Track your day-to-day spending to stay on budget.',
      '<button class="btn primary" data-add-exp>Add expense</button>')}
      </div>`, { subtitle: `${all.length} entries`, actions: '<button class="btn primary small" data-add-exp>+ Add expense</button>' })}`;

  wire(root);
}

function wire(root) {
  const search = root.querySelector('#expSearch');
  if (search) {
    search.addEventListener('input', debounce((event) => {
      query = event.target.value;
      renderExpenses(root);
      const next = root.querySelector('#expSearch');
      if (next) { next.focus(); next.setSelectionRange(next.value.length, next.value.length); }
    }, 260));
  }
  root.addEventListener('change', (event) => {
    if (event.target.id === 'expCategory') { categoryFilter = event.target.value; renderExpenses(root); }
  });
  root.addEventListener('click', async (event) => {
    const el = event.target.closest('button');
    if (!el) return;
    if (el.hasAttribute('data-add-exp')) return openExpenseForm();
    if (el.dataset.editExp) return openExpenseForm(el.dataset.editExp);
    if (el.dataset.delExp) return removeExpense(el.dataset.delExp);
  });
}
