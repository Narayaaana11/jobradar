import React from 'react';

interface StatusBadgeProps {
  type: 'approval' | 'application';
  status: string;
}

export function StatusBadge({ type, status }: StatusBadgeProps) {
  if (type === 'approval') {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-800/60">
            ✓ Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-red-950/60 text-red-300 border border-red-800/60">
            ✕ Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-950/60 text-amber-300 border border-amber-800/60">
            ⏳ Pending Gate
          </span>
        );
    }
  }

  // Application lifecycle status
  switch (status) {
    case 'applied':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-blue-950/60 text-blue-300 border border-blue-800/60">
          🚀 Applied
        </span>
      );
    case 'interview':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-purple-950/60 text-purple-300 border border-purple-800/60">
          🎯 Interviewing
        </span>
      );
    case 'offer':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-950 text-emerald-200 border border-emerald-600">
          🎉 Offer Received
        </span>
      );
    case 'rejected':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-zinc-900 text-zinc-400 border border-zinc-800">
          Not Selected
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-zinc-900 text-zinc-400 border border-zinc-800">
          Not Applied
        </span>
      );
  }
}
