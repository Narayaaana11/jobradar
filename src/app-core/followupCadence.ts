import { IJob, IProfile, IFollowupCadenceSuite, IFollowupScheduleItem } from './types';
import { llmClient } from './llmClient';

/**
 * JobRadar Automated Follow-Up Cadence Engine
 * 
 * Computes scheduled follow-up milestones for active job applications:
 * - Day 3: Warm Ping (LinkedIn / Recruiter message)
 * - Day 7: First Formal Pipeline Check-in
 * - Day 14: Subsequent Follow-up Inquiry
 * - Day 1 Post-Interview: 24-Hour Personalized Thank-You Email
 */

export function generateFollowupCadence(job: IJob, profile: IProfile, appliedDateStr?: string | null): IFollowupCadenceSuite {
  const baseDate = appliedDateStr ? new Date(appliedDateStr) : new Date(job.createdAt || Date.now());
  const now = Date.now();

  const addDays = (d: Date, days: number): string => {
    const next = new Date(d.getTime() + days * 24 * 60 * 60 * 1000);
    return next.toISOString().split('T')[0];
  };

  const isOverdue = (targetDateStr: string): boolean => {
    return new Date(targetDateStr).getTime() < now;
  };

  const day3Date = addDays(baseDate, 3);
  const day7Date = addDays(baseDate, 7);
  const day14Date = addDays(baseDate, 14);
  const postInterviewDate = addDays(new Date(), 1);

  const keySkills = (job.skillsRequired && job.skillsRequired.length > 0
    ? job.skillsRequired.slice(0, 3)
    : profile.primarySkills.slice(0, 3)
  ).join(', ');

  const items: IFollowupScheduleItem[] = [
    {
      id: `cadence-d3-${job.id}`,
      milestone: 'Day 3 Warm Ping',
      daysAfterApplication: 3,
      scheduledDate: day3Date,
      isOverdue: isOverdue(day3Date) && job.applicationStatus === 'applied',
      completed: false,
      targetPersona: 'Recruiter / Senior Engineer',
      subject: `Re: Application for ${job.jobTitle} - ${profile.name}`,
      messageBody: `Hi team,\n\nI recently submitted my application for the ${job.jobTitle} position at ${job.companyName}. Given my background in ${keySkills} and track record of building production systems, I wanted to reach out directly to express my strong enthusiasm for ${job.companyName}'s engineering roadmap.\n\nI'd welcome the opportunity to share how my experience aligns with your team's goals.\n\nBest regards,\n${profile.name}\n${profile.linkedin}`,
    },
    {
      id: `cadence-d7-${job.id}`,
      milestone: 'Day 7 Recruiter Check-in',
      daysAfterApplication: 7,
      scheduledDate: day7Date,
      isOverdue: isOverdue(day7Date) && job.applicationStatus === 'applied',
      completed: false,
      targetPersona: 'Lead Tech Recruiter',
      subject: `Following up: ${job.jobTitle} application - ${profile.name}`,
      messageBody: `Dear Hiring Team,\n\nI am writing to follow up on my application for the ${job.jobTitle} role submitted on ${baseDate.toLocaleDateString()}.\n\nI remain very interested in contributing to ${job.companyName}. Please let me know if you need any additional portfolio samples, code repositories, or background information.\n\nThank you for your time and consideration.\n\nSincerely,\n${profile.name}\n${profile.phone} | ${profile.email}`,
    },
    {
      id: `cadence-d14-${job.id}`,
      milestone: 'Day 14 Subsequent Follow-up',
      daysAfterApplication: 14,
      scheduledDate: day14Date,
      isOverdue: isOverdue(day14Date) && job.applicationStatus === 'applied',
      completed: false,
      targetPersona: 'Hiring Manager / Department Head',
      subject: `Status inquiry: ${job.jobTitle} application - ${profile.name}`,
      messageBody: `Hello,\n\nI hope you are having a productive week. I wanted to check in regarding the status of the ${job.jobTitle} position at ${job.companyName}.\n\nI have continued tracking ${job.companyName}'s growth and remain excited about the prospect of bringing my experience in ${keySkills} to the team.\n\nLooking forward to hearing from you regarding any updates.\n\nWarm regards,\n${profile.name}`,
    },
    {
      id: `cadence-thankyou-${job.id}`,
      milestone: 'Post-Interview 24h Thank-You',
      daysAfterApplication: 1,
      scheduledDate: postInterviewDate,
      isOverdue: false,
      completed: false,
      targetPersona: 'Interview Panel & Hiring Manager',
      subject: `Thank you - ${job.jobTitle} interview discussion`,
      messageBody: `Hi [Interviewer Name],\n\nThank you so much for taking the time to speak with me today about the ${job.jobTitle} role at ${job.companyName}. I thoroughly enjoyed learning more about your technical architecture, particularly regarding your team's approach to scalability and system reliability.\n\nOur conversation reinforced my excitement about joining ${job.companyName}. Please feel free to reach out if you need any follow-up documentation or code references.\n\nBest regards,\n${profile.name}\n${profile.email}`,
    },
  ];

  return {
    appliedDate: appliedDateStr || baseDate.toISOString().split('T')[0],
    items,
  };
}

/**
 * AI-Augmented Follow-Up Cadence Generator
 */
export async function generateFollowupCadenceWithAi(
  job: IJob,
  profile: IProfile,
  apiKey?: string
): Promise<IFollowupCadenceSuite> {
  if (!apiKey) {
    return generateFollowupCadence(job, profile);
  }

  try {
    const res = await llmClient.generateAiFollowupCadence(job, profile, apiKey);
    if (res.success && res.data) {
      return res.data;
    }
  } catch {
    // Fallback
  }

  return generateFollowupCadence(job, profile);
}

