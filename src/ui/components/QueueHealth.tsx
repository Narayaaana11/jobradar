import React, { useState } from 'react';
import { store } from '../../app-core/store';
import { IRawQueueItem, IStats, IReplyClassification, IJob } from '../../app-core/types';
import { processIngestion } from '../../app-core/pipeline';
import { replyMatcher } from '../../app-core/replyMatcher';
import {
  Cpu,
  RefreshCw,
  CheckCircle,
  Clock,
  Sparkles,
  MessageSquare,
  Copy,
  Check,
  Send,
  Building,
  Tag,
  ArrowRight
} from 'lucide-react';

export function QueueHealth({ stats, onRefresh }: { stats: IStats; onRefresh: () => void }) {
  const [queueItems, setQueueItems] = useState<IRawQueueItem[]>(store.getQueueItems());
  const [reprocessingId, setReprocessingId] = useState<string | null>(null);

  // Recruiter Reply Matcher State (JobRadar Autonomous Core)
  const [replyInputText, setReplyInputText] = useState('');
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [isClassifying, setIsClassifying] = useState(false);
  const [replyResult, setReplyResult] = useState<IReplyClassification | null>(null);
  const [copiedReply, setCopiedReply] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  const allJobs: IJob[] = store.getJobs();
  const profile = store.getProfile();

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

  const handleClassifyReply = async () => {
    if (!replyInputText.trim()) return;
    setIsClassifying(true);
    setReplyError(null);
    setReplyResult(null);

    const matchingJob = allJobs.find(j => j.id === selectedJobId) || undefined;

    try {
      const res = await replyMatcher.classifyWithAi(
        replyInputText,
        matchingJob,
        profile,
        profile.apiKey
      );
      setReplyResult(res);
    } catch (err: any) {
      setReplyError(err.message || 'Failed to classify email');
    } finally {
      setIsClassifying(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedReply(true);
    setTimeout(() => setCopiedReply(false), 2000);
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
            Monitor in-app heuristic & AI extraction queues, ingestion throughput, and recruiter reply automation.
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
            <h3 className="text-xl font-extrabold text-white tracking-tight mt-1">JOB-RADAR Native</h3>
          </div>
          <div className="p-3 bg-zinc-900 border border-zinc-800 text-emerald-400 rounded-2xl">
            <Cpu className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ── JobRadar Inbound Recruiter Reply Matcher Section ── */}
      <div className="bg-gradient-to-r from-[#18181b] via-[#121215] to-[#18181b] border border-[#27272a] rounded-[24px] p-6 space-y-4 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-950 border border-emerald-700 text-emerald-400">
                <MessageSquare className="w-4 h-4" />
              </span>
              <h3 className="text-base font-extrabold text-white">Inbound Recruiter Reply Classifier & Auto-Responder</h3>
              <span className="px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-300 text-[10px] font-mono font-bold">
                JobRadar AI Intelligence
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Paste any recruiter email or LinkedIn response to classify intent (Interview Invite, Assessment, Rejection, Offer) and generate an optimal response.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left: Input Text & Target Job Selector */}
          <div className="lg:col-span-6 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono font-bold text-zinc-300 uppercase">
                Recruiter Message / Email Body:
              </label>
              {allJobs.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                  <Building className="w-3 h-3 text-zinc-500" />
                  <select
                    value={selectedJobId}
                    onChange={(e) => setSelectedJobId(e.target.value)}
                    className="bg-[#09090b] border border-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-200 outline-none max-w-[200px] truncate"
                  >
                    <option value="">-- Match with Job Feed (Optional) --</option>
                    {allJobs.map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.companyName} - {j.jobTitle}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <textarea
              rows={6}
              value={replyInputText}
              onChange={(e) => setReplyInputText(e.target.value)}
              placeholder="Paste recruiter email or LinkedIn message here... (e.g. 'Hi Narayana, thank you for your application. We would love to invite you for a 45-minute technical screen next week...')"
              className="w-full p-4 bg-[#09090b] border border-zinc-800 rounded-2xl text-xs text-zinc-200 font-mono leading-relaxed placeholder:text-zinc-600 focus:border-emerald-500 outline-none resize-none transition"
            />

            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-zinc-500">
                {replyInputText.length} characters
              </span>
              <button
                type="button"
                onClick={handleClassifyReply}
                disabled={isClassifying || !replyInputText.trim()}
                className="flex items-center space-x-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-black font-extrabold text-xs hover:brightness-110 transition shadow-lg disabled:opacity-50"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isClassifying ? 'animate-spin' : ''}`} />
                <span>{isClassifying ? 'Classifying with AI...' : '⚡ Classify & Draft Reply'}</span>
              </button>
            </div>

            {replyError && (
              <div className="p-3 bg-red-950/60 border border-red-800 text-xs font-mono text-red-300 rounded-xl">
                {replyError}
              </div>
            )}
          </div>

          {/* Right: AI Classifier Result & Drafted Response */}
          <div className="lg:col-span-6 flex flex-col">
            {replyResult ? (
              <div className="p-5 bg-[#09090b] border border-[#27272a] rounded-2xl flex-1 flex flex-col justify-between space-y-4 shadow-xl">
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-zinc-400">Classified Intent:</span>
                      <span className={`text-xs font-extrabold px-3 py-1 rounded-full border uppercase ${
                        replyResult.intent === 'interview_invite'
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                          : replyResult.intent === 'offer'
                          ? 'bg-yellow-950 text-yellow-300 border-yellow-800'
                          : replyResult.intent === 'assessment_request'
                          ? 'bg-cyan-950 text-cyan-300 border-cyan-800'
                          : replyResult.intent === 'rejection'
                          ? 'bg-red-950 text-red-300 border-red-800'
                          : 'bg-purple-950 text-purple-300 border-purple-800'
                      }`}>
                        {replyResult.intent.replace('_', ' ')}
                      </span>
                    </div>

                    <span className="text-xs font-mono text-zinc-400">
                      Confidence: <strong className="text-emerald-400">{Math.round(replyResult.confidence * 100)}%</strong>
                    </span>
                  </div>

                  <div className="text-xs text-zinc-300 space-y-1">
                    <span className="font-bold text-zinc-400 font-mono text-[10px] uppercase block">Recommended Next Action:</span>
                    <p className="font-mono text-cyan-300 bg-cyan-950/30 p-2.5 rounded-xl border border-cyan-900/60">
                      👉 {replyResult.recommendedAction || replyResult.suggestedNextAction}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-white uppercase">
                        Drafted Response Email:
                      </span>
                      <button
                        onClick={() => copyToClipboard(replyResult.draftedResponse)}
                        className="text-xs font-bold px-3 py-1 rounded-full bg-white text-black hover:bg-zinc-200 flex items-center gap-1 transition shadow"
                      >
                        <Copy className="w-3 h-3" /> {copiedReply ? 'Copied!' : 'Copy Reply'}
                      </button>
                    </div>

                    <textarea
                      readOnly
                      rows={5}
                      value={replyResult.draftedResponse}
                      className="w-full p-3 bg-[#121215] border border-zinc-800 rounded-xl text-xs text-zinc-300 font-mono leading-relaxed resize-none"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 bg-[#09090b] border border-dashed border-zinc-800 rounded-2xl flex-1 flex flex-col items-center justify-center text-center space-y-2">
                <MessageSquare className="w-8 h-8 text-zinc-600" />
                <p className="text-xs text-zinc-400 font-mono">
                  Paste a recruiter message on the left to view intent analysis and response drafts.
                </p>
              </div>
            )}
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
