/**
 * Notes — markdown-capable notebook with search, favourites and pinning.
 */
import { esc, formatDate, stripTags, matches, renderMarkdown, nowISO, debounce } from '../core/utils.js';
import { getState, list, update } from '../core/store.js';
import { openModal, buildForm, bindForm, closeModal, confirmDialog, toastOk } from '../core/ui.js';
import { noteFields } from '../core/forms.js';
import { card, emptyState, badge, attach } from '../core/parts.js';

let query = '';
let courseFilter = 'all';
let showFavourites = false;

const courseName = (state, id) => state.courses.find((c) => c.id === id)?.code || 'Unassigned';

function visible(state) {
  const rows = state.notes.filter((note) => {
    if (showFavourites && !note.favorite) return false;
    if (courseFilter !== 'all' && note.courseId !== courseFilter) return false;
    if (query && !matches(`${note.title} ${note.topic} ${note.content} ${(note.tags || []).join(' ')}`, query)) return false;
    return true;
  });
  return rows.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
    return String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt));
  });
}

function noteCard(state, note) {
  const preview = stripTags(renderMarkdown(note.content)).replace(/\s+/g, ' ').trim();
  return `
    <article class="card note-card ${note.pinned ? 'pinned' : ''}">
      <header class="note-head">
        <h3>${note.pinned ? '📌 ' : ''}${esc(note.title)}</h3>
        ${badge(courseName(state, note.courseId), 'info')}
      </header>
      ${note.topic ? `<p class="muted small">${esc(note.topic)}</p>` : ''}
      <p class="note-preview">${esc(preview.slice(0, 180))}${preview.length > 180 ? '…' : ''}</p>
      ${(note.tags || []).length ? `<span class="tag-row">${note.tags.map((tag) => `<span class="tag">${esc(tag)}</span>`).join('')}</span>` : ''}
      <footer class="note-foot">
        <small class="muted">${esc(formatDate((note.updatedAt || note.createdAt || '').slice(0, 10)))}</small>
        <span class="row-actions">
          <button class="btn small ghost" data-fav="${esc(note.id)}" title="Favourite" aria-pressed="${Boolean(note.favorite)}">${note.favorite ? '★' : '☆'}</button>
          <button class="btn small ghost" data-pin="${esc(note.id)}" title="Pin" aria-pressed="${Boolean(note.pinned)}">📌</button>
          <button class="btn small ghost" data-read="${esc(note.id)}">Read</button>
          <button class="btn small ghost" data-edit="${esc(note.id)}">Edit</button>
          <button class="btn small danger" data-del="${esc(note.id)}">Delete</button>
        </span>
      </footer>
    </article>`;
}

/* ---------------------------------------------------------------- actions */

export function openNoteForm(id) {
  const existing = id ? list.find('notes', id) : null;
  const fields = noteFields(existing || {});
  openModal({
    title: existing ? 'Edit note' : 'New note',
    size: 'modal-lg',
    body: buildForm(fields, { submitLabel: existing ? 'Save note' : 'Create note' }),
    onMount: (modal) => {
      bindForm(modal.querySelector('form'), fields, (values) => {
        if (!values.title) return toastOk('A title is required.');
        if (existing) {
          list.patch('notes', id, { ...values, updatedAt: nowISO() });
          toastOk('Note saved.');
        } else {
          list.add('notes', { ...values, updatedAt: nowISO() });
          toastOk('Note saved.');
        }
        closeModal();
      });
    },
  });
}

export function openNoteReader(id) {
  const note = list.find('notes', id);
  if (!note) return;
  openModal({
    title: note.title || 'Note',
    size: 'modal-lg',
    body: `
      <div class="note-meta">
        ${badge(courseName(getState(), note.courseId), 'info')}
        ${note.topic ? badge(note.topic, 'muted') : ''}
        <small class="muted">${esc(formatDate((note.createdAt || '').slice(0, 10)))}</small>
      </div>
      <div class="note-body">${renderMarkdown(note.content)}</div>`,
    actions: [
      { label: 'Close', variant: 'ghost' },
      { label: 'Edit', variant: 'primary', onClick: () => openNoteForm(id) },
    ],
  });
}

async function removeNote(id) {
  const note = list.find('notes', id);
  const ok = await confirmDialog({ title: 'Delete note?', message: `“${note?.title || ''}” will be removed permanently.`, confirmLabel: 'Delete' });
  if (!ok) return;
  list.remove('notes', id);
  toastOk('Note deleted.');
}


/* ----------------------------------------------------------------- render */

export function renderNotes(root) {
  const state = getState();
  const rows = visible(state);

  root.innerHTML = `
    ${card('Filter notes', `
      <div class="toolbar">
        <input id="noteSearch" type="search" placeholder="Search notes, topics and tags…" value="${esc(query)}" aria-label="Search notes">
        <div class="toolbar-right">
          <button class="btn small ${showFavourites ? 'primary' : 'ghost'}" data-fav-toggle aria-pressed="${showFavourites}">★ Favourites</button>
          <select id="noteCourse" aria-label="Filter by course">
            <option value="all"${courseFilter === 'all' ? ' selected' : ''}>All courses</option>
            ${state.courses.map((c) => `<option value="${esc(c.id)}"${courseFilter === c.id ? ' selected' : ''}>${esc(c.code)}</option>`).join('')}
          </select>
        </div>
      </div>`,
    { subtitle: `${rows.length} of ${state.notes.length} notes`, actions: '<button class="btn primary small" data-add-note>+ New note</button>' })}

    ${rows.length
    ? `<div class="note-grid">${rows.map((note) => noteCard(state, note)).join('')}</div>`
    : card('', emptyState(
      state.notes.length ? 'No notes match your filters' : 'No notes yet',
      state.notes.length ? 'Try a different search or clear the filters.' : 'Capture exam-ready notes for each course as you study.',
      '<button class="btn primary" data-add-note>Write your first note</button>',
    ))}`;

  wire(root);
}

function wire(root) {
  attach(root, ({ signal }) => {
    const search = root.querySelector('#noteSearch');
    if (search) {
      search.addEventListener('input', debounce((event) => {
        query = event.target.value;
        renderNotes(root);
        const next = root.querySelector('#noteSearch');
        if (next) { next.focus(); next.setSelectionRange(next.value.length, next.value.length); }
      }, 260), { signal });
    }

    root.addEventListener('change', (event) => {
      if (event.target.id === 'noteCourse') { courseFilter = event.target.value; renderNotes(root); }
    }, { signal });

    root.addEventListener('click', async (event) => {
      const el = event.target.closest('button');
      if (!el) return;
      if (el.hasAttribute('data-add-note')) return openNoteForm();
      if (el.hasAttribute('data-fav-toggle')) { showFavourites = !showFavourites; return renderNotes(root); }
      if (el.dataset.read) return openNoteReader(el.dataset.read);
      if (el.dataset.edit) return openNoteForm(el.dataset.edit);
      if (el.dataset.del) return removeNote(el.dataset.del);
      if (el.dataset.fav) {
        const note = list.find('notes', el.dataset.fav);
        if (note) list.patch('notes', note.id, { favorite: !note.favorite, updatedAt: nowISO() });
        return;
      }
      if (el.dataset.pin) {
        const note = list.find('notes', el.dataset.pin);
        if (note) list.patch('notes', note.id, { pinned: !note.pinned, updatedAt: nowISO() });
      }
    }, { signal });
  });
}
