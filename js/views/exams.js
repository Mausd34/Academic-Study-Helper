/**
 * Exams — countdown tracker with preparation progress.
 */
import { esc, formatDate, daysUntil, countdownLabel, sortBy, clamp, todayKey } from '../core/utils.js';
import { getState, list } from '../core/store.js';
import { openModal, buildForm, bindForm, closeModal, confirmDialog, toastOk, toastErr } from '../core/ui.js';
import { examFields, EXAM_TYPES } from '../core/forms.js';
import { card, emptyState, badge, progressBar, statRow } from '../core/parts.js';

const TYPE_TONE = { Quiz: 'info', Midterm: 'warning', Final: 'danger', Lab: 'info', Viva: 'muted', Presentation: 'muted' };

const courseName = (state, id) => state.courses.find((c) => c.id === id)?.code || 'Unassigned';

function examCard(state, exam) {
  const days = daysUntil(exam.date);
  const count = countdownLabel(exam.date);
  const past = days !== null && days < 0;
  return `
    <article class="card exam-card ${past ? 'past' : ''}">
      <header class="exam-head">
        <div>
          <h3>${esc(exam.title || `${exam.type} exam`)}</h3>
          <p class="muted small">${esc(courseName(state, exam.courseId))} · ${esc(formatDate(exam.date))}${exam.time ? ` · ${esc(exam.time)}` : ''}</p>
        </div>
        <div class="exam-badges">
          ${badge(exam.type || 'Exam', TYPE_TONE[exam.type])}
          ${past ? badge('Past', 'muted') : badge(count.text, count.tone)}
        </div>
      </header>
      <div class="skill-head"><span>Preparation</span><span>${clamp(exam.prep)}%</span></div>
      ${progressBar(clamp(exam.prep))}
      ${exam.room ? `<p class="muted small">Room: ${esc(exam.room)}</p>` : ''}
      ${exam.syllabus ? `<p class="exam-syllabus">${esc(exam.syllabus)}</p>` : ''}
      ${exam.notes ? `<p class="muted small">${esc(exam.notes)}</p>` : ''}
      <div class="row-actions">
        <button class="btn small ghost" data-bump-prep="${esc(exam.id)}">+10% prepared</button>
        <button class="btn small ghost" data-edit="${esc(exam.id)}">Edit</button>
        <button class="btn small danger" data-del="${esc(exam.id)}">Delete</button>
      </div>
    </article>`;
}

export function openExamForm(id) {
  const existing = id ? list.find('exams', id) : null;
  const fields = examFields(existing || {});
  openModal({
    title: existing ? 'Edit exam' : 'Add exam',
    body: buildForm(fields, { submitLabel: existing ? 'Save changes' : 'Add exam' }),
    onMount: (modal) => {
      bindForm(modal.querySelector('form'), fields, (values) => {
        if (!values.title) return toastErr('Exam title is required.');
        if (!values.date) return toastErr('Exam date is required.');
        if (existing) {
          list.patch('exams', id, { ...values, prep: clamp(values.prep) });
          toastOk('Exam updated.');
        } else {
          list.add('exams', { ...values, prep: clamp(values.prep) });
          toastOk('Exam added.');
        }
        closeModal();
      });
    },
  });
}

async function removeExam(id) {
  const exam = list.find('exams', id);
  const ok = await confirmDialog({ title: 'Delete exam?', message: `“${exam?.title || ''}” will be removed.`, confirmLabel: 'Delete' });
  if (!ok) return;
  list.remove('exams', id);
  toastOk('Exam deleted.');
}

export function renderExams(root) {
  const state = getState();
  const exams = sortBy(state.exams, { key: 'date' });
  const upcoming = exams.filter((e) => (daysUntil(e.date) ?? -1) >= 0);
  const next = upcoming[0];
  const avgPrep = upcoming.length
    ? Math.round(upcoming.reduce((sum, e) => sum + clamp(e.prep), 0) / upcoming.length)
    : 0;

  root.innerHTML = `
    ${statRow([
    { label: 'Next exam', value: next ? `${daysUntil(next.date)}d` : '—', sub: next ? `${next.type} · ${courseName(state, next.courseId)}` : 'Nothing scheduled', tone: next && daysUntil(next.date) <= 3 ? 'warn' : '' },
    { label: 'Upcoming', value: String(upcoming.length), sub: `${exams.length - upcoming.length} past` },
    { label: 'Avg preparation', value: `${avgPrep}%`, sub: 'across upcoming exams', tone: avgPrep < 50 ? 'warn' : 'ok' },
    { label: 'Exam types', value: String(EXAM_TYPES.length), sub: 'supported' },
  ])}

    ${card('Upcoming exams', upcoming.length
    ? `<div class="exam-grid">${upcoming.map((exam) => examCard(state, exam)).join('')}</div>`
    : emptyState('No upcoming exams', 'Add an exam to start a countdown and track your preparation.', '<button class="btn primary" data-add-exam>Add exam</button>'),
    { subtitle: 'Sorted by date, soonest first', actions: '<button class="btn primary small" data-add-exam>+ Add exam</button>' })}

    ${exams.length > upcoming.length ? card('Past exams', `<div class="exam-grid">${exams.filter((e) => (daysUntil(e.date) ?? -1) < 0).map((exam) => examCard(state, exam)).join('')}</div>`, { subtitle: 'History' }) : ''}`;

  wire(root);
}

function wire(root) {
  root.addEventListener('click', async (event) => {
    const el = event.target.closest('button');
    if (!el) return;
    if (el.hasAttribute('data-add-exam')) return openExamForm();
    if (el.dataset.edit) return openExamForm(el.dataset.edit);
    if (el.dataset.del) return removeExam(el.dataset.del);
    if (el.dataset.bumpPrep) {
      const exam = list.find('exams', el.dataset.bumpPrep);
      if (!exam) return;
      const next = clamp((exam.prep || 0) + 10);
      list.patch('exams', exam.id, { prep: next });
      toastOk(`Preparation for ${exam.title} is now ${next}%.`);
    }
  });
}
