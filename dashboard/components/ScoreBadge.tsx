import React from 'react';

export function ScoreBadge({ score }: { score: number }) {
  let badgeStyle = 'bg-zinc-900 text-zinc-400 border-zinc-800';
  let isHighMatch = false;

  if (score >= 80) {
    badgeStyle = 'bg-gradient-to-r from-amber-500/20 to-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-emerald-500/20';
    isHighMatch = true;
  } else if (score >= 75) {
    badgeStyle = 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60';
  } else if (score >= 50) {
    badgeStyle = 'bg-amber-950/60 text-amber-300 border-amber-800/60';
  } else if (score > 0) {
    badgeStyle = 'bg-red-950/60 text-red-300 border-red-800/60';
  }

  return (
    <span className={`whitespace-nowrap inline-flex items-center gap-1.5 text-xs font-semibold font-mono px-3 py-1 rounded-full border shadow-sm ${badgeStyle}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
      {isHighMatch && <span>🔥</span>}
      {score > 0 ? `${score}% Match` : 'Unscored'}
    </span>
  );
}
