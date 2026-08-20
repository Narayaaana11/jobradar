import React, { useState } from 'react';
import { IJob } from '../../app-core/types';
import { ScoreBadge } from './ScoreBadge';
import { StatusBadge } from './StatusBadge';
import { Building, MapPin, ArrowRight, ChevronLeft, ChevronRight, CheckCircle2, AlertCircle, Trash2, CheckSquare, Square, ExternalLink } from 'lucide-react';

interface JobTableProps {
  jobs: IJob[];
  onSelectJob: (job: IJob) => void;
  onDeleteJob?: (jobId: string) => void;
  onDeleteMultipleJobs?: (jobIds: string[]) => void;
}

export function JobTable({ jobs, onSelectJob, onDeleteJob, onDeleteMultipleJobs }: JobTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set());

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

  const toggleSelectJob = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedJobIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAllPage = (e: React.MouseEvent) => {
    e.stopPropagation();
    const allPageIds = paginatedJobs.map((j) => j.id);
    const allSelected = allPageIds.every((id) => selectedJobIds.has(id));

    setSelectedJobIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        allPageIds.forEach((id) => next.delete(id));
      } else {
        allPageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const handleDeleteSingle = (id: string, jobTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete "${jobTitle}" from your job feed?`)) {
      if (onDeleteJob) {
        onDeleteJob(id);
      }
      setSelectedJobIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleDeleteSelected = () => {
    const ids = Array.from(selectedJobIds);
    if (ids.length === 0) return;
    if (confirm(`Are you sure you want to delete ${ids.length} selected job posting(s)?`)) {
      if (onDeleteMultipleJobs) {
        onDeleteMultipleJobs(ids);
      } else if (onDeleteJob) {
        ids.forEach((id) => onDeleteJob(id));
      }
      setSelectedJobIds(new Set());
    }
  };

  const allOnPageSelected = paginatedJobs.length > 0 && paginatedJobs.every((j) => selectedJobIds.has(j.id));

  return (
    <div className="bg-[#121215] border border-[#27272a] rounded-[22px] overflow-hidden shadow-2xl flex flex-col space-y-0">
      {/* Batch Actions Bar (when 1 or more jobs selected) */}
      {selectedJobIds.size > 0 && (
        <div className="bg-red-950/40 border-b border-red-900/60 px-6 py-3 flex items-center justify-between animate-in fade-in">
          <div className="flex items-center space-x-2 text-xs font-mono text-red-300 font-bold">
            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
            <span>{selectedJobIds.size} job(s) selected</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setSelectedJobIds(new Set())}
              className="px-3 py-1 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-bold transition border border-zinc-800"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteSelected}
              className="flex items-center space-x-1.5 px-4 py-1 rounded-full bg-red-600 hover:bg-red-500 text-white text-xs font-black transition shadow-lg"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected ({selectedJobIds.size})</span>
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#27272a] bg-[#18181b] text-[11px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
              <th className="py-4 px-4 w-10 text-center">
                <button
                  type="button"
                  onClick={toggleSelectAllPage}
                  className="text-zinc-500 hover:text-white transition"
                  title="Select all on this page"
                >
                  {allOnPageSelected ? (
                    <CheckSquare className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Square className="w-4 h-4 text-zinc-600" />
                  )}
                </button>
              </th>
              <th className="py-4 px-4 min-w-[240px]">Role & Target Company</th>
              <th className="py-4 px-4 min-w-[140px]">Location</th>
              <th className="py-4 px-4 min-w-[140px] whitespace-nowrap">Fit & Rubric Rating</th>
              <th className="py-4 px-4 min-w-[130px] whitespace-nowrap">Stage</th>
              <th className="py-4 px-4 min-w-[130px] whitespace-nowrap">Human Approval</th>
              <th className="py-4 px-6 text-right min-w-[160px]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900/80 text-sm">
            {paginatedJobs.map((job) => {
              const isSelected = selectedJobIds.has(job.id);

              return (
                <tr
                  key={job.id}
                  onClick={() => onSelectJob(job)}
                  className={`hover:bg-[#1a1a1e] cursor-pointer transition group ${
                    isSelected ? 'bg-red-950/10' : ''
                  }`}
                >
                  {/* Selection Checkbox */}
                  <td className="py-5 px-4 text-center" onClick={(e) => toggleSelectJob(job.id, e)}>
                    <button type="button" className="text-zinc-500 hover:text-white transition">
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Square className="w-4 h-4 text-zinc-700 group-hover:text-zinc-400" />
                      )}
                    </button>
                  </td>

                  {/* Role & Company */}
                  <td className="py-5 px-4">
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
                  <td className="py-5 px-4 text-zinc-300">
                    <div className="flex items-center space-x-1.5 text-xs font-medium text-zinc-400">
                      <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                      <span>{job.location || 'Remote / Pan India'}</span>
                    </div>
                  </td>

                  {/* Fit Score & 5-tier Rubric & Letter Grade */}
                  <td className="py-5 px-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-black font-mono border ${
                        (job.rubricScores?.letterGrade || (job.matchScore >= 88 ? 'A' : job.matchScore >= 74 ? 'B' : job.matchScore >= 60 ? 'C' : 'D')) === 'A' ? 'bg-emerald-950 text-emerald-400 border-emerald-700' :
                        (job.rubricScores?.letterGrade || (job.matchScore >= 88 ? 'A' : job.matchScore >= 74 ? 'B' : job.matchScore >= 60 ? 'C' : 'D')) === 'B' ? 'bg-blue-950 text-blue-400 border-blue-700' :
                        (job.rubricScores?.letterGrade || (job.matchScore >= 88 ? 'A' : job.matchScore >= 74 ? 'B' : job.matchScore >= 60 ? 'C' : 'D')) === 'C' ? 'bg-amber-950 text-amber-400 border-amber-700' :
                        'bg-red-950 text-red-400 border-red-700'
                      }`}>
                        {job.rubricScores?.letterGrade || (job.matchScore >= 88 ? 'A' : job.matchScore >= 74 ? 'B' : job.matchScore >= 60 ? 'C' : 'D')}
                      </span>
                      <ScoreBadge score={job.matchScore || 0} status={job.generationStatus?.scoring} />
                      <span className="text-xs font-mono font-bold text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-900/40">
                        ⭐ {job.rubricScores?.overallRubricRating || '4.0'}
                      </span>
                    </div>
                  </td>

                  {/* Stage */}
                  <td className="py-5 px-4 whitespace-nowrap">
                    <StatusBadge type="application" status={job.applicationStatus || job.stage} />
                  </td>

                  {/* Approval */}
                  <td className="py-5 px-4 whitespace-nowrap">
                    <StatusBadge type="approval" status={job.approvalStatus} />
                  </td>

                  {/* Action Buttons: Inspect + Delete */}
                  <td className="py-5 px-6 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end space-x-2">
                      {job.applicationLink && (
                        <a
                          href={job.applicationLink}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-1.5 rounded-full bg-emerald-950/70 hover:bg-emerald-500 text-emerald-400 hover:text-black border border-emerald-800/70 transition shadow-sm"
                          title={`Open Direct Application Link: ${job.applicationLink}`}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}

                      <button
                        type="button"
                        onClick={(e) => handleDeleteSingle(job.id, job.jobTitle, e)}
                        className="p-1.5 rounded-full bg-zinc-900/80 hover:bg-red-950 text-zinc-500 hover:text-red-400 border border-zinc-800 hover:border-red-800/60 transition shadow-sm"
                        title="Delete this job posting"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <span className="inline-flex items-center space-x-1 text-xs font-bold px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 group-hover:bg-white group-hover:text-black transition shadow-sm">
                        <span>Inspect</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
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

