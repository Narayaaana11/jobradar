# CODEBASE.md — JobRadar Architecture Snapshot

> Last updated: 2026-08-11 · GitHub Reference Features Integrated

---

## Directory Structure & Component Responsibility

```
c:\Projects\Job Hunt\
├── CLAUDE.md                   # Project rules and per-task guidelines
├── package.json                # Root Node.js dependencies (Express, Mongoose, Anthropic SDK, Telegram)
├── tsconfig.json               # Backend TypeScript configuration
├── .env.example                # Sample environment configuration
├── config/
│   ├── profile.json            # Owner developer profile (MERN, Tally, LLM, MCA 2026)
│   └── master_resume.md        # Master Markdown resume template
├── resumes/                    # ATS tailored Markdown resumes
├── cover_letters/              # Tailored Markdown cover letters
├── src/                        # Backend Express Server & Pipeline Worker
│   ├── index.ts                # Entry point, Express listener, Telegram init & Cron worker schedule
│   ├── config/
│   │   ├── env.ts              # Validated environment variables
│   │   └── database.ts         # Mongoose MongoDB Atlas connection
│   ├── models/
│   │   ├── RawQueue.ts         # Raw message queue schema with 30-day TTL index
│   │   ├── Job.ts              # Extracted, deduplicated, scored & tailored jobs schema
│   │   └── ProcessingError.ts  # Pipeline error tracking schema
│   ├── services/
│   │   ├── telegramService.ts  # Telegram bot poller & message ingestion listener
│   │   ├── webScraperService.ts# Manual Web URL / text scraper service
│   │   ├── llmService.ts       # Shared Anthropic SDK client wrapper
│   │   ├── classifierAgent.ts # F-02 LLM Agent (Claude Haiku job post detector)
│   │   ├── extractorAgent.ts  # F-03 LLM Agent (Claude Haiku/Sonnet structured JSON parser)
│   │   ├── dedupService.ts     # F-04 SHA-256 deduplication hashing & lookup logic
│   │   ├── scorerAgent.ts      # Multi-criteria fit scorer (Tech, Exp, Location rubric)
│   │   ├── resumeTailorAgent.ts# ATS Markdown resume tailor generator
│   │   ├── coverLetterAgent.ts # Personalized Markdown cover letter generator
│   │   ├── referralAgent.ts    # Referral outreach drafter & LinkedIn URL generator
│   │   └── pipelineProcessor.ts# F-09 Queue item processing engine & retry logic
│   └── routes/
│       ├── jobs.ts             # REST API for listing jobs, approval status, & application state
│       ├── queue.ts            # REST API for queue metrics, manual URL ingest, & reprocess triggers
│       └── stats.ts            # REST API for dashboard metric aggregations
├── dashboard/                  # Next.js 14 Dashboard UI
│   ├── app/
│   │   ├── layout.tsx          # Root layout with top navigation header
│   │   ├── page.tsx            # Main Job Feed with Table / Kanban toggle & Web Ingest modal
│   │   └── queue/page.tsx      # Queue health & error administration page
│   └── components/
│       ├── StatsBar.tsx        # Dashboard summary metric cards
│       ├── ScoreBadge.tsx      # Color-coded match score pill
│       ├── StatusBadge.tsx     # Approval & application status pills
│       ├── JobTable.tsx        # Data table view for reviewing postings
│       ├── KanbanBoard.tsx     # Interactive 5-column Kanban board view
│       └── JobDrawer.tsx       # Detail drawer with Rubric breakdown, Cover Letter, Referral & ATS Resume
└── vibe/                       # System specs, task lists & decisions
```
