'use client';
import React, { useState } from 'react';
import { ScoreBadge } from './ScoreBadge';
import { Building, MapPin, Check, Send, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';

interface KanbanBoardProps {
  jobs: any[];
  onSelectJob: (job: any) => void;
  onUpdateApproval: (jobId: string, status: string) => void;
  onUpdateApplication: (jobId: string, status: string) => void;
}

export function KanbanBoard({ jobs, onSelectJob, onUpdateApproval, onUpdateApplication }: KanbanBoardProps) {
  const [draggedJobId, setDraggedJobId] = useState<string | null>(null);

  const columns = [
    {
      id: 'pending',
      title: 'Pending Gate',
      color: 'border-amber-800/40 bg-amber-950/20 text-amber-400',
      filter: (j: any) => j.approvalStatus === 'pending',
    },
    {
      id: 'approved',
      title: 'Approved — Ready',
      color: 'border-emerald-800/40 bg-emerald-950/20 text-emerald-400',
      filter: (j: any) => j.approvalStatus === 'approved' && j.applicationStatus !== 'applied' && j.applicationStatus !== 'interview' && j.applicationStatus !== 'rejected',
    },
    {
      id: 'applied',
      title: 'Applied',
      color: 'border-zinc-700 bg-zinc-900/60 text-zinc-100',
      filter: (j: any) => j.applicationStatus === 'applied',
    },
    {
      id: 'interview',
      title: 'Interviewing',
      color: 'border-purple-800/40 bg-purple-950/20 text-purple-300',
      filter: (j: any) => j.applicationStatus === 'interview',
    },
    {
      id: 'rejected',
      title: 'Not Selected',
      color: 'border-zinc-800 bg-zinc-950 text-zinc-500',
      filter: (j: any) => j.approvalStatus === 'rejected' || j.applicationStatus === 'rejected',
    },
  ];

  const handleMoveStage = (job: any, targetColId: string) => {
    const jobId = job._id || job.id;
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
    if (!jobId) return;

    const job = jobs.find((j) => (j._id || j.id) === jobId);
    if (job) {
      handleMoveStage(job, colId);
    }
    setDraggedJobId(null);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 overflow-x-auto pb-4">
      {columns.map((col, colIdx) => {
        const colJobs = jobs.filter(col.filter);

        return (
          <div
            key={col.id}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, col.id)}
            className="bg-[#121215] border border-[#27272a] hover:border-zinc-700 transition rounded-[20px] p-4 flex flex-col h-[740px] shadow-2xl"
          >
            {/* Column Header */}
            <div className={`p-3 rounded-full border flex items-center justify-between mb-4 ${col.color}`}>
              <h3 className="text-[11px] font-mono font-bold uppercase tracking-wider px-1">{col.title}</h3>
              <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-black/60">{colJobs.length}</span>
            </div>

            {/* Cards List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {colJobs.length === 0 ? (
                <div className="text-center py-10 text-xs text-zinc-500 font-mono italic">
                  Drag jobs here or use arrows to move
                </div>
              ) : (
                colJobs.map((job) => {
                  const jobId = job._id || job.id;
                  return (
                    <div
                      key={jobId}
                      draggable={true}
                      onDragStart={(e) => {
                        e.dataTransfer.setData('jobId', jobId);
                        setDraggedJobId(jobId);
                      }}
                      className="p-5 bg-[#18181b] hover:bg-[#27272a] border border-[#27272a] hover:border-zinc-600 rounded-[16px] transition cursor-grab active:cursor-grabbing space-y-3 shadow-lg group relative"
                      onClick={() => onSelectJob(job)}
                    >
                      <div className="flex items-start justify-between">
                        <ScoreBadge score={job.matchScore || 0} />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectJob(job);
                          }}
                          className="text-zinc-500 hover:text-white transition p-1"
                          title="Inspect Job Details"
                        >
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>

                      <div>
                        <h4 className="font-bold text-sm text-white line-clamp-1 group-hover:text-zinc-200 transition">
                          {job.jobTitle}
                        </h4>
                        <p className="text-xs text-zinc-400 flex items-center gap-1.5 mt-1 font-medium">
                          <Building className="w-3.5 h-3.5 text-zinc-500" />
                          <span className="truncate">{job.companyName}</span>
                        </p>
                        {job.location && (
                          <p className="text-xs text-zinc-500 flex items-center gap-1.5 mt-0.5 font-medium">
                            <MapPin className="w-3 h-3 text-zinc-600" />
                            <span className="truncate">{job.location}</span>
                          </p>
                        )}
                      </div>

                      {/* Manual Move Left & Right Arrow Controls + Quick Buttons */}
                      <div
                        className="pt-2 border-t border-zinc-800/80 flex items-center justify-between gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Move Left Button */}
                        <button
                          disabled={colIdx === 0}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveStage(job, columns[colIdx - 1].id);
                          }}
                          className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition"
                          title="Move Left"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>

                        {/* Middle Quick Action */}
                        <div className="flex-1 flex justify-center" onClick={(e) => e.stopPropagation()}>
                          {col.id === 'pending' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onUpdateApproval(jobId, 'approved');
                              }}
                              className="w-full py-1 px-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition flex items-center justify-center gap-1 shadow"
                            >
                              <Check className="w-3 h-3" /> Approve
                            </button>
                          )}
                          {col.id === 'approved' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onUpdateApplication(jobId, 'applied');
                              }}
                              className="w-full py-1 px-2.5 rounded-full bg-gradient-to-r from-white via-zinc-100 to-zinc-300 text-black hover:bg-zinc-200 text-[11px] font-bold flex items-center justify-center gap-1 shadow"
                            >
                              <Send className="w-3 h-3" /> Applied
                            </button>
                          )}
                          {col.id === 'applied' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onUpdateApplication(jobId, 'interview');
                              }}
                              className="w-full py-1 px-2.5 rounded-full bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold transition text-center"
                            >
                              Interviewing
                            </button>
                          )}
                          {(col.id === 'interview' || col.id === 'rejected') && (
                            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Drag to shift</span>
                          )}
                        </div>

                        {/* Move Right Button */}
                        <button
                          disabled={colIdx === columns.length - 1}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveStage(job, columns[colIdx + 1].id);
                          }}
                          className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition"
                          title="Move Right"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
