import React, { useState, useEffect, useRef } from 'react';
import {
  Brain, FileText, Plus, Trash2, Edit3, Check, RotateCcw, RefreshCw,
  Tag, Layers, Cpu, CheckCircle2, AlertCircle, Eye, Upload, FileCode,
  Sparkles, Search, File, ShieldCheck, X, BookOpen, Clock, ArrowRight
} from 'lucide-react';
import { knowledgeVault } from '../../app-core/rag/knowledgeStore';
import {
  IKnowledgeDocument,
  IDocumentChunk,
  KnowledgeCategory,
  IVaultStats,
} from '../../app-core/rag/types';
import { IProfile } from '../../app-core/types';
import { parseUploadedDocument, IParsedDocumentResult } from '../../app-core/documentParser';
import { llmClient } from '../../app-core/llmClient';

interface RagVaultViewProps {
  profile: IProfile;
  onOpenSettings?: () => void;
}

const CATEGORY_META: Record<KnowledgeCategory, { label: string; bg: string; text: string; border: string }> = {
  resume: { label: 'Resume', bg: 'bg-blue-950/50', text: 'text-blue-400', border: 'border-blue-800/60' },
  project: { label: 'Project Case Study', bg: 'bg-emerald-950/50', text: 'text-emerald-400', border: 'border-emerald-800/60' },
  experience: { label: 'Work Experience', bg: 'bg-purple-950/50', text: 'text-purple-400', border: 'border-purple-800/60' },
  star_story: { label: 'STAR Story', bg: 'bg-amber-950/50', text: 'text-amber-400', border: 'border-amber-800/60' },
  tech_note: { label: 'Tech & System Note', bg: 'bg-cyan-950/50', text: 'text-cyan-400', border: 'border-cyan-800/60' },
  job_market: { label: 'Market Note', bg: 'bg-rose-950/50', text: 'text-rose-400', border: 'border-rose-800/60' },
  custom: { label: 'Custom Document', bg: 'bg-zinc-800/50', text: 'text-zinc-300', border: 'border-zinc-700' },
};

export function RagVaultView({ profile }: RagVaultViewProps) {
  const [stats, setStats] = useState<IVaultStats>(knowledgeVault.getStats());
  const [documents, setDocuments] = useState<IKnowledgeDocument[]>(knowledgeVault.getDocuments());
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [bannerMsg, setBannerMsg] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<IKnowledgeDocument | null>(null);
  const [editingDoc, setEditingDoc] = useState<IKnowledgeDocument | null>(null);
  const [inspectingDocChunks, setInspectingDocChunks] = useState<{ doc: IKnowledgeDocument; chunks: IDocumentChunk[] } | null>(null);

  // Manual Form State
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<KnowledgeCategory>('project');
  const [formTags, setFormTags] = useState('');
  const [formContent, setFormContent] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsub = knowledgeVault.subscribe(() => {
      setStats(knowledgeVault.getStats());
      setDocuments(knowledgeVault.getDocuments());
    });
    return unsub;
  }, []);

  const [isSynthesizing, setIsSynthesizing] = useState(false);

  const handleAiSynthesizeFromVault = async () => {
    if (documents.length === 0) {
      setUploadError('Please upload at least one resume or project document before synthesizing.');
      setTimeout(() => setUploadError(null), 4000);
      return;
    }
    const key = profile.apiKey;
    if (!key) {
      setUploadError('Please configure your OpenRouter API Key in Settings to run AI Knowledge Synthesis.');
      setTimeout(() => setUploadError(null), 5000);
      return;
    }

    setIsSynthesizing(true);
    setUploadError(null);
    try {
      const combinedDocs = documents.map(d => `--- ${d.title} (${d.category}) ---\n${d.content}`).join('\n\n');
      const res = await llmClient.synthesizeKnowledgeVaultWithAi(combinedDocs, profile, key);
      if (res.success && res.data) {
        let added = 0;
        res.data.caseStudies.forEach((cs: any) => {
          knowledgeVault.addDocument({
            title: `STAR: ${cs.title}`,
            category: 'star_story',
            tags: [...cs.technologiesUsed, 'AI-Synthesized', cs.category],
            content: `${cs.fullNarrative}\n\nProblem: ${cs.problem}\nSolution: ${cs.solution}\nMetrics: ${cs.metricsAchieved.join(', ')}\nTech: ${cs.technologiesUsed.join(', ')}`,
            enabled: true,
            source: 'AI Vault Synthesizer',
          });
          added++;
        });
        showBanner(`✓ AI synthesized ${added} STAR case study document(s) directly into your Knowledge Vault!`);
      } else {
        setUploadError(res.error || 'Failed to synthesize vault documents');
      }
    } catch (err: any) {
      setUploadError(err.message);
    } finally {
      setIsSynthesizing(false);
    }
  };

  const showBanner = (msg: string) => {
    setBannerMsg(msg);
    setTimeout(() => setBannerMsg(''), 4500);
  };

  // --- Upload Handler ---
  const handleFileUpload = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    setUploadError(null);

    let successCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const parsed: IParsedDocumentResult = await parseUploadedDocument(file);
        knowledgeVault.addDocument({
          title: parsed.title,
          category: parsed.detectedCategory,
          tags: parsed.suggestedTags,
          content: parsed.content,
          enabled: true,
          source: file.name,
        });
        successCount++;
      } catch (err: any) {
        errors.push(`${file.name}: ${err.message}`);
      }
    }

    setIsUploading(false);

    if (successCount > 0) {
      showBanner(`✓ Successfully imported & indexed ${successCount} document(s) into Career Knowledge Vault!`);
      if (isAddModalOpen) setIsAddModalOpen(false);
    }
    if (errors.length > 0) {
      setUploadError(errors.join(' | '));
    }
  };

  // --- Drag & Drop ---
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  // --- Manual Add / Edit ---
  const handleSaveManualDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formContent.trim()) return;

    const tagsArr = formTags
      .split(',')
      .map((t) => t.trim().replace(/^#/, ''))
      .filter((t) => t.length > 0);

    if (editingDoc) {
      knowledgeVault.updateDocument(editingDoc.id, {
        title: formTitle.trim(),
        category: formCategory,
        tags: tagsArr,
        content: formContent.trim(),
      });
      showBanner(`Updated "${formTitle}" in vector vault.`);
      setEditingDoc(null);
    } else {
      knowledgeVault.addDocument({
        title: formTitle.trim(),
        category: formCategory,
        tags: tagsArr,
        content: formContent.trim(),
        enabled: true,
      });
      showBanner(`Added and indexed "${formTitle}" into knowledge vault.`);
    }

    setIsAddModalOpen(false);
    setFormTitle('');
    setFormTags('');
    setFormContent('');
  };

  const openEditModal = (doc: IKnowledgeDocument) => {
    setEditingDoc(doc);
    setFormTitle(doc.title);
    setFormCategory(doc.category);
    setFormTags(doc.tags.join(', '));
    setFormContent(doc.content);
    setIsAddModalOpen(true);
  };

  const openChunkInspector = (doc: IKnowledgeDocument) => {
    const allChunks = knowledgeVault.getChunks();
    const docChunks = allChunks.filter((c) => c.documentId === doc.id);
    setInspectingDocChunks({ doc, chunks: docChunks });
  };

  const handleDelete = (doc: IKnowledgeDocument) => {
    if (confirm(`Are you sure you want to remove "${doc.title}" and its vector chunks from the Knowledge Vault?`)) {
      knowledgeVault.deleteDocument(doc.id);
      showBanner(`Removed "${doc.title}" from Knowledge Vault.`);
    }
  };

  const handleClearAll = () => {
    if (confirm('Are you sure you want to clear all documents and vector chunks from the Knowledge Vault?')) {
      knowledgeVault.clearAllDocuments();
      showBanner('Knowledge Vault cleared.');
    }
  };

  // --- Filtering & Search ---
  const filteredDocuments = documents.filter((doc) => {
    if (selectedCategory !== 'all' && doc.category !== selectedCategory) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const inTitle = doc.title.toLowerCase().includes(q);
      const inContent = doc.content.toLowerCase().includes(q);
      const inTags = doc.tags.some((t) => t.toLowerCase().includes(q));
      return inTitle || inContent || inTags;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* ── Header Area ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <h2 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <Brain className="w-6 h-6 text-purple-400" /> Career Knowledge Vault & Grounding
            </h2>
            <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-purple-950/60 border border-purple-800 text-purple-300">
              OFFLINE VECTOR ENGINE (384-D)
            </span>
          </div>
          <p className="text-sm text-zinc-400 font-medium mt-1">
            Upload your PDF, DOCX, and text documents. All AI agents use this vault to ground tailored resumes, cover letters, and interview prep in your authentic achievements.
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={() => knowledgeVault.reindexAll()}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 text-xs font-bold transition shadow"
            title="Rebuild all vector chunks and BM25 index"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Re-index</span>
          </button>

          {documents.length > 0 && (
            <button
              onClick={handleAiSynthesizeFromVault}
              disabled={isSynthesizing}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500 text-white font-extrabold text-xs hover:brightness-110 transition shadow-lg disabled:opacity-50"
              title="Extract structured STAR case studies and metrics using OpenRouter AI"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isSynthesizing ? 'animate-spin' : ''}`} />
              <span>{isSynthesizing ? 'Synthesizing...' : '⚡ AI Synthesize STAR Stories'}</span>
            </button>
          )}

          {documents.length > 0 && (
            <button
              onClick={handleClearAll}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-full bg-red-950/40 border border-red-900/60 text-red-300 hover:bg-red-900/60 text-xs font-bold transition"
              title="Clear all documents from vault"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Vault</span>
            </button>
          )}

          <button
            onClick={() => {
              setEditingDoc(null);
              setFormTitle('');
              setFormTags('');
              setFormContent('');
              setIsAddModalOpen(true);
            }}
            className="flex items-center space-x-1.5 px-5 py-2 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-extrabold text-xs hover:brightness-110 transition shadow-lg"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Upload / Add Document</span>
          </button>
        </div>
      </div>

      {/* ── Status Banner ── */}
      {bannerMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-xs font-mono flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{bannerMsg}</span>
        </div>
      )}

      {/* ── Error Banner ── */}
      {uploadError && (
        <div className="p-3.5 rounded-2xl bg-red-950/70 border border-red-800 text-red-300 text-xs font-mono flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{uploadError}</span>
          </div>
          <button onClick={() => setUploadError(null)} className="text-zinc-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Vault Telemetry Metrics ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 bg-[#121215] border border-[#27272a] rounded-[20px] shadow-lg space-y-1">
          <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
            <span>Knowledge Docs</span>
            <FileText className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-3xl font-black text-white">{stats.totalDocuments}</div>
          <p className="text-[11px] text-zinc-500 font-mono">Master portfolio records</p>
        </div>

        <div className="p-5 bg-[#121215] border border-[#27272a] rounded-[20px] shadow-lg space-y-1">
          <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
            <span>Vector Chunks</span>
            <Layers className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-emerald-400">{stats.totalChunks}</div>
          <p className="text-[11px] text-zinc-500 font-mono">
            {stats.totalTokens.toLocaleString()} tokens indexed
          </p>
        </div>

        <div className="p-5 bg-[#121215] border border-[#27272a] rounded-[20px] shadow-lg space-y-1">
          <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
            <span>Embedding Dim</span>
            <Cpu className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-cyan-400">384-D</div>
          <p className="text-[11px] text-zinc-500 font-mono">Normalized L2 Dense</p>
        </div>

        <div className="p-5 bg-[#121215] border border-[#27272a] rounded-[20px] shadow-lg space-y-1">
          <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
            <span>AI Agent Grounding</span>
            <ShieldCheck className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-sm font-extrabold text-amber-300 pt-1">Active Pipeline</div>
          <p className="text-[11px] text-zinc-500 font-mono">ATS Resume • Prep • Letters</p>
        </div>
      </div>

      {/* ── Drag & Drop Fast Upload Zone ── */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-[24px] p-6 md:p-8 text-center cursor-pointer transition-all duration-200 ${
          isDragging
            ? 'border-purple-400 bg-purple-950/20 scale-[1.01]'
            : 'border-zinc-800 bg-[#121215]/60 hover:border-zinc-700 hover:bg-[#121215]'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.doc,.txt,.md,.tex"
          className="hidden"
          onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
        />
        <div className="max-w-xl mx-auto space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-950/60 border border-purple-800/80 text-purple-400 flex items-center justify-center mx-auto shadow-lg">
            {isUploading ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
          </div>

          <div>
            <h3 className="text-base font-bold text-white">
              {isUploading ? 'Extracting & Indexing Document Chunks...' : 'Drop your Resume, Project Docs, or Notes here'}
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Supports <strong className="text-zinc-200">PDF (.pdf)</strong>, <strong className="text-zinc-200">Word (.docx)</strong>, <strong className="text-zinc-200">Markdown (.md)</strong>, <strong className="text-zinc-200">LaTeX (.tex)</strong>, and Text (.txt).
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-[#18181b] border border-zinc-800 text-zinc-300">
              📄 Resumes & CVs
            </span>
            <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-[#18181b] border border-zinc-800 text-zinc-300">
              🚀 Project Case Studies
            </span>
            <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-[#18181b] border border-zinc-800 text-zinc-300">
              ⭐ STAR Interview Stories
            </span>
            <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-[#18181b] border border-zinc-800 text-zinc-300">
              📐 System Architecture Notes
            </span>
          </div>
        </div>
      </div>

      {/* ── Search & Category Filter Controls ── */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-[#121215] border border-[#27272a] p-3.5 rounded-2xl shadow-xl">
        <div className="flex items-center space-x-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap ${
              selectedCategory === 'all' ? 'bg-white text-black shadow' : 'text-zinc-400 hover:text-white'
            }`}
          >
            All Docs ({documents.length})
          </button>
          {(['resume', 'project', 'experience', 'star_story', 'tech_note'] as KnowledgeCategory[]).map((cat) => {
            const count = documents.filter((d) => d.category === cat).length;
            const meta = CATEGORY_META[cat];
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {meta.label} ({count})
              </button>
            );
          })}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search title, tags, or content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-[#18181b] border border-[#27272a] rounded-full text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-400 font-medium"
          />
        </div>
      </div>

      {/* ── Documents Grid / Empty State ── */}
      {filteredDocuments.length === 0 ? (
        <div className="bg-[#121215] border border-[#27272a] rounded-[24px] p-12 text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 rounded-3xl bg-zinc-900 border border-zinc-800 text-zinc-500 flex items-center justify-center mx-auto shadow-inner">
            <BookOpen className="w-8 h-8 text-zinc-400" />
          </div>

          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-lg font-bold text-white">
              {searchQuery ? 'No matching documents found' : 'Your Career Knowledge Vault is Empty'}
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              {searchQuery
                ? `No documents match "${searchQuery}". Try a different search term or category filter.`
                : 'Upload your real Resume (PDF/DOCX), Project Case Studies, or STAR stories. The AI agents will automatically extract, chunk, and embed them to tailor your job applications.'}
            </p>
          </div>

          {!searchQuery && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-2.5 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-extrabold text-xs hover:brightness-110 transition shadow-lg inline-flex items-center space-x-2"
            >
              <Upload className="w-4 h-4" />
              <span>Upload First Document (PDF / DOCX)</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredDocuments.map((doc) => {
            const catMeta = CATEGORY_META[doc.category] || CATEGORY_META.custom;
            const docChunks = knowledgeVault.getChunks().filter((c) => c.documentId === doc.id);

            return (
              <div
                key={doc.id}
                className="p-5 bg-[#121215] border border-[#27272a] rounded-[22px] shadow-lg hover:border-zinc-700 transition flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2.5">
                  {/* Top Badges & Actions */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-full border ${catMeta.bg} ${catMeta.text} ${catMeta.border}`}
                    >
                      {catMeta.label}
                    </span>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => setViewingDoc(doc)}
                        className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition"
                        title="View full text content"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => openChunkInspector(doc)}
                        className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition"
                        title="Inspect vector chunks"
                      >
                        <Layers className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => openEditModal(doc)}
                        className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition"
                        title="Edit document"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(doc)}
                        className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-950/40 rounded-lg transition"
                        title="Delete document"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Title & Preview */}
                  <div>
                    <h3 className="text-sm font-bold text-white hover:text-purple-300 transition cursor-pointer" onClick={() => setViewingDoc(doc)}>
                      {doc.title}
                    </h3>
                    <p className="text-xs text-zinc-400 line-clamp-2 mt-1 font-mono leading-relaxed">
                      {doc.content.replace(/[#*`_]/g, '')}
                    </p>
                  </div>

                  {/* Tags */}
                  {doc.tags && doc.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {doc.tags.slice(0, 6).map((t, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#18181b] border border-zinc-800 text-zinc-300"
                        >
                          #{t}
                        </span>
                      ))}
                      {doc.tags.length > 6 && (
                        <span className="text-[10px] font-mono text-zinc-500 self-center">
                          +{doc.tags.length - 6} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer Metadata */}
                <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between text-[11px] font-mono text-zinc-500">
                  <div className="flex items-center space-x-1.5 text-emerald-400 font-semibold">
                    <Layers className="w-3 h-3" />
                    <span>{docChunks.length} vector chunk{docChunks.length === 1 ? '' : 's'}</span>
                  </div>

                  <span>
                    {doc.source ? `Source: ${doc.source}` : `Updated ${new Date(doc.updatedAt).toLocaleDateString()}`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Document Full View Modal ── */}
      {viewingDoc && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#121215] border border-[#27272a] rounded-[24px] w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in">
            <div className="p-5 border-b border-[#27272a] flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-400" /> {viewingDoc.title}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                    {CATEGORY_META[viewingDoc.category]?.label || viewingDoc.category}
                  </span>
                  {viewingDoc.source && (
                    <span className="text-[11px] font-mono text-zinc-400">Source: {viewingDoc.source}</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setViewingDoc(null)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <pre className="text-xs text-zinc-200 font-mono whitespace-pre-wrap leading-relaxed bg-[#09090b] p-4 rounded-xl border border-zinc-800">
                {viewingDoc.content}
              </pre>
            </div>

            <div className="p-4 border-t border-[#27272a] bg-[#18181b]/50 flex justify-end">
              <button
                onClick={() => setViewingDoc(null)}
                className="px-5 py-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Chunk Inspector Modal ── */}
      {inspectingDocChunks && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#121215] border border-[#27272a] rounded-[24px] w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in">
            <div className="p-5 border-b border-[#27272a] flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-400" /> Vector Chunks: {inspectingDocChunks.doc.title}
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5 font-mono">
                  {inspectingDocChunks.chunks.length} chunks indexed with 384-dimensional dense vectors
                </p>
              </div>
              <button
                onClick={() => setInspectingDocChunks(null)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {inspectingDocChunks.chunks.map((chunk, idx) => (
                <div
                  key={chunk.chunkId}
                  className="p-4 bg-[#09090b] border border-zinc-800 rounded-xl space-y-2"
                >
                  <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                    <span className="text-emerald-400 font-bold">Chunk #{idx + 1} of {chunk.totalChunks}</span>
                    <span>{chunk.tokenCount} tokens • 384-D Vector Ready</span>
                  </div>
                  <p className="text-xs text-zinc-300 font-mono whitespace-pre-wrap leading-relaxed">
                    {chunk.text}
                  </p>
                  {chunk.keywords && chunk.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {chunk.keywords.map((kw, i) => (
                        <span key={i} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                          {kw}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-[#27272a] bg-[#18181b]/50 flex justify-end">
              <button
                onClick={() => setInspectingDocChunks(null)}
                className="px-5 py-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add / Edit Document Modal ── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#121215] border border-[#27272a] rounded-[24px] w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in">
            <div className="p-5 border-b border-[#27272a] flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-400" />
                {editingDoc ? 'Edit Knowledge Document' : 'Upload or Write Document'}
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveManualDoc} className="p-6 space-y-4 overflow-y-auto flex-1">
              {!editingDoc && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="p-4 border border-dashed border-purple-500/50 hover:border-purple-400 rounded-xl bg-purple-950/20 text-center cursor-pointer space-y-1 transition"
                >
                  <p className="text-xs font-bold text-purple-300">
                    📂 Or select a file from your computer (PDF, DOCX, TXT, MD, LaTeX)
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    We will extract the text, auto-detect tags, and calculate vector embeddings automatically.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-mono text-zinc-400 uppercase mb-1">Document Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Master Resume 2026, Project: AUSVMS Case Study, etc."
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#18181b] border border-[#27272a] rounded-xl text-xs text-white focus:outline-none focus:border-purple-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-mono text-zinc-400 uppercase mb-1">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as KnowledgeCategory)}
                    className="w-full px-3.5 py-2.5 bg-[#18181b] border border-[#27272a] rounded-xl text-xs text-white focus:outline-none focus:border-purple-500 font-medium cursor-pointer"
                  >
                    <option value="resume">Resume / CV</option>
                    <option value="project">Project Case Study</option>
                    <option value="experience">Work Experience</option>
                    <option value="star_story">STAR Interview Story</option>
                    <option value="tech_note">Tech / System Note</option>
                    <option value="custom">Custom Document</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-zinc-400 uppercase mb-1">
                    Tags (comma separated)
                  </label>
                  <input
                    type="text"
                    placeholder="React, Node.js, Socket.io, MongoDB"
                    value={formTags}
                    onChange={(e) => setFormTags(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#18181b] border border-[#27272a] rounded-xl text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-zinc-400 uppercase mb-1">
                  Document Content (Markdown or Plain Text)
                </label>
                <textarea
                  rows={10}
                  required
                  placeholder="Paste or write your detailed project architecture, STAR interview story, or technical notes..."
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  className="w-full p-4 bg-[#09090b] border border-[#27272a] rounded-xl text-xs text-zinc-200 font-mono leading-relaxed focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-extrabold text-xs hover:brightness-110 transition shadow-lg"
                >
                  {editingDoc ? 'Save Changes' : 'Index into Vault'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
