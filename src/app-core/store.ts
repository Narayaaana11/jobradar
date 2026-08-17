import { IJob, IRawQueueItem, IProfile, IStats } from './types';
import { s3Cloud } from './s3Client';

const JOBS_KEY = 'jobradar_jobs_v1';
const QUEUE_KEY = 'jobradar_queue_v1';
const PROFILE_KEY = 'jobradar_profile_v1';
const RESUME_KEY = 'jobradar_master_resume_v1';

export const defaultProfile: IProfile = {
  name: 'Veera Venkata Naga Satyanarayana Thota',
  title: 'Full Stack Developer | React.js, Node.js, Express, MongoDB',
  email: 'narayananaiduthota@gmail.com',
  phone: '+91 6301253789',
  location: 'Bhimavaram, Andhra Pradesh (Open to Remote / Relocation)',
  linkedin: 'https://www.linkedin.com/in/narayaaana/',
  github: 'https://github.com/Narayaaana11',
  portfolio: 'https://www.narayanathota.me',
  education: 'Master of Computer Applications (MCA) — 2024–2026, Aditya University (CGPA: 7.70/10)',
  primarySkills: [
    'Python',
    'SQL',
    'JavaScript (ES6+)',
    'HTML5',
    'CSS3',
    'React.js',
    'Tailwind CSS',
    'Node.js',
    'Express.js',
    'MongoDB',
    'REST APIs',
    'JWT Auth',
    'AWS (S3)',
    'Git',
    'GitHub',
    'Data Structures & Algorithms',
    'OOP',
  ],
  specializations: [
    'Full Stack MERN Architecture',
    'RESTful Web Services & API Design',
    'Responsive Frontend UI Engineering',
    'Database Modeling & Real-Time Dashboards',
  ],
  experience: 'Full Stack Development Intern @ Technical Hub Pvt. Ltd. (June 2025 – July 2025)',
  projects: [
    {
      title: 'Aditya University Visitor Management System (AUSVMS)',
      tech: 'MERN Stack, Socket.io, Nodemailer',
      description: 'Visitor tracking platform with role-based access control (RBAC) across 4 account types (Admin, Staff, Security Guard, Visitor).',
      highlights: [
        'Designed MongoDB aggregation pipelines powering a real-time dashboard, cutting lookup time from minutes to seconds.',
        'Implemented OTP-based check-in workflows with real-time updates and email alerts via Socket.io and Nodemailer.',
      ],
    },
    {
      title: 'Guard Hub — Security Roster Management System',
      tech: 'MERN Stack, Tailwind CSS',
      description: 'Roster system to digitize shift allocation for 100+ campus security personnel, replacing manual spreadsheet tracking.',
      highlights: [
        'Built scheduling engine with shift constraint validation, automatically detecting time collisions across 4 rotating shift patterns.',
        'Integrated attendance logging and approval modules to maintain schedule consistency.',
      ],
    },
    {
      title: 'Matrix Library Management System',
      tech: 'MERN Stack, Python, NLP',
      description: 'Library management platform with real-time inventory and NLP search assistant.',
      highlights: [
        'Designed React dashboards to display real-time book availability and inventory status.',
        'Integrated an NLP chatbot in Python to process natural language queries for book titles and locations.',
      ],
    },
  ],
};

export const defaultMasterResume = `# Veera Venkata Naga Satyanarayana Thota
Bhimavaram, Andhra Pradesh | +91 6301253789 | narayananaiduthota@gmail.com
[Portfolio](https://www.narayanathota.me) | [LinkedIn](https://www.linkedin.com/in/narayaaana/) | [GitHub](https://github.com/Narayaaana11)

---

## SUMMARY
Full Stack Developer with hands-on experience building responsive front-end interfaces (React.js, Tailwind CSS) and RESTful back-end services (Node.js, Express.js, MongoDB). Skilled in end-to-end ownership -- from API design to deployment -- with strong problem-solving skills and computer science fundamentals in Data Structures & Algorithms and OOP.

---

## TECHNICAL SKILLS
- **Languages:** Python, SQL, JavaScript (ES6+), HTML5, CSS3
- **Frontend Development:** React.js, Tailwind CSS
- **Backend & Database:** Node.js, Express.js, MongoDB, REST APIs, JWT Auth
- **Cloud & DevOps:** AWS (S3), Git, GitHub
- **Tools & Platforms:** VS Code, Postman, Vercel, Render
- **Core Concepts:** Data Structures & Algorithms (DSA), OOP

---

## EXPERIENCE
**Full Stack Development Intern** | Technical Hub Pvt. Ltd.
*June 2025 – July 2025*
- Built responsive user interfaces using React.js and Tailwind CSS, standardizing component layouts across mobile and desktop devices.
- Designed and developed RESTful API endpoints using Node.js and Express to handle user authentication and state synchronization.
- Tested API routes and UI workflows using Postman, resolving over 15 dynamic integration issues prior to deployment.

---

## PROJECTS

### Aditya University Visitor Management System (AUSVMS) (2025)
*MERN Stack | GitHub: https://github.com/Narayaaana11*
- Developed a visitor tracking platform with role-based access control (RBAC) across 4 account types.
- Designed MongoDB aggregation pipelines powering a real-time dashboard, cutting manual visitor lookup time.
- Implemented OTP-based visitor check-in workflows with real-time updates and email alerts via Socket.io and Nodemailer.

### Guard Hub — Security Roster Management System (2025)
*MERN Stack, Tailwind CSS | GitHub: https://github.com/Narayaaana11/Guards-Hub*
- Engineered a roster system to digitize shift allocation for 100+ personnel, cutting weekly scheduling time by 5+ hours.
- Built a scheduling engine with shift constraint validation, automatically detecting time collisions across 4 rotating shift patterns.

### Matrix Library Management System (2025)
*MERN Stack, Python, NLP | GitHub: https://github.com/Narayaaana11/Matrix-Library-Management-System*
- Designed React dashboards to display real-time book availability and inventory status.
- Integrated an NLP-based chatbot in Python to process natural language queries for books and shelf locations.

---

## EDUCATION
- **Aditya University** | Master of Computer Applications (MCA) — Computer Science (Aug 2024 – May 2026, CGPA: 7.70 / 10)
- **Aditya Degree College** | Bachelor of Computer Applications (BCA) — Computer Science (Aug 2021 – May 2024, CGPA: 7.24 / 10)

---

## CERTIFICATIONS
- **Full Stack Developer Certification** — Technical Hub Pvt. Ltd. (Jun 2025)
- **Project Space Hackathon Participant** — Technical Hub Pvt. Ltd. (Jun 2025)
`;

// Pre-seeded initial rich job data
const initialSeedJobs: IJob[] = [
  {
    id: 'job-seed-01',
    companyName: 'Google',
    jobTitle: 'Software Development Engineer (Silicon & Cloud Tools)',
    location: 'Hyderabad, Telangana (Hybrid)',
    isRemote: false,
    ctcMentioned: true,
    ctcRange: '₹18,00,000 - ₹28,00,000 LPA',
    applicationLink: 'https://careers.google.com/jobs/results/1482910',
    skillsRequired: ['TypeScript', 'JavaScript', 'React', 'Node.js', 'Data Structures', 'REST APIs', 'Cloud Architecture'],
    experienceRequired: 'Fresher / 0-2 Years (MCA/B.Tech 2025/2026 Batch Eligible)',
    rawDescription: `Google Hyderabad is hiring Software Development Engineers for our Cloud & Internal Tools Engineering Team.
Key Responsibilities:
- Design, develop, test, and deploy robust full-stack web applications and developer tools.
- Collaborate with distributed engineering teams on scalable APIs and frontend architectures.
- Optimize frontend rendering pipelines and backend microservices for latency and throughput.
Qualifications:
- Bachelor's or Master's degree in Computer Science, MCA, or related technical field (2025/2026 grads eligible).
- Strong proficiency in modern JavaScript/TypeScript, React or Angular, and Node.js or Python.
- Solid grounding in algorithms, system design, and database modeling.`,
    sources: [{ platform: 'whatsapp', channelName: 'WhatsApp Hyderabad Tech Jobs', messageId: 'wa-g-01', scrapedAt: new Date().toISOString() }],
    dedupHash: 'google-sde-hyd-01',
    matchScore: 94,
    matchConfidence: 0.96,
    gapAnalysis: {
      strongMatches: ['TypeScript', 'JavaScript', 'React', 'Node.js', 'REST APIs', 'MCA 2026 Eligible', 'Hyderabad Location'],
      missingKeywords: ['Cloud Architecture', 'Distributed Systems'],
    },
    fitBreakdown: {
      techFitScore: 95,
      experienceFitScore: 98,
      locationFitScore: 100,
    },
    rubricScores: {
      overallRubricRating: 4.8,
      skillsScore: 4.9,
      techStackScore: 4.8,
      experienceScore: 4.7,
      cultureFitScore: 4.8,
      rubricTier: 'Tier 1 - Strong Fit',
    },
    atsAnalysis: {
      keywordDensityScore: 92,
      atsFormatScore: 98,
      bulletImpactScore: 90,
      foundKeywords: ['TypeScript', 'React', 'Node.js', 'REST APIs', 'Data Structures', 'JavaScript'],
      missingKeywords: ['Cloud Architecture'],
      atsChecklist: {
        cleanHeaders: true,
        standardFonts: true,
        noTablesOrColumns: true,
        quantifiableMetrics: true,
        contactInfoComplete: true,
        singlePageLayout: true,
      },
    },
    scoreFlag: 'auto',
    skillMatched: true,
    stage: 'approved',
    approvalStatus: 'approved',
    applicationStatus: 'not_applied',
    referralContacts: [
      {
        personaTitle: 'Peer Developer / Senior SDE',
        targetRole: 'Staff Software Engineer @ Google',
        department: 'Google Cloud Hyderabad',
        linkedinSearchUrl: 'https://www.linkedin.com/search/results/people/?keywords=Staff+Software+Engineer+Google+Hyderabad',
        searchQuery: 'Staff Software Engineer Google Hyderabad',
        subject: 'Referral Request: Software Development Engineer (Hyderabad) - Narayana Thota',
        outreachDraft: `Hi [Name],

Hope you are having a productive week!

I noticed an opening for the Software Development Engineer role at Google Hyderabad. As an MCA 2026 candidate with hands-on expertise building scalable React/TypeScript systems and Node.js microservices (including autonomous AI pipelines and ERP integrations), I believe my technical background is a strong fit for the team.

Would you be open to reviewing my resume and referring my profile for this position? I have attached my ATS-optimized resume for your convenience.

Thank you for your time and guidance!

Best regards,
Veera Venkata Naga Satyanarayana Thota
+91 6301253789 | narayananaiduthota@gmail.com
LinkedIn: https://www.linkedin.com/in/narayaaana/`,
      },
      {
        personaTitle: 'Tech Recruiter & Sourcer',
        targetRole: 'Technical Recruiter @ Google',
        department: 'Google Talent Acquisition APAC',
        linkedinSearchUrl: 'https://www.linkedin.com/search/results/people/?keywords=Technical+Recruiter+Google+Hyderabad',
        searchQuery: 'Technical Recruiter Google Hyderabad',
        subject: 'Application Follow-Up: Software Development Engineer - Narayana Thota',
        outreachDraft: `Dear [Name],

I am writing to express my strong enthusiasm for the Software Development Engineer opening at Google Hyderabad.

With my deep foundation in TypeScript, React 18, Next.js, and Node.js backend engineering alongside projects in autonomous agent orchestration, I am eager to contribute to Google's world-class engineering teams.

Please let me know if you would like me to share any additional project portfolios or code repositories.

Sincerely,
Veera Venkata Naga Satyanarayana Thota
narayananaiduthota@gmail.com | +91 6301253789`,
      },
    ],
    interviewPrep: {
      roleOverview: 'Interviews at Google for SDE roles evaluate data structures, algorithms, frontend performance optimization, REST/GraphQL design, and clean code architecture.',
      technicalTopics: ['React Rendering Cycles', 'TypeScript Generics & Types', 'Event Loop & Async I/O', 'REST API Idempotency', 'Binary Trees & Dynamic Programming'],
      questions: [
        {
          category: 'Technical',
          question: 'How does React 18 Concurrent Mode work, and how do useTransition and useDeferredValue prevent UI jank during heavy computations?',
          suggestedAnswer: 'React 18 Concurrent Rendering allows React to pause, resume, or abort state updates. useTransition marks state updates as non-urgent transitions, letting urgent inputs (like typing) render immediately. useDeferredValue defers re-rendering non-critical subtrees until urgent updates finish.',
          keyConcepts: ['Concurrent Mode', 'useTransition', 'useDeferredValue', 'Fiber Architecture'],
        },
        {
          category: 'System Design',
          question: 'How would you architect a high-throughput job ingestion and deduplication pipeline handling 100,000 requests per minute?',
          suggestedAnswer: 'I would use a distributed message queue (Kafka / BullMQ) to decouple ingestion from processing, apply SHA-256 content hashing with a fast Redis bloom filter for O(1) deduplication, and worker pools for parallel extraction.',
          keyConcepts: ['Message Queues', 'Bloom Filters', 'SHA-256 Hashing', 'Worker Pools'],
        },
      ],
    },
    coverLetterText: `Dear Google Hiring Team,

I am writing to express my enthusiastic interest in the Software Development Engineer role at Google Hyderabad. As a Full Stack Engineer and MCA 2026 candidate with comprehensive experience building high-performance TypeScript, React, and Node.js applications, I am eager to bring my problem-solving abilities to Google's engineering organization.

Throughout my projects—including architecting JobRadar (an autonomous career agent parsing multi-source listings and compiling ATS resumes on the client) and the TallyPrime Cloud Sync Engine (a real-time data sync pipeline handling 50,000+ records)—I have consistently focused on building scalable, reliable, and user-centric software.

I would welcome the opportunity to discuss how my full-stack engineering skills can add immediate value to Google.

Sincerely,
Veera Venkata Naga Satyanarayana Thota`,
    resumeNotes: 'Tailored master resume for Google SDE role: emphasized TypeScript, React, Node.js, algorithmic efficiency, and scalable system architecture.',
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'job-seed-02',
    companyName: 'Microsoft',
    jobTitle: 'Software Engineer - Web & Cloud Experience',
    location: 'Hyderabad / Bengaluru (Hybrid / Remote)',
    isRemote: true,
    ctcMentioned: true,
    ctcRange: '₹16,00,000 - ₹24,00,000 LPA',
    applicationLink: 'https://careers.microsoft.com/us/en/job/1749281',
    skillsRequired: ['TypeScript', 'React', 'Node.js', 'Azure / Cloud', 'REST APIs', 'Unit Testing (Jest/Playwright)'],
    experienceRequired: '0-2 Years Experience / Fresher (2025/2026)',
    rawDescription: `Microsoft IDC is looking for Software Engineers to join the Web & Cloud Experience team.
Responsibilities:
- Build next-generation web applications using modern TypeScript and React.
- Implement highly resilient RESTful services and real-time data pipelines.
- Ensure strict accessibility (WCAG), internationalization, and high test coverage.`,
    sources: [{ platform: 'telegram', channelName: 'Telegram Top Tech Opportunities', messageId: 'tg-ms-02', scrapedAt: new Date().toISOString() }],
    dedupHash: 'microsoft-swe-hyd-02',
    matchScore: 91,
    matchConfidence: 0.94,
    gapAnalysis: {
      strongMatches: ['TypeScript', 'React', 'Node.js', 'REST APIs', 'Unit Testing', 'Remote Friendly'],
      missingKeywords: ['Azure / Cloud'],
    },
    fitBreakdown: {
      techFitScore: 92,
      experienceFitScore: 95,
      locationFitScore: 100,
    },
    rubricScores: {
      overallRubricRating: 4.7,
      skillsScore: 4.8,
      techStackScore: 4.7,
      experienceScore: 4.6,
      cultureFitScore: 4.7,
      rubricTier: 'Tier 1 - Strong Fit',
    },
    atsAnalysis: {
      keywordDensityScore: 89,
      atsFormatScore: 97,
      bulletImpactScore: 88,
      foundKeywords: ['TypeScript', 'React', 'Node.js', 'REST APIs', 'Testing'],
      missingKeywords: ['Azure'],
      atsChecklist: {
        cleanHeaders: true,
        standardFonts: true,
        noTablesOrColumns: true,
        quantifiableMetrics: true,
        contactInfoComplete: true,
        singlePageLayout: true,
      },
    },
    scoreFlag: 'auto',
    skillMatched: true,
    stage: 'pending_approval',
    approvalStatus: 'pending',
    applicationStatus: 'not_applied',
    referralContacts: [
      {
        personaTitle: 'Peer Developer / Senior SDE',
        targetRole: 'Senior Software Engineer @ Microsoft',
        department: 'Microsoft IDC Hyderabad',
        linkedinSearchUrl: 'https://www.linkedin.com/search/results/people/?keywords=Senior+Software+Engineer+Microsoft+Hyderabad',
        searchQuery: 'Senior Software Engineer Microsoft Hyderabad',
        subject: 'Referral Request: Software Engineer - Narayana Thota',
        outreachDraft: `Hi [Name],\n\nI am writing to inquire if you would be open to referring me for the Software Engineer opening in the Web & Cloud Experience team at Microsoft IDC. I specialize in modern TypeScript, React, and Node.js full-stack development.\n\nThank you for considering my request!\n\nBest,\nVeera Venkata Naga Satyanarayana Thota\nnarayananaiduthota@gmail.com | +91 6301253789`,
      },
    ],
    interviewPrep: {
      roleOverview: 'Microsoft interviews focus heavily on OOP/Functional TypeScript design, asynchronous JavaScript execution models, state management patterns, and system resilience.',
      technicalTopics: ['TypeScript Advanced Typing', 'React State Optimization', 'REST vs GraphQL', 'Async Error Handling'],
      questions: [
        {
          category: 'Technical',
          question: 'How do you handle race conditions and request cancellation in React data fetching with AbortController?',
          suggestedAnswer: 'By passing an AbortSignal from an AbortController instance to the fetch request inside a useEffect cleanup function, any in-flight request is aborted when the component unmounts or query parameters change, preventing outdated state updates.',
          keyConcepts: ['AbortController', 'AbortSignal', 'Race Conditions', 'useEffect Cleanup'],
        },
      ],
    },
    coverLetterText: `Dear Microsoft Hiring Team,\n\nI am writing to express my strong enthusiasm for the Software Engineer role at Microsoft IDC Hyderabad...`,
    resumeNotes: 'Tailored master resume for Microsoft SWE position: highlighted TypeScript, React, modular backend services, and clean unit testing.',
    createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 3).toISOString(),
  },
  {
    id: 'job-seed-03',
    companyName: 'NTT DATA',
    jobTitle: 'Associate Software Developer (Full Stack MERN)',
    location: 'Hyderabad, Telangana',
    isRemote: false,
    ctcMentioned: true,
    ctcRange: '₹6,50,000 - ₹9,00,000 LPA',
    applicationLink: 'https://careers.services.global.ntt/global/en/job/NTTDATA-DEV-2026',
    skillsRequired: ['React', 'Node.js', 'Express', 'MongoDB', 'JavaScript', 'HTML5/CSS3', 'Git'],
    experienceRequired: 'Fresher (MCA / B.Tech 2025/2026)',
    rawDescription: `NTT DATA is recruiting Associate Software Developers for our Global Digital Engineering division in Hyderabad.
Requirements:
- Strong knowledge of MERN stack (MongoDB, Express, React, Node.js).
- Familiarity with Git version control and RESTful web service development.
- MCA or B.Tech graduates (2025/2026 batches).`,
    sources: [{ platform: 'whatsapp', channelName: 'WhatsApp Freshers Job Alerts', messageId: 'wa-ntt-03', scrapedAt: new Date().toISOString() }],
    dedupHash: 'nttdata-assoc-dev-hyd-03',
    matchScore: 98,
    matchConfidence: 0.99,
    gapAnalysis: {
      strongMatches: ['React', 'Node.js', 'Express', 'MongoDB', 'JavaScript', 'HTML5/CSS3', 'Git', 'MCA 2026 Batch', 'Hyderabad'],
      missingKeywords: [],
    },
    fitBreakdown: {
      techFitScore: 100,
      experienceFitScore: 100,
      locationFitScore: 100,
    },
    rubricScores: {
      overallRubricRating: 5.0,
      skillsScore: 5.0,
      techStackScore: 5.0,
      experienceScore: 5.0,
      cultureFitScore: 5.0,
      rubricTier: 'Tier 1 - Strong Fit',
    },
    atsAnalysis: {
      keywordDensityScore: 96,
      atsFormatScore: 100,
      bulletImpactScore: 94,
      foundKeywords: ['React', 'Node.js', 'Express', 'MongoDB', 'JavaScript', 'Git', 'HTML5', 'CSS3'],
      missingKeywords: [],
      atsChecklist: {
        cleanHeaders: true,
        standardFonts: true,
        noTablesOrColumns: true,
        quantifiableMetrics: true,
        contactInfoComplete: true,
        singlePageLayout: true,
      },
    },
    scoreFlag: 'auto',
    skillMatched: true,
    stage: 'applied',
    approvalStatus: 'approved',
    applicationStatus: 'applied',
    referralContacts: [],
    interviewPrep: {
      roleOverview: 'NTT DATA technical rounds evaluate core JavaScript fundamentals, MERN stack full-lifecycle development, MongoDB aggregation pipelines, and REST API security.',
      technicalTopics: ['JavaScript Closures & Event Loop', 'MERN Architecture', 'MongoDB Indexing', 'Express Middleware'],
      questions: [
        {
          category: 'Technical',
          question: 'Explain how Express middleware functions work and how error-handling middleware is structured.',
          suggestedAnswer: 'Middleware functions have access to req, res, and next. They execute sequentially in the request-response lifecycle. Error-handling middleware has four arguments (err, req, res, next) and intercepts unhandled exceptions when next(err) is invoked.',
          keyConcepts: ['Express Middleware', 'next()', 'Error-handling Middleware'],
        },
      ],
    },
    coverLetterText: `Dear NTT DATA Hiring Team,\n\nI am thrilled to apply for the Associate Software Developer (MERN Stack) role in Hyderabad...`,
    resumeNotes: 'Tailored for NTT DATA: highlighted 100% exact MERN stack match, MCA 2026 credentials, and immediate Hyderabad availability.',
    createdAt: new Date(Date.now() - 3600000 * 20).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
];

// In-Memory & LocalStorage Reactive Store
class AppStore {
  private jobs: IJob[] = [];
  private queue: IRawQueueItem[] = [];
  private profile: IProfile = defaultProfile;
  private masterResume: string = defaultMasterResume;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      if (typeof window !== 'undefined') {
        const storedJobs = localStorage.getItem(JOBS_KEY);
        const storedQueue = localStorage.getItem(QUEUE_KEY);
        const storedProfile = localStorage.getItem(PROFILE_KEY);
        const storedResume = localStorage.getItem(RESUME_KEY);

        this.jobs = storedJobs ? JSON.parse(storedJobs) : initialSeedJobs;
        this.queue = storedQueue ? JSON.parse(storedQueue) : [];
        this.profile = storedProfile ? JSON.parse(storedProfile) : defaultProfile;
        this.masterResume = storedResume || defaultMasterResume;

        if (!storedJobs) this.saveJobs();
        if (!storedProfile) this.saveProfile(defaultProfile);
        if (!storedResume) this.saveMasterResume(defaultMasterResume);
      } else {
        this.jobs = initialSeedJobs;
      }
    } catch (err) {
      console.error('Error loading store from localStorage:', err);
      this.jobs = initialSeedJobs;
    }
  }

  private syncWithS3Debounced() {
    if (typeof window !== 'undefined') {
      try {
        if (s3Cloud.getConfig().autoSync) {
          s3Cloud.syncAllToS3(this.jobs, this.queue, this.profile, this.masterResume).catch((err) => {
            console.warn('[Store] S3 background auto-sync warning:', err);
          });
        }
      } catch (e) {}
    }
  }

  private saveJobs() {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(JOBS_KEY, JSON.stringify(this.jobs));
      }
      this.notify();
      this.syncWithS3Debounced();
    } catch (err) {
      console.error('Error saving jobs to localStorage:', err);
    }
  }

  private saveQueue() {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue));
      }
      this.notify();
      this.syncWithS3Debounced();
    } catch (err) {
      console.error('Error saving queue to localStorage:', err);
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((listener) => listener());
  }

  // --- Job Operations ---
  public getJobs(): IJob[] {
    return [...this.jobs];
  }

  public getJobById(id: string): IJob | undefined {
    return this.jobs.find((j) => j.id === id);
  }

  public addOrUpdateJob(job: IJob): void {
    const existingIdx = this.jobs.findIndex((j) => j.id === job.id || j.dedupHash === job.dedupHash);
    if (existingIdx >= 0) {
      this.jobs[existingIdx] = { ...this.jobs[existingIdx], ...job, updatedAt: new Date().toISOString() };
    } else {
      this.jobs.unshift({ ...job, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    this.saveJobs();
  }

  public addJobs(newJobs: IJob[]): void {
    newJobs.forEach((job) => {
      const existingIdx = this.jobs.findIndex((j) => j.id === job.id || j.dedupHash === job.dedupHash);
      if (existingIdx >= 0) {
        this.jobs[existingIdx] = { ...this.jobs[existingIdx], ...job, updatedAt: new Date().toISOString() };
      } else {
        this.jobs.unshift(job);
      }
    });
    this.saveJobs();
  }

  public deleteJob(id: string): void {
    this.jobs = this.jobs.filter((j) => j.id !== id);
    this.saveJobs();
  }

  public updateJob(id: string, updates: Partial<IJob>): IJob | undefined {
    const job = this.jobs.find((j) => j.id === id);
    if (job) {
      Object.assign(job, updates);
      job.updatedAt = new Date().toISOString();
      this.saveJobs();
      return job;
    }
    return undefined;
  }

  public updateApproval(jobId: string, status: 'pending' | 'approved' | 'rejected'): IJob | undefined {
    const job = this.jobs.find((j) => j.id === jobId);
    if (job) {
      job.approvalStatus = status;
      if (status === 'approved' && job.stage === 'pending_approval') {
        job.stage = 'approved';
      } else if (status === 'rejected') {
        job.stage = 'rejected';
      }
      job.updatedAt = new Date().toISOString();
      this.saveJobs();
      return job;
    }
    return undefined;
  }

  public updateApplication(jobId: string, status: 'not_applied' | 'applied' | 'interview' | 'offer' | 'rejected'): IJob | undefined {
    const job = this.jobs.find((j) => j.id === jobId);
    if (job) {
      job.applicationStatus = status;
      if (status === 'applied') {
        job.stage = 'applied';
        job.appliedAt = new Date().toISOString();
      } else if (status === 'interview') {
        job.stage = 'interview';
      } else if (status === 'offer') {
        job.stage = 'offer';
      } else if (status === 'rejected') {
        job.stage = 'rejected';
      }
      job.updatedAt = new Date().toISOString();
      this.saveJobs();
      return job;
    }
    return undefined;
  }

  // --- Queue Operations ---
  public getQueueItems(): IRawQueueItem[] {
    return [...this.queue];
  }

  public addQueueItem(item: Omit<IRawQueueItem, 'id' | 'createdAt'>): IRawQueueItem {
    const newItem: IRawQueueItem = {
      ...item,
      id: `q-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    this.queue.unshift(newItem);
    this.saveQueue();
    return newItem;
  }

  public updateQueueItem(id: string, updates: Partial<IRawQueueItem>): void {
    const item = this.queue.find((q) => q.id === id);
    if (item) {
      Object.assign(item, updates);
      this.saveQueue();
    }
  }

  // --- Profile & Resume ---
  public getProfile(): IProfile {
    return { ...this.profile };
  }

  public saveProfile(newProfile: IProfile): void {
    this.profile = newProfile;
    if (typeof window !== 'undefined') {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(newProfile));
    }
    this.notify();
    this.syncWithS3Debounced();
  }

  public getMasterResume(): string {
    return this.masterResume;
  }

  public saveMasterResume(content: string): void {
    this.masterResume = content;
    if (typeof window !== 'undefined') {
      localStorage.setItem(RESUME_KEY, content);
    }
    this.notify();
    this.syncWithS3Debounced();
  }

  // --- Stats Calculation ---
  public getStats(): IStats {
    const totalJobs = this.jobs.length;
    const pendingApproval = this.jobs.filter((j) => j.approvalStatus === 'pending').length;
    const approvedJobs = this.jobs.filter((j) => j.approvalStatus === 'approved').length;
    const appliedJobs = this.jobs.filter((j) => j.applicationStatus === 'applied' || j.applicationStatus === 'interview' || j.applicationStatus === 'offer').length;
    const interviewingJobs = this.jobs.filter((j) => j.applicationStatus === 'interview').length;
    const rejectedJobs = this.jobs.filter((j) => j.approvalStatus === 'rejected' || j.applicationStatus === 'rejected').length;
    const unprocessedQueue = this.queue.filter((q) => !q.processed).length;
    const highMatchCount = this.jobs.filter((j) => j.matchScore >= 80).length;
    const avgMatchScore = totalJobs > 0 ? Math.round(this.jobs.reduce((acc, j) => acc + (j.matchScore || 0), 0) / totalJobs) : 0;
    const responseRatePct = appliedJobs > 0 ? Math.round((interviewingJobs / appliedJobs) * 100) : 0;

    return {
      totalJobs,
      pendingApproval,
      approvedJobs,
      appliedJobs,
      interviewingJobs,
      rejectedJobs,
      unprocessedQueue,
      avgMatchScore,
      responseRatePct,
      highMatchCount,
    };
  }

  // --- Backup & Restore ---
  public exportAllData(): string {
    return JSON.stringify(
      {
        jobs: this.jobs,
        queue: this.queue,
        profile: this.profile,
        masterResume: this.masterResume,
        exportedAt: new Date().toISOString(),
      },
      null,
      2
    );
  }

  public exportFullBackup(): string {
    return this.exportAllData();
  }

  public importAllData(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (Array.isArray(data.jobs)) this.jobs = data.jobs;
      if (Array.isArray(data.queue)) this.queue = data.queue;
      if (data.profile) this.profile = data.profile;
      if (data.masterResume) this.masterResume = data.masterResume;

      this.saveJobs();
      this.saveQueue();
      this.saveProfile(this.profile);
      this.saveMasterResume(this.masterResume);
      return true;
    } catch (err) {
      console.error('Failed to import JSON data:', err);
      return false;
    }
  }

  public resetToSeed(): void {
    this.jobs = initialSeedJobs;
    this.queue = [];
    this.profile = defaultProfile;
    this.masterResume = defaultMasterResume;
    this.saveJobs();
    this.saveQueue();
    this.saveProfile(this.profile);
    this.saveMasterResume(this.masterResume);
  }
}

export const store = new AppStore();
