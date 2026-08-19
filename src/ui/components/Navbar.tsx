import React, { useState, useEffect } from 'react';
import { LayoutGrid, Cpu, BarChart3, Settings, Plus, Sparkles, Cloud, RefreshCw, Brain, Globe } from 'lucide-react';
import { RadarLogoBadge } from './RadarLogo';
import { s3Cloud, S3SyncStatus } from '../../app-core/s3Client';

interface NavbarProps {
  currentTab: 'feed' | 'careers' | 'queue' | 'analytics' | 'settings' | 'rag';
  setCurrentTab: (tab: 'feed' | 'careers' | 'queue' | 'analytics' | 'settings' | 'rag') => void;
  onOpenIngestModal: () => void;
}

export function Navbar({ currentTab, setCurrentTab, onOpenIngestModal }: NavbarProps) {
  const [s3Status, setS3Status] = useState<S3SyncStatus>(s3Cloud.getStatus().status);
  const [lastSync, setLastSync] = useState<string | null>(s3Cloud.getStatus().lastSyncTime);

  useEffect(() => {
    const unsub = s3Cloud.subscribe((st) => {
      setS3Status(st);
      setLastSync(s3Cloud.getStatus().lastSyncTime);
    });
    return unsub;
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-black/90 backdrop-blur-xl border-b border-zinc-800/80 px-6 py-3.5 flex items-center justify-between">
      {/* Brand Identity */}
      <div className="flex items-center space-x-3">
        <RadarLogoBadge size="md" />
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="font-extrabold text-base tracking-tight text-white">JobRadar</h1>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-300">
              Windows App
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 font-medium">Autonomous Career Agent Platform</p>
        </div>
      </div>

      {/* Navigation Pills */}
      <nav className="flex items-center space-x-1.5 bg-[#121215] p-1.5 rounded-full border border-zinc-800 shadow-inner">
        <button
          onClick={() => setCurrentTab('feed')}
          className={`flex items-center space-x-1.5 text-xs font-bold px-4 py-1.5 rounded-full transition ${
            currentTab === 'feed' ? 'bg-white text-black shadow-md' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
          }`}
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          <span>Job Feed</span>
        </button>

        <button
          onClick={() => setCurrentTab('careers')}
          className={`flex items-center space-x-1.5 text-xs font-bold px-4 py-1.5 rounded-full transition ${
            currentTab === 'careers'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-black shadow-md shadow-emerald-500/20'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
          }`}
        >
          <Globe className="w-3.5 h-3.5 text-emerald-400" />
          <span>Career Sites</span>
        </button>

        <button
          onClick={() => setCurrentTab('rag')}
          className={`flex items-center space-x-1.5 text-xs font-bold px-4 py-1.5 rounded-full transition ${
            currentTab === 'rag'
              ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-md'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
          }`}
        >
          <Brain className="w-3.5 h-3.5 text-purple-400" />
          <span>Career Vault & RAG</span>
        </button>

        <button
          onClick={() => setCurrentTab('queue')}
          className={`flex items-center space-x-1.5 text-xs font-bold px-4 py-1.5 rounded-full transition ${
            currentTab === 'queue' ? 'bg-white text-black shadow-md' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>Pipeline & Queue</span>
        </button>

        <button
          onClick={() => setCurrentTab('analytics')}
          className={`flex items-center space-x-1.5 text-xs font-bold px-4 py-1.5 rounded-full transition ${
            currentTab === 'analytics' ? 'bg-white text-black shadow-md' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Analytics</span>
        </button>

        <button
          onClick={() => setCurrentTab('settings')}
          className={`flex items-center space-x-1.5 text-xs font-bold px-4 py-1.5 rounded-full transition ${
            currentTab === 'settings' ? 'bg-white text-black shadow-md' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Profile & S3</span>
        </button>
      </nav>

      {/* Action CTA & App Status */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onOpenIngestModal}
          className="flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-white via-zinc-100 to-zinc-300 text-black hover:bg-zinc-200 rounded-full text-xs font-extrabold transition shadow-lg hover:shadow-white/10"
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span>Ingest Postings</span>
        </button>

        {/* Live AWS S3 Cloud Sync Pill */}
        <div
          onClick={() => setCurrentTab('settings')}
          className="cursor-pointer inline-flex items-center gap-1.5 text-[11px] font-mono font-semibold px-3 py-1.5 rounded-full bg-cyan-950/40 border border-cyan-800/50 text-cyan-300 shadow-sm hover:bg-cyan-900/40 transition"
          title={`AWS S3 Storage: ${s3Cloud.getConfig().bucket} (${s3Cloud.getConfig().region})`}
        >
          {s3Status === 'syncing' ? (
            <RefreshCw className="w-3 h-3 animate-spin text-cyan-400" />
          ) : (
            <Cloud className="w-3.5 h-3.5 text-cyan-400" />
          )}
          <span>
            {s3Status === 'syncing'
              ? 'Syncing S3...'
              : s3Status === 'synced'
              ? `S3 Synced (${lastSync || 'Now'})`
              : 'S3 Active (jobsprep)'}
          </span>
        </div>
      </div>
    </header>
  );
}
