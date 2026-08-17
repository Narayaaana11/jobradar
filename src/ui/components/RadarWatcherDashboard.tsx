import React, { useState, useEffect } from 'react';
import { IWatcherConfig, IChannelSource, IRadarFeedItem, IJob, IProfile } from '../../app-core/types';
import { channelManager } from '../../app-core/channelManager';
import {
  Radio, MessageCircle, Send, CheckCircle2, XCircle, AlertCircle,
  RefreshCw, Plus, Trash2, Power, Eye, Zap, ShieldCheck, Sparkles,
  ExternalLink, Copy, Sliders, Smartphone, QrCode, Key, LogIn, LogOut,
  RotateCcw, Check, Phone
} from 'lucide-react';

interface RadarWatcherDashboardProps {
  profile: IProfile;
  onOpenJob: (jobId: string) => void;
}

export function RadarWatcherDashboard({ profile, onOpenJob }: RadarWatcherDashboardProps) {
  const [config, setConfig] = useState<IWatcherConfig>(channelManager.getConfig());
  const [feed, setFeed] = useState<IRadarFeedItem[]>(channelManager.getFeed());
  
  // Test Ingestion State
  const [testInput, setTestInput] = useState('');
  const [testChannel, setTestChannel] = useState(config.monitoredChannels[0]?.name || 'My Placement Group');
  const [testPlatform, setTestPlatform] = useState<'whatsapp' | 'telegram'>('whatsapp');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Add Channel Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelPlatform, setNewChannelPlatform] = useState<'whatsapp' | 'telegram'>('whatsapp');
  const [newChannelType, setNewChannelType] = useState<'group' | 'channel'>('group');

  // WhatsApp Linking Modal
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [waPhone, setWaPhone] = useState(config.whatsappPhone || profile.phone || '');
  const [waPairingCode, setWaPairingCode] = useState<string | null>(config.whatsappPairingCode || null);
  const [waMode, setWaMode] = useState<'qr' | 'pairing'>('qr');
  const [isGeneratingPairing, setIsGeneratingPairing] = useState(false);

  // Telegram Login Modal
  const [showTelegramModal, setShowTelegramModal] = useState(false);
  const [tgPhone, setTgPhone] = useState(config.telegramPhone || profile.phone || '');
  const [tgOtpCode, setTgOtpCode] = useState('');
  const [tgMode, setTgMode] = useState<'qr' | 'phone'>('qr');
  const [tgStep, setTgStep] = useState<'enter_phone' | 'enter_otp' | 'connected'>('enter_phone');
  const [tgLoading, setTgLoading] = useState(false);
  const [tgMsg, setTgMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filter
  const [activeFilter, setActiveFilter] = useState<'all' | 'approved' | 'extracted' | 'noise'>('all');

  useEffect(() => {
    // Request notification permission if not granted
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const refreshState = () => {
    setConfig(channelManager.getConfig());
    setFeed(channelManager.getFeed());
  };

  const handleToggle = (id: string, current: boolean) => {
    channelManager.toggleChannel(id, !current);
    refreshState();
  };

  const handleClearAll = () => {
    channelManager.clearAllChannels();
    refreshState();
  };

  const handleAddChannel = () => {
    if (!newChannelName.trim()) return;
    channelManager.addChannel({
      platform: newChannelPlatform,
      type: newChannelType,
      name: newChannelName.trim(),
      enabled: true,
    });
    refreshState();
    setNewChannelName('');
    setShowAddModal(false);
  };

  const handleRemoveChannel = (id: string) => {
    channelManager.removeChannel(id);
    refreshState();
  };

  const handleSimulateIngest = async () => {
    if (!testInput.trim()) return;
    setIsProcessing(true);
    try {
      await channelManager.ingestIncomingMessage(testPlatform, testChannel, testInput);
      refreshState();
      setTestInput('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Real WhatsApp Web Launcher ──
  const handleLaunchWhatsAppWeb = async () => {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.openWhatsAppWeb) {
      await (window as any).electronAPI.openWhatsAppWeb();
      channelManager.confirmWhatsAppConnected(waPhone);
      refreshState();
    } else {
      window.open('https://web.whatsapp.com', '_blank');
      channelManager.confirmWhatsAppConnected(waPhone);
      refreshState();
    }
  };

  const handleGeneratePairingCode = async () => {
    setIsGeneratingPairing(true);
    try {
      const code = await channelManager.requestWhatsAppPairingCode(waPhone);
      setWaPairingCode(code);
    } finally {
      setIsGeneratingPairing(false);
    }
  };

  // ── Telegram Authentication Flow ──
  const handleRequestTelegramOtp = async () => {
    if (!tgPhone.trim()) {
      setTgMsg({ type: 'error', text: 'Please enter your phone number with country code.' });
      return;
    }
    setTgLoading(true);
    setTgMsg(null);
    try {
      const res = await channelManager.requestTelegramCode(tgPhone);
      if (res.success) {
        setTgStep('enter_otp');
        setTgMsg({ type: 'success', text: res.message });
      } else {
        setTgMsg({ type: 'error', text: res.message });
      }
    } catch (err: any) {
      setTgMsg({ type: 'error', text: err.message });
    } finally {
      setTgLoading(false);
    }
  };

  const handleVerifyTelegramOtp = async () => {
    if (!tgOtpCode.trim()) {
      setTgMsg({ type: 'error', text: 'Please enter the 5-digit verification code.' });
      return;
    }
    setTgLoading(true);
    setTgMsg(null);
    try {
      const res = await channelManager.verifyTelegramCode(tgOtpCode);
      if (res.success) {
        setTgStep('connected');
        setTgMsg({ type: 'success', text: res.message });
        refreshState();
        setTimeout(() => {
          setShowTelegramModal(false);
          setTgStep('enter_phone');
          setTgOtpCode('');
          setTgMsg(null);
        }, 1800);
      } else {
        setTgMsg({ type: 'error', text: res.message });
      }
    } catch (err: any) {
      setTgMsg({ type: 'error', text: err.message });
    } finally {
      setTgLoading(false);
    }
  };

  const handleLaunchTelegramWeb = async () => {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.openTelegramWeb) {
      await (window as any).electronAPI.openTelegramWeb();
      channelManager.verifyTelegramCode('qr_session');
      refreshState();
    } else {
      window.open('https://web.telegram.org/k/', '_blank');
      channelManager.verifyTelegramCode('qr_session');
      refreshState();
    }
  };

  const filteredFeed = feed.filter((item) => {
    if (activeFilter === 'approved') return item.status === 'council_approved';
    if (activeFilter === 'extracted') return item.status === 'extracted';
    if (activeFilter === 'noise') return item.status === 'noise_dropped' || item.status === 'duplicate_skipped';
    return true;
  });

  const totalCaptured = config.monitoredChannels.reduce((sum, c) => sum + c.totalCaptured, 0);
  const activeChannelsCount = config.monitoredChannels.filter((c) => c.enabled).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ── Top Header & Stats ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#121215] border border-[#27272a] rounded-[24px] p-6 shadow-2xl">
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 rounded-xl">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <h1 className="text-xl font-black text-white tracking-tight">Autonomous Radar Watcher</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-xs font-mono font-bold">
              LIVE LISTENING
            </span>
          </div>
          <p className="text-xs text-zinc-400">
            Real-time background listener for WhatsApp placement groups, Telegram drive channels, and campus recruitment streams.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowWhatsAppModal(true)}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Link WhatsApp</span>
          </button>

          <button
            onClick={() => setShowTelegramModal(true)}
            className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow"
          >
            <Send className="w-4 h-4" />
            <span>Login Telegram</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Channel</span>
          </button>
        </div>
      </div>

      {/* ── Active Listener Summary Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* WhatsApp Bridge Card */}
        <div className="p-5 bg-[#121215] border border-[#27272a] rounded-[20px] space-y-3 shadow">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-950/70 border border-emerald-800/70 text-emerald-400">
                <MessageCircle className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-xs font-bold text-white uppercase font-mono">WhatsApp Bridge</h3>
                <p className="text-[11px] text-zinc-400">
                  {config.whatsappConnected ? (config.whatsappPhone || 'Linked Session Active') : 'Not Connected'}
                </p>
              </div>
            </div>

            {config.whatsappConnected ? (
              <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-mono font-bold">
                CONNECTED
              </span>
            ) : (
              <button
                onClick={() => setShowWhatsAppModal(true)}
                className="px-2.5 py-1 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-600/40 text-[10px] font-mono font-bold hover:bg-emerald-600/30 transition"
              >
                CONNECT
              </button>
            )}
          </div>
          <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs font-mono">
            <span className="text-zinc-400">Monitored Chats:</span>
            <span className="text-white font-bold">
              {config.monitoredChannels.filter((c) => c.platform === 'whatsapp' && c.enabled).length} Active
            </span>
          </div>
        </div>

        {/* Telegram MTProto Card */}
        <div className="p-5 bg-[#121215] border border-[#27272a] rounded-[20px] space-y-3 shadow">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-cyan-950/70 border border-cyan-800/70 text-cyan-400">
                <Send className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-xs font-bold text-white uppercase font-mono">Telegram MTProto</h3>
                <p className="text-[11px] text-zinc-400">
                  {config.telegramConnected ? (config.telegramPhone || 'User Session Linked') : 'Not Connected'}
                </p>
              </div>
            </div>

            {config.telegramConnected ? (
              <span className="px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 text-[10px] font-mono font-bold">
                CONNECTED
              </span>
            ) : (
              <button
                onClick={() => setShowTelegramModal(true)}
                className="px-2.5 py-1 rounded-lg bg-cyan-600/20 text-cyan-400 border border-cyan-600/40 text-[10px] font-mono font-bold hover:bg-cyan-600/30 transition"
              >
                LOGIN
              </button>
            )}
          </div>
          <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs font-mono">
            <span className="text-zinc-400">Monitored Channels:</span>
            <span className="text-white font-bold">
              {config.monitoredChannels.filter((c) => c.platform === 'telegram' && c.enabled).length} Active
            </span>
          </div>
        </div>

        {/* Total Intercepted Metrics */}
        <div className="p-5 bg-[#121215] border border-[#27272a] rounded-[20px] space-y-3 shadow">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-purple-950/70 border border-purple-800/70 text-purple-400">
                <Zap className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-xs font-bold text-white uppercase font-mono">Total Jobs Intercepted</h3>
                <p className="text-[11px] text-zinc-400">Across {activeChannelsCount} channels</p>
              </div>
            </div>
            <span className="text-lg font-black text-purple-400 font-mono">{totalCaptured}</span>
          </div>
          <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs font-mono">
            <span className="text-zinc-400">Triage Auto-Approve:</span>
            <span className="text-emerald-400 font-bold">&gt;= {config.minMatchScoreForToast}% Fit Score</span>
          </div>
        </div>
      </div>

      {/* ── Main Layout: Channels List + Live Feed Stream ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Monitored Channels Management (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 bg-[#121215] border border-[#27272a] rounded-[24px] space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Sliders className="w-4 h-4 text-purple-400" /> Monitored Channels & Groups ({config.monitoredChannels.length})
              </h2>

              {config.monitoredChannels.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="text-[11px] font-mono text-zinc-400 hover:text-red-400 flex items-center gap-1 transition"
                  title="Clear all monitored channels"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear All</span>
                </button>
              )}
            </div>

            <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
              {config.monitoredChannels.length === 0 ? (
                <div className="p-8 text-center bg-[#18181b] border border-dashed border-zinc-700 rounded-2xl space-y-3">
                  <div className="w-10 h-10 mx-auto rounded-2xl bg-purple-950/60 border border-purple-800/60 flex items-center justify-center text-purple-400">
                    <Radio className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-white">No Channels Added Yet</h4>
                    <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
                      Add your specific WhatsApp placement groups or Telegram drive channels to start monitoring.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:brightness-110 text-white rounded-xl text-xs font-bold font-mono transition inline-flex items-center gap-1.5 shadow"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Channel From Socials</span>
                  </button>
                </div>
              ) : (
                config.monitoredChannels.map((channel) => (
                  <div
                    key={channel.id}
                    className={`p-3.5 rounded-2xl border transition flex items-center justify-between gap-3 ${
                      channel.enabled
                        ? 'bg-[#18181b] border-[#27272a]'
                        : 'bg-[#0e0e11] border-zinc-800/60 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`p-2 rounded-xl text-xs ${
                          channel.platform === 'whatsapp'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                            : 'bg-cyan-950 text-cyan-400 border border-cyan-800/60'
                        }`}
                      >
                        {channel.platform === 'whatsapp' ? (
                          <MessageCircle className="w-3.5 h-3.5" />
                        ) : (
                          <Send className="w-3.5 h-3.5" />
                        )}
                      </span>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-white truncate">{channel.name}</h4>
                        <p className="text-[10px] font-mono text-zinc-400 flex items-center gap-2">
                          <span>{channel.type === 'group' ? '👥 Group' : '📢 Channel'}</span>
                          {channel.memberCount ? <span>• {channel.memberCount.toLocaleString()} members</span> : null}
                          <span>• {channel.totalCaptured} captured</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleToggle(channel.id, channel.enabled)}
                        className={`p-1.5 rounded-lg text-xs transition ${
                          channel.enabled
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30'
                            : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'
                        }`}
                        title={channel.enabled ? 'Disable Channel' : 'Enable Channel'}
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleRemoveChannel(channel.id)}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-950/40 transition"
                        title="Remove Channel"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Test Ingestion Simulator */}
          <div className="p-5 bg-[#121215] border border-[#27272a] rounded-[24px] space-y-3 shadow-xl">
            <h3 className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" /> Test Ingest Live Chat Message
            </h3>
            <p className="text-[11px] text-zinc-400">
              Paste a WhatsApp/Telegram forward to test live noise triage, deduplication, and extraction.
            </p>

            <div className="flex gap-2">
              <select
                value={testPlatform}
                onChange={(e) => setTestPlatform(e.target.value as any)}
                className="px-2.5 py-1.5 bg-[#09090b] border border-[#27272a] rounded-xl text-xs text-white font-mono"
              >
                <option value="whatsapp">WhatsApp</option>
                <option value="telegram">Telegram</option>
              </select>
              <input
                type="text"
                value={testChannel}
                onChange={(e) => setTestChannel(e.target.value)}
                placeholder="Channel Name"
                className="flex-1 px-3 py-1.5 bg-[#09090b] border border-[#27272a] rounded-xl text-xs text-white font-mono"
              />
            </div>

            <textarea
              rows={3}
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              placeholder="Paste raw forward here (e.g. *Infosys Recruitment 2026* Role: Systems Engineer...)"
              className="w-full p-3 bg-[#09090b] border border-[#27272a] rounded-xl text-xs text-zinc-300 font-mono resize-none focus:outline-none focus:border-purple-500"
            />

            <button
              onClick={handleSimulateIngest}
              disabled={isProcessing || !testInput.trim()}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:brightness-110 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
              <span>{isProcessing ? 'Filtering & Ingesting...' : 'Simulate Live Ingest'}</span>
            </button>
          </div>
        </div>

        {/* Right Column: Live Intercepted Feed (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-5 bg-[#121215] border border-[#27272a] rounded-[24px] space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h2 className="text-sm font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-400" /> Live Ingestion Feed
              </h2>

              <div className="flex items-center gap-1.5 bg-[#09090b] p-1 rounded-xl border border-[#27272a]">
                {(['all', 'approved', 'extracted', 'noise'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveFilter(tab)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold font-mono transition capitalize ${
                      activeFilter === tab
                        ? 'bg-zinc-800 text-white shadow'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Feed Stream List */}
            <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1">
              {filteredFeed.length === 0 ? (
                <div className="p-12 text-center text-zinc-500 font-mono text-xs">
                  No feed messages captured matching current filter.
                </div>
              ) : (
                filteredFeed.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 bg-[#18181b] border border-[#27272a] rounded-2xl space-y-2.5 transition hover:border-zinc-700"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`p-1.5 rounded-lg text-xs ${
                            item.platform === 'whatsapp'
                              ? 'bg-emerald-950 text-emerald-400'
                              : item.platform === 'telegram'
                              ? 'bg-cyan-950 text-cyan-400'
                              : 'bg-purple-950 text-purple-400'
                          }`}
                        >
                          {item.platform === 'whatsapp' ? (
                            <MessageCircle className="w-3 h-3" />
                          ) : (
                            <Send className="w-3 h-3" />
                          )}
                        </span>
                        <span className="text-xs font-bold text-zinc-300 truncate font-mono">
                          {item.channelName}
                        </span>
                      </div>

                      {/* Status Tag */}
                      <div>
                        {item.status === 'council_approved' && (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-mono font-extrabold flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-emerald-400" />
                            <span>COUNCIL APPROVED ({item.matchScore}%)</span>
                          </span>
                        )}
                        {item.status === 'extracted' && (
                          <span className="px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 text-[10px] font-mono font-bold">
                            EXTRACTED ({item.matchScore}%)
                          </span>
                        )}
                        {item.status === 'noise_dropped' && (
                          <span className="px-2.5 py-0.5 rounded-full bg-zinc-900 text-zinc-500 border border-zinc-800 text-[10px] font-mono">
                            🛡️ NOISE DROPPED
                          </span>
                        )}
                        {item.status === 'duplicate_skipped' && (
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-950/70 text-amber-400 border border-amber-800 text-[10px] font-mono">
                            🔁 DUPLICATE SKIPPED
                          </span>
                        )}
                      </div>
                    </div>

                    {item.extractedCompany && item.extractedRole && (
                      <div className="flex items-center justify-between p-2.5 bg-[#09090b] border border-[#27272a] rounded-xl text-xs">
                        <span className="font-bold text-white">
                          {item.extractedCompany} — <span className="text-purple-400">{item.extractedRole}</span>
                        </span>
                        <span className="text-[11px] font-mono text-zinc-400">
                          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    )}

                    <p className="text-xs text-zinc-400 line-clamp-2 font-mono leading-relaxed">
                      {item.rawText}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── 1. WHATSAPP LINKING MODAL (Real WhatsApp Web Companion + Pairing Code) ── */}
      {showWhatsAppModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121215] border border-[#27272a] rounded-[28px] max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-800">
                  <Smartphone className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-extrabold text-white">Link WhatsApp Session</h3>
                  <p className="text-[11px] text-zinc-400">Authenticate your WhatsApp account to monitor placement groups</p>
                </div>
              </div>
              <button onClick={() => setShowWhatsAppModal(false)} className="text-zinc-400 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Switcher: Real Web Companion vs 8-Digit Pairing Code */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-[#09090b] border border-[#27272a] rounded-2xl">
              <button
                type="button"
                onClick={() => setWaMode('qr')}
                className={`py-2 rounded-xl text-xs font-bold font-mono transition flex items-center justify-center gap-1.5 ${
                  waMode === 'qr'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Live Official QR</span>
              </button>
              <button
                type="button"
                onClick={() => setWaMode('pairing')}
                className={`py-2 rounded-xl text-xs font-bold font-mono transition flex items-center justify-center gap-1.5 ${
                  waMode === 'pairing'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Phone Pairing Code</span>
              </button>
            </div>

            {waMode === 'qr' ? (
              <div className="space-y-4">
                <div className="p-5 bg-[#18181b] border border-[#27272a] rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold font-mono">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Real WhatsApp Web Companion Window</span>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                    Clicking below launches the authentic WhatsApp Web session window. WhatsApp servers generate the live, cryptographic QR code that your phone will link to instantly without "Invalid QR" errors.
                  </p>
                  <button
                    onClick={handleLaunchWhatsAppWeb}
                    className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white font-extrabold text-xs rounded-xl transition shadow-lg flex items-center justify-center gap-2"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Launch WhatsApp Web & Scan Live QR</span>
                  </button>
                </div>

                <div className="p-3 bg-[#09090b] border border-[#27272a] rounded-xl text-[11px] text-zinc-400 font-mono space-y-1">
                  <p>1. Open WhatsApp on your phone</p>
                  <p>2. Tap Menu / Settings &gt; Linked Devices &gt; Link a Device</p>
                  <p>3. Point your camera at the real WhatsApp Web QR window</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-[11px] font-mono text-zinc-400 uppercase">
                    Your Phone Number (with Country Code)
                  </label>
                  <input
                    type="text"
                    value={waPhone}
                    onChange={(e) => setWaPhone(e.target.value)}
                    placeholder="+91 6301253789"
                    className="w-full px-3.5 py-2.5 bg-[#09090b] border border-[#27272a] rounded-xl text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {waPairingCode ? (
                  <div className="p-4 bg-emerald-950/40 border border-emerald-800 rounded-2xl text-center space-y-2">
                    <p className="text-xs text-zinc-400 font-mono">Enter this 8-character code on your phone:</p>
                    <div className="text-2xl font-black text-emerald-400 tracking-widest font-mono select-all">
                      {waPairingCode}
                    </div>
                    <p className="text-[11px] text-zinc-500 font-mono">
                      (WhatsApp &gt; Linked Devices &gt; Link with phone number instead)
                    </p>
                  </div>
                ) : (
                  <button
                    onClick={handleGeneratePairingCode}
                    disabled={isGeneratingPairing || !waPhone.trim()}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <Key className="w-3.5 h-3.5" />
                    <span>{isGeneratingPairing ? 'Generating...' : 'Get 8-Character Pairing Code'}</span>
                  </button>
                )}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  channelManager.confirmWhatsAppConnected(waPhone);
                  refreshState();
                  setShowWhatsAppModal(false);
                }}
                className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs rounded-xl transition"
              >
                Mark as Connected
              </button>
              {config.whatsappConnected && (
                <button
                  onClick={() => {
                    channelManager.disconnectWhatsApp();
                    refreshState();
                    setShowWhatsAppModal(false);
                  }}
                  className="px-4 py-2.5 bg-red-950/60 hover:bg-red-900 border border-red-800 text-red-300 font-bold text-xs rounded-xl transition flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Disconnect</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── 2. TELEGRAM AUTHENTICATION MODAL (Phone + OTP Verification) ── */}
      {showTelegramModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121215] border border-[#27272a] rounded-[28px] max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-cyan-950 text-cyan-400 border border-cyan-800">
                  <Send className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-extrabold text-white">Telegram User Login</h3>
                  <p className="text-[11px] text-zinc-400">Connect MTProto session to monitor channels</p>
                </div>
              </div>
              <button onClick={() => setShowTelegramModal(false)} className="text-zinc-400 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {tgMsg && (
              <div
                className={`p-3 rounded-xl border text-xs font-mono flex items-center gap-2 ${
                  tgMsg.type === 'success'
                    ? 'bg-cyan-950/60 border-cyan-800 text-cyan-300'
                    : 'bg-red-950/60 border-red-800 text-red-300'
                }`}
              >
                {tgMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{tgMsg.text}</span>
              </div>
            )}

            {/* Mode Switcher: Real Telegram Web Companion vs Phone Number OTP */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-[#09090b] border border-[#27272a] rounded-2xl">
              <button
                type="button"
                onClick={() => setTgMode('qr')}
                className={`py-2 rounded-xl text-xs font-bold font-mono transition flex items-center justify-center gap-1.5 ${
                  tgMode === 'qr'
                    ? 'bg-cyan-600 text-white shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Live Official QR</span>
              </button>
              <button
                type="button"
                onClick={() => setTgMode('phone')}
                className={`py-2 rounded-xl text-xs font-bold font-mono transition flex items-center justify-center gap-1.5 ${
                  tgMode === 'phone'
                    ? 'bg-cyan-600 text-white shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Phone / OTP</span>
              </button>
            </div>

            {tgMode === 'qr' ? (
              <div className="space-y-4">
                <div className="p-5 bg-[#18181b] border border-[#27272a] rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold font-mono">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Real Telegram Web Companion Window</span>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                    Clicking below launches the official Telegram Web companion window. Telegram renders the official live QR code that you scan directly with your Telegram mobile app.
                  </p>
                  <button
                    onClick={handleLaunchTelegramWeb}
                    className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:brightness-110 text-white font-extrabold text-xs rounded-xl transition shadow-lg flex items-center justify-center gap-2"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Launch Telegram Web & Scan Live QR</span>
                  </button>
                </div>

                <div className="p-3 bg-[#09090b] border border-[#27272a] rounded-xl text-[11px] text-zinc-400 font-mono space-y-1">
                  <p>1. Open Telegram on your phone</p>
                  <p>2. Tap Settings ➔ Devices ➔ Link Desktop Device</p>
                  <p>3. Point your camera at the official Telegram Web QR window</p>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => {
                      channelManager.verifyTelegramCode('qr_session');
                      refreshState();
                      setShowTelegramModal(false);
                    }}
                    className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs rounded-xl transition"
                  >
                    Mark as Connected
                  </button>
                  {config.telegramConnected && (
                    <button
                      onClick={() => {
                        channelManager.disconnectTelegram();
                        refreshState();
                        setShowTelegramModal(false);
                      }}
                      className="px-4 py-2.5 bg-red-950/60 hover:bg-red-900 border border-red-800 text-red-300 font-bold text-xs rounded-xl transition flex items-center gap-1.5"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Disconnect</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {tgStep === 'enter_phone' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="block text-[11px] font-mono text-zinc-400 uppercase">
                        Telegram Phone Number (with Country Code)
                      </label>
                      <input
                        type="text"
                        value={tgPhone}
                        onChange={(e) => setTgPhone(e.target.value)}
                        placeholder="+91 6301253789"
                        className="w-full px-3.5 py-2.5 bg-[#09090b] border border-[#27272a] rounded-xl text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
                      />
                      <p className="text-[11px] text-zinc-500 font-mono">
                        A 5-digit verification code will be sent to your Telegram app.
                      </p>
                    </div>

                    <button
                      onClick={handleRequestTelegramOtp}
                      disabled={tgLoading || !tgPhone.trim()}
                      className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <Send className={`w-3.5 h-3.5 ${tgLoading ? 'animate-pulse' : ''}`} />
                      <span>{tgLoading ? 'Sending Code...' : 'Send Telegram Code'}</span>
                    </button>
                  </div>
                )}

                {tgStep === 'enter_otp' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="block text-[11px] font-mono text-zinc-400 uppercase">
                        Enter 5-Digit Verification Code
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        value={tgOtpCode}
                        onChange={(e) => setTgOtpCode(e.target.value)}
                        placeholder="12345"
                        className="w-full px-3.5 py-2.5 bg-[#09090b] border border-[#27272a] rounded-xl text-white font-mono text-center text-lg tracking-widest focus:outline-none focus:border-cyan-500"
                      />
                      <p className="text-[11px] text-zinc-400 font-mono text-center">
                        Check your Telegram app messages on {tgPhone}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => setTgStep('enter_phone')}
                        className="py-2.5 px-4 bg-zinc-800 text-zinc-300 font-bold text-xs rounded-xl hover:bg-zinc-700 transition"
                      >
                        Change Phone
                      </button>
                      <button
                        onClick={handleVerifyTelegramOtp}
                        disabled={tgLoading || !tgOtpCode.trim()}
                        className="flex-1 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{tgLoading ? 'Verifying...' : 'Verify & Connect'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {tgStep === 'connected' && (
                  <div className="p-6 bg-cyan-950/40 border border-cyan-800 rounded-2xl text-center space-y-2">
                    <CheckCircle2 className="w-8 h-8 text-cyan-400 mx-auto animate-bounce" />
                    <h4 className="text-sm font-bold text-white">Telegram Authenticated!</h4>
                    <p className="text-xs text-zinc-400 font-mono">
                      Listening to placement drive channels in the background.
                    </p>
                  </div>
                )}

                {config.telegramConnected && tgStep === 'enter_phone' && (
                  <div className="pt-2 border-t border-zinc-800 flex justify-between items-center">
                    <span className="text-xs text-emerald-400 font-mono">Session currently active</span>
                    <button
                      onClick={() => {
                        channelManager.disconnectTelegram();
                        refreshState();
                        setShowTelegramModal(false);
                      }}
                      className="px-3 py-1.5 bg-red-950/60 hover:bg-red-900 border border-red-800 text-red-300 font-bold text-xs rounded-lg transition flex items-center gap-1"
                    >
                      <LogOut className="w-3 h-3" />
                      <span>Disconnect</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 3. ADD CUSTOM CHANNEL / GROUP MODAL ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121215] border border-[#27272a] rounded-[28px] max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-purple-950 text-purple-400 border border-purple-800">
                  <Plus className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-extrabold text-white">Add Monitored Channel</h3>
                  <p className="text-[11px] text-zinc-400">Select any group or channel from your socials</p>
                </div>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-zinc-400 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-mono text-zinc-400 uppercase mb-1">Platform</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewChannelPlatform('whatsapp')}
                    className={`py-2 rounded-xl font-bold font-mono border transition flex items-center justify-center gap-1.5 ${
                      newChannelPlatform === 'whatsapp'
                        ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                        : 'bg-[#18181b] text-zinc-400 border-[#27272a]'
                    }`}
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewChannelPlatform('telegram')}
                    className={`py-2 rounded-xl font-bold font-mono border transition flex items-center justify-center gap-1.5 ${
                      newChannelPlatform === 'telegram'
                        ? 'bg-cyan-950 text-cyan-400 border-cyan-800'
                        : 'bg-[#18181b] text-zinc-400 border-[#27272a]'
                    }`}
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Telegram</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-zinc-400 uppercase mb-1">
                  {newChannelPlatform === 'whatsapp' ? 'Group / Channel Name or Invite Link' : 'Channel Name, @handle or t.me link'}
                </label>
                <input
                  type="text"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  placeholder={
                    newChannelPlatform === 'whatsapp'
                      ? 'e.g. My College Placement Group or https://chat.whatsapp.com/...'
                      : 'e.g. @MyTechChannel or https://t.me/...'
                  }
                  className="w-full px-3.5 py-2.5 bg-[#09090b] border border-[#27272a] rounded-xl text-white font-mono text-xs focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-zinc-400 uppercase mb-1">Type</label>
                <select
                  value={newChannelType}
                  onChange={(e) => setNewChannelType(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-[#09090b] border border-[#27272a] rounded-xl text-white font-mono text-xs focus:outline-none"
                >
                  <option value="group">👥 Group (Discussion & Peer Forwards)</option>
                  <option value="channel">📢 Announcement Channel (Broadcast Only)</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 text-zinc-300 font-bold text-xs hover:bg-zinc-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAddChannel}
                disabled={!newChannelName.trim()}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:brightness-110 text-white font-bold text-xs transition disabled:opacity-50"
              >
                Add Channel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
