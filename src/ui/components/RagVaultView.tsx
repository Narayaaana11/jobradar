import React, { useState, useEffect, useRef } from 'react';
import {
  Brain, Sparkles, Database, Search, FileText, Plus, Trash2, Edit3,
  Check, Copy, RotateCcw, RefreshCw, Zap, BookOpen, Tag, Sliders,
  MessageSquare, Send, Eye, Layers, Cpu, FileCode, CheckCircle2,
  AlertCircle, ChevronDown, ChevronUp, ArrowRight, ShieldCheck
} from 'lucide-react';
import { knowledgeVault } from '../../app-core/rag/knowledgeStore';
import { ragAugmentor } from '../../app-core/rag/ragAugmentor';
import {
  IKnowledgeDocument,
  IDocumentChunk,
  ISearchResult,
  KnowledgeCategory,
  IRagChatMessage,
  IRagCitation,
  IVaultStats,
} from '../../app-core/rag/types';
import { IProfile } from '../../app-core/types';

interface RagVaultViewProps {
  profile: IProfile;
  onOpenSettings?: () => void;
}

const CATEGORY_COLORS: Record<KnowledgeCategory, { bg: string; text: string; border: string }> = {
  resume: { bg: 'bg-blue-950/40', text: 'text-blue-400', border: 'border-blue-800/60' },
  project: { bg: 'bg-emerald-950/40', text: 'text-emerald-400', border: 'border-emerald-800/60' },
  experience: { bg: 'bg-purple-950/40', text: 'text-purple-400', border: 'border-purple-800/60' },
  star_story: { bg: 'bg-amber-950/40', text: 'text-amber-400', border: 'border-amber-800/60' },
  tech_note: { bg: 'bg-cyan-950/40', text: 'text-cyan-400', border: 'border-cyan-800/60' },
  job_market: { bg: 'bg-rose-950/40', text: 'text-rose-400', border: 'border-rose-800/60' },
  custom: { bg: 'bg-zinc-800/50', text: 'text-zinc-300', border: 'border-zinc-700' },
};

const SUGGESTED_PROMPTS = [
  '🎯 What are my strongest project highlights for a Senior React & Node.js role?',
  '⚡ Find STAR stories matching: "Tell me about a high-stress debugging incident"',
  '📝 Draft a 60-second elevator pitch highlighting AUSVMS and Guard Hub',
  '🔍 How does my MongoDB aggregation experience address system scalability?',
  '💡 Which system design patterns in my vault apply to WebSockets & real-time apps?',
];

export function RagVaultView({ profile, onOpenSettings }: RagVaultViewProps) {
  const [activeTab, setActiveTab] = useState<'chat' | 'documents' | 'search_lab'>('chat');
  const [stats, setStats] = useState<IVaultStats>(knowledgeVault.getStats());
  const [documents, setDocuments] = useState<IKnowledgeDocument[]>(knowledgeVault.getDocuments());
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [docSearchQuery, setDocSearchQuery] = useState('');

  // ── Chat State ──
  const [chatMessages, setChatMessages] = useState<IRagChatMessage[]>([
    {
      id: 'welcome-msg',
      role: 'assistant',
      content: `Hello **${profile.name.split(' ')[0] || 'Narayana'}**! I am your **JobRadar AI Career Copilot** powered by **Retrieval-Augmented Generation (RAG)**.\n\nI have indexed your **Master Resume**, **Project Deep Dives (AUSVMS, Guard Hub, Matrix Library, JobRadar)**, **STAR Stories Bank**, and **System Design Notes**.\n\nAsk me anything about tailoring your pitch, preparing for interviews, or querying your knowledge base!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isQuerying, setIsQuerying] = useState(false);
  const [expandedCitations, setExpandedCitations] = useState<Record<string, boolean>>({});
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // ── Search Lab State ──
  const [labQuery, setLabQuery] = useState('MongoDB aggregation pipeline performance optimization');
  const [labTopK, setLabTopK] = useState(4);
  const [labHybrid, setLabHybrid] = useState(true);
  const [labResults, setLabResults] = useState<ISearchResult[]>([]);

  // ── Modals / Forms ──
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<IKnowledgeDocument | null>(null);
  const [inspectingDocChunks, setInspectingDocChunks] = useState<{ doc: IKnowledgeDocument; chunks: IDocumentChunk[] } | null>(null);
  const [bannerMsg, setBannerMsg] = useState('');

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<KnowledgeCategory>('project');
  const [formTags, setFormTags] = useState('');
  const [formContent, setFormContent] = useState('');

  // Subscribe to reactive knowledge vault updates
  useEffect(() => {
    const unsub = knowledgeVault.subscribe(() => {
      setStats(knowledgeVault.getStats());
      setDocuments(knowledgeVault.getDocuments());
    });
    return unsub;
  }, []);

  // Run initial Search Lab query
  useEffect(() => {
    if (labQuery.trim()) {
      const res = knowledgeVault.searchHybrid(labQuery, { topK: labTopK, hybridSearch: labHybrid });
      setLabResults(res);
    }
  }, [labQuery, labTopK, labHybrid, documents]);

  // Scroll chat to bottom on new message
  useEffect(() => {
    if (activeTab === 'chat') {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, activeTab]);

  const showBanner = (msg: string) => {
    setBannerMsg(msg);
    setTimeout(() => setBannerMsg(''), 4000);
  };

  // ── Chat Submission ──
  const handleSendMessage = async (queryText?: string) => {
    const textToSend = queryText || inputQuery;
    if (!textToSend.trim() || isQuerying) return;

    const userMsg: IRagChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    if (!queryText) setInputQuery('');
    setIsQuerying(true);

    try {
      const response = await ragAugmentor.queryRagChat(
        textToSend.trim(),
        chatMessages,
        profile.apiKey
      );

      const assistantMsg: IRagChatMessage = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        content: response.content,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        citations: response.citations,
        modelUsed: response.modelUsed,
        queryTimeMs: response.queryTimeMs,
      };

      setChatMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: IRagChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ Failed to process RAG query: ${err.message}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsQuerying(false);
    }
  };

  // ── Document Operations ──
  const handleOpenAddModal = () => {
    setEditingDoc(null);
    setFormTitle('');
    setFormCategory('project');
    setFormTags('MERN, FullStack');
    setFormContent('# Project Title\n\n## Overview\nDescribe the system...\n\n## Key Metrics\n- Metric 1...');
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (doc: IKnowledgeDocument) => {
    setEditingDoc(doc);
    setFormTitle(doc.title);
    setFormCategory(doc.category);
    setFormTags(doc.tags.join(', '));
    setFormContent(doc.content);
    setIsAddModalOpen(true);
  };

  const handleSaveDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formContent.trim()) return;

    const tagsArray = formTags.split(',').map((t) => t.trim()).filter(Boolean);

    if (editingDoc) {
      knowledgeVault.updateDocument(editingDoc.id, {
        title: formTitle.trim(),
        category: formCategory,
        tags: tagsArray,
        content: formContent.trim(),
      });
      showBanner(`Updated "${formTitle}" and re-indexed vector chunks!`);
    } else {
      knowledgeVault.addDocument({
        title: formTitle.trim(),
        category: formCategory,
        tags: tagsArray,
        content: formContent.trim(),
        enabled: true,
      });
      showBanner(`Added "${formTitle}" to Knowledge Vault!`);
    }

    setIsAddModalOpen(false);
  };

  const handleDeleteDocument = (id: string, title: string) => {
    if (confirm(`Are you sure you want to delete "${title}" from the Knowledge Vault?`)) {
      knowledgeVault.deleteDocument(id);
      showBanner(`Deleted "${title}" from Knowledge Vault.`);
    }
  };

  const handleReindex = () => {
    knowledgeVault.reindexAll();
    showBanner(`Re-indexed all ${stats.totalDocuments} documents into 384-D vector store!`);
  };

  const handleResetSeed = () => {
    if (confirm('Reset Knowledge Vault to default candidate seed documents? Any custom additions will be replaced.')) {
      knowledgeVault.resetToSeed();
      showBanner('Knowledge Vault reset to verified default master records!');
    }
  };

  const handleInspectChunks = (doc: IKnowledgeDocument) => {
    const allChunks = knowledgeVault.getChunks();
    const docChunks = allChunks.filter((c) => c.documentId === doc.id);
    setInspectingDocChunks({ doc, chunks: docChunks });
  };

  // Filtered document list
  const filteredDocs = documents.filter((doc) => {
    if (selectedCategory !== 'all' && doc.category !== selectedCategory) {
      return false;
    }
    if (docSearchQuery.trim()) {
      const q = docSearchQuery.toLowerCase();
      const match =
        doc.title.toLowerCase().includes(q) ||
        doc.tags.some((t) => t.toLowerCase().includes(q)) ||
        doc.content.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* ── 1. HEADER & METRIC CARDS ── */}
      <div className="bg-[#121215] border border-[#27272a] rounded-[24px] p-6 md:p-8 shadow-2xl relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-gradient-to-tr from-emerald-600 to-teal-500 rounded-2xl shadow-lg shadow-emerald-500/20 text-black">
                <Brain className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
                  <span>Career Knowledge Vault & RAG</span>
                  <span className="text-[10px] font-mono font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-950 border border-emerald-700/60 text-emerald-400">
                    Offline Vector Engine
                  </span>
                </h2>
                <p className="text-xs text-zinc-400 font-medium">
                  Evidence-grounded vector retrieval combining 384-D dense embeddings with BM25 lexical rank fusion.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleReindex}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700 rounded-full text-xs font-bold text-zinc-200 transition shadow-sm"
              title="Re-compute all vector embeddings and BM25 indexes"
            >
              <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
              <span>Re-index Chunks</span>
            </button>
            <button
              onClick={handleOpenAddModal}
              className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black rounded-full text-xs font-black transition shadow-lg shadow-emerald-500/20"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Add Document</span>
            </button>
            <button
              onClick={handleResetSeed}
              className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-full text-zinc-400 hover:text-zinc-200 transition"
              title="Reset to Master Candidate Records"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Metric Badges Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-zinc-800/80">
          <div className="bg-[#18181b]/80 border border-zinc-800 p-3.5 rounded-2xl">
            <div className="flex items-center justify-between text-zinc-400 text-[11px] font-semibold mb-1">
              <span>Knowledge Docs</span>
              <BookOpen className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="text-xl font-black text-white">{stats.totalDocuments}</div>
            <div className="text-[10px] text-zinc-500 mt-0.5">Master portfolio records</div>
          </div>

          <div className="bg-[#18181b]/80 border border-zinc-800 p-3.5 rounded-2xl">
            <div className="flex items-center justify-between text-zinc-400 text-[11px] font-semibold mb-1">
              <span>Vector Chunks</span>
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-xl font-black text-white">{stats.totalChunks}</div>
            <div className="text-[10px] text-zinc-500 mt-0.5">{stats.totalTokens.toLocaleString()} tokens indexed</div>
          </div>

          <div className="bg-[#18181b]/80 border border-zinc-800 p-3.5 rounded-2xl">
            <div className="flex items-center justify-between text-zinc-400 text-[11px] font-semibold mb-1">
              <span>Embedding Dim</span>
              <Cpu className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="text-xl font-black text-white">384-D</div>
            <div className="text-[10px] text-zinc-500 mt-0.5">Normalized L2 Dense</div>
          </div>

          <div className="bg-[#18181b]/80 border border-zinc-800 p-3.5 rounded-2xl">
            <div className="flex items-center justify-between text-zinc-400 text-[11px] font-semibold mb-1">
              <span>Hybrid Search</span>
              <Zap className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-xl font-black text-emerald-400">RRF + BM25</div>
            <div className="text-[10px] text-zinc-500 mt-0.5">Cosine + Lexical Fusion</div>
          </div>
        </div>

        {bannerMsg && (
          <div className="mt-4 p-3 bg-emerald-950/80 border border-emerald-700/80 rounded-2xl text-xs text-emerald-300 font-semibold flex items-center space-x-2 animate-in fade-in-50 duration-150">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{bannerMsg}</span>
          </div>
        )}
      </div>

      {/* ── 2. SUB-TAB SELECTOR ── */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
        <div className="flex items-center space-x-2 bg-[#121215] p-1.5 rounded-full border border-zinc-800">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center space-x-2 px-5 py-2 rounded-full text-xs font-black transition ${
              activeTab === 'chat'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-black shadow-md shadow-emerald-500/20'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>AI Career Copilot (Chat)</span>
          </button>

          <button
            onClick={() => setActiveTab('documents')}
            className={`flex items-center space-x-2 px-5 py-2 rounded-full text-xs font-black transition ${
              activeTab === 'documents'
                ? 'bg-white text-black shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Knowledge Vault ({documents.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('search_lab')}
            className={`flex items-center space-x-2 px-5 py-2 rounded-full text-xs font-black transition ${
              activeTab === 'search_lab'
                ? 'bg-white text-black shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Vector Search Lab</span>
          </button>
        </div>

        <div className="text-[11px] font-mono text-zinc-500 hidden sm:block">
          Profile: <span className="text-zinc-300 font-bold">{profile.name}</span>
        </div>
      </div>

      {/* ── 3. TAB 1: AI CAREER COPILOT (CHAT WITH CITATIONS) ── */}
      {activeTab === 'chat' && (
        <div className="bg-[#121215] border border-[#27272a] rounded-[24px] p-6 shadow-xl flex flex-col h-[650px] relative">
          {/* Quick Suggested Prompts Bar */}
          <div className="mb-4 pb-3 border-b border-zinc-800/80">
            <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              <span>Suggested RAG Queries:</span>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              {SUGGESTED_PROMPTS.map((promptText, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(promptText)}
                  className="px-3 py-1.5 bg-[#18181b] hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded-full text-[11px] text-zinc-300 whitespace-nowrap transition flex-shrink-0"
                >
                  {promptText}
                </button>
              ))}
            </div>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {chatMessages.map((msg) => {
              const isUser = msg.role === 'user';
              const isCitationsExpanded = expandedCitations[msg.id] ?? false;

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1.5`}
                >
                  <div className="flex items-center space-x-2 text-[10px] text-zinc-500 font-mono">
                    <span className="font-bold text-zinc-400">
                      {isUser ? 'You' : 'JobRadar Copilot'}
                    </span>
                    <span>•</span>
                    <span>{msg.timestamp}</span>
                    {msg.modelUsed && (
                      <>
                        <span>•</span>
                        <span className="px-1.5 py-0.2 bg-zinc-800 text-zinc-300 rounded-full">
                          {msg.modelUsed}
                        </span>
                      </>
                    )}
                    {typeof msg.queryTimeMs === 'number' && (
                      <span>({msg.queryTimeMs}ms)</span>
                    )}
                  </div>

                  <div
                    className={`p-4 rounded-2xl max-w-2xl text-xs leading-relaxed ${
                      isUser
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-black font-semibold shadow-md shadow-emerald-500/10 rounded-br-none'
                        : 'bg-[#18181b] border border-zinc-800 text-zinc-200 rounded-bl-none shadow-lg'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.content}</div>

                    {/* Citations Accordion (Assistant only) */}
                    {!isUser && msg.citations && msg.citations.length > 0 && (
                      <div className="mt-3.5 pt-3 border-t border-zinc-800">
                        <button
                          onClick={() =>
                            setExpandedCitations((prev) => ({
                              ...prev,
                              [msg.id]: !isCitationsExpanded,
                            }))
                          }
                          className="flex items-center justify-between w-full text-[11px] font-bold text-emerald-400 hover:text-emerald-300 transition"
                        >
                          <span className="flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Retrieved Knowledge Evidence ({msg.citations.length} sources)</span>
                          </span>
                          {isCitationsExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {isCitationsExpanded && (
                          <div className="mt-2.5 space-y-2 animate-in fade-in-50 duration-150">
                            {msg.citations.map((cite, cIdx) => (
                              <div
                                key={cIdx}
                                className="p-2.5 bg-black/40 border border-zinc-800/80 rounded-xl text-[11px] space-y-1"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-white flex items-center gap-1.5">
                                    <span className="text-zinc-500">#{cIdx + 1}</span>
                                    <span>{cite.documentTitle}</span>
                                  </span>
                                  <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-800/60 text-emerald-300">
                                    {Math.round(cite.similarityScore * 100)}% Match
                                  </span>
                                </div>
                                <p className="text-zinc-400 italic line-clamp-2">
                                  "{cite.snippet}"
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {isQuerying && (
              <div className="flex items-center space-x-2 text-xs text-zinc-400 italic p-3 bg-[#18181b] border border-zinc-800 rounded-2xl w-fit">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                <span>Searching vector vault & synthesizing answer...</span>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Chat Input Bar */}
          <div className="mt-4 pt-3 border-t border-zinc-800">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center space-x-2"
            >
              <input
                type="text"
                placeholder="Ask about your projects, STAR interview prep, or career strategy..."
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                disabled={isQuerying}
                className="flex-1 px-4 py-3 bg-[#18181b] border border-zinc-800 focus:border-emerald-500 rounded-full text-xs text-white placeholder-zinc-500 focus:outline-none transition"
              />
              <button
                type="submit"
                disabled={!inputQuery.trim() || isQuerying}
                className="p-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black rounded-full transition shadow-md shadow-emerald-500/20 font-bold"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── 4. TAB 2: KNOWLEDGE VAULT & DOCUMENT MANAGER ── */}
      {activeTab === 'documents' && (
        <div className="space-y-4">
          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#121215] border border-[#27272a] p-4 rounded-2xl">
            <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
              {(['all', 'resume', 'project', 'star_story', 'tech_note', 'experience'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition capitalize ${
                    selectedCategory === cat
                      ? 'bg-white text-black shadow-sm'
                      : 'bg-zinc-800/60 text-zinc-400 hover:text-white'
                  }`}
                >
                  {cat === 'all' ? 'All Docs' : cat.replace('_', ' ')}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search title, tags, or content..."
                value={docSearchQuery}
                onChange={(e) => setDocSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 bg-[#18181b] border border-zinc-800 rounded-full text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
              />
            </div>
          </div>

          {/* Document Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredDocs.map((doc) => {
              const catStyle = CATEGORY_COLORS[doc.category] || CATEGORY_COLORS.custom;
              const allChunks = knowledgeVault.getChunks();
              const chunkCount = allChunks.filter((c) => c.documentId === doc.id).length;

              return (
                <div
                  key={doc.id}
                  className="bg-[#121215] border border-[#27272a] hover:border-zinc-700 p-5 rounded-2xl shadow-lg transition flex flex-col justify-between space-y-4 group"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <span
                          className={`text-[10px] font-bold font-mono uppercase px-2.5 py-0.5 rounded-full border ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}
                        >
                          {doc.category.replace('_', ' ')}
                        </span>
                        <h3 className="font-bold text-sm text-white group-hover:text-emerald-400 transition line-clamp-1 mt-1">
                          {doc.title}
                        </h3>
                      </div>

                      <div className="flex items-center space-x-1 flex-shrink-0">
                        <button
                          onClick={() => handleInspectChunks(doc)}
                          className="p-1.5 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-semibold transition"
                          title="Inspect Chunks & Vector Embeddings"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(doc)}
                          className="p-1.5 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-semibold transition"
                          title="Edit Document"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteDocument(doc.id, doc.title)}
                          className="p-1.5 bg-zinc-800/80 hover:bg-red-900/60 text-zinc-400 hover:text-red-300 rounded-lg text-xs font-semibold transition"
                          title="Delete Document"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-zinc-400 line-clamp-3 leading-relaxed">
                      {doc.content.replace(/^#+\s+/gm, '').slice(0, 240)}...
                    </p>

                    {/* Tag Badges */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {doc.tags.map((t, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] font-mono px-2 py-0.5 bg-[#18181b] border border-zinc-800 rounded-md text-zinc-400"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-3 border-t border-zinc-800/80 font-mono">
                    <span>{chunkCount} vector chunks</span>
                    <span>Updated: {new Date(doc.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 5. TAB 3: SEMANTIC VECTOR SEARCH LAB ── */}
      {activeTab === 'search_lab' && (
        <div className="space-y-4">
          <div className="bg-[#121215] border border-[#27272a] rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-purple-400" />
              <span>Interactive Vector & BM25 Search Playground</span>
            </h3>
            <p className="text-xs text-zinc-400">
              Type any query to test cosine similarity against the 384-dimensional candidate vector index in real time.
            </p>

            <div className="space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Test a search query (e.g., 'Socket.io real-time alerts' or 'High stress debugging')..."
                  value={labQuery}
                  onChange={(e) => setLabQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-[#18181b] border border-zinc-700 rounded-full text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-400 pt-1">
                <div className="flex items-center space-x-2">
                  <span>Top K Results:</span>
                  <select
                    value={labTopK}
                    onChange={(e) => setLabTopK(Number(e.target.value))}
                    className="px-3 py-1 bg-[#18181b] border border-zinc-700 rounded-lg text-white font-bold"
                  >
                    {[2, 3, 4, 5, 8, 10].map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                </div>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={labHybrid}
                    onChange={(e) => setLabHybrid(e.target.checked)}
                    className="rounded bg-zinc-800 border-zinc-700 text-emerald-500 focus:ring-0"
                  />
                  <span>Enable Hybrid BM25 Lexical + Reciprocal Rank Fusion</span>
                </label>
              </div>
            </div>
          </div>

          {/* Results List */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
              <span>Retrieved Chunks ({labResults.length})</span>
              <span className="font-mono font-normal text-zinc-500">Query: "{labQuery}"</span>
            </div>

            {labResults.map((res) => {
              const catStyle = CATEGORY_COLORS[res.chunk.category] || CATEGORY_COLORS.custom;

              return (
                <div
                  key={res.chunk.chunkId}
                  className="bg-[#121215] border border-[#27272a] rounded-2xl p-5 shadow-md space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <span className="w-6 h-6 rounded-full bg-zinc-800 text-zinc-300 font-bold text-xs flex items-center justify-center font-mono">
                        #{res.rank}
                      </span>
                      <span
                        className={`text-[10px] font-bold font-mono uppercase px-2 py-0.5 rounded-full border ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}
                      >
                        {res.chunk.category.replace('_', ' ')}
                      </span>
                      <h4 className="font-bold text-sm text-white">{res.chunk.documentTitle}</h4>
                    </div>

                    <div className="flex items-center space-x-2 font-mono text-[11px]">
                      <span className="px-2.5 py-1 bg-emerald-950/80 border border-emerald-700/60 text-emerald-400 rounded-full font-bold">
                        Hybrid Score: {Math.round(res.similarityScore * 100)}%
                      </span>
                      <span className="text-zinc-500">
                        (Dense: {Math.round(res.denseScore * 100)}% | BM25: {Math.round(res.bm25Score * 100)}%)
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 bg-[#18181b] border border-zinc-800/80 rounded-xl text-xs text-zinc-300 font-mono leading-relaxed whitespace-pre-wrap">
                    {res.chunk.text}
                  </div>

                  {res.matchedKeywords.length > 0 && (
                    <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                      <span className="font-bold text-zinc-500">Matched Terms:</span>
                      {res.matchedKeywords.map((k, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 text-emerald-400 rounded font-mono text-[10px]"
                        >
                          {k}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 6. ADD / EDIT DOCUMENT MODAL ── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121215] border border-zinc-700 w-full max-w-2xl rounded-3xl p-6 md:p-8 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <h3 className="font-black text-lg text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                <span>{editingDoc ? 'Edit Knowledge Document' : 'Add New Knowledge Document'}</span>
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-white rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveDocument} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">Document Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Project Case Study: AUSVMS Architecture"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#18181b] border border-zinc-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1.5">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as KnowledgeCategory)}
                    className="w-full px-4 py-2.5 bg-[#18181b] border border-zinc-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 capitalize"
                  >
                    <option value="project">Project Case Study</option>
                    <option value="star_story">STAR Behavioral Story</option>
                    <option value="resume">Resume Section</option>
                    <option value="tech_note">System Design / Tech Note</option>
                    <option value="experience">Work Experience</option>
                    <option value="custom">Custom Notes</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1.5">Tags (Comma-separated)</label>
                  <input
                    type="text"
                    placeholder="MERN, Socket.io, MongoDB, RBAC"
                    value={formTags}
                    onChange={(e) => setFormTags(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#18181b] border border-zinc-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                  Content (Markdown format recommended)
                </label>
                <textarea
                  required
                  rows={10}
                  placeholder="Describe technical implementation, metrics, problem statement, and solution..."
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  className="w-full p-4 bg-[#18181b] border border-zinc-700 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-emerald-500 leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-full text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black rounded-full text-xs font-black transition shadow-lg shadow-emerald-500/20"
                >
                  {editingDoc ? 'Save Changes' : 'Index into Vector Vault'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 7. CHUNK INSPECTION MODAL ── */}
      {inspectingDocChunks && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121215] border border-zinc-700 w-full max-w-3xl rounded-3xl p-6 md:p-8 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div>
                <h3 className="font-black text-base text-white">
                  Chunk Vector Breakdown: {inspectingDocChunks.doc.title}
                </h3>
                <p className="text-xs text-zinc-400">
                  {inspectingDocChunks.chunks.length} semantically partitioned chunks with 384-D normalized vector embeddings.
                </p>
              </div>
              <button
                onClick={() => setInspectingDocChunks(null)}
                className="p-1 text-zinc-400 hover:text-white rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {inspectingDocChunks.chunks.map((c, idx) => (
                <div
                  key={c.chunkId}
                  className="p-4 bg-[#18181b] border border-zinc-800 rounded-2xl space-y-2"
                >
                  <div className="flex items-center justify-between text-xs text-zinc-400 font-mono">
                    <span className="font-bold text-emerald-400">
                      Chunk #{idx + 1} ({c.tokenCount} tokens)
                    </span>
                    <span>Vector: [{c.embedding.slice(0, 4).map((v) => v.toFixed(3)).join(', ')}... 384-D]</span>
                  </div>
                  <p className="text-xs text-zinc-300 font-mono whitespace-pre-wrap bg-black/40 p-3 rounded-xl border border-zinc-800">
                    {c.text}
                  </p>
                  {c.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1 text-[10px] font-mono text-zinc-500 pt-1">
                      <span className="font-bold">Keywords:</span>
                      {c.keywords.map((k, kIdx) => (
                        <span key={kIdx} className="px-1.5 py-0.2 bg-zinc-800 text-zinc-300 rounded">
                          {k}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
