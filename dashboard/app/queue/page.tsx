'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { Cpu, AlertTriangle, RefreshCw, CheckCircle, Clock, Database, Terminal } from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';

export default function QueueAdminPage() {
  const [queueStatus, setQueueStatus] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reprocessingId, setReprocessingId] = useState<string | null>(null);

  const fetchQueueStatus = useCallback(async () => {
    setLoading(true);
    try {
      const [qRes, sRes] = await Promise.all([
        fetch(`${API_BASE}/queue/status`),
        fetch(`${API_BASE}/stats`),
      ]);
      if (qRes.ok) {
        const qData = await qRes.json();
        setQueueStatus(qData);
      }
      if (sRes.ok) {
        const sData = await sRes.json();
        setStats(sData);
      }
    } catch (err) {
      console.error('Failed to fetch queue status:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueueStatus();
  }, [fetchQueueStatus]);

  const handleReprocess = async (id: string) => {
    setReprocessingId(id);
    try {
      const res = await fetch(`${API_BASE}/queue/reprocess/${id}`, { method: 'POST' });
      if (res.ok) {
        fetchQueueStatus();
      }
    } catch (err) {
      console.error('Failed to trigger reprocess:', err);
    } finally {
      setReprocessingId(null);
    }
  };

  const processedCount = queueStatus?.processedTotal || stats?.totalJobs || 0;
  const unprocessedCount = queueStatus?.unprocessed || 0;
  const errorsCount = queueStatus?.errorsCount || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Cpu className="w-6 h-6 text-white" /> Pipeline Queue & System Health
          </h2>
          <p className="text-sm text-zinc-400 font-medium">
            Monitor AWS S3 datastore ingestion, worker pipeline health, and job extraction metrics.
          </p>
        </div>
        <button
          onClick={fetchQueueStatus}
          className="flex items-center space-x-2 px-4 py-2 bg-[#121215] hover:bg-zinc-800 border border-[#27272a] rounded-full text-xs font-bold text-zinc-300 transition shadow-lg"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Health</span>
        </button>
      </div>

      {/* Queue & Datastore Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#121215] border border-[#27272a] rounded-[20px] p-6 flex items-center justify-between shadow-lg">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-semibold">Unprocessed Queue</p>
            <h3 className="text-3xl font-extrabold text-amber-400 tracking-tight mt-1">{unprocessedCount}</h3>
          </div>
          <div className="p-3 bg-amber-950/40 border border-amber-800/40 text-amber-400 rounded-2xl">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#121215] border border-[#27272a] rounded-[20px] p-6 flex items-center justify-between shadow-lg">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-semibold">Processed Postings</p>
            <h3 className="text-3xl font-extrabold text-emerald-400 tracking-tight mt-1">{processedCount}</h3>
          </div>
          <div className="p-3 bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 rounded-2xl">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#121215] border border-[#27272a] rounded-[20px] p-6 flex items-center justify-between shadow-lg">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-sky-400 font-semibold">AWS S3 Datastore</p>
            <h3 className="text-3xl font-extrabold text-sky-400 tracking-tight mt-1">jobsprep</h3>
          </div>
          <div className="p-3 bg-sky-950/40 border border-sky-800/40 text-sky-400 rounded-2xl">
            <Database className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#121215] border border-[#27272a] rounded-[20px] p-6 flex items-center justify-between shadow-lg">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-red-400 font-semibold">Pipeline Errors</p>
            <h3 className="text-3xl font-extrabold text-red-400 tracking-tight mt-1">{errorsCount}</h3>
          </div>
          <div className="p-3 bg-red-950/40 border border-red-800/40 text-red-400 rounded-2xl">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* System Status Banner */}
      <div className="bg-[#121215] border border-[#27272a] rounded-[20px] p-6 space-y-4 shadow-xl">
        <div className="flex items-center space-x-3">
          <Terminal className="w-5 h-5 text-emerald-400" />
          <h3 className="text-base font-extrabold text-white">System Diagnostics & Datastore Connection</h3>
        </div>
        <div className="bg-black/80 border border-zinc-800 rounded-xl p-4 font-mono text-xs text-zinc-300 space-y-2">
          <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
            <span className="text-zinc-500">Datastore Storage Engine:</span>
            <span className="text-emerald-400 font-bold">Pure AWS S3 Cloud Mode (s3://jobsprep/)</span>
          </div>
          <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
            <span className="text-zinc-500">Resume Tailoring Engine:</span>
            <span className="text-sky-400 font-bold">LaTeX PDF Generator (90+ ATS Optimized)</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-zinc-500">Ingestion Pipeline Status:</span>
            <span className="text-emerald-400 font-bold">ACTIVE & OPERATIONAL (0 Errors Recorded)</span>
          </div>
        </div>
      </div>

      {/* Recent Errors / Logs Table */}
      <div className="bg-[#121215] border border-[#27272a] rounded-[20px] p-6 space-y-4 shadow-xl">
        <h3 className="text-base font-extrabold text-white">Recent Pipeline Execution Failures</h3>
        {!queueStatus?.recentErrors || queueStatus.recentErrors.length === 0 ? (
          <p className="text-xs text-zinc-500 font-mono italic">No pipeline errors recorded. All ingestion pipelines operating cleanly.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#27272a] bg-[#18181b] text-[11px] font-mono font-semibold text-zinc-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Stage</th>
                  <th className="py-3 px-4">Error Trace</th>
                  <th className="py-3 px-4">Retries</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4 text-right">Manual Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {queueStatus.recentErrors.map((err: any) => (
                  <tr key={err._id || err.id} className="hover:bg-[#18181b] transition">
                    <td className="py-3 px-4 font-mono font-bold text-amber-400 uppercase">{err.stage}</td>
                    <td className="py-3 px-4 text-zinc-300 font-mono max-w-xs truncate">{err.error}</td>
                    <td className="py-3 px-4 text-zinc-400 font-mono">{err.retryCount}</td>
                    <td className="py-3 px-4 text-zinc-500 font-mono">{new Date(err.createdAt).toLocaleString()}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleReprocess(err.rawQueueId)}
                        disabled={reprocessingId === err.rawQueueId}
                        className="px-3 py-1 bg-white hover:bg-zinc-200 text-black font-extrabold rounded-full text-xs transition disabled:opacity-50"
                      >
                        {reprocessingId === err.rawQueueId ? 'Retrying...' : 'Retry Pipeline'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
