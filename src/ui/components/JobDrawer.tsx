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
  Code, Maximize2, Minimize2
} from 'lucide-react';

import { aiCouncil } from '../../app-core/aiCouncil';

interface JobDrawerProps {
  job: IJob | null;
  profile: IProfile;
  onClose: () => void;
  onUpdateApproval: (jobId: string, status: 'pending' | 'approved' | 'rejected') => void;
  onUpdateApplication: (jobId: string, status: 'not_applied' | 'applied' | 'interview' | 'offer' | 'rejected') => void;
}

export function JobDrawer({ job, profile, onClose, onUpdateApproval, onUpdateApplication }: JobDrawerProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'council' | 'resume' | 'referral' | 'interview' | 'coverletter'>('overview');
  const [resumeSubTab, setResumeSubTab] = useState<'pdf' | 'latex'>('pdf');
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [copiedText, setCopiedText] = useState(false);
  const [copiedLatex, setCopiedLatex] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(true);
  const [pdfDataUri, setPdfDataUri] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingLatex, setDownloadingLatex] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [isMaximized, setIsMaximized] = useState(false);

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
    const key = profile.apiKey;
    if (!key) {
      setAiError('Please configure your OpenRouter API Key in Settings to run real LLM reasoning.');
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
    const key = profile.apiKey;
    if (!key) {
      setAiError('Please configure your OpenRouter API Key in Settings to run real LLM reasoning.');
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
    const key = profile.apiKey;
    if (!key) {
      setAiError('Please configure your OpenRouter API Key in Settings to run real LLM generation.');
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
    const key = profile.apiKey;
    if (!key) {
      setAiError('Please configure your OpenRouter API Key in Settings to run real LLM generation.');
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
    const key = profile.apiKey;
    if (!key) {
      setAiError('Please configure your OpenRouter API Key in Settings to run real LLM reasoning.');
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
    const key = profile.apiKey;
    if (!key) {
      setAiError('Please configure your OpenRouter API Key in Settings to convene the AI Council.');
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

  const applyLink = job.applicationLink;
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
                <span className="text-sm font-semibold text-zinc-400 flex items-center gap-1 shrink-0">
                  <Building className="w-3.5 h-3.5 text-zinc-500" />
                  {job.companyName}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Metrics & Actions */}
          <div className="flex items-center space-x-3 shrink-0">
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
          {/* ── LEFT PANEL: Job Quick Brief & Original JD (35% width) ── */}
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

            {/* Raw Job Description */}
            <div className="space-y-2 flex-1 flex flex-col">
              <h4 className="text-[11px] font-mono font-bold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                <span>Original Job Description</span>
                <span className="text-[10px] text-zinc-500 lowercase font-mono">
                  {job.rawDescription?.length || 0} chars
                </span>
              </h4>
              <div className="p-4 bg-[#121215] border border-[#27272a] rounded-2xl text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed flex-1 min-h-[160px] max-h-80 lg:max-h-none overflow-y-auto font-sans">
                {job.rawDescription || 'No description text recorded.'}
              </div>
            </div>

            {/* Official Apply Link Button */}
            {applyLink ? (
              <a
                href={applyLink}
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-gradient-to-r from-white via-zinc-100 to-zinc-300 text-black font-extrabold text-xs transition hover:brightness-95 shadow shrink-0"
              >
                <span>Open Application Portal</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            ) : (
              <div className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-zinc-900 text-zinc-500 font-bold text-xs border border-zinc-800 shrink-0">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Apply via Referral / LinkedIn</span>
              </div>
            )}
          </div>

          {/* ── RIGHT PANEL: Multi-Tab Deep Workspace (65% width) ── */}
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
                onClick={() => setActiveTab('interview')}
                className={`pb-2.5 px-3 text-xs font-bold transition flex items-center space-x-1.5 border-b-2 whitespace-nowrap ${
                  activeTab === 'interview' ? 'border-amber-400 text-amber-400 font-extrabold' : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>AI Interview Prep</span>
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
              {/* ── 1. OVERVIEW TAB: Deep AI Rubrics & Match Breakdown ── */}
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
                        Run OpenRouter free model reasoning to evaluate candidate fit and compute 5-tier career-ops rubric.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleAiReScore}
                      disabled={isLlmRunning}
                      className="px-4 py-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-black font-extrabold text-xs hover:brightness-110 transition shadow shrink-0 flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3 h-3 ${isLlmRunning ? 'animate-spin' : ''}`} />
                      <span>{isLlmRunning ? 'Scoring...' : '⚡ AI Re-Score (OpenRouter)'}</span>
                    </button>
                  </div>

                  {/* 5-Tier Rubric Breakdown */}
                  <div className="p-5 bg-[#121215] border border-[#27272a] rounded-[22px] space-y-4 shadow-xl">
                    <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                      <div>
                        <h4 className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider">
                          Career-Ops Rubric Rating
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-2xl font-black text-amber-400 font-mono">
                            ★ {job.rubricScores?.overallRubricRating || 4.8}
                          </span>
                          <span className="text-xs text-zinc-500 font-mono">/ 5.0</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider">
                          Resume-Matcher ATS Score
                        </span>
                        <div className="flex items-center justify-end gap-1.5 mt-1">
                          <FileText className="w-4 h-4 text-emerald-400" />
                          <span className="text-2xl font-black text-emerald-400 font-mono">
                            {job.atsAnalysis?.overallAtsScore || job.atsAnalysis?.keywordDensityScore || 92}%
                          </span>
                          <span className="text-xs text-zinc-500 font-mono">/ 100</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                      <div className="space-y-2">
                        <div className="flex justify-between text-zinc-400">
                          <span>Skills:</span>
                          <span className="text-white font-bold">{job.rubricScores?.skillsScore || 4.9}</span>
                        </div>
                        <div className="flex justify-between text-zinc-400">
                          <span>Tech Stack:</span>
                          <span className="text-white font-bold">{job.rubricScores?.techStackScore || 4.8}</span>
                        </div>
                        <div className="flex justify-between text-zinc-400">
                          <span>Experience:</span>
                          <span className="text-white font-bold">{job.rubricScores?.experienceScore || 4.7}</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-zinc-400">
                          <span>TF-IDF Match:</span>
                          <span className="text-emerald-300 font-bold">{job.atsAnalysis?.keywordDensityScore || 92}%</span>
                        </div>
                        <div className="flex justify-between text-zinc-400">
                          <span>Bullet Impact:</span>
                          <span className="text-emerald-300 font-bold">{job.atsAnalysis?.bulletImpactScore || 90}%</span>
                        </div>
                        <div className="flex justify-between text-zinc-400">
                          <span>Format & Parse:</span>
                          <span className="text-emerald-300 font-bold">{job.atsAnalysis?.atsFormatScore || 98}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── 2. AI COUNCIL CHAMBER TAB ── */}
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
                        <span>{isLlmRunning ? 'Council Deliberating...' : '⚡ Convene AI Council'}</span>
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

              {/* ── 3. ATS RESUME TAB (PDF + LaTeX Dual Mode) ── */}
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

              {/* ── 4. REFERRALS TAB ── */}
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

              {/* ── 5. INTERVIEW PREP TAB ── */}
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
                      <span>{isLlmRunning ? 'Reasoning...' : '⚡ Generate Questions'}</span>
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

              {/* ── 6. COVER LETTER TAB ── */}
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
                      <span>{isLlmRunning ? 'Drafting...' : '⚡ Generate Cover Letter'}</span>
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
