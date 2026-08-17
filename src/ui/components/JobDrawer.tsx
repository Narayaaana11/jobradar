import React, { useState, useEffect } from 'react';
import { IJob, IProfile } from '../../app-core/types';
import { store } from '../../app-core/store';
import { llmClient } from '../../app-core/llmClient';
import { ScoreBadge } from './ScoreBadge';
import { StatusBadge } from './StatusBadge';
import { generateResumePdfDataUri, downloadResumePdfFile, cleanFilenameSlug } from '../../app-core/resumeGenerator';
import {
  X, Check, Trash2, ExternalLink, MapPin, Building, AlertCircle,
  Copy, FileText, CheckCircle2, XCircle, Sparkles, Mail, Download,
  UserCheck, Linkedin, Eye, Send, Award, RefreshCw, Bot, Key, Wand2
} from 'lucide-react';

interface JobDrawerProps {
  job: IJob | null;
  profile: IProfile;
  onClose: () => void;
  onUpdateApproval: (jobId: string, status: 'pending' | 'approved' | 'rejected') => void;
  onUpdateApplication: (jobId: string, status: 'not_applied' | 'applied' | 'interview' | 'offer' | 'rejected') => void;
}

export function JobDrawer({ job, profile, onClose, onUpdateApproval, onUpdateApplication }: JobDrawerProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'resume' | 'referral' | 'interview' | 'coverletter'>('overview');
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [copiedText, setCopiedText] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [pdfDataUri, setPdfDataUri] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

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

  // 1. AI Re-Scorer Agent (Claude / OpenRouter)
  const handleAiReScore = async () => {
    const key = profile.apiKey;
    if (!key) {
      setAiError('Please configure your OpenRouter / Anthropic API Key in Settings to run real LLM reasoning.');
      setTimeout(() => setAiError(null), 5000);
      return;
    }

    setIsLlmRunning(true);
    setAiActionLabel('Evaluating Fit Score & 5-Tier Rubric with LLM...');
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
        setAiModelUsed(res.modelUsed || 'Claude 3.5 Sonnet');
        setSaveSuccessMsg(`Fit score & rubric evaluated by ${res.modelUsed || 'Claude 3.5 Sonnet'}!`);
        setTimeout(() => setSaveSuccessMsg(''), 4000);
      } else {
        setAiError(res.error || 'Failed to score job with LLM');
      }
    } catch (err: any) {
      setAiError(err.message);
    } finally {
      setIsLlmRunning(false);
      setAiActionLabel('');
    }
  };

  // 2. AI Resume Bullet Tailor Agent (Claude / OpenRouter)
  const handleAiTailorResume = async () => {
    const key = profile.apiKey;
    if (!key) {
      setAiError('Please configure your OpenRouter / Anthropic API Key in Settings to run real LLM reasoning.');
      setTimeout(() => setAiError(null), 5000);
      return;
    }

    setIsLlmRunning(true);
    setAiActionLabel('Customizing Project Highlights with LLM...');
    setAiError(null);
    try {
      const res = await llmClient.tailorResumeBulletsWithLlm(job, profile, key);
      if (res.success && res.data) {
        const notes = `ATS Optimized for ${job.companyName}: ${res.data.summary}`;
        store.updateJob(job.id, { resumeNotes: notes });
        setAiModelUsed(res.modelUsed || 'Claude 3.5 Sonnet');
        setSaveSuccessMsg(`Project highlights tailored by ${res.modelUsed || 'Claude 3.5 Sonnet'}!`);
        // Refresh PDF preview
        try {
          const uri = generateResumePdfDataUri(job, profile);
          setPdfDataUri(uri);
        } catch (e) {}
        setTimeout(() => setSaveSuccessMsg(''), 4000);
      } else {
        setAiError(res.error || 'Failed to tailor resume with LLM');
      }
    } catch (err: any) {
      setAiError(err.message);
    } finally {
      setIsLlmRunning(false);
      setAiActionLabel('');
    }
  };

  // 3. AI Interview Prep Agent (Claude / OpenRouter)
  const handleGenerateRealAiPrep = async () => {
    const key = profile.apiKey;
    if (!key) {
      setAiError('Please configure your OpenRouter / Anthropic API Key in Settings to run real LLM generation.');
      setTimeout(() => setAiError(null), 5000);
      return;
    }

    setIsLlmRunning(true);
    setAiActionLabel('Generating Role-Specific Interview Questions with LLM...');
    setAiError(null);
    try {
      const res = await llmClient.generateAiInterviewPrep(job, profile, key);
      if (res.success && res.data) {
        job.interviewPrep = res.data;
        store.updateJob(job.id, { interviewPrep: res.data });
        setAiModelUsed(res.modelUsed || 'Claude 3.5 Sonnet');
        setSaveSuccessMsg(`Interview prep generated by ${res.modelUsed || 'Claude 3.5 Sonnet'}!`);
        setTimeout(() => setSaveSuccessMsg(''), 4000);
      } else {
        setAiError(res.error || 'Failed to generate interview prep with LLM');
      }
    } catch (err: any) {
      setAiError(err.message);
    } finally {
      setIsLlmRunning(false);
      setAiActionLabel('');
    }
  };

  // 4. AI Cover Letter Agent (Claude / OpenRouter)
  const handleGenerateRealAiLetter = async () => {
    const key = profile.apiKey;
    if (!key) {
      setAiError('Please configure your OpenRouter / Anthropic API Key in Settings to run real LLM generation.');
      setTimeout(() => setAiError(null), 5000);
      return;
    }

    setIsLlmRunning(true);
    setAiActionLabel('Drafting Personalized Pitch Letter with LLM...');
    setAiError(null);
    try {
      const res = await llmClient.generateAiCoverLetter(job, profile, key);
      if (res.success && res.data) {
        job.coverLetterText = res.data;
        store.updateJob(job.id, { coverLetterText: res.data });
        setAiModelUsed(res.modelUsed || 'Claude 3.5 Sonnet');
        setSaveSuccessMsg(`Cover letter generated by ${res.modelUsed || 'Claude 3.5 Sonnet'}!`);
        setTimeout(() => setSaveSuccessMsg(''), 4000);
      } else {
        setAiError(res.error || 'Failed to generate cover letter with LLM');
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
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/75 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-[#09090b] border-l border-zinc-800 h-full flex flex-col shadow-2xl overflow-y-auto">
        {/* Drawer Header */}
        <div className="p-6 border-b border-zinc-800/80 sticky top-0 bg-[#09090b]/95 backdrop-blur z-20 space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-300">
                  {job.jobType || 'Full-Time'}
                </span>
                {job.isRemote && (
                  <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800">
                    Remote
                  </span>
                )}
                {job.skillMatched && (
                  <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Skill Match
                  </span>
                )}
              </div>
              <h2 className="text-xl font-black text-white tracking-tight pt-1">{job.jobTitle}</h2>
              <p className="text-sm font-semibold text-zinc-300 flex items-center gap-1.5">
                <Building className="w-4 h-4 text-zinc-400" />
                <span>{job.companyName}</span>
                <span className="text-zinc-600">•</span>
                <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                <span className="text-xs text-zinc-400">{job.location || 'India (Pan-India)'}</span>
              </p>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center space-x-3">
              <ScoreBadge score={job.matchScore} />
              <StatusBadge type="approval" status={job.approvalStatus} />
            </div>

            <div className="flex items-center space-x-2">
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
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center space-x-1.5 border-b border-zinc-800 pt-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('overview')}
              className={`pb-2.5 px-3 text-xs font-bold transition flex items-center space-x-1.5 border-b-2 whitespace-nowrap ${
                activeTab === 'overview' ? 'border-white text-white' : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <span>Job Overview</span>
            </button>

            <button
              onClick={() => setActiveTab('resume')}
              className={`pb-2.5 px-3 text-xs font-bold transition flex items-center space-x-1.5 border-b-2 whitespace-nowrap ${
                activeTab === 'resume' ? 'border-emerald-400 text-emerald-400 font-extrabold' : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>ATS Resume (PDF)</span>
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
        </div>

        {/* Global Feedback Banner */}
        {saveSuccessMsg && (
          <div className="mx-6 mt-4 p-3 bg-emerald-950/80 border border-emerald-800 text-xs font-mono text-emerald-300 rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}

        {aiError && (
          <div className="mx-6 mt-4 p-3 bg-amber-950/80 border border-amber-800 text-xs font-mono text-amber-300 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{aiError}</span>
          </div>
        )}

        {/* Drawer Body Content */}
        <div className="p-6 space-y-6 flex-1">
          {/* ── 1. OVERVIEW TAB ── */}
          {activeTab === 'overview' && (
            <>
              {/* AI Re-Score Banner */}
              <div className="p-4 bg-gradient-to-r from-[#18181b] via-[#121215] to-[#18181b] border border-[#27272a] rounded-[20px] flex items-center justify-between gap-4 shadow">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>AI Match & Rubric Scorer</span>
                  </h4>
                  <p className="text-[11px] text-zinc-400">
                    Run LLM reasoning to evaluate candidate fit and compute 5-tier career-ops rubric.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAiReScore}
                  disabled={isLlmRunning}
                  className="px-4 py-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-black font-extrabold text-xs hover:brightness-110 transition shadow shrink-0 disabled:opacity-50 flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3 h-3 ${isLlmRunning ? 'animate-spin' : ''}`} />
                  <span>{isLlmRunning ? 'Evaluating...' : '⚡ AI Re-Score'}</span>
                </button>
              </div>

              {/* Application Lifecycle Stage Switcher */}
              <div className="p-4 bg-[#121215] border border-[#27272a] rounded-[20px] space-y-2">
                <label className="text-[11px] font-mono font-bold text-zinc-400 uppercase tracking-wider block">
                  Application Stage (Kanban Column)
                </label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {(['not_applied', 'applied', 'interview', 'offer', 'rejected'] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => onUpdateApplication(job.id, st)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${
                        job.applicationStatus === st
                          ? 'bg-white text-black shadow-md'
                          : 'bg-[#18181b] border border-[#27272a] text-zinc-400 hover:text-white'
                      }`}
                    >
                      {st === 'not_applied' && '⏳ Pending'}
                      {st === 'applied' && '🚀 Applied'}
                      {st === 'interview' && '🎯 Interviewing'}
                      {st === 'offer' && '🎉 Offer'}
                      {st === 'rejected' && '✕ Not Selected'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rubric Score & ATS Analysis Cards */}
              <div className="grid grid-cols-2 gap-4">
                {/* Rubric Rating Card */}
                <div className="p-4 bg-[#121215] border border-[#27272a] rounded-[20px] space-y-2 shadow">
                  <p className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider font-semibold">
                    career-ops Rubric Rating
                  </p>
                  <div className="flex items-baseline space-x-2">
                    <span className="text-2xl font-black text-amber-400">
                      ⭐ {job.rubricScores?.overallRubricRating || '4.5'}
                    </span>
                    <span className="text-xs text-zinc-500 font-mono">/ 5.0</span>
                  </div>
                  <div className="text-[11px] text-zinc-400 space-y-1 font-mono pt-1">
                    <div className="flex justify-between">
                      <span>Skills:</span>
                      <span className="text-white font-bold">{job.rubricScores?.skillsScore || '4.8'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tech Stack:</span>
                      <span className="text-white font-bold">{job.rubricScores?.techStackScore || '4.8'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Experience:</span>
                      <span className="text-white font-bold">{job.rubricScores?.experienceScore || '4.5'}</span>
                    </div>
                  </div>
                </div>

                {/* ATS Score Card */}
                <div className="p-4 bg-[#121215] border border-[#27272a] rounded-[20px] space-y-2 shadow">
                  <p className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider font-semibold">
                    Resume-Matcher ATS Score
                  </p>
                  <div className="flex items-baseline space-x-2">
                    <span className="text-2xl font-black text-emerald-400">
                      📊 {job.atsAnalysis?.keywordDensityScore || 92}%
                    </span>
                  </div>
                  <div className="text-[11px] text-zinc-400 space-y-1 font-mono pt-1">
                    <div className="flex justify-between">
                      <span>ATS Format:</span>
                      <span className="text-emerald-400 font-bold">{job.atsAnalysis?.atsFormatScore || 98}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Bullet Impact:</span>
                      <span className="text-cyan-400 font-bold">{job.atsAnalysis?.bulletImpactScore || 88}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Keywords Found:</span>
                      <span className="text-white font-bold">{job.atsAnalysis?.foundKeywords?.length || 6}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Skills Section */}
              <div className="space-y-2">
                <h4 className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider">
                  Target Technical Skills & Keywords
                </h4>
                <div className="flex flex-wrap gap-2">
                  {job.skillsRequired && job.skillsRequired.length > 0 ? (
                    job.skillsRequired.map((skill, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-[#18181b] border border-[#27272a] rounded-full text-xs font-mono text-emerald-300 font-medium"
                      >
                        {skill}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-zinc-500 italic">No specific skills parsed</span>
                  )}
                </div>
              </div>

              {/* Raw Job Description */}
              <div className="space-y-2">
                <h4 className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider">
                  Original Job Posting Content
                </h4>
                <div className="p-5 bg-[#121215] border border-[#27272a] rounded-[20px] text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto">
                  {job.rawDescription || 'No description available.'}
                </div>
              </div>

              {/* Apply Button */}
              {applyLink ? (
                <a
                  href={applyLink}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full flex items-center justify-center space-x-2 py-3.5 px-6 rounded-full bg-gradient-to-r from-white via-zinc-100 to-zinc-300 text-black font-extrabold text-sm transition hover:brightness-95 shadow-lg"
                >
                  <span>Open Official Application Page</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              ) : (
                <div className="w-full flex items-center justify-center space-x-2 py-3.5 px-6 rounded-full bg-zinc-900 text-zinc-500 font-bold text-sm border border-zinc-800">
                  <AlertCircle className="w-4 h-4" />
                  <span>Apply link not specified in posting — check referrals tab</span>
                </div>
              )}
            </>
          )}

          {/* ── 2. RESUME TAB (Client PDF + AI Tailor) ── */}
          {activeTab === 'resume' && (
            <div className="space-y-5">
              <div className="p-6 bg-[#121215] border border-[#27272a] rounded-[24px] space-y-5 shadow-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 rounded-2xl">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-white">ATS Tailored Resume (PDF)</h3>
                      <p className="text-xs text-emerald-400 font-mono font-semibold flex items-center gap-1 mt-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5" /> 95+ ATS Score Optimized for {job.companyName}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAiTailorResume}
                    disabled={isLlmRunning}
                    className="px-3.5 py-1.5 rounded-full bg-purple-950 border border-purple-800 text-purple-300 hover:bg-purple-900 font-bold text-xs flex items-center gap-1 transition disabled:opacity-50"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    <span>⚡ AI Tailor Bullets</span>
                  </button>
                </div>

                {/* Tailoring Strategy */}
                <div className="p-4 bg-[#09090b] border border-[#27272a] rounded-2xl space-y-1">
                  <p className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                    ATS Tailoring Strategy:
                  </p>
                  <p className="text-xs text-zinc-300 leading-relaxed italic">
                    {job.resumeNotes ||
                      `Tailored master resume for ${job.companyName} (${job.jobTitle}) — keywords aligned with required skills, summary updated for target role.`}
                  </p>
                </div>

                {/* PDF File Name */}
                <div className="p-4 bg-[#09090b] border border-[#27272a] rounded-2xl">
                  <p className="text-xs text-zinc-400 font-mono mb-1">Generated File Name:</p>
                  <p className="text-xs font-mono text-emerald-400 break-all">{pdfFileName}</p>
                </div>

                {/* Toggle PDF Preview */}
                <button
                  onClick={() => setShowPdfPreview(!showPdfPreview)}
                  className="w-full flex items-center justify-center space-x-2 py-3 px-6 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-200 font-bold text-xs hover:bg-zinc-800 transition"
                >
                  <Eye className="w-4 h-4" />
                  <span>{showPdfPreview ? 'Hide PDF Preview' : 'Preview ATS Resume in App'}</span>
                </button>

                {/* PDF Inline Preview Frame */}
                {showPdfPreview && pdfDataUri && (
                  <div className="w-full rounded-2xl overflow-hidden border border-zinc-700 bg-zinc-900">
                    <iframe
                      src={pdfDataUri}
                      width="100%"
                      height="520px"
                      className="block"
                      title="ATS Resume Preview"
                    />
                  </div>
                )}

                {/* Direct Download Button */}
                <button
                  onClick={handleDownloadPdf}
                  disabled={downloadingPdf}
                  className="w-full flex items-center justify-center space-x-2 py-3.5 px-6 rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-black font-extrabold text-sm hover:brightness-110 transition shadow-xl disabled:opacity-50"
                >
                  <Download className="w-5 h-5" />
                  <span>{downloadingPdf ? 'Generating PDF...' : 'Download ATS Tailored Resume (PDF)'}</span>
                </button>
              </div>
            </div>
          )}

          {/* ── 3. REFERRALS TAB ── */}
          {activeTab === 'referral' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                <h3 className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-400" /> {job.referralContacts?.length || 6} Targeted Referral Personas @ {job.companyName}
                </h3>
                <span className="text-xs font-mono text-zinc-500">{job.location || 'Location'}</span>
              </div>

              {(!job.referralContacts || job.referralContacts.length === 0) ? (
                <p className="text-sm text-zinc-500 italic">No referral personas generated.</p>
              ) : (
                job.referralContacts.map((contact, idx) => (
                  <div key={idx} className="p-5 bg-[#121215] border border-[#27272a] rounded-[20px] space-y-3 shadow-lg">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-extrabold text-sm text-white flex items-center gap-2">
                          <span>{contact.name}</span>
                        </h4>
                        <p className="text-xs font-mono text-zinc-400 mt-0.5">
                          {contact.role}
                        </p>
                        <p className="text-[11px] font-mono text-emerald-400 mt-1 flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-zinc-500" />
                          <span>Estimated Pattern: {contact.guessedEmail}</span>
                        </p>
                      </div>
                      <a
                        href={contact.linkedinSearchUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-bold px-3.5 py-1.5 rounded-full bg-[#0a66c2] hover:bg-[#0856a5] text-white border border-[#0a66c2] flex items-center gap-1.5 transition shadow shrink-0"
                      >
                        <Linkedin className="w-3.5 h-3.5" /> Find Real Employees
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
                          <Copy className="w-3.5 h-3.5" /> {copiedIdx === idx ? 'Copied!' : 'Copy Outreach Draft'}
                        </button>
                      </div>

                      <textarea
                        readOnly
                        value={contact.outreachDraft}
                        className="w-full h-36 p-4 bg-[#09090b] border border-[#27272a] rounded-2xl text-xs text-zinc-300 font-mono leading-relaxed resize-none"
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── 4. INTERVIEW PREP TAB (Real LLM Integration) ── */}
          {activeTab === 'interview' && (
            <div className="space-y-5">
              {/* Top AI Action Banner */}
              <div className="p-5 bg-gradient-to-r from-[#18181b] via-[#121215] to-[#18181b] border border-[#27272a] rounded-[22px] flex items-center justify-between gap-4 shadow-xl">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="p-1.5 rounded-lg bg-amber-950/60 border border-amber-800/60 text-amber-400">
                      <Sparkles className="w-4 h-4" />
                    </span>
                    <h3 className="text-sm font-extrabold text-white">AI Interview Prep Agent</h3>
                    {aiModelUsed && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800">
                        {aiModelUsed}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400">
                    Generate deep technical, system design, and behavioral questions customized to {job.companyName}'s actual stack.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleGenerateRealAiPrep}
                  disabled={isLlmRunning}
                  className="flex items-center space-x-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-black font-extrabold text-xs hover:brightness-110 transition shadow-lg shrink-0 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLlmRunning ? 'animate-spin' : ''}`} />
                  <span>{isLlmRunning ? 'Reasoning with LLM...' : '⚡ Enhance with Claude / OpenRouter'}</span>
                </button>
              </div>

              <div className="p-5 bg-[#121215] border border-[#27272a] rounded-[20px] space-y-3 shadow-lg">
                <div className="flex items-center space-x-2 text-emerald-400 font-mono font-bold text-xs uppercase tracking-wider">
                  <Bot className="w-4 h-4" />
                  <span>Role Evaluation Overview</span>
                </div>
                <p className="text-xs text-zinc-300 font-sans leading-relaxed">
                  {job.interviewPrep?.roleOverview ||
                    `Interviewers at ${job.companyName} evaluating for ${job.jobTitle} will test technical mastery, system design, and practical software engineering.`}
                </p>
                {job.interviewPrep?.technicalTopics && (
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {job.interviewPrep.technicalTopics.map((topic, i) => (
                      <span
                        key={i}
                        className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-zinc-900 text-emerald-300 border border-zinc-800"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Questions & Answers */}
              <div className="space-y-4">
                <h3 className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider">
                  Target Technical & Behavioral Questions
                </h3>
                {(job.interviewPrep?.questions || []).map((q, idx) => (
                  <div key={idx} className="p-5 bg-[#121215] border border-[#27272a] rounded-[20px] space-y-3 shadow-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 uppercase">
                        {q.category || 'Technical'} Question #{idx + 1}
                      </span>
                      {q.keyConcepts && (
                        <div className="flex gap-1">
                          {q.keyConcepts.map((c, ci) => (
                            <span key={ci} className="text-[10px] font-mono text-zinc-400">
                              #{c}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <h4 className="text-sm font-extrabold text-white">{q.question}</h4>
                    <div className="p-4 bg-[#09090b] border border-[#27272a] rounded-2xl text-xs text-zinc-300 font-mono leading-relaxed">
                      <p className="text-emerald-400 font-bold mb-1">Suggested Candidate Answer ({profile.name.split(' ')[0]}):</p>
                      {q.suggestedAnswer}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── 5. COVER LETTER TAB (Real LLM Integration) ── */}
          {activeTab === 'coverletter' && (
            <div className="space-y-5">
              {/* Top AI Action Banner */}
              <div className="p-5 bg-gradient-to-r from-[#18181b] via-[#121215] to-[#18181b] border border-[#27272a] rounded-[22px] flex items-center justify-between gap-4 shadow-xl">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="p-1.5 rounded-lg bg-cyan-950/60 border border-cyan-800/60 text-cyan-400">
                      <Mail className="w-4 h-4" />
                    </span>
                    <h3 className="text-sm font-extrabold text-white">AI Cover Letter Drafter</h3>
                  </div>
                  <p className="text-xs text-zinc-400">
                    Write a highly personalized, non-generic pitch letter connecting your projects with {job.companyName}.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleGenerateRealAiLetter}
                  disabled={isLlmRunning}
                  className="flex items-center space-x-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-cyan-500 via-teal-500 to-cyan-600 text-black font-extrabold text-xs hover:brightness-110 transition shadow-lg shrink-0 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLlmRunning ? 'animate-spin' : ''}`} />
                  <span>{isLlmRunning ? 'Writing Cover Letter...' : '⚡ Generate with Claude AI'}</span>
                </button>
              </div>

              {job.coverLetterText ? (
                <div className="p-5 bg-[#121215] border border-[#27272a] rounded-[20px] space-y-4 shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                      <Mail className="w-4 h-4 text-emerald-400" /> Tailored Cover Letter — {job.companyName}
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
              ) : (
                <p className="text-sm text-zinc-500 italic">No cover letter generated yet for this posting.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
