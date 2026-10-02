/**
 * Shared form option builders and field specs.
 * Keeps every CRUD modal consistent across views.
 */
import { todayKey, uid, nowISO, DAYS } from './utils.js';
import { getState } from './store.js';

export const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];
export const TASK_STATUSES = ['pending', 'in-progress', 'completed'];
export const EXAM_TYPES = ['Quiz', 'Midterm', 'Final', 'Lab', 'Viva', 'Presentation'];
export const EXPENSE_CATEGORIES = ['Food', 'Transport', 'Education', 'Internet', 'Mobile', 'Books', 'Software', 'Other'];
export const PLATFORMS = ['LeetCode', 'Codeforces', 'HackerRank', 'CodeChef', 'AtCoder'];
export const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
export const CODING_STATUSES = ['attempted', 'solved', 'skipped'];
export const SKILL_GROUPS = ['Core', 'Data', 'AI', 'Backend', 'Web', 'Mobile', 'Tools', 'Academics', 'General'];

/** <option> list for the current courses. */
export const courseOptions = (includeEmpty = true) => [
  ...(includeEmpty ? [{ value: '', label: 'Unassigned' }] : []),
  ...(getState().courses || []).map((c) => ({ value: c.id, label: `${c.code} — ${c.title}` })),
];

export const courseCodeOptions = () => (getState().courses || []).map((c) => ({ value: c.id, label: c.code }));
export const semesterOptions = () => (getState().semesters || []).map((s) => ({ value: s.id, label: s.name }));

/* ------------------------------------------------------------ field specs */

export const taskFields = (value = {}) => [
  { name: 'title', label: 'Task title', type: 'text', value: value.title || '', required: true, full: true, placeholder: 'e.g. Lab report — socket programming' },
  { name: 'courseId', label: 'Course', type: 'select', value: value.courseId || '', options: courseOptions() },
  { name: 'dueDate', label: 'Due date', type: 'date', value: value.dueDate || todayKey() },
  { name: 'dueTime', label: 'Due time', type: 'time', value: value.dueTime || '' },
  { name: 'priority', label: 'Priority', type: 'select', value: value.priority || 'Medium', options: PRIORITIES },
  { name: 'status', label: 'Status', type: 'select', value: value.status || 'pending', options: [{ value: 'pending', label: 'Pending' }, { value: 'in-progress', label: 'In Progress' }, { value: 'completed', label: 'Completed' }] },
  { name: 'estimateHours', label: 'Estimated hours', type: 'number', value: value.estimateHours ?? '', min: 0, step: 0.5 },
  { name: 'description', label: 'Description', type: 'textarea', value: value.description || '', full: true, rows: 3 },
  { name: 'tags', label: 'Tags', type: 'tags', value: value.tags || [], full: true, hint: 'Comma separated' },
];

export const examFields = (value = {}) => [
  { name: 'title', label: 'Exam title', type: 'text', value: value.title || '', required: true, full: true, placeholder: 'e.g. Data Communication Midterm' },
  { name: 'courseId', label: 'Course', type: 'select', value: value.courseId || '', options: courseOptions() },
  { name: 'type', label: 'Exam type', type: 'select', value: value.type || 'Midterm', options: EXAM_TYPES },
  { name: 'date', label: 'Date', type: 'date', value: value.date || todayKey(), required: true },
  { name: 'time', label: 'Time', type: 'time', value: value.time || '10:00' },
  { name: 'room', label: 'Room', type: 'text', value: value.room || '' },
  { name: 'prep', label: 'Preparation %', type: 'range', value: value.prep ?? 0, min: 0, max: 100, step: 5, unit: '%' },
  { name: 'syllabus', label: 'Syllabus', type: 'textarea', value: value.syllabus || '', full: true, rows: 3, placeholder: 'Chapters, topics, formula sheet…' },
  { name: 'notes', label: 'Notes', type: 'textarea', value: value.notes || '', full: true, rows: 2 },
];

export const noteFields = (value = {}) => [
  { name: 'title', label: 'Title', type: 'text', value: value.title || '', required: true, full: true },
  { name: 'courseId', label: 'Course', type: 'select', value: value.courseId || '', options: courseOptions() },
  { name: 'topic', label: 'Topic', type: 'text', value: value.topic || '' },
  { name: 'content', label: 'Content', type: 'textarea', value: value.content || '', full: true, rows: 10, hint: 'Markdown supported: # heading, - list, **bold**, `code`' },
  { name: 'tags', label: 'Tags', type: 'tags', value: value.tags || [], full: true },
  { name: 'favorite', label: 'Favourite', type: 'checkbox', value: value.favorite || false },
  { name: 'pinned', label: 'Pin to top', type: 'checkbox', value: value.pinned || false },
];

export const expenseFields = (value = {}) => [
  { name: 'amount', label: 'Amount (৳)', type: 'number', value: value.amount ?? '', required: true, min: 0, step: 1 },
  { name: 'category', label: 'Category', type: 'select', value: value.category || 'Food', options: EXPENSE_CATEGORIES },
  { name: 'date', label: 'Date', type: 'date', value: value.date || todayKey(), required: true },
  { name: 'description', label: 'Description', type: 'text', value: value.description || '', full: true },
];

export const sessionFields = (value = {}) => [
  { name: 'courseId', label: 'Course', type: 'select', value: value.courseId || '', options: courseOptions() },
  { name: 'topic', label: 'Topic', type: 'text', value: value.topic || '', required: true, full: true, placeholder: 'What did you study?' },
  { name: 'date', label: 'Date', type: 'date', value: value.date || todayKey(), required: true },
  { name: 'minutes', label: 'Duration (minutes)', type: 'number', value: value.minutes ?? 50, required: true, min: 1, step: 5 },
  { name: 'rating', label: 'Focus rating (1–5)', type: 'range', value: value.rating ?? 3, min: 1, max: 5, step: 1 },
  { name: 'notes', label: 'Notes', type: 'textarea', value: value.notes || '', full: true, rows: 2 },
];

export const codingFields = (value = {}) => [
  { name: 'problem', label: 'Problem', type: 'text', value: value.problem || '', required: true, full: true },
  { name: 'platform', label: 'Platform', type: 'select', value: value.platform || 'LeetCode', options: PLATFORMS },
  { name: 'difficulty', label: 'Difficulty', type: 'select', value: value.difficulty || 'Easy', options: DIFFICULTIES },
  { name: 'topic', label: 'Topic', type: 'text', value: value.topic || '' },
  { name: 'status', label: 'Status', type: 'select', value: value.status || 'attempted', options: [{ value: 'attempted', label: 'Attempted' }, { value: 'solved', label: 'Solved' }, { value: 'skipped', label: 'Skipped' }] },
  { name: 'date', label: 'Date', type: 'date', value: value.date || todayKey() },
  { name: 'link', label: 'Link', type: 'text', value: value.link || '', full: true, placeholder: 'https://…' },
];

export const skillFields = (value = {}) => [
  { name: 'name', label: 'Skill', type: 'text', value: value.name || '', required: true, full: true },
  { name: 'group', label: 'Group', type: 'select', value: value.group || 'General', options: SKILL_GROUPS },
  { name: 'progress', label: 'Progress %', type: 'range', value: value.progress ?? 0, min: 0, max: 100, step: 5, unit: '%' },
];

export const attendanceFields = (value = {}) => [
  { name: 'courseId', label: 'Course', type: 'select', value: value.courseId || '', options: courseOptions(false), required: true, full: true },
  { name: 'date', label: 'Date', type: 'date', value: value.date || todayKey(), required: true },
  { name: 'status', label: 'Status', type: 'select', value: value.status || 'present', options: [{ value: 'present', label: 'Present' }, { value: 'absent', label: 'Absent' }, { value: 'excused', label: 'Excused' }] },
  { name: 'note', label: 'Note', type: 'text', value: value.note || '', placeholder: 'Optional reason' },
];

export { DAYS, uid, nowISO, todayKey };
