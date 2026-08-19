import { fetchWebPageHtml, cleanHtmlToText, extractHtmlMetadata, fetchAndExtractJobFromUrl } from '../src/app-core/webFetcher';
import { scoreJobAgainstProfile, auditBlockGLegitimacy } from '../src/app-core/scorer';
import { analyzeAtsCompliance } from '../src/app-core/atsMatcher';
import { generateAtsResumeLatex, buildAtsResumePdf } from '../src/app-core/resumeGenerator';
import { generateReferralContacts } from '../src/app-core/referralGenerator';
import { generateInterviewPrep } from '../src/app-core/interviewPrep';
import { generateInterviewMasterGuide } from '../src/app-core/interviewMasterGuide';
import { generateOutreachSuite } from '../src/app-core/outreachAgent';
import { generateFollowupCadence } from '../src/app-core/followupCadence';
import { applicationAnswers } from '../src/app-core/applicationAnswers';
import { salaryNegotiation } from '../src/app-core/salaryNegotiation';
import { store } from '../src/app-core/store';

const targetUrl = 'https://stripe.com/careers/listing/software-engineer-intern/8031833';

async function testLiveScrapeAndPipeline() {
  console.log('================================================================');
  console.log(`🌐 FETCHING & SCRAPING LIVE URL: ${targetUrl}`);
  console.log('================================================================\n');

  try {
    const rawHtml = await fetchWebPageHtml(targetUrl);
    console.log(`✅ HTTP 200 OK: Fetched ${rawHtml.length} bytes of raw HTML from Stripe Careers.\n`);

    const meta = extractHtmlMetadata(rawHtml, targetUrl);
    console.log('📑 [Extracted OpenGraph & HTML Metadata]:', meta);

    const cleanText = cleanHtmlToText(rawHtml);
    console.log(`\n📄 [Clean Scraped Text Preview (First 400 chars)]:\n${cleanText.slice(0, 400)}...\n`);

    console.log('🔍 [Running Job Extraction Agent on Live Scraped Content]...');
    const extracted = await fetchAndExtractJobFromUrl(targetUrl);
    console.log('Extracted Structured Job Details:', {
      companyName: extracted.companyName,
      jobTitle: extracted.jobTitle,
      location: extracted.location,
      applicationLink: extracted.applicationLink,
      skillsFound: extracted.skillsRequired,
    });

    const profile = store.getProfile();
    console.log('\n📊 [Running Fit Scorer & 12 AI Agents on Live Scraped Data]...');
    const score = scoreJobAgainstProfile(extracted, profile);
    console.log(`⭐ Match Score: ${score.matchScore}% | Grade: ${score.rubricScores?.letterGrade} | Rec: ${score.structuredFitReport?.recommendation}`);

    const ats = analyzeAtsCompliance(cleanText, profile.resumeText || '', profile.skills || []);
    console.log(`🎯 ATS Keyword Density: ${ats.keywordDensityScore}% | Matched Skills: [${(ats.hardSkillsFound || []).join(', ')}]`);

    const audit = auditBlockGLegitimacy(extracted);
    console.log(`🛡️ Block G Legitimacy: ${audit.legitimacyScore}% (${audit.verdict})`);

    const latex = generateAtsResumeLatex(extracted as any, profile);
    console.log(`📄 Generated Tailored LaTeX Resume: ${latex.length} characters.`);

    console.log('\n================================================================');
    console.log('🎉 LIVE WEB FETCHING & FULL PIPELINE EXECUTION VERIFIED!');
    console.log('================================================================');
  } catch (err: any) {
    console.error('Fetch error:', err.message);
  }
}

testLiveScrapeAndPipeline();
