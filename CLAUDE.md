# CLAUDE.md — JobRadar Windows Desktop App (.exe)

## Overview
JobRadar is a **100% Standalone Windows Desktop GUI Application (`.exe`)** (built with Electron + React 18 + Vite + TypeScript + Tailwind CSS) designed for zero-CLI, fully visual career operations. It ingests WhatsApp/Telegram group chat dumps, runs automated headless scraping across major ATS portals (Greenhouse, Ashby, Lever, Workable), parses & extracts structured job details, computes multi-criteria fit scores (0-100) & JobRadar 5-tier rubric ratings, analyzes ATS compliance, drafts 10-contact employee referral outreach with LinkedIn links, generates AI interview prep Q&A, and compiles pixel-perfect ATS-optimized PDF resumes on the client with zero external backend, server, or terminal dependencies.

## Tech Stack
- **Framework:** Electron + React 18 + Vite + TypeScript (Windows Native `.exe`)
- **Styling:** Tailwind CSS + Lucide React Icons
- **ATS Connectors:** Greenhouse API, Ashby API, Lever API, Workable API, Playwright Headless Scraping
- **PDF Resume Engine:** jsPDF (Client-Side compilation, instant preview & native Windows disk export)
- **Local Persistence:** Reactive Local Storage & In-Memory Store with JSON/YAML Watchlist Backup/Restore
- **Architecture:** 100% Standalone Client / Zero Backend Server / Zero CLI Required

## Key Commands
- **Launch Windows Desktop App (Dev):** `npm run app:dev`
- **Build Standalone Windows Installer & Portable .exe:** `npm run app:dist`
- **Build Web Bundle:** `npm run build`
- **Typecheck Codebase:** `npm run typecheck`
- **Run Full System Tests:** `npm test`

## Features
- **Automated ATS Headless & API Connectors:** Direct zero-token integrations for Greenhouse (`boards-api.greenhouse.io`), Ashby, Lever, Workable, and Playwright DOM scraper.
- **Target Company Watchlist & Scheduled Auto-Polling:** 20+ pre-seeded tech unicorn portals with background interval polling (1h, 6h, 12h, 24h), auto-approval fit thresholds, and CareerOps-compatible JSON import/export.
- **AI Bulk Ingestion Engine:** Instant heuristic & regex extraction from multi-job WhatsApp and Telegram group chat dumps.
- **Job Feed & 5-Stage Kanban Board:** Drag-and-drop between Pending Gate, Approved, Applied, Interviewing, and Not Selected.
- **5-Tab Job Drawer:**
  1. *Job Overview:* Match fit (0-100%), JobRadar rubric (1.0-5.0), ATS keyword analysis, matched/missing keywords, apply links.
  2. *ATS Resume (PDF):* In-app PDF preview and direct 1-click download (`Narayana_Thota_[Role]_[Company].pdf`).
  3. *Referrals:* 10 company employee contacts with corporate email guessing, LinkedIn search links, and 1-click email draft copying.
  4. *AI Interview Prep:* Evaluation overview, technical topics, 5+ questions with suggested candidate answers tailored to Narayana Thota.
  5. *Cover Letter:* Tailored cover letter with 1-click copy.
- **Salary Negotiation & Career Intelligence:** CTC gap analysis, counter-offer email scripts, remote pushback, and competing offer leverage points.
- **Pipeline & Queue Health:** In-app queue monitor, log inspector, and 1-click reprocessing.
- **Analytics & Funnel Metrics:** Visual conversion funnel, score distributions, and in-demand skills radar.
- **Candidate Profile & AI Settings:** In-app editor for candidate credentials, master resume, optional cloud keys, and JSON backup/restore.
