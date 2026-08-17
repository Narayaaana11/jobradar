import React, { useState } from 'react';
import { store } from '../../app-core/store';
import { s3Cloud } from '../../app-core/s3Client';
import { parseLatexResume } from '../../app-core/latexParser';
import { parseEnvContent } from '../../app-core/envParser';
import { IProfile } from '../../app-core/types';
import {
  Sparkles, Cloud, User, FileText, CheckCircle2, ArrowRight,
  ArrowLeft, Upload, Key, ShieldCheck, FileCode, Check, Radar
} from 'lucide-react';

interface OnboardingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onCompleted: () => void;
}

export function OnboardingWizard({ isOpen, onClose, onCompleted }: OnboardingWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form State
  const [envPasteText, setEnvPasteText] = useState('');
  const [awsBucket, setAwsBucket] = useState(s3Cloud.getConfig().bucket || 'jobsprep');
  const [awsRegion, setAwsRegion] = useState(s3Cloud.getConfig().region || 'us-east-1');
  const [awsAccessKey, setAwsAccessKey] = useState(s3Cloud.getConfig().accessKeyId || '');
  const [awsSecretKey, setAwsSecretKey] = useState(s3Cloud.getConfig().secretAccessKey || '');
  const [openRouterKey, setOpenRouterKey] = useState('');

  // Profile State
  const [profile, setProfile] = useState<IProfile>(store.getProfile());
  const [skillsInput, setSkillsInput] = useState<string>(profile.primarySkills.join(', '));

  // Resume State
  const [latexCode, setLatexCode] = useState<string>('');
  const [extractSuccessMsg, setExtractSuccessMsg] = useState('');

  if (!isOpen) return null;

  // Handle Quick .env parse
  const handleParseEnv = () => {
    if (!envPasteText.trim()) return;
    const parsed = parseEnvContent(envPasteText);
    if (parsed.awsBucket) setAwsBucket(parsed.awsBucket);
    if (parsed.awsRegion) setAwsRegion(parsed.awsRegion);
    if (parsed.awsAccessKeyId) setAwsAccessKey(parsed.awsAccessKeyId);
    if (parsed.awsSecretAccessKey) setAwsSecretKey(parsed.awsSecretAccessKey);
    if (parsed.openrouterApiKey) setOpenRouterKey(parsed.openrouterApiKey);

    setExtractSuccessMsg('Environment variables parsed and applied!');
    setTimeout(() => setExtractSuccessMsg(''), 3000);
  };

  // Handle LaTeX resume code parse
  const handleParseLatex = () => {
    if (!latexCode.trim()) return;
    const parsed = parseLatexResume(latexCode);
    setProfile((prev) => ({
      ...prev,
      name: parsed.name || prev.name,
      email: parsed.email || prev.email,
      phone: parsed.phone || prev.phone,
      location: parsed.location || prev.location,
      linkedin: parsed.linkedin || prev.linkedin,
      github: parsed.github || prev.github,
      portfolio: parsed.portfolio || prev.portfolio,
      education: parsed.education || prev.education,
    }));

    if (parsed.skills.length > 0) {
      setSkillsInput(parsed.skills.join(', '));
    }

    setExtractSuccessMsg(`Extracted profile details for ${parsed.name} from LaTeX!`);
    setTimeout(() => setExtractSuccessMsg(''), 3000);
  };

  // Save all settings and finish
  const handleFinish = async () => {
    // 1. Save S3 config
    s3Cloud.saveConfig({
      bucket: awsBucket || 'jobsprep',
      region: awsRegion || 'us-east-1',
      accessKeyId: awsAccessKey,
      secretAccessKey: awsSecretKey,
      autoSync: true,
    });

    // 2. Save profile
    const skillsArray = skillsInput.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
    const updatedProfile: IProfile = {
      ...profile,
      primarySkills: skillsArray,
      apiKey: openRouterKey || profile.apiKey,
    };
    store.saveProfile(updatedProfile);

    // 3. Save master resume if latex provided
    if (latexCode.trim()) {
      store.saveMasterResume(latexCode);
    }

    // 4. Mark onboarding done
    if (typeof window !== 'undefined') {
      localStorage.setItem('jobradar_onboarded_v1', 'true');
    }

    // 5. Background S3 Sync
    s3Cloud.syncAllToS3(store.getJobs(), store.getQueueItems(), updatedProfile, store.getMasterResume()).catch(() => {});

    onCompleted();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-lg flex items-center justify-center p-4">
      <div className="bg-[#121215] border border-[#27272a] rounded-[28px] w-full max-w-3xl p-6 md:p-8 space-y-6 shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-white via-zinc-200 to-zinc-600 p-[1px] flex items-center justify-center shadow-lg shadow-white/5 shrink-0">
                <div className="w-full h-full bg-black rounded-2xl flex items-center justify-center">
                  <Radar className="w-5 h-5 text-white" />
                </div>
              </div>
              <h2 className="text-xl font-extrabold text-white tracking-tight">JobRadar Setup Wizard</h2>
            </div>
            <p className="text-xs text-zinc-400 mt-1 font-medium">
              Configure your local installation with your credentials, resume LaTeX code, and target skills.
            </p>
          </div>

          {/* Steps Indicator */}
          <div className="flex items-center space-x-1.5 font-mono text-xs">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`w-7 h-7 rounded-full flex items-center justify-center font-bold transition ${
                  step === s
                    ? 'bg-white text-black shadow'
                    : step > s
                    ? 'bg-emerald-600 text-white'
                    : 'bg-zinc-900 text-zinc-500 border border-zinc-800'
                }`}
              >
                {step > s ? '✓' : s}
              </div>
            ))}
          </div>
        </div>

        {extractSuccessMsg && (
          <div className="p-3 bg-emerald-950/80 border border-emerald-800 text-xs font-mono text-emerald-300 rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{extractSuccessMsg}</span>
          </div>
        )}

        {/* Wizard Step Body */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* ── STEP 1: CLOUD & .ENV SETUP ── */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-cyan-400" /> Step 1: AWS S3 & Environment Credentials
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Paste your `.env` contents for instant auto-fill, or fill in your AWS credentials manually.
                </p>
              </div>

              {/* Quick .env Paste Area */}
              <div className="p-4 bg-[#18181b] border border-[#27272a] rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-mono font-bold text-zinc-300 uppercase">
                    ⚡ Quick Paste .env File
                  </label>
                  <button
                    type="button"
                    onClick={handleParseEnv}
                    disabled={!envPasteText.trim()}
                    className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-black font-bold text-xs rounded-full transition disabled:opacity-40"
                  >
                    Auto-Fill from .env
                  </button>
                </div>
                <textarea
                  rows={4}
                  value={envPasteText}
                  onChange={(e) => setEnvPasteText(e.target.value)}
                  placeholder="AWS_REGION=us-east-1&#10;AWS_ACCESS_KEY_ID=AKIA...&#10;AWS_SECRET_ACCESS_KEY=...&#10;AWS_S3_BUCKET=jobsprep"
                  className="w-full p-3 bg-[#09090b] border border-[#27272a] rounded-xl text-xs text-zinc-300 font-mono focus:outline-none focus:border-cyan-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-mono text-zinc-400 uppercase mb-1">AWS S3 Bucket Name</label>
                  <input
                    type="text"
                    value={awsBucket}
                    onChange={(e) => setAwsBucket(e.target.value)}
                    placeholder="e.g. jobsprep"
                    className="w-full px-3.5 py-2.5 bg-[#18181b] border border-[#27272a] rounded-xl text-xs text-cyan-300 font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-zinc-400 uppercase mb-1">AWS Region</label>
                  <input
                    type="text"
                    value={awsRegion}
                    onChange={(e) => setAwsRegion(e.target.value)}
                    placeholder="e.g. us-east-1"
                    className="w-full px-3.5 py-2.5 bg-[#18181b] border border-[#27272a] rounded-xl text-xs text-white font-mono focus:outline-none focus:border-zinc-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-zinc-400 uppercase mb-1">AWS Access Key ID</label>
                  <input
                    type="text"
                    value={awsAccessKey}
                    onChange={(e) => setAwsAccessKey(e.target.value)}
                    placeholder="AKIA..."
                    className="w-full px-3.5 py-2.5 bg-[#18181b] border border-[#27272a] rounded-xl text-xs text-white font-mono focus:outline-none focus:border-zinc-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-zinc-400 uppercase mb-1">AWS Secret Access Key</label>
                  <input
                    type="password"
                    value={awsSecretKey}
                    onChange={(e) => setAwsSecretKey(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-3.5 py-2.5 bg-[#18181b] border border-[#27272a] rounded-xl text-xs text-white font-mono focus:outline-none focus:border-zinc-400"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2: RESUME LATEX CODE ── */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-emerald-400" /> Step 2: Master Resume LaTeX (.tex) Code
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Paste your raw Overleaf / LaTeX resume source code. We will auto-extract your profile and use it for ATS tailoring.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleParseLatex}
                  disabled={!latexCode.trim()}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-full transition shadow disabled:opacity-40"
                >
                  ⚡ Auto-Extract Details
                </button>
              </div>

              <textarea
                rows={12}
                value={latexCode}
                onChange={(e) => setLatexCode(e.target.value)}
                placeholder="\documentclass[letterpaper,11pt]{article}&#10;\begin{document}&#10;\textbf{\Huge \scshape Your Name} \\&#10;\small City, State | +91 xxxxxxxxxx | your.email@gmail.com&#10;\section{Technical Skills}&#10;..."
                className="w-full p-4 bg-[#09090b] border border-[#27272a] rounded-2xl text-xs text-zinc-300 font-mono leading-relaxed focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}

          {/* ── STEP 3: CANDIDATE PROFILE ── */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <User className="w-4 h-4 text-white" /> Step 3: Candidate Profile & Contact Links
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Confirm your legal name, contact credentials, and online portfolio links for referral drafting.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-mono text-zinc-400 uppercase mb-1">Full Legal Name</label>
                  <input
                    type="text"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#18181b] border border-[#27272a] rounded-xl text-xs text-white focus:outline-none focus:border-zinc-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-zinc-400 uppercase mb-1">Professional Title</label>
                  <input
                    type="text"
                    value={profile.title}
                    onChange={(e) => setProfile({ ...profile, title: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#18181b] border border-[#27272a] rounded-xl text-xs text-white focus:outline-none focus:border-zinc-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-zinc-400 uppercase mb-1">Email Address</label>
                  <input
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#18181b] border border-[#27272a] rounded-xl text-xs text-white focus:outline-none focus:border-zinc-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-zinc-400 uppercase mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#18181b] border border-[#27272a] rounded-xl text-xs text-white focus:outline-none focus:border-zinc-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-zinc-400 uppercase mb-1">Location & City</label>
                  <input
                    type="text"
                    value={profile.location}
                    onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#18181b] border border-[#27272a] rounded-xl text-xs text-white focus:outline-none focus:border-zinc-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-zinc-400 uppercase mb-1">Education Credentials</label>
                  <input
                    type="text"
                    value={profile.education}
                    onChange={(e) => setProfile({ ...profile, education: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#18181b] border border-[#27272a] rounded-xl text-xs text-white focus:outline-none focus:border-zinc-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-zinc-400 uppercase mb-1">LinkedIn URL</label>
                  <input
                    type="url"
                    value={profile.linkedin}
                    onChange={(e) => setProfile({ ...profile, linkedin: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#18181b] border border-[#27272a] rounded-xl text-xs text-white focus:outline-none focus:border-zinc-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-zinc-400 uppercase mb-1">GitHub URL</label>
                  <input
                    type="url"
                    value={profile.github}
                    onChange={(e) => setProfile({ ...profile, github: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#18181b] border border-[#27272a] rounded-xl text-xs text-white focus:outline-none focus:border-zinc-400"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 4: TARGET SKILLS & FINAL REVIEW ── */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Step 4: Target Skills & Review
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  These skills are used to calculate match fit scores (0-100%) and Resume-Matcher ATS compliance.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-zinc-400 uppercase mb-1">
                  Primary Target Skills (comma separated)
                </label>
                <textarea
                  rows={4}
                  value={skillsInput}
                  onChange={(e) => setSkillsInput(e.target.value)}
                  className="w-full p-3.5 bg-[#18181b] border border-[#27272a] rounded-xl text-xs text-white font-mono focus:outline-none focus:border-zinc-400 leading-relaxed"
                />
              </div>

              {/* Ready summary card */}
              <div className="p-4 bg-[#18181b] border border-[#27272a] rounded-2xl space-y-2 text-xs font-mono">
                <p className="text-emerald-400 font-bold uppercase">Setup Ready Summary:</p>
                <div className="text-zinc-300 space-y-1">
                  <div>• <span className="text-zinc-500">Candidate:</span> {profile.name} ({profile.title})</div>
                  <div>• <span className="text-zinc-500">AWS S3 Bucket:</span> {awsBucket} ({awsRegion})</div>
                  <div>• <span className="text-zinc-500">Target Skills:</span> {skillsInput.split(',').slice(0, 6).join(', ')}...</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Footer */}
        <div className="flex items-center justify-between border-t border-zinc-800 pt-4">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s - 1) as any)}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-300 hover:text-white text-xs font-bold transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-bold text-zinc-500 hover:text-zinc-300 px-3 py-1.5 transition"
            >
              Skip Setup
            </button>

            {step < 4 ? (
              <button
                type="button"
                onClick={() => setStep((s) => (s + 1) as any)}
                className="flex items-center space-x-1.5 px-6 py-2.5 rounded-full bg-white text-black font-extrabold text-xs hover:bg-zinc-200 transition shadow-lg"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                className="flex items-center space-x-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white font-extrabold text-xs hover:brightness-110 transition shadow-xl"
              >
                <Check className="w-4 h-4" />
                <span>Complete Setup & Launch</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
