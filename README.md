# Academic Study Helper

A mobile-first personal academic productivity PWA for Masud Rana (CSE, IUBAT) — Fall 2026.

## Live app
GitHub Pages: https://mausd34.github.io/Academic-Study-Helper/

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
Serve the folder with any static web server. For example:

```bash
python -m http.server 8000
```

Then open http://localhost:8000

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
