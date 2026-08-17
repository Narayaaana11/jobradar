import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import puppeteer from 'puppeteer';
import { s3Service } from './s3Service';

export class LatexPdfService {
  /**
   * Compiles LaTeX source into PDF and uploads both .tex and .pdf to AWS S3 bucket 'jobsprep'
   */
  public async compileAndUpload(filenameBase: string, texContent: string): Promise<{ texUrl: string; pdfUrl: string }> {
    const resumesDir = path.resolve(process.cwd(), 'resumes');
    if (!fs.existsSync(resumesDir)) {
      fs.mkdirSync(resumesDir, { recursive: true });
    }

    const texFileName = `${filenameBase}.tex`;
    const pdfFileName = `${filenameBase}.pdf`;

    const texFilePath = path.join(resumesDir, texFileName);
    const pdfFilePath = path.join(resumesDir, pdfFileName);

    // Save local .tex file
    fs.writeFileSync(texFilePath, texContent, 'utf-8');

    // 1. Try local pdflatex compilation first
    let pdfCompiled = await this.tryPdfLatex(resumesDir, texFileName);

    // 2. If pdflatex is not installed, render high-definition PDF using Puppeteer
    if (!pdfCompiled) {
      console.log(`[LatexPdfService] pdflatex not found on PATH. Rendering ATS PDF via Puppeteer engine...`);
      pdfCompiled = await this.renderLatexToPdfPuppeteer(texContent, pdfFilePath);
    }

    // 3. Upload .tex file to S3 (as text)
    const texS3Key = `resumes/${texFileName}`;
    const texUrl = await s3Service.uploadFile(texS3Key, texContent, 'application/x-tex');

    // 4. Upload .pdf file to S3 as RAW BINARY Buffer (NEVER convert to base64 string)
    let pdfUrl = texUrl.replace(/\.tex$/i, '.pdf');
    if (fs.existsSync(pdfFilePath)) {
      const pdfBuffer = fs.readFileSync(pdfFilePath); // Read as raw Buffer
      const pdfS3Key = `resumes/${pdfFileName}`;
      // Pass raw Buffer directly — S3Service handles binary upload correctly
      pdfUrl = await s3Service.uploadFile(pdfS3Key, pdfBuffer, 'application/pdf');
      console.log(`[LatexPdfService] PDF uploaded as raw binary Buffer (${pdfBuffer.length} bytes) to S3: ${pdfS3Key}`);
    } else {
      console.warn(`[LatexPdfService] PDF file not found at ${pdfFilePath}, PDF download will use Express fallback.`);
    }

    return { texUrl, pdfUrl };
  }

  private tryPdfLatex(cwd: string, texFileName: string): Promise<boolean> {
    return new Promise((resolve) => {
      exec(`pdflatex -interaction=nonstopmode "${texFileName}"`, { cwd }, (error) => {
        if (!error) {
          resolve(true);
        } else {
          resolve(false);
        }
      });
    });
  }

  public async renderLatexToPdfPuppeteer(texContent: string, outputPdfPath: string): Promise<boolean> {
    try {
      const html = this.convertLatexToAtsHtml(texContent);
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'domcontentloaded' });

      await page.pdf({
        path: outputPdfPath,
        format: 'Letter',
        printBackground: true,
        margin: { top: '0.4in', bottom: '0.4in', left: '0.5in', right: '0.5in' },
      });

      await browser.close();
      console.log(`[LatexPdfService] Puppeteer PDF rendered successfully: ${outputPdfPath}`);
      return true;
    } catch (err: any) {
      console.error('[LatexPdfService] Puppeteer PDF rendering error:', err.message);
      return false;
    }
  }

  private convertLatexToAtsHtml(texContent: string): string {
    // 1. Remove comments (% to end of line)
    let cleanedTex = texContent.replace(/(^|[^\\])%.*/g, '$1');

    // Extract name from LaTeX header
    const nameMatch = cleanedTex.match(/\\textbf\{\\Huge\\scshape\s+([^}]+)\}/) || cleanedTex.match(/\\huge\{([^}]+)\}/);
    const name = nameMatch ? nameMatch[1].trim() : 'Veera Venkata Naga Satyanarayana Thota';

    const cleanTex = (str: string) => {
      let s = str;
      // Handle LaTeX template macro syntax
      s = s.replace(/\$\|\$/g, ' | ');
      s = s.replace(/\\textbf\{([^}]+)\}\{:\s*([^}]+)\}/g, '<strong>$1</strong>: $2');
      s = s.replace(/\\textbf\{([^}]+)\}\{:\s*/g, '<strong>$1</strong>: ');

      // Remove common LaTeX formatting commands & sizing
      s = s.replace(/\\vspace\{[^}]+\}/g, '');
      s = s.replace(/\\small\b/g, '');
      s = s.replace(/\\scshape\b/g, '');
      s = s.replace(/\\large\b/g, '');
      s = s.replace(/\\Huge\b/g, '');
      s = s.replace(/\\huge\b/g, '');
      s = s.replace(/\\quad/g, ' &nbsp;&nbsp; ');
      s = s.replace(/\\hfill/g, '');
      s = s.replace(/\\\|/g, '|');
      s = s.replace(/\\&/g, '&');
      s = s.replace(/\\%/g, '%');
      s = s.replace(/\\_/g, '_');
      s = s.replace(/--/g, '–');
      s = s.replace(/\\\\/g, '');
      s = s.replace(/\\newline/g, '<br/>');
      s = s.replace(/\\resumeSubHeadingListStart/g, '');
      s = s.replace(/\\resumeSubHeadingListEnd/g, '');
      s = s.replace(/\\resumeItemListStart/g, '');
      s = s.replace(/\\resumeItemListEnd/g, '');
      s = s.replace(/\\item\s*\{/g, '<li>');
      s = s.replace(/\{:\s*/g, ': ');

      // Convert LaTeX text formatting to HTML
      s = s.replace(/\\textbf\{((?:[^{}]|\{[^{}]*\})*)\}/g, '<strong>$1</strong>');
      s = s.replace(/\\emph\{((?:[^{}]|\{[^{}]*\})*)\}/g, '<em>$1</em>');
      s = s.replace(/\\textit\{((?:[^{}]|\{[^{}]*\})*)\}/g, '<em>$1</em>');
      s = s.replace(/\\underline\{((?:[^{}]|\{[^{}]*\})*)\}/g, '<u>$1</u>');
      s = s.replace(/\\href\{([^}]+)\}\{((?:[^{}]|\{[^{}]*\})*)\}/g, '<a href="$1" target="_blank">$2</a>');
      s = s.replace(/\\small\{((?:[^{}]|\{[^{}]*\})*)\}/g, '$1');

      // Second pass for remaining nested tags
      s = s.replace(/\\textbf\{([^}]+)\}/g, '<strong>$1</strong>');
      s = s.replace(/\\emph\{([^}]+)\}/g, '<em>$1</em>');
      s = s.replace(/\\textit\{([^}]+)\}/g, '<em>$1</em>');
      
      // Strip outer enclosing braces and orphan braces
      s = s.replace(/\{\}/g, '');
      s = s.replace(/^\{+/, '').replace(/\}+$/, '').trim();
      return s;
    };

    // Extract contact info from header area (before first \section)
    const firstSectionIdx = cleanedTex.indexOf('\\section{');
    const headerArea = firstSectionIdx > 0 ? cleanedTex.substring(0, firstSectionIdx) : cleanedTex.substring(0, 500);
    
    // Extract contact info from \begin{center} ... \end{center}
    const centerMatch = headerArea.match(/\\begin\{center\}([\s\S]*?)\\end\{center\}/);
    let contactHtml = 'Bhimavaram, Andhra Pradesh | +91 6301253789 | narayananaiduthota@gmail.com | Portfolio | LinkedIn | GitHub';
    if (centerMatch) {
      let contactRaw = centerMatch[1]
        .replace(/\\textbf\{\\Huge[^\n]+/, '')
        .replace(/\\huge\{[^\n]+/, '')
        .replace(/\\small\b/, '')
        .trim();
      contactHtml = cleanTex(contactRaw);
    }

    // Extract all sections
    const sectionRegex = /\\section\{([^}]+)\}([\s\S]*?)(?=\\section\{|\\end\{document\})/g;
    let sectionsHtml = '';
    let match;

    while ((match = sectionRegex.exec(cleanedTex)) !== null) {
      const title = match[1].trim();
      const body = match[2].trim();

      let parsedBody = '';

      if (body.includes('\\resumeSubheading') || body.includes('\\resumeItem')) {
        // Parse structured sections (Experience, Education, Projects)
        const subBlocks = body.split('\\resumeSubheading');
        for (let i = 0; i < subBlocks.length; i++) {
          const hBlock = subBlocks[i];
          if (!hBlock.trim()) continue;

          const args = hBlock.match(/\{([^}]+)\}/g);
          if (args && args.length >= 2) {
            const h1 = cleanTex(args[0]);
            const h2 = cleanTex(args[1]);
            const h3 = args[2] ? cleanTex(args[2]) : '';
            const h4 = args[3] ? cleanTex(args[3]) : '';

            parsedBody += `
              <div class="subheading">
                <div class="row"><strong>${h1}</strong> <span>${h2}</span></div>
                ${h3 || h4 ? `<div class="row sub"><em>${h3}</em> <span><em>${h4}</em></span></div>` : ''}
              </div>
            `;
          }

          // Parse bullet items
          const itemMatches = hBlock.match(/\\resumeItem\{((?:[^{}]|\{[^{}]*\})*)\}/g);
          if (itemMatches && itemMatches.length > 0) {
            parsedBody += '<ul>';
            for (const itemStr of itemMatches) {
              const itemText = itemStr.replace(/^\\resumeItem\{/, '').replace(/\}$/, '');
              parsedBody += `<li>${cleanTex(itemText.trim())}</li>`;
            }
            parsedBody += '</ul>';
          }
        }
      } else if (body.includes('\\textbf{')) {
        // Parse skills or certification section
        const lines = body.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        parsedBody += '<ul class="skills-list">';
        for (const line of lines) {
          if (line.includes('\\begin{') || line.includes('\\end{')) continue;
          parsedBody += `<li>${cleanTex(line)}</li>`;
        }
        parsedBody += '</ul>';
      } else {
        // Plain text / summary section
        parsedBody = `<div class="text-block">${cleanTex(body)}</div>`;
      }

      sectionsHtml += `
        <div class="section">
          <h2>${title}</h2>
          <hr/>
          ${parsedBody}
        </div>
      `;
    }

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${name} - ATS Resume</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    * { box-sizing: border-box; }
    html, body {
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 8.5pt;
      line-height: 1.3;
      color: #111827;
      padding: 0.25in 0.35in;
    }
    .header { text-align: center; margin-bottom: 6px; }
    .header h1 { font-size: 16pt; margin: 0 0 2px 0; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #000; }
    .header .contact { font-size: 8pt; color: #4b5563; }
    .header a { color: #1d4ed8; text-decoration: none; font-weight: 500; }
    .section { margin-top: 6px; margin-bottom: 4px; page-break-inside: avoid; }
    .section h2 { font-size: 9.5pt; text-transform: uppercase; margin: 0; font-weight: 700; letter-spacing: 0.5px; color: #111827; }
    .section hr { border: none; border-top: 1px solid #374151; margin: 1px 0 4px 0; }
    .subheading { margin-top: 3px; margin-bottom: 2px; }
    .row { display: flex; justify-content: space-between; font-size: 8.5pt; color: #111827; }
    .row.sub { font-size: 8pt; color: #4b5563; margin-top: 1px; }
    ul { margin: 2px 0 3px 14px; padding: 0; }
    li { margin-bottom: 1.5px; font-size: 8.2pt; line-height: 1.25; color: #1f2937; }
    .skills-list { list-style: none; margin-left: 0; }
    .skills-list li { font-size: 8.2pt; margin-bottom: 2px; }
    a { color: #1d4ed8; text-decoration: none; }
    .text-block { font-size: 8.2pt; text-align: justify; margin-bottom: 3px; line-height: 1.3; color: #1f2937; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${name}</h1>
    <div class="contact">${contactHtml}</div>
  </div>
  ${sectionsHtml}
</body>
</html>
    `;
  }
}

export const latexPdfService = new LatexPdfService();
