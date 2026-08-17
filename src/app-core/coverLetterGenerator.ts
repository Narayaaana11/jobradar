import { IProfile } from './types';
import { IExtractedJD } from './extractor';

export function generateCoverLetter(job: IExtractedJD, profile: IProfile): string {
  const company = job.companyName || 'Hiring Team';
  const role = job.jobTitle || 'Software Engineer';
  const skillsList = (job.skillsRequired || ['TypeScript', 'React', 'Node.js', 'REST APIs']).slice(0, 4).join(', ');

  return `Dear ${company} Hiring Team,

I am writing to express my enthusiastic interest in the ${role} opening at ${company}. As a Full Stack Engineer and Master of Computer Applications (MCA 2026) candidate with deep technical hands-on experience in modern TypeScript, React, Next.js, Node.js, and autonomous LLM agent systems, I am excited about the opportunity to contribute to ${company}'s forward-thinking engineering initiatives.

Throughout my software engineering journey, I have focused on building robust, scalable applications from the ground up. My experience includes:
• Architecting full-stack systems with React 18, Next.js App Router, and modular Node.js/Express backends.
• Developing high-throughput data pipelines and desktop integration engines handling tens of thousands of transactional records with strict reliability.
• Implementing clean, ATS-compliant user experiences, component-driven design systems with Tailwind CSS, and optimized database queries in MongoDB and PostgreSQL.

Your opening for ${role} strongly resonates with my background in ${skillsList}. I am known for my quick learning curve, rigorous problem-solving approach, and relentless focus on code quality and performance.

I would welcome the opportunity to discuss how my technical skills, passion for building impactful software, and proactive work ethic can add immediate value to ${company}.

Thank you for your time and consideration.

Sincerely,
${profile.name}
${profile.phone} | ${profile.email}
LinkedIn: ${profile.linkedin}
Portfolio: ${profile.portfolio}
GitHub: ${profile.github}`;
}
