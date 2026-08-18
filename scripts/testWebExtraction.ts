import { cleanHtmlToText, extractHtmlMetadata, isWebUrl } from '../src/app-core/webFetcher';
import { extractJobDetails } from '../src/app-core/extractor';

console.log('=== TEST: Web URL Detection & HTML Parsing ===');

const mockAmazonJobsHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>Customer Service Associate - Amazon Jobs Hyderabad</title>
  <meta property="og:title" content="Customer Service Associate - Amazon Hyderabad" />
  <meta property="og:site_name" content="Amazon" />
  <meta property="og:description" content="Join Amazon as a Customer Service Associate in Hyderabad. Work with world-class support teams." />
</head>
<body>
  <header>
    <nav><a href="/home">Home</a> | <a href="/jobs">Jobs</a></nav>
  </header>
  <main>
    <div class="job-container">
      <h1>Customer Service Associate</h1>
      <p class="location">Location: Hyderabad, Telangana, India</p>
      <div class="job-description">
        <h2>Job Description</h2>
        <p>Amazon is seeking dynamic professionals to support our global customer base.</p>
        <h2>Basic Qualifications:</h2>
        <ul>
          <li>Bachelor's degree or equivalent (2024, 2025, 2026 Batch)</li>
          <li>Strong verbal and written English communication</li>
          <li>Familiarity with CRM systems, Ticketing, and Email Support</li>
        </ul>
        <a href="https://amazon.jobs/apply/12345" class="apply-btn">Apply Now</a>
      </div>
    </div>
  </main>
  <footer>
    <p>&copy; 2026 Amazon.com, Inc. All rights reserved.</p>
  </footer>
</body>
</html>
`;

// 1. Test isWebUrl
if (!isWebUrl('https://amazon.jobs/en/jobs/2849102/customer-service-associate')) {
  throw new Error('FAIL: isWebUrl failed to recognize amazon.jobs URL');
}
console.log('✓ isWebUrl correctly identified valid URLs');

// 2. Test metadata extraction
const meta = extractHtmlMetadata(mockAmazonJobsHtml, 'https://amazon.jobs/en/jobs/2849102');
console.log('Extracted Metadata:', meta);
if (meta.ogSiteName !== 'Amazon' || !meta.pageTitle?.includes('Customer Service')) {
  throw new Error('FAIL: HTML metadata extraction failed.');
}
console.log('✓ Metadata extracted correctly from <title> and OpenGraph');

// 3. Test cleanHtmlToText
const cleanText = cleanHtmlToText(mockAmazonJobsHtml);
console.log('\n--- Cleaned Text Snippet ---');
console.log(cleanText.substring(0, 350));
console.log('----------------------------\n');

if (cleanText.includes('<header>') || cleanText.includes('</main>') || cleanText.includes('<script>')) {
  throw new Error('FAIL: HTML tags were not cleaned out properly');
}

// 4. Test end-to-end extraction from cleaned HTML text
let compositeText = `*Job Title:* ${meta.ogTitle || meta.pageTitle}\n*Company:* ${meta.ogSiteName}\n*Summary:* ${meta.ogDescription}\n*Application Link:* https://amazon.jobs/en/jobs/2849102\n\n${cleanText}`;
const extractedFromWeb = extractJobDetails(compositeText, 'https://amazon.jobs/en/jobs/2849102');

console.log('Final Extracted Web Job:');
console.log('  Company:', extractedFromWeb.companyName);
console.log('  Job Title:', extractedFromWeb.jobTitle);
console.log('  Location:', extractedFromWeb.location);
console.log('  Apply Link:', extractedFromWeb.applicationLink);
console.log('  Skills:', extractedFromWeb.skillsRequired);

if (!extractedFromWeb.jobTitle.includes('Customer Service')) {
  throw new Error(`FAIL: Extracted title from web HTML was: ${extractedFromWeb.jobTitle}`);
}

console.log('\n✅ ALL WEB EXTRACTION & HTML PARSING TESTS PASSED SUCCESSFULLY!\n');
