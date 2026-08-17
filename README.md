# JobRadar — Autonomous Career Agent & Job Hunt Platform

> **A standalone Windows Desktop Application and Autonomous Career Agent Platform** engineered with zero external server dependencies, instant client-side ATS Resume generation, multi-criteria fit scoring, 10-contact referral drafting, and direct AWS S3 Cloud Storage synchronization.

![Windows Native](https://img.shields.io/badge/Platform-Windows%20Native%20%7C%20Web-0078D4?style=for-the-badge&logo=windows&logoColor=white)
![React 18](https://img.shields.io/badge/Frontend-React%2018%20%2B%20TypeScript%20%2B%20Tailwind-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Electron](https://img.shields.io/badge/Desktop-Electron%2034-47848F?style=for-the-badge&logo=electron&logoColor=white)
![AWS S3](https://img.shields.io/badge/Cloud%20Storage-AWS%20S3%20Direct-FF9900?style=for-the-badge&logo=amazons3&logoColor=white)
![ATS Resume](https://img.shields.io/badge/ATS%20Engine-FAANG%20%2F%20LaTeX%20Standard-success?style=for-the-badge)

---

## 🌟 Key Features

- 🖥️ **Zero-Backend Architecture:** Standalone Electron + React 18 + Vite + TypeScript desktop app. No separate backend port or database server required to run.
- ⚡ **WhatsApp / Telegram Multi-Job Splitter & Extractor:** Intelligent heuristic engine that splits high-volume group chat dumps into clean individual job listings with company, title, location, salary, and requirements.
- 🎯 **Multi-Criteria Fit Scorer & 5-Tier Rubric:** Calculates real-time 0–100% candidate suitability scores and Career-Ops rubric ratings (1.0 to 5.0).
- 📄 **100% ATS-Compliant PDF Resume Compiler (`jsPDF`):** Compiles single-page, ATS-optimized resumes based on your master LaTeX template (`config/master_resume.tex`) with target keywords tailored to each company in `<100ms`.
- 🤝 **10-Contact Referral Outreach Generator:** Automatically identifies potential employee referrers (Engineering Managers, Recruiters, Alumni) with corporate email guessing algorithms and 1-click outreach templates.
- 🤖 **Tailored AI Interview Prep Engine:** Generates role-specific behavioral and technical Q&A tailored to your actual background and projects.
- 📊 **5-Stage Kanban Pipeline:** Interactive drag-and-drop workflow (*Pending Gate* ➔ *Approved* ➔ *Applied* ➔ *Interviewing* ➔ *Offer / Rejected*).
- ☁️ **AWS S3 Direct Cloud Sync:** Seamless background synchronization of all job postings, queue items, and compiled ATS PDF resumes to your Amazon S3 bucket.
- 👥 **Multi-User Portable Setup Wizard:** Anyone can install the app on their computer, paste their `.env` file, and paste their raw LaTeX resume code with 1-click auto-extraction.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation
```bash
# 1. Clone the repository
git clone https://github.com/Narayaaana11/jobradar.git
cd jobradar

# 2. Install dependencies
npm install

# 3. Start the Windows Desktop App in Development Mode
npm run app:dev
```

*(Alternatively, run in the browser at `http://localhost:5173` via `npm run dev`)*

---

## 📦 Building Standalone Windows Executables

To package the project into a standalone Windows installer (`.exe`):

```bash
npm run app:dist
```

The compiled binaries will be output to the `release/` directory:
- `release/JobRadar Setup 1.0.0.exe` — Windows Setup Installer (Desktop shortcut & Start Menu entry)
- `release/JobRadar 1.0.0.exe` — Portable standalone executable (no installation required)

---

## ☁️ AWS S3 Cloud Architecture

JobRadar syncs your data to AWS S3 under the following layout:

```
s3://your-bucket/
├── data/
│   ├── jobs.json              # Full active jobs database
│   ├── queue.json             # Ingestion queue logs
│   ├── profile.json           # Candidate credentials & target skills
│   ├── master_resume.md       # Master Markdown resume source
│   └── backup_latest.json     # Instant snapshot recovery archive
└── resumes/
    └── Narayana_Thota_*.pdf   # Individual ATS tailored PDF resumes
```

---

## 👥 Multi-User Onboarding & Setup

When a new user launches the app for the first time, the **Setup Wizard** appears:
1. **AWS S3 & .env Setup:** Quick-paste your `.env` contents to auto-populate AWS keys and S3 bucket.
2. **LaTeX Resume (.tex):** Paste your raw Overleaf/LaTeX resume code and click **"⚡ Auto-Extract Details"** to pull name, contact info, and skills.
3. **Candidate Profile:** Verify legal name, title, and contact links (used in referral drafts).
4. **Target Skills:** Review target skills used for match scoring and ATS density analysis.

---

## 🛠️ Tech Stack

- **Desktop Framework:** Electron 34
- **Frontend:** React 18, TypeScript, Tailwind CSS, Lucide Icons
- **Bundler:** Vite 6
- **PDF Generation:** jsPDF
- **Cloud Integration:** AWS SDK for JavaScript v3 (`@aws-sdk/client-s3`)
- **Distribution:** electron-builder (NSIS & Portable targets)

---

## 👤 Author

**Veera Venkata Naga Satyanarayana Thota (Narayana Thota)**
- **Portfolio:** [narayanathota.me](https://www.narayanathota.me)
- **LinkedIn:** [linkedin.com/in/narayaaana](https://www.linkedin.com/in/narayaaana/)
- **GitHub:** [github.com/Narayaaana11](https://github.com/Narayaaana11)

---

## 📄 License
MIT License. Built for autonomous career acceleration.
