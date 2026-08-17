# PLAN.md — JobRadar
> Created: 2026-08-11 · Last updated: 2026-08-11
> Source: SYSTEM_SPEC + SPEC.md

---

## 1. Project structure

```
Job Hunt/
├── CLAUDE.md
├── package.json
├── tsconfig.json
├── .env.example
├── config/
│   ├── profile.json               # Owner profile for match scoring
│   └── master_resume.md           # Master ATS Markdown resume
├── resumes/                       # Output directory for generated Markdown resumes
├── src/                           # Backend Express API & Worker Engine
│   ├── index.ts                   # Entry point
│   ├── config/
│   │   ├── env.ts                 # Environment variable validation
│   │   └── database.ts            # Mongoose MongoDB connection
│   ├── models/
│   │   ├── RawQueue.ts            # Raw ingested messages & classification state
│   │   ├── Job.ts                 # Deduplicated & scored job postings
│   │   └── ProcessingError.ts     # Pipeline failure logs
│   ├── services/
│   │   ├── telegramService.ts     # Telegram bot listener & poller
│   │   ├── llmService.ts          # Anthropic API SDK wrapper
│   │   ├── classifierAgent.ts    # F-02 Classifier prompt handler
│   │   ├── extractorAgent.ts     # F-03 Extractor prompt handler
│   │   ├── dedupService.ts        # F-04 SHA256 dedup logic
│   │   ├── scorerAgent.ts         # F-05 Match/Score prompt handler
│   │   ├── referralAgent.ts       # F-06 Referral outreach drafter
│   │   ├── resumeTailorAgent.ts   # F-07 Resume tailor generator
│   │   └── pipelineProcessor.ts   # F-09 Main queue processing worker loop
│   └── routes/
│       ├── jobs.ts                # REST endpoints for jobs
│       ├── queue.ts               # REST endpoints for raw queue
│       └── stats.ts               # Stats overview endpoints
├── dashboard/                     # Next.js 14 Dashboard UI
│   ├── package.json
│   ├── tailwind.config.js
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx               # Main Job Table & Drawer View
│   │   ├── queue/page.tsx         # Pipeline Queue & Error Admin Page
│   │   └── api/                   # API integration handlers
│   └── components/
│       ├── JobTable.tsx           # Job cards data table
│       ├── JobDrawer.tsx          # Detail drawer panel
│       ├── ScoreBadge.tsx         # Color-coded fit score badge
│       ├── StatusBadge.tsx        # Application & approval status badge
│       └── StatsBar.tsx           # Header metrics bar
└── vibe/                          # Agent context & tracking files
    ├── SPEC.md
    ├── SPEC_INDEX.md
    ├── PLAN.md
    ├── TASKS.md
    ├── ARCHITECTURE.md
    ├── CODEBASE.md
    ├── DECISIONS.md
    └── reviews/
        └── backlog.md
```

---

## 2. Tech stack

| Layer | Choice | Why |
|-------|--------|-----|
| Backend | Node.js 20 + TypeScript | Strong typing, native async |
| API Server | Express.js | Standard HTTP server for REST routes |
| Frontend | Next.js 14 (App Router) | Server-rendered React dashboard |
| Database | MongoDB Atlas (Mongoose ODM) | Document schema for unstructured JDs |
| LLM | Anthropic API (`@anthropic-ai/sdk`) | Claude Haiku (Classifier/Extractor) & Claude Sonnet (Scorer/Referral/Resume) |
| Telegram | `node-telegram-bot-api` | Official Telegram bot integration |
| Scheduling | `node-cron` | Lightweight in-process scheduler |
| Styling | Tailwind CSS | Modern dark-mode styling |

---

## 3. Architecture overview

```
[Telegram Channel] ──▶ telegramService ──▶ RawQueue (Mongo)
                                               │
                                               ▼
                                      pipelineProcessor (Cron)
                                               │
                                    ┌──────────┴──────────┐
                                    ▼                     ▼
                             classifierAgent      (No) ──▶ Stop
                                    │ (Yes)
                                    ▼
                             extractorAgent ──▶ Structured JSON
                                    │
                                    ▼
                              dedupService ──▶ Hash Hit ──▶ Add source link
                                    │ (New)
                                    ▼
                               scorerAgent ──▶ Score & Gap Report
                                    │
                         ┌──────────┴──────────┐
                         ▼                     ▼
                  referralAgent       resumeTailorAgent
                  LinkedIn Draft       Markdown Resume
                         │                     │
                         └──────────┬──────────┘
                                    ▼
                              Job Document (approvalStatus: "pending")
                                    │
                                    ▼
                          Next.js Dashboard UI (Human Approval Gate)
```

---

## 4. Data model

### Shared data — used across multiple features:
| Data | Used by features | Notes |
|------|-----------------|-------|
| `RawQueue` | F-01, F-02, F-03, F-09 | Telegram ingestion populates, pipeline worker consumes |
| `Job` | F-04, F-05, F-06, F-07, F-08 | Dedup checks against, scorer/referral/resume enrich, dashboard reads & approves |
| `ProcessingError` | F-09, F-08 | Pipeline failures logged here, shown on dashboard queue page |

---

## 5. API contract

| Method | Path | Auth | Request | Response | Used by |
|--------|------|------|---------|----------|---------|
| GET | /api/jobs | No | query params | `Job[]` | Dashboard table |
| GET | /api/jobs/:id | No | - | `Job` | Job detail drawer |
| PATCH | /api/jobs/:id/approval | No | `{ status: "approved"|"rejected" }` | `Job` | Dashboard drawer buttons |
| PATCH | /api/jobs/:id/application | No | `{ status: string }` | `Job` | Application status dropdown |
| PATCH | /api/jobs/:id/referral/:idx | No | `{ draft: string, status: string }` | `Job` | Referral draft editor |
| GET | /api/stats | No | - | `{ total, pending, applied, avgScore }` | Dashboard metrics bar |
| GET | /api/queue/status | No | - | `{ unprocessed, errors, retrying }` | Queue admin view |
| POST | /api/queue/reprocess/:id | No | - | `{ success: boolean }` | Manual retry button |

---

## 6. Feature map — all phases planned

### Phase 1 — Foundation & Ingestion MVP
*Scaffolding, MongoDB models, Telegram Poller, Classifier, Extractor, Dedup, Express Worker, and Basic Dashboard Table.*

| Task | What it does | Size |
|------|-------------|------|
| Scaffold backend & dashboard | Folder layout, `package.json`, `tsconfig.json`, `.env.example` | M |
| DB Schemas & Config | `RawQueue`, `Job`, `ProcessingError` Mongoose schemas + `profile.json` & `master_resume.md` | M |
| Telegram Ingestion Service | `telegramService.ts` polling and writing raw messages to `RawQueue` | M |
| Classifier & Extractor Agents | `classifierAgent.ts` & `extractorAgent.ts` wrapping Anthropic SDK | L |
| Dedup & Pipeline Worker | `dedupService.ts` SHA256 hashing & `pipelineProcessor.ts` worker loop | L |
| Express API & Dashboard UI | REST endpoints + Next.js 14 table & detail drawer UI | L |
| Populate CODEBASE.md | Document initial codebase structure | S |

**Phase 1 exit gate:** `review: phase 1` — 0 P0 findings.

---

### Phase 2 — Scoring & Resume Tailor Agent
*Match scoring against profile and resume customization.*

| Task | What it does | Size |
|------|-------------|------|
| Scorer Agent | `scorerAgent.ts` comparing JD against profile and generating matchScore + gap analysis | M |
| Resume Tailor Agent | `resumeTailorAgent.ts` tailoring `master_resume.md` and saving markdown variant to `resumes/` | M |
| Dashboard Scoring Integration | Render fit score badges, gap chips, and markdown resume previewer | M |

---

### Phase 3 — Referral Agent & Polish
*Referral contact drafting, outreach templates, and administrative queue management.*

| Task | What it does | Size |
|------|-------------|------|
| Referral Agent | `referralAgent.ts` generating LinkedIn outreach drafts & email pattern guesses with `UNVERIFIED` tag | M |
| Referral UI Drawer | Interactive referral draft editor and copy-to-clipboard buttons in dashboard drawer | M |
| Queue Admin Page | `/queue` page displaying processing statistics, errors, and manual retry triggers | M |

---

## 7. Component map

| Component | Responsibility | Used by |
|-----------|---------------|---------|
| `telegramService` | Ingests Telegram messages to `RawQueue` | Ingestion pipeline |
| `classifierAgent` | Evaluates if text is a job posting | Worker pipeline |
| `extractorAgent` | Parses job text to structured JSON | Worker pipeline |
| `dedupService` | Calculates SHA256 hash and checks MongoDB for duplicate | Worker pipeline |
| `scorerAgent` | Computes 0-100 fit score and missing/matched keywords | Worker pipeline |
| `referralAgent` | Formats LinkedIn outreach message and email draft | Worker pipeline |
| `resumeTailorAgent` | Tailors master markdown resume to JD gaps | Worker pipeline |
| `JobTable` | Displays data table of jobs with filter/sort | Next.js Dashboard |
| `JobDrawer` | Side panel with detailed JD, scores, referral drafts, resume preview | Next.js Dashboard |

---

## 8. Known risks & mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Telegram bot rate limits | Missed messages | Ingestion buffers to `RawQueue` before any LLM processing |
| Claude API errors / rate limits | Failed extractions | Exponential backoff with up to 3 retries in `pipelineProcessor` |
| Ambiguous JDs causing low score accuracy | False positives/negatives | `confidence` metric stored separately from `matchScore`; low-confidence flagged for manual review |
