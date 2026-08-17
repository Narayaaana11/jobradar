# CLAUDE.md — JobRadar Windows Desktop App

## Overview
JobRadar is a standalone Windows Desktop Application (built with Electron + React 18 + Vite + TypeScript + Tailwind CSS) that acts as an autonomous career agent. It ingests WhatsApp/Telegram job postings and URLs, parses & extracts structured job details, computes multi-criteria fit scores (0-100) & career-ops 5-tier rubric ratings, analyzes ATS compliance, drafts 10-contact employee referral outreach with LinkedIn links, generates AI interview prep Q&A, and compiles pixel-perfect ATS-optimized PDF resumes on the client with zero external backend or server dependencies.

## Tech Stack
- **Framework:** Electron + React 18 + Vite + TypeScript
- **Styling:** Tailwind CSS + Lucide React Icons
- **PDF Resume Engine:** jsPDF (Client-Side compilation, instant preview & native Windows disk export)
- **Local Persistence:** Reactive Local Storage & In-Memory Store with JSON Backup/Restore
- **Architecture:** 100% Standalone Client / Zero Backend Server

## Key Commands
- **Launch Windows Desktop App (Dev):** `npm run app:dev`
- **Build Web Bundle:** `npm run build`
- **Package Standalone Windows Installer (.exe):** `npm run app:dist`
- **Run Pure Web Browser Mode:** `npm run dev`
- **Verify Core Pipeline:** `npx tsx scripts/verifyAppCore.ts`

## Features
- **Job Feed & 5-Stage Kanban Board:** Drag-and-drop between Pending Gate, Approved, Applied, Interviewing, and Not Selected.
- **AI Bulk Ingestion Engine:** Instant heuristic & regex extraction from multi-job WhatsApp and Telegram chat dumps.
- **5-Tab Job Drawer:**
  1. *Job Overview:* Match fit (0-100%), career-ops rubric (1.0-5.0), ATS keyword analysis, matched/missing keywords, apply links.
  2. *ATS Resume (PDF):* In-app PDF preview and direct 1-click download (`Narayana_Thota_[Role]_[Company].pdf`).
  3. *Referrals:* 10 company employee contacts with corporate email guessing, LinkedIn search links, and 1-click email draft copying.
  4. *AI Interview Prep:* Evaluation overview, technical topics, 5+ questions with suggested candidate answers tailored to Narayana Thota.
  5. *Cover Letter:* Tailored cover letter with 1-click copy.
- **Pipeline & Queue Health:** In-app queue monitor, log inspector, and 1-click reprocessing.
- **Analytics & Funnel Metrics:** Visual conversion funnel, score distributions, and in-demand skills radar.
- **Candidate Profile & AI Settings:** In-app editor for candidate credentials, master resume, optional cloud keys, and JSON backup/restore.
