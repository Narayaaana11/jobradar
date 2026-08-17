import React from 'react';
import { IStats } from '../../app-core/types';
import { Radar, Clock, CheckCircle2, Send, Award, Sparkles } from 'lucide-react';

export function StatsBar({ stats }: { stats: IStats }) {
  const cards = [
    {
      label: 'Total Tracked',
      value: stats.totalJobs,
      icon: Radar,
      color: 'text-zinc-200',
      bg: 'bg-zinc-900/60 border-zinc-800',
    },
    {
      label: 'Pending Gate',
      value: stats.pendingApproval,
      icon: Clock,
      color: 'text-amber-400',
      bg: 'bg-amber-950/20 border-amber-800/40',
    },
    {
      label: 'Approved Jobs',
      value: stats.approvedJobs,
      icon: CheckCircle2,
      color: 'text-emerald-400',
      bg: 'bg-emerald-950/20 border-emerald-800/40',
    },
    {
      label: 'Applications Active',
      value: stats.appliedJobs,
      icon: Send,
      color: 'text-cyan-400',
      bg: 'bg-cyan-950/20 border-cyan-800/40',
    },
    {
      label: 'Interviewing',
      value: stats.interviewingJobs,
      icon: Award,
      color: 'text-purple-400',
      bg: 'bg-purple-950/20 border-purple-800/40',
    },
    {
      label: 'Avg Match Fit',
      value: `${stats.avgMatchScore}%`,
      icon: Sparkles,
      color: 'text-white',
      bg: 'bg-zinc-900/60 border-zinc-800',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <div
            key={i}
            className={`p-4 rounded-[18px] border ${card.bg} shadow-lg transition hover:border-zinc-700 flex flex-col justify-between`}
          >
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-[11px] font-mono font-medium uppercase tracking-wider">{card.label}</span>
              <Icon className={`w-4 h-4 ${card.color}`} />
            </div>
            <div className={`text-2xl font-black tracking-tight ${card.color}`}>{card.value}</div>
          </div>
        );
      })}
    </div>
  );
}
