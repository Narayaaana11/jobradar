import { IJob, IProfile, ISalaryNegotiationSuite } from './types';
import { llmClient } from './llmClient';

/**
 * JobRadar Salary Gap & Counter-Offer Negotiation Advisor
 * 
 * Computes compensation benchmarks, evaluates gap vs target CTC,
 * and generates actionable negotiation email scripts and talking points.
 */

export class SalaryNegotiationService {
  /**
   * Deterministic Negotiation Suite Builder
   */
  public generateNegotiationSuite(job: IJob, profile: IProfile): ISalaryNegotiationSuite {
    const isInternship = job.jobType?.toLowerCase().includes('intern') || job.jobTitle.toLowerCase().includes('intern');
    const targetCtc = isInternship ? '₹30,000 - ₹50,000 / month' : '₹10 - ₹16 LPA';
    const marketBenchmark = isInternship ? '₹25,000 - ₹45,000 / month' : '₹8 - ₹15 LPA (Tier-1 Tech / Product SDE-1)';

    const keyPoints = [
      `Demonstrated production impact across full stack systems (${profile.primarySkills.slice(0, 3).join(', ')}).`,
      `Rapid onboarding velocity and self-directed problem-solving track record.`,
      `Commitment to long-term engineering ownership and scalable architecture.`,
      `Competitive industry benchmarks for equivalent technical roles in India.`,
    ];

    const counterOfferScript = `Dear [Hiring Manager / Recruiter Name],\n\nThank you very much for extending the offer for the ${job.jobTitle} position at ${job.companyName}. I am genuinely thrilled about the team's mission and the technical challenges ahead.\n\nAfter carefully reviewing the compensation package and considering my technical expertise in ${profile.primarySkills.slice(0, 3).join(', ')}, as well as current market benchmarks for equivalent roles, I would like to discuss whether there is flexibility regarding the base compensation.\n\nSpecifically, a base CTC of ${targetCtc} would reflect my ability to deliver immediate value and hit the ground running without ramp-up overhead. If we can reach agreement on this figure, I would be delighted to sign the offer immediately.\n\nThank you again for your time and support throughout the process. I look forward to your thoughts.\n\nWarm regards,\n${profile.name}\n${profile.phone}`;

    const remoteCompPushbackScript = `Hi [Recruiter Name],\n\nThank you for sharing the geographic compensation breakdown. While I understand ${job.companyName}'s location-based tiering policy, my technical deliverables, system reliability contributions, and daily impact will match the highest organizational standards regardless of physical desk location.\n\nGiven this, I would appreciate exploring whether we can calibrate the base CTC closer to the national product benchmark (${targetCtc}), or alternatively structure additional sign-on / milestone incentives.\n\nBest regards,\n${profile.name}`;

    const competingOfferScript = `Hi [Recruiter Name],\n\nI wanted to provide a transparent update regarding my hiring process. I have received another competitive offer in the range of ${targetCtc}.\n\nHowever, because I am deeply impressed by ${job.companyName}'s engineering culture and roadmap, ${job.companyName} remains my top choice. If we are able to adjust the compensation package closer to this benchmark, I would gladly decline other conversations and commit to ${job.companyName}.\n\nBest regards,\n${profile.name}`;

    return {
      targetCtc,
      marketBenchmark,
      gapAnalysis: job.ctcRange
        ? `Job budget listed at ${job.ctcRange}. Target calibration: ${targetCtc}.`
        : `No explicit CTC stated in JD. Market benchmark for ${job.jobTitle} at ${job.companyName} is ${marketBenchmark}.`,
      counterOfferEmailScript: counterOfferScript,
      remoteCompPushbackScript,
      competingOfferLeverageScript: competingOfferScript,
      keyTalkingPoints: keyPoints,
    };
  }

  /**
   * AI-Augmented Negotiation Suite Builder
   */
  public async generateNegotiationWithAi(
    job: IJob,
    profile: IProfile,
    apiKey?: string
  ): Promise<ISalaryNegotiationSuite> {
    if (!apiKey) {
      return this.generateNegotiationSuite(job, profile);
    }

    try {
      const systemPrompt = `You are a Principal JobRadar Executive Negotiation Coach.
Generate a tailored compensation negotiation package for a software engineering candidate, including market benchmark analysis, counter-offer email scripts, remote discount pushback, and competing offer leverage points.
Return strictly valid JSON without markdown wrapping.`;

      const prompt = `JOB:
Company: ${job.companyName}
Role: ${job.jobTitle}
CTC Mentioned in JD: ${job.ctcRange || 'Not specified'}

CANDIDATE:
Name: ${profile.name}
Core Skills: ${profile.primarySkills.join(', ')}

SCHEMA:
{
  "targetCtc": "Realistic target CTC string",
  "marketBenchmark": "Benchmark range string",
  "gapAnalysis": "2-sentence strategic gap summary",
  "counterOfferEmailScript": "Polite, firm counter-offer letter text",
  "remoteCompPushbackScript": "Script challenging geographic discounts",
  "competingOfferLeverageScript": "Script leveraging competing interest",
  "keyTalkingPoints": ["Point 1", "Point 2", "Point 3"]
}`;

      const { text } = await llmClient.callLlm(prompt, systemPrompt, apiKey);
      const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);

      if (parsed.targetCtc && parsed.counterOfferEmailScript) {
        return {
          targetCtc: parsed.targetCtc,
          marketBenchmark: parsed.marketBenchmark || 'Competitive Market Rate',
          gapAnalysis: parsed.gapAnalysis || 'Benchmark calibrated.',
          counterOfferEmailScript: parsed.counterOfferEmailScript,
          remoteCompPushbackScript: parsed.remoteCompPushbackScript || this.generateNegotiationSuite(job, profile).remoteCompPushbackScript,
          competingOfferLeverageScript: parsed.competingOfferLeverageScript || this.generateNegotiationSuite(job, profile).competingOfferLeverageScript,
          keyTalkingPoints: Array.isArray(parsed.keyTalkingPoints) ? parsed.keyTalkingPoints : this.generateNegotiationSuite(job, profile).keyTalkingPoints,
        };
      }
    } catch {
      // Fallback
    }

    return this.generateNegotiationSuite(job, profile);
  }
}

export const salaryNegotiation = new SalaryNegotiationService();
