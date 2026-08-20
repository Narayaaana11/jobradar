import React from 'react';
import { IFieldGenerationStatus } from '../../app-core/types';
import { Sparkles, Cpu, AlertCircle } from 'lucide-react';

export function ScoreBadge({
  score,
  status,
}: {
  score: number;
  status?: IFieldGenerationStatus;
}) {
  let color = 'text-red-400 bg-red-950/50 border-red-800/60';
  if (score >= 80) color = 'text-emerald-400 bg-emerald-950/50 border-emerald-800/60';
  else if (score >= 60) color = 'text-amber-400 bg-amber-950/50 border-amber-800/60';

  const isAi = status?.status === 'ai_generated';
  const isFailed = status?.status === 'failed';

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border shadow-sm ${color}`}
      title={
        isAi
          ? `AI-Scored with ${status?.modelUsed || 'LLM'}`
          : isFailed
          ? `AI Scoring failed: ${status?.error || 'Fallback used'}`
          : 'Heuristic regex-scored'
      }
    >
      <span>🎯 {score}%</span>
      {isAi ? (
        <span className="text-[9px] font-sans font-extrabold uppercase px-1 py-0.2 bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/40 flex items-center gap-0.5">
          <Sparkles className="w-2.5 h-2.5" /> AI
        </span>
      ) : isFailed ? (
        <span className="text-[9px] font-sans font-semibold uppercase px-1 py-0.2 bg-red-900/40 text-red-300 rounded border border-red-800/60 flex items-center gap-0.5">
          <AlertCircle className="w-2.5 h-2.5 text-red-400" /> heuristic
        </span>
      ) : (
        <span className="text-[9px] font-sans font-semibold uppercase px-1 py-0.2 bg-zinc-800/80 text-zinc-400 rounded border border-zinc-700/60 flex items-center gap-0.5">
          <Cpu className="w-2.5 h-2.5" /> heuristic
        </span>
      )}
    </span>
  );
}
