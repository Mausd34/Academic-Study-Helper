# Academic Study Helper

A mobile-first personal academic productivity PWA for Masud Rana (CSE, IUBAT) — Fall 2026.

## Status

Pages is **not enabled** for this repository, so there is no live URL yet. To publish:

1. Repo → **Settings → Pages** → Source: **GitHub Actions**
2. Push to `main` — `.github/workflows/deploy.yml` builds and publishes

Until then, run it locally with `npm run serve`.

## Features
- 📊 Dashboard with today's classes, attendance, assignments, expenses and skill progress
- 🗓️ Fall 2026 weekly routine with automatic current-day selection
- ✅ Per-course attendance tracker
- 📝 Assignment/deadline tracker with search, due dates and priority
- ⏱️ Pomodoro focus timer with completed-session statistics
- 📚 Course notes with search and local storage
- 💰 Bangladesh Taka expense tracker with dates/categories
- ⚡ Python, SQL, ML, Data Analysis, Git/GitHub, FastAPI, Flutter and DSA skill tracker
- 🚀 Four-month career roadmap
- ✦ Offline study assistant with simple English + Bangla explanations
- 🌙 Dark mode
- 📱 Installable PWA
- 📴 Offline cache with service worker
- 💾 JSON export + import backup
- 🔒 Local-first privacy: no analytics and no API keys in the frontend

## Stack
HTML + CSS + vanilla JavaScript + LocalStorage + Service Worker + GitHub Pages.

## Run locally
Serve the folder with any static web server. ES modules will not load from `file://`, so use a server:

```bash
npm run serve                      # static server on http://localhost:8000
npm run serve -- 8123              # or pick a port (the browser tests expect 8123)
```

After editing anything, clear the service worker cache (DevTools → Application → Clear site data) so you are not looking at a stale bundle.

## Verification
```bash
npm run check      # JS syntax + ES import paths + CSS integrity + markup contract
npm test           # 29 core unit tests + 8 storage/migration tests
```
Both must pass with zero failures before pushing.

## Data
The app stores academic data in browser LocalStorage. Use **Settings → Export JSON** regularly. **Settings → Import JSON** can restore a backup on the same or another browser.

## AI
The current assistant is intentionally offline. A real LLM should be connected through a secure backend such as FastAPI; never place a private provider API key in this public repository.

## Deployment
GitHub Actions deploys the root project to GitHub Pages when `main` changes.

## Roadmap
- FastAPI + PostgreSQL cloud sync
- Secure authentication
- Real LLM study assistant
- AI quiz/MCQ generation
- PDF note import
- Calendar/notification integration
- Flutter Android client
- ML-based study recommendations
