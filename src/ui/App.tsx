import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { store } from '../app-core/store';
import { IJob, IProfile, IStats } from '../app-core/types';
import { Navbar } from './components/Navbar';
import { StatsBar } from './components/StatsBar';
import { JobTable } from './components/JobTable';
import { KanbanBoard } from './components/KanbanBoard';
import { JobDrawer } from './components/JobDrawer';
import { IngestModal } from './components/IngestModal';
import { QueueHealth } from './components/QueueHealth';
import { AnalyticsView } from './components/AnalyticsView';
import { SettingsView } from './components/SettingsView';
import { OnboardingWizard } from './components/OnboardingWizard';
import { RagVaultView } from './components/RagVaultView';
import { CareerSitesView } from './components/CareerSitesView';
import { Search, List, LayoutGrid, MessageSquare, RefreshCw, Sparkles, Filter, Trash2 } from 'lucide-react';

export default function App() {
  const [jobs, setJobs] = useState<IJob[]>(store.getJobs());
  const [profile, setProfile] = useState<IProfile>(store.getProfile());
  const [stats, setStats] = useState<IStats>(store.getStats());

  const [currentTab, setCurrentTab] = useState<'feed' | 'careers' | 'rag' | 'queue' | 'analytics' | 'settings'>('feed');
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [selectedJob, setSelectedJob] = useState<IJob | null>(null);
  const [isIngestModalOpen, setIsIngestModalOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [approvalFilter, setApprovalFilter] = useState('');
  const [skillFilter, setSkillFilter] = useState<'matched' | 'all' | 'unmatched'>('all');

  // Check first run on fresh installation
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const onboarded = localStorage.getItem('jobradar_onboarded_v1');
      if (!onboarded) {
        // Offer wizard on fresh computer install
        setIsWizardOpen(true);
      }
    }
  }, []);

  // Sync with reactive store
  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      setJobs(store.getJobs());
      setProfile(store.getProfile());
      setStats(store.getStats());
    });
    return unsubscribe;
  }, []);

  // Update selection if selectedJob changed
  useEffect(() => {
    if (selectedJob) {
      const refreshed = store.getJobById(selectedJob.id);
      if (refreshed) setSelectedJob(refreshed);
    }
  }, [jobs]);

  const handleUpdateApproval = (jobId: string, status: 'pending' | 'approved' | 'rejected') => {
    const updated = store.updateApproval(jobId, status);
    if (updated && selectedJob?.id === jobId) {
      setSelectedJob(updated);
    }
  };

  const handleUpdateApplication = (
    jobId: string,
    status: 'not_applied' | 'applied' | 'interview' | 'offer' | 'rejected'
  ) => {
    const updated = store.updateApplication(jobId, status);
    if (updated && selectedJob?.id === jobId) {
      setSelectedJob(updated);
    }
  };

  const handleDeleteJob = useCallback((jobId: string) => {
    store.deleteJob(jobId);
    setJobs(store.getJobs());
    setStats(store.getStats());
    if (selectedJob?.id === jobId) {
      setSelectedJob(null);
    }
  }, [selectedJob]);

  const handleDeleteMultipleJobs = useCallback((jobIds: string[]) => {
    jobIds.forEach((id) => store.deleteJob(id));
    setJobs(store.getJobs());
    setStats(store.getStats());
    if (selectedJob && jobIds.includes(selectedJob.id)) {
      setSelectedJob(null);
    }
  }, [selectedJob]);

  // Filtered jobs list
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      // 1. Text Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const text = `${job.jobTitle} ${job.companyName} ${job.location || ''} ${(job.skillsRequired || []).join(' ')}`.toLowerCase();
        if (!text.includes(q)) return false;
      }

      // 2. Approval Status Filter
      if (approvalFilter && job.approvalStatus !== approvalFilter) {
        return false;
      }

      // 3. Candidate Skills Match Filter
      if (skillFilter === 'matched' && !job.skillMatched) {
        return false;
      }
      if (skillFilter === 'unmatched' && job.skillMatched) {
        return false;
      }

      return true;
    });
  }, [jobs, search, approvalFilter, skillFilter]);

  return (
    <div className="min-h-screen bg-[#09090b] text-white flex flex-col antialiased selection:bg-emerald-500 selection:text-black">
      {/* Native Desktop Header Navbar */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onOpenIngestModal={() => setIsIngestModalOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full space-y-6">
        {/* ── 1. FEED & KANBAN TAB ── */}
        {currentTab === 'feed' && (
          <div className="space-y-6 animate-in fade-in-50 duration-200">
            {/* Top Metric Chips */}
            <StatsBar stats={stats} />

            {/* Controls, Filters & View Switcher Bar */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-[#121215] border border-[#27272a] p-4 md:p-5 rounded-[22px] shadow-xl">
              {/* Search & Select Filter Controls */}
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <div className="relative w-full md:w-72">
                  <Search className="w-4 h-4 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search role, company, or skills..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-[#18181b] border border-[#27272a] rounded-full text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-400 font-medium"
                  />
                </div>

                <select
                  value={approvalFilter}
                  onChange={(e) => setApprovalFilter(e.target.value)}
                  className="px-4 py-2 bg-[#18181b] border border-[#27272a] rounded-full text-xs text-zinc-300 focus:outline-none focus:border-zinc-400 font-medium cursor-pointer"
                >
                  <option value="">All Approval Statuses</option>
                  <option value="pending">⏳ Pending Gate</option>
                  <option value="approved">✓ Approved</option>
                  <option value="rejected">✕ Rejected</option>
                </select>

                <select
                  value={skillFilter}
                  onChange={(e) => setSkillFilter(e.target.value as any)}
                  className="px-4 py-2 bg-[#18181b] border border-[#27272a] rounded-full text-xs text-emerald-400 focus:outline-none focus:border-emerald-500 font-bold cursor-pointer"
                >
                  <option value="matched">🎯 Candidate Skills Matched Only</option>
                  <option value="unmatched">⚠️ Non-Matching Skills</option>
                  <option value="all">🌐 All Postings Feed</option>
                </select>
              </div>

              {/* View Switcher & Action CTA */}
              <div className="flex items-center space-x-3 w-full md:w-auto justify-end">
                {/* Table vs Kanban Toggle */}
                <div className="bg-[#18181b] border border-[#27272a] rounded-full p-1 flex items-center shadow-inner">
                  <button
                    onClick={() => setViewMode('table')}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold flex items-center space-x-1.5 transition ${
                      viewMode === 'table' ? 'bg-white text-black shadow-md' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <List className="w-3.5 h-3.5" />
                    <span>Table</span>
                  </button>
                  <button
                    onClick={() => setViewMode('kanban')}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold flex items-center space-x-1.5 transition ${
                      viewMode === 'kanban' ? 'bg-white text-black shadow-md' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>Kanban</span>
                  </button>
                </div>

                {/* WhatsApp Bulk Ingest Pill */}
                <button
                  onClick={() => setIsIngestModalOpen(true)}
                  className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black rounded-full text-xs font-black transition shadow-lg hover:scale-105"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Ingest WhatsApp Dump</span>
                </button>

                {/* Clear All Jobs Button */}
                {jobs.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Are you sure you want to clear all ${jobs.length} jobs to re-ingest your WhatsApp dump fresh?`)) {
                        handleDeleteMultipleJobs(jobs.map((j) => j.id));
                      }
                    }}
                    className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-950/40 rounded-full border border-zinc-800 transition"
                    title={`Clear all ${jobs.length} jobs from feed`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Main Feed Content View */}
            {viewMode === 'table' ? (
              <JobTable
                jobs={filteredJobs}
                onSelectJob={(j) => setSelectedJob(j)}
                onDeleteJob={handleDeleteJob}
                onDeleteMultipleJobs={handleDeleteMultipleJobs}
              />
            ) : (
              <KanbanBoard
                jobs={filteredJobs}
                onSelectJob={(j) => setSelectedJob(j)}
                onUpdateApproval={handleUpdateApproval}
                onUpdateApplication={handleUpdateApplication}
                onDeleteJob={handleDeleteJob}
              />
            )}
          </div>
        )}

        {/* ── 2. TARGET CAREER SITES & MULTI-PORTAL CRAWLER TAB ── */}
        {currentTab === 'careers' && (
          <div className="animate-in fade-in-50 duration-200">
            <CareerSitesView
              profile={profile}
              onOpenJob={(jobId) => {
                const j = store.getJobById(jobId);
                if (j) {
                  setSelectedJob(j);
                  setCurrentTab('feed');
                }
              }}
            />
          </div>
        )}

        {/* ── 4. CAREER KNOWLEDGE VAULT & RAG COPILOT TAB ── */}
        {currentTab === 'rag' && (
          <div className="animate-in fade-in-50 duration-200">
            <RagVaultView
              profile={profile}
              onOpenSettings={() => setCurrentTab('settings')}
            />
          </div>
        )}

        {/* ── 4. PIPELINE & QUEUE HEALTH TAB ── */}
        {currentTab === 'queue' && (
          <div className="animate-in fade-in-50 duration-200">
            <QueueHealth stats={stats} onRefresh={() => setStats(store.getStats())} />
          </div>
        )}

        {/* ── 3. ANALYTICS & CONVERSION FUNNEL TAB ── */}
        {currentTab === 'analytics' && (
          <div className="animate-in fade-in-50 duration-200">
            <AnalyticsView jobs={jobs} stats={stats} />
          </div>
        )}

        {/* ── 4. CANDIDATE PROFILE & SETTINGS TAB ── */}
        {currentTab === 'settings' && (
          <div className="animate-in fade-in-50 duration-200">
            <SettingsView
              onOpenWizard={() => setIsWizardOpen(true)}
              onProfileUpdated={() => {
                setProfile(store.getProfile());
                setJobs(store.getJobs());
              }}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-6 text-center text-xs text-zinc-500 font-medium">
        JobRadar Standalone Windows Edition &copy; 2026 {profile.name} — Multi-User Local Installation Support
      </footer>

      {/* 5-Tab Job Inspection Drawer */}
      <JobDrawer
        job={selectedJob}
        profile={profile}
        onClose={() => setSelectedJob(null)}
        onUpdateApproval={handleUpdateApproval}
        onUpdateApplication={handleUpdateApplication}
        onDeleteJob={handleDeleteJob}
      />

      {/* Bulk WhatsApp & Job Ingestion Modal */}
      <IngestModal
        isOpen={isIngestModalOpen}
        onClose={() => setIsIngestModalOpen(false)}
        onSuccess={() => {
          setJobs(store.getJobs());
          setStats(store.getStats());
        }}
      />

      {/* Multi-User Onboarding & Setup Wizard */}
      <OnboardingWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onCompleted={() => {
          setProfile(store.getProfile());
          setJobs(store.getJobs());
          setStats(store.getStats());
        }}
      />
    </div>
  );
}
