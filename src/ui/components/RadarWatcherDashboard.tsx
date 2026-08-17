import React, { useState, useEffect } from 'react';
import { IWatcherConfig, IChannelSource, IRadarFeedItem, IJob, IProfile } from '../../app-core/types';
import { channelManager } from '../../app-core/channelManager';
import {
  Radio, MessageCircle, Send, CheckCircle2, XCircle, AlertCircle,
  RefreshCw, Plus, Trash2, Power, Eye, Zap, ShieldCheck, Sparkles,
  ExternalLink, Copy, Sliders, Smartphone, QrCode
} from 'lucide-react';

interface RadarWatcherDashboardProps {
  profile: IProfile;
  onOpenJob: (jobId: string) => void;
}

export function RadarWatcherDashboard({ profile, onOpenJob }: RadarWatcherDashboardProps) {
  const [config, setConfig] = useState<IWatcherConfig>(channelManager.getConfig());
  const [feed, setFeed] = useState<IRadarFeedItem[]>(channelManager.getFeed());
  const [testInput, setTestInput] = useState('');
  const [testChannel, setTestChannel] = useState('Aditya Placement Cell 2026 (MCA/BTech)');
  const [testPlatform, setTestPlatform] = useState<'whatsapp' | 'telegram'>('whatsapp');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelPlatform, setNewChannelPlatform] = useState<'whatsapp' | 'telegram'>('whatsapp');
  const [newChannelType, setNewChannelType] = useState<'group' | 'channel'>('group');
  const [showQrModal, setShowQrModal] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'approved' | 'extracted' | 'noise'>('all');

  useEffect(() => {
    // Request notification permission if not granted
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const handleToggle = (id: string, current: boolean) => {
    channelManager.toggleChannel(id, !current);
    setConfig(channelManager.getConfig());
  };

  const handleAddChannel = () => {
    if (!newChannelName.trim()) return;
    channelManager.addChannel({
      platform: newChannelPlatform,
      type: newChannelType,
      name: newChannelName.trim(),
      enabled: true,
    });
    setConfig(channelManager.getConfig());
    setNewChannelName('');
    setShowAddModal(false);
  };

  const handleRemoveChannel = (id: string) => {
    channelManager.removeChannel(id);
    setConfig(channelManager.getConfig());
  };

  const handleSimulateIngest = async () => {
    if (!testInput.trim()) return;
    setIsProcessing(true);
    try {
      await channelManager.ingestIncomingMessage(testPlatform, testChannel, testInput);
      setFeed(channelManager.getFeed());
      setConfig(channelManager.getConfig());
      setTestInput('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
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
            Real-time multi-channel background listener for WhatsApp groups, Telegram channels, and campus placement feeds.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowQrModal(true)}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow"
          >
            <QrCode className="w-4 h-4" />
            <span>WhatsApp Web QR</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Channel / Group</span>
          </button>
        </div>
      </div>

      {/* ── Active Listener Summary Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* WhatsApp Status */}
        <div className="p-5 bg-[#121215] border border-[#27272a] rounded-[20px] space-y-3 shadow">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-950/70 border border-emerald-800/70 text-emerald-400">
                <MessageCircle className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-xs font-bold text-white uppercase font-mono">WhatsApp Bridge</h3>
                <p className="text-[11px] text-zinc-400">{config.whatsappPhone || 'Linked Device Active'}</p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-mono font-bold">
              ONLINE
            </span>
          </div>
          <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs font-mono">
            <span className="text-zinc-400">Monitored Chats:</span>
            <span className="text-white font-bold">
              {config.monitoredChannels.filter((c) => c.platform === 'whatsapp' && c.enabled).length} Active
            </span>
          </div>
        </div>

        {/* Telegram Status */}
        <div className="p-5 bg-[#121215] border border-[#27272a] rounded-[20px] space-y-3 shadow">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-cyan-950/70 border border-cyan-800/70 text-cyan-400">
                <Send className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-xs font-bold text-white uppercase font-mono">Telegram MTProto</h3>
                <p className="text-[11px] text-zinc-400">{config.telegramPhone || 'User Session Connected'}</p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 text-[10px] font-mono font-bold">
              ONLINE
            </span>
          </div>
          <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs font-mono">
            <span className="text-zinc-400">Monitored Channels:</span>
            <span className="text-white font-bold">
              {config.monitoredChannels.filter((c) => c.platform === 'telegram' && c.enabled).length} Active
            </span>
          </div>
        </div>

        {/* Total Captured Metrics */}
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
            </div>

            <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
              {config.monitoredChannels.map((channel) => (
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
                        {channel.memberCount && <span>• {channel.memberCount.toLocaleString()} members</span>}
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
              ))}
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

      {/* ── WhatsApp QR Pairing Modal ── */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121215] border border-[#27272a] rounded-[28px] max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-800">
                  <Smartphone className="w-5 h-5" />
                </span>
                <h3 className="text-base font-extrabold text-white">Link WhatsApp Session</h3>
              </div>
              <button onClick={() => setShowQrModal(false)} className="text-zinc-400 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 bg-white rounded-2xl flex flex-col items-center justify-center space-y-3">
              <img
                src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=JOBRADAR_WHATSAPP_LINK_SESSION_DEMO"
                alt="WhatsApp QR Code"
                className="w-48 h-48 rounded-lg shadow"
              />
              <p className="text-xs text-zinc-800 font-mono font-bold text-center">
                Scan from WhatsApp &gt; Linked Devices &gt; Link a Device
              </p>
            </div>

            <div className="space-y-2 text-xs text-zinc-400 leading-relaxed font-mono">
              <p>✓ Runs locally in background as read-only listener</p>
              <p>✓ Zero cloud transmission — session stored in app data</p>
              <p>✓ Monitored only for whitelisted placement groups</p>
            </div>

            <button
              onClick={() => setShowQrModal(false)}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition"
            >
              Done / Session Active
            </button>
          </div>
        </div>
      )}

      {/* ── Add Custom Channel Modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121215] border border-[#27272a] rounded-[28px] max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-white">Add Monitored Channel / Group</h3>
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
                    className={`py-2 rounded-xl font-bold border transition ${
                      newChannelPlatform === 'whatsapp'
                        ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                        : 'bg-[#18181b] text-zinc-400 border-[#27272a]'
                    }`}
                  >
                    WhatsApp
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewChannelPlatform('telegram')}
                    className={`py-2 rounded-xl font-bold border transition ${
                      newChannelPlatform === 'telegram'
                        ? 'bg-cyan-950 text-cyan-400 border-cyan-800'
                        : 'bg-[#18181b] text-zinc-400 border-[#27272a]'
                    }`}
                  >
                    Telegram
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-zinc-400 uppercase mb-1">Channel / Group Name</label>
                <input
                  type="text"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  placeholder="e.g. Aditya Placement Cell 2026"
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
                  <option value="group">👥 Group (Discussion & Forwards)</option>
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
                className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition disabled:opacity-50"
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
