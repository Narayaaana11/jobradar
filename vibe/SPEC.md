# SPEC.md — JobRadar
> Created: 2026-08-11 · Owner: Narayana Thota / IndentDev
> Status: PROVISIONAL — verify before first review: run

---

## 1. Overview

JobRadar is an autonomous job-hunting agent that monitors Telegram channels for job postings, classifies and extracts structured data from raw messages, scores fit against your profile, surfaces referral contact drafts and ATS-tailored resume variants, and presents everything in a human-approval dashboard before any action is taken. It eliminates the daily manual scanning of job channels while ensuring nothing auto-sends under your name without your explicit sign-off.

**Owner profile (baked into scoring):** MERN stack, TallyPrime integrations, LLM/agent-orchestration work, MCA 2026 fresher, Hyderabad-based, open to remote.

---

## 2. Target Users

Single-user system (Narayana Thota). The "user" is the human who reviews and approves/rejects job cards via the dashboard. No multi-tenancy needed for v1.

---

## 3. Core Features

### F-01 · Telegram Ingestion
Polls one or more Telegram channels/bots via `node-telegram-bot-api` (for channels where bot is an admin) or Telethon Python script (for read-only channel access). All raw messages are written to `raw_queue` collection before any processing begins — this gives replay-ability if downstream prompt/parser logic changes.

**Acceptance criteria:**
- Bot polls at configurable intervals (default: 5 min)
- Every received message is written to `raw_queue` with `processed: false` before any LLM call
- Messages older than 30 days are automatically purged from `raw_queue`
- Deduplication within ingestion: same `rawMessageId` from same platform is not re-inserted
- Supports multiple Telegram sources (channels, groups, bots) via config array

### F-02 · Classifier Agent
Calls Claude API with a narrow classification prompt on each unprocessed `raw_queue` entry.

**Acceptance criteria:**
- Input: `rawText` from `raw_queue` entry
- Output: `{ is_job_post: bool, confidence: float 0-1, reason: string }`
- Result stored back on the `raw_queue` document (`classifierResult` field, `processed: true`)
- Confidence < 0.6 + is_job_post = true → flagged for manual review, not auto-extracted
- Confidence ≥ 0.6 + is_job_post = true → queued for Extractor Agent
- is_job_post = false → `processed: true`, pipeline stops for this message
- Model: Claude Haiku (cheapest — this runs on every message)

### F-03 · Extractor Agent
Calls Claude API with an extraction prompt on confirmed job posts.

**Acceptance criteria:**
- Input: `rawText` from classified `raw_queue` entry
- Output: structured JSON matching job schema
- Missing fields → null, never fabricated
- Model: Claude Haiku or Sonnet (configurable)

### F-04 · Dedup Check
Prevents the same job from appearing multiple times when multiple channels repost the same listing.

**Acceptance criteria:**
- Hash = `sha256(normalize(companyName) + normalize(jobTitle) + normalize(location))`
- Hash checked against `jobs` collection (last 30 days only)
- Hit → new source appended to `jobs.sources[]`; no new document created
- Miss → new `jobs` document created with `approvalStatus: "pending"`

### F-05 · Match/Score Agent
Compares extracted JD against owner profile and produces a fit score with gap analysis.

**Acceptance criteria:**
- Input: extracted JD JSON + owner profile from `config/profile.json`
- Output: `{ matchScore: 0-100, confidence: 0-1, gapAnalysis: { missingKeywords: [], strongMatches: [] } }`
- Score ≥ 60 → auto-queued for referral + resume tailor stage
- Score 40–59 → queued, flagged "borderline"
- Score < 40 → marked "low_match"
- Model: Claude Sonnet

### F-06 · Referral Agent
Drafts LinkedIn outreach and email templates; guesses likely email patterns.

**Acceptance criteria:**
- Output: guessed email (ALWAYS marked unverified), LinkedIn search URL, outreach draft
- `verified: false` always — UI must display "UNVERIFIED" badge
- `outreachStatus: "draft"` always on creation
- Model: Claude Sonnet

### F-07 · Resume Tailor Agent
Produces an ATS-optimized resume variant from the master resume + gap analysis.

**Acceptance criteria:**
- Input: `config/master_resume.md` + gap report from F-05
- Output: tailored resume saved to `resumes/[date]-[company]-[title].md`
- `resumeNotes` one-line summary of what was reordered/emphasized
- Model: Claude Sonnet

### F-08 · Human Approval Gate (Dashboard)
The single human-facing interface. Nothing advances without explicit approval here.

**Acceptance criteria:**
- Table of all jobs: Title, Company, Location, Score, Status, Actions
- Job card detail drawer: full JD, match score + gap analysis, referral draft(s), resume variant preview
- Actions: Approve / Edit / Reject referral draft; Mark Applied / Not Applying
- Filter/sort: status, score, date discovered, company; keyword search
- Built with Next.js 14 (App Router) + MongoDB driver

### F-09 · Background Worker / Cron
Orchestrates the pipeline as a standalone Node.js process.

**Acceptance criteria:**
- Configurable cron (default: 5 min Telegram)
- Processes: raw_queue entries → Classifier → Extractor → Dedup → Score → Referral → Resume Tailor
- Errors logged to `processing_errors` collection
- Retry up to 3 times before permanent-failure mark

---

## 4. Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Backend | Node.js 20 + TypeScript | Existing pattern |
| API server | Express.js | Lightweight worker + API |
| Frontend | Next.js 14 (App Router) | React + SSR dashboard |
| Database | MongoDB Atlas (Mongoose ODM) | Schema flexibility |
| LLM | Anthropic API (@anthropic-ai/sdk) | Narrow per-stage prompts |
| Telegram | node-telegram-bot-api | Official API |
| Scheduling | node-cron | Simple in-process scheduler |
| Styling | Tailwind CSS | Fast styling |
