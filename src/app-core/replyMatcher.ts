import { IReplyClassification, IJob, IProfile } from './types';
import { llmClient } from './llmClient';

/**
 * JobRadar Recruiter Reply Matcher & Inbound Email Classifier
 * 
 * Classifies employer responses into actionable categories:
 * - interview_invite (Phone Screen, Technical Round, System Design, Onsite)
 * - assessment_request (Take-home project, HackerRank, LeetCode assessment)
 * - rejection (Standard automated, warm feedback, talent pool save)
 * - offer (Verbal offer, official compensation letter)
 * - more_info_needed (Work authorization confirmation, transcripts, portfolio)
 */

export class ReplyMatcherService {
  /**
   * Deterministic Heuristic Matcher
   */
  public classifyHeuristic(rawText: string, job?: IJob, profile?: IProfile): IReplyClassification {
    const text = (rawText || '').trim();
    const lower = text.toLowerCase();

    // 1. Check for Offer
    if (
      lower.includes('pleased to offer') ||
      lower.includes('congratulations on your offer') ||
      lower.includes('offer letter') ||
      lower.includes('compensation package') ||
      lower.includes('formal offer')
    ) {
      return {
        intent: 'offer',
        confidence: 95,
        extractedDetails: {
          offeredCtc: text.match(/(?:₹|\$|inr|lpa|usd)\s*[\d,.]+/i)?.[0],
        },
        suggestedNextAction: 'Review compensation package, benchmark market CTC, and prepare negotiation strategy.',
        suggestedStageUpdate: 'offer',
        draftedResponse: `Dear Hiring Team,\n\nThank you very much for extending this offer for the ${job?.jobTitle || 'position'} at ${job?.companyName || 'the company'}. I am thrilled about the opportunity to join the team!\n\nI will review the detailed terms and compensation package carefully and get back to you with my confirmation shortly.\n\nBest regards,\n${profile?.name || 'Candidate'}`,
      };
    }

    // 2. Check for Assessment / Take-Home
    if (
      lower.includes('hackerrank') ||
      lower.includes('codility') ||
      lower.includes('leetcode') ||
      lower.includes('online assessment') ||
      lower.includes('coding challenge') ||
      lower.includes('take-home') ||
      lower.includes('assignment')
    ) {
      return {
        intent: 'assessment_request',
        confidence: 90,
        extractedDetails: {
          assessmentPlatform: lower.includes('hackerrank') ? 'HackerRank' : lower.includes('codility') ? 'Codility' : 'Coding Challenge',
        },
        suggestedNextAction: 'Review DSA topics, system architecture concepts, and complete within the deadline window.',
        suggestedStageUpdate: 'interview',
        draftedResponse: `Hi,\n\nThank you for sharing the technical assessment details. I have received the test link and will complete it within the designated timeframe.\n\nLooking forward to progressing to the next stage!\n\nBest regards,\n${profile?.name || 'Candidate'}`,
      };
    }

    // 3. Check for Interview Invite
    if (
      lower.includes('invite you to an interview') ||
      lower.includes('invite you for a') ||
      lower.includes('invite you to interview') ||
      lower.includes('interview with') ||
      lower.includes('technical screen') ||
      lower.includes('technical round') ||
      lower.includes('phone screen') ||
      lower.includes('schedule a call') ||
      lower.includes('calendar link') ||
      lower.includes('calendly') ||
      lower.includes('screening call') ||
      lower.includes('time to speak') ||
      lower.includes('available for a quick chat') ||
      lower.includes('speak with you') ||
      lower.includes('chat about your background') ||
      lower.includes('introductory call') ||
      lower.includes('interview process')
    ) {
      return {
        intent: 'interview_invite',
        confidence: 92,
        extractedDetails: {},
        suggestedNextAction: 'Confirm availability within 2-4 hours, review company interview questions, and prep STAR stories.',
        suggestedStageUpdate: 'interview',
        draftedResponse: `Hi,\n\nThank you for reaching out! I would be delighted to speak with you regarding the ${job?.jobTitle || 'role'} at ${job?.companyName || 'your company'}.\n\nI am available at your suggested times. Please send through the calendar invite, and I look forward to our discussion.\n\nWarm regards,\n${profile?.name || 'Candidate'}\n${profile?.phone || ''}`,
      };
    }

    // 4. Check for Rejection
    if (
      lower.includes('not moving forward') ||
      lower.includes('other candidates') ||
      lower.includes('decided to pursue') ||
      lower.includes('wish you the best in your job search') ||
      lower.includes('unfortunately') ||
      lower.includes('at this time we will not')
    ) {
      return {
        intent: 'rejection',
        confidence: 90,
        extractedDetails: {},
        suggestedNextAction: 'Send a gracious, professional keep-in-touch note to keep the recruiter in your warm network.',
        suggestedStageUpdate: 'rejected',
        draftedResponse: `Hi,\n\nThank you for getting back to me and for considering my application for the ${job?.jobTitle || 'position'}.\n\nWhile I am disappointed that it didn't work out this time, I truly appreciate the update and enjoyed learning more about ${job?.companyName || 'your company'}. Please feel free to keep my details on file for future engineering opportunities.\n\nBest wishes to the team,\n${profile?.name || 'Candidate'}`,
      };
    }

    // 5. More Info Needed
    if (lower.includes('portfolio') || lower.includes('github') || lower.includes('work authorization') || lower.includes('notice period')) {
      return {
        intent: 'more_info_needed',
        confidence: 80,
        extractedDetails: {},
        suggestedNextAction: 'Provide the requested documentation promptly.',
        draftedResponse: `Hi,\n\nThank you for the update. Per your request, please find the required details below:\n\n- GitHub / Portfolio: ${profile?.github || ''}\n- Notice Period: Immediate / 15 Days\n- Current Location: ${profile?.location || 'India'}\n\nPlease let me know if you need any further information.\n\nBest regards,\n${profile?.name || 'Candidate'}`,
      };
    }

    return {
      intent: 'unknown',
      confidence: 40,
      extractedDetails: {},
      suggestedNextAction: 'Review the message content manually.',
      draftedResponse: `Hi,\n\nThank you for your message regarding the ${job?.jobTitle || 'role'} at ${job?.companyName || 'your organization'}.\n\nBest regards,\n${profile?.name || 'Candidate'}`,
    };
  }

  /**
   * AI-Powered Classifier (with OpenRouter LLM reasoning)
   */
  public async classifyWithAi(
    rawText: string,
    job?: IJob,
    profile?: IProfile,
    apiKey?: string
  ): Promise<IReplyClassification> {
    if (!apiKey) {
      return this.classifyHeuristic(rawText, job, profile);
    }

    try {
      const systemPrompt = `You are a JobRadar Inbound Recruiter Response Classifier.
Analyze the employer's email or message, determine the exact category (interview_invite, assessment_request, rejection, offer, more_info_needed), extract critical details, suggest the best next step, and draft an ultra-professional, courteous reply.
Return strictly valid JSON without markdown wrapping.`;

      const prompt = `INBOUND RECRUITER MESSAGE:
"${rawText}"

CANDIDATE:
Name: ${profile?.name || 'Candidate'}
Target Role: ${job?.jobTitle || 'Software Engineer'}
Company: ${job?.companyName || 'Target Company'}

SCHEMA:
{
  "intent": "interview_invite | assessment_request | rejection | offer | more_info_needed | unknown",
  "confidence": 95,
  "extractedDetails": {
    "interviewerName": "Name or null",
    "interviewDate": "Date or null",
    "assessmentPlatform": "Platform or null",
    "deadline": "Deadline or null",
    "offeredCtc": "CTC or null"
  },
  "suggestedNextAction": "Clear advice for candidate",
  "suggestedStageUpdate": "interview | offer | rejected | null",
  "draftedResponse": "Complete, polite, ready-to-send reply message"
}`;

      const { text } = await llmClient.callLlm(prompt, systemPrompt, apiKey);
      const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);

      return {
        intent: parsed.intent || 'unknown',
        confidence: parsed.confidence || 85,
        extractedDetails: parsed.extractedDetails || {},
        suggestedNextAction: parsed.suggestedNextAction || 'Review response details.',
        suggestedStageUpdate: parsed.suggestedStageUpdate || undefined,
        draftedResponse: parsed.draftedResponse || this.classifyHeuristic(rawText, job, profile).draftedResponse,
      };
    } catch {
      return this.classifyHeuristic(rawText, job, profile);
    }
  }
}

export const replyMatcher = new ReplyMatcherService();
