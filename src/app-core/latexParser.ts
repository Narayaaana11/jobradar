/**
 * Utility to parse LaTeX resume code (e.g. Jake's Resume / Overleaf template)
 * and extract candidate name, contact info, skills, education, and projects.
 */
export interface IParsedLatexResume {
  name: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
  portfolio: string;
  summary: string;
  skills: string[];
  education: string;
  rawTex: string;
}

export function parseLatexResume(texCode: string): IParsedLatexResume {
  const tex = texCode || '';

  // Remove comments
  const cleaned = tex.replace(/(^|[^\\])%.*/g, '$1');

  // 1. Name: \textbf{\Huge \scshape Name} or \huge{Name}
  const nameMatch =
    cleaned.match(/\\textbf\{\\Huge\s*\\scshape\s+([^}]+)\}/i) ||
    cleaned.match(/\\textbf\{\\Huge\s+([^}]+)\}/i) ||
    cleaned.match(/\\huge\{([^}]+)\}/i) ||
    cleaned.match(/\\textbf\{([^}]+)\}\s*\\\\\s*\\vspace/i);
  const name = nameMatch ? nameMatch[1].trim() : 'Candidate Name';

  // 2. Email: \href{mailto:email}{email} or email regex
  const emailMatch =
    cleaned.match(/\\href\{mailto:([^}]+)\}/i) ||
    cleaned.match(/\b([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,})\b/);
  const email = emailMatch ? emailMatch[1].trim() : '';

  // 3. Phone: +91 xxxxxxxxxx or (xxx) xxx-xxxx
  const phoneMatch = cleaned.match(/(\+?\d[\d\s-]{8,14}\d)/);
  const phone = phoneMatch ? phoneMatch[1].trim() : '';

  // 4. Location: text between name/phone or after \small
  const locMatch = cleaned.match(/\\small\s+([^$|\n]+?)(?:\||\$)/i);
  let location = locMatch ? locMatch[1].replace(/[*_#]/g, '').trim() : '';
  if (location.includes('+') || location.includes('@')) location = '';

  // 5. Links
  const linkedinMatch =
    cleaned.match(/\\href\{([^}]*linkedin\.com[^}]*)\}/i) ||
    cleaned.match(/href="([^"]*linkedin\.com[^"]*)"/i);
  const linkedin = linkedinMatch ? linkedinMatch[1].trim() : '';

  const githubMatch =
    cleaned.match(/\\href\{([^}]*github\.com[^}]*)\}/i) ||
    cleaned.match(/href="([^"]*github\.com[^"]*)"/i);
  const github = githubMatch ? githubMatch[1].trim() : '';

  const portfolioMatch =
    cleaned.match(/\\href\{([^}]*(?:narayanathota|\.me|\.dev|\.io|\.com)[^}]*)\}\{Portfolio\}/i) ||
    cleaned.match(/\\href\{([^}]*)\}\{Portfolio\}/i);
  const portfolio = portfolioMatch ? portfolioMatch[1].trim() : '';

  // 6. Summary: \section{Summary} ... \small{...}
  const summaryMatch = cleaned.match(/\\section\{Summary\}[\s\S]*?\\small\{([\s\S]*?)\}/i);
  const summary = summaryMatch ? summaryMatch[1].replace(/\\[a-zA-Z]+/g, '').replace(/[{}\\]/g, '').trim() : '';

  // 7. Skills: \section{Technical Skills} ...
  const skills: string[] = [];
  const skillsSectionMatch = cleaned.match(/\\section\{Technical Skills\}[\s\S]*?(?:\\section|\end\{document\})/i);
  if (skillsSectionMatch) {
    const rawSkillsText = skillsSectionMatch[0];
    const skillLines = rawSkillsText.match(/\\textbf\{[^}]+\}\{:\s*([^}\\]+)\}/g) || [];
    skillLines.forEach((line) => {
      const match = line.match(/\\textbf\{[^}]+\}\{:\s*([^}\\]+)\}/);
      if (match) {
        const items = match[1].split(',').map((s) => s.trim().replace(/[*_]/g, ''));
        skills.push(...items);
      }
    });
  }

  // Fallback skills extraction
  if (skills.length === 0) {
    const keywords = ['React.js', 'Node.js', 'Express.js', 'MongoDB', 'Python', 'SQL', 'JavaScript', 'TypeScript', 'Tailwind CSS', 'AWS', 'Git'];
    keywords.forEach((k) => {
      if (cleaned.toLowerCase().includes(k.toLowerCase())) skills.push(k);
    });
  }

  // 8. Education: \section{Education}
  const eduMatch = cleaned.match(/\\section\{Education\}[\s\S]*?(?:\\resumeSubheading\s*\{([^}]+)\}\{([^}]+)\}\s*\{([^}]+)\}\{([^}]+)\})/i);
  let education = '';
  if (eduMatch) {
    education = `${eduMatch[3]} — ${eduMatch[1]} (${eduMatch[4]})`;
  }

  return {
    name,
    email,
    phone,
    location,
    linkedin,
    github,
    portfolio,
    summary,
    skills: Array.from(new Set(skills)),
    education,
    rawTex: tex,
  };
}
