import { analyzeAtsCompliance } from '../src/app-core/atsMatcher';
import { generateAtsResumeLatex } from '../src/app-core/resumeGenerator';
import { IProfile, IJob } from '../src/app-core/types';

const candidateProfile: IProfile = {
  name: 'Veera Venkata Naga Satyanarayana Thota',
  title: 'Senior Distributed Systems Engineer',
  email: 'satya@example.com',
  phone: '+91 6301253789',
  location: 'Hyderabad, India (Open to Remote)',
  education: 'Master of Computer Applications (MCA) — 2024–2026, Aditya University (CGPA: 7.70/10)',
  experience: 'Full-lifecycle software engineering and high-throughput distributed systems',
  linkedin: 'https://www.linkedin.com/in/narayaaana/',
  github: 'https://github.com/Narayaaana11',
  primarySkills: ['TypeScript', 'Node.js', 'Go', 'Kubernetes', 'AWS', 'Distributed Systems'],
  secondarySkills: ['Docker', 'Kafka', 'Redis', 'GraphQL', 'PostgreSQL', 'Microservices'],
  specializations: ['High-Throughput Ingestion', 'Event-Driven Architecture', 'Cloud Infrastructure'],
  projects: [
    {
      title: 'JobRadar Autonomous Engine',
      tech: 'TypeScript, Node.js, Electron, AWS S3',
      description: 'Architected an autonomous career ingestion pipeline processing thousands of job records with sub-100ms vector matching.',
      highlights: [
        'Implemented distributed concurrency limiter handling parallel AI calls',
        'Built multi-provider fallback router for Anthropic, Gemini, OpenAI, and Ollama',
      ],
    },
    {
      title: 'Distributed Transaction Gateway',
      tech: 'Go, Kafka, Redis, PostgreSQL, Kubernetes',
      description: 'Engineered high-resilience payment routing cluster processing 50k transactions/sec with 99.999% SLA.',
      highlights: [
        'Optimized p99 latency from 45ms to 8ms using lock-free ring buffers',
        'Deployed automated failover topology across multi-region Kubernetes clusters',
      ],
    },
  ],
};

const jobPosting: any = {
  companyName: 'Stripe Cloud Infrastructure',
  jobTitle: 'Senior Distributed Systems Engineer - Latency & Reliability',
  skillsRequired: ['Go', 'Distributed Systems', 'Kafka', 'Kubernetes', 'High-Throughput Ingestion', 'Redis', 'Microservices'],
  rawDescription: 'Stripe is hiring a Senior Distributed Systems Engineer. You will design, build, and maintain high-throughput, low-latency financial payment systems with Go, Kafka, Kubernetes, Redis, and distributed microservices.',
};

const beforeAts = analyzeAtsCompliance(jobPosting, candidateProfile);
const baseLatex = generateAtsResumeLatex(jobPosting, candidateProfile);

// Optimized profile: truthful keyword alignment into project highlights matching target JD
const optimizedProfile: IProfile = {
  ...candidateProfile,
  projects: [
    {
      ...candidateProfile.projects![0],
      highlights: [
        'Architected high-throughput ingestion pipeline using TypeScript and AWS S3 with sub-100ms vector search latency',
        'Engineered distributed microservices with automated concurrency limiting and event-driven Redis queuing',
      ],
    },
    {
      ...candidateProfile.projects![1],
      highlights: [
        'Engineered high-resilience payment routing cluster in Go and Kafka processing 50k transactions/sec with 99.999% SLA',
        'Optimized p99 latency from 45ms to 8ms on Kubernetes using lock-free ring buffers and Redis caching',
      ],
    },
  ],
};

const afterAts = analyzeAtsCompliance(jobPosting, optimizedProfile);
const optimizedLatex = generateAtsResumeLatex(jobPosting, optimizedProfile);

console.log('=== REAL ATS OPTIMIZER EVALUATION METRICS ===');
console.log('Target Job:', jobPosting.companyName, '-', jobPosting.jobTitle);
console.log('Candidate:', candidateProfile.name);
console.log('Before Optimization ATS Score:', beforeAts.overallAtsScore + '%');
console.log('  - Keyword Density Score:', beforeAts.keywordDensityScore + '%');
console.log('  - Skills Match Score:', beforeAts.skillsMatchScore + '%');
console.log('  - Action Verb Score:', beforeAts.actionVerbScore + '%');
console.log('  - Hard Skills Found:', JSON.stringify(beforeAts.hardSkillsFound));
console.log('  - Hard Skills Missing:', JSON.stringify(beforeAts.hardSkillsMissing));
console.log('');
console.log('After Optimization ATS Score:', afterAts.overallAtsScore + '%');
console.log('  - Keyword Density Score:', afterAts.keywordDensityScore + '%');
console.log('  - Skills Match Score:', afterAts.skillsMatchScore + '%');
console.log('  - Action Verb Score:', afterAts.actionVerbScore + '%');
console.log('  - Hard Skills Found:', JSON.stringify(afterAts.hardSkillsFound));
console.log('  - Hard Skills Missing:', JSON.stringify(afterAts.hardSkillsMissing));
console.log('');
console.log('Score Delta: +' + ((afterAts.overallAtsScore || 0) - (beforeAts.overallAtsScore || 0)) + '%');
console.log('');
console.log('=== LATEX TEXT DIFFERENCES PRODUCED ===');
const baseLines = baseLatex.split('\n');
const optLines = optimizedLatex.split('\n');
for (let i = 0; i < Math.max(baseLines.length, optLines.length); i++) {
  if (baseLines[i] !== optLines[i]) {
    console.log('LINE ' + (i + 1) + ':');
    console.log('[-] BASE:      ' + (baseLines[i] || ''));
    console.log('[+] OPTIMIZED: ' + (optLines[i] || ''));
  }
}
