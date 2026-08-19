import { IJob, IRawQueueItem, IProfile, IStats, ICareerWatchlistSite } from './types';
import { s3Cloud } from './s3Client';
import { scrapingOverseer } from './scrapingOverseer';

const JOBS_KEY = 'jobradar_jobs_v1';
const QUEUE_KEY = 'jobradar_queue_v1';
const PROFILE_KEY = 'jobradar_profile_v1';
const RESUME_KEY = 'jobradar_master_resume_v1';
const CAREER_WATCHLIST_KEY = 'jobradar_career_watchlist_v1';

export const DEFAULT_CAREER_WATCHLIST: ICareerWatchlistSite[] = [
  // ── GREENHOUSE PORTALS ──
  {
    id: 'site-stripe',
    companyName: 'Stripe',
    careerUrl: 'https://boards.greenhouse.io/stripe',
    category: 'Tier 1 Tech',
    atsProvider: 'greenhouse',
    enabled: true,
    pollingIntervalHours: 6,
    autoApproveFitThreshold: 85,
    tags: ['Tier 1', 'FinTech', 'API'],
    searchKeywords: ['Software Engineer', 'Full Stack', 'Frontend', 'Backend', 'New Grad', 'Intern'],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'site-openai',
    companyName: 'OpenAI',
    careerUrl: 'https://boards.greenhouse.io/openai',
    category: 'AI / Machine Learning',
    atsProvider: 'greenhouse',
    enabled: true,
    pollingIntervalHours: 6,
    autoApproveFitThreshold: 90,
    tags: ['AI', 'Tier 1', 'High Impact'],
    searchKeywords: ['Software Engineer', 'Full Stack', 'Web', 'Frontend', 'Platform'],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'site-anthropic',
    companyName: 'Anthropic',
    careerUrl: 'https://boards.greenhouse.io/anthropic',
    category: 'AI / Machine Learning',
    atsProvider: 'greenhouse',
    enabled: true,
    pollingIntervalHours: 6,
    autoApproveFitThreshold: 90,
    tags: ['AI', 'Research', 'Tier 1'],
    searchKeywords: ['Software Engineer', 'Frontend', 'Full Stack', 'Product Engineer'],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'site-databricks',
    companyName: 'Databricks',
    careerUrl: 'https://boards.greenhouse.io/databricks',
    category: 'Tier 1 Tech',
    atsProvider: 'greenhouse',
    enabled: true,
    pollingIntervalHours: 12,
    autoApproveFitThreshold: 85,
    tags: ['Data', 'Cloud', 'Infrastructure'],
    searchKeywords: ['Software Engineer', 'Full Stack', 'Frontend', 'University Grad'],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'site-airbnb',
    companyName: 'Airbnb',
    careerUrl: 'https://boards.greenhouse.io/airbnb',
    category: 'Tier 1 Tech',
    atsProvider: 'greenhouse',
    enabled: true,
    pollingIntervalHours: 12,
    autoApproveFitThreshold: 85,
    tags: ['Travel', 'Consumer', 'Tier 1'],
    searchKeywords: ['Software Engineer', 'Frontend', 'Full Stack', 'Early Career'],
    createdAt: new Date().toISOString(),
  },

  // ── ASHBY PORTALS ──
  {
    id: 'site-vercel',
    companyName: 'Vercel',
    careerUrl: 'https://jobs.ashbyhq.com/vercel',
    category: 'Tier 1 Tech',
    atsProvider: 'ashby',
    enabled: true,
    pollingIntervalHours: 6,
    autoApproveFitThreshold: 85,
    tags: ['Frontend', 'Next.js', 'Cloud'],
    searchKeywords: ['Software Engineer', 'Frontend Engineer', 'Full Stack', 'Design Engineer'],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'site-linear',
    companyName: 'Linear',
    careerUrl: 'https://jobs.ashbyhq.com/linear',
    category: 'High-Growth Startup',
    atsProvider: 'ashby',
    enabled: true,
    pollingIntervalHours: 6,
    autoApproveFitThreshold: 88,
    tags: ['Productivity', 'React', 'TypeScript'],
    searchKeywords: ['Software Engineer', 'Full Stack Engineer', 'Frontend Engineer'],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'site-supabase',
    companyName: 'Supabase',
    careerUrl: 'https://jobs.ashbyhq.com/supabase',
    category: 'High-Growth Startup',
    atsProvider: 'ashby',
    enabled: true,
    pollingIntervalHours: 6,
    autoApproveFitThreshold: 85,
    tags: ['Open Source', 'Postgres', 'TypeScript'],
    searchKeywords: ['Full Stack Developer', 'Frontend Developer', 'Software Engineer'],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'site-ramp',
    companyName: 'Ramp',
    careerUrl: 'https://jobs.ashbyhq.com/ramp',
    category: 'FinTech / E-Commerce',
    atsProvider: 'ashby',
    enabled: true,
    pollingIntervalHours: 6,
    autoApproveFitThreshold: 85,
    tags: ['FinTech', 'Unicorn', 'Python', 'React'],
    searchKeywords: ['Software Engineer', 'Full Stack', 'Frontend', 'New Grad'],
    createdAt: new Date().toISOString(),
  },

  // ── LEVER PORTALS ──
  {
    id: 'site-postman',
    companyName: 'Postman',
    careerUrl: 'https://jobs.lever.co/postman',
    category: 'Tier 1 Tech',
    atsProvider: 'lever',
    enabled: true,
    pollingIntervalHours: 6,
    autoApproveFitThreshold: 85,
    tags: ['APIs', 'Developer Tools', 'India'],
    searchKeywords: ['Software Engineer', 'Frontend Engineer', 'Fullstack Engineer', 'Node.js', 'React'],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'site-figma',
    companyName: 'Figma',
    careerUrl: 'https://jobs.lever.co/figma',
    category: 'Tier 1 Tech',
    atsProvider: 'lever',
    enabled: true,
    pollingIntervalHours: 12,
    autoApproveFitThreshold: 88,
    tags: ['Design', 'WebAssembly', 'TypeScript'],
    searchKeywords: ['Software Engineer', 'Full Stack', 'Frontend', 'University Grad'],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'site-notion',
    companyName: 'Notion',
    careerUrl: 'https://jobs.lever.co/notion',
    category: 'High-Growth Startup',
    atsProvider: 'lever',
    enabled: true,
    pollingIntervalHours: 12,
    autoApproveFitThreshold: 88,
    tags: ['Productivity', 'React', 'Node'],
    searchKeywords: ['Software Engineer', 'Full Stack', 'Frontend', 'Core Product'],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'site-palantir',
    companyName: 'Palantir',
    careerUrl: 'https://jobs.lever.co/palantir',
    category: 'Tier 1 Tech',
    atsProvider: 'lever',
    enabled: true,
    pollingIntervalHours: 12,
    autoApproveFitThreshold: 85,
    tags: ['Enterprise', 'Big Data', 'AI'],
    searchKeywords: ['Forward Deployed Software Engineer', 'Software Engineer', 'Full Stack'],
    createdAt: new Date().toISOString(),
  },

  // ── WORKABLE PORTALS ──
  {
    id: 'site-resend',
    companyName: 'Resend',
    careerUrl: 'https://apply.workable.com/resend',
    category: 'High-Growth Startup',
    atsProvider: 'workable',
    enabled: true,
    pollingIntervalHours: 12,
    autoApproveFitThreshold: 85,
    tags: ['Email', 'Developer Tools', 'React'],
    searchKeywords: ['Full Stack Engineer', 'Frontend Developer', 'Software Engineer'],
    createdAt: new Date().toISOString(),
  },

  // ── INDIAN UNICORNS & HIGH-GROWTH TECH ──
  {
    id: 'site-swiggy',
    companyName: 'Swiggy',
    careerUrl: 'https://careers.swiggy.com/#/jobs?department=Engineering',
    category: 'High-Growth Startup',
    atsProvider: 'generic',
    enabled: true,
    pollingIntervalHours: 6,
    autoApproveFitThreshold: 80,
    tags: ['India', 'FoodTech', 'MERN'],
    searchKeywords: ['Software Engineer', 'Frontend', 'Fullstack', 'MERN', 'React', 'SDE-1'],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'site-razorpay',
    companyName: 'Razorpay',
    careerUrl: 'https://razorpay.com/jobs/?dept=Engineering',
    category: 'FinTech / E-Commerce',
    atsProvider: 'generic',
    enabled: true,
    pollingIntervalHours: 6,
    autoApproveFitThreshold: 82,
    tags: ['FinTech', 'India', 'Payments'],
    searchKeywords: ['Software Engineer', 'Frontend', 'Backend', 'Fullstack', 'React', 'SDE-1'],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'site-amazon',
    companyName: 'Amazon',
    careerUrl: 'https://amazon.jobs/en/search?base_query=software+development+engineer&loc_query=India',
    category: 'Tier 1 Tech',
    atsProvider: 'generic',
    enabled: true,
    pollingIntervalHours: 12,
    autoApproveFitThreshold: 85,
    tags: ['FAANG', 'Cloud', 'AWS'],
    searchKeywords: ['Software Development Engineer', 'SDE-1', 'Full Stack', 'Frontend', 'Fresher', 'Graduate'],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'site-google',
    companyName: 'Google',
    careerUrl: 'https://careers.google.com/jobs/results/?distance=50&location=India&q=Software%20Engineer',
    category: 'Tier 1 Tech',
    atsProvider: 'generic',
    enabled: true,
    pollingIntervalHours: 12,
    autoApproveFitThreshold: 88,
    tags: ['FAANG', 'Search', 'Cloud'],
    searchKeywords: ['Software Engineer', 'Web Developer', 'Full Stack', 'React', 'Early Career'],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'site-microsoft',
    companyName: 'Microsoft',
    careerUrl: 'https://careers.microsoft.com/professionals/us/en/search-results?q=software%20engineer&lc=India',
    category: 'Tier 1 Tech',
    atsProvider: 'generic',
    enabled: true,
    pollingIntervalHours: 12,
    autoApproveFitThreshold: 85,
    tags: ['FAANG', 'Azure', 'TypeScript'],
    searchKeywords: ['Software Engineer', 'Full Stack', 'React', 'Node', 'Graduate'],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'site-deloitte',
    companyName: 'Deloitte',
    careerUrl: 'https://jobs2.deloitte.com/in/en/search-results?keywords=developer',
    category: 'MNC / IT Services',
    atsProvider: 'generic',
    enabled: true,
    pollingIntervalHours: 24,
    autoApproveFitThreshold: 75,
    tags: ['Consulting', 'Cloud', 'Enterprise'],
    searchKeywords: ['Associate Analyst', 'Developer', 'Full Stack', 'Cloud', 'Freshers'],
    createdAt: new Date().toISOString(),
  },
];

export const defaultProfile: IProfile = {
  name: '',
  title: '',
  email: '',
  phone: '',
  location: '',
  linkedin: '',
  github: '',
  portfolio: '',
  education: '',
  primarySkills: [],
  specializations: [],
  experience: '',
  projects: [],
  apiKey: (typeof process !== 'undefined' && process.env?.OPENROUTER_API_KEY) || '',
  groqApiKey: (typeof process !== 'undefined' && process.env?.GROQ_API_KEY) || '',
  geminiApiKey: (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) || '',
  ollamaEndpoint: 'http://localhost:11434',
  ollamaModel: 'llama3.2',
  preferredProvider: 'auto',
};

export const defaultMasterResume = `# Candidate Resume
Location | Phone | Email
[Portfolio](https://example.com) | [LinkedIn](https://linkedin.com) | [GitHub](https://github.com)

---

## SUMMARY
Software engineer experienced in modern full-stack development and system engineering.

---

## TECHNICAL SKILLS
- Languages: TypeScript, JavaScript, Python
- Frontend: React.js, Tailwind CSS
- Backend: Node.js, Express, MongoDB, SQL
- DevOps & Tools: Git, Docker, Cloud Platforms
`;

// Initial seed jobs for fresh installation
const initialSeedJobs: IJob[] = [];

// In-Memory & LocalStorage Reactive Store
class AppStore {
  private jobs: IJob[] = [];
  private queue: IRawQueueItem[] = [];
  private profile: IProfile = defaultProfile;
  private masterResume: string = defaultMasterResume;
  private careerWatchlist: ICareerWatchlistSite[] = DEFAULT_CAREER_WATCHLIST;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadFromStorage();
    this.syncWithS3Debounced();
  }

  private loadFromStorage() {
    try {
      if (typeof window !== 'undefined') {
        const storedJobs = localStorage.getItem(JOBS_KEY);
        const storedQueue = localStorage.getItem(QUEUE_KEY);
        const storedProfile = localStorage.getItem(PROFILE_KEY);
        const storedResume = localStorage.getItem(RESUME_KEY);
        const storedWatchlist = localStorage.getItem(CAREER_WATCHLIST_KEY);

        const loadedJobs: IJob[] = storedJobs ? JSON.parse(storedJobs) : initialSeedJobs;
        const { cleanJobs, removedCount } = scrapingOverseer.sanitizeJobsList(loadedJobs);
        this.jobs = cleanJobs;
        this.queue = storedQueue ? JSON.parse(storedQueue) : [];
        this.profile = storedProfile ? { ...defaultProfile, ...JSON.parse(storedProfile) } : defaultProfile;
        if (!this.profile.apiKey) {
          this.profile.apiKey = defaultProfile.apiKey;
        }
        this.masterResume = storedResume || defaultMasterResume;
        this.careerWatchlist = storedWatchlist ? JSON.parse(storedWatchlist) : DEFAULT_CAREER_WATCHLIST;

        if (!storedJobs || removedCount > 0) this.saveJobs();
        if (!storedProfile) this.saveProfile(this.profile);
        if (!storedResume) this.saveMasterResume(defaultMasterResume);
        if (!storedWatchlist) this.saveCareerWatchlist();
      } else {
        this.jobs = initialSeedJobs;
        this.careerWatchlist = DEFAULT_CAREER_WATCHLIST;
      }
    } catch (err) {
      console.error('Error loading store from localStorage:', err);
      this.jobs = initialSeedJobs;
      this.careerWatchlist = DEFAULT_CAREER_WATCHLIST;
    }
  }

  private syncWithS3Debounced() {
    if (typeof window !== 'undefined') {
      try {
        if (s3Cloud.getConfig().autoSync) {
          s3Cloud.syncAllToS3(this.jobs, this.queue, this.profile, this.masterResume, this.careerWatchlist).catch((err) => {
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

  public sanitizeAllJobs(): number {
    const { cleanJobs, removedCount } = scrapingOverseer.sanitizeJobsList(this.jobs);
    if (removedCount > 0) {
      this.jobs = cleanJobs;
      this.saveJobs();
    }
    return removedCount;
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

  // --- Career Watchlist Operations ---
  public getCareerWatchlist(): ICareerWatchlistSite[] {
    return [...this.careerWatchlist];
  }

  public getCareerSiteById(id: string): ICareerWatchlistSite | undefined {
    return this.careerWatchlist.find((s) => s.id === id);
  }

  private saveCareerWatchlist(): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(CAREER_WATCHLIST_KEY, JSON.stringify(this.careerWatchlist));
    }
    this.notify();
    this.syncWithS3Debounced();
  }

  public addCareerSite(site: Omit<ICareerWatchlistSite, 'id' | 'createdAt'>): ICareerWatchlistSite {
    const newSite: ICareerWatchlistSite = {
      ...site,
      id: `site-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      createdAt: new Date().toISOString(),
      lastSyncStatus: 'idle',
      lastJobsFound: 0,
    };
    this.careerWatchlist.unshift(newSite);
    this.saveCareerWatchlist();
    return newSite;
  }

  public updateCareerSite(id: string, updates: Partial<ICareerWatchlistSite>): void {
    const idx = this.careerWatchlist.findIndex((s) => s.id === id);
    if (idx >= 0) {
      this.careerWatchlist[idx] = { ...this.careerWatchlist[idx], ...updates };
      this.saveCareerWatchlist();
    }
  }

  public deleteCareerSite(id: string): void {
    this.careerWatchlist = this.careerWatchlist.filter((s) => s.id !== id);
    this.saveCareerWatchlist();
  }

  public toggleCareerSite(id: string): void {
    const site = this.careerWatchlist.find((s) => s.id === id);
    if (site) {
      site.enabled = !site.enabled;
      this.saveCareerWatchlist();
    }
  }

  public setCareerSiteSyncStatus(
    id: string,
    status: 'idle' | 'syncing' | 'success' | 'error',
    jobsFound?: number,
    error?: string
  ): void {
    const site = this.careerWatchlist.find((s) => s.id === id);
    if (site) {
      site.lastSyncStatus = status;
      site.lastSyncedAt = new Date().toISOString();
      if (typeof jobsFound === 'number') site.lastJobsFound = jobsFound;
      if (error !== undefined) site.lastError = error;
      this.saveCareerWatchlist();
    }
  }

  public exportWatchlistAsJson(): string {
    return JSON.stringify(this.careerWatchlist, null, 2);
  }

  public importWatchlistFromJson(jsonString: string): { success: boolean; importedCount: number; error?: string } {
    try {
      const parsed = JSON.parse(jsonString);
      if (!Array.isArray(parsed)) {
        return { success: false, importedCount: 0, error: 'Expected an array of watchlist sites' };
      }

      const validSites: ICareerWatchlistSite[] = [];
      for (const item of parsed) {
        if (item && item.companyName && item.careerUrl) {
          validSites.push({
            id: item.id || `site-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            companyName: item.companyName,
            careerUrl: item.careerUrl,
            category: item.category || 'Custom',
            atsProvider: item.atsProvider || 'generic',
            enabled: item.enabled !== false,
            pollingIntervalHours: item.pollingIntervalHours || 6,
            autoApproveFitThreshold: item.autoApproveFitThreshold || 85,
            tags: item.tags || [],
            searchKeywords: item.searchKeywords || ['Software Engineer', 'Full Stack', 'Developer'],
            createdAt: item.createdAt || new Date().toISOString(),
            lastSyncStatus: 'idle',
            lastJobsFound: 0,
          });
        }
      }

      if (validSites.length === 0) {
        return { success: false, importedCount: 0, error: 'No valid company entries found in file' };
      }

      this.careerWatchlist = validSites;
      this.saveCareerWatchlist();
      return { success: true, importedCount: validSites.length };
    } catch (err: any) {
      return { success: false, importedCount: 0, error: err.message || 'Invalid JSON format' };
    }
  }

  public resetCareerWatchlist(): void {
    this.careerWatchlist = DEFAULT_CAREER_WATCHLIST;
    this.saveCareerWatchlist();
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

/**
 * Validates whether the user profile has been configured beyond blank/default placeholders.
 */
export function isProfileConfigured(profile: IProfile | null | undefined): boolean {
  if (!profile) return false;
  const name = (profile.name || '').trim().toLowerCase();
  if (!name || name === 'your name' || name === 'candidate name' || name.includes('your name')) {
    return false;
  }
  const skills = profile.primarySkills || [];
  if (skills.length === 0) {
    return false;
  }
  const hasExp = Boolean(profile.experience && profile.experience.length > 0);
  const hasProjects = Boolean(profile.projects && profile.projects.length > 0);
  if (!hasExp && !hasProjects) {
    return false;
  }
  return true;
}

