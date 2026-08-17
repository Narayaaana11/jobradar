import React from 'react';

export function ScoreBadge({ score }: { score: number }) {
  let color = 'text-red-400 bg-red-950/50 border-red-800/60';
  if (score >= 80) color = 'text-emerald-400 bg-emerald-950/50 border-emerald-800/60';
  else if (score >= 60) color = 'text-amber-400 bg-amber-950/50 border-amber-800/60';

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border shadow-sm ${color}`}
    >
      🎯 {score}% Match
    </span>
  );
}
