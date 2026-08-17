import { llmService } from './llmService';

export interface IInterviewQuestion {
  category: 'Technical' | 'System Architecture' | 'Behavioral' | 'Company Specific';
  question: string;
  suggestedAnswer: string;
  keyConcepts: string[];
}

export interface IInterviewPrepResult {
  roleOverview: string;
  technicalTopics: string[];
  questions: IInterviewQuestion[];
  starBehavioralNotes: string[];
}

function extractJsonBlock(text: string): string {
  const jsonBlockMatch = text.match(/```json\s*([\s\S]*?)\s*```/i);
  if (jsonBlockMatch) return jsonBlockMatch[1].trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    return text.slice(start, end + 1);
  }
  return text.replace(/```json/g, '').replace(/```/g, '').trim();
}

export async function generateInterviewPrep(jobDetails: any): Promise<IInterviewPrepResult> {
  const company = (jobDetails.companyName || 'Company').trim();
  const role = (jobDetails.jobTitle || 'Software Engineer').trim();
  const skills = jobDetails.skillsRequired || ['React.js', 'Node.js', 'MongoDB', 'REST APIs', 'DSA'];

  const prompt = `You are an elite Technical Interview Preparation Coach specializing in candidate Narayana Thota (MCA 2026 Batch, Full Stack MERN & Python developer).

Generate a comprehensive company-specific Technical Interview Prep Guide for:
- Role: ${role}
- Company: ${company}
- Key Required Skills: ${skills.join(', ')}

Return ONLY a JSON object with this exact structure:
{
  "roleOverview": "Brief 2-sentence summary of what technical interviewers at ${company} will evaluate for ${role}.",
  "technicalTopics": ["${skills[0] || 'React.js'}", "${skills[1] || 'Node.js'}", "Data Structures & Algorithms", "System Architecture"],
  "questions": [
    {
      "category": "Technical",
      "question": "How would you optimize MongoDB aggregation pipelines for high-concurrency real-time dashboards?",
      "suggestedAnswer": "In my AUSVMS project, I implemented compound indexing on visitor log timestamps and utilized \$match and \$project stages early in the pipeline to cut query latency from minutes to seconds.",
      "keyConcepts": ["Indexing", "\$match", "Aggregation Pipelines", "Query Latency"]
    },
    {
      "category": "System Architecture",
      "question": "How do you handle JWT authentication and state synchronization across React frontend and Express microservices?",
      "suggestedAnswer": "I store short-lived JWTs in HTTP-only cookies to mitigate XSS, use Axios request interceptors for automatic token refresh, and maintain global state via React Context/Redux.",
      "keyConcepts": ["JWT", "HTTP-Only Cookies", "Axios Interceptors", "State Sync"]
    },
    {
      "category": "Behavioral",
      "question": "Describe a time you detected and fixed a critical scheduling bug under tight deadlines.",
      "suggestedAnswer": "While engineering Guard Hub for 100+ campus guards, I built a shift constraint validation engine that automatically detected rotating shift collisions across 4 patterns, saving 5+ manual audit hours weekly.",
      "keyConcepts": ["Constraint Validation", "Edge Case Testing", "Problem Solving"]
    },
    {
      "category": "Company Specific",
      "question": "Why do you want to join ${company} as a ${role}?",
      "suggestedAnswer": "${company}'s focus on engineering excellence aligns directly with my hands-on background in full-stack web applications and AI agent pipeline orchestration.",
      "keyConcepts": ["Company Alignment", "Engineering Excellence"]
    }
  ],
  "starBehavioralNotes": [
    "Situation: Shift allocation for 100+ guards was tracked manually. Action: Built Guard Hub scheduling engine. Result: Reduced 5+ audit hours weekly.",
    "Situation: High latency in manual visitor lookup. Action: Designed MongoDB aggregation pipelines in AUSVMS. Result: Cut lookup time to seconds."
  ]
}`;

  try {
    const textContent = await llmService.completion(prompt, { model: 'sonnet', maxTokens: 2500 });
    const cleanedJson = extractJsonBlock(textContent);
    const parsed: IInterviewPrepResult = JSON.parse(cleanedJson);

    if (parsed && Array.isArray(parsed.questions)) {
      return parsed;
    }
  } catch (error: any) {
    console.warn('[InterviewPrepAgent] LLM unavailable/limit reached. Using structured fallback prep guide:', error.message);
  }

  // Structured Fallback
  return {
    roleOverview: `Interviewers at ${company} evaluating candidates for ${role} will focus heavily on core full-stack engineering principles, system design scalability, and practical project implementations.`,
    technicalTopics: [...skills.slice(0, 4), 'Data Structures & Algorithms', 'REST API Security'],
    questions: [
      {
        category: 'Technical',
        question: `What architecture patterns would you use to build scalable REST microservices for ${role} at ${company}?`,
        suggestedAnswer: `I design modular Express.js controllers with middleware-based JWT validation, standard error-handling wrappers, and MongoDB Mongoose schema models optimized with index coverage.`,
        keyConcepts: ['RESTful Design', 'JWT Security', 'Express Middleware', 'Indexing'],
      },
      {
        category: 'System Architecture',
        question: `How do you ensure zero-downtime state synchronization between React clients and backend databases?`,
        suggestedAnswer: `I leverage optimistic UI updates coupled with WebSockets (Socket.io) or polling fallbacks to ensure instant visual feedback while reconciling state against database mutations.`,
        keyConcepts: ['Optimistic Updates', 'Socket.io', 'State Reconciliation'],
      },
      {
        category: 'Behavioral',
        question: `Can you walk us through your most complex technical project and the impact it achieved?`,
        suggestedAnswer: `I engineered AUSVMS (Visitor Management System) with role-based access control across 4 account types and real-time OTP verification, replacing paper-based front-desk workflows.`,
        keyConcepts: ['RBAC', 'Real-time OTP', 'Full Stack Ownership'],
      },
      {
        category: 'Company Specific',
        question: `How does your MCA background prepare you to contribute to ${company}'s development team?`,
        suggestedAnswer: `My MCA coursework in DSA and OOP, combined with hands-on internship experience building production React and Node.js applications, enables me to ship clean, maintainable code quickly.`,
        keyConcepts: ['Computer Science Fundamentals', 'Production Readiness'],
      },
    ],
    starBehavioralNotes: [
      'Situation: Campus visitor verification was paper-based and slow. Action: Built AUSVMS with real-time OTP check-ins and RBAC. Result: Automated verification completely.',
      'Situation: Shift scheduling for 100+ security personnel took hours. Action: Engineered Guard Hub shift constraint engine. Result: Saved 5+ scheduling hours weekly.',
    ],
  };
}
