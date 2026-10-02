/**
 * Versioned localStorage persistence + schema migration.
 * Key: academic-study-helper-v4 (v3 data is migrated on first load).
 */
import { uid, todayKey, toNumber, clamp, nowISO } from './utils.js';

export const STORAGE_KEY = 'academic-study-helper-v4';
export const LEGACY_KEYS = ['academic-study-helper-v3', 'academic-study-helper-v2'];
export const SCHEMA_VERSION = 4;

const memoryFallback = new Map();

/** localStorage can throw in private mode — fall back to memory so the app still runs. */
function readRaw(key) {
  try {
    return window.localStorage.getItem(key);
  } catch (error) {
    console.warn('[storage] localStorage unavailable, using memory', error);
    return memoryFallback.get(key) ?? null;
  }
}

function writeRaw(key, value) {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.warn('[storage] write failed, using memory', error);
    memoryFallback.set(key, value);
    return false;
  }
}

function removeRaw(key) {
  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    memoryFallback.delete(key);
  }
}

/* ------------------------------------------------------------ default state */

const COURSE_SEED = [
  { code: 'CSE 4357', title: 'Data Science', section: 'F', room: '', color: '#635bff' },
  { code: 'CSC 471', title: 'Computer Graphics', section: 'B', room: '', color: '#0ea5e9' },
  { code: 'ENG 250', title: 'Public Speaking', section: 'A', room: '', color: '#f59e0b' },
  { code: 'CSC 465', title: 'Data Communication & Computer Network', section: 'B', room: '', color: '#10b981' },
  { code: 'CSE 3308', title: 'Course title editable', section: 'C', room: '', color: '#ec4899' },
  { code: 'EEN 184', title: 'Circuit Lab I', section: 'B', room: '', color: '#8b5cf6' },
];

/** Fall 2026 routine exactly as published, stored as editable records. */
const ROUTINE_SEED = [
  ['CSE 4357', 'Saturday', '09:35', '10:35', '1009'],
  ['CSE 4357', 'Sunday', '09:35', '10:35', '1005'],
  ['CSE 4357', 'Monday', '09:35', '10:35', '1004'],
  ['CSC 471', 'Saturday', '11:45', '12:45', '1123'],
  ['CSC 471', 'Tuesday', '11:45', '12:45', '1123'],
  ['CSC 471', 'Wednesday', '11:45', '12:45', '501'],
  ['ENG 250', 'Sunday', '08:30', '09:30', '906'],
  ['ENG 250', 'Monday', '08:30', '09:30', '906'],
  ['ENG 250', 'Wednesday', '08:30', '09:30', '906'],
  ['CSC 465', 'Monday', '10:40', '11:40', '1004'],
  ['CSC 465', 'Tuesday', '10:40', '11:40', '912'],
  ['CSC 465', 'Wednesday', '10:40', '11:40', '909'],
  ['CSE 3308', 'Monday', '13:10', '14:10', 'EEELab6'],
  ['CSE 3308', 'Monday', '14:15', '15:15', 'EEELab6'],
  ['EEN 184', 'Tuesday', '08:30', '09:30', 'EEELab1'],
  ['EEN 184', 'Tuesday', '09:35', '10:35', 'EEELab1'],
];

const SKILL_SEED = [
  ['Python', 55, 'Core'],
  ['SQL', 35, 'Data'],
  ['Machine Learning', 30, 'AI'],
  ['Data Analysis', 25, 'Data'],
  ['Git/GitHub', 65, 'Tools'],
  ['FastAPI', 15, 'Backend'],
  ['Flutter', 10, 'Mobile'],
  ['DSA', 25, 'Core'],
  ['Django', 5, 'Backend'],
  ['JavaScript', 30, 'Web'],
  ['C++', 45, 'Core'],
  ['C#', 10, 'Core'],
  ['Computer Networks', 40, 'Academics'],
  ['Linux', 35, 'Tools'],
];

/** A brand new, fully seeded workspace. */
export function defaultState() {
  const semesterId = uid('sem');
  const courseIds = new Map();
  const courses = COURSE_SEED.map((course) => {
    const id = uid('crs');
    courseIds.set(course.code, id);
    return {
      id,
      semesterId,
      code: course.code,
      title: course.title,
      section: course.section,
      room: course.room,
      color: course.color,
      credits: 3,
      teacher: '',
    };
  });

  const routine = ROUTINE_SEED.map(([code, day, start, end, room]) => ({
    id: uid('sch'),
    semesterId,
    courseId: courseIds.get(code),
    day,
    start,
    end,
    room,
    type: 'lecture',
  }));

  return {
    version: SCHEMA_VERSION,
    createdAt: nowISO(),
    updatedAt: nowISO(),

    profile: {
      name: 'Masud Rana',
      university: 'IUBAT',
      department: 'Computer Science & Engineering',
      studentId: '22303062',
      semester: 'Fall 2026',
      section: 'A',
      email: '',
      phone: '',
      github: 'https://github.com/Mausd34',
      linkedin: '',
      status: '4th Year CSE Student',
      careerGoal: 'Graduate successfully and prepare for AI/ML, Data Analytics, Python development and software engineering jobs.',
      interests: ['AI/ML Engineer', 'Data Analyst', 'Python Developer', 'Backend Developer', 'Data Scientist', 'AI Automation Engineer'],
    },

    settings: {
      theme: 'system',
      language: 'en',
      attendanceTarget: 75,
      notifications: false,
      weekStart: 'Saturday',
      pomodoro: { focus: 25, shortBreak: 5, longSession: 50, longBreak: 10, autoStartBreak: true },
      seededSampleData: true,
    },

    semesters: [
      { id: semesterId, name: 'Fall 2026', startDate: '2026-09-01', endDate: '2027-01-31', active: true },
      { id: uid('sem'), name: 'Spring 2027', startDate: '2027-02-01', endDate: '2027-06-30', active: false },
      { id: uid('sem'), name: 'Summer 2027', startDate: '2027-07-01', endDate: '2027-08-31', active: false },
    ],

    courses,
    routine,
    attendance: sampleAttendance(courses),
    tasks: sampleTasks(courseIds),
    exams: sampleExams(courseIds),
    notes: sampleNotes(courseIds),
    expenses: sampleExpenses(),
    studySessions: sampleStudySessions(courseIds),
    skills: SKILL_SEED.map(([name, progress, group]) => ({ id: uid('skl'), name, progress, group, updatedAt: nowISO() })),
    roadmap: [],
    learningPlan: [],
    coding: sampleCoding(),
    chat: [],
    careerGoals: [
      { id: uid('goal'), name: 'Python + SQL to job-ready', progress: 45, target: 100 },
      { id: uid('goal'), name: 'ML fundamentals', progress: 30, target: 100 },
      { id: uid('goal'), name: 'Ship 3 portfolio projects', progress: 25, target: 100 },
    ],
    portfolioProjects: [
      { id: uid('prj'), name: 'Student Performance Prediction', progress: 20, status: 'Building' },
      { id: uid('prj'), name: 'Personal Expense Analytics', progress: 10, status: 'Planned' },
      { id: uid('prj'), name: 'AI Study Assistant API (FastAPI)', progress: 0, status: 'Planned' },
    ],
    events: [],
    notified: {},
  };
}


/* -------------------------------------------------------------- sample data */
/* Small and realistic. All of it is deletable from the UI and marked as sample. */

/** Resolve a course id from a course array or a code→id Map. */
const byCode = (source, code) => {
  if (source instanceof Map) return source.get(code) ?? source.values().next().value;
  return source.find((c) => c.code === code)?.id ?? source[0]?.id;
};

function toDateKeyLocal(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function shift(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toDateKeyLocal(d);
}

function sampleAttendance(courses) {
  const rows = [];
  // CSC 465: the worked example from the spec — 12 present, 2 absent.
  for (let i = 0; i < 12; i += 1) {
    rows.push({ id: uid('att'), courseId: byCode(courses, 'CSC 465'), date: shift(-(14 - i)), status: 'present', note: '' });
  }
  for (const offset of [-12, -6]) {
    rows.push({ id: uid('att'), courseId: byCode(courses, 'CSC 465'), date: shift(offset), status: 'absent', note: '' });
  }
  for (let i = 0; i < 8; i += 1) {
    rows.push({ id: uid('att'), courseId: byCode(courses, 'CSE 4357'), date: shift(-(10 - i)), status: 'present', note: '' });
  }
  for (let i = 0; i < 3; i += 1) {
    rows.push({ id: uid('att'), courseId: byCode(courses, 'ENG 250'), date: shift(-(9 - i)), status: i === 2 ? 'absent' : 'present', note: i === 2 ? 'Sick' : '' });
  }
  for (let i = 0; i < 7; i += 1) {
    rows.push({ id: uid('att'), courseId: byCode(courses, 'EEN 184'), date: shift(-(8 - i)), status: 'present', note: '' });
  }
  for (let i = 0; i < 6; i += 1) {
    rows.push({ id: uid('att'), courseId: byCode(courses, 'CSC 471'), date: shift(-(7 - i)), status: i === 5 ? 'absent' : 'present', note: '' });
  }
  return rows;
}

function sampleTasks(courses) {
  return [
    { id: uid('tsk'), title: 'Lab report — socket programming', courseId: byCode(courses, 'CSC 465'), description: 'Submit the TCP client/server lab report with screenshots.', dueDate: shift(3), dueTime: '23:59', priority: 'High', status: 'in-progress', estimateHours: 4, tags: ['lab', 'report'], createdAt: nowISO(), completedAt: null },
    { id: uid('tsk'), title: 'Pandas groupby assignment', courseId: byCode(courses, 'CSE 4357'), description: 'Answer the six questions using a public dataset.', dueDate: shift(1), dueTime: '20:00', priority: 'Urgent', status: 'pending', estimateHours: 3, tags: ['data'], createdAt: nowISO(), completedAt: null },
    { id: uid('tsk'), title: 'Public speaking outline', courseId: byCode(courses, 'ENG 250'), description: 'Three-minute talk on "study systems".', dueDate: shift(6), dueTime: '18:00', priority: 'Medium', status: 'pending', estimateHours: 1.5, tags: ['presentation'], createdAt: nowISO(), completedAt: null },
    { id: uid('tsk'), title: 'Graphics assignment 1', courseId: byCode(courses, 'CSC 471'), description: 'Line clipping and Cohen–Sutherland demo.', dueDate: shift(-1), dueTime: '23:59', priority: 'High', status: 'pending', estimateHours: 5, tags: ['graphics'], createdAt: nowISO(), completedAt: null },
    { id: uid('tsk'), title: 'Read Chapter 3 — circuit analysis', courseId: byCode(courses, 'EEN 184'), description: '', dueDate: shift(-2), dueTime: '', priority: 'Low', status: 'completed', estimateHours: 2, tags: [], createdAt: nowISO(), completedAt: nowISO() },
  ];
}

function sampleExams(courses) {
  return [
    { id: uid('exm'), courseId: byCode(courses, 'CSC 465'), title: 'Data Communication Midterm', type: 'Midterm', date: shift(6), time: '10:00', room: 'Exam Hall 1', syllabus: 'Chapters 1–4: OSI, TCP/IP, transmission basics', prep: 35, notes: 'Revise the transport layer first.', createdAt: nowISO() },
    { id: uid('exm'), courseId: byCode(courses, 'CSE 4357'), title: 'Data Science Quiz', type: 'Quiz', date: shift(2), time: '09:35', room: '1009', syllabus: 'NumPy + Pandas basics', prep: 60, notes: '', createdAt: nowISO() },
    { id: uid('exm'), courseId: byCode(courses, 'EEN 184'), title: 'Circuit Lab I Lab Exam', type: 'Lab', date: shift(13), time: '13:10', room: 'EEELab1', syllabus: 'Ohm, KVL, nodal analysis', prep: 10, notes: 'Bring a calculator.', createdAt: nowISO() },
  ];
}

function sampleNotes(courses) {
  return [
    { id: uid('not'), title: 'TCP/IP in five lines', courseId: byCode(courses, 'CSC 465'), topic: 'Transport layer', content: '# TCP/IP in five lines\n\n1. **Application** — HTTP, DNS, SMTP\n2. **Transport** — TCP (reliable) / UDP (fast)\n3. **Internet** — IP addressing + routing\n4. **Link** — Ethernet / Wi-Fi\n\n> TCP = reliable, ordered, slower. UDP = fire and forget.\n\n- Three-way handshake: SYN, SYN-ACK, ACK\n- Four-way teardown: FIN, ACK, FIN, ACK', tags: ['exam', 'networking'], favorite: true, pinned: true, createdAt: nowISO(), updatedAt: nowISO() },
    { id: uid('not'), title: 'Pandas cheat sheet', courseId: byCode(courses, 'CSE 4357'), topic: 'DataFrames', content: '# Pandas\n\n```python\ndf = pd.read_csv("data.csv")\ndf.groupby("course")["marks"].mean()\ndf.describe()\n```\n\n- `merge` = SQL JOIN\n- `pivot_table` = spreadsheet pivot', tags: ['pandas'], favorite: false, pinned: false, createdAt: nowISO(), updatedAt: nowISO() },
  ];
}

function sampleExpenses() {
  return [
    { id: uid('exp'), amount: 120, category: 'Food', date: shift(-1), description: 'Lunch with classmates' },
    { id: uid('exp'), amount: 60, category: 'Transport', date: shift(-1), description: 'Rickshaw fare' },
    { id: uid('exp'), amount: 800, category: 'Books', date: shift(-4), description: 'Data Science reference book' },
    { id: uid('exp'), amount: 1500, category: 'Internet', date: shift(-6), description: 'Monthly broadband share' },
    { id: uid('exp'), amount: 250, category: 'Software', date: shift(-8), description: 'JetBrains student licence' },
  ];
}

function sampleStudySessions(courses) {
  const plan = [
    ['CSE 4357', 'Pandas groupby', 95, 4],
    ['CSC 465', 'TCP handshake practice', 50, 3],
    ['CSE 3308', 'Lab exercise', 50, 3],
    ['ENG 250', 'Outline drafting', 25, 2],
    ['CSC 471', 'Cohen–Sutherland derivation', 25, 1],
  ];
  return plan.map(([code, topic, minutes, daysAgo]) => ({
    id: uid('ses'),
    courseId: byCode(courses, code),
    topic,
    date: shift(-daysAgo),
    start: '19:00',
    end: '20:00',
    minutes,
    rating: 4,
    notes: '',
    createdAt: nowISO(),
  }));
}

function sampleCoding() {
  return [
    { id: uid('cod'), problem: 'Two Sum', platform: 'LeetCode', difficulty: 'Easy', topic: 'Arrays', status: 'solved', link: 'https://leetcode.com/problems/two-sum/', date: shift(-2) },
    { id: uid('cod'), problem: 'Valid Parentheses', platform: 'LeetCode', difficulty: 'Easy', topic: 'Stack', status: 'solved', link: '', date: shift(-3) },
    { id: uid('cod'), problem: 'Binary Search', platform: 'LeetCode', difficulty: 'Medium', topic: 'Binary Search', status: 'attempted', link: '', date: shift(-4) },
    { id: uid('cod'), problem: 'T-shirt buying', platform: 'Codeforces', difficulty: 'Medium', topic: 'Greedy', status: 'attempted', link: '', date: shift(-5) },
  ];
}

/* --------------------------------------------------------------- migration */

const arr = (value) => (Array.isArray(value) ? value : []);
const num = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);

/**
 * Bring any historical/partial payload up to SCHEMA_VERSION.
 * Never throws: broken fields are replaced with safe defaults.
 */
export function migrate(input) {
  const base = defaultState();
  const raw = input && typeof input === 'object' ? input : {};

  // Already current, or a complete export.
  if (raw.version === SCHEMA_VERSION && raw.profile && Array.isArray(raw.courses)) {
    return { ...base, ...raw, settings: { ...base.settings, ...(raw.settings || {}) } };
  }

  // Legacy v3: att map keyed by course code.
  if (!raw.version && raw.att) {
    const courseByCode = new Map(base.courses.map((c) => [c.code, c.id]));
    const attendance = [];
    for (const [code, counts] of Object.entries(raw.att || {})) {
      const courseId = courseByCode.get(code);
      if (!courseId) continue;
      for (let i = 0; i < num(counts.p); i += 1) {
        attendance.push({ id: uid('att'), courseId, date: shift(-(num(counts.p) - i)), status: 'present', note: '' });
      }
      for (let i = 0; i < num(counts.a); i += 1) {
        attendance.push({ id: uid('att'), courseId, date: shift(-i - 1), status: 'absent', note: '' });
      }
    }
    return {
      ...base,
      attendance,
      tasks: arr(raw.tasks).map((task) => ({
        id: task.id || uid('tsk'),
        title: task.title || 'Untitled task',
        courseId: courseByCode.get(task.course) ?? base.courses[0].id,
        description: '',
        dueDate: task.due || '',
        dueTime: '',
        priority: ['Low', 'Medium', 'High', 'Urgent'].includes(task.priority) ? task.priority : 'Medium',
        status: task.done ? 'completed' : 'pending',
        estimateHours: 0,
        tags: [],
        createdAt: nowISO(),
        completedAt: task.done ? nowISO() : null,
      })),
      notes: arr(raw.notes).map((note) => ({
        id: note.id || uid('not'),
        title: note.title || 'Untitled note',
        courseId: courseByCode.get(note.course) ?? base.courses[0].id,
        topic: '',
        content: note.body || '',
        tags: [],
        favorite: false,
        pinned: false,
        createdAt: note.date || nowISO(),
        updatedAt: note.date || nowISO(),
      })),
      expenses: arr(raw.expenses).map((expense) => ({
        id: expense.id || uid('exp'),
        amount: num(expense.amount),
        category: expense.cat || 'Other',
        date: expense.date || todayKey(),
        description: expense.desc || '',
      })),
      skills: arr(raw.skills).map((skill) => ({ id: uid('skl'), name: skill.name || 'Skill', progress: clamp(num(skill.value)), group: 'General', updatedAt: nowISO() })),
      careerGoals: arr(raw.goals).map((goal) => ({ id: uid('goal'), name: goal.name || 'Goal', progress: num(goal.value), target: num(goal.target, 100) })),
      profile: { ...base.profile, name: raw.profile?.name || base.profile.name, studentId: raw.profile?.id || base.profile.studentId },
      settings: { ...base.settings, theme: raw.theme === 'dark' ? 'dark' : raw.theme === 'light' ? 'light' : 'system' },
      studySessions: arr(raw.study?.sessions).length || raw.study?.minutes
        ? [{
          id: uid('ses'),
          courseId: base.courses[0].id,
          topic: 'Migrated focus time',
          date: todayKey(),
          start: '',
          end: '',
          minutes: num(raw.study?.minutes),
          rating: 0,
          notes: 'Imported from the previous app version.',
          createdAt: nowISO(),
        }]
        : [],
    };
  }

  // Unknown shape: start clean but keep collections that look usable.
  return {
    ...base,
    tasks: arr(raw.tasks),
    notes: arr(raw.notes),
    expenses: arr(raw.expenses),
    courses: arr(raw.courses).length ? arr(raw.courses) : base.courses,
    attendance: arr(raw.attendance),
    routine: arr(raw.routine).length ? arr(raw.routine) : base.routine,
  };
}

/* ------------------------------------------------------------------ public */

/** Load persisted state, migrating legacy keys when needed. */
export function load() {
  const current = readRaw(STORAGE_KEY);
  if (current) {
    try {
      return migrate(JSON.parse(current));
    } catch (error) {
      console.warn('[storage] corrupt state, rebuilding', error);
      return defaultState();
    }
  }
  for (const key of LEGACY_KEYS) {
    const legacy = readRaw(key);
    if (!legacy) continue;
    try {
      const migrated = migrate(JSON.parse(legacy));
      writeRaw(STORAGE_KEY, JSON.stringify(migrated));
      removeRaw(key);
      return migrated;
    } catch (error) {
      console.warn(`[storage] could not migrate ${key}`, error);
    }
  }
  const fresh = defaultState();
  writeRaw(STORAGE_KEY, JSON.stringify(fresh));
  return fresh;
}

export function save(state) {
  try {
    state.updatedAt = nowISO();
  } catch {
    /* state is frozen — ignore */
  }
  writeRaw(STORAGE_KEY, JSON.stringify(state));
}

/** Validate an imported payload before it is allowed to replace live data. */
export function validateBackup(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { ok: false, reason: 'File is not a JSON object.' };
  }
  const required = ['profile', 'semesters', 'courses', 'routine'];
  const missing = required.filter((key) => !(key in payload));
  if (missing.length) {
    return { ok: false, reason: `Missing sections: ${missing.join(', ')}.` };
  }
  if (!Array.isArray(payload.courses) || !Array.isArray(payload.semesters)) {
    return { ok: false, reason: 'Courses and semesters must be arrays.' };
  }
  if (payload.version && Number(payload.version) > SCHEMA_VERSION) {
    return { ok: false, reason: 'Backup was made by a newer version of the app.' };
  }
  return { ok: true, reason: '' };
}

export function clearAll() {
  removeRaw(STORAGE_KEY);
  for (const key of LEGACY_KEYS) removeRaw(key);
  memoryFallback.clear();
}

export function exportPayload(state) {
  return JSON.stringify({ ...state, exportedAt: nowISO(), version: SCHEMA_VERSION }, null, 2);
}

/** Approximate on-disk size in bytes, for the settings screen. */
export function storageSize(state) {
  try {
    return new Blob([JSON.stringify(state)]).size;
  } catch {
    return JSON.stringify(state).length;
  }
}
