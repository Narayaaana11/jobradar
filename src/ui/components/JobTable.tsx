import React, { useState } from 'react';
import { IJob } from '../../app-core/types';
import { ScoreBadge } from './ScoreBadge';
import { StatusBadge } from './StatusBadge';
import { Building, MapPin, ArrowRight, ChevronLeft, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react';

interface JobTableProps {
  jobs: IJob[];
  onSelectJob: (job: IJob) => void;
}

export function JobTable({ jobs, onSelectJob }: JobTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  if (jobs.length === 0) {
    return (
      <div className="bg-[#121215] border border-[#27272a] rounded-[22px] p-12 text-center shadow-xl">
        <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-3 text-zinc-400">
          <AlertCircle className="w-6 h-6" />
        </div>
        <p className="text-zinc-200 font-bold text-base">No job postings found matching criteria.</p>
        <p className="text-xs text-zinc-500 mt-1 font-mono">Use the &quot;Ingest Postings&quot; button to add WhatsApp chat dumps or job links.</p>
      </div>
    );
  }

  const totalPages = Math.ceil(jobs.length / pageSize) || 1;
  const validPage = Math.min(currentPage, totalPages);
  const startIndex = (validPage - 1) * pageSize;
  const paginatedJobs = jobs.slice(startIndex, startIndex + pageSize);

  return (
    <div className="bg-[#121215] border border-[#27272a] rounded-[22px] overflow-hidden shadow-2xl flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#27272a] bg-[#18181b] text-[11px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
              <th className="py-4 px-6 min-w-[240px]">Role & Target Company</th>
              <th className="py-4 px-6 min-w-[150px]">Location</th>
              <th className="py-4 px-6 min-w-[150px] whitespace-nowrap">Fit & Rubric Rating</th>
              <th className="py-4 px-6 min-w-[140px] whitespace-nowrap">Stage</th>
              <th className="py-4 px-6 min-w-[140px] whitespace-nowrap">Human Approval</th>
              <th className="py-4 px-6 text-right min-w-[120px]">Inspect</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900/80 text-sm">
            {paginatedJobs.map((job) => (
              <tr
                key={job.id}
                onClick={() => onSelectJob(job)}
                className="hover:bg-[#1a1a1e] cursor-pointer transition group"
              >
                {/* Role & Company */}
                <td className="py-5 px-6">
                  <div className="font-extrabold text-white text-base group-hover:text-zinc-200 transition">
                    {job.jobTitle}
                  </div>
                  <div className="text-xs text-zinc-400 flex items-center space-x-1.5 mt-1 font-medium">
                    <Building className="w-3.5 h-3.5 text-zinc-500" />
                    <span>{job.companyName}</span>
                    {job.ctcRange && (
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40 ml-2">
                        {job.ctcRange}
                      </span>
                    )}
                  </div>
                </td>

                {/* Location */}
                <td className="py-5 px-6 text-zinc-300">
                  <div className="flex items-center space-x-1.5 text-xs font-medium text-zinc-400">
                    <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                    <span>{job.location || 'Remote / Pan India'}</span>
                  </div>
                </td>

                {/* Fit Score & 5-tier Rubric */}
                <td className="py-5 px-6 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    <ScoreBadge score={job.matchScore || 0} />
                    <span className="text-xs font-mono font-bold text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-900/40">
                      ⭐ {job.rubricScores?.overallRubricRating || '4.0'}
                    </span>
                  </div>
                </td>

                {/* Stage */}
                <td className="py-5 px-6 whitespace-nowrap">
                  <StatusBadge type="application" status={job.applicationStatus || job.stage} />
                </td>

                {/* Approval */}
                <td className="py-5 px-6 whitespace-nowrap">
                  <StatusBadge type="approval" status={job.approvalStatus} />
                </td>

                {/* Action button */}
                <td className="py-5 px-6 text-right whitespace-nowrap">
                  <span className="inline-flex items-center space-x-1 text-xs font-bold px-3.5 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 group-hover:bg-white group-hover:text-black transition shadow-sm">
                    <span>Inspect</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-[#27272a] bg-[#121215] flex items-center justify-between text-xs text-zinc-400 font-mono">
          <div>
            Showing <span className="text-white font-bold">{startIndex + 1}</span> to{' '}
            <span className="text-white font-bold">{Math.min(startIndex + pageSize, jobs.length)}</span> of{' '}
            <span className="text-white font-bold">{jobs.length}</span> postings
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={validPage <= 1}
              className="p-1.5 rounded-full bg-zinc-900 border border-zinc-800 disabled:opacity-40 hover:bg-zinc-800 text-white transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-bold text-white px-2">
              {validPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={validPage >= totalPages}
              className="p-1.5 rounded-full bg-zinc-900 border border-zinc-800 disabled:opacity-40 hover:bg-zinc-800 text-white transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
