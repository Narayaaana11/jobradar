import { KnowledgeCategory } from './rag/types';

/**
 * Universal client-side document parser for PDF (.pdf), Word (.docx),
 * Markdown (.md), LaTeX (.tex), and Text (.txt) files.
 */

export interface IParsedDocumentResult {
  title: string;
  content: string;
  detectedCategory: KnowledgeCategory;
  suggestedTags: string[];
  fileType: 'pdf' | 'docx' | 'text' | 'latex' | 'markdown';
  pageCount?: number;
  wordCount: number;
}

const COMMON_TECH_KEYWORDS = [
  'React', 'React.js', 'Node.js', 'Express', 'Express.js', 'TypeScript', 'JavaScript',
  'Python', 'MongoDB', 'PostgreSQL', 'SQL', 'MySQL', 'AWS', 'S3', 'Docker', 'Kubernetes',
  'Tailwind CSS', 'Tailwind', 'Next.js', 'Vite', 'Redux', 'GraphQL', 'REST API', 'REST',
  'JWT', 'OAuth', 'WebSockets', 'Socket.io', 'Git', 'GitHub', 'CI/CD', 'DSA', 'Algorithms',
  'System Design', 'Microservices', 'FastAPI', 'Django', 'Flask', 'Redis', 'Nginx',
  'Jest', 'Postman', 'Linux', 'GCP', 'Azure', 'Firebase', 'Supabase'
];

/**
 * Extracts plain text from a .pdf File using pdfjs-dist.
 */
export async function parsePdfFile(file: File): Promise<{ text: string; pages: number }> {
  try {
    const pdfjsLib = await import('pdfjs-dist');
    // Configure worker for Vite client build
    if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`;
    }

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;

    let fullText = '';
    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageStrings = textContent.items
        .map((item: any) => (typeof item?.str === 'string' ? item.str : ''))
        .filter(Boolean);
      fullText += pageStrings.join(' ') + '\n\n';
    }

    return { text: fullText.trim(), pages: numPages };
  } catch (err: any) {
    console.error('PDF parsing error:', err);
    throw new Error(`Failed to extract text from PDF: ${err.message || 'Corrupted or encrypted PDF'}`);
  }
}

/**
 * Extracts plain text from a .docx File using mammoth.
 */
export async function parseDocxFile(file: File): Promise<string> {
  try {
    const mammoth = await import('mammoth');
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value.trim();
  } catch (err: any) {
    console.error('DOCX parsing error:', err);
    throw new Error(`Failed to extract text from Word document: ${err.message}`);
  }
}

/**
 * Reads text directly from .txt, .md, .tex, or .json files.
 */
export async function parseTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve((e.target?.result as string) || '');
    reader.onerror = (e) => reject(new Error('Failed to read text file.'));
    reader.readAsText(file);
  });
}

/**
 * Heuristically determines the category based on filename and extracted text.
 */
export function detectDocumentCategory(title: string, text: string): KnowledgeCategory {
  const lower = `${title} ${text.slice(0, 800)}`.toLowerCase();

  if (
    lower.includes('resume') ||
    lower.includes('curriculum vitae') ||
    lower.includes('cv') ||
    (lower.includes('education') && lower.includes('skills') && lower.includes('experience'))
  ) {
    return 'resume';
  }

  if (
    lower.includes('star story') ||
    lower.includes('situation:') ||
    lower.includes('task:') ||
    lower.includes('behavioral question') ||
    lower.includes('interview story')
  ) {
    return 'star_story';
  }

  if (
    lower.includes('system design') ||
    lower.includes('architecture note') ||
    lower.includes('tech note') ||
    lower.includes('algorithm note') ||
    lower.includes('cheatsheet')
  ) {
    return 'tech_note';
  }

  if (
    lower.includes('internship') ||
    lower.includes('work experience') ||
    lower.includes('employment history') ||
    lower.includes('job responsibilities')
  ) {
    return 'experience';
  }

  if (
    lower.includes('project') ||
    lower.includes('case study') ||
    lower.includes('github') ||
    lower.includes('app') ||
    lower.includes('system')
  ) {
    return 'project';
  }

  return 'project';
}

/**
 * Scans extracted text for technical tags.
 */
export function extractSuggestedTags(text: string): string[] {
  const foundTags = new Set<string>();
  const lowerText = text.toLowerCase();

  for (const kw of COMMON_TECH_KEYWORDS) {
    const regex = new RegExp(`\\b${kw.toLowerCase().replace('.', '\\.')}\\b`, 'i');
    if (regex.test(lowerText)) {
      foundTags.add(kw);
    }
  }

  return Array.from(foundTags).slice(0, 10);
}

/**
 * Main parser entry point: handles any uploaded file (PDF, DOCX, TXT, MD, LaTeX).
 */
export async function parseUploadedDocument(file: File): Promise<IParsedDocumentResult> {
  const fileName = file.name;
  const ext = fileName.slice(fileName.lastIndexOf('.')).toLowerCase();

  let content = '';
  let pageCount: number | undefined;
  let fileType: IParsedDocumentResult['fileType'] = 'text';

  if (ext === '.pdf') {
    fileType = 'pdf';
    const pdfRes = await parsePdfFile(file);
    content = pdfRes.text;
    pageCount = pdfRes.pages;
  } else if (ext === '.docx' || ext === '.doc') {
    fileType = 'docx';
    content = await parseDocxFile(file);
  } else if (ext === '.tex') {
    fileType = 'latex';
    content = await parseTextFile(file);
  } else if (ext === '.md') {
    fileType = 'markdown';
    content = await parseTextFile(file);
  } else {
    fileType = 'text';
    content = await parseTextFile(file);
  }

  if (!content.trim()) {
    throw new Error(`File "${fileName}" appears to be empty or could not be converted to text.`);
  }

  // Derive title from clean file name
  const rawTitle = fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
  const cleanTitle = rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1);

  const detectedCategory = detectDocumentCategory(cleanTitle, content);
  const suggestedTags = extractSuggestedTags(content);
  const wordCount = content.split(/\s+/).filter(Boolean).length;

  return {
    title: cleanTitle,
    content,
    detectedCategory,
    suggestedTags,
    fileType,
    pageCount,
    wordCount,
  };
}
