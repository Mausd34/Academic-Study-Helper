# Academic Study Helper

Personal mobile-first academic productivity app for Masud Rana (ID 22303062), Fall 2026.

## Included
- Fall 2026 routine preloaded
- Per-course attendance
- Assignment/deadline tracker
- Pomodoro and deep-work timer
- Local notes
- Bangladesh Taka expense tracker
- Python, SQL, ML, FastAPI and Flutter skill roadmap
- Four-month career roadmap
- Offline-first study assistant with simple English and Bangla
- JSON export/import backup
- Dark mode
- Installable PWA
- Offline cache
- GitHub Pages deployment

## Stack
HTML + CSS + JavaScript + LocalStorage + Service Worker.

The current assistant is local-first. Do not put a private LLM API key in this public frontend. A future FastAPI backend can provide secure AI integration and cloud sync.

## Local run
Open index.html directly, or serve the folder with a local static server such as Python's http.server.

## GitHub Pages
The repository contains a GitHub Actions workflow that deploys the root directory to GitHub Pages whenever main changes.

Expected project URL:
https://mausd34.github.io/Academic-Study-Helper/

## Roadmap
Phase 2: FastAPI, PostgreSQL, authentication, secure AI provider, cloud sync, real ML model, notifications.
Phase 3: Flutter Android client using the same API, AI quiz generation, PDF note import, calendar sync and GitHub analytics.

## Privacy
Academic records, notes, tasks and expenses are stored in this browser's localStorage. Do not enter secrets or passwords.
