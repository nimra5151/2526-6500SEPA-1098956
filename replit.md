# TutorBridge

## Overview

TutorBridge is a comprehensive online learning and mentorship platform designed for orphanage students aged 10–18. It facilitates a multi-role ecosystem involving students, tutors, and coordinators to bridge educational gaps through live classes, recorded lessons, AI-assisted study tools, and administrative oversight.

## Tech Stack

- **Frontend:** React 18, Vite, Tailwind CSS, Shadcn UI, Wouter (routing), TanStack Query, i18next
- **Backend:** Node.js with Express, Passport.js, WebSockets (ws)
- **Database:** PostgreSQL with Drizzle ORM
- **Package Manager:** npm

## Project Structure

- `client/` — React frontend source
- `server/` — Express backend source
  - `routes.ts` — Main API router (4000+ lines)
  - `storage.ts` — Data access layer
  - `rag/` — AI/RAG logic (OpenAI + Pinecone)
  - `seed.ts` — Database seeder
- `shared/` — Shared types and Drizzle schema
- `script/build.ts` — Production build script

## Environment Variables

### Required
- `DATABASE_URL` — PostgreSQL connection string (set as Replit secret)
- `SESSION_SECRET` — JWT/session signing secret (set as Replit secret)

### Optional
- `OPENAI_API_KEY` — Enables AI Study Buddy features
- `PINECONE_API_KEY`, `PINECONE_INDEX` — Enables RAG vector search
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` — Email notifications
- `ZOOM_ACCOUNT_ID`, `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET` — Zoom live classes
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — Google OAuth sign-in
- `APP_URL` — Base URL for email links

## Development

```bash
npm run dev        # Start development server (port 5000)
npm run db:push    # Push schema changes to database
npm run build      # Build for production
npm start          # Run production build
```

## User Roles

- **Students:** Browse/enroll in classes, take quizzes, submit assignments, use AI Study Buddy
- **Tutors:** Create and manage classes, lessons, quizzes, grade submissions, host live sessions
- **Coordinators (Admins):** Oversight of users, safeguarding reports, system notifications

## Key Notes

- Server listens on `0.0.0.0:5000` (required for Replit preview)
- Vite serves in middleware mode through Express in development
- OpenAI client initialization is conditional (only when API key is present)
- Database is seeded automatically on first run
- `/dashboard` route auto-redirects each role to their specific dashboard (student → /student-dashboard, tutor → /teacher-dashboard, coordinator → /admin)
- Google OAuth button on login page is hidden unless `GOOGLE_CLIENT_ID` is configured (checked via `/api/public/stats` `googleOAuthEnabled` flag)

## Schema Changes (recent)

- `userSettings` table: added `weeklyGoal` (int, default 2) and `recentlyViewedClasses` (jsonb, default `[]`)
- `lessons` table: added `videoUrl` (text) — individual lesson videos; video player shows per-lesson video when available
- `GET /api/classes/:id/enrollment` — returns `{isEnrolled, isTeacher}` for a given class

## Features

- **Recently Viewed Classes**: tracked in both localStorage and API (`recentlyViewedClasses` setting). Section always visible on student dashboard (shows empty state when no history).
- **Weekly Goal**: student can set weekly session goal; persisted to `userSettings.weeklyGoal` via API.
- **Per-Lesson Videos**: lessons can have individual `videoUrl`; shown as embedded video when lesson is expanded in the video player page.
