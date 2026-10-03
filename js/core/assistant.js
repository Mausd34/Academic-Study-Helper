/**
 * Offline study assistant.
 *
 * IMPORTANT: this runs entirely in the browser with deterministic rules and
 * the user's own data. No API key is ever present in the frontend and no
 * network request is made. A real LLM should be wired in through a backend
 * (FastAPI) — see `backendMode()`.
 */
import { KNOWLEDGE } from './knowledge.js';
import { buildPriorities } from './recommend.js';
import { todayClassesWithStatus, nextClass, courseById } from './routine.js';
import { studyStats, taskCounts, attendanceTotals, expenseTotals } from './analytics.js';
import { formatHours, formatMoney, daysUntil, formatDate, todayKey } from './utils.js';

/* ------------------------------------------------------------- live answers */

function liveAnswer(state) {
  const priorities = buildPriorities(state, { limit: 3 });
  const next = nextClass(state);
  const study = studyStats(state);
  const tasks = taskCounts(state);
  const attendance = attendanceTotals(state);
  const expenses = expenseTotals(state);
  const classes = todayClassesWithStatus(state);
  const lines = [];

  lines.push(`Today is ${formatDate(todayKey())}.`);
  lines.push(classes.length
    ? `You have ${classes.length} class${classes.length === 1 ? '' : 'es'}.${next ? ` Next: ${next.course.code} at ${next.start} in ${next.room || 'TBA'}.` : ''}`
    : 'You have no classes today.');
  if (priorities.length) {
    lines.push('Suggested priority:');
    priorities.forEach((p, i) => lines.push(`${i + 1}. ${p.label} — ${p.reasons[0]}`));
  } else {
    lines.push('No urgent deadlines. Good time to rest or build a portfolio project.');
  }
  lines.push(`Tasks: ${tasks.pending} pending, ${tasks.overdue} overdue. Study: ${formatHours(study.todayMinutes)} today, ${formatHours(study.weekMinutes)} this week.`);
  lines.push(`Attendance: ${attendance.percent}% overall. Expenses this month: ${formatMoney(expenses.month)}.`);
  return lines.join('\n');
}

function attendanceAnswer(state) {
  const target = state?.settings?.attendanceTarget ?? 75;
  const totals = attendanceTotals(state);
  const rows = (state?.courses || []).map((course) => {
    const own = (state.attendance || []).filter((r) => r.courseId === course.id);
    const present = own.filter((r) => r.status !== 'absent').length;
    const pct = own.length ? Math.round((present / own.length) * 1000) / 10 : 0;
    return `• ${course.code}: ${pct}% (${present}/${own.length})`;
  });
  return `Overall attendance is ${totals.percent}% (${totals.present} present, ${totals.absent} absent) against a ${target}% target.\n\n${rows.join('\n')}\n\nOpen the Attendance page for the "classes you can still miss" calculation.`;
}

function studyPlanAnswer(state) {
  const nextExam = (state?.exams || [])
    .filter((e) => (daysUntil(e.date) ?? -1) >= 0)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))[0];
  if (!nextExam) {
    return 'No upcoming exam is scheduled. Add one from the Exams page and I will build a dated revision plan for it.';
  }
  const course = courseById(state, nextExam.courseId);
  const days = daysUntil(nextExam.date);
  const blocks = Math.max(2, Math.min(8, Math.round(days / 2)));
  return `Revision plan for ${nextExam.title || nextExam.type} (${course?.code || 'course'}) in ${days} day${days === 1 ? '' : 's'}:\n\n• Split the syllabus into ${blocks} blocks, one per study session.\n• Days 1–${Math.max(1, days - 2)}: learn and recall each block.\n• Last 2 days: past questions and weak topics only.\n• Final day: no new topics, recall only.\n\nTrack preparation % on the Exams page to see progress.`;
}

/* ------------------------------------------------------------------ public */

const BACKEND_URL = 'http://127.0.0.1:8000';

const SUGGESTIONS = [
  { en: 'Explain TCP/IP simply', bn: 'TCP/IP সহজ করে বুঝাও' },
  { en: 'Give me a Python learning plan', bn: 'Python শেখার পরিকল্পনা দাও' },
  { en: 'Explain compiler phases', bn: 'কম্পাইলারের ধাপগুলো বুঝাও' },
  { en: 'Prepare ML viva questions', bn: 'ML viva প্রশ্ন তৈরি করো' },
  { en: 'Give me networking MCQs', bn: 'নেটওয়ার্কিং MCQ দাও' },
  { en: 'What should I study today?', bn: 'আজ কী পড়া উচিত?' },
  { en: 'Create a study plan for my exam', bn: 'পরীক্ষার জন্য স্টাডি প্ল্যান বানাও' },
  { en: 'How is my attendance?', bn: 'আমার উপস্থিতি কেমন?' },
];

export const suggestedPrompts = (language = 'en') => SUGGESTIONS.map((s) => s[language] || s.en);

const FALLBACK = {
  en: 'I do not have that topic in my offline knowledge base yet. Try: TCP/IP, compiler phases, Python, ML viva, networking MCQ, OS, DBMS, study method — or ask "What should I study today?".\n\nA real LLM can be connected later through a FastAPI backend; the API key stays on the server and never in this app.',
  bn: 'এই টপিকটি আমার অফলাইন knowledge base-এ নেই। চেষ্টা করুন: TCP/IP, compiler phases, Python, ML viva, networking MCQ, OS, DBMS, study method — অথবা জিজ্ঞাসা করুন "আজ কী পড়া উচিত?"।\n\nভবিষ্যতে FastAPI backend দিয়ে আসল LLM যুক্ত করা যাবে; API key সার্ভারেই থাকবে, এই অ্যাপে নয়।',
};

/**
 * Answer a question deterministically.
 * @param {string} question
 * @param {{language?: string, state?: object}} options
 * @returns {{text: string, source: string}}
 */
export function answer(question, { language = 'en', state = {} } = {}) {
  const q = String(question ?? '').toLowerCase().trim();
  const pick = (entry) => (language === 'bn' ? entry.bn || entry.en : entry.en);

  if (!q) {
    return {
      text: language === 'bn'
        ? 'একটি প্রশ্ন লিখুন অথবা নিচের প্রস্তাবগুলো থেকে বেছে নিন। আমি সম্পূর্ণ অফলাইনে কাজ করি।'
        : 'Ask me something, or pick one of the suggestions below. I run fully offline.',
      source: 'help',
    };
  }

  // Bangla triggers for live answers.
  if (/আজ|কী পড়|কি পড়/.test(q) || /\btoday\b|\bstudy now\b/.test(q)) {
    return { text: liveAnswer(state || {}), source: 'live' };
  }
  if (/উপস্থিতি/.test(q) || /\battendance\b/.test(q)) {
    return { text: attendanceAnswer(state || {}), source: 'live' };
  }
  if (/পরীক্ষা|স্টাডি প্ল্যান|রিভিশন/.test(q) || /\bexam\b|study plan|revision plan/.test(q)) {
    return { text: studyPlanAnswer(state || {}), source: 'live' };
  }

  for (const entry of KNOWLEDGE) {
    if (entry.match.some((keyword) => q.includes(keyword))) {
      return { text: pick(entry), source: entry.id };
    }
  }

  return { text: language === 'bn' ? FALLBACK.bn : FALLBACK.en, source: 'fallback' };
}

/**
 * Local backend bridge state. The app keeps this optional and falls back to the
 * offline engine if the backend is unavailable or rejected.
 */
export async function askBackend(question, { language = 'en', state = {} } = {}) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: String(question ?? '').trim(),
        language,
        provider: 'offline',
        state,
      }),
    });

    if (!response.ok) {
      throw new Error(`Backend rejected the request (${response.status})`);
    }

    const payload = await response.json();
    if (!payload?.text) {
      throw new Error('Backend response missing text');
    }

    return {
      text: String(payload.text),
      source: 'backend',
    };
  } catch (error) {
    return null;
  }
}

export function backendMode() {
  return {
    enabled: false,
    url: '',
    note: 'Offline mode is active by default. Start the local FastAPI backend later if you want to enable the AI bridge.',
  };
}
