# SPEC_INDEX — JobRadar
> Compressed map of SPEC.md. Read each session.
> Last synced: 2026-08-11

## Overview — Autonomous job hunt agent monitoring Telegram, extracting JDs, scoring fit, drafting referral outreach & ATS resumes, with human approval gate → SPEC.md#1-overview
## Features — F-01 Ingestion (Telegram bot polling) · F-02 Classifier (Claude Haiku job post check) · F-03 Extractor (structured JD JSON) · F-04 Dedup (sha256 hash match) · F-05 Match/Score (profile fit & gap report) · F-06 Referral (LinkedIn outreach & unverified email guess) · F-07 Resume Tailor (ATS markdown variant) · F-08 Approval Gate (Next.js dashboard drawer) · F-09 Worker (background cron pipeline) → SPEC.md#3-core-features
## UI — 2 views: Main Dashboard (table + drawer), Queue Admin → SPEC.md#ui-specification
## Boundaries — Out of scope: WhatsApp automation, auto-sending outreach, career page scrapers in v1, multi-user → SPEC.md#4-out-of-scope-v1
## Technical — Stack: Node.js 20, TypeScript, Express, Next.js 14, MongoDB Mongoose, Anthropic Claude API, Tailwind CSS → SPEC.md#5-tech-stack
## Done condition — Conformance: 13 items → SPEC.md#9-conformance-checklist
## Backlog — Career scrapers, weekly digest, link decay check → vibe/backlog/
