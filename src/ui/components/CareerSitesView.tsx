import React, { useState, useEffect } from 'react';
import { store } from '../../app-core/store';
import { ICareerWatchlistSite, CareerSiteCategory, AtsPlatform, IProfile, IJob } from '../../app-core/types';
import { careerCrawler } from '../../app-core/careerCrawler';
import { atsAdapters } from '../../app-core/atsAdapters';
import { watchlistScheduler } from '../../app-core/watchlistScheduler';
import {
  Globe, Plus, RefreshCw, Trash2, Edit3, ExternalLink, CheckCircle2,
  AlertCircle, Building, Search, Sliders, Play, Power, Sparkles,
  ArrowRight, ShieldCheck, Check, X, Loader2, Zap, Filter, Clock, Download, Upload, Cpu
} from 'lucide-react';
import { RadarLogoBadge } from './RadarLogo';

interface CareerSitesViewProps {
  profile: IProfile;
  onOpenJob?: (jobId: string) => void;
}

export function CareerSitesView({ profile, onOpenJob }: CareerSitesViewProps) {
  const [sites, setSites] = useState<ICareerWatchlistSite[]>(store.getCareerWatchlist());
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [activeAtsFilter, setActiveAtsFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncProgressMsg, setSyncProgressMsg] = useState('');
  const [syncCurrent, setSyncCurrent] = useState(0);
  const [syncTotal, setSyncTotal] = useState(0);
  const [syncReport, setSyncReport] = useState<{
    totalDiscovered: number;
    suitableAdded: number;
    completedAt: string;
  } | null>(null);

  // Scheduler State
  const [schedulerStatus, setSchedulerStatus] = useState(watchlistScheduler.getStatus());
  const [pollingInterval, setPollingInterval] = useState<number>(6);

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSiteId, setEditingSiteId] = useState<string | null>(null);
  const [formCompany, setFormCompany] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formCategory, setFormCategory] = useState<CareerSiteCategory>('Tier 1 Tech');
  const [formAtsProvider, setFormAtsProvider] = useState<AtsPlatform>('generic');
  const [formKeywords, setFormKeywords] = useState('Software Engineer, Full Stack, React, Node.js, Fresher');
  const [formAutoApprove, setFormAutoApprove] = useState<number>(85);

  // Single Site Syncing State
  const [syncingSiteId, setSyncingSiteId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = store.subscribe(() => {
      setSites(store.getCareerWatchlist());
      setSchedulerStatus(watchlistScheduler.getStatus());
    });
    return unsub;
  }, []);

  // ── Sync All Career Sites Action ──
  const handleSyncAll = async () => {
    setIsSyncingAll(true);
    setSyncProgressMsg('Initializing career portals crawler...');
    setSyncReport(null);

    try {
      const report = await careerCrawler.syncAllCareerWatchlist((msg, curr, tot) => {
        setSyncProgressMsg(msg);
        setSyncCurrent(curr);
        setSyncTotal(tot);
      });

      setSyncReport({
        totalDiscovered: report.totalJobsDiscovered,
        suitableAdded: report.suitableJobsAdded,
        completedAt: new Date().toLocaleTimeString(),
      });

      setTimeout(() => {
        setIsSyncingAll(false);
        setSyncProgressMsg('');
      }, 3000);
    } catch (err: any) {
      console.error('Sync all failed:', err);
      setSyncProgressMsg(`Sync error: ${err.message}`);
      setIsSyncingAll(false);
    }
  };

  // ── Sync Single Site Action ──
  const handleSyncSingle = async (site: ICareerWatchlistSite) => {
    setSyncingSiteId(site.id);
    try {
      const res = await careerCrawler.crawlCareerSite(site, profile, store.getMasterResume());
      setSyncReport({
        totalDiscovered: res.jobsFound,
        suitableAdded: res.suitableAdded,
        completedAt: new Date().toLocaleTimeString(),
      });
    } catch (err) {
      console.error('Single sync failed:', err);
    } finally {
      setSyncingSiteId(null);
    }
  };

  // ── Scheduler Toggles ──
  const handleToggleScheduler = () => {
    if (schedulerStatus.isRunning) {
      watchlistScheduler.stopScheduler();
    } else {
      watchlistScheduler.startScheduler(pollingInterval, 85);
    }
    setSchedulerStatus(watchlistScheduler.getStatus());
  };

  const handleChangeInterval = (hours: number) => {
    setPollingInterval(hours);
    if (schedulerStatus.isRunning) {
      watchlistScheduler.startScheduler(hours, 85);
      setSchedulerStatus(watchlistScheduler.getStatus());
    }
  };

  // ── Export / Import Watchlist ──
  const handleExportWatchlist = () => {
    const json = store.exportWatchlistAsJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jobradar_portals_watchlist_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportWatchlist = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        const text = await file.text();
        const res = store.importWatchlistFromJson(text);
        if (res.success) {
          alert(`Successfully imported ${res.importedCount} target companies!`);
        } else {
          alert(`Import failed: ${res.error}`);
        }
      }
    };
    input.click();
  };

  const handleResetDefaults = () => {
    if (confirm('Reset target company watchlist to all 20+ default Tier-1 Tech, AI, and High-Growth Startup portals?')) {
      store.resetCareerWatchlist();
    }
  };

  // ── Modal Handlers ──
  const handleOpenAdd = () => {
    setEditingSiteId(null);
    setFormCompany('');
    setFormUrl('');
    setFormCategory('Tier 1 Tech');
    setFormAtsProvider('generic');
    setFormKeywords('Software Engineer, Full Stack, React, Node.js, Fresher');
    setFormAutoApprove(85);
    setShowAddModal(true);
  };

  const handleOpenEdit = (site: ICareerWatchlistSite) => {
    setEditingSiteId(site.id);
    setFormCompany(site.companyName);
    setFormUrl(site.careerUrl);
    setFormCategory(site.category);
    setFormAtsProvider(site.atsProvider || atsAdapters.detectAtsPlatform(site.careerUrl));
    setFormKeywords(site.searchKeywords.join(', '));
    setFormAutoApprove(site.autoApproveFitThreshold || 85);
    setShowAddModal(true);
  };

  const handleUrlBlur = () => {
    if (formUrl && formAtsProvider === 'generic') {
      const detected = atsAdapters.detectAtsPlatform(formUrl);
      if (detected !== 'generic') {
        setFormAtsProvider(detected);
      }
    }
  };

  const handleSaveSite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCompany.trim() || !formUrl.trim()) return;

    const keywords = formKeywords
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);

    if (editingSiteId) {
      store.updateCareerSite(editingSiteId, {
        companyName: formCompany.trim(),
        careerUrl: formUrl.trim(),
        category: formCategory,
        atsProvider: formAtsProvider,
        searchKeywords: keywords,
        autoApproveFitThreshold: formAutoApprove,
      });
    } else {
      store.addCareerSite({
        companyName: formCompany.trim(),
        careerUrl: formUrl.trim(),
        category: formCategory,
        atsProvider: formAtsProvider,
        enabled: true,
        pollingIntervalHours: pollingInterval,
        autoApproveFitThreshold: formAutoApprove,
        searchKeywords: keywords,
      });
    }

    setShowAddModal(false);
  };

  const handleDeleteSite = (id: string) => {
    if (confirm('Are you sure you want to remove this career site from active monitoring?')) {
      store.deleteCareerSite(id);
    }
  };

  // Filtered Sites
  const filteredSites = sites.filter((site) => {
    const siteAts = site.atsProvider || atsAdapters.detectAtsPlatform(site.careerUrl);
    const matchesAts = activeAtsFilter === 'all' || siteAts === activeAtsFilter;
    const matchesCat = activeCategory === 'all' || site.category === activeCategory;
    const matchesSearch =
      site.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      site.careerUrl.toLowerCase().includes(searchQuery.toLowerCase()) ||
      site.searchKeywords.some((k) => k.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (site.tags && site.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())));
    return matchesAts && matchesCat && matchesSearch;
  });

  const enabledCount = sites.filter((s) => s.enabled).length;

  const atsCounts = {
    all: sites.length,
    greenhouse: sites.filter((s) => (s.atsProvider || atsAdapters.detectAtsPlatform(s.careerUrl)) === 'greenhouse').length,
    ashby: sites.filter((s) => (s.atsProvider || atsAdapters.detectAtsPlatform(s.careerUrl)) === 'ashby').length,
    lever: sites.filter((s) => (s.atsProvider || atsAdapters.detectAtsPlatform(s.careerUrl)) === 'lever').length,
    workable: sites.filter((s) => (s.atsProvider || atsAdapters.detectAtsPlatform(s.careerUrl)) === 'workable').length,
    generic: sites.filter((s) => (s.atsProvider || atsAdapters.detectAtsPlatform(s.careerUrl)) === 'generic').length,
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-200">
      {/* ── 1. Header Banner & Global Actions ── */}
      <div className="p-6 bg-gradient-to-r from-[#121215] via-[#18181b] to-[#121215] border border-[#27272a] rounded-[28px] shadow-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <span className="p-2.5 rounded-2xl bg-emerald-950/80 border border-emerald-800/80 text-emerald-400">
              <Globe className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
                <span>Target ATS Watchlist & Automated Crawler</span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 text-[11px] font-mono font-bold">
                  {enabledCount} ACTIVE TARGETS
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Direct zero-token scraping across <strong>Greenhouse</strong>, <strong>Ashby</strong>, <strong>Lever</strong>, and <strong>Workable</strong> with Playwright headless DOM rendering.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <button
            type="button"
            onClick={handleExportWatchlist}
            className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs font-bold transition flex items-center gap-1.5"
            title="Export target portals as JSON (CareerOps compatible)"
          >
            <Download className="w-3.5 h-3.5 text-zinc-400" />
            <span>Export</span>
          </button>

          <button
            type="button"
            onClick={handleImportWatchlist}
            className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs font-bold transition flex items-center gap-1.5"
            title="Import target portals from JSON file"
          >
            <Upload className="w-3.5 h-3.5 text-zinc-400" />
            <span>Import</span>
          </button>

          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs font-bold transition flex items-center gap-1.5"
            title="Reset to 20+ Pre-Configured Tech Portals"
          >
            <RefreshCw className="w-3.5 h-3.5 text-teal-400" />
            <span>Defaults</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 text-xs font-extrabold transition shadow flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>Add Target</span>
          </button>

          <button
            type="button"
            onClick={handleSyncAll}
            disabled={isSyncingAll}
            className="px-5 py-2 rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-black font-black text-xs transition hover:brightness-110 shadow-xl flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncingAll ? 'animate-spin' : ''}`} />
            <span>{isSyncingAll ? 'Scanning All ATS Portals...' : '⚡ Scan All Portals Now'}</span>
          </button>
        </div>
      </div>

      {/* ── 2. Background Polling Scheduler Control Bar ── */}
      <div className="p-4 bg-[#121215] border border-zinc-800/80 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-xl border ${
            schedulerStatus.isRunning ? 'bg-emerald-950/60 border-emerald-800 text-emerald-400' : 'bg-zinc-900 border-zinc-800 text-zinc-500'
          }`}>
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-white">Autonomous Background Polling Scheduler:</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                schedulerStatus.isRunning
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  : 'bg-zinc-900 text-zinc-500 border border-zinc-800'
              }`}>
                {schedulerStatus.isRunning ? 'ACTIVE (POLLING)' : 'PAUSED'}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 font-mono">
              {schedulerStatus.nextRunAt
                ? `Next scheduled poll cycle at: ${new Date(schedulerStatus.nextRunAt).toLocaleTimeString()}`
                : 'Scheduler paused. Enable to automatically discover and ingest matching openings.'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
            {[1, 6, 12, 24].map((hrs) => (
              <button
                key={hrs}
                type="button"
                onClick={() => handleChangeInterval(hrs)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition ${
                  pollingInterval === hrs ? 'bg-emerald-500 text-black font-black' : 'text-zinc-400 hover:text-white'
                }`}
              >
                {hrs}h
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleToggleScheduler}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
              schedulerStatus.isRunning
                ? 'bg-zinc-900 text-zinc-300 border-zinc-700 hover:bg-zinc-800'
                : 'bg-emerald-950 text-emerald-400 border-emerald-800 hover:bg-emerald-900'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            <span>{schedulerStatus.isRunning ? 'Pause Scheduler' : 'Start Auto-Polling'}</span>
          </button>
        </div>
      </div>

      {/* ── 3. Live Sync Progress / Report Banner ── */}
      {isSyncingAll && (
        <div className="p-4 bg-[#121215] border border-emerald-800/80 rounded-2xl space-y-2.5 shadow-xl animate-in fade-in">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-emerald-400 font-bold flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              {syncProgressMsg}
            </span>
            <span className="text-zinc-400 font-bold">
              {syncCurrent} / {syncTotal} Sites
            </span>
          </div>
          <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden border border-zinc-800">
            <div
              className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-300"
              style={{ width: syncTotal > 0 ? `${(syncCurrent / syncTotal) * 100}%` : '10%' }}
            />
          </div>
        </div>
      )}

      {syncReport && !isSyncingAll && (
        <div className="p-4 bg-emerald-950/40 border border-emerald-800/70 rounded-2xl flex items-center justify-between gap-4 text-xs font-mono text-emerald-300 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Portal Scan Completed at {syncReport.completedAt}: Discovered <strong>{syncReport.totalDiscovered}</strong> job postings, matched & queued <strong>{syncReport.suitableAdded}</strong> high-fit positions to your Radar Pipeline!
            </span>
          </div>
          <button
            onClick={() => setSyncReport(null)}
            className="text-zinc-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── 4. ATS Provider & Category Filters ── */}
      <div className="space-y-3 bg-[#121215] p-3.5 rounded-2xl border border-[#27272a]">
        {/* ATS Adapter Selector Tabs */}
        <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-zinc-800/80">
          <div className="flex items-center space-x-1.5 overflow-x-auto">
            <span className="text-[11px] font-mono font-bold text-zinc-500 uppercase mr-1">ATS Adapters:</span>
            {[
              { key: 'all', label: `All (${atsCounts.all})` },
              { key: 'greenhouse', label: `Greenhouse (${atsCounts.greenhouse})` },
              { key: 'ashby', label: `Ashby (${atsCounts.ashby})` },
              { key: 'lever', label: `Lever (${atsCounts.lever})` },
              { key: 'workable', label: `Workable (${atsCounts.workable})` },
              { key: 'generic', label: `Custom / Generic (${atsCounts.generic})` },
            ].map((ats) => (
              <button
                key={ats.key}
                type="button"
                onClick={() => setActiveAtsFilter(ats.key)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  activeAtsFilter === ats.key
                    ? 'bg-emerald-500 text-black font-black shadow'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                {ats.label}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search company, ATS, or skill..."
              className="w-full pl-9 pr-3.5 py-1.5 bg-[#18181b] border border-[#27272a] rounded-full text-xs text-white focus:outline-none focus:border-zinc-400 placeholder:text-zinc-600"
            />
          </div>
        </div>

        {/* Category Selector */}
        <div className="flex items-center space-x-1.5 overflow-x-auto">
          {[
            { key: 'all', label: 'All Categories' },
            { key: 'Tier 1 Tech', label: 'Tier 1 Tech' },
            { key: 'AI / Machine Learning', label: 'AI & ML' },
            { key: 'High-Growth Startup', label: 'Startups' },
            { key: 'FinTech / E-Commerce', label: 'FinTech' },
            { key: 'MNC / IT Services', label: 'MNCs & IT' },
          ].map((cat) => (
            <button
              key={cat.key}
              type="button"
              onClick={() => setActiveCategory(cat.key)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition whitespace-nowrap ${
                activeCategory === cat.key
                  ? 'bg-white text-black shadow'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── 5. Career Sites Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSites.map((site) => {
          const isSyncingThis = syncingSiteId === site.id || (isSyncingAll && site.enabled);
          const detectedAts = site.atsProvider || atsAdapters.detectAtsPlatform(site.careerUrl);

          return (
            <div
              key={site.id}
              className={`bg-[#121215] border rounded-[22px] p-5 space-y-4 shadow-xl transition flex flex-col justify-between ${
                site.enabled ? 'border-[#27272a] hover:border-zinc-700' : 'border-zinc-900 opacity-60'
              }`}
            >
              {/* Card Top: Logo, Company, Category, ATS Badge, Toggle */}
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center space-x-3 truncate">
                    <div className="w-10 h-10 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-sm font-black text-white shrink-0">
                      {site.companyName.charAt(0)}
                    </div>
                    <div className="truncate">
                      <h3 className="text-base font-extrabold text-white truncate flex items-center gap-1.5">
                        <span>{site.companyName}</span>
                      </h3>
                      <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.2 rounded-full border ${
                          detectedAts === 'greenhouse'
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                            : detectedAts === 'ashby'
                            ? 'bg-purple-950 text-purple-300 border-purple-800'
                            : detectedAts === 'lever'
                            ? 'bg-blue-950 text-blue-300 border-blue-800'
                            : detectedAts === 'workable'
                            ? 'bg-amber-950 text-amber-300 border-amber-800'
                            : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                        }`}>
                          {detectedAts.toUpperCase()}
                        </span>
                        <span className="text-[10px] font-mono text-zinc-400 px-2 py-0.2 rounded-full bg-zinc-900 border border-zinc-800">
                          {site.category}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => store.toggleCareerSite(site.id)}
                    className={`p-1.5 rounded-full border transition ${
                      site.enabled
                        ? 'bg-emerald-950 text-emerald-400 border-emerald-800 hover:bg-emerald-900'
                        : 'bg-zinc-900 text-zinc-600 border-zinc-800 hover:text-zinc-400'
                    }`}
                    title={site.enabled ? 'Disable site monitoring' : 'Enable site monitoring'}
                  >
                    <Power className="w-4 h-4" />
                  </button>
                </div>

                {/* Monitored URL Snippet */}
                <div className="p-2.5 bg-[#18181b] rounded-xl border border-zinc-800/80 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono text-zinc-400 truncate">
                    {site.careerUrl}
                  </span>
                  <a
                    href={site.careerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-zinc-400 hover:text-white shrink-0"
                    title="Open career portal in browser"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                {/* Tags & Search Keywords */}
                <div className="space-y-1">
                  <div className="flex flex-wrap gap-1">
                    {site.tags && site.tags.map((t, tIdx) => (
                      <span key={`t-${tIdx}`} className="px-1.5 py-0.2 bg-zinc-900 border border-zinc-800 text-teal-400 text-[9px] font-mono rounded">
                        #{t}
                      </span>
                    ))}
                    {site.searchKeywords.slice(0, 4).map((kw, kIdx) => (
                      <span
                        key={kIdx}
                        className="px-2 py-0.5 bg-zinc-900 border border-zinc-800 text-zinc-300 text-[10px] font-mono rounded-md"
                      >
                        {kw}
                      </span>
                    ))}
                    {site.searchKeywords.length > 4 && (
                      <span className="text-[10px] font-mono text-zinc-500">
                        +{site.searchKeywords.length - 4} more
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Card Bottom: Last Synced, Sync Status, Action Buttons */}
              <div className="space-y-3 pt-3 border-t border-zinc-800/80">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-zinc-500">
                    {site.lastSyncedAt
                      ? `Last: ${new Date(site.lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                      : 'Not synced yet'}
                  </span>
                  <span className={`px-2 py-0.2 rounded-full font-bold ${
                    site.lastSyncStatus === 'success'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : site.lastSyncStatus === 'error'
                      ? 'bg-red-950 text-red-400 border border-red-800'
                      : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                  }`}>
                    {site.lastSyncStatus === 'syncing' ? 'Syncing...' : site.lastSyncStatus || 'idle'}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(site)}
                      className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
                      title="Edit Site Details"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSite(site.id)}
                      className="p-1.5 rounded-lg bg-zinc-900 hover:bg-red-950 text-zinc-400 hover:text-red-400 transition"
                      title="Delete from Watchlist"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSyncSingle(site)}
                    disabled={isSyncingThis || !site.enabled}
                    className="px-3.5 py-1.5 rounded-full bg-zinc-900 hover:bg-white text-zinc-300 hover:text-black font-extrabold text-xs border border-zinc-800 transition flex items-center gap-1.5 disabled:opacity-40"
                  >
                    <RefreshCw className={`w-3 h-3 ${isSyncingThis ? 'animate-spin text-emerald-400' : ''}`} />
                    <span>{isSyncingThis ? 'Scanning ATS...' : 'Scan Portal'}</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── 6. Add / Edit Career Site Modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#121215] border border-[#27272a] rounded-[24px] w-full max-w-lg p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <RadarLogoBadge size="sm" />
                <h3 className="text-base font-extrabold text-white">
                  {editingSiteId ? 'Edit Target Portal' : 'Add Target Company Portal'}
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSite} className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                  Company Name
                </label>
                <input
                  type="text"
                  required
                  value={formCompany}
                  onChange={(e) => setFormCompany(e.target.value)}
                  placeholder="e.g. Stripe, OpenAI, Vercel, Swiggy"
                  className="w-full px-3.5 py-2 bg-[#18181b] border border-[#27272a] rounded-xl text-xs text-white focus:outline-none focus:border-zinc-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                  Career Portal URL
                </label>
                <input
                  type="url"
                  required
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  onBlur={handleUrlBlur}
                  placeholder="e.g. https://boards.greenhouse.io/stripe or https://jobs.ashbyhq.com/vercel"
                  className="w-full px-3.5 py-2 bg-[#18181b] border border-[#27272a] rounded-xl text-xs text-white font-mono focus:outline-none focus:border-zinc-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                    ATS Provider
                  </label>
                  <select
                    value={formAtsProvider}
                    onChange={(e) => setFormAtsProvider(e.target.value as AtsPlatform)}
                    className="w-full px-3 py-2 bg-[#18181b] border border-[#27272a] rounded-xl text-xs text-white focus:outline-none focus:border-zinc-400"
                  >
                    <option value="generic">Auto-Detect / Generic</option>
                    <option value="greenhouse">Greenhouse (boards-api)</option>
                    <option value="ashby">Ashby (api.ashbyhq)</option>
                    <option value="lever">Lever (api.lever.co)</option>
                    <option value="workable">Workable (apply.workable)</option>
                    <option value="smartrecruiters">SmartRecruiters</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                    Company Category
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as CareerSiteCategory)}
                    className="w-full px-3 py-2 bg-[#18181b] border border-[#27272a] rounded-xl text-xs text-white focus:outline-none focus:border-zinc-400"
                  >
                    <option value="Tier 1 Tech">Tier 1 Tech</option>
                    <option value="AI / Machine Learning">AI & Machine Learning</option>
                    <option value="High-Growth Startup">High-Growth Startup</option>
                    <option value="FinTech / E-Commerce">FinTech / E-Commerce</option>
                    <option value="MNC / IT Services">MNC / IT Services</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                  Target Role Keywords (Comma separated)
                </label>
                <input
                  type="text"
                  value={formKeywords}
                  onChange={(e) => setFormKeywords(e.target.value)}
                  placeholder="Software Engineer, React, Full Stack, MCA, Fresher"
                  className="w-full px-3.5 py-2 bg-[#18181b] border border-[#27272a] rounded-xl text-xs text-white focus:outline-none focus:border-zinc-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                  Auto-Approval Fit Threshold ({formAutoApprove}%)
                </label>
                <input
                  type="range"
                  min="50"
                  max="95"
                  step="5"
                  value={formAutoApprove}
                  onChange={(e) => setFormAutoApprove(Number(e.target.value))}
                  className="w-full accent-emerald-400"
                />
                <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                  <span>50% (Broad)</span>
                  <span className="text-emerald-400 font-bold">{formAutoApprove}% (Current)</span>
                  <span>95% (Strict FAANG)</span>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-bold text-zinc-400 hover:text-white rounded-full transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-black font-extrabold text-xs transition hover:brightness-110 shadow-lg"
                >
                  {editingSiteId ? 'Save Changes' : 'Add to Watchlist'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
