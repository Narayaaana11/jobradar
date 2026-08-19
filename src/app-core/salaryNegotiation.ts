import { IJob, IProfile, ISalaryNegotiationSuite } from './types';
import { llmClient } from './llmClient';

/**
 * JobRadar Salary Gap & Counter-Offer Negotiation Advisor
 */
export class SalaryNegotiationService {
  /**
   * Deterministic Negotiation Suite Builder (fallback when offline)
   */
  public generateNegotiationSuite(job: IJob, profile: IProfile): ISalaryNegotiationSuite {
    const isInternship = job.jobType?.toLowerCase().includes('intern') || job.jobTitle.toLowerCase().includes('intern');
    const targetCtc = job.ctcRange
      ? job.ctcRange
      : isInternship
      ? '₹35,000 - ₹60,000 / month'
      : '₹12 - ₹18 LPA';
    const marketBenchmark = isInternship
      ? '₹25,000 - ₹50,000 / month (Tier-1 Product Intern)'
      : '₹10 - ₹18 LPA (Tier-1 Tech / Product SDE-1)';

    const keyPoints = [
      `Demonstrated production impact across engineering systems (${profile.primarySkills.slice(0, 3).join(', ')}).`,
      `Rapid onboarding velocity and verified record building scalable software.`,
      `Commitment to long-term engineering ownership and scalable architecture.`,
      `Competitive industry benchmarks for equivalent technical roles.`,
    ];

    const counterOfferScript = `Dear [Hiring Team],\n\nThank you very much for extending the offer for the ${job.jobTitle} position at ${job.companyName}. I am genuinely excited about the team's roadmap and technical challenges ahead.\n\nAfter reviewing the compensation structure against industry benchmarks and my technical capabilities in ${profile.primarySkills.slice(0, 3).join(', ')}, I would like to explore whether there is flexibility regarding the base compensation.\n\nSpecifically, a base CTC of ${targetCtc} would reflect my ability to deliver immediate value. If we can reach agreement on this figure, I am prepared to sign and accept immediately.\n\nThank you again for your consideration.\n\nWarm regards,\n${profile.name}\n${profile.phone}`;

    const remoteCompPushbackScript = `Hi [Recruiter Name],\n\nThank you for sharing the geographic compensation breakdown. While I understand ${job.companyName}'s location-based tiering policy, my technical deliverables and engineering impact will match high organizational standards regardless of physical desk location.\n\nGiven this, I would appreciate exploring whether we can calibrate the base CTC closer to the national product benchmark (${targetCtc}).\n\nBest regards,\n${profile.name}`;

    const competingOfferScript = `Hi [Recruiter Name],\n\nI wanted to provide a transparent update regarding my interview conversations. I have received competing interest in the range of ${targetCtc}.\n\nBecause I am deeply impressed by ${job.companyName}'s engineering culture, ${job.companyName} remains my top choice. If we are able to calibrate the package closer to this benchmark, I would gladly commit to ${job.companyName}.\n\nBest regards,\n${profile.name}`;

    return {
      targetCtc,
      marketBenchmark,
      gapAnalysis: job.ctcRange
        ? `Job compensation listed at ${job.ctcRange}. Target calibration: ${targetCtc}.`
        : `No explicit CTC stated in JD. Market benchmark for ${job.jobTitle} at ${job.companyName} is ${marketBenchmark}.`,
      counterOfferEmailScript: counterOfferScript,
      remoteCompPushbackScript,
      competingOfferLeverageScript: competingOfferScript,
      keyTalkingPoints: keyPoints,
    };
  }

  /**
   * Primary AI-Native Negotiation Suite Builder
   */
  public async generateNegotiationWithAi(
    job: IJob,
    profile: IProfile,
    _apiKey?: string
  ): Promise<ISalaryNegotiationSuite> {
    const res = await llmClient.generateAiSalaryNegotiation(job, profile);
    if (res.success && res.data) {
      return res.data;
    }
    return this.generateNegotiationSuite(job, profile);
  }
}

export const salaryNegotiation = new SalaryNegotiationService();
