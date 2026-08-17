import { generateTailoredResume } from '../src/services/resumeTailorAgent';

async function testLatexCompilation() {
  console.log('Testing LaTeX Resume Generation & Auto PDF Compilation...');

  const sampleJob = {
    companyName: 'Cisco Systems',
    jobTitle: 'Software Engineer (Freshers 2026 Batch)',
    skillsRequired: ['Python', 'Node.js', 'React.js', 'REST APIs', 'AWS S3', 'Data Structures'],
  };

  const result = await generateTailoredResume(sampleJob, {});
  console.log('----------------------------------------');
  console.log('✅ LaTeX Resume Tailor Result:');
  console.log('PDF S3 URL:', result.resumeVersionUrl);
  console.log('Notes:', result.resumeNotes);
  console.log('LaTeX Code Length:', result.markdownContent.length, 'bytes');
  console.log('----------------------------------------');
}

testLatexCompilation().catch(console.error);
