export interface INoiseTriageResult {
  isJobPosting: boolean;
  confidenceScore: number; // 0 - 100
  signalScore: number;
  signalsFound: string[];
  reason: string;
  cleanedText: string;
}

const COMMON_NOISE_PHRASES = [
  /^(good\s*morning|good\s*night|gm|gn|hi|hello|hey|welcome|thank\s*you|thanks|ok|okay|k|yes|no|pls|please|who\s*is\s*admin|any\s*update)\b/i,
  /^(happy\s*(diwali|pongal|new\s*year|sankranti|birthday|weekend))\b/i,
  /\b(send\s*me\s*link|dm\s*me|interested|share\s*resume\s*to\s*my\s*inbox|add\s*me)\b/i,
];

const JOB_SIGNALS = [
  { regex: /\b(software\s*engineer|sde|full\s*stack|frontend|backend|mern|web\s*developer|project\s*engineer|systems\s*engineer|analyst|associate|intern|trainee)\b/i, weight: 2.5, label: 'Role Keyword' },
  { regex: /\b(hiring|recruitment|recruiting|walk-?in|drive|opening|openings|vacancies|job\s*opportunity|looking\s*for)\b/i, weight: 2.5, label: 'Hiring Action' },
  { regex: /\b(2024|2025|2026|mca|b\.?tech|bca|b\.?sc|freshers?|batch)\b/i, weight: 2.0, label: 'Batch / Degree' },
  { regex: /\b(\d+(\.\d+)?\s*(lpa|ctc|inr|lakhs?|per\s*annum|stipend|k\s*pm))\b/i, weight: 2.0, label: 'Salary / CTC' },
  { regex: /(https?:\/\/[^\s]+|forms\.gle\/[^\s]+|careers\.[^\s]+|jobs\.[^\s]+)/i, weight: 2.0, label: 'Apply URL / Form' },
  { regex: /\b(google|microsoft|amazon|infosys|tcs|wipro|cognizant|accenture|deloitte|capgemini|goldman\s*sachs|swiggy|zomato|adobe|cisco|oracle|zoho|jio)\b/i, weight: 2.0, label: 'Known Tech Company' },
  { regex: /\b(experience|eligibility|location|qualification|skills?\s*required|apply\s*link)\b/i, weight: 1.5, label: 'JD Structural Header' },
];

/**
 * 3-Tier Heuristic Triage Filter:
 * Evaluates whether an incoming chat/channel message is a valid job posting
 * or generic conversational noise/spam before entering the pipeline.
 */
export function evaluateNoiseTriage(rawText: string, channelName?: string): INoiseTriageResult {
  const text = (rawText || '').trim();
  const cleaned = text
    .replace(/<[^>]+>/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim();

  // Tier 1: Length & Character Structure Check
  if (!cleaned || cleaned.length < 25) {
    return {
      isJobPosting: false,
      confidenceScore: 0,
      signalScore: 0,
      signalsFound: [],
      reason: 'Message too short to be a substantive job posting (< 25 chars).',
      cleanedText: cleaned,
    };
  }

  // Check for common chit-chat / greeting spam
  for (const noisePattern of COMMON_NOISE_PHRASES) {
    if (noisePattern.test(cleaned) && cleaned.length < 60) {
      return {
        isJobPosting: false,
        confidenceScore: 5,
        signalScore: 0,
        signalsFound: [],
        reason: 'Message matched common casual greeting/chatter pattern.',
        cleanedText: cleaned,
      };
    }
  }

  // Tier 2: Job Signal Scoring
  let totalScore = 0;
  const signalsFound: string[] = [];

  for (const signal of JOB_SIGNALS) {
    if (signal.regex.test(cleaned)) {
      totalScore += signal.weight;
      signalsFound.push(signal.label);
    }
  }

  // Tier 3: Threshold Evaluation (Requires minimum combined weight of 3.5)
  const isJob = totalScore >= 3.5;
  const confidenceScore = Math.min(100, Math.round((totalScore / 10.0) * 100));

  return {
    isJobPosting: isJob,
    confidenceScore,
    signalScore: totalScore,
    signalsFound,
    reason: isJob
      ? `Verified job posting with signals: [${signalsFound.join(', ')}]`
      : `Insufficient job indicators (Score: ${totalScore.toFixed(1)}/3.5 needed).`,
    cleanedText: cleaned,
  };
}
