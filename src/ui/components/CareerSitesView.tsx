import React, { useState, useEffect } from 'react';
import { store } from '../../app-core/store';
import { ICareerWatchlistSite, CareerSiteCategory, IProfile, IJob } from '../../app-core/types';
import { careerCrawler } from '../../app-core/careerCrawler';
import {
  Globe, Plus, RefreshCw, Trash2, Edit3, ExternalLink, CheckCircle2,
  AlertCircle, Building, Search, Sliders, Play, Power, Sparkles,
  ArrowRight, ShieldCheck, Check, X, Loader2, Zap, Filter
} from 'lucide-react';
import { RadarLogoBadge } from './RadarLogo';

interface CareerSitesViewProps {
  profile: IProfile;
  onOpenJob?: (jobId: string) => void;
}

export function CareerSitesView({ profile, onOpenJob }: CareerSitesViewProps) {
  const [sites, setSites] = useState<ICareerWatchlistSite[]>(store.getCareerWatchlist());
  const [activeCategory, setActiveCategory] = useState<string>('all');
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

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSiteId, setEditingSiteId] = useState<string | null>(null);
  const [formCompany, setFormCompany] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formCategory, setFormCategory] = useState<CareerSiteCategory>('Tier 1 Tech');
  const [formKeywords, setFormKeywords] = useState('Software Engineer, Full Stack, React, Node.js, Fresher');

  // Single Site Syncing State
  const [syncingSiteId, setSyncingSiteId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = store.subscribe(() => {
      setSites(store.getCareerWatchlist());
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

  // ── Modal Handlers ──
  const handleOpenAdd = () => {
    setEditingSiteId(null);
    setFormCompany('');
    setFormUrl('');
    setFormCategory('Tier 1 Tech');
    setFormKeywords('Software Engineer, Full Stack, React, Node.js, MCA, Fresher');
    setShowAddModal(true);
  };

  const handleOpenEdit = (site: ICareerWatchlistSite) => {
    setEditingSiteId(site.id);
    setFormCompany(site.companyName);
    setFormUrl(site.careerUrl);
    setFormCategory(site.category);
    setFormKeywords(site.searchKeywords.join(', '));
    setShowAddModal(true);
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
        searchKeywords: keywords,
      });
    } else {
      store.addCareerSite({
        companyName: formCompany.trim(),
        careerUrl: formUrl.trim(),
        category: formCategory,
        enabled: true,
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
    const matchesCat = activeCategory === 'all' || site.category === activeCategory;
    const matchesSearch =
      site.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      site.careerUrl.toLowerCase().includes(searchQuery.toLowerCase()) ||
      site.searchKeywords.some((k) => k.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const enabledCount = sites.filter((s) => s.enabled).length;

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
                <span>Target Career Sites Watcher & Crawler</span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 text-[11px] font-mono font-bold">
                  {enabledCount} MONITORED
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Automatically crawls company career portals and matches openings directly against your LaTeX master resume & candidate profile.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-3">
          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2.5 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 text-xs font-extrabold transition shadow flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>Add Career Site</span>
          </button>

          <button
            type="button"
            onClick={handleSyncAll}
            disabled={isSyncingAll}
            className="px-6 py-2.5 rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-black font-black text-xs transition hover:brightness-110 shadow-xl flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncingAll ? 'animate-spin' : ''}`} />
            <span>{isSyncingAll ? 'Syncing Career Sites...' : '⚡ Sync All Career Sites'}</span>
          </button>
        </div>
      </div>

      {/* ── 2. Live Sync Progress / Report Banner ── */}
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
              Career Sync Completed at {syncReport.completedAt}: Discovered <strong>{syncReport.totalDiscovered}</strong> job postings, matched & queued <strong>{syncReport.suitableAdded}</strong> suitable positions to your Radar Feed!
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

      {/* ── 3. Filters & Search Bar ── */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-[#121215] p-3 rounded-2xl border border-[#27272a]">
        <div className="flex items-center space-x-1.5 overflow-x-auto w-full md:w-auto">
          {[
            { key: 'all', label: 'All Sites' },
            { key: 'Tier 1 Tech', label: 'Tier 1 Tech' },
            { key: 'High-Growth Startup', label: 'Startups' },
            { key: 'MNC / IT Services', label: 'MNCs & IT' },
            { key: 'FinTech / E-Commerce', label: 'FinTech / E-Com' },
            { key: 'Custom', label: 'Custom' },
          ].map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap ${
                activeCategory === cat.key
                  ? 'bg-white text-black shadow'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search company or skill..."
            className="w-full pl-9 pr-3.5 py-1.5 bg-[#18181b] border border-[#27272a] rounded-full text-xs text-white focus:outline-none focus:border-zinc-400 placeholder:text-zinc-600"
          />
        </div>
      </div>

      {/* ── 4. Career Sites Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSites.map((site) => {
          const isSyncingThis = syncingSiteId === site.id || (isSyncingAll && site.enabled);

          return (
            <div
              key={site.id}
              className={`bg-[#121215] border rounded-[22px] p-5 space-y-4 shadow-xl transition flex flex-col justify-between ${
                site.enabled ? 'border-[#27272a] hover:border-zinc-700' : 'border-zinc-900 opacity-60'
              }`}
            >
              {/* Card Top: Logo, Company, Category, Toggle */}
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
                      <span className="text-[10px] font-mono font-semibold px-2 py-0.2 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400">
                        {site.category}
                      </span>
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
                    title="Open career page in browser"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                {/* Search Keywords */}
                <div className="space-y-1">
                  <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider">
                    Target Role Keywords:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {site.searchKeywords.map((kw, kIdx) => (
                      <span
                        key={kIdx}
                        className="px-2 py-0.5 bg-zinc-900 border border-zinc-800 text-zinc-300 text-[10px] font-mono rounded-md"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Card Bottom: Last Synced, Sync Status, Action Buttons */}
              <div className="space-y-3 pt-3 border-t border-zinc-800/80">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-zinc-500">
                    {site.lastSyncedAt
                      ? `Last synced: ${new Date(site.lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
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
                    <span>{isSyncingThis ? 'Crawling...' : 'Sync Site'}</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── 5. Add / Edit Career Site Modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#121215] border border-[#27272a] rounded-[24px] w-full max-w-lg p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <RadarLogoBadge size="sm" />
                <h3 className="text-base font-extrabold text-white">
                  {editingSiteId ? 'Edit Career Site' : 'Add Target Company Career Site'}
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
                  placeholder="e.g. Amazon, Swiggy, Razorpay, Google"
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
                  placeholder="e.g. https://amazon.jobs/en/search?base_query=sde"
                  className="w-full px-3.5 py-2 bg-[#18181b] border border-[#27272a] rounded-xl text-xs text-white font-mono focus:outline-none focus:border-zinc-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                  Company Category
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as CareerSiteCategory)}
                  className="w-full px-3.5 py-2 bg-[#18181b] border border-[#27272a] rounded-xl text-xs text-white focus:outline-none focus:border-zinc-400"
                >
                  <option value="Tier 1 Tech">Tier 1 Tech (FAANG / Big Tech)</option>
                  <option value="High-Growth Startup">High-Growth Startup</option>
                  <option value="MNC / IT Services">MNC / IT Services</option>
                  <option value="FinTech / E-Commerce">FinTech / E-Commerce</option>
                  <option value="Custom">Custom / Other</option>
                </select>
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
