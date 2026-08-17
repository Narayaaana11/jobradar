'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { StatsBar } from '../components/StatsBar';
import { JobTable } from '../components/JobTable';
import { KanbanBoard } from '../components/KanbanBoard';
import { JobDrawer } from '../components/JobDrawer';
import { Search, RefreshCw, LayoutGrid, List, Plus, Globe, MessageSquare, X, Sparkles } from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';

export default function DashboardPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalJobs: 0,
    pendingApproval: 0,
    approvedJobs: 0,
    appliedJobs: 0,
    unprocessedQueue: 0,
    avgMatchScore: 0,
  });
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [approvalFilter, setApprovalFilter] = useState('');
  const [skillFilter, setSkillFilter] = useState('matched');
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');

  // Web / Bulk Ingest Modal state
  const [showIngestModal, setShowIngestModal] = useState(false);
  const [ingestMode, setIngestMode] = useState<'single' | 'whatsapp'>('whatsapp');
  const [ingestInput, setIngestInput] = useState('');
  const [ingestChannel, setIngestChannel] = useState('WhatsApp Hyderabad Jobs');
  const [ingesting, setIngesting] = useState(false);
  const [ingestResultMsg, setIngestResultMsg] = useState('');

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (search) queryParams.append('search', search);
      if (approvalFilter) queryParams.append('approvalStatus', approvalFilter);
      if (skillFilter) queryParams.append('skillFilter', skillFilter);

      const [jobsRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/jobs?${queryParams.toString()}`).then((res) => (res.ok ? res.json() : [])),
        fetch(`${API_BASE}/stats`).then((res) => (res.ok ? res.json() : ({} as any))),
      ]);

      const sData = statsRes as any;
      setJobs(jobsRes);
      setStats({
        totalJobs: sData.totalJobs || 0,
        pendingApproval: sData.pendingApproval || 0,
        approvedJobs: sData.approvedJobs || 0,
        appliedJobs: sData.appliedJobs || 0,
        unprocessedQueue: sData.unprocessedQueue || 0,
        avgMatchScore: sData.avgMatchScore || 0,
      });
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [search, approvalFilter, skillFilter]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleUpdateApproval = async (jobId: string, status: string) => {
    try {
      const res = await fetch(`${API_BASE}/jobs/${jobId}/approval`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvalStatus: status }),
      });
      if (res.ok) {
        const updatedJob = await res.json();
        setSelectedJob(updatedJob);
        fetchDashboardData();
      }
    } catch (err) {
      console.error('Failed to update approval status:', err);
    }
  };

  const handleUpdateApplication = async (jobId: string, status: string) => {
    try {
      const res = await fetch(`${API_BASE}/jobs/${jobId}/application`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationStatus: status }),
      });
      if (res.ok) {
        const updatedJob = await res.json();
        setSelectedJob(updatedJob);
        fetchDashboardData();
      }
    } catch (err) {
      console.error('Failed to update application status:', err);
    }
  };

  const handleTriggerIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingestInput.trim()) return;

    setIngesting(true);
    setIngestResultMsg('');
    try {
      const endpoint = ingestMode === 'whatsapp' ? `${API_BASE}/queue/ingest-bulk-text` : `${API_BASE}/queue/ingest-url`;
      const bodyPayload = ingestMode === 'whatsapp'
        ? { bulkText: ingestInput, channelName: ingestChannel }
        : { urlOrText: ingestInput, channelName: ingestChannel };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      });

      if (res.ok) {
        const data = await res.json();
        setIngestResultMsg(data.message || 'Successfully queued for AI pipeline processing!');
        setIngestInput('');
        setTimeout(() => {
          setShowIngestModal(false);
          setIngestResultMsg('');
          fetchDashboardData();
        }, 3000);
      }
    } catch (err) {
      console.error('Failed to trigger ingestion:', err);
    } finally {
      setIngesting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Bar */}
      <StatsBar stats={stats} />

      {/* TechNexus Style Filter & Controls Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-[#121215] border border-[#27272a] p-5 rounded-[20px] shadow-xl">
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search role or company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#18181b] border border-[#27272a] rounded-full text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-400 font-medium"
            />
          </div>

          <select
            value={approvalFilter}
            onChange={(e) => setApprovalFilter(e.target.value)}
            className="px-4 py-2 bg-[#18181b] border border-[#27272a] rounded-full text-xs text-zinc-300 focus:outline-none focus:border-zinc-400 font-medium"
          >
            <option value="">All Approval Statuses</option>
            <option value="pending">Pending Gate</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>

          <select
            value={skillFilter}
            onChange={(e) => setSkillFilter(e.target.value)}
            className="px-4 py-2 bg-[#18181b] border border-[#27272a] rounded-full text-xs text-emerald-400 focus:outline-none focus:border-emerald-500 font-bold"
          >
            <option value="matched">🎯 Candidate Skills Matched Only</option>
            <option value="unmatched">⚠️ Non-Matching Skills</option>
            <option value="all">🌐 All Skills Feed</option>
          </select>
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto justify-end">
          {/* TechNexus Segmented View Switcher */}
          <div className="bg-[#18181b] border border-[#27272a] rounded-full p-1 flex items-center">
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

          {/* WhatsApp / Link Bulk Ingest Pill CTA Button */}
          <button
            onClick={() => {
              setIngestMode('whatsapp');
              setShowIngestModal(true);
            }}
            className="flex items-center space-x-1.5 px-5 py-2 bg-gradient-to-r from-white via-zinc-100 to-zinc-300 text-black hover:bg-zinc-200 rounded-full text-xs font-extrabold transition shadow-lg"
          >
            <MessageSquare className="w-4 h-4 text-emerald-600" />
            <span>Ingest WhatsApp Chat Dump</span>
          </button>

          <button
            onClick={fetchDashboardData}
            className="p-2.5 bg-[#18181b] hover:bg-zinc-800 border border-[#27272a] rounded-full text-zinc-300 transition"
            title="Refresh feed"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Content Area: Table vs Kanban */}
      {loading && jobs.length === 0 ? (
        <div className="bg-[#121215] border border-[#27272a] rounded-[20px] p-12 text-center text-zinc-400 font-mono text-xs">
          Loading JobRadar feed...
        </div>
      ) : viewMode === 'table' ? (
        <JobTable jobs={jobs} onSelectJob={(job) => setSelectedJob(job)} />
      ) : (
        <KanbanBoard
          jobs={jobs}
          onSelectJob={(job) => setSelectedJob(job)}
          onUpdateApproval={handleUpdateApproval}
          onUpdateApplication={handleUpdateApplication}
        />
      )}

      {/* Job Detail Side Drawer */}
      <JobDrawer
        job={selectedJob}
        onClose={() => setSelectedJob(null)}
        onUpdateApproval={handleUpdateApproval}
        onUpdateApplication={handleUpdateApplication}
      />

      {/* Web / WhatsApp Bulk Ingest Modal */}
      {showIngestModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#121215] border border-[#27272a] rounded-[24px] w-full max-w-xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-400" /> AI Bulk Ingestion Engine
              </h3>
              <button onClick={() => setShowIngestModal(false)} className="p-1 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Selector Tabs */}
            <div className="flex bg-[#18181b] p-1 rounded-full border border-[#27272a]">
              <button
                type="button"
                onClick={() => {
                  setIngestMode('whatsapp');
                  setIngestChannel('WhatsApp Hyderabad Jobs');
                }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-full transition flex items-center justify-center gap-1.5 ${
                  ingestMode === 'whatsapp' ? 'bg-white text-black shadow' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>WhatsApp Chat Dump</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIngestMode('single');
                  setIngestChannel('Career Page Link');
                }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-full transition flex items-center justify-center gap-1.5 ${
                  ingestMode === 'single' ? 'bg-white text-black shadow' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Single URL / Job Text</span>
              </button>
            </div>

            <form onSubmit={handleTriggerIngest} className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-semibold text-zinc-400 mb-1.5 uppercase">Source Tag Name</label>
                <input
                  type="text"
                  value={ingestChannel}
                  onChange={(e) => setIngestChannel(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#18181b] border border-[#27272a] rounded-xl text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-semibold text-zinc-400 mb-1.5 uppercase">
                  {ingestMode === 'whatsapp'
                    ? 'Paste WhatsApp Chat Export / Copied Messages Dump'
                    : 'Paste Job URL or Raw Description Text'}
                </label>
                <textarea
                  rows={8}
                  value={ingestInput}
                  onChange={(e) => setIngestInput(e.target.value)}
                  placeholder={
                    ingestMode === 'whatsapp'
                      ? "Paste all copied WhatsApp messages here...\nExample:\n[10:15 AM] Hiring MERN Developer at TechCorp. Salary 10LPA. Apply: techcorp.io/apply\n[10:20 AM] Random chat message...\n[11:00 AM] Infosys hiring React Devs..."
                      : "https://company.com/careers/view/... OR paste single raw JD text"
                  }
                  className="w-full p-4 bg-[#18181b] border border-[#27272a] rounded-xl text-xs text-white placeholder-zinc-500 font-mono leading-relaxed"
                  required
                />
              </div>

              {ingestResultMsg && (
                <div className="p-3 bg-emerald-950/60 border border-emerald-800/60 rounded-xl text-xs text-emerald-400 font-mono text-center">
                  {ingestResultMsg}
                </div>
              )}

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowIngestModal(false)}
                  className="px-5 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-full text-xs font-bold border border-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={ingesting}
                  className="px-6 py-2 bg-gradient-to-r from-white via-zinc-100 to-zinc-300 text-black hover:bg-zinc-200 rounded-full text-xs font-extrabold transition disabled:opacity-50 shadow-md flex items-center gap-1.5"
                >
                  {ingesting ? (
                    <span>AI Analyzing & Splitting...</span>
                  ) : (
                    <span>{ingestMode === 'whatsapp' ? 'Analyze & Extract All Jobs' : 'Start Agent Pipeline'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
