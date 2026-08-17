'use client';
import React, { useState } from 'react';
import { ScoreBadge } from './ScoreBadge';
import { StatusBadge } from './StatusBadge';
import { Building, MapPin, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';

interface JobTableProps {
  jobs: any[];
  onSelectJob: (job: any) => void;
}

export function JobTable({ jobs, onSelectJob }: JobTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  if (jobs.length === 0) {
    return (
      <div className="bg-[#121215] border border-[#27272a] rounded-[20px] p-12 text-center shadow-xl">
        <p className="text-zinc-300 font-semibold text-base">No job postings found.</p>
        <p className="text-xs text-zinc-500 mt-1 font-mono">Use the &quot;Ingest WhatsApp Chat Dump&quot; button to process job postings.</p>
      </div>
    );
  }

  const totalJobs = jobs.length;
  const totalPages = Math.ceil(totalJobs / pageSize) || 1;
  const validPage = Math.min(currentPage, totalPages);
  const startIndex = (validPage - 1) * pageSize;
  const paginatedJobs = jobs.slice(startIndex, startIndex + pageSize);

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage((p) => p - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage((p) => p + 1);
  };

  return (
    <div className="bg-[#121215] border border-[#27272a] rounded-[20px] overflow-hidden shadow-2xl flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#27272a] bg-[#18181b] text-[11px] font-mono font-semibold text-zinc-400 uppercase tracking-wider">
              <th className="py-4 px-6 min-w-[220px]">Role & Target Company</th>
              <th className="py-4 px-6 min-w-[140px]">Location</th>
              <th className="py-4 px-6 whitespace-nowrap min-w-[140px]">Fit & Rubric</th>
              <th className="py-4 px-6 whitespace-nowrap min-w-[150px]">Lifecycle Stage</th>
              <th className="py-4 px-6 whitespace-nowrap min-w-[150px]">Human Gate</th>
              <th className="py-4 px-6 text-right min-w-[130px]">Review Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900 text-sm">
            {paginatedJobs.map((job) => (
              <tr
                key={job._id || job.id}
                onClick={() => onSelectJob(job)}
                className="hover:bg-[#1a1a1e] cursor-pointer transition group"
              >
                <td className="py-5 px-6">
                  <div className="font-bold text-white text-base group-hover:text-zinc-200 transition">{job.jobTitle}</div>
                  <div className="text-xs text-zinc-400 flex items-center space-x-1.5 mt-1 font-medium">
                    <Building className="w-3.5 h-3.5 text-zinc-500" />
                    <span>{job.companyName}</span>
                  </div>
                </td>

                <td className="py-5 px-6 text-zinc-300">
                  <div className="flex items-center space-x-1.5 text-xs font-medium text-zinc-400">
                    <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                    <span>{job.location || 'Remote'}</span>
                  </div>
                </td>

                <td className="py-5 px-6 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    <ScoreBadge score={job.matchScore || 0} />
                    <span className="text-xs font-mono font-bold text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-900/40">
                      ⭐ {job.rubricScores?.overallRubricRating || '4.0'}
                    </span>
                  </div>
                </td>

                <td className="py-5 px-6 whitespace-nowrap">
                  <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-zinc-900 text-cyan-400 border border-cyan-900/50 uppercase tracking-wider font-semibold">
                    {job.stage || 'pending_approval'}
                  </span>
                </td>

                <td className="py-5 px-6 whitespace-nowrap">
                  <StatusBadge type="approval" status={job.approvalStatus} />
                </td>

                <td className="py-5 px-6 text-right whitespace-nowrap">
                  <span className="inline-flex items-center space-x-1 text-xs font-semibold px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 group-hover:bg-white group-hover:text-black transition">
                    <span>Inspect</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer Controls */}
      <div className="border-t border-[#27272a] bg-[#18181b] px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-zinc-400">
        <div className="flex items-center space-x-4">
          <span>
            Showing <strong className="text-white">{startIndex + 1}</strong> to{' '}
            <strong className="text-white">{Math.min(startIndex + pageSize, totalJobs)}</strong> of{' '}
            <strong className="text-white">{totalJobs}</strong> jobs
          </span>

          <div className="flex items-center space-x-2">
            <span>Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-black border border-zinc-800 text-white rounded-md px-2 py-1 focus:outline-none focus:border-zinc-500 text-xs"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <span className="text-zinc-500">
            Page <strong className="text-white">{validPage}</strong> of <strong className="text-white">{totalPages}</strong>
          </span>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={handlePrevPage}
              disabled={validPage <= 1}
              className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1 transition"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Prev</span>
            </button>
            <button
              onClick={handleNextPage}
              disabled={validPage >= totalPages}
              className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1 transition"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
