import { jsPDF } from 'jspdf';
import { IJob, IProfile } from './types';
import { IExtractedJD } from './extractor';
import { s3Cloud } from './s3Client';

declare global {
  interface Window {
    electronAPI?: {
      savePdfFile: (options: { filename: string; base64Data: string }) => Promise<{ success: boolean; filePath?: string; canceled?: boolean; error?: string }>;
      saveTextFile?: (options: { filename: string; content: string; extension?: string; filterName?: string }) => Promise<{ success: boolean; filePath?: string; canceled?: boolean; error?: string }>;
      openExternal: (url: string) => Promise<boolean>;
      isDesktop?: boolean;
    };
  }
}

export function cleanFilenameSlug(str: string): string {
  return str.replace(/[^\w]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
}

/**
 * Generates 100% compile-ready, ATS-compliant LaTeX source code matching the Jake's Resume / FAANG LaTeX template.
 * Tailored dynamically for the target company, role, required skills, and candidate profile.
 */
export function generateAtsResumeLatex(job: Partial<IJob | IExtractedJD>, profile: IProfile): string {
  const candidateName = profile.name || 'Veera Venkata Naga Satyanarayana Thota';
  const targetCompany = (job.companyName || 'Target Company').replace(/&/g, '\\&');
  const targetRole = (job.jobTitle || 'Full Stack Developer').replace(/&/g, '\\&');
  const targetSkills = (job.skillsRequired || ['React.js', 'Node.js', 'Express.js', 'MongoDB', 'JavaScript']).slice(0, 6).join(', ').replace(/&/g, '\\&');
  const phone = (profile.phone || '+91 6301253789').replace(/&/g, '\\&');
  const email = profile.email || 'narayananaiduthota@gmail.com';
  const location = (profile.location || 'Bhimavaram, Andhra Pradesh').replace(/&/g, '\\&');
  const linkedin = profile.linkedin || 'https://www.linkedin.com/in/narayaaana/';
  const github = profile.github || 'https://github.com/Narayaaana11';
  const portfolio = profile.portfolio || 'https://www.narayanathota.me';

  return `%-------------------------
% JobRadar ATS-Optimized Resume in LaTeX
% Tailored for ${targetCompany} -- ${targetRole}
% Based on Jake's Resume / FAANG Standard
%-------------------------

\\documentclass[letterpaper,10pt]{article}

\\usepackage{latexsym}
\\usepackage[empty]{fullpage}
\\usepackage{titlesec}
\\usepackage{marvosym}
\\usepackage[usenames,dvipsnames]{color}
\\usepackage{verbatim}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{fancyhdr}
\\usepackage[english]{babel}
\\usepackage{tabularx}
\\usepackage{fontawesome5}

\\pagestyle{fancy}
\\fancyhf{}
\\renewcommand{\\headrulewidth}{0pt}
\\renewcommand{\\footrulewidth}{0pt}

% Adjust margins
\\addtolength{\\oddsidemargin}{-0.5in}
\\addtolength{\\evensidemargin}{-0.5in}
\\addtolength{\\textwidth}{1in}
\\addtolength{\\topmargin}{-.5in}
\\addtolength{\\textheight}{1.0in}

\\urlstyle{same}
\\raggedbottom
\\raggedright
\\setlength{\\tabcolsep}{0in}

% Sections formatting
\\titleformat{\\section}{
  \\vspace{-4pt}\\scshape\\raggedright\\large
}{}{0em}{}[\\color{black}\\titlerule \\vspace{-5pt}]

\\begin{document}

%----------HEADING----------
\\begin{center}
    \\textbf{\\Huge \\scshape ${candidateName}} \\\ \\vspace{2pt}
    \\small ${location} $|$ ${phone} $|$ \\href{mailto:${email}}{\\underline{${email}}} \\\ \\vspace{1pt}
    \\href{${portfolio}}{\\underline{${portfolio}}} $|$
    \\href{${linkedin}}{\\underline{linkedin.com/in/narayaaana}} $|$
    \\href{${github}}{\\underline{github.com/Narayaaana11}}
\\end{center}

%-----------SUMMARY-----------
\\section{Professional Summary}
\\small{Full Stack Developer and MCA candidate with proven experience engineering high-performance front-end web applications (React.js, Tailwind CSS) and robust back-end microservices (Node.js, Express.js, MongoDB). Skilled in end-to-end software ownership -- from database architecture and RESTful API integration to cloud deployment (AWS S3) and CI/CD pipelines. Tailored specifically for \\textbf{${targetCompany}} as \\textbf{${targetRole}} with specialized alignment in \\textbf{${targetSkills}}.}

%-----------TECHNICAL SKILLS-----------
\\section{Technical Skills}
\\begin{itemize}[leftmargin=0.15in, label={}]
    \\small{\\item{
     \\textbf{Languages}{: Python, SQL, JavaScript (ES6+), HTML5, CSS3} \\\
     \\textbf{Frontend Development}{: React.js, Tailwind CSS, Responsive Web Design, State Management (Zustand/Redux)} \\\
     \\textbf{Backend \\& APIs}{: Node.js, Express.js, MongoDB, RESTful APIs, JWT Authentication, WebSockets (Socket.io)} \\\
     \\textbf{Cloud \\& DevOps}{: AWS (S3, IAM), Git, GitHub Actions, Vercel, Render, Postman} \\\
     \\textbf{Core Competencies}{: Data Structures \\& Algorithms (DSA), Object-Oriented Programming (OOP), Database Indexing}
    }}
\\end{itemize}

%-----------KEY PROJECTS-----------
\\section{Projects}
\\begin{itemize}[leftmargin=0.15in, label={}]
    \\item
    \\textbf{JobRadar -- Autonomous Multi-Agent Career Copilot} $|$ \\emph{React, TypeScript, Electron, AWS S3, OpenRouter LLM}
    \\begin{itemize}[leftmargin=0.2in]
        \\item Engineered an autonomous job aggregation and resume tailoring engine with 5-agent AI evaluation scoring candidate-JD fit with 90\\%+ precision.
        \\item Integrated multi-channel WhatsApp and Telegram socket listeners for zero-latency real-time hiring alert capture.
        \\item Designed automated AWS S3 cloud synchronization with zero-CORS Electron native bridge for persistent state storage.
    \\end{itemize}

    \\item
    \\textbf{MERN Full-Stack E-Commerce \\& Analytics Platform} $|$ \\emph{MongoDB, Express.js, React.js, Node.js, Tailwind CSS}
    \\begin{itemize}[leftmargin=0.2in]
        \\item Built scalable REST API handling authentication (JWT, bcrypt), product indexing, dynamic cart management, and order lifecycle.
        \\item Architected responsive UI in React with Tailwind CSS, decreasing initial load time by 35\\% via code-splitting and asset optimization.
        \\item Implemented secure payment gateway integration and role-based access control (RBAC) for administrative dashboard.
    \\end{itemize}

    \\item
    \\textbf{Real-Time Collaborative Code \\& Workspace Hub} $|$ \\emph{React.js, Node.js, Socket.io, Express, MongoDB}
    \\begin{itemize}[leftmargin=0.2in]
        \\item Developed full-duplex real-time room communication supporting syntax-highlighted code editor and synchronized state via WebSockets.
        \\item Reduced message latency to under 50ms using optimized Socket.io channels and debounced persistence handlers.
    \\end{itemize}
\\end{itemize}

%-----------EDUCATION-----------
\\section{Education}
\\begin{itemize}[leftmargin=0.15in, label={}]
    \\item
    \\textbf{Aditya University} \\hfill Aug 2024 -- May 2026 \\\
    \\textit{Master of Computer Applications (MCA) -- Computer Science} \\hfill \\textbf{CGPA: 7.70 / 10.0} \\\
    \\vspace{2pt}
    \\item
    \\textbf{Aditya Degree College} \\hfill Aug 2021 -- May 2024 \\\
    \\textit{Bachelor of Computer Applications (BCA) -- Computer Science} \\hfill \\textbf{CGPA: 7.24 / 10.0}
\\end{itemize}

%-----------CERTIFICATIONS-----------
\\section{Certifications \\& Achievements}
\\begin{itemize}[leftmargin=0.15in, label={}]
    \\item \\textbf{Full Stack Developer Certification} -- Technical Hub Pvt. Ltd. (June 2025)
    \\item \\textbf{Project Space Hackathon Participant} -- Technical Hub Pvt. Ltd. (June 2025)
    \\item Solved 200+ Data Structures \\& Algorithm problems across LeetCode and HackerRank.
\\end{itemize}

\\end{document}
`;
}

/**
 * Downloads ATS Resume in LaTeX (.tex) format.
 */
export async function downloadResumeLatexFile(job: Partial<IJob | IExtractedJD>, profile: IProfile): Promise<{ success: boolean; path?: string }> {
  const cleanCompany = cleanFilenameSlug(job.companyName || 'Company');
  const cleanRole = cleanFilenameSlug(job.jobTitle || 'Role');
  const filename = `Narayana_Thota_${cleanRole}_${cleanCompany}_Resume.tex`;
  const latexContent = generateAtsResumeLatex(job, profile);

  if (typeof window !== 'undefined') {
    try {
      if (s3Cloud.getConfig().autoSync) {
        s3Cloud.putObject(`resumes/${filename}`, latexContent, 'text/plain').catch(() => {});
      }
    } catch (e) {}
  }

  if (typeof window !== 'undefined' && window.electronAPI?.saveTextFile) {
    try {
      const result = await window.electronAPI.saveTextFile({
        filename,
        content: latexContent,
        extension: 'tex',
        filterName: 'LaTeX Resume Source (.tex)',
      });
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

  if (typeof window !== 'undefined') {
    const blob = new Blob([latexContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return { success: true };
  }

  return { success: true };
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
    y += 10.5;
  });
  y += 2;

  // ── 4. WORK EXPERIENCE / HIGHLIGHTS ──
  addSectionHeading('Experience');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(20, 20, 20);
  doc.text('Full Stack Developer (Trainee / Academic)', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.text('Jan 2024 – Present', pageWidth - margin, y, { align: 'right' });
  y += 10;

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8.5);
  doc.setTextColor(60, 60, 60);
  doc.text('Technical Hub / Aditya University  |  Surampalem, India', margin, y);
  y += 10;

  const expBullets = [
    '•  Engineered responsive web applications and REST APIs using React.js, Node.js, and MongoDB, ensuring cross-browser reliability and <200ms API response latency.',
    '•  Implemented JWT-based authentication, role-based authorization, and protected route middlewares across 5+ full-stack internal projects.',
    '•  Utilized Git for version control, collaborated in Agile sprints, and deployed client-side and server-side builds to Vercel and Render.',
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(45, 45, 45);
  expBullets.forEach((b) => {
    const splitB = doc.splitTextToSize(b, contentWidth - 4);
    doc.text(splitB, margin + 4, y);
    y += splitB.length * 10;
  });
  y += 2;

  // ── 5. PROJECTS (ATS Key Bullets) ──
  addSectionHeading('Projects');

  const projects = [
    {
      title: 'JobRadar — Autonomous Multi-Agent Career & Job Agent',
      tech: 'React, TypeScript, Electron, AWS S3, Tailwind CSS',
      bullets: [
        `Built an autonomous desktop platform tracking job postings across WhatsApp/Telegram with an AI evaluation council scoring candidate-JD fit with 90%+ accuracy.`,
        'Designed ATS resume tailoring engine generating instant FAANG-standard PDFs and cloud backups with automated S3 persistence.',
      ],
    },
    {
      title: 'MERN Full-Stack E-Commerce & Management Platform',
      tech: 'MongoDB, Express.js, React.js, Node.js, Tailwind CSS',
      bullets: [
        'Architected end-to-end e-commerce engine with real-time product search, filtering, cart management, and Razorpay test checkout.',
        'Created a unified admin dashboard with real-time sales metrics, product CRUD operations, and order status lifecycle tracking.',
      ],
    },
    {
      title: 'Real-Time Collaborative Code & Chat Workspace',
      tech: 'React.js, Node.js, Socket.io, Express, MongoDB',
      bullets: [
        'Developed real-time multi-room collaboration hub with WebSocket synchronization, sub-50ms message latency, and markdown parsing.',
      ],
    },
  ];

  projects.forEach((p) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(20, 20, 20);
    doc.text(p.title, margin, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(70, 70, 70);
    doc.text(` |  ${p.tech}`, margin + doc.getTextWidth(p.title), y);
    y += 9.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(45, 45, 45);
    p.bullets.forEach((b) => {
      const splitB = doc.splitTextToSize(`•  ${b}`, contentWidth - 4);
      doc.text(splitB, margin + 4, y);
      y += splitB.length * 9.5;
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
