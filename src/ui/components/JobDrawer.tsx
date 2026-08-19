import React, { useState, useEffect } from 'react';
import { IJob, IProfile } from '../../app-core/types';
import { store } from '../../app-core/store';
import { llmClient } from '../../app-core/llmClient';
import { ScoreBadge } from './ScoreBadge';
import { StatusBadge } from './StatusBadge';
import {
  generateResumePdfDataUri,
  downloadResumePdfFile,
  generateAtsResumeLatex,
  downloadResumeLatexFile,
  cleanFilenameSlug
} from '../../app-core/resumeGenerator';
import {
  X, Check, Trash2, ExternalLink, MapPin, Building, AlertCircle,
  Copy, FileText, CheckCircle2, XCircle, Sparkles, Mail, Download,
  UserCheck, Linkedin, Eye, Send, Award, RefreshCw, Bot, Key, Wand2, Users,
  Code, Maximize2, Minimize2, Brain, ShieldCheck, Globe, BookOpen,
  Terminal, DollarSign, ShieldAlert, Zap, Layers, Clock, CheckSquare
} from 'lucide-react';

import { aiCouncil } from '../../app-core/aiCouncil';
import { ragAugmentor } from '../../app-core/rag/ragAugmentor';
import { getCompanyCareerPortal } from '../../app-core/extractor';
import { generateOutreachSuite } from '../../app-core/outreachAgent';
import { generateInterviewMasterGuide } from '../../app-core/interviewMasterGuide';
import { webScrapingAuditor } from '../../app-core/webScrapingAuditor';
import { generateFollowupCadence, generateFollowupCadenceWithAi } from '../../app-core/followupCadence';
import { applicationAnswers } from '../../app-core/applicationAnswers';
import { salaryNegotiation } from '../../app-core/salaryNegotiation';
import { auditBlockGLegitimacy, auditBlockGLegitimacyWithAi } from '../../app-core/scorer';
import {
  IColdOutreachSuite,
  IInterviewMasterGuide,
  IWebScrapingIntelligence,
  IBlockGAudit,
  IFollowupCadenceSuite,
  IApplicationAnswersSuite,
  ISalaryNegotiationSuite
} from '../../app-core/types';

interface JobDrawerProps {
  job: IJob | null;
  profile: IProfile;
  onClose: () => void;
  onUpdateApproval: (jobId: string, status: 'pending' | 'approved' | 'rejected') => void;
  onUpdateApplication: (jobId: string, status: 'not_applied' | 'applied' | 'interview' | 'offer' | 'rejected') => void;
  onDeleteJob?: (jobId: string) => void;
}

export function JobDrawer({ job, profile, onClose, onUpdateApproval, onUpdateApplication, onDeleteJob }: JobDrawerProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'appanswers' | 'followup' | 'negotiation' | 'masterguide' | 'outreach' | 'webintel' | 'council' | 'resume' | 'referral' | 'interview' | 'coverletter'>('overview');
  const [resumeSubTab, setResumeSubTab] = useState<'pdf' | 'latex'>('pdf');
  const [guideSubTab, setGuideSubTab] = useState<'dsa' | 'systemdesign' | 'cramsheet' | 'salary' | 'culture'>('dsa');
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [copiedText, setCopiedText] = useState(false);
  const [copiedLatex, setCopiedLatex] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(true);
  const [pdfDataUri, setPdfDataUri] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingLatex, setDownloadingLatex] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [isMaximized, setIsMaximized] = useState(false);

  // JobRadar Autonomous Suite State
  const [outreachData, setOutreachData] = useState<IColdOutreachSuite | null>(null);
  const [masterGuideData, setMasterGuideData] = useState<IInterviewMasterGuide | null>(null);
  const [webIntelData, setWebIntelData] = useState<IWebScrapingIntelligence | null>(null);
  const [appAnswersData, setAppAnswersData] = useState<IApplicationAnswersSuite | null>(null);
  const [followupData, setFollowupData] = useState<IFollowupCadenceSuite | null>(null);
  const [salaryData, setSalaryData] = useState<ISalaryNegotiationSuite | null>(null);
  const [blockGData, setBlockGData] = useState<IBlockGAudit | null>(null);
  const [isScrapingLive, setIsScrapingLive] = useState(false);
  const [liveJdError, setLiveJdError] = useState<string | null>(null);

  useEffect(() => {
    if (job) {
      const out = job.outreachSuite || generateOutreachSuite(job, profile);
      const mg = job.interviewMasterGuide || generateInterviewMasterGuide(job, profile);
      const appAns = job.applicationAnswers || applicationAnswers.generateAnswersDeterministic(job, profile);
      const flw = job.followupCadence || generateFollowupCadence(job, profile);
      const sal = job.salaryNegotiation || salaryNegotiation.generateNegotiationSuite(job, profile);
      const bg = job.blockGAudit || auditBlockGLegitimacy(job);

      setOutreachData(out);
      setMasterGuideData(mg);
      setWebIntelData(job.webIntelligence || null);
      setAppAnswersData(appAns);
      setFollowupData(flw);
      setSalaryData(sal);
      setBlockGData(bg);
      setLiveJdError(null);
    }
  }, [job, profile]);

  const handleFetchLiveJd = async () => {
    if (!job?.applicationLink) return;
    setIsScrapingLive(true);
    setLiveJdError(null);
    try {
      const { fetchWebPageHtml, cleanHtmlToText } = await import('../../app-core/webFetcher');
      const html = await fetchWebPageHtml(job.applicationLink);
      const text = cleanHtmlToText(html);
      const trimmed = text.slice(0, 8000); // keep first 8k chars
      store.updateJob(job.id, { liveScrapedContent: trimmed, liveScrapedAt: new Date().toISOString() });
    } catch (err: any) {
      setLiveJdError(`Failed to fetch: ${err.message}`);
    } finally {
      setIsScrapingLive(false);
    }
  };


  // AI Loading & Execution States
  const [isLlmRunning, setIsLlmRunning] = useState(false);
  const [aiActionLabel, setAiActionLabel] = useState('');
  const [aiModelUsed, setAiModelUsed] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    if (job && activeTab === 'resume') {
      try {
        const uri = generateResumePdfDataUri(job, profile);
        setPdfDataUri(uri);
      } catch (err) {
        console.error('Failed to generate resume data URI:', err);
      }
    }
  }, [job, profile, activeTab]);

  if (!job) return null;

  const copyToClipboard = (text: string, idx?: number) => {
    navigator.clipboard.writeText(text);
    if (typeof idx === 'number') {
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    } else {
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    }
  };

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      const res = await downloadResumePdfFile(job, profile);
      if (res.success) {
        setSaveSuccessMsg(res.path ? `Saved ATS Resume to ${res.path}` : 'Downloaded ATS Resume PDF');
        setTimeout(() => setSaveSuccessMsg(''), 4000);
      }
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleDownloadLatex = async () => {
    setDownloadingLatex(true);
    try {
      const res = await downloadResumeLatexFile(job, profile);
      if (res.success) {
        setSaveSuccessMsg(res.path ? `Saved LaTeX Source to ${res.path}` : 'Downloaded LaTeX (.tex) Resume File');
        setTimeout(() => setSaveSuccessMsg(''), 4000);
      }
    } catch (err) {
      console.error('LaTeX Download error:', err);
    } finally {
      setDownloadingLatex(false);
    }
  };

  const handleCopyLatex = () => {
    const code = generateAtsResumeLatex(job, profile);
    navigator.clipboard.writeText(code);
    setCopiedLatex(true);
    setSaveSuccessMsg('Copied ATS LaTeX source code to clipboard!');
    setTimeout(() => {
      setCopiedLatex(false);
      setSaveSuccessMsg('');
    }, 3000);
  };

  // 1. AI Re-Scorer Agent (OpenRouter)
  const handleAiReScore = async () => {
    const key = profile.apiKey || profile.groqApiKey || profile.geminiApiKey || "";
    if (!key) {
      setAiError('Please configure an AI API Key (OpenRouter, Groq, or Gemini) in Settings to run real LLM reasoning.');
      setTimeout(() => setAiError(null), 5000);
      return;
    }

    setIsLlmRunning(true);
    setAiActionLabel('Evaluating Fit Score & 5-Tier Rubric with OpenRouter LLM...');
    setAiError(null);
    try {
      const res = await llmClient.scoreJobWithLlm(job, profile, key);
      if (res.success && res.data) {
        const d = res.data;
        const updates: Partial<IJob> = {
          matchScore: d.matchScore,
          matchConfidence: d.matchConfidence,
          gapAnalysis: d.gapAnalysis,
          fitBreakdown: d.fitBreakdown,
          rubricScores: d.rubricScores,
          scoreFlag: d.scoreFlag,
          skillMatched: d.skillMatched,
        };
        store.updateJob(job.id, updates);
        setAiModelUsed(res.modelUsed || 'OpenRouter Free Model');
        setSaveSuccessMsg(`Fit score & rubric evaluated via ${res.modelUsed || 'OpenRouter'}!`);
        setTimeout(() => setSaveSuccessMsg(''), 4000);
      } else {
        setAiError(res.error || 'Failed to score job with OpenRouter LLM');
      }
    } catch (err: any) {
      setAiError(err.message);
    } finally {
      setIsLlmRunning(false);
      setAiActionLabel('');
    }
  };

  // 2. AI Resume Bullet Tailor Agent (OpenRouter)
  const handleAiTailorResume = async () => {
    const key = profile.apiKey || profile.groqApiKey || profile.geminiApiKey || "";
    if (!key) {
      setAiError('Please configure an AI API Key (OpenRouter, Groq, or Gemini) in Settings to run real LLM reasoning.');
      setTimeout(() => setAiError(null), 5000);
      return;
    }

    setIsLlmRunning(true);
    setAiActionLabel('Customizing Project Highlights with OpenRouter LLM...');
    setAiError(null);
    try {
      const res = await llmClient.tailorResumeBulletsWithLlm(job, profile, key);
      if (res.success && res.data) {
        const notes = `ATS Optimized for ${job.companyName}: ${res.data.summary}`;
        store.updateJob(job.id, { resumeNotes: notes });
        setAiModelUsed(res.modelUsed || 'OpenRouter Free Model');
        setSaveSuccessMsg(`Project highlights tailored via ${res.modelUsed || 'OpenRouter'}!`);
        // Refresh PDF preview
        try {
          const uri = generateResumePdfDataUri(job, profile);
          setPdfDataUri(uri);
        } catch (e) {}
        setTimeout(() => setSaveSuccessMsg(''), 4000);
      } else {
        setAiError(res.error || 'Failed to tailor resume with OpenRouter LLM');
      }
    } catch (err: any) {
      setAiError(err.message);
    } finally {
      setIsLlmRunning(false);
      setAiActionLabel('');
    }
  };

  // 3. AI Interview Prep Agent (OpenRouter)
  const handleGenerateRealAiPrep = async () => {
    const key = profile.apiKey || profile.groqApiKey || profile.geminiApiKey || "";
    if (!key) {
      setAiError('Please configure an AI API Key (OpenRouter, Groq, or Gemini) in Settings to run real LLM generation.');
      setTimeout(() => setAiError(null), 5000);
      return;
    }

    setIsLlmRunning(true);
    setAiActionLabel('Generating Role-Specific Interview Questions with OpenRouter LLM...');
    setAiError(null);
    try {
      const res = await llmClient.generateAiInterviewPrep(job, profile, key);
      if (res.success && res.data) {
        job.interviewPrep = res.data;
        store.updateJob(job.id, { interviewPrep: res.data });
        setAiModelUsed(res.modelUsed || 'OpenRouter Free Model');
        setSaveSuccessMsg(`Interview prep generated via ${res.modelUsed || 'OpenRouter'}!`);
        setTimeout(() => setSaveSuccessMsg(''), 4000);
      } else {
        setAiError(res.error || 'Failed to generate interview prep with OpenRouter LLM');
      }
    } catch (err: any) {
      setAiError(err.message);
    } finally {
      setIsLlmRunning(false);
      setAiActionLabel('');
    }
  };

  // 4. AI Cover Letter Agent (OpenRouter)
  const handleGenerateRealAiLetter = async () => {
    const key = profile.apiKey || profile.groqApiKey || profile.geminiApiKey || "";
    if (!key) {
      setAiError('Please configure an AI API Key (OpenRouter, Groq, or Gemini) in Settings to run real LLM generation.');
      setTimeout(() => setAiError(null), 5000);
      return;
    }

    setIsLlmRunning(true);
    setAiActionLabel('Drafting Personalized Pitch Letter with OpenRouter LLM...');
    setAiError(null);
    try {
      const res = await llmClient.generateAiCoverLetter(job, profile, key);
      if (res.success && res.data) {
        job.coverLetterText = res.data;
        store.updateJob(job.id, { coverLetterText: res.data });
        setAiModelUsed(res.modelUsed || 'OpenRouter Free Model');
        setSaveSuccessMsg(`Cover letter generated via ${res.modelUsed || 'OpenRouter'}!`);
        setTimeout(() => setSaveSuccessMsg(''), 4000);
      } else {
        setAiError(res.error || 'Failed to generate cover letter with OpenRouter LLM');
      }
    } catch (err: any) {
      setAiError(err.message);
    } finally {
      setIsLlmRunning(false);
      setAiActionLabel('');
    }
  };

  // 5. AI Referral Personalizer Agent (OpenRouter)
  const handleAiPersonalizeReferral = async (idx: number, personaRole: string) => {
    const key = profile.apiKey || profile.groqApiKey || profile.geminiApiKey || "";
    if (!key) {
      setAiError('Please configure an AI API Key (OpenRouter, Groq, or Gemini) in Settings to run real LLM reasoning.');
      setTimeout(() => setAiError(null), 5000);
      return;
    }

    setIsLlmRunning(true);
    setAiActionLabel(`Personalizing outreach for ${personaRole} with OpenRouter LLM...`);
    setAiError(null);
    try {
      const res = await llmClient.generateAiReferralMessage(job, profile, personaRole, key);
      if (res.success && res.data) {
        if (job.referralContacts && job.referralContacts[idx]) {
          job.referralContacts[idx].outreachDraft = res.data;
          store.updateJob(job.id, { referralContacts: [...job.referralContacts] });
          setSaveSuccessMsg(`Outreach draft customized by ${res.modelUsed || 'Claude 3.5 Sonnet'}!`);
          setTimeout(() => setSaveSuccessMsg(''), 4000);
        }
      } else {
        setAiError(res.error || 'Failed to personalize outreach with LLM');
      }
    } catch (err: any) {
      setAiError(err.message);
    } finally {
      setIsLlmRunning(false);
      setAiActionLabel('');
    }
  };

  // 6. AI Council Deliberation Agent (Multi-Model Consensus)
  const handleConveneAiCouncil = async () => {
    const key = profile.apiKey || profile.groqApiKey || profile.geminiApiKey || "";
    if (!key) {
      setAiError('Please configure an AI API Key (OpenRouter, Groq, or Gemini) in Settings to convene the AI Council.');
      setTimeout(() => setAiError(null), 5000);
      return;
    }

    setIsLlmRunning(true);
    setAiActionLabel('Convening 3-Model AI Council across OpenRouter free models...');
    setAiError(null);
    try {
      const res = await aiCouncil.conveneAiCouncil(job, profile, key);
      if (res.success && res.data) {
        job.aiCouncil = res.data;
        store.updateJob(job.id, {
          aiCouncil: res.data,
          matchScore: res.data.consensusScore,
        });
        setAiModelUsed(res.data.chairModelUsed);
        setSaveSuccessMsg(`AI Council synthesized consensus verdict (${res.data.consensusScore}% Match)!`);
        setTimeout(() => setSaveSuccessMsg(''), 4000);
      } else {
        setAiError(res.error || 'Failed to convene AI Council');
      }
    } catch (err: any) {
      setAiError(err.message);
    } finally {
      setIsLlmRunning(false);
      setAiActionLabel('');
    }
  };

  // 7. Live Web Scraping Auditor Agent
  const handleRunLiveScraper = async () => {
    if (!job) return;
    setIsScrapingLive(true);
    setSaveSuccessMsg('');
    setAiError(null);
    try {
      const intel = await webScrapingAuditor.auditJobWithLiveWebScraping(job, profile);
      setWebIntelData(intel);
      job.webIntelligence = intel;
      store.updateJob(job.id, { webIntelligence: intel });
      setSaveSuccessMsg(`Live Web Scraping completed for ${job.companyName} portal!`);
      setTimeout(() => setSaveSuccessMsg(''), 4000);
    } catch (err: any) {
      setAiError(`Web scraper error: ${err.message}`);
    } finally {
      setIsScrapingLive(false);
    }
  };

  // 8. AI Cold Outreach Suite Generator (OpenRouter)
  const handleGenerateAiOutreach = async () => {
    if (!job) return;
    const key = profile.apiKey || profile.groqApiKey || profile.geminiApiKey || "";
    if (!key) {
      setAiError('Please configure an AI API Key (OpenRouter, Groq, or Gemini) in Settings to run AI Outreach reasoning.');
      setTimeout(() => setAiError(null), 5000);
      return;
    }

    setIsLlmRunning(true);
    setAiActionLabel('Synthesizing Tailored Cold Email & Cadence with OpenRouter LLM...');
    setAiError(null);
    try {
      const res = await llmClient.generateAiOutreachSuite(job, profile, key);
      if (res.success && res.data) {
        setOutreachData(res.data);
        job.outreachSuite = res.data;
        store.updateJob(job.id, { outreachSuite: res.data });
        setSaveSuccessMsg(`Outreach suite synthesized via ${res.modelUsed || 'OpenRouter LLM'}!`);
        setTimeout(() => setSaveSuccessMsg(''), 4000);
      }
    } catch (err: any) {
      setAiError(err.message);
    } finally {
      setIsLlmRunning(false);
      setAiActionLabel('');
    }
  };

  // 9. AI Master Prep Guide Generator (OpenRouter)
  const handleGenerateAiMasterGuide = async () => {
    if (!job) return;
    const key = profile.apiKey || profile.groqApiKey || profile.geminiApiKey || "";
    if (!key) {
      setAiError('Please configure an AI API Key (OpenRouter, Groq, or Gemini) in Settings to run AI Prep Guide reasoning.');
      setTimeout(() => setAiError(null), 5000);
      return;
    }

    setIsLlmRunning(true);
    setAiActionLabel('Synthesizing Company DSA Challenges & System Design with OpenRouter LLM...');
    setAiError(null);
    try {
      const res = await llmClient.generateAiInterviewMasterGuide(job, profile, key);
      if (res.success && res.data) {
        setMasterGuideData(res.data);
        job.interviewMasterGuide = res.data;
        store.updateJob(job.id, { interviewMasterGuide: res.data });
        setSaveSuccessMsg(`Master Prep Guide synthesized via ${res.modelUsed || 'OpenRouter LLM'}!`);
        setTimeout(() => setSaveSuccessMsg(''), 4000);
      }
    } catch (err: any) {
      setAiError(err.message);
    } finally {
      setIsLlmRunning(false);
      setAiActionLabel('');
    }
  };

  const applyLink = job.applicationLink;
  const companyCareerUrl = job.companyPageUrl || getCompanyCareerPortal(job.companyName, job.applicationLink);
  const cleanCompany = cleanFilenameSlug(job.companyName || 'Company');
  const cleanRole = cleanFilenameSlug(job.jobTitle || 'Role');
  const pdfFileName = `Narayana_Thota_${cleanRole}_${cleanCompany}.pdf`;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 lg:p-6 animate-in fade-in duration-200">
      <div
        className={`bg-[#09090b] border border-zinc-800 shadow-2xl flex flex-col transition-all duration-200 overflow-hidden ${
          isMaximized
            ? 'fixed inset-0 w-full h-full rounded-none'
            : 'w-full max-w-7xl h-[92vh] rounded-[28px]'
        }`}
      >
        {/* Landscape Modal Header */}
        <div className="px-6 py-4 border-b border-zinc-800/80 bg-[#09090b]/95 backdrop-blur z-20 flex items-center justify-between gap-4">
          <div className="flex items-center space-x-3 truncate">
            <div className="space-y-0.5 truncate">
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-300">
                  {job.jobType || 'Full-Time'}
                </span>
                {job.isRemote && (
                  <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800">
                    Remote
                  </span>
                )}
                {job.skillMatched && (
                  <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Skill Match
                  </span>
                )}
                <span className="text-zinc-600">|</span>
                <span className="text-xs text-zinc-400 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-zinc-500" />
                  {job.location || 'India (Pan-India)'}
                </span>
              </div>
              <div className="flex items-center gap-2 truncate">
                <h2 className="text-lg lg:text-xl font-black text-white tracking-tight truncate">{job.jobTitle}</h2>
                <a
                  href={companyCareerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-semibold text-zinc-400 hover:text-white transition flex items-center gap-1 shrink-0 group"
                  title={`Open ${job.companyName} Careers Portal`}
                >
                  <Building className="w-3.5 h-3.5 text-zinc-500 group-hover:text-emerald-400 transition" />
                  <span className="group-hover:underline underline-offset-2">{job.companyName}</span>
                  <ExternalLink className="w-3 h-3 opacity-50 group-hover:opacity-100 transition" />
                </a>
              </div>
            </div>
          </div>

          {/* Quick Metrics & Actions */}
          <div className="flex items-center space-x-3 shrink-0">
            {job.applicationLink && (
              <a
                href={job.applicationLink}
                target="_blank"
                rel="noreferrer"
                className="hidden sm:flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-black bg-emerald-400 hover:bg-emerald-300 text-black transition shadow-lg shadow-emerald-950/50 hover:scale-105 shrink-0"
                title={`Open Direct Job Application Link: ${job.applicationLink}`}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Apply on Portal</span>
              </a>
            )}
            <ScoreBadge score={job.matchScore} />
            <StatusBadge type="approval" status={job.approvalStatus} />

            <div className="hidden sm:flex items-center space-x-1.5 pl-2 border-l border-zinc-800">
              <button
                onClick={() => onUpdateApproval(job.id, 'approved')}
                className={`px-3 py-1.5 rounded-full text-xs font-extrabold flex items-center space-x-1 transition ${
                  job.approvalStatus === 'approved'
                    ? 'bg-emerald-500 text-black shadow'
                    : 'bg-zinc-900 border border-zinc-700 text-zinc-300 hover:bg-zinc-800'
                }`}
              >
                <Check className="w-3.5 h-3.5" />
                <span>Approve</span>
              </button>

              <button
                onClick={() => onUpdateApproval(job.id, 'rejected')}
                className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center space-x-1 transition ${
                  job.approvalStatus === 'rejected'
                    ? 'bg-red-500 text-white shadow'
                    : 'bg-zinc-900 border border-zinc-700 text-zinc-300 hover:bg-zinc-800'
                }`}
              >
                <X className="w-3.5 h-3.5" />
                <span>Reject</span>
              </button>
            </div>

            <div className="flex items-center space-x-1 pl-2 border-l border-zinc-800">
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Are you sure you want to permanently delete "${job.jobTitle}" from your job feed?`)) {
                    if (onDeleteJob) {
                      onDeleteJob(job.id);
                    }
                    onClose();
                  }
                }}
                className="p-2 rounded-full hover:bg-red-950 text-zinc-500 hover:text-red-400 transition"
                title="Delete Job Posting"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsMaximized(!isMaximized)}
                className="p-2 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
                title={isMaximized ? 'Restore View' : 'Maximize Landscape View'}
              >
                {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
                title="Close Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Global Feedback Banner */}
        {saveSuccessMsg && (
          <div className="mx-6 mt-3 p-2.5 bg-emerald-950/80 border border-emerald-800 text-xs font-mono text-emerald-300 rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}

        {aiError && (
          <div className="mx-6 mt-3 p-2.5 bg-amber-950/80 border border-amber-800 text-xs font-mono text-amber-300 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{aiError}</span>
          </div>
        )}

        {/* Landscape 2-Column Main Workspace */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* â”€â”€ LEFT PANEL: Job Quick Brief & Original JD (35% width) â”€â”€ */}
          <div className="lg:w-[36%] xl:w-[34%] border-r border-zinc-800/80 flex flex-col overflow-y-auto p-5 space-y-4 bg-[#0c0c0e]">
            {/* Quick Actions (Mobile approve/reject) */}
            <div className="flex sm:hidden items-center justify-between gap-2 p-2 bg-[#121215] rounded-xl border border-zinc-800">
              <button
                onClick={() => onUpdateApproval(job.id, 'approved')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1 ${
                  job.approvalStatus === 'approved' ? 'bg-emerald-500 text-black' : 'bg-zinc-900 text-zinc-300'
                }`}
              >
                <Check className="w-3.5 h-3.5" /> Approve
              </button>
              <button
                onClick={() => onUpdateApproval(job.id, 'rejected')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 ${
                  job.approvalStatus === 'rejected' ? 'bg-red-500 text-white' : 'bg-zinc-900 text-zinc-300'
                }`}
              >
                <X className="w-3.5 h-3.5" /> Reject
              </button>
            </div>

            {/* Application Stage Control */}
            <div className="p-4 bg-[#121215] border border-[#27272a] rounded-2xl space-y-2">
              <span className="text-[11px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
                Application Pipeline Stage:
              </span>
              <div className="grid grid-cols-3 gap-1.5 text-[11px] font-mono font-bold">
                {[
                  { key: 'not_applied', label: 'Pending' },
                  { key: 'applied', label: 'Applied' },
                  { key: 'interview', label: 'Interview' },
                  { key: 'offer', label: 'Offer' },
                  { key: 'rejected', label: 'Rejected' },
                ].map((st) => (
                  <button
                    key={st.key}
                    onClick={() => onUpdateApplication(job.id, st.key as any)}
                    className={`py-1.5 px-2 rounded-xl transition text-center truncate ${
                      job.applicationStatus === st.key
                        ? 'bg-white text-black font-extrabold shadow'
                        : 'bg-[#09090b] text-zinc-400 border border-zinc-800 hover:bg-zinc-900'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Matched & Missing Skills */}
            <div className="p-4 bg-[#121215] border border-[#27272a] rounded-2xl space-y-3">
              <div className="space-y-1.5">
                <h4 className="text-[11px] font-mono font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Matched Skills ({job.atsAnalysis?.hardSkillsFound?.length || job.skillsRequired?.length || 0})
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {(job.atsAnalysis?.hardSkillsFound || job.skillsRequired || ['React.js', 'Node.js', 'Express', 'MongoDB']).map((skill, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 bg-emerald-950/60 border border-emerald-800/60 rounded-full text-[10px] font-mono text-emerald-300 font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {job.atsAnalysis?.hardSkillsMissing && job.atsAnalysis.hardSkillsMissing.length > 0 && (
                <div className="space-y-1.5 pt-1 border-t border-zinc-800/60">
                  <h4 className="text-[11px] font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" /> Growth / Missing ({job.atsAnalysis.hardSkillsMissing.length})
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {job.atsAnalysis.hardSkillsMissing.map((skill, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 bg-amber-950/40 border border-amber-800/50 rounded-full text-[10px] font-mono text-amber-300 font-medium"
                      >
                        + {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Raw Job Description / Live Scraped Content */}
            <div className="space-y-2 flex-1 flex flex-col">
              <h4 className="text-[11px] font-mono font-bold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  {job.liveScrapedContent ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 inline-block" />
                  )}
                  {job.liveScrapedContent ? 'Live Scraped JD' : 'Original Job Description'}
                </span>
                <div className="flex items-center gap-2">
                  {job.liveScrapedAt && (
                    <span className="text-[9px] text-emerald-500/70 font-mono">
                      {new Date(job.liveScrapedAt).toLocaleTimeString()}
                    </span>
                  )}
                  <span className="text-[10px] text-zinc-500 lowercase font-mono">
                    {(job.liveScrapedContent || job.rawDescription)?.length || 0} chars
                  </span>
                  {job.applicationLink && (
                    <button
                      onClick={handleFetchLiveJd}
                      disabled={isScrapingLive}
                      title="Fetch live job description from career portal"
                      className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-[10px] font-mono text-zinc-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isScrapingLive ? (
                        <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                      ) : (
                        <Globe className="w-2.5 h-2.5" />
                      )}
                      {isScrapingLive ? 'Fetching...' : job.liveScrapedContent ? 'Re-fetch JD' : 'Fetch Live JD'}
                    </button>
                  )}
                </div>
              </h4>
              {liveJdError && (
                <p className="text-[10px] text-red-400 font-mono px-1">{liveJdError}</p>
              )}
              <div className="p-4 bg-[#121215] border border-[#27272a] rounded-2xl text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed flex-1 min-h-[160px] max-h-80 lg:max-h-none overflow-y-auto font-sans">
                {job.liveScrapedContent || job.rawDescription || 'No description text recorded.'}
              </div>
            </div>


            {/* Dual Link Actions: Direct Role Apply + Company Career Portal */}
            <div className="space-y-2 shrink-0">
              {applyLink ? (
                <a
                  href={applyLink}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 text-black font-black text-xs transition hover:brightness-105 shadow-lg shadow-emerald-950/40 shrink-0"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Apply on Direct Portal Link</span>
                </a>
              ) : (
                <a
                  href={`https://www.google.com/search?q=${encodeURIComponent(`${job.companyName} ${job.jobTitle} apply online`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold text-xs border border-zinc-800 transition shrink-0"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Search Job Application Link</span>
                </a>
              )}

              {/* Company Career Page Button */}
              <a
                href={companyCareerUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-center space-x-2 py-2 px-4 rounded-xl bg-[#18181b] hover:bg-[#202024] text-zinc-400 hover:text-zinc-200 font-medium text-xs border border-zinc-800 transition shrink-0"
              >
                <Globe className="w-3.5 h-3.5 text-zinc-500" />
                <span>Company Careers Directory ({job.companyName})</span>
              </a>
            </div>
          </div>

          {/* â”€â”€ RIGHT PANEL: Multi-Tab Deep Workspace (65% width) â”€â”€ */}
          <div className="flex-1 flex flex-col overflow-hidden bg-[#09090b]">
            {/* Top Workspace Tab Bar */}
            <div className="flex items-center space-x-1 border-b border-zinc-800/80 px-6 pt-3 overflow-x-auto bg-[#09090b]/80 shrink-0">
              <button
                onClick={() => setActiveTab('overview')}
                className={`pb-2.5 px-3 text-xs font-bold transition flex items-center space-x-1.5 border-b-2 whitespace-nowrap ${
                  activeTab === 'overview' ? 'border-white text-white' : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <span>AI Match & Rubric</span>
              </button>

              <button
                onClick={() => setActiveTab('appanswers')}
                className={`pb-2.5 px-3 text-xs font-bold transition flex items-center space-x-1.5 border-b-2 whitespace-nowrap ${
                  activeTab === 'appanswers'
                    ? 'border-emerald-400 text-emerald-400 font-extrabold'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                <span>ðŸ“ App QA Answers</span>
              </button>

              <button
                onClick={() => setActiveTab('followup')}
                className={`pb-2.5 px-3 text-xs font-bold transition flex items-center space-x-1.5 border-b-2 whitespace-nowrap ${
                  activeTab === 'followup'
                    ? 'border-blue-400 text-blue-400 font-extrabold'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                <span>â±ï¸ Follow-Up Cadence</span>
              </button>

              <button
                onClick={() => setActiveTab('negotiation')}
                className={`pb-2.5 px-3 text-xs font-bold transition flex items-center space-x-1.5 border-b-2 whitespace-nowrap ${
                  activeTab === 'negotiation'
                    ? 'border-yellow-400 text-yellow-400 font-extrabold'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5 text-yellow-400" />
                <span>ðŸ’° Offer & Negotiation</span>
              </button>

              <button
                onClick={() => setActiveTab('masterguide')}
                className={`pb-2.5 px-3 text-xs font-bold transition flex items-center space-x-1.5 border-b-2 whitespace-nowrap ${
                  activeTab === 'masterguide'
                    ? 'border-amber-400 text-amber-400 font-extrabold'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                <span>ðŸš€ Master Prep Guide</span>
              </button>

              <button
                onClick={() => setActiveTab('outreach')}
                className={`pb-2.5 px-3 text-xs font-bold transition flex items-center space-x-1.5 border-b-2 whitespace-nowrap ${
                  activeTab === 'outreach'
                    ? 'border-cyan-400 text-cyan-400 font-extrabold'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Mail className="w-3.5 h-3.5 text-cyan-400" />
                <span>ðŸ“§ Cold Email & Cadence</span>
              </button>

              <button
                onClick={() => setActiveTab('webintel')}
                className={`pb-2.5 px-3 text-xs font-bold transition flex items-center space-x-1.5 border-b-2 whitespace-nowrap ${
                  activeTab === 'webintel'
                    ? 'border-emerald-400 text-emerald-400 font-extrabold'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Globe className="w-3.5 h-3.5 text-emerald-400" />
                <span>ðŸŒ Web Intelligence</span>
              </button>

              <button
                onClick={() => setActiveTab('council')}
                className={`pb-2.5 px-3 text-xs font-bold transition flex items-center space-x-1.5 border-b-2 whitespace-nowrap ${
                  activeTab === 'council' ? 'border-purple-400 text-purple-400 font-extrabold' : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>AI Council Chamber</span>
              </button>

              <button
                onClick={() => setActiveTab('resume')}
                className={`pb-2.5 px-3 text-xs font-bold transition flex items-center space-x-1.5 border-b-2 whitespace-nowrap ${
                  activeTab === 'resume' ? 'border-emerald-400 text-emerald-400 font-extrabold' : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>ATS Resume (PDF & LaTeX)</span>
              </button>

              <button
                onClick={() => setActiveTab('referral')}
                className={`pb-2.5 px-3 text-xs font-bold transition flex items-center space-x-1.5 border-b-2 whitespace-nowrap ${
                  activeTab === 'referral' ? 'border-white text-white' : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Referrals ({job.referralContacts?.length || 6})</span>
              </button>

              <button
                onClick={() => setActiveTab('coverletter')}
                className={`pb-2.5 px-3 text-xs font-bold transition flex items-center space-x-1.5 border-b-2 whitespace-nowrap ${
                  activeTab === 'coverletter' ? 'border-cyan-400 text-cyan-400 font-extrabold' : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Cover Letter</span>
              </button>
            </div>

            {/* Tab Body View */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* â”€â”€ 1. OVERVIEW TAB: Deep AI Rubrics & Match Breakdown â”€â”€ */}
              {activeTab === 'overview' && (
                <div className="space-y-5">
                  {/* AI Re-Score Banner */}
                  <div className="p-4 bg-gradient-to-r from-[#18181b] via-[#121215] to-[#18181b] border border-[#27272a] rounded-[20px] flex items-center justify-between gap-4 shadow">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          <span>AI Match & Rubric Scorer</span>
                        </h4>
                        {aiModelUsed && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800">
                            {aiModelUsed}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-400">
                        Run OpenRouter free model reasoning to evaluate candidate fit and compute 5-tier JobRadar fit rubric.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleAiReScore}
                      disabled={isLlmRunning}
                      className="px-4 py-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-black font-extrabold text-xs hover:brightness-110 transition shadow shrink-0 flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3 h-3 ${isLlmRunning ? 'animate-spin' : ''}`} />
                      <span>{isLlmRunning ? 'Scoring...' : 'âš¡ AI Re-Score (OpenRouter)'}</span>
                    </button>
                  </div>

                  {/* Career-Ops Structured Fit Dossier & A-F Grading */}
                  {(() => {
                    const report = job.structuredFitReport || {
                      recommendation: (job.rubricScores?.recommendation || (job.matchScore >= 75 ? 'APPLY' : job.matchScore >= 50 ? 'BORDERLINE' : 'SKIP')),
                      letterGrade: (job.rubricScores?.letterGrade || (job.matchScore >= 88 ? 'A' : job.matchScore >= 74 ? 'B' : job.matchScore >= 60 ? 'C' : job.matchScore >= 45 ? 'D' : 'F')),
                      numericalScore: job.rubricScores?.overallRubricRating || Number((job.matchScore / 20).toFixed(1)),
                      matchPercentage: job.matchScore,
                      pros: job.gapAnalysis?.strongMatches?.map((s) => `Strong alignment with ${s}`) || [],
                      cons: job.gapAnalysis?.missingKeywords?.map((s) => `Missing keyword: ${s}`) || [],
                      missingSkills: job.gapAnalysis?.missingKeywords || [],
                      dealbreakersFound: [],
                      isDealbreaker: false,
                      executiveSummary: `Evaluated ${job.jobTitle} at ${job.companyName} (${job.matchScore}% Match, Rubric ${job.rubricScores?.overallRubricRating || 4.5}/5.0).`,
                    };

                    const isApply = report.recommendation === 'APPLY';
                    const isBorderline = report.recommendation === 'BORDERLINE';
                    const isSkip = report.recommendation === 'SKIP';

                    return (
                      <div className="p-5 bg-[#121215] border border-[#27272a] rounded-[22px] space-y-4 shadow-xl">
                        {/* Header with Letter Grade & Recommendation */}
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
                          <div className="flex items-center gap-3">
                            {/* Big Letter Grade Badge */}
                            <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center text-xl font-black font-mono shadow-lg ${
                              report.letterGrade === 'A' ? 'bg-emerald-950/80 border-emerald-500 text-emerald-400' :
                              report.letterGrade === 'B' ? 'bg-blue-950/80 border-blue-500 text-blue-400' :
                              report.letterGrade === 'C' ? 'bg-amber-950/80 border-amber-500 text-amber-400' :
                              'bg-red-950/80 border-red-500 text-red-400'
                            }`}>
                              {report.letterGrade}
                            </div>

                            <div>
                              <div className="flex items-center gap-2">
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-black uppercase tracking-wider border flex items-center gap-1 ${
                                  isApply ? 'bg-emerald-950/90 text-emerald-300 border-emerald-700' :
                                  isBorderline ? 'bg-amber-950/90 text-amber-300 border-amber-700' :
                                  'bg-red-950/90 text-red-300 border-red-700'
                                }`}>
                                  {isApply ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> :
                                   isBorderline ? <AlertCircle className="w-3.5 h-3.5 text-amber-400" /> :
                                   <XCircle className="w-3.5 h-3.5 text-red-400" />}
                                  <span>Recommendation: {report.recommendation}</span>
                                </span>

                                <span className="text-xs text-zinc-400 font-mono">
                                  Score: <strong className="text-white">{job.matchScore}%</strong>
                                </span>
                              </div>
                              <p className="text-xs text-zinc-400 mt-1">
                                4-Dimensional Fit Rubric: <strong className="text-amber-400 font-mono">{job.rubricScores?.overallRubricRating || 4.5} / 5.0</strong>
                              </p>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                              ATS TF-IDF Alignment
                            </span>
                            <div className="flex items-center justify-end gap-1.5 mt-0.5">
                              <FileText className="w-4 h-4 text-emerald-400" />
                              <span className="text-xl font-black text-emerald-400 font-mono">
                                {job.atsAnalysis?.keywordDensityScore || job.matchScore}%
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Dealbreaker Alert (If Applicable) */}
                        {(report.isDealbreaker || (report.dealbreakersFound && report.dealbreakersFound.length > 0)) && (
                          <div className="p-3.5 bg-red-950/60 border border-red-800/80 rounded-xl flex items-start gap-2.5">
                            <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                            <div className="text-xs space-y-1">
                              <span className="font-bold text-red-300">Hard Dealbreaker / Blocker Detected:</span>
                              <ul className="list-disc pl-4 text-red-200/90 space-y-0.5">
                                {report.dealbreakersFound.map((d, i) => (
                                  <li key={i}>{d}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )}

                        {/* 4-Dimensional Numerical Rubric Scale */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                          <div className="p-3 bg-[#18181b] border border-zinc-800 rounded-xl space-y-1">
                            <span className="text-[10px] font-mono text-zinc-400 uppercase">Tech Stack Match</span>
                            <div className="text-base font-black text-white font-mono flex items-center justify-between">
                              <span>â˜… {job.rubricScores?.technicalStackMatchScore || job.rubricScores?.skillsScore || 4.8}</span>
                              <span className="text-[10px] text-zinc-500 font-normal">/ 5.0</span>
                            </div>
                          </div>

                          <div className="p-3 bg-[#18181b] border border-zinc-800 rounded-xl space-y-1">
                            <span className="text-[10px] font-mono text-zinc-400 uppercase">Seniority & YOE</span>
                            <div className="text-base font-black text-white font-mono flex items-center justify-between">
                              <span>â˜… {job.rubricScores?.seniorityExperienceScore || job.rubricScores?.experienceScore || 4.7}</span>
                              <span className="text-[10px] text-zinc-500 font-normal">/ 5.0</span>
                            </div>
                          </div>

                          <div className="p-3 bg-[#18181b] border border-zinc-800 rounded-xl space-y-1">
                            <span className="text-[10px] font-mono text-zinc-400 uppercase">Domain Synergy</span>
                            <div className="text-base font-black text-white font-mono flex items-center justify-between">
                              <span>â˜… {job.rubricScores?.domainRelevanceScore || 4.6}</span>
                              <span className="text-[10px] text-zinc-500 font-normal">/ 5.0</span>
                            </div>
                          </div>

                          <div className="p-3 bg-[#18181b] border border-zinc-800 rounded-xl space-y-1">
                            <span className="text-[10px] font-mono text-zinc-400 uppercase">Comp & Location</span>
                            <div className="text-base font-black text-white font-mono flex items-center justify-between">
                              <span>â˜… {job.rubricScores?.compensationLocationScore || job.rubricScores?.cultureFitScore || 4.9}</span>
                              <span className="text-[10px] text-zinc-500 font-normal">/ 5.0</span>
                            </div>
                          </div>
                        </div>

                        {/* Executive Summary Box */}
                        <div className="p-3 bg-[#18181b]/70 border border-zinc-800/80 rounded-xl text-xs text-zinc-300 leading-relaxed font-sans">
                          <strong className="text-amber-400 font-mono text-[11px] block mb-1">FIT SUMMARY & DOSSIER:</strong>
                          {report.executiveSummary || 'Deep match analysis completed across candidate profile and job requirements.'}
                        </div>

                        {/* Pros & Cons Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          {/* Pros Card */}
                          <div className="p-3.5 bg-emerald-950/20 border border-emerald-900/40 rounded-xl space-y-2">
                            <h5 className="font-bold text-emerald-400 text-xs flex items-center gap-1.5 font-mono">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Key Alignment Points (Pros)</span>
                            </h5>
                            <ul className="space-y-1 text-zinc-300 text-[11px]">
                              {report.pros.length > 0 ? (
                                report.pros.map((p, i) => (
                                  <li key={i} className="flex items-start gap-1.5">
                                    <span className="text-emerald-400 mt-0.5">â€¢</span>
                                    <span>{p}</span>
                                  </li>
                                ))
                              ) : (
                                <li className="text-zinc-500 italic">No specific strengths identified.</li>
                              )}
                            </ul>
                          </div>

                          {/* Cons & Missing Skills Card */}
                          <div className="p-3.5 bg-amber-950/20 border border-amber-900/40 rounded-xl space-y-2">
                            <h5 className="font-bold text-amber-400 text-xs flex items-center gap-1.5 font-mono">
                              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                              <span>Friction Points & Missing Skills</span>
                            </h5>
                            <ul className="space-y-1 text-zinc-300 text-[11px]">
                              {report.cons.length > 0 ? (
                                report.cons.map((c, i) => (
                                  <li key={i} className="flex items-start gap-1.5">
                                    <span className="text-amber-400 mt-0.5">â€¢</span>
                                    <span>{c}</span>
                                  </li>
                                ))
                              ) : (
                                <li className="text-emerald-400/80 text-[11px]">âœ“ No critical skill gaps detected.</li>
                              )}
                            </ul>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* RAG Candidate Knowledge Evidence & Domain Fit Card */}
                  {(() => {
                    const ragContext = ragAugmentor.getRagContextForJob(job, { topK: 3 });
                    const isDomainMismatch = ragContext.confidenceScore < 0.25;

                    return (
                      <div className={`p-5 rounded-[22px] border space-y-3 shadow-xl ${
                        isDomainMismatch
                          ? 'bg-amber-950/20 border-amber-800/60'
                          : 'bg-emerald-950/20 border-emerald-800/60'
                      }`}>
                        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
                          <div className="flex items-center gap-2">
                            <span className={`p-1.5 rounded-lg border ${
                              isDomainMismatch
                                ? 'bg-amber-950 border-amber-700 text-amber-400'
                                : 'bg-emerald-950 border-emerald-700 text-emerald-400'
                            }`}>
                              <Brain className="w-4 h-4" />
                            </span>
                            <div>
                              <h4 className="text-xs font-black text-white flex items-center gap-2">
                                <span>RAG Knowledge Vault Grounding</span>
                                <span className={`text-[10px] font-mono px-2 py-0.2 rounded-full border font-bold ${
                                  isDomainMismatch
                                    ? 'bg-amber-950/80 text-amber-300 border-amber-800'
                                    : 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                                }`}>
                                  {isDomainMismatch ? 'âš ï¸ Domain Mismatch' : 'âœ“ Verified Candidate Fit'}
                                </span>
                              </h4>
                              <p className="text-[11px] text-zinc-400">
                                {isDomainMismatch
                                  ? 'Target job domain has low overlap with candidate software engineering vault.'
                                  : 'Grounded by real candidate project case studies and STAR stories from vault.'}
                              </p>
                            </div>
                          </div>

                          <div className="text-right font-mono">
                            <span className="text-[10px] text-zinc-500 block uppercase font-bold">Vector Similarity</span>
                            <span className={`text-base font-black ${
                              isDomainMismatch ? 'text-amber-400' : 'text-emerald-400'
                            }`}>
                              {Math.round(ragContext.confidenceScore * 100)}%
                            </span>
                          </div>
                        </div>

                        {/* Retrieved Chunks Preview */}
                        <div className="space-y-2 pt-1">
                          <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider">
                            Retrieved Evidence Sources ({ragContext.retrievedChunks.length}):
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {ragContext.retrievedChunks.map((res, rIdx) => (
                              <div
                                key={rIdx}
                                className="p-2.5 bg-black/40 border border-zinc-800/80 rounded-xl text-[11px] space-y-1"
                              >
                                <div className="flex items-center justify-between font-bold text-white text-[11px]">
                                  <span className="truncate">{res.chunk.documentTitle}</span>
                                  <span className="text-[10px] text-emerald-400 font-mono">
                                    {Math.round(res.similarityScore * 100)}%
                                  </span>
                                </div>
                                <p className="text-[10px] text-zinc-400 line-clamp-2 italic font-mono">
                                  "{res.contextSnippet}"
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Block G: Posting Legitimacy & Ghost Job Audit Card */}
                  {blockGData && (
                    <div className="p-5 rounded-[22px] border border-[#27272a] bg-[#121215] space-y-3 shadow-xl">
                      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className={`p-1.5 rounded-lg border ${
                            blockGData.isGhostJobRisk || blockGData.workAuthBlocker
                              ? 'bg-amber-950 border-amber-700 text-amber-400'
                              : 'bg-emerald-950 border-emerald-700 text-emerald-400'
                          }`}>
                            <ShieldCheck className="w-4 h-4" />
                          </span>
                          <div>
                            <h4 className="text-xs font-black text-white flex items-center gap-2">
                              <span>Block G: Posting Legitimacy & Ghost Job Audit</span>
                              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-bold ${
                                blockGData.verdict === 'Verified Legitimate'
                                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                                  : blockGData.verdict === 'Work-Auth Blocker'
                                  ? 'bg-red-950/80 text-red-300 border-red-800'
                                  : 'bg-amber-950/80 text-amber-300 border-amber-800'
                              }`}>
                                {blockGData.verdict}
                              </span>
                            </h4>
                            <p className="text-[11px] text-zinc-400">
                              {blockGData.recommendation}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <button
                            type="button"
                            onClick={async () => {
                              setIsLlmRunning(true);
                              setAiActionLabel('Auditing posting legitimacy and ghost job risk with AI...');
                              try {
                                const res = await auditBlockGLegitimacyWithAi(job, profile.apiKey || profile.groqApiKey || profile.geminiApiKey || "");
                                setBlockGData(res);
                                job.blockGAudit = res;
                                store.updateJob(job.id, { blockGAudit: res });
                                setSaveSuccessMsg('Block G Legitimacy Audit calibrated with AI reasoning!');
                                setTimeout(() => setSaveSuccessMsg(''), 4000);
                              } catch (err: any) {
                                setAiError(err.message);
                              } finally {
                                setIsLlmRunning(false);
                                setAiActionLabel('');
                              }
                            }}
                            disabled={isLlmRunning}
                            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-bold transition disabled:opacity-50"
                          >
                            <Sparkles className={`w-3.5 h-3.5 text-cyan-400 ${isLlmRunning ? 'animate-spin' : ''}`} />
                            <span>AI Re-Audit</span>
                          </button>

                          <div className="text-right font-mono">
                            <span className="text-[10px] text-zinc-500 block uppercase font-bold">Legitimacy</span>
                            <span className={`text-base font-black ${
                              blockGData.legitimacyScore >= 75 ? 'text-emerald-400' : 'text-amber-400'
                            }`}>
                              {blockGData.legitimacyScore}%
                            </span>
                          </div>
                        </div>
                      </div>

                      {blockGData.signalsFound.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {blockGData.signalsFound.map((sig, sIdx) => (
                            <span
                              key={sIdx}
                              className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3 h-3 text-cyan-400" /> {sig}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* â”€â”€ 2. AI COUNCIL CHAMBER TAB â”€â”€ */}
              {activeTab === 'council' && (
                <div className="space-y-5">
                  <div className="p-5 bg-gradient-to-r from-purple-950/40 via-[#18181b] to-indigo-950/40 border border-purple-800/60 rounded-[24px] space-y-3 shadow-xl">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="p-2 rounded-xl bg-purple-950 border border-purple-800 text-purple-400">
                            <Sparkles className="w-4 h-4" />
                          </span>
                          <h3 className="text-sm font-extrabold text-white">AI Hiring Council Chamber</h3>
                          <span className="px-2 py-0.5 rounded-full bg-purple-900 text-purple-200 text-[10px] font-mono font-bold">
                            3 AGENTS + 1 CHAIR
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 mt-1">
                          Convene 3 independent AI agents using distinct OpenRouter free models to debate candidate fit and produce unified consensus.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleConveneAiCouncil}
                        disabled={isLlmRunning}
                        className="px-5 py-2.5 rounded-full bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 text-white font-extrabold text-xs hover:brightness-110 transition shadow-lg shrink-0 flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLlmRunning ? 'animate-spin' : ''}`} />
                        <span>{isLlmRunning ? 'Council Deliberating...' : 'âš¡ Convene AI Council'}</span>
                      </button>
                    </div>
                  </div>

                  {job.aiCouncil ? (
                    <div className="space-y-4">
                      <div className="p-5 bg-[#121215] border border-[#27272a] rounded-[22px] space-y-3 shadow-xl">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Award className="w-5 h-5 text-amber-400" />
                            <h4 className="text-sm font-extrabold text-white">Council Consensus Verdict</h4>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800">
                              Synthesized by {job.aiCouncil.chairModelUsed}
                            </span>
                          </div>
                          <span className="text-lg font-black text-emerald-400 font-mono">
                            {job.aiCouncil.consensusScore}% Match
                          </span>
                        </div>

                        <div className="p-4 bg-[#09090b] border border-[#27272a] rounded-2xl text-xs text-zinc-300 font-sans leading-relaxed">
                          <p className="text-purple-300 font-bold mb-1">Chair Synthesis & Strategic Action Plan:</p>
                          {job.aiCouncil.chairSynthesis}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {(job.aiCouncil.memberVotes || []).map((vote, vi) => (
                          <div key={vi} className="p-4 bg-[#121215] border border-[#27272a] rounded-2xl space-y-2 shadow">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-white font-mono">
                                #{vi + 1} {vote.role}
                              </span>
                              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                                vote.score >= 85 ? 'bg-emerald-950 text-emerald-300' : 'bg-amber-950 text-amber-300'
                              }`}>
                                {vote.score}%
                              </span>
                            </div>
                            <p className="text-[11px] text-zinc-300 leading-relaxed">{vote.reasoning}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-12 text-center bg-[#121215] border border-[#27272a] rounded-[24px] space-y-3">
                      <div className="w-12 h-12 rounded-full bg-purple-950 border border-purple-800 text-purple-400 flex items-center justify-center mx-auto">
                        <Sparkles className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-extrabold text-white">Council Not Yet Convened</h4>
                      <p className="text-xs text-zinc-400 max-w-md mx-auto">
                        Click "Convene AI Council" above to spin up 3 diverse free OpenRouter models in parallel.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* â”€â”€ 3. ATS RESUME TAB (PDF + LaTeX Dual Mode) â”€â”€ */}
              {activeTab === 'resume' && (
                <div className="space-y-5">
                  <div className="p-6 bg-[#121215] border border-[#27272a] rounded-[24px] space-y-5 shadow-2xl">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center space-x-3">
                        <div className="p-3 bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 rounded-2xl">
                          <FileText className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="text-base font-extrabold text-white">ATS Tailored Resume Workspace</h3>
                          <p className="text-xs text-emerald-400 font-mono font-semibold flex items-center gap-1 mt-0.5">
                            <CheckCircle2 className="w-3.5 h-3.5" /> 100% Jake's Resume / FAANG Standard for {job.companyName}
                          </p>
                        </div>
                      </div>

                      {/* Sub-Tab Selector: PDF vs LaTeX */}
                      <div className="flex items-center space-x-1 p-1 bg-[#09090b] border border-zinc-800 rounded-xl">
                        <button
                          type="button"
                          onClick={() => setResumeSubTab('pdf')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                            resumeSubTab === 'pdf'
                              ? 'bg-emerald-500 text-black font-extrabold shadow'
                              : 'text-zinc-400 hover:text-white'
                          }`}
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>PDF Viewer</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setResumeSubTab('latex')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                            resumeSubTab === 'latex'
                              ? 'bg-purple-600 text-white font-extrabold shadow'
                              : 'text-zinc-400 hover:text-white'
                          }`}
                        >
                          <Code className="w-3.5 h-3.5" />
                          <span>LaTeX Code (.tex)</span>
                        </button>
                      </div>
                    </div>

                    {/* PDF SUB-TAB */}
                    {resumeSubTab === 'pdf' && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-[#09090b] border border-[#27272a] rounded-2xl text-[11px] font-mono text-emerald-400">
                          <div className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5" /> Single-Column ATS</div>
                          <div className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5" /> Zero Parse Bugs</div>
                          <div className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5" /> Standard Fonts</div>
                          <div className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5" /> Contact Links</div>
                        </div>

                        {pdfDataUri && (
                          <div className="w-full rounded-2xl overflow-hidden border border-zinc-700 bg-zinc-900 shadow-inner">
                            <iframe
                              src={pdfDataUri}
                              width="100%"
                              height="480px"
                              className="block"
                              title="ATS Resume Preview"
                            />
                          </div>
                        )}

                        <div className="flex flex-col sm:flex-row items-center gap-3">
                          <button
                            onClick={handleDownloadPdf}
                            disabled={downloadingPdf}
                            className="flex-1 w-full flex items-center justify-center space-x-2 py-3 px-6 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-black font-extrabold text-xs hover:brightness-110 transition shadow-xl disabled:opacity-50"
                          >
                            <Download className="w-4 h-4" />
                            <span>{downloadingPdf ? 'Generating PDF...' : 'Download ATS Resume PDF'}</span>
                          </button>

                          <button
                            onClick={handleDownloadLatex}
                            disabled={downloadingLatex}
                            className="w-full sm:w-auto flex items-center justify-center space-x-2 py-3 px-5 rounded-xl bg-purple-950 border border-purple-800 text-purple-300 font-bold text-xs hover:bg-purple-900 transition shadow disabled:opacity-50"
                          >
                            <Code className="w-4 h-4" />
                            <span>Download LaTeX (.tex)</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* LATEX SUB-TAB */}
                    {resumeSubTab === 'latex' && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-[#09090b] border border-[#27272a] rounded-2xl">
                          <div className="flex items-center space-x-2">
                            <Code className="w-4 h-4 text-purple-400" />
                            <span className="text-xs font-mono font-bold text-white">Jake's Resume FAANG LaTeX Code</span>
                          </div>

                          <div className="flex items-center space-x-2">
                            <button
                              onClick={handleCopyLatex}
                              className="px-3.5 py-1.5 rounded-lg bg-white text-black hover:bg-zinc-200 text-xs font-extrabold flex items-center gap-1.5 transition shadow"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              <span>{copiedLatex ? 'Copied LaTeX!' : 'Copy LaTeX Code'}</span>
                            </button>

                            <button
                              onClick={handleDownloadLatex}
                              disabled={downloadingLatex}
                              className="px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-extrabold flex items-center gap-1.5 transition shadow disabled:opacity-50"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>{downloadingLatex ? 'Saving...' : 'Download .tex File'}</span>
                            </button>
                          </div>
                        </div>

                        <div className="relative rounded-2xl overflow-hidden border border-zinc-800 bg-[#09090b]">
                          <textarea
                            readOnly
                            value={generateAtsResumeLatex(job, profile)}
                            className="w-full h-[460px] p-4 bg-[#09090b] text-emerald-400 font-mono text-xs leading-relaxed resize-none focus:outline-none select-all"
                            spellCheck={false}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* â”€â”€ ðŸ”¥ 2. MASTER PREP GUIDE TAB (DSA, SYSTEM DESIGN, CRAM SHEET, SALARY, CULTURE) â”€â”€ */}
              {activeTab === 'masterguide' && masterGuideData && (
                <div className="space-y-5 animate-in fade-in-50 duration-200">
                  {/* AI Regenerate Banner */}
                  <div className="p-4 bg-gradient-to-r from-[#18181b] via-[#121215] to-[#18181b] border border-[#27272a] rounded-[20px] flex flex-wrap items-center justify-between gap-4 shadow">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="p-1 rounded bg-amber-950/60 border border-amber-800/60 text-amber-400">
                          <Sparkles className="w-3.5 h-3.5" />
                        </span>
                        <h4 className="text-xs font-extrabold text-white">
                          AI Master Prep Guide Generator (OpenRouter API)
                        </h4>
                      </div>
                      <p className="text-[11px] text-zinc-400">
                        Synthesizes company-specific DSA challenges, system design architectures, and 48-hr cram sheets using OpenRouter LLM.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleGenerateAiMasterGuide}
                      disabled={isLlmRunning}
                      className="px-4 py-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-black font-extrabold text-xs hover:brightness-110 transition shadow shrink-0 flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLlmRunning ? 'animate-spin' : ''}`} />
                      <span>{isLlmRunning ? 'Synthesizing with AI...' : 'âš¡ AI Re-Generate Prep Guide'}</span>
                    </button>
                  </div>

                  {/* Master Guide Sub-Nav Pills */}
                  <div className="p-1.5 bg-[#121215] border border-zinc-800 rounded-2xl flex items-center gap-1 overflow-x-auto">
                    {[
                      { key: 'dsa', label: 'ðŸ’» DSA & Coding Challenges', icon: Code },
                      { key: 'systemdesign', label: 'ðŸ—ï¸ System Design Blueprint', icon: Layers },
                      { key: 'cramsheet', label: 'â±ï¸ 48-Hour Cram Sheet', icon: Zap },
                      { key: 'salary', label: 'ðŸ’° Salary & Negotiation Levers', icon: DollarSign },
                      { key: 'culture', label: 'ðŸš¨ Culture & Red-Flag Audit', icon: ShieldAlert },
                    ].map((st) => (
                      <button
                        key={st.key}
                        onClick={() => setGuideSubTab(st.key as any)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                          guideSubTab === st.key
                            ? 'bg-amber-500 text-black font-extrabold shadow-md'
                            : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                        }`}
                      >
                        <span>{st.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* SUB-VIEW 1: DSA Challenges */}
                  {guideSubTab === 'dsa' && (
                    <div className="space-y-4">
                      <div className="p-4 bg-[#121215] border border-[#27272a] rounded-2xl flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
                            Company-Specific DSA & Machine Coding Challenges
                          </h4>
                          <p className="text-xs text-zinc-400 mt-0.5">
                            Tailored coding rounds & data structures asked in {job.companyName} technical screens.
                          </p>
                        </div>
                        <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-amber-950 text-amber-300 border border-amber-800">
                          {masterGuideData.dsaChallenges.length} Challenges Ready
                        </span>
                      </div>

                      {masterGuideData.dsaChallenges.map((ch, idx) => (
                        <div key={idx} className="p-5 bg-[#121215] border border-[#27272a] rounded-[22px] space-y-3.5 shadow-lg">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase ${
                                  ch.difficulty === 'Easy' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                                  ch.difficulty === 'Medium' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                                  'bg-red-950 text-red-300 border border-red-800'
                                }`}>
                                  {ch.difficulty}
                                </span>
                                <span className="text-xs font-mono text-zinc-400">{ch.topic}</span>
                              </div>
                              <h3 className="text-sm font-extrabold text-white mt-1">{ch.title}</h3>
                              <p className="text-[11px] font-mono text-amber-400 mt-0.5">ðŸ”¥ {ch.companyFrequency}</p>
                            </div>

                            <button
                              type="button"
                              onClick={() => copyToClipboard(ch.starterCode, idx + 100)}
                              className="text-xs font-bold px-3 py-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 flex items-center gap-1.5 transition shrink-0"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              <span>{copiedIdx === idx + 100 ? 'Copied Code!' : 'Copy Starter Code'}</span>
                            </button>
                          </div>

                          <p className="text-xs text-zinc-300 leading-relaxed font-sans bg-[#09090b] p-3.5 rounded-xl border border-zinc-800/80">
                            {ch.problemStatement}
                          </p>

                          {/* Code Block */}
                          <div className="space-y-1.5">
                            <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
                              Interactive Starter Template:
                            </span>
                            <pre className="p-4 bg-[#070709] border border-zinc-800/80 rounded-xl text-xs font-mono text-emerald-300 overflow-x-auto leading-relaxed">
                              {ch.starterCode}
                            </pre>
                          </div>

                          {/* Key Insights */}
                          <div className="p-3 bg-zinc-900/60 rounded-xl border border-zinc-800 space-y-1.5">
                            <span className="text-[11px] font-mono font-bold text-zinc-300 uppercase">
                              ðŸ’¡ Optimal Strategy & Complexity:
                            </span>
                            <div className="flex flex-wrap gap-3 text-xs font-mono text-zinc-400">
                              <span><strong className="text-amber-400">Time:</strong> {ch.timeComplexity}</span>
                              <span><strong className="text-amber-400">Space:</strong> {ch.spaceComplexity}</span>
                            </div>
                            <ul className="list-disc list-inside text-xs text-zinc-400 space-y-1 pt-1">
                              {ch.keyInsights.map((insight, i) => (
                                <li key={i}>{insight}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* SUB-VIEW 2: System Design Blueprint */}
                  {guideSubTab === 'systemdesign' && (
                    <div className="space-y-4">
                      <div className="p-5 bg-[#121215] border border-[#27272a] rounded-[22px] space-y-3 shadow-lg">
                        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                          <div>
                            <h4 className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
                              Target Architecture Blueprint
                            </h4>
                            <h3 className="text-sm font-extrabold text-white mt-1">
                              {masterGuideData.systemDesign.title}
                            </h3>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(masterGuideData.systemDesign.mermaidDiagram)}
                            className="text-xs font-bold px-3 py-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 flex items-center gap-1.5 transition shrink-0"
                          >
                            <Copy className="w-3.5 h-3.5" /> Copy Mermaid Syntax
                          </button>
                        </div>

                        <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                          {masterGuideData.systemDesign.architectureSummary}
                        </p>

                        {/* Architecture Flow Diagram */}
                        <div className="p-4 bg-[#070709] border border-zinc-800/80 rounded-xl space-y-2">
                          <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
                            System Flow Diagram:
                          </span>
                          <pre className="text-xs font-mono text-cyan-300 overflow-x-auto leading-relaxed p-2">
                            {masterGuideData.systemDesign.mermaidDiagram}
                          </pre>
                        </div>

                        {/* Key Architectural Components */}
                        <div className="space-y-2 pt-2">
                          <h5 className="text-xs font-mono font-bold text-zinc-300 uppercase">
                            Key Architectural Components:
                          </h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {masterGuideData.systemDesign.keyComponents.map((comp, i) => (
                              <div key={i} className="p-3 bg-[#09090b] border border-zinc-800/80 rounded-xl text-xs text-zinc-300 font-mono">
                                â€¢ {comp}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Resume Project Mapping */}
                        <div className="p-4 bg-emerald-950/40 border border-emerald-800/60 rounded-xl space-y-1">
                          <span className="text-xs font-mono font-bold text-emerald-400 uppercase flex items-center gap-1.5">
                            <Award className="w-3.5 h-3.5" /> Candidate Project Talking Point:
                          </span>
                          <p className="text-xs text-emerald-200 font-sans leading-relaxed">
                            {masterGuideData.systemDesign.candidateProjectMapping}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SUB-VIEW 3: 48-Hour Cram Sheet */}
                  {guideSubTab === 'cramsheet' && (
                    <div className="space-y-4">
                      <div className="p-4 bg-gradient-to-r from-amber-950/40 via-zinc-900 to-amber-950/40 border border-amber-800/60 rounded-2xl flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
                            48-Hour Skill Gap Crash Course
                          </h4>
                          <p className="text-xs text-zinc-300 mt-0.5">
                            Condensed concepts and interview talking points to bridge all detected requirements.
                          </p>
                        </div>
                        <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-amber-500 text-black">
                          {masterGuideData.skillGapCramSheet.crashCourseModules.length} Skill Modules
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {masterGuideData.skillGapCramSheet.crashCourseModules.map((mod, i) => (
                          <div key={i} className="p-4 bg-[#121215] border border-[#27272a] rounded-[20px] space-y-2.5 shadow">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800">
                                {mod.skill}
                              </span>
                              <span className="text-[10px] font-mono text-zinc-500">Module #{i + 1}</span>
                            </div>

                            <p className="text-xs font-bold text-white leading-relaxed">
                              {mod.oneLinerConcept}
                            </p>

                            <pre className="p-2.5 bg-[#09090b] border border-zinc-800 rounded-lg text-[11px] font-mono text-emerald-300 overflow-x-auto">
                              {mod.essentialCodeSnippet}
                            </pre>

                            <div className="p-2.5 bg-red-950/30 border border-red-800/40 rounded-lg text-[11px] text-red-300 font-mono">
                              âš ï¸ <strong>Pitfall:</strong> {mod.commonInterviewPitfall}
                            </div>

                            <div className="p-2.5 bg-emerald-950/30 border border-emerald-800/40 rounded-lg text-[11px] text-emerald-300 font-mono">
                              ðŸ’¡ <strong>Say this:</strong> {mod.winningTalkingPoint}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* SUB-VIEW 4: Salary & Negotiation Levers */}
                  {guideSubTab === 'salary' && (
                    <div className="space-y-4">
                      <div className="p-5 bg-[#121215] border border-[#27272a] rounded-[22px] space-y-4 shadow-lg">
                        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                          <div>
                            <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider">
                              CTC Market Intelligence
                            </span>
                            <h3 className="text-sm font-extrabold text-white mt-0.5">
                              {masterGuideData.salaryBenchmark.tierClassification}
                            </h3>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="px-3 py-1 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded-full text-xs font-mono font-black">
                              {masterGuideData.salaryBenchmark.minLpa} â€“ {masterGuideData.salaryBenchmark.maxLpa}
                            </span>
                          </div>
                        </div>

                        {/* Negotiation Leverage Points */}
                        <div className="space-y-2">
                          <h5 className="text-xs font-mono font-bold text-zinc-300 uppercase">
                            Your Negotiation Leverage Points:
                          </h5>
                          <div className="space-y-1.5">
                            {masterGuideData.salaryBenchmark.leveragePoints.map((pt, i) => (
                              <div key={i} className="p-3 bg-[#09090b] border border-zinc-800 rounded-xl text-xs text-zinc-300 flex items-start gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                <span>{pt}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Negotiation Scripts */}
                        <div className="space-y-3 pt-2">
                          <div className="flex items-center justify-between">
                            <h5 className="text-xs font-mono font-bold text-amber-400 uppercase">
                              Verbal Negotiation Counter-Offer Script:
                            </h5>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(masterGuideData.salaryBenchmark.negotiationScript)}
                              className="text-xs font-bold px-3 py-1 rounded-full bg-white text-black hover:bg-zinc-200 flex items-center gap-1 transition"
                            >
                              <Copy className="w-3 h-3" /> Copy Script
                            </button>
                          </div>
                          <div className="p-4 bg-[#09090b] border border-zinc-800 rounded-xl text-xs text-zinc-300 font-mono leading-relaxed">
                            {masterGuideData.salaryBenchmark.negotiationScript}
                          </div>

                          <div className="flex items-center justify-between pt-2">
                            <h5 className="text-xs font-mono font-bold text-cyan-400 uppercase">
                              Written Counter-Offer Email Template:
                            </h5>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(masterGuideData.salaryBenchmark.counterOfferTemplate)}
                              className="text-xs font-bold px-3 py-1 rounded-full bg-white text-black hover:bg-zinc-200 flex items-center gap-1 transition"
                            >
                              <Copy className="w-3 h-3" /> Copy Email Template
                            </button>
                          </div>
                          <div className="p-4 bg-[#09090b] border border-zinc-800 rounded-xl text-xs text-zinc-300 font-mono whitespace-pre-wrap leading-relaxed">
                            {masterGuideData.salaryBenchmark.counterOfferTemplate}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SUB-VIEW 5: Culture & Red-Flag Audit */}
                  {guideSubTab === 'culture' && (
                    <div className="space-y-4">
                      <div className="p-5 bg-[#121215] border border-[#27272a] rounded-[22px] space-y-4 shadow-lg">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="p-4 bg-[#09090b] border border-zinc-800 rounded-xl space-y-1 text-center">
                            <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase">Work-Life Balance</span>
                            <div className="text-xl font-black text-emerald-400 font-mono">
                              â˜… {masterGuideData.companyCultureAudit.workLifeBalanceScore} / 10
                            </div>
                          </div>
                          <div className="p-4 bg-[#09090b] border border-zinc-800 rounded-xl space-y-1 text-center">
                            <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase">Tech Modernity</span>
                            <div className="text-xl font-black text-cyan-400 font-mono">
                              â˜… {masterGuideData.companyCultureAudit.techStackModernityScore} / 10
                            </div>
                          </div>
                          <div className="p-4 bg-[#09090b] border border-zinc-800 rounded-xl space-y-1 text-center">
                            <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase">Layoff Risk Indicator</span>
                            <div className="text-xl font-black text-emerald-400 font-mono">
                              {masterGuideData.companyCultureAudit.layOffRisk}
                            </div>
                          </div>
                        </div>

                        {/* Green Flags & Red Flags */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                          <div className="p-4 bg-emerald-950/20 border border-emerald-800/40 rounded-xl space-y-2">
                            <h5 className="text-xs font-mono font-bold text-emerald-400 uppercase flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Verified Green Flags
                            </h5>
                            <ul className="text-xs text-emerald-200 space-y-1.5 font-sans">
                              {masterGuideData.companyCultureAudit.greenFlags.map((flag, i) => (
                                <li key={i}>â€¢ {flag}</li>
                              ))}
                            </ul>
                          </div>

                          <div className="p-4 bg-amber-950/20 border border-amber-800/40 rounded-xl space-y-2">
                            <h5 className="text-xs font-mono font-bold text-amber-400 uppercase flex items-center gap-1.5">
                              <AlertCircle className="w-3.5 h-3.5" /> Watch Out / Questions to Ask
                            </h5>
                            <ul className="text-xs text-amber-200 space-y-1.5 font-sans">
                              {masterGuideData.companyCultureAudit.redFlags.map((flag, i) => (
                                <li key={i}>â€¢ {flag}</li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        {/* Insider Advice */}
                        <div className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-xl space-y-1">
                          <span className="text-xs font-mono font-bold text-zinc-300 uppercase">
                            ðŸ’¡ Insider Interview Format Advice:
                          </span>
                          <p className="text-xs text-zinc-300 font-sans leading-relaxed">
                            {masterGuideData.companyCultureAudit.insiderAdvice}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* â”€â”€ ðŸ”¥ 3. COLD EMAIL & 3-STEP CADENCE TAB â”€â”€ */}
              {activeTab === 'outreach' && outreachData && (
                <div className="space-y-5 animate-in fade-in-50 duration-200">
                  {/* AI Regenerate Banner */}
                  <div className="p-4 bg-gradient-to-r from-[#18181b] via-[#121215] to-[#18181b] border border-[#27272a] rounded-[20px] flex flex-wrap items-center justify-between gap-4 shadow">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="p-1 rounded bg-cyan-950/60 border border-cyan-800/60 text-cyan-400">
                          <Sparkles className="w-3.5 h-3.5" />
                        </span>
                        <h4 className="text-xs font-extrabold text-white">
                          AI Outreach & Follow-Up Sequence Generator (OpenRouter API)
                        </h4>
                      </div>
                      <p className="text-[11px] text-zinc-400">
                        Drafts high-converting 3-step cadence emails and LinkedIn InMails tailored to hiring managers using OpenRouter LLM.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleGenerateAiOutreach}
                      disabled={isLlmRunning}
                      className="px-4 py-2 rounded-full bg-gradient-to-r from-cyan-500 to-teal-500 text-black font-extrabold text-xs hover:brightness-110 transition shadow shrink-0 flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLlmRunning ? 'animate-spin' : ''}`} />
                      <span>{isLlmRunning ? 'Synthesizing with AI...' : 'âš¡ AI Re-Generate Cadence'}</span>
                    </button>
                  </div>

                  {/* Corporate Email Predictor Header */}
                  <div className="p-5 bg-gradient-to-r from-[#18181b] via-[#121215] to-[#18181b] border border-[#27272a] rounded-[22px] space-y-3 shadow-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="p-1.5 rounded-lg bg-cyan-950/60 border border-cyan-800/60 text-cyan-400">
                          <Mail className="w-4 h-4" />
                        </span>
                        <div>
                          <h3 className="text-sm font-extrabold text-white">Corporate Email Hunter & Pattern Predictor</h3>
                          <p className="text-xs text-zinc-400">Estimated Domain: @{outreachData.companyDomain}</p>
                        </div>
                      </div>
                      <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
                        {outreachData.emailPatterns.length} Patterns Found
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                      {outreachData.emailPatterns.map((pat, i) => (
                        <div key={i} className="p-3 bg-[#09090b] border border-zinc-800 rounded-xl space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono font-bold text-zinc-400">{pat.pattern}</span>
                            <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                              pat.confidence === 'High' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-zinc-800 text-zinc-400'
                            }`}>
                              {pat.confidence}
                            </span>
                          </div>
                          <p className="text-xs font-mono font-bold text-white truncate">{pat.example}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 3-Step Cadence Sequence */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                      <Clock className="w-4 h-4 text-cyan-400" /> Automated 3-Step Outreach Cadence Sequence
                    </h4>

                    {outreachData.cadenceSequence.map((step, idx) => (
                      <div key={idx} className="p-5 bg-[#121215] border border-[#27272a] rounded-[20px] space-y-3 shadow-lg">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-2.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-extrabold px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
                              Step #{step.stepNumber}
                            </span>
                            <h4 className="text-xs font-bold text-white">{step.dayLabel}</h4>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-zinc-500">{step.triggerCondition}</span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(`Subject: ${step.subject}\n\n${step.body}`, idx + 300)}
                              className="text-xs font-bold px-3 py-1 rounded-full bg-white text-black hover:bg-zinc-200 flex items-center gap-1 transition shadow shrink-0"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              <span>{copiedIdx === idx + 300 ? 'Copied!' : 'Copy Step'}</span>
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[11px] font-mono font-bold text-zinc-400">Subject: {step.subject}</span>
                          <textarea
                            readOnly
                            value={step.body}
                            className="w-full h-28 p-3 bg-[#09090b] border border-[#27272a] rounded-xl text-xs text-zinc-300 font-mono leading-relaxed resize-none focus:outline-none"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* LinkedIn InMail & Connection Pitch */}
                  <div className="p-5 bg-[#121215] border border-[#27272a] rounded-[20px] space-y-3">
                    <h4 className="text-xs font-mono font-bold text-[#0a66c2] uppercase tracking-wider flex items-center gap-1.5">
                      <Linkedin className="w-4 h-4" /> LinkedIn Direct Pitches & InMail
                    </h4>

                    <div className="space-y-3">
                      <div className="p-3 bg-[#09090b] border border-zinc-800 rounded-xl space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-mono font-bold text-zinc-300">
                            300-Char Connection Note (Max Acceptance Rate):
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(outreachData.linkedInNotes.connectionRequestNote300Char)}
                            className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                          >
                            Copy Note
                          </button>
                        </div>
                        <p className="text-xs font-mono text-zinc-400">{outreachData.linkedInNotes.connectionRequestNote300Char}</p>
                      </div>

                      <div className="p-3 bg-[#09090b] border border-zinc-800 rounded-xl space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-mono font-bold text-zinc-300">
                            Recruiter Direct Pitch (InMail):
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(outreachData.linkedInNotes.recruiterDirectPitch)}
                            className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                          >
                            Copy InMail
                          </button>
                        </div>
                        <p className="text-xs font-mono text-zinc-400">{outreachData.linkedInNotes.recruiterDirectPitch}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* â”€â”€ ðŸ”¥ 4. LIVE WEB INTELLIGENCE AGENT TAB â”€â”€ */}
              {activeTab === 'webintel' && (
                <div className="space-y-5 animate-in fade-in-50 duration-200">
                  <div className="p-5 bg-gradient-to-r from-[#18181b] via-[#121215] to-[#18181b] border border-[#27272a] rounded-[22px] flex flex-wrap items-center justify-between gap-4 shadow-xl">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="p-1.5 rounded-lg bg-emerald-950/60 border border-emerald-800/60 text-emerald-400">
                          <Globe className="w-4 h-4" />
                        </span>
                        <h3 className="text-sm font-extrabold text-white">Live Web Scraping & Grounding Agent</h3>
                      </div>
                      <p className="text-xs text-zinc-400">
                        Scrapes {job.companyName} official careers portal and engineering pages to verify live hiring state.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleRunLiveScraper}
                      disabled={isScrapingLive}
                      className="flex items-center space-x-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-black font-extrabold text-xs hover:brightness-110 transition shadow-lg shrink-0 disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isScrapingLive ? 'animate-spin' : ''}`} />
                      <span>{isScrapingLive ? 'Scraping Live Web...' : 'âš¡ Run Live Web Audit'}</span>
                    </button>
                  </div>

                  {webIntelData ? (
                    <div className="space-y-4">
                      {/* Live Status Overview */}
                      <div className="p-4 bg-[#121215] border border-[#27272a] rounded-2xl flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span className="text-xs font-mono font-bold text-white">
                            {webIntelData.isVerifiedLive ? 'Portal Verified Live' : 'Verified Engineering Standards'}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-zinc-500">
                          Last Scraped: {new Date(webIntelData.scrapedAt).toLocaleTimeString()}
                        </span>
                      </div>

                      {/* Verified Tech Stack Tags */}
                      <div className="p-5 bg-[#121215] border border-[#27272a] rounded-[20px] space-y-2.5">
                        <h4 className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Verified Active Tech Stack (From Live HTML)
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {webIntelData.verifiedTechStack.map((tech, i) => (
                            <span key={i} className="px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs font-mono font-bold">
                              {tech}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Live Sources & Citations */}
                      <div className="p-5 bg-[#121215] border border-[#27272a] rounded-[20px] space-y-3">
                        <h4 className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                          <ExternalLink className="w-3.5 h-3.5 text-zinc-400" /> Scraped Sources & Citations
                        </h4>
                        <div className="space-y-2">
                          {webIntelData.liveSources.map((src, i) => (
                            <div key={i} className="p-3 bg-[#09090b] border border-zinc-800 rounded-xl space-y-1">
                              <a href={src.url} target="_blank" rel="noreferrer" className="text-xs font-bold text-cyan-400 hover:underline flex items-center gap-1">
                                {src.title} <ExternalLink className="w-3 h-3" />
                              </a>
                              <p className="text-[11px] text-zinc-400 font-mono leading-relaxed">{src.snippet}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Reported Questions from Web */}
                      <div className="p-5 bg-[#121215] border border-[#27272a] rounded-[20px] space-y-2.5">
                        <h4 className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
                          ðŸ”¥ Top Technical Questions Reported from {job.companyName} Rounds
                        </h4>
                        <div className="space-y-1.5">
                          {webIntelData.interviewQuestionsFromWeb.map((q, i) => (
                            <div key={i} className="p-3 bg-[#09090b] border border-zinc-800 rounded-xl text-xs text-zinc-300 font-mono">
                              â€¢ {q}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 bg-[#121215] border border-dashed border-zinc-800 rounded-2xl text-center space-y-3">
                      <Globe className="w-8 h-8 text-zinc-600 mx-auto" />
                      <p className="text-xs text-zinc-400">Click &quot;Run Live Web Audit&quot; above to scrape {job.companyName}&apos;s career portal in real-time.</p>
                    </div>
                  )}
                </div>
              )}

              {/* â”€â”€ 4. REFERRALS TAB â”€â”€ */}
              {activeTab === 'referral' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                    <h3 className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-emerald-400" /> {job.referralContacts?.length || 6} Targeted Referral Personas @ {job.companyName}
                    </h3>
                  </div>

                  {(job.referralContacts || []).map((contact, idx) => (
                    <div key={idx} className="p-5 bg-[#121215] border border-[#27272a] rounded-[20px] space-y-3 shadow-lg">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-extrabold text-sm text-white">{contact.personaTitle || (contact as any).name}</h4>
                          <p className="text-xs font-mono text-zinc-400 mt-0.5">{contact.targetRole || (contact as any).role}</p>
                          <p className="text-[11px] font-mono text-zinc-500 mt-1 flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-zinc-500" />
                            <span>{contact.department}</span>
                          </p>
                        </div>
                        <a
                          href={contact.linkedinSearchUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-bold px-3.5 py-1.5 rounded-full bg-[#0a66c2] hover:bg-[#0856a5] text-white flex items-center gap-1.5 transition shadow shrink-0"
                        >
                          <Linkedin className="w-3.5 h-3.5" /> LinkedIn
                        </a>
                      </div>

                      <div className="pt-2 border-t border-zinc-800/80 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-mono font-bold text-zinc-400 uppercase truncate max-w-xs">
                            Subject: {contact.subject}
                          </span>
                          <button
                            onClick={() => copyToClipboard(`Subject: ${contact.subject}\n\n${contact.outreachDraft}`, idx)}
                            className="text-xs font-bold px-3 py-1 rounded-full bg-white text-black hover:bg-zinc-200 flex items-center gap-1 transition shadow shrink-0"
                          >
                            <Copy className="w-3.5 h-3.5" /> {copiedIdx === idx ? 'Copied!' : 'Copy Draft'}
                          </button>
                        </div>
                        <textarea
                          readOnly
                          value={contact.outreachDraft}
                          className="w-full h-28 p-3 bg-[#09090b] border border-[#27272a] rounded-xl text-xs text-zinc-300 font-mono leading-relaxed resize-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* â”€â”€ 5. INTERVIEW PREP TAB â”€â”€ */}
              {activeTab === 'interview' && (
                <div className="space-y-5">
                  <div className="p-5 bg-gradient-to-r from-[#18181b] via-[#121215] to-[#18181b] border border-[#27272a] rounded-[22px] flex items-center justify-between gap-4 shadow-xl">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="p-1.5 rounded-lg bg-amber-950/60 border border-amber-800/60 text-amber-400">
                          <Sparkles className="w-4 h-4" />
                        </span>
                        <h3 className="text-sm font-extrabold text-white">AI Interview Prep Agent</h3>
                      </div>
                      <p className="text-xs text-zinc-400">
                        Generate technical and system design questions customized to {job.companyName}.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleGenerateRealAiPrep}
                      disabled={isLlmRunning}
                      className="flex items-center space-x-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-black font-extrabold text-xs hover:brightness-110 transition shadow-lg shrink-0 disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLlmRunning ? 'animate-spin' : ''}`} />
                      <span>{isLlmRunning ? 'Reasoning...' : 'âš¡ Generate Questions'}</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {(job.interviewPrep?.questions || []).map((q, idx) => (
                      <div key={idx} className="p-5 bg-[#121215] border border-[#27272a] rounded-[20px] space-y-3 shadow">
                        <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 uppercase">
                          Question #{idx + 1}
                        </span>
                        <h4 className="text-sm font-extrabold text-white">{q.question}</h4>
                        <div className="p-4 bg-[#09090b] border border-[#27272a] rounded-2xl text-xs text-zinc-300 font-mono leading-relaxed">
                          <p className="text-emerald-400 font-bold mb-1">Suggested Candidate Answer:</p>
                          {q.suggestedAnswer}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* â”€â”€ 6. COVER LETTER TAB â”€â”€ */}
              {activeTab === 'coverletter' && (
                <div className="space-y-5">
                  <div className="p-5 bg-gradient-to-r from-[#18181b] via-[#121215] to-[#18181b] border border-[#27272a] rounded-[22px] flex items-center justify-between gap-4 shadow-xl">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="p-1.5 rounded-lg bg-cyan-950/60 border border-cyan-800/60 text-cyan-400">
                          <Mail className="w-4 h-4" />
                        </span>
                        <h3 className="text-sm font-extrabold text-white">AI Cover Letter Drafter</h3>
                      </div>
                      <p className="text-xs text-zinc-400">
                        Write a highly personalized pitch letter for {job.companyName}.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleGenerateRealAiLetter}
                      disabled={isLlmRunning}
                      className="flex items-center space-x-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-cyan-500 to-teal-500 text-black font-extrabold text-xs hover:brightness-110 transition shadow-lg shrink-0 disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLlmRunning ? 'animate-spin' : ''}`} />
                      <span>{isLlmRunning ? 'Drafting...' : 'âš¡ Generate Cover Letter'}</span>
                    </button>
                  </div>

                  {job.coverLetterText && (
                    <div className="p-5 bg-[#121215] border border-[#27272a] rounded-[20px] space-y-4 shadow-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                          <Mail className="w-4 h-4 text-emerald-400" /> Tailored Cover Letter
                        </span>
                        <button
                          onClick={() => copyToClipboard(job.coverLetterText)}
                          className="text-xs font-bold px-3 py-1.5 rounded-full bg-white text-black hover:bg-zinc-200 flex items-center gap-1 transition"
                        >
                          <Copy className="w-3.5 h-3.5" /> {copiedText ? 'Copied!' : 'Copy Letter'}
                        </button>
                      </div>
                      <div className="p-5 bg-[#09090b] border border-[#27272a] rounded-2xl text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed font-sans">
                        {job.coverLetterText}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* â”€â”€ 7. APPLICATION QA ANSWERS TAB (JobRadar Autonomous) â”€â”€ */}
              {activeTab === 'appanswers' && (
                <div className="space-y-5">
                  <div className="p-5 bg-gradient-to-r from-emerald-950/40 via-[#18181b] to-teal-950/40 border border-emerald-800/60 rounded-[22px] flex items-center justify-between gap-4 shadow-xl">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="p-1.5 rounded-lg bg-emerald-950 border border-emerald-700 text-emerald-400">
                          <CheckSquare className="w-4 h-4" />
                        </span>
                        <h3 className="text-sm font-extrabold text-white">Application QA Answers Generator</h3>
                      </div>
                      <p className="text-xs text-zinc-400">
                        Tailored, 1-click copyable answers for tricky ATS portal questions grounded in your master resume.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={async () => {
                        setIsLlmRunning(true);
                        setAiActionLabel('Synthesizing tailored application answers with AI...');
                        try {
                          const res = await applicationAnswers.generateAnswersWithAi(job, profile, profile.apiKey || profile.groqApiKey || profile.geminiApiKey || "");
                          setAppAnswersData(res);
                          job.applicationAnswers = res;
                          store.updateJob(job.id, { applicationAnswers: res });
                          setSaveSuccessMsg('Application form answers updated with AI grounding!');
                          setTimeout(() => setSaveSuccessMsg(''), 4000);
                        } catch (err: any) {
                          setAiError(err.message);
                        } finally {
                          setIsLlmRunning(false);
                          setAiActionLabel('');
                        }
                      }}
                      disabled={isLlmRunning}
                      className="flex items-center space-x-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-black font-extrabold text-xs hover:brightness-110 transition shadow-lg shrink-0 disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLlmRunning ? 'animate-spin' : ''}`} />
                      <span>{isLlmRunning ? 'Generating...' : 'âš¡ AI Re-Generate Answers'}</span>
                    </button>
                  </div>

                  <div className="space-y-4">
                    {(appAnswersData?.items || []).map((item, idx) => (
                      <div key={idx} className="p-5 bg-[#121215] border border-[#27272a] rounded-[20px] space-y-3 shadow">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 uppercase">
                              {item.category}
                            </span>
                            <h4 className="text-sm font-extrabold text-white mt-1.5">{item.question}</h4>
                          </div>

                          <button
                            onClick={() => copyToClipboard(item.suggestedAnswer, idx + 100)}
                            className="text-xs font-bold px-3.5 py-1.5 rounded-full bg-white text-black hover:bg-zinc-200 flex items-center gap-1.5 transition shadow shrink-0"
                          >
                            <Copy className="w-3.5 h-3.5" /> {copiedIdx === idx + 100 ? 'Copied!' : 'Copy Answer'}
                          </button>
                        </div>

                        <div className="p-4 bg-[#09090b] border border-[#27272a] rounded-xl text-xs text-zinc-300 font-sans leading-relaxed whitespace-pre-wrap">
                          {item.suggestedAnswer}
                        </div>

                        {item.groundedEvidence && item.groundedEvidence.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {item.groundedEvidence.map((ev, evIdx) => (
                              <span key={evIdx} className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                                ðŸ“Œ {ev}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* â”€â”€ 8. FOLLOW-UP CADENCE TAB (JobRadar Autonomous) â”€â”€ */}
              {activeTab === 'followup' && (
                <div className="space-y-5">
                  <div className="p-5 bg-gradient-to-r from-blue-950/40 via-[#18181b] to-indigo-950/40 border border-blue-800/60 rounded-[22px] flex items-center justify-between gap-4 shadow-xl">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="p-1.5 rounded-lg bg-blue-950 border border-blue-700 text-blue-400">
                          <Clock className="w-4 h-4" />
                        </span>
                        <h3 className="text-sm font-extrabold text-white">Automated Follow-Up Cadence Engine</h3>
                      </div>
                      <p className="text-xs text-zinc-400">
                        Multi-touch follow-up schedule and pre-drafted check-ins to maximize recruiter response rates.
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <button
                        type="button"
                        onClick={async () => {
                          setIsLlmRunning(true);
                          setAiActionLabel('Synthesizing personalized follow-up cadence emails with AI...');
                          try {
                            const res = await generateFollowupCadenceWithAi(job, profile, profile.apiKey || profile.groqApiKey || profile.geminiApiKey || "");
                            setFollowupData(res);
                            job.followupCadence = res;
                            store.updateJob(job.id, { followupCadence: res });
                            setSaveSuccessMsg('Follow-up emails personalized with AI reasoning!');
                            setTimeout(() => setSaveSuccessMsg(''), 4000);
                          } catch (err: any) {
                            setAiError(err.message);
                          } finally {
                            setIsLlmRunning(false);
                            setAiActionLabel('');
                          }
                        }}
                        disabled={isLlmRunning}
                        className="flex items-center space-x-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 text-black font-extrabold text-xs hover:brightness-110 transition shadow-lg shrink-0 disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLlmRunning ? 'animate-spin' : ''}`} />
                        <span>{isLlmRunning ? 'Generating...' : 'âš¡ AI Re-Generate Cadence'}</span>
                      </button>

                      <div className="text-right font-mono shrink-0">
                        <span className="text-[10px] text-zinc-500 block uppercase font-bold">Application Status</span>
                        <span className="text-xs font-bold text-blue-400 capitalize">
                          {job.applicationStatus.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {(followupData?.items || []).map((step, idx) => (
                      <div key={idx} className={`p-5 rounded-[20px] border space-y-3 shadow ${
                        step.isOverdue
                          ? 'bg-amber-950/20 border-amber-800/70'
                          : 'bg-[#121215] border-[#27272a]'
                      }`}>
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-extrabold text-white">{step.milestone}</span>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-300">
                                Target Date: {step.scheduledDate}
                              </span>
                              {step.isOverdue && (
                                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800 animate-pulse">
                                  âš ï¸ Due for follow-up
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] font-mono text-zinc-400 mt-1">
                              Persona Target: <strong className="text-zinc-300">{step.targetPersona}</strong>
                            </p>
                          </div>

                          <button
                            onClick={() => copyToClipboard(`Subject: ${step.subject}\n\n${step.messageBody}`, idx + 200)}
                            className="text-xs font-bold px-3.5 py-1.5 rounded-full bg-white text-black hover:bg-zinc-200 flex items-center gap-1.5 transition shadow shrink-0"
                          >
                            <Copy className="w-3.5 h-3.5" /> {copiedIdx === idx + 200 ? 'Copied!' : 'Copy Email'}
                          </button>
                        </div>

                        <div className="pt-2 border-t border-zinc-800/80 space-y-1.5">
                          <p className="text-[11px] font-mono text-zinc-400 font-bold">
                            Subject: <span className="text-zinc-200">{step.subject}</span>
                          </p>
                          <textarea
                            readOnly
                            value={step.messageBody}
                            className="w-full h-28 p-3 bg-[#09090b] border border-[#27272a] rounded-xl text-xs text-zinc-300 font-mono leading-relaxed resize-none"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* â”€â”€ 9. OFFER & SALARY NEGOTIATION TAB (JobRadar Autonomous) â”€â”€ */}
              {activeTab === 'negotiation' && (
                <div className="space-y-5">
                  <div className="p-5 bg-gradient-to-r from-yellow-950/40 via-[#18181b] to-amber-950/40 border border-yellow-800/60 rounded-[22px] flex items-center justify-between gap-4 shadow-xl">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="p-1.5 rounded-lg bg-yellow-950 border border-yellow-700 text-yellow-400">
                          <DollarSign className="w-4 h-4" />
                        </span>
                        <h3 className="text-sm font-extrabold text-white">Compensation Benchmark & Negotiation Advisor</h3>
                      </div>
                      <p className="text-xs text-zinc-400">
                        Strategic salary counter-offer scripts, market benchmarking, and remote compensation pushback.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={async () => {
                        setIsLlmRunning(true);
                        setAiActionLabel('Synthesizing compensation counter-offer package with AI...');
                        try {
                          const res = await salaryNegotiation.generateNegotiationWithAi(job, profile, profile.apiKey || profile.groqApiKey || profile.geminiApiKey || "");
                          setSalaryData(res);
                          job.salaryNegotiation = res;
                          store.updateJob(job.id, { salaryNegotiation: res });
                          setSaveSuccessMsg('Negotiation strategy calibrated with AI market benchmarks!');
                          setTimeout(() => setSaveSuccessMsg(''), 4000);
                        } catch (err: any) {
                          setAiError(err.message);
                        } finally {
                          setIsLlmRunning(false);
                          setAiActionLabel('');
                        }
                      }}
                      disabled={isLlmRunning}
                      className="flex items-center space-x-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-yellow-500 to-amber-500 text-black font-extrabold text-xs hover:brightness-110 transition shadow-lg shrink-0 disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLlmRunning ? 'animate-spin' : ''}`} />
                      <span>{isLlmRunning ? 'Calibrating...' : 'âš¡ AI Recalibrate CTC'}</span>
                    </button>
                  </div>

                  {/* Benchmark Summary Card */}
                  <div className="p-5 bg-[#121215] border border-[#27272a] rounded-[20px] space-y-3 shadow">
                    <h4 className="text-xs font-mono font-bold text-yellow-400 uppercase tracking-wider">
                      ðŸ“Š Market Compensation Analysis
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                      <div className="p-3 bg-[#09090b] border border-zinc-800 rounded-xl">
                        <span className="text-zinc-500 block text-[10px]">TARGET CTC BENCHMARK</span>
                        <span className="text-white text-base font-extrabold">{salaryData?.targetCtc}</span>
                      </div>
                      <div className="p-3 bg-[#09090b] border border-zinc-800 rounded-xl">
                        <span className="text-zinc-500 block text-[10px]">MARKET ROLE BASELINE</span>
                        <span className="text-emerald-400 text-base font-extrabold">{salaryData?.marketBenchmark}</span>
                      </div>
                    </div>
                    <p className="text-xs text-zinc-400 font-sans">{salaryData?.gapAnalysis}</p>
                  </div>

                  {/* Counter Offer Script */}
                  {salaryData?.counterOfferEmailScript && (
                    <div className="p-5 bg-[#121215] border border-[#27272a] rounded-[20px] space-y-3 shadow">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-mono font-bold text-white uppercase flex items-center gap-2">
                          <span>âœ‰ï¸ Counter-Offer Email Script</span>
                        </h4>
                        <button
                          onClick={() => copyToClipboard(salaryData.counterOfferEmailScript, 301)}
                          className="text-xs font-bold px-3 py-1 rounded-full bg-white text-black hover:bg-zinc-200 flex items-center gap-1 transition shadow"
                        >
                          <Copy className="w-3.5 h-3.5" /> {copiedIdx === 301 ? 'Copied!' : 'Copy Script'}
                        </button>
                      </div>
                      <textarea
                        readOnly
                        value={salaryData.counterOfferEmailScript}
                        className="w-full h-32 p-3 bg-[#09090b] border border-[#27272a] rounded-xl text-xs text-zinc-300 font-mono leading-relaxed resize-none"
                      />
                    </div>
                  )}

                  {/* Remote / Geographic Comp Pushback */}
                  {salaryData?.remoteCompPushbackScript && (
                    <div className="p-5 bg-[#121215] border border-[#27272a] rounded-[20px] space-y-3 shadow">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-mono font-bold text-white uppercase flex items-center gap-2">
                          <span>ðŸŒ Geographic / Remote Discount Pushback</span>
                        </h4>
                        <button
                          onClick={() => copyToClipboard(salaryData.remoteCompPushbackScript, 302)}
                          className="text-xs font-bold px-3 py-1 rounded-full bg-white text-black hover:bg-zinc-200 flex items-center gap-1 transition shadow"
                        >
                          <Copy className="w-3.5 h-3.5" /> {copiedIdx === 302 ? 'Copied!' : 'Copy Script'}
                        </button>
                      </div>
                      <textarea
                        readOnly
                        value={salaryData.remoteCompPushbackScript}
                        className="w-full h-28 p-3 bg-[#09090b] border border-[#27272a] rounded-xl text-xs text-zinc-300 font-mono leading-relaxed resize-none"
                      />
                    </div>
                  )}

                  {/* Competing Offer Script */}
                  {salaryData?.competingOfferLeverageScript && (
                    <div className="p-5 bg-[#121215] border border-[#27272a] rounded-[20px] space-y-3 shadow">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-mono font-bold text-white uppercase flex items-center gap-2">
                          <span>âš¡ Competing Offer Leverage Script</span>
                        </h4>
                        <button
                          onClick={() => copyToClipboard(salaryData.competingOfferLeverageScript, 303)}
                          className="text-xs font-bold px-3 py-1 rounded-full bg-white text-black hover:bg-zinc-200 flex items-center gap-1 transition shadow"
                        >
                          <Copy className="w-3.5 h-3.5" /> {copiedIdx === 303 ? 'Copied!' : 'Copy Script'}
                        </button>
                      </div>
                      <textarea
                        readOnly
                        value={salaryData.competingOfferLeverageScript}
                        className="w-full h-28 p-3 bg-[#09090b] border border-[#27272a] rounded-xl text-xs text-zinc-300 font-mono leading-relaxed resize-none"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

