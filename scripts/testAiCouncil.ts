import { aiCouncil } from '../src/app-core/aiCouncil';
import { IProfile, IJob } from '../src/app-core/types';

const profile: IProfile = {
  name: 'Veera Venkata Naga Satyanarayana Thota',
  title: 'Full Stack MERN & Distributed Systems Developer',
  email: 'narayananaiduthota@gmail.com',
  phone: '+91 6301253789',
  location: 'Kakinada, Andhra Pradesh, India',
  linkedin: 'https://www.linkedin.com/in/narayaaana/',
  github: 'https://github.com/Narayaaana11',
  portfolio: 'https://www.narayanathota.me',
  education: 'Master of Computer Applications (MCA) — Aditya University (2024–2026)',
  primarySkills: ['React', 'TypeScript', 'Node.js', 'Express', 'MongoDB', 'AWS S3', 'Data Structures', 'REST APIs'],
  specializations: ['Full Stack Web Development', 'MERN Stack', 'Distributed Systems'],
  experience: 'Full Stack Development Intern @ Technical Hub Pvt. Ltd. (Nov 2024 - Present)',
  projects: [
    {
      title: 'AUSVMS (Aditya University Security & Visitor Management System)',
      tech: 'React, TypeScript, Node.js, Express, MongoDB, AWS S3',
      description: 'Role-based visitor pass generation and real-time gate security dashboard.',
      highlights: ['Engineered digital gate-pass tracking', 'AWS S3 encrypted photo logs'],
    },
  ],
};

const sampleJob: Partial<IJob> = {
  companyName: 'Amazon',
  jobTitle: 'Software Development Engineer - I (SDE-1)',
  location: 'Bengaluru / Hyderabad, India',
  skillsRequired: ['Data Structures & Algorithms', 'JavaScript', 'TypeScript', 'React', 'Node.js', 'Distributed Systems', 'REST APIs'],
  experienceRequired: '0-2 years / 2026 Batch Graduates',
  rawDescription: 'Amazon is hiring SDE-1 for university graduates (2026 Batch). Responsibilities include designing scalable cloud services, writing clean TypeScript/React interfaces, and building high-throughput APIs.',
};

async function runCouncilTest() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error('❌ Missing OPENROUTER_API_KEY environment variable');
    process.exit(1);
  }

  console.log('================================================================');
  console.log('🏛️ CONVENING MULTI-MODEL AI COUNCIL ON LIVE OPENROUTER FREE TIER');
  console.log('================================================================\n');

  console.log(`Target Role: ${sampleJob.companyName} — ${sampleJob.jobTitle}`);
  console.log(`Candidate: ${profile.name} (${profile.education})\n`);

  const startTime = Date.now();
  const res = await aiCouncil.conveneAiCouncil(sampleJob, profile, apiKey);
  const elapsed = Date.now() - startTime;

  if (!res.success || !res.data) {
    console.error('❌ AI Council Deliberation Failed:', res.error);
    process.exit(1);
  }

  const verdict = res.data;

  console.log('----------------------------------------------------------------');
  console.log('📋 COUNCIL MEMBER DELIBERATION VOTES (3 INDEPENDENT AGENTS):');
  console.log('----------------------------------------------------------------');
  verdict.memberVotes.forEach((vote, idx) => {
    console.log(`\n[Agent #${idx + 1}] ${vote.role}`);
    console.log(`   Model Used:  ${vote.modelUsed}`);
    console.log(`   Score:       ${vote.score}% (${vote.verdict})`);
    console.log(`   Reasoning:   ${vote.reasoning}`);
    console.log(`   Findings:    ${vote.keyFindings.join(' • ')}`);
  });

  console.log('\n================================================================');
  console.log('🏆 COUNCIL CHAIR SYNTHESIS & FINAL CONSENSUS VERDICT');
  console.log('================================================================');
  console.log(`Chair Model:    ${verdict.chairModelUsed}`);
  console.log(`Consensus Score:${verdict.consensusScore}%`);
  console.log(`Rubric Tier:    ${verdict.consensusRubricTier}`);
  console.log(`Recommendation: ${verdict.consensusRecommendation.toUpperCase()}`);
  console.log(`Deliberation Time: ${elapsed}ms\n`);
  console.log(`Synthesis:\n${verdict.chairSynthesis}\n`);
  console.log(`Tailored Strategy:\n${verdict.tailoredStrategy}\n`);
  console.log(`Reconciled Gaps to Address:\n${verdict.reconciledGaps.map((g) => ` • ${g}`).join('\n')}\n`);
  console.log('================================================================');
  console.log('✅ AI COUNCIL DELIBERATION TEST PASSED');
  console.log('================================================================');
}

runCouncilTest().catch((err) => {
  console.error(err);
  process.exit(1);
});
