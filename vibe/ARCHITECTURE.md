# ARCHITECTURE.md — JobRadar
> Auto-generated from PLAN.md

---

## 1. O'Reilly Architectural Principles

- **Separation of Concerns:** Ingestion, Classification/Extraction, Scoring/Outreach, and Presentation are decoupled.
- **Fail-Safe Processing:** The `raw_queue` acts as a staging queue; failure in LLM calls does not drop incoming messages.
- **Human-in-the-Loop:** All LLM outputs (referral drafts, resume variants) remain in `draft` status until explicitly approved by the human operator via the Dashboard UI.
- **Strict Data Contracts:** Typed Mongoose schemas ensure clean document boundaries.

---

## 2. Directory Layout & Architecture

```
Job Hunt/
├── CLAUDE.md
├── package.json
├── tsconfig.json
├── config/
│   ├── profile.json
│   └── master_resume.md
├── src/
│   ├── index.ts
│   ├── config/
│   ├── models/
│   ├── services/
│   └── routes/
├── dashboard/
│   ├── package.json
│   └── app/
└── vibe/
```

---

## 3. Data Flow

1. Telegram Poller -> `RawQueue` (Mongo)
2. `pipelineProcessor` -> `classifierAgent` -> `extractorAgent` -> `dedupService`
3. `dedupService` (If unique) -> `scorerAgent` -> `referralAgent` -> `resumeTailorAgent` -> `Job` (Mongo)
4. `Job` -> Express API / Next.js API -> Next.js Dashboard UI (Human Approval Gate)
