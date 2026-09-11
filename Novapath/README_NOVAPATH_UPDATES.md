# NovaPath — AI Personalized Training Platform

This build extends the project you uploaded so it covers the feature list
from your spec PDF as completely as possible **without adding external
infrastructure** (no Postgres server, no Celery/Redis, no SMTP) — everything
runs with just `npm install && npm run dev` on both folders, using the
Gemini API key you already have.

## What was already working (unchanged)

- AI Roadmap generation (text goal or uploaded image) — `/api/generate-roadmap`, `/api/analyze-roadmap-image`
- AI Skill Assessment — `/api/skill-assessment`
- AI Personalized day-by-day learning plan — `/api/generate-learning-plan`
- AI Topic quizzes + Daily quizzes with evaluation — `/api/topic-quiz(/evaluate)`, `/api/daily-quiz(/evaluate)`
- Roadmap dashboard, roadmap details, personalized learning UI

## What I fixed

- `backend/tsconfig.json` was an **empty file**, which silently breaks
  `npm run build`. Replaced with a working config.
- `backend/.env` had a live Gemini API key committed in the zip you shared.
  **Rotate this key** in Google AI Studio before sharing this project again
  (e.g. submitting it, pushing to GitHub) — treat any key that has left your
  machine as compromised.
- Login/Signup previously just showed an `alert()` and redirected — there
  was no real account system. Replaced with real backend authentication.

## What I added (mapped to your PDF's feature list)

| PDF feature | Implementation |
|---|---|
| **1. User Management** | Real signup/login backend (`/api/auth/*`) with bcrypt password hashing + JWT sessions. First account to sign up becomes an admin automatically. |
| **6. AI Skill Assessment** | Already existed — untouched. |
| **9. AI Mentor / Chatbot** | New `Mentor` page + `/api/mentor-chat` — ask doubts, get explanations, in the context of a chosen roadmap. |
| **10. Smart Revision** | New `Revision` page. Any topic quiz scored below 70% enters a spaced-repetition queue (1 → 2 → 4 → 8 → 16 day intervals), shown as "Due now" / "Scheduled". |
| **11. Progress & Analytics** | New `Analytics` page — quiz score trend, roadmap completion, weakest topics, and badges, charted with Recharts. |
| **12. AI Career Guidance** | New `CareerGuidance` page + `/api/career-guidance` — skill-gap summary, priority skills, project ideas, certifications, interview-prep topics, next steps. |
| **13. Gamification** | XP, levels, streaks, and 7 badges — computed live from your existing quiz/roadmap data (`lib/gamification.ts`), shown in the navbar and Analytics page. |
| **14. Notifications** | In-app notification bell (navbar) surfacing due revisions, streak status, and roadmap milestones — computed client-side since there's no mail server. |
| **15. Admin Panel** | New `Admin` page (admin-only route) + `/api/admin/users`, `/api/admin/stats` — lists registered users and AI-feature usage counts. |

## Architecture decisions (and how to go further)

Your spec lists PostgreSQL, Supabase Auth, and Celery+Redis. Those are real
infrastructure services, not just code — pulling them in would mean the
project no longer runs standalone, and would need accounts/servers you'd
have to provision yourself. Instead:

- **Users** are stored in `backend/data/users.json` (created automatically
  on first run) instead of Postgres. It's a real, working account system —
  just file-based instead of a database server. Swapping this for Postgres
  later is a matter of replacing `backend/store.ts` with Prisma/Drizzle
  queries; nothing else needs to change since routes only call the exported
  functions.
- **Roadmaps, progress, and quiz history** are still stored in the
  browser's `localStorage`, as they were before — this keeps every
  already-working page untouched and low-risk. It means data is per-browser,
  not per-account, across multiple devices. For a real multi-device
  deployment, this is the next thing to move server-side.
- **Notifications** are computed in-app rather than pushed by
  email/SMS/Celery — same information, no mail server required.
- **Deployment** (Vercel/Render/Supabase) is an infra choice for when you're
  ready to host this publicly — the code itself doesn't need to change to
  deploy it there.

## Running it

```bash
# Backend
cd backend
npm install
npm run dev        # http://localhost:5000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev         # http://localhost:5173
```

Make sure `backend/.env` has your `GEMINI_API_KEY` and a `JWT_SECRET`
(a random one has already been generated for you — feel free to regenerate
it if you rotate the Gemini key too).

The **first account you sign up with becomes an admin** and can see
`/admin`. Every account after that is a regular student account.

## Known limitations to mention if asked in a viva/demo

- Multi-device sync isn't implemented (roadmaps/progress are per-browser).
- Notifications are in-app only, not emailed.
- Admin panel shows accounts + AI usage counts, not per-user roadmap data
  (since roadmaps aren't stored server-side yet).
- The mentor chat and career guidance calls need outbound internet access
  to `generativelanguage.googleapis.com`, same as your existing AI
  features.
