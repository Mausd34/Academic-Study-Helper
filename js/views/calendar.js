/**
 * Calendar — month grid showing classes, deadlines, exams and sessions.
 */
import { esc, todayKey, fromDateKey, toDateKey, formatDate, daysUntil } from '../core/utils.js';
import { getState, list } from '../core/store.js';
import { openModal, buildForm, bindForm, closeModal, confirmDialog, toastOk, toastErr } from '../core/ui.js';
import { card, emptyState, badge, attach } from '../core/parts.js';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

let viewYear = new Date().getFullYear();
let viewMonth = new Date().getMonth();
let selected = todayKey();

/** Monday-first week start. */
function monthGrid(year, month) {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - offset);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    return { key: toDateKey(d), day: d.getDate(), inMonth: d.getMonth() === month, isToday: toDateKey(d) === todayKey() };
  });
}

/** Everything happening on a given date. */
export function eventsOn(state, key) {
  const weekday = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][fromDateKey(key).getDay()];
  const courses = new Map((state.courses || []).map((c) => [c.id, c]));
  const out = [];

  for (const slot of state.routine || []) {
    if (slot.day !== weekday) continue;
    out.push({ kind: 'class', time: slot.start, title: `${courses.get(slot.courseId)?.code || 'Class'}`, detail: `${slot.room || 'TBA'} · until ${slot.end}`, color: courses.get(slot.courseId)?.color });
  }
  for (const exam of state.exams || []) {
    if (exam.date !== key) continue;
    out.push({ kind: 'exam', time: exam.time || '', title: exam.title || exam.type, detail: `${courses.get(exam.courseId)?.code || ''} · ${exam.type}` });
  }
  for (const task of state.tasks || []) {
    if (task.dueDate !== key || task.status === 'completed') continue;
    out.push({ kind: 'task', time: task.dueTime || '', title: task.title, detail: `${courses.get(task.courseId)?.code || ''} · ${task.priority}` });
  }
  for (const session of state.studySessions || []) {
    if (session.date !== key) continue;
    out.push({ kind: 'study', time: session.start || '', title: session.topic, detail: `${session.minutes} min` });
  }
  for (const event of state.events || []) {
    if (event.date !== key) continue;
    out.push({ kind: 'event', time: event.time || '', title: event.title, detail: event.notes || '' });
  }
  return out;
}

const EVENT_TONE = { class: 'info', exam: 'danger', task: 'warning', study: 'success', event: 'muted' };

/* -------------------------------------------------------------- event CRUD */

function openEventForm(id, dateKey) {
  const existing = id ? list.find('events', id) : null;
  const fields = [
    { name: 'title', label: 'Event title', type: 'text', value: existing?.title || '', required: true, full: true },
    { name: 'date', label: 'Date', type: 'date', value: existing?.date || dateKey || todayKey(), required: true },
    { name: 'time', label: 'Time', type: 'time', value: existing?.time || '' },
    { name: 'notes', label: 'Notes', type: 'textarea', value: existing?.notes || '', full: true, rows: 2 },
  ];
  openModal({
    title: existing ? 'Edit event' : 'Add event',
    body: buildForm(fields, { submitLabel: existing ? 'Save' : 'Add event' }),
    onMount: (modal) => {
      bindForm(modal.querySelector('form'), fields, (values) => {
        if (!values.title) return toastErr('Event title is required.');
        if (existing) {
          list.patch('events', id, values);
          toastOk('Event updated.');
        } else {
          list.add('events', values);
          toastOk('Event added to the calendar.');
        }
        selected = values.date;
        closeModal();
      });
    },
  });
}

/* ---------------------------------------------------------------- render */

function shiftMonth(delta) {
  const d = new Date(viewYear, viewMonth + delta, 1);
  viewYear = d.getFullYear();
  viewMonth = d.getMonth();
}

export function renderCalendar(root, params = {}) {
  const state = getState();
  if (params.date) selected = params.date;
  const grid = monthGrid(viewYear, viewMonth);
  const selectedEvents = eventsOn(state, selected);
  const monthName = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  root.innerHTML = `
    ${card('Calendar', `
      <div class="cal-head">
        <button class="btn small ghost" data-cal="prev" aria-label="Previous month">‹</button>
        <strong>${esc(monthName)}</strong>
        <button class="btn small ghost" data-cal="next" aria-label="Next month">›</button>
        <button class="btn small ghost" data-cal="today">Today</button>
      </div>
      <div class="cal-grid" role="grid">
        ${WEEKDAYS.map((d) => `<div class="cal-weekday" role="columnheader">${esc(d)}</div>`).join('')}
        ${grid.map((cell) => {
    const events = eventsOn(state, cell.key);
    return `<button class="cal-day ${cell.inMonth ? '' : 'muted-day'} ${cell.isToday ? 'today' : ''} ${cell.key === selected ? 'selected' : ''}"
            data-day="${cell.key}" aria-label="${esc(formatDate(cell.key))}" aria-current="${cell.isToday ? 'date' : 'false'}">
            <span class="cal-num">${cell.day}</span>
            ${events.length ? `<span class="cal-dots">${events.slice(0, 3).map((e) => `<i class="dot dot-${e.kind}"></i>`).join('')}</span>` : ''}
          </button>`;
  }).join('')}
      </div>
      <ul class="cal-legend">
        <li><i class="dot dot-class"></i>Class</li>
        <li><i class="dot dot-exam"></i>Exam</li>
        <li><i class="dot dot-task"></i>Deadline</li>
        <li><i class="dot dot-study"></i>Study</li>
        <li><i class="dot dot-event"></i>Event</li>
      </ul>`,
    { subtitle: 'Tap a day to see its schedule' })}

    ${card(formatDate(selected, { weekday: 'long' }), selectedEvents.length
    ? `<ul class="agenda">${selectedEvents.map((event) => `
        <li class="agenda-row ${esc(event.kind)}">
          <span class="agenda-time">${esc(event.time || '—')}</span>
          <span class="agenda-body">
            <strong>${esc(event.title)}</strong>
            <small class="muted">${esc(event.detail || '')}</small>
          </span>
          ${badge(event.kind, EVENT_TONE[event.kind])}
          ${event.kind === 'event' ? `<button class="btn small danger" data-del-event="${esc(event.id || '')}">Delete</button>` : ''}
        </li>`).join('')}</ul>`
    : emptyState('Nothing scheduled', 'No classes, exams, deadlines or sessions on this day.'),
    { subtitle: `${selectedEvents.length} item${selectedEvents.length === 1 ? '' : 's'}`, actions: '<button class="btn primary small" data-add-event>+ Add event</button>' })}`;

  wire(root);
}

function wire(root) {
  attach(root, ({ signal }) => {
    root.addEventListener('click', async (event) => {
      const el = event.target.closest('button');
      if (!el) return;
      if (el.dataset.cal === 'prev') { shiftMonth(-1); return renderCalendar(root); }
      if (el.dataset.cal === 'next') { shiftMonth(1); return renderCalendar(root); }
      if (el.dataset.cal === 'today') {
        const now = new Date();
        viewYear = now.getFullYear();
        viewMonth = now.getMonth();
        selected = todayKey();
        return renderCalendar(root);
      }
      if (el.dataset.day) { selected = el.dataset.day; return renderCalendar(root); }
      if (el.hasAttribute('data-add-event')) return openEventForm(null, selected);
      if (el.dataset.delEvent) {
        const ok = await confirmDialog({ title: 'Delete event?', message: 'This event will be removed from the calendar.', confirmLabel: 'Delete' });
        if (ok) { list.remove('events', el.dataset.delEvent); toastOk('Event deleted.'); }
      }
    }, { signal });
  });
}
