/**
 * Routine — weekly timetable with full CRUD over semesters, courses
 * and class slots. All seeded Fall 2026 data is editable in place.
 */
import { esc, DAYS, todayKey, dayName, durationLabel, timeToMinutes } from '../core/utils.js';
import { getState, list, update, activeSemester, setActiveSemester } from '../core/store.js';
import { classesOn, todayClassesWithStatus } from '../core/routine.js';
import { openModal, buildForm, bindForm, closeModal, confirmDialog, toastOk, toastErr } from '../core/ui.js';
import { courseOptions } from '../core/forms.js';
import { card, emptyState, badge, segmented, statRow, classRow, attach } from '../core/parts.js';

let activeDay = null;

/* ------------------------------------------------------------------ forms */

const SEMESTER_FIELDS = (value = {}) => [
  { name: 'name', label: 'Semester name', type: 'text', value: value.name || '', required: true, placeholder: 'e.g. Fall 2027', full: true },
  { name: 'startDate', label: 'Start date', type: 'date', value: value.startDate || '' },
  { name: 'endDate', label: 'End date', type: 'date', value: value.endDate || '' },
  { name: 'active', label: 'Set as active semester', type: 'checkbox', value: value.active || false },
];

const COURSE_FIELDS = (value = {}) => [
  { name: 'code', label: 'Course code', type: 'text', value: value.code || '', required: true, placeholder: 'CSE 4357' },
  { name: 'title', label: 'Course title', type: 'text', value: value.title || '', required: true, full: true, placeholder: 'Data Science' },
  { name: 'section', label: 'Section', type: 'text', value: value.section || '' },
  { name: 'teacher', label: 'Teacher', type: 'text', value: value.teacher || '' },
  { name: 'color', label: 'Colour', type: 'text', value: value.color || '#635bff', hint: 'Any hex colour' },
];

const SLOT_FIELDS = (value = {}) => [
  { name: 'courseId', label: 'Course', type: 'select', value: value.courseId || '', options: courseOptions(), required: true, full: true },
  { name: 'day', label: 'Day', type: 'select', value: value.day || 'Monday', options: DAYS },
  { name: 'room', label: 'Room', type: 'text', value: value.room || '', placeholder: '1009' },
  { name: 'start', label: 'Start', type: 'time', value: value.start || '09:35', required: true },
  { name: 'end', label: 'End', type: 'time', value: value.end || '10:35', required: true },
  { name: 'type', label: 'Type', type: 'select', value: value.type || 'lecture', options: ['lecture', 'lab', 'tutorial', 'exam'] },
];

/* ---------------------------------------------------------------- actions */

export function openSemesterForm(id) {
  const existing = id ? list.find('semesters', id) : null;
  const fields = SEMESTER_FIELDS(existing || {});
  openModal({
    title: existing ? 'Edit semester' : 'Add semester',
    body: buildForm(fields, { submitLabel: existing ? 'Save changes' : 'Add semester' }),
    onMount: (modal) => {
      bindForm(modal.querySelector('form'), fields, (values) => {
        if (!values.name) return toastErr('Semester name is required.');
        if (existing) {
          update((draft) => {
            draft.semesters = draft.semesters.map((s) => (s.id === id ? { ...s, ...values } : s));
            if (values.active) draft.semesters = draft.semesters.map((s) => ({ ...s, active: s.id === id }));
          });
          toastOk('Semester updated.');
        } else {
          update((draft) => {
            draft.semesters.push({
              id: `sem_${Date.now().toString(36)}`,
              name: values.name,
              startDate: values.startDate,
              endDate: values.endDate,
              active: Boolean(values.active),
            });
          });
          toastOk('Semester added.');
        }
        closeModal();
      });
    },
  });
}

export function openCourseForm(id) {
  const existing = id ? list.find('courses', id) : null;
  const fields = COURSE_FIELDS(existing || {});
  openModal({
    title: existing ? 'Edit course' : 'Add course',
    body: buildForm(fields, { submitLabel: existing ? 'Save changes' : 'Add course' }),
    onMount: (modal) => {
      bindForm(modal.querySelector('form'), fields, (values) => {
        if (!values.code || !values.title) return toastErr('Code and title are required.');
        if (existing) {
          list.patch('courses', id, values);
          toastOk('Course updated.');
        } else {
          list.add('courses', { ...values, semesterId: activeSemester()?.id ?? null, room: '', credits: 3 });
          toastOk('Course added.');
        }
        closeModal();
      });
    },
  });
}

export function openSlotForm(id) {
  const existing = id ? list.find('routine', id) : null;
  const fields = SLOT_FIELDS(existing || {});
  openModal({
    title: existing ? 'Edit class slot' : 'Add class slot',
    body: buildForm(fields, { submitLabel: existing ? 'Save changes' : 'Add slot' }),
    onMount: (modal) => {
      bindForm(modal.querySelector('form'), fields, (values) => {
        if (!values.start || !values.end) return toastErr('Start and end time are required.');
        if (timeToMinutes(values.end) <= timeToMinutes(values.start)) {
          return toastErr('End time must be after the start time.');
        }
        if (existing) {
          list.patch('routine', id, values);
          toastOk('Class updated.');
        } else {
          list.add('routine', { ...values, semesterId: activeSemester()?.id ?? null });
          toastOk('Class slot added.');
        }
        closeModal();
      });
    },
  });
}

async function removeSlot(id) {
  const ok = await confirmDialog({ title: 'Delete class slot?', message: 'This removes the slot from your weekly routine.', confirmLabel: 'Delete' });
  if (!ok) return;
  list.remove('routine', id);
  toastOk('Class slot deleted.');
}

async function removeCourse(id) {
  const course = list.find('courses', id);
  const ok = await confirmDialog({
    title: 'Delete course?',
    message: `“${course?.code || 'This course'}” and its class slots will be removed. Attendance and notes are kept but become unassigned.`,
    confirmLabel: 'Delete course',
  });
  if (!ok) return;
  update((draft) => {
    draft.courses = draft.courses.filter((c) => c.id !== id);
    draft.routine = draft.routine.filter((r) => r.courseId !== id);
  });
  toastOk('Course deleted.');
}

async function removeSemester(id) {
  const semester = list.find('semesters', id);
  const ok = await confirmDialog({
    title: 'Delete semester?',
    message: `“${semester?.name || 'This semester'}” and its courses and class slots will be removed.`,
    confirmLabel: 'Delete semester',
  });
  if (!ok) return;
  update((draft) => {
    const courseIds = draft.courses.filter((c) => c.semesterId === id).map((c) => c.id);
    draft.semesters = draft.semesters.filter((s) => s.id !== id);
    draft.courses = draft.courses.filter((c) => c.semesterId !== id);
    draft.routine = draft.routine.filter((r) => !courseIds.includes(r.courseId));
    if (!draft.semesters.some((s) => s.active) && draft.semesters.length) draft.semesters[0].active = true;
  });
  toastOk('Semester deleted.');
}

/* ------------------------------------------------------------------ render */

function semesterBar(state) {
  return `<div class="semester-bar">
    ${state.semesters.map((s) => `
      <div class="semester-chip ${s.active ? 'active' : ''}">
        <button type="button" class="semester-name" data-activate-semester="${esc(s.id)}" title="Make active">
          ${esc(s.name)} ${s.active ? badge('Active', 'live') : ''}
        </button>
        <button type="button" class="icon-x" data-edit-semester="${esc(s.id)}" aria-label="Edit ${esc(s.name)}">✎</button>
        <button type="button" class="icon-x" data-delete-semester="${esc(s.id)}" aria-label="Delete ${esc(s.name)}">🗑</button>
      </div>`).join('')}
    <button class="btn small" type="button" data-add-semester>+ Semester</button>
  </div>`;
}

function slotRows(state, day) {
  const slots = classesOn(state, day);
  if (!slots.length) {
    return emptyState('No classes on this day', 'Add a class slot to build your routine.', '<button class="btn primary" data-add-slot>Add class</button>');
  }
  const courses = new Map(state.courses.map((c) => [c.id, c]));
  return `<div class="slot-list">${slots.map((slot) => {
    const course = courses.get(slot.courseId);
    return `<div class="slot-row" style="--course:${esc(course?.color || '#635bff')}">
      <span class="slot-time"><strong>${esc(slot.start)}</strong><small>${esc(slot.end)} · ${esc(durationLabel(slot.start, slot.end))}</small></span>
      <span class="slot-body">
        <strong>${esc(course?.code || 'Unassigned')}</strong>
        <small>${esc(course?.title || '')} · Section ${esc(course?.section || '—')} · Room ${esc(slot.room || 'TBA')}</small>
      </span>
      ${badge(slot.type || 'lecture', slot.type === 'lab' ? 'info' : '')}
      <span class="row-actions">
        <button class="btn small" type="button" data-mark-present="${esc(slot.id)}" title="Mark present">✓</button>
        <button class="btn small danger" type="button" data-mark-absent="${esc(slot.id)}" title="Mark absent">✕</button>
        <button class="btn small ghost" type="button" data-edit-slot="${esc(slot.id)}">Edit</button>
        <button class="btn small ghost" type="button" data-delete-slot="${esc(slot.id)}">Delete</button>
      </span>
    </div>`;
  }).join('')}</div>`;
}

export function renderRoutine(root) {
  const state = getState();
  const today = dayName(todayKey());
  activeDay = activeDay && state.routine.some((s) => s.day === activeDay) ? activeDay : today;
  const todayList = todayClassesWithStatus(state);
  const totalMinutes = state.routine.reduce((sum, slot) => {
    const from = timeToMinutes(slot.start) ?? 0;
    const to = timeToMinutes(slot.end) ?? 0;
    return sum + Math.max(0, to - from);
  }, 0);
  const activeDays = DAYS.filter((d) => state.routine.some((s) => s.day === d));

  root.innerHTML = `
    ${semesterBar(state)}

    ${statRow([
    { label: 'Active semester', value: activeSemester()?.name || '—', sub: `${state.courses.length} courses` },
    { label: 'Class slots', value: String(state.routine.length), sub: 'per week' },
    { label: 'Contact hours', value: `${Math.round((totalMinutes / 60) * 10) / 10}h`, sub: 'per week' },
    { label: 'Today', value: today, sub: `${todayList.length} class${todayList.length === 1 ? '' : 'es'}` },
  ])}

    ${card('Today', todayList.length
    ? `<ul class="class-list">${todayList.map((c) => classRow(c)).join('')}</ul>`
    : emptyState('No classes today', 'Nothing scheduled — enjoy the free time.'),
    { subtitle: 'Current and upcoming classes with live status' })}

    ${card('Weekly routine', `<div id="dayTabs">${segmented(activeDays, activeDay, 'data-day')}</div>
      <div id="slotList" style="margin-top:14px">${slotRows(state, activeDay)}</div>`,
    { subtitle: 'Tap any class to edit it', actions: '<button class="btn small" data-add-slot>+ Class slot</button>' })}

    ${card('Courses', state.courses.length ? `<div class="course-grid">${state.courses.map((course) => {
      const slotCount = state.routine.filter((r) => r.courseId === course.id).length;
      return `<div class="course-card" style="--course:${esc(course.color || '#635bff')}">
        <strong>${esc(course.code)}</strong>
        <span>${esc(course.title)}</span>
        <small>Section ${esc(course.section || '—')} · ${slotCount} class${slotCount === 1 ? '' : 'es'}/week</small>
        <div class="row-actions">
          <button class="btn small ghost" type="button" data-edit-course="${esc(course.id)}">Edit</button>
          <button class="btn small ghost" type="button" data-delete-course="${esc(course.id)}">Delete</button>
        </div>
      </div>`;
    }).join('')}</div>` : emptyState('No courses yet', 'Add the courses you are taking this semester.', '<button class="btn primary" data-add-course>Add course</button>'),
    { actions: '<button class="btn small" data-add-course>+ Course</button>' })}`;

  wire(root);
}

/* -------------------------------------------------------------- interaction */

function wire(root) {
  const redraw = () => renderRoutine(root);
  attach(root, ({ signal }) => {
    root.addEventListener('click', async (event) => {
      const el = event.target.closest('button');
      if (!el) return;
      const { addSemester, editSemester, deleteSemester, activateSemester, addCourse, editCourse, deleteCourse, addSlot, editSlot, deleteSlot, markPresent, markAbsent } = el.dataset;

      if (el.dataset.day) {
        activeDay = el.dataset.day;
        redraw();
        return;
      }
      if (addSemester !== undefined) return openSemesterForm();
      if (editSemester) return openSemesterForm(editSemester);
      if (deleteSemester) return removeSemester(deleteSemester);
      if (activateSemester) { setActiveSemester(activateSemester); toastOk('Active semester updated.'); return; }
      if (addCourse !== undefined) return openCourseForm();
      if (editCourse) return openCourseForm(editCourse);
      if (deleteCourse) return removeCourse(deleteCourse);
      if (addSlot !== undefined) return openSlotForm();
      if (editSlot) return openSlotForm(editSlot);
      if (deleteSlot) return removeSlot(deleteSlot);
      if (markPresent) return markSlotAttendance(markPresent, 'present');
      if (markAbsent) return markSlotAttendance(markAbsent, 'absent');
    }, { signal });
  });
}

/** Mark a specific class slot, replacing any existing record for that slot. */
function markSlotAttendance(slotId, status) {
  const slot = list.find('routine', slotId);
  if (!slot) return;
  update((draft) => {
    draft.attendance = draft.attendance.filter((a) => a.scheduleId !== slotId);
    draft.attendance.push({
      id: `att_${Date.now().toString(36)}`,
      courseId: slot.courseId,
      scheduleId: slotId,
      date: todayKey(),
      status,
      note: '',
    });
  });
  toastOk(status === 'present' ? 'Marked present.' : 'Marked absent.');
}
