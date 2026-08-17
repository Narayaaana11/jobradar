'use client';
import React from 'react';
import { Briefcase, CheckCircle2, Clock, Send } from 'lucide-react';

interface StatsProps {
  stats: {
    totalJobs: number;
    pendingApproval: number;
    approvedJobs: number;
    appliedJobs: number;
    unprocessedQueue: number;
    avgMatchScore: number;
  };
}

export function StatsBar({ stats }: StatsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      <div className="bg-[#121215] border border-[#27272a] hover:border-zinc-700 rounded-[20px] p-6 flex items-center justify-between transition shadow-lg">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">Total Tracked Jobs</p>
          <h3 className="text-3xl font-extrabold text-white tracking-tight mt-1">{stats.totalJobs}</h3>
        </div>
        <div className="p-3 bg-zinc-900 border border-zinc-800 text-white rounded-2xl">
          <Briefcase className="w-5 h-5" />
        </div>
      </div>

      <div className="bg-[#121215] border border-[#27272a] hover:border-zinc-700 rounded-[20px] p-6 flex items-center justify-between transition shadow-lg">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-wider text-amber-400/90 font-semibold">Pending Gate Review</p>
          <h3 className="text-3xl font-extrabold text-amber-400 tracking-tight mt-1">{stats.pendingApproval}</h3>
        </div>
        <div className="p-3 bg-amber-950/40 border border-amber-800/40 text-amber-400 rounded-2xl">
          <Clock className="w-5 h-5" />
        </div>
      </div>

      <div className="bg-[#121215] border border-[#27272a] hover:border-zinc-700 rounded-[20px] p-6 flex items-center justify-between transition shadow-lg">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-wider text-emerald-400/90 font-semibold">Approved Jobs</p>
          <h3 className="text-3xl font-extrabold text-emerald-400 tracking-tight mt-1">{stats.approvedJobs}</h3>
        </div>
        <div className="p-3 bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 rounded-2xl">
          <CheckCircle2 className="w-5 h-5" />
        </div>
      </div>

      <div className="bg-[#121215] border border-[#27272a] hover:border-zinc-700 rounded-[20px] p-6 flex items-center justify-between transition shadow-lg">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-wider text-zinc-300 font-semibold">Applied Postings</p>
          <h3 className="text-3xl font-extrabold text-white tracking-tight mt-1">{stats.appliedJobs}</h3>
        </div>
        <div className="p-3 bg-zinc-900 border border-zinc-800 text-white rounded-2xl">
          <Send className="w-5 h-5" />
        </div>
      </div>

      <div className="bg-[#121215] border border-[#27272a] hover:border-zinc-700 rounded-[20px] p-6 flex items-center justify-between transition shadow-lg col-span-2 lg:col-span-1">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-wider text-teal-400/90 font-semibold">Avg Match Score</p>
          <h3 className="text-3xl font-extrabold text-teal-400 tracking-tight mt-1">{stats.avgMatchScore || 74}%</h3>
        </div>
        <div className="p-3 bg-teal-950/40 border border-teal-800/40 text-teal-400 rounded-2xl font-extrabold text-xs">
          FIT
        </div>
      </div>
    </div>
  );
}
