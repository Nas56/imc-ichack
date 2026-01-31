# 📚 ReadRise — Product Requirements Document

**Hackathon Project | Room to Read Partnership**
**Version:** 1.0
**Date:** January 31, 2026
**Status:** Active Development

---

## 1. Project Overview

ReadRise is a gamified mobile reading companion app built in partnership with Room to Read. The app empowers younger users to develop their reading fluency through structured learning, real-time feedback, and achievement-driven challenges — all without feeling condescending or childish. The experience is warm, encouraging, and visually engaging.

### 1.1 Mission Statement

To make reading improvement feel like an adventure — not a chore. Users progress through books, receive intelligent feedback on their reading fluency, and unlock new challenges as their confidence and ability grow.

### 1.2 Target Audience

- Ages 8–14 (primary)
- Young adults who are building reading confidence (secondary)
- Users enrolled in or connected to Room to Read programmes

### 1.3 Design Philosophy

- **Gamified, not gimmicky** — progression, rewards, and unlocks feel earned and satisfying
- **Accessible** — clear typography, high contrast, screen-reader-friendly structure, simple navigation
- **Emoji-forward** — emojis are used as visual anchors, mood indicators, and reward markers rather than decoration
- **Colour palette** — warm, energetic, and youthful. Think soft purples, warm oranges, sky blues, and creamy whites. Avoid sterile or corporate tones.

---

## 2. Core User Flows

### 2.1 Happy Path (New User)

```
Sign Up / Log In → Onboarding Quiz → Home Dashboard → Browse Books → Select Book →
Choose Chapter → Learn Mode (read aloud → speech-to-text → analysis → TTS feedback) →
Complete Chapter → Score Updates → Unlock Progress → Challenge Mode (attempt) →
Earn Awards → Next Chapter / Next Book
```

### 2.2 Returning User

```
Log In → Home Dashboard (resume where left off) → Continue Book / Browse → ...
```

---

## 3. Feature Breakdown

### 3.1 Authentication & Onboarding

- Email/password sign-up and log-in (no social auth required for MVP)
- Onboarding flow: 3–4 screens that collect reading level preference, age range, and reading goals
- Onboarding data stored to backend; used to set initial book recommendations and starting difficulty
- A "skip onboarding" path exists but stores default values

### 3.2 Book Selection & Chapter Browsing

- Home screen displays a curated grid/list of books sourced from Room to Read's catalogue
- Each book card shows: title, cover image (placeholder or asset), difficulty tag, emoji genre icon, and estimated read time
- Tapping a book opens a chapter list with lock/unlock states based on user progress
- Chapters are short excerpts (not full copyrighted novels) — content is provided as structured JSON or markdown files stored in the backend

### 3.3 Reading & Speech-to-Text Analysis

- When a user enters a chapter in Learn Mode, the text excerpt is displayed
- User taps "Read Aloud" and speaks into their device microphone
- Speech-to-text captures the audio and produces a transcript
- A lightweight analysis layer compares the transcript against the expected text:
  - Word accuracy rate
  - Fluency indicators (hesitations, skipped words, mispronunciations approximated via edit distance)
  - Pacing estimation (words per minute)
- Analysis results are structured as a JSON payload and passed to the feedback engine

### 3.4 TTS Feedback (ElevenLabs)

- After analysis, the app calls the ElevenLabs API to generate a short spoken feedback message
- The feedback is warm, encouraging, and tailored to the result:
  - High accuracy → celebratory, motivational
  - Medium accuracy → encouraging, points to specific improvement areas
  - Low accuracy → gentle, supportive, suggests re-reading
- The TTS audio is played back to the user as part of a "feedback card" screen
- Fallback: if ElevenLabs is unavailable, display text-only feedback

### 3.5 Scoring & Progression System

- Each chapter completion awards a base score modified by accuracy and fluency
- Scores are cumulative and stored per-user in the backend
- Progression tiers unlock new difficulty levels:
  - 🌱 Seedling (default)
  - 🌿 Sprout
  - 🌳 Tree
  - 🌲 Grove
  - ⭐ Star Reader
- Tier progress is displayed on the home dashboard as a visual progress bar

### 3.6 Challenge Mode

- A separate tab/section from Learn Mode
- Users attempt to read a passage under timed or accuracy-based constraints
- Stricter scoring than Learn Mode — rewards are only granted above threshold scores
- Awards are emoji-based badges (e.g., 🏆 Speed Reader, 📖 Perfect Page, 🔥 Streak Master)
- Awards are stored per-user and displayed on a profile/awards screen
- Difficulty levels gate which challenges are available (tied to progression tier)

### 3.7 Backend & Data Layer

- User authentication (email/password, hashed, JWT-based sessions)
- User profile storage: name, age range, reading level, current book/chapter progress, score, tier, awards
- Book/chapter content storage: structured excerpts retrievable by book ID and chapter ID
- Score and award event logging
- API endpoints consumed by the mobile frontend

---

## 4. Technical Stack (Recommended)

| Layer | Technology |
|---|---|
| Frontend (Mobile) | React Native (Expo) |
| Backend / API | Node.js + Express (or FastAPI if Python preferred) |
| Database | PostgreSQL (or SQLite for local dev, migrate to hosted Postgres) |
| Speech-to-Text | Web Speech API (browser-native) or Whisper API |
| Text-to-Speech | ElevenLabs API |
| Hosting (if needed) | Vercel (backend) or Railway |
| Auth | Custom JWT — no third-party auth service required for MVP |

---

## 5. Team Breakdown & Task Ownership

This section defines the four workstreams. Each workstream is designed to be **independently developable** — interfaces between workstreams are defined by clear API contracts and shared data models so that work can be merged without conflicts.

---

### 🔵 Person 1 — Onboarding, UI Shell & Navigation

**Owns:** App shell, navigation structure, onboarding flow, global styling, and the home dashboard layout.

**Deliverables:**
- Expo project setup and base navigation structure (React Navigation with tab and stack navigators)
- Global theme file (colours, typography, spacing, emoji icon set)
- Onboarding screens (3–4 step flow with state management)
- Home dashboard screen layout (progress bar, resume card, quick-navigate to Learn / Challenge)
- Profile / Awards display screen
- All shared UI components (buttons, cards, progress bars, modals) exported to a shared `components/` folder

**Interface contract with others:**
- Exports a `ThemeProvider` and shared components
- Onboarding collects and passes user data as a structured object to Person 4's backend API
- Home dashboard consumes user state (score, tier, current book) — initially mocked, later wired to backend

---

### 🟢 Person 2 — Book Selection & Chapter Display

**Owns:** Book browsing, selection, chapter list, and in-reader text display.

**Deliverables:**
- Book selection screen (grid/list of books, filterable by difficulty)
- Book detail screen (chapter list with locked/unlocked states)
- Chapter reader screen (displays the text excerpt cleanly, with "Read Aloud" button ready to trigger Person 3's flow)
- Local mock data layer for books and chapters (JSON files) that mirrors the shape of Person 4's API responses
- Chapter completion state management (local first, syncs with backend later)

**Interface contract with others:**
- Uses shared UI components from Person 1
- Consumes book/chapter data — initially from local JSON, later from Person 4's API (`GET /api/books`, `GET /api/books/:id/chapters/:chapterId`)
- Passes the expected chapter text string and the "read aloud" trigger to Person 3's reading module
- On chapter completion, emits a completion event with chapter ID for score update

---

### 🟠 Person 3 — Reading Engine, Speech Analysis & TTS Feedback

**Owns:** Speech-to-text capture, reading analysis logic, ElevenLabs TTS integration, and the feedback screen.

**Deliverables:**
- Speech-to-text module: captures mic audio and returns a transcript string
- Analysis engine: takes expected text + transcript and returns a structured result object:
  ```
  {
    accuracyPercent: number,
    wordsPerMinute: number,
    skippedWords: string[],
    fluencyScore: number (0–100)
  }
  ```
- Feedback generation: maps analysis results to a feedback category (celebratory / encouraging / supportive)
- ElevenLabs integration: calls TTS API with the feedback message, returns audio URL
- Feedback screen UI: displays the analysis breakdown visually (accuracy ring, WPM stat, badges for skipped words) and plays back the TTS audio
- Fallback UI for when TTS is unavailable (text-only feedback card)

**Interface contract with others:**
- Receives the expected text string from Person 2's chapter reader
- Uses shared UI components from Person 1
- Returns a completion payload (fluency score, accuracy) to Person 2 for chapter completion logic
- Optionally posts the reading session result to Person 4's backend (`POST /api/sessions`)

---

### 🟣 Person 4 — Backend, Database & API

**Owns:** All server-side logic, database schema, authentication, and API endpoints.

**Deliverables:**
- Project setup: Node.js + Express (or equivalent), PostgreSQL database, `.env` configuration
- Database schema:
  - `users` — id, email, password_hash, name, age_range, reading_level, created_at
  - `books` — id, title, cover_url, difficulty, genre_emoji, description
  - `chapters` — id, book_id, chapter_number, title, text_content, estimated_minutes
  - `user_progress` — user_id, book_id, chapter_id, completed, score_earned, completed_at
  - `user_scores` — user_id, total_score, current_tier, awards (JSON array)
  - `reading_sessions` — id, user_id, chapter_id, accuracy, wpm, fluency_score, created_at
- Auth endpoints: `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- Book/chapter endpoints: `GET /api/books`, `GET /api/books/:id`, `GET /api/books/:id/chapters`, `GET /api/books/:id/chapters/:chapterId`
- Progress endpoints: `POST /api/progress/complete`, `GET /api/progress/:userId`
- Score endpoints: `GET /api/scores/:userId`, `POST /api/sessions`
- Seed data: populate books and chapters tables with at least 3 books × 3 chapters of sample content
- CORS configured for local mobile dev

**Interface contract with others:**
- Provides all API endpoints documented above
- Accepts and returns JSON payloads matching the shapes used by Persons 2 and 3
- Provides API documentation (even just a README with curl examples) so others can integrate

---

## 6. Shared Data Contracts

These shapes are agreed upon by all four workstreams. Do not deviate without team consensus.

### User Object (from auth/me)
```json
{
  "id": "uuid",
  "email": "string",
  "name": "string",
  "ageRange": "string",
  "readingLevel": "string",
  "totalScore": 0,
  "currentTier": "Seedling",
  "awards": ["badge_id_1", "badge_id_2"]
}
```

### Book Object
```json
{
  "id": "uuid",
  "title": "string",
  "coverUrl": "string",
  "difficulty": "easy | medium | hard",
  "genreEmoji": "📖",
  "description": "string"
}
```

### Chapter Object
```json
{
  "id": "uuid",
  "bookId": "uuid",
  "chapterNumber": 1,
  "title": "string",
  "textContent": "string",
  "estimatedMinutes": 3
}
```

### Reading Session Result (Person 3 → Person 4)
```json
{
  "userId": "uuid",
  "chapterId": "uuid",
  "accuracyPercent": 87,
  "wordsPerMinute": 120,
  "fluencyScore": 78,
  "skippedWords": ["the", "quickly"]
}
```

### Chapter Completion Event (Person 2 → Person 4)
```json
{
  "userId": "uuid",
  "chapterId": "uuid",
  "scoreEarned": 45,
  "completedAt": "2026-01-31T12:00:00Z"
}
```

---

## 7. Scoring Logic

| Factor | Weight | Notes |
|---|---|---|
| Word Accuracy | 50% | Percentage of words read correctly |
| Fluency Score | 30% | Composite of pacing, hesitations, and flow |
| Completion Bonus | 20% | Flat bonus for finishing the chapter |

**Base score per chapter:** 100 points max
**Tier thresholds:** Seedling (0–199), Sprout (200–499), Tree (500–999), Grove (1000–1999), Star Reader (2000+)

---

## 8. Gamification & Awards

| Badge | Emoji | Trigger |
|---|---|---|
| Perfect Page | 📖 | 100% accuracy on a chapter |
| Speed Reader | 🏆 | WPM above tier threshold |
| Streak Master | 🔥 | 3 consecutive chapters completed |
| First Step | 🌱 | Complete first chapter |
| Explorer | 🗺️ | Read from 3 different books |
| Challenge Conqueror | ⚔️ | Complete a Challenge Mode attempt |

---

## 9. Roadmap (Claude Code Task Order)

This is the order in which tasks should be sent to Claude Code, designed so that each person can work independently and merge cleanly.

### Phase 0 — Project Setup (all together, 15 min)
- [ ] Initialise Expo project with TypeScript
- [ ] Set up React Navigation (tabs + stacks)
- [ ] Create shared `theme.ts` and `components/` folder structure
- [ ] Set up backend project (Node + Express + Postgres)
- [ ] Agree on `.env` setup and local ports

### Phase 1 — Independent Build (parallel, no dependencies)
- [ ] **P1:** Onboarding screens + global theme + shared components
- [ ] **P2:** Book selection screen + chapter reader + local mock JSON data
- [ ] **P3:** Speech-to-text module + analysis engine (unit-testable, no UI yet)
- [ ] **P4:** Database schema + auth endpoints + seed data + book/chapter endpoints

### Phase 2 — Wire-Up (some coordination needed)
- [ ] **P2 + P4:** Replace mock JSON with live API calls for books/chapters
- [ ] **P3 + P2:** Wire speech module into chapter reader (read aloud → feedback flow)
- [ ] **P1 + P4:** Wire onboarding submission to backend register endpoint
- [ ] **P3 + P4:** Wire reading session submission to backend
- [ ] **P1 + P4:** Wire home dashboard to live user score/tier data

### Phase 3 — Challenge Mode & Polish
- [ ] **P2:** Build Challenge Mode screen (reuses chapter reader with stricter rules)
- [ ] **P3:** Add Challenge Mode scoring variant
- [ ] **P1:** Build Awards screen and badge display logic
- [ ] **P4:** Add progress and score endpoints, award logic server-side
- [ ] **All:** Integration testing, bug fixes, accessibility review

### Phase 4 — Demo Prep
- [ ] End-to-end walkthrough with fresh account
- [ ] Polish onboarding copy and feedback messages
- [ ] Ensure ElevenLabs fallback works
- [ ] Screenshot / screen-record for demo

---

## 10. Key Risks & Mitigations

| Risk | Mitigation |
|---|---|
| ElevenLabs API rate limits or cost | Use free tier carefully; cache TTS responses for repeated feedback messages |
| Speech-to-text accuracy on younger voices | Test early; consider Whisper API as fallback if Web Speech API is unreliable |
| Merge conflicts between frontend modules | Strict folder ownership; shared components live in one place owned by P1 |
| Time pressure | Phase 1 is fully parallel — get maximum hours of independent work done first |

---

## 11. File & Folder Structure (Recommended)

```
readrise/
├── frontend/                  ← Expo React Native app
│   ├── src/
│   │   ├── theme.ts                 ← P1
│   │   ├── components/              ← P1 (shared)
│   │   ├── screens/
│   │   │   ├── onboarding/         ← P1
│   │   │   ├── home/               ← P1
│   │   │   ├── books/              ← P2
│   │   │   ├── reader/             ← P2
│   │   │   ├── feedback/           ← P3
│   │   │   ├── challenge/          ← P2 + P3
│   │   │   └── awards/             ← P1
│   │   ├── modules/
│   │   │   ├── speechToText.ts     ← P3
│   │   │   ├── analysisEngine.ts   ← P3
│   │   │   └── elevenLabsClient.ts ← P3
│   │   ├── api/                    ← shared API client layer
│   │   │   └── client.ts
│   │   └── data/
│   │       └── mockBooks.json      ← P2 (local dev)
│   └── app.json / App.tsx
│
└── backend/                   ← Node.js + Express
    ├── src/
    │   ├── routes/
    │   │   ├── auth.ts            ← P4
    │   │   ├── books.ts           ← P4
    │   │   ├── progress.ts        ← P4
    │   │   └── scores.ts          P4
    │   ├── db/
    │   │   ├── schema.sql         ← P4
    │   │   └── seed.ts            ← P4
    │   ├── middleware/
    │   │   └── authMiddleware.ts  ← P4
    │   └── index.ts               ← P4
    ├── .env.example
    └── package.json
```

---

*This document is a living PRD. Update it as decisions change. Last updated: 2026-01-31.*