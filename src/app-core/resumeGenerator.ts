import { jsPDF } from 'jspdf';
import { IJob, IProfile } from './types';
import { IExtractedJD } from './extractor';

declare global {
  interface Window {
    electronAPI?: {
      savePdfFile: (options: { filename: string; base64Data: string }) => Promise<{ success: boolean; filePath?: string; canceled?: boolean; error?: string }>;
      openExternal: (url: string) => Promise<boolean>;
      isDesktop?: boolean;
    };
  }
}

export function cleanFilenameSlug(str: string): string {
  return str.replace(/[^\w]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
}

/**
 * Compiles a 100% ATS-compliant single-page PDF resume matching Jake's Resume / FAANG standard.
 * Tailors summary & technical keywords to the target company and role.
 */
export function buildAtsResumePdf(job: Partial<IJob | IExtractedJD>, profile: IProfile): jsPDF {
  const doc = new jsPDF({
    unit: 'pt',
    format: 'letter',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 36;
  const contentWidth = pageWidth - margin * 2;
  let y = 38;

  const targetCompany = job.companyName || 'Target Company';
  const targetRole = job.jobTitle || 'Full Stack Developer';
  const targetSkills = (job.skillsRequired || ['React.js', 'Node.js', 'Express.js', 'MongoDB', 'JavaScript']).slice(0, 5).join(', ');

  // ── 1. HEADER (Candidate Name & Contact Info) ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(15, 23, 42); // slate-900
  const candidateName = profile.name || 'Veera Venkata Naga Satyanarayana Thota';
  doc.text(candidateName, pageWidth / 2, y, { align: 'center' });
  y += 15;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(70, 70, 70);
  const locationAndPhone = `${profile.location || 'Bhimavaram, Andhra Pradesh'}  |  ${profile.phone || '+91 6301253789'}  |  ${profile.email || 'narayananaiduthota@gmail.com'}`;
  doc.text(locationAndPhone, pageWidth / 2, y, { align: 'center' });
  y += 12;

  const linksLine = `Portfolio: ${profile.portfolio || 'https://www.narayanathota.me'}  |  LinkedIn: ${profile.linkedin || 'https://www.linkedin.com/in/narayaaana/'}  |  GitHub: ${profile.github || 'https://github.com/Narayaaana11'}`;
  doc.text(linksLine, pageWidth / 2, y, { align: 'center' });
  y += 11;

  // Divider helper
  const addSectionHeading = (title: string) => {
    y += 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text(title.toUpperCase(), margin, y);
    y += 3;
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.6);
    doc.line(margin, y, pageWidth - margin, y);
    y += 11;
  };

  // ── 2. SUMMARY (ATS Targeted) ──
  addSectionHeading('Summary');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(45, 45, 45);
  const summaryText = `Full Stack Developer and MCA candidate with hands-on experience building responsive front-end interfaces (React.js, Tailwind CSS) and RESTful back-end services (Node.js, Express.js, MongoDB). Skilled in end-to-end ownership -- from API design to deployment -- with strong problem-solving and computer science fundamentals in Data Structures & Algorithms and OOP. Tailored for ${targetCompany} (${targetRole}) with core focus on ${targetSkills}.`;
  const splitSummary = doc.splitTextToSize(summaryText, contentWidth);
  doc.text(splitSummary, margin, y);
  y += splitSummary.length * 10.5 + 3;

  // ── 3. TECHNICAL SKILLS ──
  addSectionHeading('Technical Skills');
  doc.setFontSize(8.5);

  const skillsList = [
    { label: 'Languages:', val: 'Python, SQL, JavaScript (ES6+), HTML5, CSS3' },
    { label: 'Frontend Development:', val: 'React.js, Tailwind CSS, Responsive Design, State Management' },
    { label: 'Backend & Database:', val: 'Node.js, Express.js, MongoDB, REST APIs, JWT Auth, Socket.io' },
    { label: 'Cloud & DevOps:', val: 'AWS (S3), Git, GitHub, Vercel, Render' },
    { label: 'Tools & Core Concepts:', val: 'VS Code, Postman, Data Structures & Algorithms (DSA), OOP' },
  ];

  skillsList.forEach((sk) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(25, 25, 25);
    doc.text(sk.label, margin, y);
    const labelWidth = doc.getTextWidth(sk.label) + 6;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(55, 55, 55);
    doc.text(sk.val, margin + labelWidth, y);
    y += 11;
  });
  y += 2;

  // ── 4. EXPERIENCE ──
  addSectionHeading('Experience');

  // Job 1: Full Stack Development Intern
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(20, 20, 20);
  doc.text('Full Stack Development Intern', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.text('June 2025 – July 2025', pageWidth - margin, y, { align: 'right' });
  y += 10;

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8.5);
  doc.setTextColor(70, 70, 70);
  doc.text('Technical Hub Pvt. Ltd.', margin, y);
  y += 10;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(45, 45, 45);

  const internBullets = [
    'Built responsive user interfaces using React.js and Tailwind CSS, standardizing component layouts across mobile and desktop devices and reducing UI inconsistencies.',
    'Designed and developed RESTful API endpoints using Node.js and Express to handle user authentication and state synchronization across frontend client interfaces.',
    'Tested API routes and UI workflows using Postman, identifying and resolving over 15 dynamic state and integration issues prior to deployment on Vercel and Render.',
  ];

  internBullets.forEach((b) => {
    const bulletText = `•  ${b}`;
    const splitB = doc.splitTextToSize(bulletText, contentWidth - 8);
    doc.text(splitB, margin + 4, y);
    y += splitB.length * 10 + 1.5;
  });
  y += 2;

  // ── 5. PROJECTS ──
  addSectionHeading('Projects');

  const projects = [
    {
      name: 'Aditya University Visitor Management System (AUSVMS)',
      tech: 'MERN Stack, Socket.io, Nodemailer',
      year: '2025',
      bullets: [
        'Developed a visitor tracking platform with role-based access control (RBAC) across 4 account types (Admin, Staff, Security Guard, Visitor).',
        'Designed MongoDB aggregation pipelines powering a real-time dashboard, cutting manual visitor-log lookup time for staff from minutes to seconds.',
        'Implemented OTP-based visitor check-in workflows with real-time updates and email alerts via Socket.io and Nodemailer, removing manual front-desk verification.',
      ],
    },
    {
      name: 'Guard Hub — Security Roster Management System',
      tech: 'MERN Stack, Tailwind CSS',
      year: '2025',
      bullets: [
        'Engineered a roster system to digitize shift allocation for 100+ campus security personnel, replacing manual spreadsheet tracking and cutting weekly scheduling time by 5+ hours.',
        'Built a scheduling engine with shift constraint validation, automatically detecting time collisions across 4 rotating shift patterns (General, A, B, and C).',
      ],
    },
    {
      name: 'Matrix Library Management System',
      tech: 'MERN Stack, Python, NLP',
      year: '2025',
      bullets: [
        'Designed React dashboards to display real-time book availability, borrowing records, and inventory status for students and librarians.',
        'Integrated an NLP-based chatbot in Python to process natural language queries, helping users look up book titles and shelf locations without manual search.',
      ],
    },
  ];

  projects.forEach((proj) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(20, 20, 20);
    doc.text(proj.name, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(proj.year, pageWidth - margin, y, { align: 'right' });
    y += 9.5;

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(85, 85, 85);
    doc.text(proj.tech, margin, y);
    y += 9.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(45, 45, 45);

    proj.bullets.forEach((b) => {
      const bulletText = `•  ${b}`;
      const splitB = doc.splitTextToSize(bulletText, contentWidth - 8);
      doc.text(splitB, margin + 4, y);
      y += splitB.length * 9.5 + 1.5;
    });
    y += 2.5;
  });

  // ── 6. EDUCATION ──
  addSectionHeading('Education');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(20, 20, 20);
  doc.text('Aditya University', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.text('Aug 2024 – May 2026', pageWidth - margin, y, { align: 'right' });
  y += 10;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(50, 50, 50);
  doc.text('Master of Computer Applications (MCA) — Computer Science  |  CGPA: 7.70 / 10', margin, y);
  y += 12;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(20, 20, 20);
  doc.text('Aditya Degree College', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.text('Aug 2021 – May 2024', pageWidth - margin, y, { align: 'right' });
  y += 10;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(50, 50, 50);
  doc.text('Bachelor of Computer Applications (BCA) — Computer Science  |  CGPA: 7.24 / 10', margin, y);
  y += 12;

  // ── 7. CERTIFICATIONS ──
  addSectionHeading('Certifications');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(45, 45, 45);

  const certs = [
    '•  Full Stack Developer Certification — Technical Hub Pvt. Ltd. (Jun 2025)',
    '•  Project Space Hackathon Participant — Technical Hub Pvt. Ltd. (Jun 2025)',
  ];

  certs.forEach((c) => {
    doc.text(c, margin + 4, y);
    y += 10.5;
  });

  return doc;
}

export function generateResumePdfDataUri(job: Partial<IJob | IExtractedJD>, profile: IProfile): string {
  const doc = buildAtsResumePdf(job, profile);
  const dataUri = doc.output('datauristring');

  // Background upload to S3 if auto-sync is on
  if (typeof window !== 'undefined') {
    try {
      const { s3Cloud } = require('./s3Client');
      if (s3Cloud.getConfig().autoSync) {
        const cleanCompany = cleanFilenameSlug(job.companyName || 'Company');
        const cleanRole = cleanFilenameSlug(job.jobTitle || 'Role');
        const filename = `Narayana_Thota_${cleanRole}_${cleanCompany}.pdf`;
        const pdfArrayBuffer = doc.output('arraybuffer');
        s3Cloud.uploadResumePdf(filename, new Uint8Array(pdfArrayBuffer)).catch(() => {});
      }
    } catch (e) {}
  }

  return dataUri;
}

export async function downloadResumePdfFile(job: Partial<IJob | IExtractedJD>, profile: IProfile): Promise<{ success: boolean; path?: string }> {
  const cleanCompany = cleanFilenameSlug(job.companyName || 'Company');
  const cleanRole = cleanFilenameSlug(job.jobTitle || 'Role');
  const filename = `Narayana_Thota_${cleanRole}_${cleanCompany}.pdf`;

  const doc = buildAtsResumePdf(job, profile);

  // Sync to S3
  if (typeof window !== 'undefined') {
    try {
      const { s3Cloud } = require('./s3Client');
      if (s3Cloud.getConfig().autoSync) {
        const pdfArrayBuffer = doc.output('arraybuffer');
        s3Cloud.uploadResumePdf(filename, new Uint8Array(pdfArrayBuffer)).catch(() => {});
      }
    } catch (e) {}
  }

  // If in Electron, use native save dialog
  if (typeof window !== 'undefined' && window.electronAPI?.savePdfFile) {
    try {
      const base64Data = doc.output('datauristring').split(',')[1];
      const result = await window.electronAPI.savePdfFile({ filename, base64Data });
      if (result.success) {
        return { success: true, path: result.filePath };
      }
      if (result.canceled) {
        return { success: false };
      }
    } catch (err) {
      console.warn('Native save dialog failed, falling back to browser download:', err);
    }
  }

  // Fallback: standard browser download
  doc.save(filename);
  return { success: true };
}
