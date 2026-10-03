<div align="center">

# 🎓 Academic Study Helper

**A zero-dependency, offline-first Progressive Web App**  
Personal academic operating system for **Masud Rana** — CSE, IUBAT · Fall 2026

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-mausd34.github.io-635bff?style=for-the-badge)](https://mausd34.github.io/Academic-Study-Helper/)
[![Deploy](https://img.shields.io/github/actions/workflow/status/Mausd34/Academic-Study-Helper/deploy.yml?label=Deploy&style=for-the-badge&logo=github-actions&logoColor=white)](https://github.com/Mausd34/Academic-Study-Helper/actions)
[![PWA](https://img.shields.io/badge/PWA-Offline_Ready-5a67d8?style=for-the-badge&logo=pwa&logoColor=white)](https://mausd34.github.io/Academic-Study-Helper/)
[![License](https://img.shields.io/github/license/Mausd34/Academic-Study-Helper?style=for-the-badge)](LICENSE)

</div>

---

## 📖 Overview

Academic Study Helper is a **mobile-first, installable PWA** built entirely with vanilla HTML, CSS, and JavaScript — no frameworks, no bundlers, no external dependencies. Every byte of data lives in the browser's LocalStorage. Works fully offline.

It was designed as a complete personal academic OS for a CSE student at IUBAT, covering everything from daily class routine to attendance forecasting, expense tracking, skill roadmaps, and an AI-powered study assistant.

---

## ✨ Features

### 📊 Dashboard
- Today's live class schedule with real-time class status (Now / Next / Done)
- Smart recommendation engine — surfaces urgent exams, low attendance warnings (< 80%), and imminent deadlines
- At-a-glance attendance summary, active tasks, and upcoming deadlines

### 🗓️ Class Routine
- Full Fall 2026 weekly timetable for all CSE courses
- Auto-highlights today's classes and the current/upcoming session
- Weekly load summary per course (total minutes)

### ✅ Attendance Tracker
- Per-course attendance log with present / absent recording
- **Forecasting engine** — calculates exactly how many classes you can miss and still meet the 80% threshold, or how many consecutive classes you must attend to recover
- Colour-coded danger zones: Safe / At-Risk / Critical

### 📝 Tasks & Assignments
- Add tasks with due dates, course tags, and priority levels
- Status pipeline: Pending → In Progress → Completed
- Full-text search across all tasks

### 📅 Exams
- Exam calendar with countdown timers
- Colour-coded urgency (Today / This Week / Upcoming)
- Links to course and notes

### 📚 Study Notes
- Markdown-rendered notes with full-text search
- Per-course organisation

### ⏱️ Pomodoro Timer
- Configurable focus / short-break / long-break intervals
- Session statistics (total focus time, sessions completed)
- Native desktop notifications

### 💰 Expense Tracker
- Bangladesh Taka (৳) denominated entries with date and category
- Monthly summaries and category breakdowns
- Visual doughnut chart

### ⚡ Skills & Career
- Skill tracker for Python, SQL, ML, Data Analysis, Git, FastAPI, Flutter, DSA
- Four-month career roadmap with milestone progress bars
- Learning plan with resource links

### 📈 Analytics
- Task completion trends (weekly bar chart)
- Expense trends over time
- Coding problem breakdown (solved vs. attempted)
- Attendance overview across all courses

### 🤖 Study Assistant
- Offline knowledge base with answers for CSE topics
- **Bilingual** — responds in English or বাংলা
- Gemini API integration ready (connect via secure backend — never expose keys in frontend)

### 🗓️ Calendar
- Monthly event calendar view
- Overlays exams and task deadlines

### ⚙️ Settings
- Light / Dark / System theme with smooth toggle
- Language toggle (English ↔ বাংলা)
- Full JSON data export & import (backup / restore)
- Profile customisation (name, semester, year)

### 📱 PWA & Offline
- Installable on Android, iOS, and desktop
- Service Worker with cache-first strategy — works with zero connectivity
- App shell cached on install for instant load

---

## 🏗️ Architecture

```
Academic-Study-Helper/
├── index.html              # App shell — single HTML entry point
├── styles.css              # Single design-token CSS file (light/dark themes)
├── sw.js                   # Cache-first Service Worker
├── manifest.json           # PWA manifest
│
├── js/
│   ├── app.js              # Bootstrap — initialises store, router, sidebar, palette
│   ├── core/
│   │   ├── utils.js        # esc(), renderMarkdown(), uid(), date helpers
│   │   ├── i18n.js         # en/bn translations — strict 1-to-1 key parity
│   │   ├── storage.js      # LocalStorage with v4 schema + migration engine
│   │   ├── store.js        # Reactive central state (pub/sub event bus)
│   │   ├── router.js       # Hash-based SPA router with dynamic view imports
│   │   ├── ui.js           # card(), badge(), modal(), toast() UI primitives
│   │   ├── parts.js        # Shared view components (classRow, deadlineList…)
│   │   ├── forms.js        # Form builder utilities
│   │   ├── charts.js       # Lightweight SVG bar, doughnut, progress charts
│   │   ├── analytics.js    # Analytics aggregation functions
│   │   ├── routine.js      # Timetable engine + real-time class status
│   │   ├── recommend.js    # Priority recommendation engine
│   │   ├── assistant.js    # Bilingual study assistant logic
│   │   ├── knowledge.js    # Offline CSE knowledge base
│   │   ├── plans.js        # Career roadmap & learning plan data
│   │   ├── palette.js      # Ctrl+K command palette
│   │   ├── reminders.js    # Browser notification scheduler
│   │   ├── timer.js        # Pomodoro timer engine
│   │   └── theme.js        # Theme apply/cycle/watch (light/dark/system)
│   │
│   └── views/              # 16 lazy-loaded view modules
│       ├── dashboard.js    analytics.js   routine.js   attendance.js
│       ├── tasks.js        exams.js       study.js     notes.js
│       ├── expenses.js     skills.js      career.js    learning.js
│       ├── coding.js       calendar.js    assistant.js settings.js
│
├── assets/icons/           # PWA icons (192×192, 512×512, maskable, SVG)
│
└── tools/                  # Zero-install dev tooling (Node.js only)
    ├── check-syntax.mjs    # Parses all 49 JS/MJS files for syntax errors
    ├── check-imports.mjs   # Verifies every ES import path resolves
    ├── check-css.mjs       # Validates CSS is well-formed
    ├── check-classes.mjs   # Cross-checks HTML classes vs CSS definitions
    ├── test-core.mjs       # 29 headless unit tests (core logic)
    ├── test-storage.mjs    # 8 storage/migration/validation tests
    ├── serve.mjs           # Local static dev server
    └── browser-test.mjs    # E2E tests via Chrome DevTools Protocol (CDP)
```

**Design principles:**
- 🚫 **Zero runtime dependencies** — no npm packages, no CDN links
- 🖥️ **No bundler** — native ES Modules, runs directly in any modern browser
- 📦 **Local-first** — all data in LocalStorage, versioned schema (`v4`) with automatic migration
- 🔐 **Privacy** — no analytics, no tracking, no external API calls by default

---

## 🚀 Quick Start

### Run Locally

> ES Modules require a server — they cannot load from `file://`.

```bash
# Clone the repository
git clone https://github.com/Mausd34/Academic-Study-Helper.git
cd Academic-Study-Helper

# Start local dev server (no npm install needed)
npm run serve
# → http://localhost:8000
```

### Verify Before Pushing

```bash
npm run check     # syntax + imports + CSS integrity + markup contract
npm test          # 29 core tests + 8 storage tests — must be 0 failures
```

---

## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **UI** | Vanilla HTML5 + CSS3 (Custom Properties, Grid, Flexbox) |
| **Logic** | Vanilla JavaScript ES2022 (Native ES Modules) |
| **State** | Central reactive store with pub/sub event bus |
| **Routing** | Hash-based SPA router with lazy dynamic `import()` |
| **Storage** | Browser LocalStorage with versioned schema migration |
| **Charts** | Hand-rolled SVG (bar, doughnut, progress ring) |
| **Offline** | Cache-first Service Worker + PWA manifest |
| **CI/CD** | GitHub Actions → GitHub Pages |
| **Testing** | Custom headless Node.js test runner (no frameworks) |

---

## 📦 Deployment

The app auto-deploys to GitHub Pages on every push to `main`.

```
Push to main
    └── GitHub Actions (.github/workflows/deploy.yml)
            └── Upload static files → GitHub Pages
                    └── https://mausd34.github.io/Academic-Study-Helper/
```

To trigger a manual redeploy:

```bash
gh workflow run deploy.yml
```

---

## 💾 Data & Privacy

- All data is stored locally in your browser under the key `academic-study-helper-v4`
- **Export**: Settings → Export JSON (download a full backup)
- **Import**: Settings → Import JSON (restore on any browser)
- **No data ever leaves your device** — no servers, no accounts, no cloud

---

## 🔮 Roadmap

- [ ] FastAPI + PostgreSQL cloud sync (optional)
- [ ] Secure user authentication
- [ ] Real LLM study assistant via secure backend proxy
- [ ] AI-generated quiz & MCQ practice
- [ ] PDF note import & search
- [ ] Push notification integration
- [ ] Flutter Android client
- [ ] ML-based personalised study recommendations

---

## 👤 Author

**Masud Rana**  
CSE Student · IUBAT · Fall 2026  
GitHub: [@Mausd34](https://github.com/Mausd34)

---

<div align="center">

Made with ❤️ for academic excellence · **[Open the App →](https://mausd34.github.io/Academic-Study-Helper/)**

</div>
