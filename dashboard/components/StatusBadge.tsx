import React from 'react';

export function StatusBadge({ type, status }: { type: 'approval' | 'application'; status: string }) {
  if (type === 'approval') {
    switch (status) {
      case 'approved':
        return (
          <span className="whitespace-nowrap inline-block text-xs font-semibold px-3 py-1 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 font-mono">
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="whitespace-nowrap inline-block text-xs font-semibold px-3 py-1 rounded-full bg-red-950/60 text-red-400 border border-red-800/60 font-mono">
            Rejected
          </span>
        );
      default:
        return (
          <span className="whitespace-nowrap inline-block text-xs font-semibold px-3 py-1 rounded-full bg-amber-950/60 text-amber-400 border border-amber-800/60 font-mono">
            Pending Gate
          </span>
        );
    }
  }

  // Application Status
  switch (status) {
    case 'applied':
      return (
        <span className="whitespace-nowrap inline-block text-xs font-semibold px-3 py-1 rounded-full bg-zinc-800 text-zinc-100 border border-zinc-700 font-mono">
          Applied
        </span>
      );
    case 'referral_pending':
      return (
        <span className="whitespace-nowrap inline-block text-xs font-semibold px-3 py-1 rounded-full bg-purple-950/60 text-purple-300 border border-purple-800/60 font-mono">
          Referral Drafted
        </span>
      );
    case 'interview':
      return (
        <span className="whitespace-nowrap inline-block text-xs font-semibold px-3 py-1 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 font-mono">
          Interviewing
        </span>
      );
    case 'rejected':
      return (
        <span className="whitespace-nowrap inline-block text-xs font-semibold px-3 py-1 rounded-full bg-zinc-900 text-zinc-500 border border-zinc-800 font-mono">
          Not Selected
        </span>
      );
    default:
      return (
        <span className="whitespace-nowrap inline-block text-xs font-semibold px-3 py-1 rounded-full bg-zinc-900 text-zinc-400 border border-zinc-800 font-mono">
          Not Applied
        </span>
      );
  }
}
