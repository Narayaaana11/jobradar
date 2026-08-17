import React, { useState } from 'react';
import { store } from '../../app-core/store';
import { IRawQueueItem, IStats } from '../../app-core/types';
import { processIngestion } from '../../app-core/pipeline';
import { Cpu, RefreshCw, CheckCircle, Clock, AlertTriangle, Play, Sparkles } from 'lucide-react';

export function QueueHealth({ stats, onRefresh }: { stats: IStats; onRefresh: () => void }) {
  const [queueItems, setQueueItems] = useState<IRawQueueItem[]>(store.getQueueItems());
  const [reprocessingId, setReprocessingId] = useState<string | null>(null);

  const refreshQueue = () => {
    setQueueItems(store.getQueueItems());
    onRefresh();
  };

  const handleReprocess = async (item: IRawQueueItem) => {
    setReprocessingId(item.id);
    try {
      await processIngestion(item.rawText, item.channelName, item.platform as any);
      refreshQueue();
    } catch (err) {
      console.error('Reprocess failed:', err);
    } finally {
      setReprocessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Cpu className="w-6 h-6 text-emerald-400" /> Pipeline Queue & System Health
          </h2>
          <p className="text-sm text-zinc-400 font-medium">
            Monitor in-app heuristic & AI extraction queues, ingestion throughput, and processing logs.
          </p>
        </div>
        <button
          onClick={refreshQueue}
          className="flex items-center space-x-2 px-4 py-2 bg-[#121215] hover:bg-zinc-800 border border-[#27272a] rounded-full text-xs font-bold text-zinc-300 transition shadow-lg"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Health</span>
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#121215] border border-[#27272a] rounded-[20px] p-6 flex items-center justify-between shadow-lg">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-semibold">Unprocessed Queue</p>
            <h3 className="text-3xl font-extrabold text-amber-400 tracking-tight mt-1">{stats.unprocessedQueue}</h3>
          </div>
          <div className="p-3 bg-amber-950/40 border border-amber-800/40 text-amber-400 rounded-2xl">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#121215] border border-[#27272a] rounded-[20px] p-6 flex items-center justify-between shadow-lg">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-semibold">Processed Postings</p>
            <h3 className="text-3xl font-extrabold text-emerald-400 tracking-tight mt-1">{stats.totalJobs}</h3>
          </div>
          <div className="p-3 bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 rounded-2xl">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#121215] border border-[#27272a] rounded-[20px] p-6 flex items-center justify-between shadow-lg">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 font-semibold">Avg Match Score</p>
            <h3 className="text-3xl font-extrabold text-cyan-400 tracking-tight mt-1">{stats.avgMatchScore}%</h3>
          </div>
          <div className="p-3 bg-cyan-950/40 border border-cyan-800/40 text-cyan-400 rounded-2xl">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#121215] border border-[#27272a] rounded-[20px] p-6 flex items-center justify-between shadow-lg">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">Pipeline Engine</p>
            <h3 className="text-xl font-extrabold text-white tracking-tight mt-1">Windows Native</h3>
          </div>
          <div className="p-3 bg-zinc-900 border border-zinc-800 text-emerald-400 rounded-2xl">
            <Cpu className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Queue Items Table */}
      <div className="bg-[#121215] border border-[#27272a] rounded-[22px] overflow-hidden shadow-2xl">
        <div className="p-5 border-b border-[#27272a] flex items-center justify-between">
          <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
            Recent Ingestion Items ({queueItems.length})
          </h3>
          <span className="text-xs font-mono text-zinc-500">Autonomous processing with zero server delay</span>
        </div>

        {queueItems.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 text-xs font-mono">
            No queue items stored yet. All ingested items process instantly into the job feed.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#27272a] bg-[#18181b] text-[11px] font-mono text-zinc-400 uppercase">
                  <th className="py-3 px-5">ID & Source</th>
                  <th className="py-3 px-5">Message Snippet</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5">Timestamp</th>
                  <th className="py-3 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900 text-xs">
                {queueItems.map((item) => (
                  <tr key={item.id} className="hover:bg-[#18181b] transition">
                    <td className="py-4 px-5">
                      <div className="font-mono font-bold text-white">{item.rawMessageId}</div>
                      <div className="text-[11px] text-zinc-500">{item.channelName}</div>
                    </td>
                    <td className="py-4 px-5 max-w-md truncate text-zinc-300 font-mono">
                      {item.rawText}
                    </td>
                    <td className="py-4 px-5 whitespace-nowrap">
                      {item.processed ? (
                        <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-800/60">
                          ✓ Processed
                        </span>
                      ) : (
                        <span className="text-[11px] font-mono text-amber-400 bg-amber-950/60 px-2.5 py-0.5 rounded-full border border-amber-800/60">
                          ⏳ Queued
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-5 text-zinc-400 font-mono whitespace-nowrap">
                      {new Date(item.createdAt).toLocaleTimeString()}
                    </td>
                    <td className="py-4 px-5 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleReprocess(item)}
                        disabled={reprocessingId === item.id}
                        className="text-xs font-bold px-3 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 rounded-full transition disabled:opacity-50"
                      >
                        {reprocessingId === item.id ? 'Processing...' : 'Reprocess'}
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
