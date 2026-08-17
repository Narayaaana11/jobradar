import { IInterviewPrep, IInterviewQuestion } from './types';
import { IExtractedJD } from './extractor';
import { IProfile } from './types';

export function generateInterviewPrep(job: IExtractedJD, profile: IProfile): IInterviewPrep {
  const company = job.companyName || 'Target Company';
  const role = job.jobTitle || 'Software Engineer';
  const skills = job.skillsRequired || ['JavaScript', 'React', 'Node.js', 'REST APIs'];

  const questions: IInterviewQuestion[] = [
    {
      category: 'Technical',
      question: `How would you architect a high-performance frontend for ${role} at ${company} using modern React and TypeScript?`,
      suggestedAnswer: `I implement component-level code splitting using React.lazy and Suspense, memoize expensive calculations with useMemo/useCallback, and utilize server-state caching (React Query or SWR) to minimize unnecessary re-renders. In TypeScript, I enforce strict typing with discriminated unions and generics for API response schemas.`,
      keyConcepts: ['Code Splitting', 'React Performance', 'TypeScript Discriminated Unions', 'Server State Caching'],
    },
    {
      category: 'System Design',
      question: `Design an idempotent RESTful API endpoint for transaction processing or batch data ingestion.`,
      suggestedAnswer: `I design idempotent endpoints by requiring an Idempotency-Key header from clients, caching the processing state and response in Redis with a TTL. Database transactions use atomic ACID operations and optimistic locking with version numbers to guarantee zero duplicate record inserts even during network retries.`,
      keyConcepts: ['Idempotency-Key', 'Redis TTL', 'Optimistic Locking', 'ACID Transactions'],
    },
    {
      category: 'Technical',
      question: `How do you handle asynchronous error boundaries and unhandled promise rejections in Node.js microservices?`,
      suggestedAnswer: `In Node.js/Express, I use centralized async error-handling middleware that intercepts rejected promises, logs structured telemetry with Winston/Pino including correlation IDs, and gracefully sends sanitized RFC 7807 problem details without leaking stack traces.`,
      keyConcepts: ['Centralized Error Middleware', 'Structured Telemetry', 'Correlation IDs', 'RFC 7807'],
    },
    {
      category: 'Behavioral',
      question: `Tell me about a challenging technical bug you encountered in one of your projects and how you diagnosed it.`,
      suggestedAnswer: `While building the TallyPrime Cloud Sync Engine, I encountered intermittent socket hang-ups during batch uploads of 5,000+ XML vouchers. I used Wireshark and Node.js trace logs to discover that Tally's local server closed keep-alive connections after 30 seconds. I resolved this by implementing an exponential backoff connection pool with automatic chunking.`,
      keyConcepts: ['STAR Method', 'Root Cause Analysis', 'Connection Pooling', 'Exponential Backoff'],
    },
    {
      category: 'Company Fit',
      question: `Why are you interested in joining ${company} as a ${role}?`,
      suggestedAnswer: `I have closely followed ${company}'s engineering initiatives and commitment to building scalable, high-impact products. As an MCA 2026 graduate specializing in MERN stack architectures and autonomous AI workflow systems, I am excited to apply my rapid problem-solving abilities and dedication to clean engineering within ${company}'s collaborative culture.`,
      keyConcepts: ['Company Values Alignment', 'Growth Mindset', 'Technical Passion'],
    },
  ];

  return {
    roleOverview: `Interviews at ${company} for ${role} test core algorithmic thinking, full-stack JavaScript/TypeScript architecture, system scalability, and practical software engineering judgment.`,
    technicalTopics: [
      ...skills.slice(0, 4),
      'State Management & Rendering',
      'REST & GraphQL API Idempotency',
      'MongoDB & SQL Indexing',
      'Distributed Systems & Async I/O',
    ],
    questions,
  };
}
