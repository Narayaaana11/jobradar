import React from 'react';
import { IJob, IStats } from '../../app-core/types';
import { BarChart3, TrendingUp, Award, CheckCircle2, Send, Clock, Sparkles } from 'lucide-react';

export function AnalyticsView({ jobs, stats }: { jobs: IJob[]; stats: IStats }) {
  // Skill frequency analysis
  const skillCounts: Record<string, number> = {};
  jobs.forEach((j) => {
    (j.skillsRequired || []).forEach((s) => {
      skillCounts[s] = (skillCounts[s] || 0) + 1;
    });
  });

  const sortedSkills = Object.entries(skillCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const highMatch = jobs.filter((j) => (j.matchScore || 0) >= 85).length;
  const goodMatch = jobs.filter((j) => (j.matchScore || 0) >= 70 && (j.matchScore || 0) < 85).length;
  const borderline = jobs.filter((j) => (j.matchScore || 0) >= 50 && (j.matchScore || 0) < 70).length;
  const lowMatch = jobs.filter((j) => (j.matchScore || 0) < 50).length;

  const funnelSteps = [
    { label: '1. Ingested & Tracked', count: stats.totalJobs, pct: 100, color: 'bg-zinc-700' },
    {
      label: '2. Approved at Human Gate',
      count: stats.approvedJobs,
      pct: stats.totalJobs > 0 ? Math.round((stats.approvedJobs / stats.totalJobs) * 100) : 0,
      color: 'bg-emerald-500',
    },
    {
      label: '3. Applications Submitted',
      count: stats.appliedJobs,
      pct: stats.approvedJobs > 0 ? Math.round((stats.appliedJobs / stats.approvedJobs) * 100) : 0,
      color: 'bg-cyan-500',
    },
    {
      label: '4. Interview Stages',
      count: stats.interviewingJobs,
      pct: stats.appliedJobs > 0 ? Math.round((stats.interviewingJobs / stats.appliedJobs) * 100) : 0,
      color: 'bg-purple-500',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-white" /> Career Funnel & Match Analytics
        </h2>
        <p className="text-sm text-zinc-400 font-medium">
          Detailed metrics on application conversion rates, candidate fit distribution, and target market skill demand.
        </p>
      </div>

      {/* Top Level Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-6 bg-[#121215] border border-[#27272a] rounded-[22px] shadow-lg space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-zinc-400 uppercase">
            <span>Interview Conversion Rate</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-emerald-400">{stats.responseRatePct}%</div>
          <p className="text-xs text-zinc-500 font-mono">
            {stats.interviewingJobs} interviews from {stats.appliedJobs} active applications
          </p>
        </div>

        <div className="p-6 bg-[#121215] border border-[#27272a] rounded-[22px] shadow-lg space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-zinc-400 uppercase">
            <span>High-Fit Postings (≥85%)</span>
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-black text-amber-400">{highMatch}</div>
          <p className="text-xs text-zinc-500 font-mono">
            {stats.totalJobs > 0 ? Math.round((highMatch / stats.totalJobs) * 100) : 0}% of all discovered listings
          </p>
        </div>

        <div className="p-6 bg-[#121215] border border-[#27272a] rounded-[22px] shadow-lg space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-zinc-400 uppercase">
            <span>Candidate Profile Fit Index</span>
            <Sparkles className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-3xl font-black text-white">{stats.avgMatchScore}%</div>
          <p className="text-xs text-zinc-500 font-mono">Optimized for MERN Stack, TS & MCA 2026</p>
        </div>
      </div>

      {/* Funnel Progress */}
      <div className="p-6 bg-[#121215] border border-[#27272a] rounded-[22px] shadow-2xl space-y-6">
        <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
          End-to-End Application Funnel
        </h3>
        <div className="space-y-4">
          {funnelSteps.map((step, idx) => (
            <div key={idx} className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-zinc-300 font-semibold">{step.label}</span>
                <span className="text-white font-bold">
                  {step.count} ({step.pct}%)
                </span>
              </div>
              <div className="w-full h-3 bg-[#18181b] rounded-full overflow-hidden border border-zinc-800">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${step.color}`}
                  style={{ width: `${Math.max(5, step.pct)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Score Distribution & Top Skills */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Score Distribution */}
        <div className="p-6 bg-[#121215] border border-[#27272a] rounded-[22px] shadow-lg space-y-4">
          <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
            Match Score Distribution
          </h3>
          <div className="space-y-3 pt-2">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-emerald-400 font-semibold">Tier 1: High Match (≥85%)</span>
              <span className="text-white font-bold">{highMatch} roles</span>
            </div>
            <div className="w-full h-2.5 bg-[#18181b] rounded-full overflow-hidden border border-zinc-800">
              <div
                className="h-full bg-emerald-500 rounded-full"
                style={{ width: `${jobs.length > 0 ? (highMatch / jobs.length) * 100 : 0}%` }}
              />
            </div>

            <div className="flex justify-between items-center text-xs font-mono pt-1">
              <span className="text-cyan-400 font-semibold">Tier 2: Good Fit (70–84%)</span>
              <span className="text-white font-bold">{goodMatch} roles</span>
            </div>
            <div className="w-full h-2.5 bg-[#18181b] rounded-full overflow-hidden border border-zinc-800">
              <div
                className="h-full bg-cyan-500 rounded-full"
                style={{ width: `${jobs.length > 0 ? (goodMatch / jobs.length) * 100 : 0}%` }}
              />
            </div>

            <div className="flex justify-between items-center text-xs font-mono pt-1">
              <span className="text-amber-400 font-semibold">Tier 3: Borderline (50–69%)</span>
              <span className="text-white font-bold">{borderline} roles</span>
            </div>
            <div className="w-full h-2.5 bg-[#18181b] rounded-full overflow-hidden border border-zinc-800">
              <div
                className="h-full bg-amber-500 rounded-full"
                style={{ width: `${jobs.length > 0 ? (borderline / jobs.length) * 100 : 0}%` }}
              />
            </div>

            <div className="flex justify-between items-center text-xs font-mono pt-1">
              <span className="text-zinc-500 font-semibold">Tier 4/5: Non-Matching (&lt;50%)</span>
              <span className="text-white font-bold">{lowMatch} roles</span>
            </div>
            <div className="w-full h-2.5 bg-[#18181b] rounded-full overflow-hidden border border-zinc-800">
              <div
                className="h-full bg-zinc-600 rounded-full"
                style={{ width: `${jobs.length > 0 ? (lowMatch / jobs.length) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* In-Demand Skills */}
        <div className="p-6 bg-[#121215] border border-[#27272a] rounded-[22px] shadow-lg space-y-4">
          <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
            Most In-Demand Skills in Your Feed
          </h3>
          <div className="flex flex-wrap gap-2 pt-2">
            {sortedSkills.map(([skill, count], i) => (
              <div
                key={i}
                className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-[#18181b] border border-[#27272a] text-xs font-mono"
              >
                <span className="text-white font-bold">{skill}</span>
                <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/60 font-semibold">
                  {count} {count === 1 ? 'job' : 'jobs'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
