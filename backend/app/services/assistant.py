from __future__ import annotations

from datetime import date
from typing import Any


KNOWLEDGE = [
    {
        'id': 'networking',
        'match': ['tcp', 'ip', 'dns', 'networking', 'router', 'protocol'],
        'en': 'TCP is connection-oriented and reliable; IP is connectionless and handles routing. Together they power most internet communication.',
        'bn': 'TCP connection-oriented ও reliable; IP connectionless এবং routing করে। দুটো মিলে ইন্টারনেটের বেশিরভাগ যোগাযোগ চালায়।',
    },
    {
        'id': 'compiler',
        'match': ['compiler', 'lex', 'parse', 'semantic', 'optimization'],
        'en': 'A compiler usually does lexical analysis, syntax analysis, semantic analysis, optimization, and code generation.',
        'bn': 'কম্পাইলার সাধারণত lexical analysis, syntax analysis, semantic analysis, optimization, এবং code generation করে।',
    },
    {
        'id': 'python',
        'match': ['python', 'learning', 'beginner', 'list', 'dictionary'],
        'en': 'To learn Python well, practise variables, control flow, functions, file I/O, OOP, list/dict operations, and small projects.',
        'bn': 'Python শিখতে হলে variable, control flow, function, file I/O, OOP, list/dict operation, আর ছোট ছোট project অনুশীলন করতে হবে।',
    },
]


def _normalize(question: str) -> str:
    return (question or '').strip().lower()


def _live_answer(state: dict[str, Any]) -> str:
    tasks = state.get('tasks') or []
    exams = state.get('exams') or []
    attendance = state.get('attendance') or []
    courses = state.get('courses') or []
    today = date.today().strftime('%A, %d %B %Y')

    pending = len([t for t in tasks if str(t.get('status', '')).lower() != 'completed'])
    next_exam = min(
        (e for e in exams if e.get('date')),
        key=lambda e: e.get('date', ''),
        default=None,
    )
    attendance_percent = 0
    if attendance and courses:
        present = sum(1 for entry in attendance if str(entry.get('status', '')).lower() == 'present')
        attendance_percent = round((present / len(attendance)) * 100, 1) if attendance else 0

    summary = [f'Today is {today}.']
    summary.append(f'You have {pending} pending task(s) and {len(exams)} exam item(s) in your plan.')
    if next_exam:
        summary.append(f'Your next exam is {next_exam.get("title", "upcoming")} on {next_exam.get("date", "TBA")}.')
    if attendance_percent:
        summary.append(f'Your current attendance is {attendance_percent}% across {len(attendance)} records.')
    else:
        summary.append('Your attendance record is still empty, so add a few classes to track it.')
    summary.append('Focus on the most urgent task first, then revise the next exam block.')
    return ' '.join(summary)


def answer_question(question: str, language: str = 'en', state: dict[str, Any] | None = None) -> dict[str, str]:
    q = _normalize(question)
    state = state or {}

    if not q:
        return {
            'text': 'Ask me a study question and I will answer from the backend assistant.',
            'source': 'help',
        }

    if any(token in q for token in ['today', 'study now', 'what should i study', 'what should i read', 'study plan']):
        return {'text': _live_answer(state), 'source': 'live'}

    for entry in KNOWLEDGE:
        if any(keyword in q for keyword in entry['match']):
            return {'text': entry.get(language, entry['en']), 'source': entry['id']}

    fallback = (
        'I do not have a direct answer for that topic yet. Try networking, compiler design, Python, OS, DBMS, or exam planning.'
        if language == 'en'
        else 'এই topic-এ আমার উত্তর নেই। networking, compiler design, Python, OS, DBMS, বা exam planning চেষ্টা করুন।'
    )
    return {'text': fallback, 'source': 'fallback'}
