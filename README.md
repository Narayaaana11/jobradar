# JobRadar — Autonomous Career Agent & Job Hunt Platform

> **A 100% Standalone Windows Desktop GUI Application (`.exe`)** engineered with zero external server dependencies and **zero command-line usage required**. Operates entirely within a high-performance visual interface: Automated ATS Headless Scraping (*Greenhouse, Ashby, Lever, Workable*), WhatsApp & Telegram Multi-Job Chat Dumps Ingestion, instant client-side ATS Resume PDF compilation, multi-criteria fit scoring, 10-contact referral drafting, and direct AWS S3 Cloud Storage synchronization.

![Windows Native](https://img.shields.io/badge/Platform-Windows%20Native%20%7C%20Executable-0078D4?style=for-the-badge&logo=windows&logoColor=white)
![React 18](https://img.shields.io/badge/Frontend-React%2018%20%2B%20TypeScript%20%2B%20Tailwind-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Electron](https://img.shields.io/badge/Desktop-Electron%2034%20GUI-47848F?style=for-the-badge&logo=electron&logoColor=white)
![Zero CLI](https://img.shields.io/badge/Zero%20CLI-100%25%20GUI%20Driven-success?style=for-the-badge)
![AWS S3](https://img.shields.io/badge/Cloud%20Storage-AWS%20S3%20Direct-FF9900?style=for-the-badge&logo=amazons3&logoColor=white)

---

## 🌟 100% GUI-Driven Features (Zero CLI Needed)

Everything is interactive and accessible directly inside the standalone Windows Desktop `.exe`:

- 🖥️ **100% Visual GUI Application (`.exe`):** No terminal commands, command prompt, or background servers needed. Just double-click the `.exe` and manage your entire job hunt.
- 🌐 **1-Click ATS Career Portals Scanner:** Discover open requisitions across **Greenhouse**, **Ashby**, **Lever**, and **Workable** with direct visual scan buttons, ATS filter tabs, and real-time progress bars.
- ⏱️ **Visual Background Polling Scheduler:** Toggle automated background scanning directly with a UI switch and interval dropdowns (**1h, 6h, 12h, 24h**) with auto-approval threshold sliders.
- ⚡ **WhatsApp & Telegram Chat Ingest Modal:** Paste messy multi-job group chat dumps into the visual ingest modal to instantly extract and score all listings in parallel.
- 🎯 **A–F Letter Grades & 1.0–5.0 Numerical Rubric:** Visually inspect 4-dimensional score cards (*Tech Stack, Seniority, Domain Synergy, Comp & Location*) with dealbreaker warnings.
- 📄 **1-Click ATS Resume PDF & LaTeX Export:** Compiles pixel-perfect, single-column ATS resumes customized to each company with 1-click preview and instant disk download in `<100ms`.
- 🤝 **Referral Outreach Suite:** Copy pre-written employee referral emails and open 1-click tailored LinkedIn search URLs for Recruiters, Engineering Managers, and Alumni.
- 🤖 **Tailored AI Interview Prep & Salary Negotiation:** Interactive QA coach, STAR answers, CTC negotiation scripts, and remote pushback scripts.
- 📊 **5-Stage Drag-and-Drop Kanban Board:** Visually manage your pipeline (*Pending Gate* ➔ *Approved* ➔ *Applied* ➔ *Interviewing* ➔ *Offer*).
- ☁️ **AWS S3 Cloud Sync:** Seamless background synchronization of all job postings, queue items, and compiled ATS PDF resumes to your Amazon S3 bucket.

---

## 📦 Running & Building the Windows Executable (`.exe`)

### Quick Start (Development)
```bash
npm install
npm run app:dev
```

### Building the Standalone `.exe`
```bash
npm run app:dist
```

The compiled binaries will be output to the `release/` directory:
- `release/JobRadar Setup 1.0.0.exe` — Windows Setup Installer (Desktop shortcut & Start Menu entry)
- `release/JobRadar 1.0.0.exe` — Portable standalone executable (no installation required, double-click to run anywhere)

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
