import React, { useState } from 'react';
import { IJob } from '../../app-core/types';
import { ScoreBadge } from './ScoreBadge';
import { Building, MapPin, Check, Send, ArrowRight, Sparkles, ExternalLink, Trash2 } from 'lucide-react';

interface KanbanBoardProps {
  jobs: IJob[];
  onSelectJob: (job: IJob) => void;
  onUpdateApproval: (jobId: string, status: 'pending' | 'approved' | 'rejected') => void;
  onUpdateApplication: (jobId: string, status: 'not_applied' | 'applied' | 'interview' | 'offer' | 'rejected') => void;
  onDeleteJob?: (jobId: string) => void;
}

export function KanbanBoard({ jobs, onSelectJob, onUpdateApproval, onUpdateApplication, onDeleteJob }: KanbanBoardProps) {
  const [draggedJobId, setDraggedJobId] = useState<string | null>(null);

  const columns = [
    {
      id: 'pending',
      title: 'Pending Gate',
      color: 'border-amber-800/40 bg-amber-950/20 text-amber-400',
      badge: 'bg-amber-950 text-amber-300 border-amber-800',
      filter: (j: IJob) => j.approvalStatus === 'pending',
    },
    {
      id: 'approved',
      title: 'Approved — Ready',
      color: 'border-emerald-800/40 bg-emerald-950/20 text-emerald-400',
      badge: 'bg-emerald-950 text-emerald-300 border-emerald-800',
      filter: (j: IJob) => j.approvalStatus === 'approved' && j.applicationStatus === 'not_applied',
    },
    {
      id: 'applied',
      title: 'Applied',
      color: 'border-cyan-800/40 bg-cyan-950/20 text-cyan-300',
      badge: 'bg-cyan-950 text-cyan-300 border-cyan-800',
      filter: (j: IJob) => j.applicationStatus === 'applied',
    },
    {
      id: 'interview',
      title: 'Interviewing',
      color: 'border-purple-800/40 bg-purple-950/20 text-purple-300',
      badge: 'bg-purple-950 text-purple-300 border-purple-800',
      filter: (j: IJob) => j.applicationStatus === 'interview' || j.applicationStatus === 'offer',
    },
    {
      id: 'rejected',
      title: 'Not Selected',
      color: 'border-zinc-800 bg-zinc-950 text-zinc-500',
      badge: 'bg-zinc-900 text-zinc-400 border-zinc-800',
      filter: (j: IJob) => j.approvalStatus === 'rejected' || j.applicationStatus === 'rejected',
    },
  ];

  const handleMoveStage = (jobId: string, targetColId: string) => {
    if (targetColId === 'pending') {
      onUpdateApproval(jobId, 'pending');
      onUpdateApplication(jobId, 'not_applied');
    } else if (targetColId === 'approved') {
      onUpdateApproval(jobId, 'approved');
      onUpdateApplication(jobId, 'not_applied');
    } else if (targetColId === 'applied') {
      onUpdateApproval(jobId, 'approved');
      onUpdateApplication(jobId, 'applied');
    } else if (targetColId === 'interview') {
      onUpdateApproval(jobId, 'approved');
      onUpdateApplication(jobId, 'interview');
    } else if (targetColId === 'rejected') {
      onUpdateApproval(jobId, 'rejected');
      onUpdateApplication(jobId, 'rejected');
    }
  };

  const handleDrop = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    const jobId = e.dataTransfer.getData('jobId') || draggedJobId;
    if (jobId) {
      handleMoveStage(jobId, colId);
    }
    setDraggedJobId(null);
  };

  const handleDelete = (jobId: string, jobTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Delete "${jobTitle}" from job radar?`)) {
      if (onDeleteJob) {
        onDeleteJob(jobId);
      }
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 overflow-x-auto pb-4">
      {columns.map((col) => {
        const colJobs = jobs.filter(col.filter);

        return (
          <div
            key={col.id}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, col.id)}
            className="bg-[#121215] border border-[#27272a] hover:border-zinc-700 transition rounded-[22px] p-4 flex flex-col h-[740px] shadow-2xl"
          >
            {/* Column Header */}
            <div className={`p-3 rounded-full border flex items-center justify-between mb-4 ${col.color}`}>
              <h3 className="text-[11px] font-mono font-bold uppercase tracking-wider px-2">{col.title}</h3>
              <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-black/70 border border-white/10">
                {colJobs.length}
              </span>
            </div>

            {/* Cards List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {colJobs.length === 0 ? (
                <div className="h-40 border border-dashed border-zinc-800 rounded-2xl flex items-center justify-center text-xs font-mono text-zinc-600">
                  Drop card here
                </div>
              ) : (
                colJobs.map((job) => (
                  <div
                    key={job.id}
                    draggable
                    onDragStart={(e) => {
                      setDraggedJobId(job.id);
                      e.dataTransfer.setData('jobId', job.id);
                    }}
                    onClick={() => onSelectJob(job)}
                    className="p-4 bg-[#18181b] border border-[#27272a] hover:border-zinc-500 rounded-2xl cursor-grab active:cursor-grabbing transition shadow-lg space-y-3 group"
                  >
                    {/* Header: Source tag + Score badge + Letter Grade + Delete */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 truncate max-w-[150px]">
                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-black font-mono border ${
                          (job.rubricScores?.letterGrade || (job.matchScore >= 88 ? 'A' : job.matchScore >= 74 ? 'B' : job.matchScore >= 60 ? 'C' : 'D')) === 'A' ? 'bg-emerald-950 text-emerald-400 border-emerald-700' :
                          (job.rubricScores?.letterGrade || (job.matchScore >= 88 ? 'A' : job.matchScore >= 74 ? 'B' : job.matchScore >= 60 ? 'C' : 'D')) === 'B' ? 'bg-blue-950 text-blue-400 border-blue-700' :
                          (job.rubricScores?.letterGrade || (job.matchScore >= 88 ? 'A' : job.matchScore >= 74 ? 'B' : job.matchScore >= 60 ? 'C' : 'D')) === 'C' ? 'bg-amber-950 text-amber-400 border-amber-700' :
                          'bg-red-950 text-red-400 border-red-700'
                        }`}>
                          {job.rubricScores?.letterGrade || (job.matchScore >= 88 ? 'A' : job.matchScore >= 74 ? 'B' : job.matchScore >= 60 ? 'C' : 'D')}
                        </span>
                        <span className="text-[10px] font-mono text-zinc-400 px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 truncate">
                          {job.companyName}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <ScoreBadge score={job.matchScore || 0} />
                        {job.applicationLink && (
                          <a
                            href={job.applicationLink}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-1 text-emerald-400 hover:text-emerald-300 rounded transition opacity-0 group-hover:opacity-100"
                            title={`Open Direct Apply Link: ${job.applicationLink}`}
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={(e) => handleDelete(job.id, job.jobTitle, e)}
                          className="p-1 text-zinc-600 hover:text-red-400 rounded transition opacity-0 group-hover:opacity-100"
                          title="Delete job posting"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Job Title */}
                    <div>
                      <h4 className="font-extrabold text-sm text-white group-hover:text-zinc-200 transition line-clamp-2">
                        {job.jobTitle}
                      </h4>
                      <p className="text-xs text-zinc-400 flex items-center gap-1.5 mt-1 font-medium">
                        <MapPin className="w-3 h-3 text-zinc-500" />
                        <span className="truncate">{job.location || 'Remote'}</span>
                      </p>
                    </div>

                    {/* JobRadar Rubric Score & Skills */}
                    <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80 text-[11px] font-mono">
                      <span className="text-amber-400 font-bold">⭐ {job.rubricScores?.overallRubricRating || '4.0'}</span>
                      <span className="text-emerald-400 font-bold">{job.atsAnalysis?.keywordDensityScore || 85}% ATS</span>
                    </div>

                    {/* Quick Stage Progression Buttons */}
                    <div className="flex items-center justify-between pt-1" onClick={(e) => e.stopPropagation()}>
                      {job.approvalStatus === 'pending' && (
                        <button
                          onClick={() => onUpdateApproval(job.id, 'approved')}
                          className="flex items-center space-x-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white transition shadow"
                        >
                          <Check className="w-3 h-3" />
                          <span>Approve</span>
                        </button>
                      )}

                      {job.approvalStatus === 'approved' && job.applicationStatus === 'not_applied' && (
                        <button
                          onClick={() => onUpdateApplication(job.id, 'applied')}
                          className="flex items-center space-x-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-cyan-600 hover:bg-cyan-500 text-white transition shadow"
                        >
                          <Send className="w-3 h-3" />
                          <span>Mark Applied</span>
                        </button>
                      )}

                      {job.applicationStatus === 'applied' && (
                        <button
                          onClick={() => onUpdateApplication(job.id, 'interview')}
                          className="flex items-center space-x-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-purple-600 hover:bg-purple-500 text-white transition shadow"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Interviewing</span>
                        </button>
                      )}

                      <button
                        onClick={() => onSelectJob(job)}
                        className="text-[10px] font-mono text-zinc-400 hover:text-white flex items-center gap-1 ml-auto"
                      >
                        <span>Details</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
