import React, { useState } from 'react';
import { store } from '../../app-core/store';
import { IProfile } from '../../app-core/types';
import { s3Cloud, IS3Config } from '../../app-core/s3Client';
import { parseLatexResume } from '../../app-core/latexParser';
import { parseEnvContent } from '../../app-core/envParser';
import {
  Settings, Save, Download, Upload, RotateCcw, CheckCircle2, User,
  FileText, Key, ShieldCheck, Cloud, RefreshCw, Sparkles, FileCode, AlertCircle
} from 'lucide-react';

interface SettingsViewProps {
  onProfileUpdated: () => void;
  onOpenWizard: () => void;
}

export function SettingsView({ onProfileUpdated, onOpenWizard }: SettingsViewProps) {
  const [profile, setProfile] = useState<IProfile>(store.getProfile());
  const [masterResume, setMasterResume] = useState<string>(store.getMasterResume());
  const [skillsInput, setSkillsInput] = useState<string>(profile.primarySkills.join(', '));
  const [s3Config, setS3Config] = useState<IS3Config>(s3Cloud.getConfig());
  const [saveMsg, setSaveMsg] = useState('');
  const [activeTab, setActiveTab] = useState<'profile' | 'latex' | 's3' | 'api' | 'backup'>('profile');
  const [s3Syncing, setS3Syncing] = useState(false);
  const [testingApiKey, setTestingApiKey] = useState(false);
  const [envPasteModal, setEnvPasteModal] = useState(false);
  const [rawEnvText, setRawEnvText] = useState('');

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const skillsArray = skillsInput.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
    const updated = { ...profile, primarySkills: skillsArray };
    store.saveProfile(updated);
    setProfile(updated);
    setSaveMsg('Candidate profile saved and synced to S3!');
    onProfileUpdated();
    setTimeout(() => setSaveMsg(''), 3000);
  };

  const handleSaveResume = () => {
    store.saveMasterResume(masterResume);
    setSaveMsg('Resume code updated and synced to S3!');
    setTimeout(() => setSaveMsg(''), 3000);
  };

  const handleExtractFromLatex = () => {
    if (!masterResume.trim()) return;
    const parsed = parseLatexResume(masterResume);
    const updated: IProfile = {
      ...profile,
      name: parsed.name || profile.name,
      email: parsed.email || profile.email,
      phone: parsed.phone || profile.phone,
      location: parsed.location || profile.location,
      linkedin: parsed.linkedin || profile.linkedin,
      github: parsed.github || profile.github,
      portfolio: parsed.portfolio || profile.portfolio,
      education: parsed.education || profile.education,
    };
    if (parsed.skills.length > 0) {
      setSkillsInput(parsed.skills.join(', '));
      updated.primarySkills = parsed.skills;
    }
    setProfile(updated);
    store.saveProfile(updated);
    setSaveMsg(`Extracted details for "${parsed.name}" from LaTeX!`);
    onProfileUpdated();
    setTimeout(() => setSaveMsg(''), 3000);
  };

  const handleApplyEnvPaste = () => {
    if (!rawEnvText.trim()) return;
    const parsed = parseEnvContent(rawEnvText);
    const updatedS3: Partial<IS3Config> = {};
    if (parsed.awsBucket) updatedS3.bucket = parsed.awsBucket;
    if (parsed.awsRegion) updatedS3.region = parsed.awsRegion;
    if (parsed.awsAccessKeyId) updatedS3.accessKeyId = parsed.awsAccessKeyId;
    if (parsed.awsSecretAccessKey) updatedS3.secretAccessKey = parsed.awsSecretAccessKey;

    s3Cloud.saveConfig(updatedS3);
    setS3Config(s3Cloud.getConfig());

    if (parsed.openrouterApiKey || parsed.telegramBotToken) {
      const updatedProfile = {
        ...profile,
        apiKey: parsed.openrouterApiKey || profile.apiKey,
        telegramToken: parsed.telegramBotToken || profile.telegramToken,
      };
      store.saveProfile(updatedProfile);
      setProfile(updatedProfile);
    }

    setEnvPasteModal(false);
    setRawEnvText('');
    setSaveMsg('.env configuration successfully applied!');
    setTimeout(() => setSaveMsg(''), 3000);
  };

  const handleSaveS3Config = (e: React.FormEvent) => {
    e.preventDefault();
    s3Cloud.saveConfig(s3Config);
    setSaveMsg('AWS S3 credentials and sync settings saved!');
    setTimeout(() => setSaveMsg(''), 3000);
  };

  const handleManualS3Sync = async () => {
    setS3Syncing(true);
    setSaveMsg('');
    try {
      const ok = await s3Cloud.syncAllToS3(store.getJobs(), store.getQueueItems(), store.getProfile(), store.getMasterResume());
      if (ok) {
        setSaveMsg(`Successfully uploaded all jobs, queue, and profile to S3 bucket '${s3Config.bucket}'!`);
      } else {
        setSaveMsg(`S3 Sync failed: ${s3Cloud.getStatus().error || 'Check AWS credentials'}`);
      }
    } catch (err: any) {
      setSaveMsg(`Error: ${err.message}`);
    } finally {
      setS3Syncing(false);
      setTimeout(() => setSaveMsg(''), 4000);
    }
  };

  const handlePullFromS3 = async () => {
    setS3Syncing(true);
    try {
      const data = await s3Cloud.pullFromS3();
      if (data) {
        if (data.jobs) store.addJobs(data.jobs);
        if (data.profile) {
          store.saveProfile(data.profile);
          setProfile(data.profile);
        }
        if (data.masterResume) {
          store.saveMasterResume(data.masterResume);
          setMasterResume(data.masterResume);
        }
        setSaveMsg('Successfully pulled and restored latest data from AWS S3!');
        onProfileUpdated();
      } else {
        setSaveMsg('No existing backup found in S3 bucket or pull failed.');
      }
    } catch (err: any) {
      setSaveMsg(`Error pulling from S3: ${err.message}`);
    } finally {
      setS3Syncing(false);
      setTimeout(() => setSaveMsg(''), 4000);
    }
  };

  const handleExportJson = () => {
    const dataStr = store.exportAllData();
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `JobRadar_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const ok = store.importAllData(content);
        if (ok) {
          setProfile(store.getProfile());
          setMasterResume(store.getMasterResume());
          setSkillsInput(store.getProfile().primarySkills.join(', '));
          setSaveMsg('All data successfully restored and synced to S3!');
          onProfileUpdated();
          setTimeout(() => setSaveMsg(''), 3000);
        } else {
          alert('Invalid JSON backup file.');
        }
      }
    };
    reader.readAsText(file);
  };

  const handleResetData = () => {
    if (confirm('Are you sure you want to reset all jobs, queue, and profile to fresh seed state?')) {
      store.resetToSeed();
      setProfile(store.getProfile());
      setMasterResume(store.getMasterResume());
      setSkillsInput(store.getProfile().primarySkills.join(', '));
      setSaveMsg('Data restored to initial state.');
      onProfileUpdated();
      setTimeout(() => setSaveMsg(''), 3000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Settings className="w-6 h-6 text-white" /> Candidate Profile, S3 Storage & Settings
          </h2>
          <p className="text-sm text-zinc-400 font-medium">
            Customize candidate credentials, LaTeX resume code, AWS S3 bucket keys, and multi-user configurations.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Quick .env Import CTA */}
          <button
            onClick={() => setEnvPasteModal(true)}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-full bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 text-zinc-200 text-xs font-bold transition"
          >
            <Key className="w-3.5 h-3.5 text-cyan-400" />
            <span>Import .env</span>
          </button>

          {/* Setup Wizard CTA */}
          <button
            onClick={onOpenWizard}
            className="flex items-center space-x-1.5 px-5 py-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-black font-extrabold text-xs hover:brightness-110 transition shadow-lg"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Run Setup Wizard</span>
          </button>
        </div>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex items-center space-x-2 bg-[#121215] p-1.5 rounded-full border border-zinc-800 w-fit overflow-x-auto">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center space-x-1.5 text-xs font-bold px-4 py-1.5 rounded-full transition ${
            activeTab === 'profile' ? 'bg-white text-black shadow' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>Profile & Target Skills</span>
        </button>

        <button
          onClick={() => setActiveTab('latex')}
          className={`flex items-center space-x-1.5 text-xs font-bold px-4 py-1.5 rounded-full transition ${
            activeTab === 'latex' ? 'bg-white text-black shadow' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <FileCode className="w-3.5 h-3.5 text-emerald-600" />
          <span>LaTeX Resume (.tex)</span>
        </button>

        <button
          onClick={() => setActiveTab('s3')}
          className={`flex items-center space-x-1.5 text-xs font-bold px-4 py-1.5 rounded-full transition ${
            activeTab === 's3' ? 'bg-cyan-500 text-black shadow font-extrabold' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Cloud className="w-3.5 h-3.5" />
          <span>AWS S3 Cloud Storage</span>
        </button>

        <button
          onClick={() => setActiveTab('api')}
          className={`flex items-center space-x-1.5 text-xs font-bold px-4 py-1.5 rounded-full transition ${
            activeTab === 'api' ? 'bg-white text-black shadow' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Key className="w-3.5 h-3.5" />
          <span>API Keys (Optional)</span>
        </button>

        <button
          onClick={() => setActiveTab('backup')}
          className={`flex items-center space-x-1.5 text-xs font-bold px-4 py-1.5 rounded-full transition ${
            activeTab === 'backup' ? 'bg-white text-black shadow' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Backup & Local Storage</span>
        </button>
      </div>

      {saveMsg && (
        <div className={`p-3.5 rounded-2xl text-xs font-mono flex items-center gap-2 ${
          saveMsg.startsWith('✕')
            ? 'bg-red-950/70 border border-red-800 text-red-300'
            : 'bg-emerald-950/70 border border-emerald-800 text-emerald-300'
        }`}>
          {saveMsg.startsWith('✕') ? (
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          )}
          <span>{saveMsg}</span>
        </div>
      )}

      {/* ── 1. PROFILE TAB ── */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="bg-[#121215] border border-[#27272a] rounded-[24px] p-6 space-y-5 shadow-2xl">
          <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider">Candidate Information</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <label className="block text-[11px] font-mono text-zinc-400 uppercase mb-1">Location & Preferences</label>
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
              <label className="block text-[11px] font-mono text-zinc-400 uppercase mb-1">LinkedIn Profile URL</label>
              <input
                type="url"
                value={profile.linkedin}
                onChange={(e) => setProfile({ ...profile, linkedin: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-[#18181b] border border-[#27272a] rounded-xl text-xs text-white focus:outline-none focus:border-zinc-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono text-zinc-400 uppercase mb-1">GitHub Profile URL</label>
              <input
                type="url"
                value={profile.github}
                onChange={(e) => setProfile({ ...profile, github: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-[#18181b] border border-[#27272a] rounded-xl text-xs text-white focus:outline-none focus:border-zinc-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono text-zinc-400 uppercase mb-1">
              Primary Target Skills (comma separated for scoring & ATS matcher)
            </label>
            <textarea
              rows={3}
              value={skillsInput}
              onChange={(e) => setSkillsInput(e.target.value)}
              className="w-full p-3.5 bg-[#18181b] border border-[#27272a] rounded-xl text-xs text-white font-mono focus:outline-none focus:border-zinc-400 leading-relaxed"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="flex items-center space-x-2 px-6 py-2.5 rounded-full bg-white text-black font-extrabold text-xs hover:bg-zinc-200 transition shadow-lg"
            >
              <Save className="w-4 h-4" />
              <span>Save Candidate Profile</span>
            </button>
          </div>
        </form>
      )}

      {/* ── 2. LATEX RESUME TAB ── */}
      {activeTab === 'latex' && (
        <div className="bg-[#121215] border border-[#27272a] rounded-[24px] p-6 space-y-4 shadow-2xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <FileCode className="w-4 h-4 text-emerald-400" /> Master Resume LaTeX Source (.tex)
              </h3>
              <p className="text-xs text-zinc-400">
                Paste your Overleaf / LaTeX code. The system uses this to extract your credentials and tailor ATS PDF resumes.
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleExtractFromLatex}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-full bg-emerald-950/70 border border-emerald-800/80 text-emerald-300 hover:bg-emerald-900/60 font-bold text-xs transition"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Auto-Extract Details</span>
              </button>
              <button
                type="button"
                onClick={handleSaveResume}
                className="flex items-center space-x-1.5 px-5 py-2 rounded-full bg-white text-black font-extrabold text-xs hover:bg-zinc-200 transition shadow"
              >
                <Save className="w-4 h-4" />
                <span>Save LaTeX Code</span>
              </button>
            </div>
          </div>

          <textarea
            rows={18}
            value={masterResume}
            onChange={(e) => setMasterResume(e.target.value)}
            className="w-full p-4 bg-[#09090b] border border-[#27272a] rounded-2xl text-xs text-zinc-200 font-mono leading-relaxed focus:outline-none focus:border-zinc-400"
          />
        </div>
      )}

      {/* ── 3. AWS S3 CLOUD STORAGE TAB ── */}
      {activeTab === 's3' && (
        <div className="space-y-5">
          <div className="bg-[#121215] border border-[#27272a] rounded-[24px] p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <Cloud className="w-5 h-5 text-cyan-400" /> AWS S3 Datastore & Bucket Sync
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  All your job postings, queue logs, profile data, and compiled ATS PDF resumes are uploaded directly into your AWS S3 bucket.
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={handlePullFromS3}
                  disabled={s3Syncing}
                  className="flex items-center space-x-1.5 px-4 py-2 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800 text-xs font-bold transition disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Pull from S3</span>
                </button>

                <button
                  type="button"
                  onClick={handleManualS3Sync}
                  disabled={s3Syncing}
                  className="flex items-center space-x-1.5 px-5 py-2 rounded-full bg-gradient-to-r from-cyan-500 to-teal-500 text-black font-extrabold text-xs hover:brightness-110 transition shadow-lg disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${s3Syncing ? 'animate-spin' : ''}`} />
                  <span>{s3Syncing ? 'Syncing to S3...' : 'Sync All to S3 Now'}</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveS3Config} className="space-y-4 pt-2 border-t border-zinc-800/80">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-mono text-zinc-400 uppercase mb-1">AWS S3 Bucket Name</label>
                  <input
                    type="text"
                    value={s3Config.bucket}
                    onChange={(e) => setS3Config({ ...s3Config, bucket: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#18181b] border border-[#27272a] rounded-xl text-xs text-cyan-300 font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-zinc-400 uppercase mb-1">AWS Region</label>
                  <input
                    type="text"
                    value={s3Config.region}
                    onChange={(e) => setS3Config({ ...s3Config, region: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#18181b] border border-[#27272a] rounded-xl text-xs text-white font-mono focus:outline-none focus:border-zinc-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-zinc-400 uppercase mb-1">AWS Access Key ID</label>
                  <input
                    type="text"
                    value={s3Config.accessKeyId}
                    onChange={(e) => setS3Config({ ...s3Config, accessKeyId: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#18181b] border border-[#27272a] rounded-xl text-xs text-white font-mono focus:outline-none focus:border-zinc-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-zinc-400 uppercase mb-1">AWS Secret Access Key</label>
                  <input
                    type="password"
                    value={s3Config.secretAccessKey}
                    onChange={(e) => setS3Config({ ...s3Config, secretAccessKey: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#18181b] border border-[#27272a] rounded-xl text-xs text-white font-mono focus:outline-none focus:border-zinc-400"
                  />
                </div>
              </div>

              {/* Auto Sync Toggle */}
              <div className="flex items-center justify-between p-4 bg-[#18181b] border border-[#27272a] rounded-2xl">
                <div>
                  <h4 className="text-xs font-bold text-white">Automatic Real-Time Cloud Sync</h4>
                  <p className="text-[11px] text-zinc-400">Automatically upload new jobs, stage updates, and PDF resumes to S3 whenever modified.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={s3Config.autoSync}
                    onChange={(e) => setS3Config({ ...s3Config, autoSync: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                </label>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="flex items-center space-x-2 px-6 py-2.5 rounded-full bg-white text-black font-extrabold text-xs hover:bg-zinc-200 transition shadow-lg"
                >
                  <Save className="w-4 h-4" />
                  <span>Save S3 Settings</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 4. API KEYS TAB ── */}
      {activeTab === 'api' && (
        <div className="bg-[#121215] border border-[#27272a] rounded-[24px] p-6 space-y-5 shadow-2xl">
          <div>
            <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Key className="w-4 h-4 text-purple-400" /> Cloud LLM & AI Engine (OpenRouter)
            </h3>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              JobRadar operates completely offline with built-in heuristic extractors. Providing an OpenRouter API key unlocks real-time LLM reasoning across 20+ free and open-source models with automated rotation and zero cost.
            </p>
          </div>

          <div className="space-y-4 pt-1">
            <div className="p-4 bg-[#18181b] border border-[#27272a] rounded-2xl space-y-3">
              <label className="block text-[11px] font-mono text-zinc-300 uppercase font-bold">
                OpenRouter API Key
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  placeholder="sk-or-v1-..."
                  value={profile.apiKey || ''}
                  onChange={(e) => {
                    const updated = { ...profile, apiKey: e.target.value };
                    setProfile(updated);
                    store.saveProfile(updated);
                  }}
                  className="flex-1 px-3.5 py-2.5 bg-[#09090b] border border-[#27272a] rounded-xl text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                />
                <button
                  type="button"
                  disabled={testingApiKey}
                  onClick={async () => {
                    if (!profile.apiKey) {
                      setSaveMsg('Please enter an OpenRouter API key to test.');
                      setTimeout(() => setSaveMsg(''), 3000);
                      return;
                    }
                    setTestingApiKey(true);
                    setSaveMsg('Testing OpenRouter connection via Native IPC...');
                    try {
                      const res = await (await import('../../app-core/llmClient')).llmClient.testApiKey(profile.apiKey);
                      if (res.valid) {
                        setSaveMsg(`✓ Connected successfully to ${res.model || 'OpenRouter Unified API'}!`);
                      } else {
                        setSaveMsg(`✕ Connection failed: ${res.message}`);
                      }
                    } catch (err: any) {
                      setSaveMsg(`✕ Connection error: ${err.message}`);
                    } finally {
                      setTestingApiKey(false);
                      setTimeout(() => setSaveMsg(''), 6000);
                    }
                  }}
                  className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition shadow shrink-0 flex items-center gap-1.5 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testingApiKey ? 'animate-spin' : ''}`} />
                  <span>{testingApiKey ? 'Testing...' : 'Test Connection'}</span>
                </button>
              </div>
              <p className="text-[11px] text-zinc-500">
                Enter your OpenRouter key (<code className="text-zinc-400">sk-or-v1-...</code>). All generations leverage rotated free models with zero billing required.
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-zinc-400 uppercase mb-1">Telegram Bot Token (Optional)</label>
              <input
                type="password"
                placeholder="123456789:ABCdefGHIjklMNOpqrSTUvwxYZ..."
                value={profile.telegramToken || ''}
                onChange={(e) => {
                  const updated = { ...profile, telegramToken: e.target.value };
                  setProfile(updated);
                  store.saveProfile(updated);
                }}
                className="w-full px-3.5 py-2.5 bg-[#18181b] border border-[#27272a] rounded-xl text-xs text-white focus:outline-none focus:border-zinc-400 font-mono"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── 5. BACKUP & LOCAL STORAGE TAB ── */}
      {activeTab === 'backup' && (
        <div className="bg-[#121215] border border-[#27272a] rounded-[24px] p-6 space-y-6 shadow-2xl">
          <div>
            <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider">Windows Local Storage & Backup</h3>
            <p className="text-xs text-zinc-400 mt-1">
              All your job postings, custom candidate data, and pipeline states are saved locally on your Windows machine and synced with AWS S3.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {/* Export */}
            <div className="p-5 bg-[#18181b] border border-[#27272a] rounded-2xl space-y-3 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-sm text-white flex items-center gap-2">
                  <Download className="w-4 h-4 text-emerald-400" /> Export JSON Backup
                </h4>
                <p className="text-xs text-zinc-400 mt-1">Download complete JSON archive of all jobs and profiles.</p>
              </div>
              <button
                onClick={handleExportJson}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow"
              >
                Export JSON
              </button>
            </div>

            {/* Import */}
            <div className="p-5 bg-[#18181b] border border-[#27272a] rounded-2xl space-y-3 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-sm text-white flex items-center gap-2">
                  <Upload className="w-4 h-4 text-cyan-400" /> Restore from JSON
                </h4>
                <p className="text-xs text-zinc-400 mt-1">Restore previously exported JobRadar archive.</p>
              </div>
              <label className="w-full py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs text-center transition cursor-pointer border border-zinc-700">
                Choose Backup File
                <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
              </label>
            </div>

            {/* Reset */}
            <div className="p-5 bg-[#18181b] border border-[#27272a] rounded-2xl space-y-3 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-sm text-white flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-red-400" /> Reset to Seed State
                </h4>
                <p className="text-xs text-zinc-400 mt-1">Re-seed initial sample jobs and profile.</p>
              </div>
              <button
                onClick={handleResetData}
                className="w-full py-2.5 px-4 rounded-xl bg-red-950/60 hover:bg-red-900/60 text-red-300 font-bold text-xs transition border border-red-800/60"
              >
                Reset Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick .env Import Modal */}
      {envPasteModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#121215] border border-[#27272a] rounded-[24px] w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Key className="w-4 h-4 text-cyan-400" /> Quick Import .env File
              </h3>
              <button
                onClick={() => setEnvPasteModal(false)}
                className="p-1 text-zinc-400 hover:text-white rounded-full"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-zinc-400">
              Paste the text from your `.env` file below to automatically configure your AWS credentials, S3 bucket, and API tokens:
            </p>

            <textarea
              rows={6}
              value={rawEnvText}
              onChange={(e) => setRawEnvText(e.target.value)}
              placeholder="AWS_REGION=us-east-1&#10;AWS_ACCESS_KEY_ID=AKIA...&#10;AWS_SECRET_ACCESS_KEY=...&#10;AWS_S3_BUCKET=jobsprep&#10;OPENROUTER_API_KEY=..."
              className="w-full p-3 bg-[#09090b] border border-[#27272a] rounded-xl text-xs text-zinc-200 font-mono focus:outline-none focus:border-cyan-500 resize-none"
            />

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setEnvPasteModal(false)}
                className="px-4 py-2 text-xs font-bold text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyEnvPaste}
                disabled={!rawEnvText.trim()}
                className="px-5 py-2 rounded-full bg-cyan-500 text-black font-extrabold text-xs hover:bg-cyan-400 transition disabled:opacity-40"
              >
                Apply .env Configuration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
