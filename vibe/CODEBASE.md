# CODEBASE.md — JobRadar Architecture & Map

> Last updated: 2026-08-17  
> Runtime: Windows Native Desktop (Electron 34) & Web Browser (Vite 6 + React 18)  
> Data Layer: In-App Reactive Store (`localStorage`) + AWS S3 Cloud Storage (`jobsprep`)

---

## 1. Directory Overview

| Directory / File | Description |
|---|---|
| `electron/main.js` | Electron main process: Window creation, context isolation, native PDF save dialog, external browser URL opening. |
| `electron/preload.js` | Context bridge exposing `window.electronAPI.savePdfFile` and `window.electronAPI.openExternal`. |
| `src/app-core/types.ts` | Complete TypeScript interfaces for `IJob`, `IProfile`, `IStats`, `IAtsAnalysis`, `IRubricScores`, `IReferralContact`, `IInterviewPrep`. |
| `src/app-core/store.ts` | Reactive in-memory and local persistent store with event subscriber pattern and automated S3 sync triggers. |
| `src/app-core/s3Client.ts` | AWS S3 client service (`@aws-sdk/client-s3`) handling `jobs.json`, `queue.json`, `profile.json`, and PDF resume uploads. |
| `src/app-core/bulkSplitter.ts` | Chat dump parser splitting single or multi-job WhatsApp/Telegram messages into distinct job postings. |
| `src/app-core/extractor.ts` | Regex and heuristic JD metadata extractor (Company, Title, Location, Salary, Skills, Links). |
| `src/app-core/scorer.ts` | 0–100% Fit Scorer and JobRadar 5-Tier Rubric rating calculator (1.0 to 5.0). |
| `src/app-core/atsMatcher.ts` | Resume-Matcher ATS compliance analyzer (Keyword Density %, Format %, Bullet Impact %). |
| `src/app-core/resumeGenerator.ts` | Client-side ATS PDF resume generator (`jsPDF`) matching FAANG / Jake's resume Overleaf format. |
| `src/app-core/referralGenerator.ts` | 6-persona referral outreach generator with live LinkedIn Search queries and customized drafts. |
| `src/app-core/interviewPrep.ts` | Behavioral and technical interview question generator tailored to candidate background. |
| `src/app-core/latexParser.ts` | Live `.tex` LaTeX resume parser for 1-click candidate detail extraction. |
| `src/app-core/envParser.ts` | Live `.env` parser for instant credential auto-filling. |
| `src/ui/App.tsx` | Main application shell with tab routing, global search, filtering, and modal managers. |
| `src/ui/components/` | Modular React components: Navbar, KanbanBoard, JobTable, JobDrawer, IngestModal, QueueHealth, AnalyticsView, SettingsView, OnboardingWizard. |
| `scripts/verifyAppCore.ts` | Automated end-to-end test verifying multi-job splitting, extraction, scoring, and resume generation. |
| `scripts/verifyS3Sync.ts` | Direct S3 connectivity and bucket upload verification. |
| `scripts/syncAllToS3Now.ts` | Utility to upload all current jobs, profile, and ATS resumes to S3. |
| `scripts/testParsers.ts` | Test suite for LaTeX and `.env` parser utilities. |
