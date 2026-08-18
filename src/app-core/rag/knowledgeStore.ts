import {
  IKnowledgeDocument,
  IDocumentChunk,
  ISearchResult,
  IRagQueryOptions,
  IVaultStats,
  KnowledgeCategory,
} from './types';
import {
  generateLocalEmbedding,
  cosineSimilarity,
  calculateBm25Scores,
  reciprocalRankFusion,
  tokenizeText,
} from './embeddings';
import { chunkDocument } from './chunker';
import { s3Cloud } from '../s3Client';

const RAG_VAULT_KEY = 'jobradar_rag_vault_v2';

/**
 * Pre-seeded comprehensive knowledge documents for candidate Narayana Thota.
 */
export const seedKnowledgeDocuments: IKnowledgeDocument[] = [
  {
    id: 'doc-resume-master',
    title: 'Master Resume & Core Profile Credentials',
    category: 'resume',
    tags: ['Resume', 'FullStack', 'MERN', 'MCA2026', 'AdityaUniversity', 'TechnicalHub'],
    enabled: true,
    content: `# Veera Venkata Naga Satyanarayana Thota
Location: Bhimavaram, Andhra Pradesh | Phone: +91 6301253789 | Email: narayananaiduthota@gmail.com
Links: Portfolio (https://www.narayanathota.me) | LinkedIn (https://www.linkedin.com/in/narayaaana/) | GitHub (https://github.com/Narayaaana11)

## Summary
Full Stack Developer and MCA candidate (2024-2026) with deep practical experience architecting high-performance React.js and TypeScript frontends, and modular Node.js/Express.js backend microservices. Skilled in end-to-end software ownership, database modeling with MongoDB aggregation pipelines, RESTful API design, and cloud synchronization (AWS S3).

## Technical Skills
- Languages: Python, SQL, JavaScript (ES6+), HTML5, CSS3
- Frontend: React.js, Tailwind CSS, Responsive Design, State Management, Vite, Electron
- Backend & Database: Node.js, Express.js, MongoDB, REST APIs, JWT Auth, WebSockets (Socket.io)
- Cloud & DevOps: AWS S3, Git, GitHub Actions, Vercel, Render, Postman
- Core Concepts: Data Structures & Algorithms, Object-Oriented Programming, Database Indexing

## Experience
Full Stack Development Intern | Technical Hub Pvt. Ltd. (June 2025 – July 2025)
- Built responsive UI components with React.js and Tailwind CSS, standardizing cross-platform layouts.
- Developed RESTful API endpoints in Node.js and Express to manage authentication and real-time state sync.
- Tested API routes in Postman, resolving 15+ dynamic integration issues before production releases.

## Education
- Aditya University | Master of Computer Applications (MCA) (Aug 2024 – May 2026, CGPA: 7.70/10)
- Aditya Degree College | Bachelor of Computer Applications (BCA) (Aug 2021 – May 2024, CGPA: 7.24/10)

## Certifications & Achievements
- Full Stack Developer Certification — Technical Hub Pvt. Ltd. (June 2025)
- Project Space Hackathon Participant — Technical Hub Pvt. Ltd. (June 2025)
- Solved 200+ Data Structures & Algorithm problems across LeetCode and HackerRank.`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'doc-proj-ausvms',
    title: 'Project Case Study: Aditya University Visitor Management System (AUSVMS)',
    category: 'project',
    tags: ['MERN', 'AUSVMS', 'Socket.io', 'RBAC', 'MongoDB', 'Nodemailer', 'Authentication'],
    enabled: true,
    content: `# Aditya University Visitor Management System (AUSVMS)
Platform: Full Stack MERN Web Application with Real-Time WebSockets
GitHub Repository: https://github.com/Narayaaana11

## Architecture & Overview
AUSVMS is an enterprise-grade campus visitor tracking platform replacing paper sign-in logs with an automated digital workflow for 4 distinct user roles: Super Admin, University Staff, Security Guards, and Visitors.

## Key Technical Features
1. Role-Based Access Control (RBAC): Implemented strict JWT route middleware and permission matrices to ensure security guards can only initiate check-ins, staff can approve/reject visitor requests, and admins can view comprehensive analytics.
2. Real-Time Socket.io Alerts: Integrated bi-directional WebSocket channels notifying university staff instantaneously when a visitor requests an appointment at the main security gate.
3. Automated OTP & Email Notifications: Engineered Nodemailer SMTP integration sending one-time passcodes (OTP) and visitor gate passes with automated QR/barcodes.
4. High-Performance MongoDB Aggregations: Designed complex aggregation pipelines ($facet, $match, $lookup, $group) powering real-time visitor influx charts, reducing report lookup time from 3 minutes to under 250 milliseconds.

## Key Measurable Impact
- Reduced peak-hour campus entry congestion by 70%.
- Streamlined visitor verification time from 4 minutes to under 30 seconds per visitor.
- Processed 10,000+ visitor passes with zero authorization leaks.`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'doc-proj-guardhub',
    title: 'Project Case Study: Guard Hub — Campus Security Roster Engine',
    category: 'project',
    tags: ['MERN', 'GuardHub', 'Algorithms', 'TailwindCSS', 'CollisionDetection', 'Scheduling'],
    enabled: true,
    content: `# Guard Hub — Security Roster Management System
Platform: React.js, Node.js, Express.js, MongoDB, Tailwind CSS
GitHub Repository: https://github.com/Narayaaana11/Guards-Hub

## Architecture & Problem Statement
Campus security operations required continuous 24/7 monitoring across 15+ university checkpoints with 100+ guards. Manual spreadsheet rostering suffered from double-booking, fatigue compliance violations, and slow emergency substitutions.

## Engineering Highlights
1. Automated Shift Collision Detection Engine: Built a constraint validation algorithm in TypeScript/JavaScript that verifies guard rest periods, overtime limits, and rotation rules across 4 daily shifts (Morning, Afternoon, Night, Relief), flagging conflicts in real time.
2. Responsive Roster Grid: Created an interactive scheduling grid in React with Tailwind CSS, supporting drag-and-drop shift swaps with optimistic UI updates.
3. Attendance Audit & Verification: Designed tamper-evident attendance logging where supervisors verify physical checkpoint handoffs.
4. Export & Telemetry: Generated automated PDF and Excel rosters for security management.

## Key Measurable Impact
- Saved 5+ hours of weekly administrative rostering overhead for campus supervisors.
- Eliminated 100% of double-booking shift conflicts across 100+ personnel.`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'doc-proj-matrixlib',
    title: 'Project Case Study: Matrix Library Management System with NLP Chatbot',
    category: 'project',
    tags: ['MERN', 'Python', 'NLP', 'Chatbot', 'Inventory', 'Search'],
    enabled: true,
    content: `# Matrix Library Management System
Platform: MERN Stack, Python NLP, REST APIs
GitHub Repository: https://github.com/Narayaaana11/Matrix-Library-Management-System

## Architecture & Overview
Matrix Library is a modern library automation platform featuring real-time book tracking, automated due-date fine calculations, and a Python-powered Natural Language Processing search assistant.

## Engineering Highlights
1. NLP Query Assistant: Built a Python NLP microservice utilizing TF-IDF and cosine similarity to interpret conversational student queries like "Where can I find books on distributed operating systems?" and map them to specific aisle/shelf coordinates.
2. Real-Time Inventory Tracking: Engineered a React dashboard reflecting book checkout state changes instantaneously with optimistic UI locking.
3. Fine & Reservation Engine: Implemented scheduled cron jobs in Node.js computing overdue fines and notifying students via email.

## Key Measurable Impact
- Enabled instant natural language book discovery for 5,000+ catalog titles.
- Reduced student front-desk catalog inquiries by 45%.`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'doc-proj-jobradar',
    title: 'Project Case Study: JobRadar — Autonomous Career Agent & Desktop App',
    category: 'project',
    tags: ['Electron', 'React', 'TypeScript', 'VectorRAG', 'S3', 'MultiAgent', 'TailwindCSS'],
    enabled: true,
    content: `# JobRadar — Autonomous Multi-Agent Career & Job Search Platform
Platform: Standalone Windows Desktop App (Electron, React 18, Vite, TypeScript, Tailwind CSS)
Architecture: 100% Standalone Client with Local Vector RAG & AWS S3 Auto-Sync

## Engineering Highlights
1. Autonomous Ingestion & Chat Parser: Regex & heuristic parsing engine splitting bulk WhatsApp and Telegram hiring dumps into structured JD records.
2. Multi-Agent AI Deliberation Council: Convenes 3 distinct OpenRouter LLM perspectives (Technical Screener, Hiring Manager, ATS Strategist) + Council Chair synthesizer.
3. Client-Side ATS Resume Compiler: Native PDF compiler in jsPDF and FAANG-standard LaTeX (.tex) exporter generating pixel-perfect resumes on the client.
4. Offline-First Vector RAG Engine: Built-in 384-dimensional dense vector embeddings and BM25 hybrid search engine retrieving candidate project evidence to ground all AI generations without hallucination.
5. AWS S3 Cloud Bridge: Zero-CORS Electron native bridge synchronizing job boards, candidate vaults, and ATS resumes automatically to Amazon S3.`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'doc-star-debugging',
    title: 'STAR Story: High-Stress Debugging & Batch Connection Pool Recovery',
    category: 'star_story',
    tags: ['STAR', 'Debugging', 'Troubleshooting', 'NodeJS', 'WebSockets', 'NetworkAnalysis'],
    enabled: true,
    content: `# STAR Story: Troubleshooting Intermittent Socket Timeouts in Batch Sync
Category: Technical Problem Solving & Incident Response

## Situation
During the deployment of a real-time data sync service handling 5,000+ records, client connections intermittently dropped with socket hang-up errors (ECONNRESET) during batch uploads, stalling synchronization.

## Task
Identify the root cause of the connection dropouts, prevent data corruption, and restore reliable real-time synchronization without adding heavy external infrastructure.

## Action
1. Network Packet Tracing: Used Wireshark and Node.js trace logs to inspect TCP handshakes, discovering the local backend closed idle keep-alive sockets after 30 seconds when batch payloads exceeded network buffer thresholds.
2. Connection Pool Architecture: Replaced static single-socket requests with an active connection pool maintaining heartbeat pings.
3. Chunked Streaming & Exponential Backoff: Re-architected batch processing into 100-record chunks with jittered exponential backoff retries and SHA-256 batch checksums to guarantee idempotency.

## Result
Eliminated 100% of socket hang-ups during high-volume sync, achieving uninterrupted batch processing across 50,000+ records with zero data duplication.`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'doc-star-performance',
    title: 'STAR Story: Database Performance Tuning & MongoDB Pipeline Optimization',
    category: 'star_story',
    tags: ['STAR', 'MongoDB', 'Performance', 'Database', 'Indexing', 'Optimization'],
    enabled: true,
    content: `# STAR Story: Optimizing Real-Time Visitor Analytics from Minutes to Milliseconds
Category: Performance Optimization & Architecture

## Situation
In the AUSVMS campus visitor platform, the historical analytics dashboard experienced severe slowdowns when querying 50,000+ visitor log entries across multiple departments, resulting in UI freezes of up to 3 minutes.

## Task
Optimize the database query pipeline to achieve sub-second response times for live campus security dashboards.

## Action
1. Query Profiling: Executed MongoDB explain('executionStats') on visitor lookups, identifying COLLSCAN (full collection scans) on unindexed date and department fields.
2. Compound Indexing: Created compound indexes on { status: 1, department: 1, checkInTime: -1 } tailored to frequent filter combinations.
3. Aggregation Redesign: Refactored multiple round-trip queries into a single multi-stage aggregation pipeline with $facet to compute total counts, active visitors, and hourly trends in one server pass.

## Result
Reduced query execution latency from ~180,000ms (3 minutes) to 220ms (an 800x improvement), providing security guards with instantaneous live dashboard metrics.`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'doc-star-hackathon',
    title: 'STAR Story: Project Space Hackathon & 24-Hour Agile Delivery',
    category: 'star_story',
    tags: ['STAR', 'Hackathon', 'Teamwork', 'Agile', 'React', 'FastPaced'],
    enabled: true,
    content: `# STAR Story: Rapid Prototyping & Delivery under 24-Hour Hackathon Deadlines
Category: Collaboration, Ownership & Rapid Execution

## Situation
Participated in the Project Space Hackathon at Technical Hub, where our 4-person engineering team had 24 hours to design, develop, test, and pitch a functional multi-user web application from scratch.

## Task
Act as Full-Stack Lead, design the database schema, build the REST API authentication and core data pipeline, and integrate the React frontend before the final judging demo.

## Action
1. Modular Architecture: Established a clear REST API contract within the first 2 hours, allowing frontend and backend teammates to build simultaneously against mock JSON schemas.
2. Rapid Component Engineering: Built reusable React UI components with Tailwind CSS for instant state feedback.
3. Continuous Integration: Conducted micro-sprints every 4 hours with live Git merging and Postman testing.

## Result
Delivered a fully working prototype ahead of deadline with zero runtime crashes during the live judge evaluation, earning high honors and certificate of excellence from Technical Hub.`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'doc-technote-architecture',
    title: 'System Design & Full-Stack Architecture Cheatsheet',
    category: 'tech_note',
    tags: ['SystemDesign', 'React18', 'WebSockets', 'JWT', 'Redis', 'Idempotency', 'Architecture'],
    enabled: true,
    content: `# Full-Stack System Design & Engineering Cheatsheet
Topics: Frontend Optimization, API Idempotency, Microservices, Security

## 1. React 18 Concurrent Rendering & State Management
- Concurrent Mode: Prioritizes user interactions by yielding to the main thread during heavy computations.
- useTransition: Marks state updates as non-blocking transitions (e.g. search filtering while keeping input responsive).
- useDeferredValue: Defers re-rendering expensive subtrees until urgent updates complete.
- Code Splitting: React.lazy + Suspense for route-based chunking to minimize initial bundle size.

## 2. API Idempotency & Batch Processing
- Idempotency-Key: Clients supply a unique UUID header; backend caches response in Redis with a TTL. Repeated requests with the same key return cached result without re-executing business logic.
- Atomic Operations: Using MongoDB $setOnInsert or SQL transactions with optimistic version locking to prevent race conditions.

## 3. Real-Time WebSockets & Socket.io Scaling
- Room-based Broadcasting: Subscribing sockets to specific room IDs (e.g. department/channel) rather than global broadcasting.
- Heartbeats & Reconnection: Configuring pingTimeout (20s) and pingInterval (25s) with exponential backoff on client reconnect.

## 4. Secure Authentication & Authorization
- JWT Token Lifecycle: Short-lived Access Tokens (15 mins in memory/Authorization header) + Long-lived Refresh Tokens (7 days in httpOnly SameSite cookies).
- RBAC Middleware: Enforcing role hierarchy (SuperAdmin > Staff > Guard > Visitor) at the route layer.`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export class KnowledgeVaultStore {
  private documents: IKnowledgeDocument[] = [];
  private chunks: IDocumentChunk[] = [];
  private lastIndexedAt: string | null = null;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(RAG_VAULT_KEY);
        if (stored) {
          const data = JSON.parse(stored);
          this.documents = data.documents || seedKnowledgeDocuments;
          this.chunks = data.chunks || [];
          this.lastIndexedAt = data.lastIndexedAt || null;

          // If no chunks indexed yet, build them now
          if (this.chunks.length === 0 && this.documents.length > 0) {
            this.reindexAllSync();
          }
          return;
        }
      }
    } catch (err) {
      console.warn('Error loading RAG vault from localStorage:', err);
    }

    // Default to seed documents
    this.documents = seedKnowledgeDocuments;
    this.reindexAllSync();
  }

  private saveToStorage() {
    try {
      if (typeof window !== 'undefined') {
        const payload = {
          documents: this.documents,
          chunks: this.chunks,
          lastIndexedAt: this.lastIndexedAt,
        };
        localStorage.setItem(RAG_VAULT_KEY, JSON.stringify(payload));
      }
      this.notify();
      this.syncWithS3Debounced();
    } catch (err) {
      console.error('Error saving RAG vault to storage:', err);
    }
  }

  private syncWithS3Debounced() {
    if (typeof window !== 'undefined') {
      try {
        if (s3Cloud.getConfig().autoSync) {
          const dataToSync = JSON.stringify(
            {
              documents: this.documents,
              totalChunks: this.chunks.length,
              lastIndexedAt: this.lastIndexedAt,
            },
            null,
            2
          );
          s3Cloud.putObject('rag_knowledge_vault.json', dataToSync, 'application/json').catch(() => {});
        }
      } catch (e) {}
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  // --- Synchronous Document & Chunk Indexing ---
  private reindexAllSync() {
    const allChunks: IDocumentChunk[] = [];
    for (const doc of this.documents) {
      if (doc.enabled) {
        const docChunks = chunkDocument(doc);
        allChunks.push(...docChunks);
      }
    }
    this.chunks = allChunks;
    this.lastIndexedAt = new Date().toISOString();
  }

  public reindexAll(): void {
    this.reindexAllSync();
    this.saveToStorage();
  }

  // --- Document Operations ---
  public getDocuments(): IKnowledgeDocument[] {
    return [...this.documents];
  }

  public getDocumentById(id: string): IKnowledgeDocument | undefined {
    return this.documents.find((d) => d.id === id);
  }

  public addDocument(doc: Omit<IKnowledgeDocument, 'id' | 'createdAt' | 'updatedAt'>): IKnowledgeDocument {
    const newDoc: IKnowledgeDocument = {
      ...doc,
      id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.documents.unshift(newDoc);
    this.reindexAllSync();
    this.saveToStorage();
    return newDoc;
  }

  public updateDocument(id: string, updates: Partial<IKnowledgeDocument>): IKnowledgeDocument | undefined {
    const doc = this.documents.find((d) => d.id === id);
    if (doc) {
      Object.assign(doc, updates, { updatedAt: new Date().toISOString() });
      this.reindexAllSync();
      this.saveToStorage();
      return doc;
    }
    return undefined;
  }

  public deleteDocument(id: string): boolean {
    const initialLen = this.documents.length;
    this.documents = this.documents.filter((d) => d.id !== id);
    if (this.documents.length !== initialLen) {
      this.reindexAllSync();
      this.saveToStorage();
      return true;
    }
    return false;
  }

  public toggleDocumentEnabled(id: string): boolean {
    const doc = this.documents.find((d) => d.id === id);
    if (doc) {
      doc.enabled = !doc.enabled;
      doc.updatedAt = new Date().toISOString();
      this.reindexAllSync();
      this.saveToStorage();
      return doc.enabled;
    }
    return false;
  }

  public getChunks(): IDocumentChunk[] {
    return [...this.chunks];
  }

  // --- Hybrid Search: Dense Vector + BM25 Lexical + Reciprocal Rank Fusion ---
  public searchHybrid(query: string, options: IRagQueryOptions = {}): ISearchResult[] {
    if (!query || !query.trim() || this.chunks.length === 0) {
      return [];
    }

    const topK = options.topK || 4;
    const minScore = options.minScore ?? 0.15;
    const cleanQuery = query.trim();

    // 1. Filter candidate chunks by category if specified
    let candidateChunks = this.chunks;
    if (options.categoryFilter) {
      const allowedCategories = Array.isArray(options.categoryFilter)
        ? new Set(options.categoryFilter)
        : new Set([options.categoryFilter]);
      candidateChunks = this.chunks.filter((c) => allowedCategories.has(c.category));
    }

    if (candidateChunks.length === 0) {
      return [];
    }

    // 2. Dense Vector Embedding Search (Cosine Similarity)
    const queryEmbedding = generateLocalEmbedding(cleanQuery);
    const denseScores = new Map<string, number>();

    for (const chunk of candidateChunks) {
      const sim = cosineSimilarity(queryEmbedding, chunk.embedding);
      denseScores.set(chunk.chunkId, sim);
    }

    // Dense rank ordering (1-indexed)
    const sortedByDense = [...candidateChunks].sort(
      (a, b) => (denseScores.get(b.chunkId) || 0) - (denseScores.get(a.chunkId) || 0)
    );
    const denseRanks = new Map<string, number>();
    sortedByDense.forEach((c, idx) => denseRanks.set(c.chunkId, idx + 1));

    // 3. BM25 Lexical Search
    const bm25Scores = calculateBm25Scores(cleanQuery, candidateChunks);
    const sortedByBm25 = [...candidateChunks].sort(
      (a, b) => (bm25Scores.get(b.chunkId) || 0) - (bm25Scores.get(a.chunkId) || 0)
    );
    const bm25Ranks = new Map<string, number>();
    sortedByBm25.forEach((c, idx) => bm25Ranks.set(c.chunkId, idx + 1));

    // 4. Hybrid Fusion (RRF or Weighted Composite)
    const rrfScores = options.hybridSearch !== false
      ? reciprocalRankFusion(denseRanks, bm25Ranks)
      : denseScores;

    // 5. Query tokens for matched keywords detection
    const queryTokens = tokenizeText(cleanQuery);

    const searchResults: ISearchResult[] = [];

    for (const chunk of candidateChunks) {
      const dScore = denseScores.get(chunk.chunkId) || 0;
      const bScore = bm25Scores.get(chunk.chunkId) || 0;
      const rrf = rrfScores.get(chunk.chunkId) || 0;

      // Weighted Composite Score: 60% Dense Semantic + 40% BM25 Lexical with RRF Boost
      const compositeScore = options.hybridSearch !== false
        ? dScore * 0.55 + bScore * 0.25 + rrf * 0.2
        : dScore;

      if (compositeScore >= minScore) {
        // Identify which query tokens appear in chunk
        const chunkTextLower = chunk.text.toLowerCase();
        const matched = queryTokens.filter((t) => chunkTextLower.includes(t));

        // Create a concise highlight snippet (first 180 chars)
        const snippet = chunk.text.length > 220 ? chunk.text.slice(0, 217) + '...' : chunk.text;

        searchResults.push({
          chunk,
          similarityScore: Math.round(compositeScore * 100) / 100,
          denseScore: Math.round(dScore * 100) / 100,
          bm25Score: Math.round(bScore * 100) / 100,
          rank: 0,
          matchedKeywords: matched,
          contextSnippet: snippet,
        });
      }
    }

    // Sort by final composite score descending
    searchResults.sort((a, b) => b.similarityScore - a.similarityScore);

    // Assign final ranks and slice to topK
    const finalResults = searchResults.slice(0, topK).map((res, idx) => ({
      ...res,
      rank: idx + 1,
    }));

    return finalResults;
  }

  // --- Stats Calculation ---
  public getStats(): IVaultStats {
    const categoriesCount: Record<KnowledgeCategory, number> = {
      resume: 0,
      project: 0,
      experience: 0,
      star_story: 0,
      tech_note: 0,
      job_market: 0,
      custom: 0,
    };

    let totalTokens = 0;
    this.documents.forEach((d) => {
      categoriesCount[d.category] = (categoriesCount[d.category] || 0) + 1;
    });

    this.chunks.forEach((c) => {
      totalTokens += c.tokenCount;
    });

    return {
      totalDocuments: this.documents.length,
      totalChunks: this.chunks.length,
      totalTokens,
      categoriesCount,
      lastIndexedAt: this.lastIndexedAt,
      embeddingDimension: 384,
      indexStatus: this.chunks.length > 0 ? 'ready' : 'stale',
    };
  }

  // --- Backup & Restore ---
  public exportVault(): string {
    return JSON.stringify(
      {
        documents: this.documents,
        lastIndexedAt: this.lastIndexedAt,
        exportedAt: new Date().toISOString(),
      },
      null,
      2
    );
  }

  public importVault(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      if (Array.isArray(parsed.documents)) {
        this.documents = parsed.documents;
        this.reindexAllSync();
        this.saveToStorage();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to import RAG vault JSON:', err);
      return false;
    }
  }

  public resetToSeed(): void {
    this.documents = seedKnowledgeDocuments;
    this.reindexAllSync();
    this.saveToStorage();
  }
}

export const knowledgeVault = new KnowledgeVaultStore();
