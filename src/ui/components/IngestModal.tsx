import React, { useState } from 'react';
import { store } from '../../app-core/store';
import { processIngestion } from '../../app-core/pipeline';
import {
  X, Sparkles, MessageSquare, Globe, Bot, Zap,
  CheckCircle2, Loader2, Link as LinkIcon
} from 'lucide-react';

interface IngestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const sampleWhatsAppDump = `[17/08, 5:13 pm] null: 🚀 Remote Job Opportunity!!

Nagarro Hiring Freshers for Associate

Experience: Freshers / 0-2 Years
Education: Bachelor's / Master's Degree
Salary: Rs 5-6 LPA (Expected)
Location: Remote / Hyderabad / Gurgaon

Apply: https://kickcharm.com/nagarro-recruitment-hiring-any-graduates/

Skills: JavaScript, HTML5, CSS3, Data Structures, OOP.
---------------------------------------------------

*Swiggy Engineering Hiring 2026* 🔥
💼 *Job Role:* Software Engineer - Core Platform & Consumer Apps
📍 *Location:* Remote / Bengaluru / Hyderabad
💰 *CTC:* ₹14 - 18 LPA
👉 *Apply Link:* https://careers.swiggy.com/jobs/swe-fresher-2026
*Skills:* MERN Stack, React, TypeScript, Next.js, Redux, Microservices.`;

export function IngestModal({ isOpen, onClose, onSuccess }: IngestModalProps) {
  const profile = store.getProfile();
  const hasAiKey = Boolean(profile.apiKey || profile.groqApiKey || profile.geminiApiKey);
  const [ingestMode, setIngestMode] = useState<'whatsapp' | 'single'>('whatsapp');
  const [useAiDeepExtraction, setUseAiDeepExtraction] = useState(hasAiKey);
  const [inputText, setInputText] = useState('');
  const [channelName, setChannelName] = useState('WhatsApp Hyderabad Tech Jobs');
  const [processing, setProcessing] = useState(false);
  const [resultMsg, setResultMsg] = useState('');

  if (!isOpen) return null;

  const handleProcess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    setProcessing(true);
    setResultMsg('');
    try {
      const platform = ingestMode === 'whatsapp' ? 'whatsapp' : 'web';
      const result = await processIngestion(inputText, channelName, platform, useAiDeepExtraction);

      setResultMsg(`Successfully parsed & queued ${result.totalExtracted} job postings with AI scoring!`);
      setTimeout(() => {
        onSuccess();
        onClose();
        setInputText('');
        setResultMsg('');
      }, 1000);
    } catch (err: any) {
      setResultMsg(`Error: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleFillSample = () => {
    setInputText(sampleWhatsAppDump);
    setChannelName('WhatsApp Hyderabad Tech Jobs');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-[#121215] border border-[#27272a] rounded-[28px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-6 border-b border-[#27272a] flex items-center justify-between bg-[#121215]">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-black shadow-lg">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">Universal Job Ingestion Engine</h3>
              <p className="text-xs text-zinc-400">
                Paste bulk WhatsApp chat dumps, Telegram channels, or direct job posting URLs.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[#18181b] text-zinc-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleProcess} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Ingest Mode Switcher */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-[#18181b] border border-[#27272a] rounded-2xl">
            <button
              type="button"
              onClick={() => setIngestMode('whatsapp')}
              className={`py-2 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 ${
                ingestMode === 'whatsapp'
                  ? 'bg-white text-black shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Bulk WhatsApp / Chat Dump</span>
            </button>

            <button
              type="button"
              onClick={() => setIngestMode('single')}
              className={`py-2 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 ${
                ingestMode === 'single'
                  ? 'bg-white text-black shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <LinkIcon className="w-3.5 h-3.5" />
              <span>Single Posting / Direct URL</span>
            </button>
          </div>

          {/* AI Mode Selector Toggle */}
          <div className="p-3 bg-[#18181b] border border-[#27272a] rounded-2xl flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <span className={`p-1.5 rounded-lg border text-xs ${useAiDeepExtraction ? 'bg-purple-950/60 border-purple-800 text-purple-300' : 'bg-zinc-900 border-zinc-800 text-zinc-400'}`}>
                <Bot className="w-4 h-4" />
              </span>
              <div>
                <p className="text-xs font-extrabold text-white flex items-center gap-1.5">
                  <span>AI Deep Extraction & Reasoning</span>
                  {hasAiKey && (
                    <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
                      AI Key Connected
                    </span>
                  )}
                </p>
                <p className="text-[11px] text-zinc-400">
                  {useAiDeepExtraction
                    ? 'Runs multi-provider AI (OpenRouter / Groq / Gemini) for zero-shot parsing, scoring, and interview prep.'
                    : 'Runs lightning-fast offline heuristic regex splitter & career rubric calculator.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setUseAiDeepExtraction(!useAiDeepExtraction)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1 border ${
                useAiDeepExtraction
                  ? 'bg-purple-600 text-white border-purple-500 shadow'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-700 hover:text-white'
              }`}
            >
              <Zap className="w-3 h-3" />
              <span>{useAiDeepExtraction ? 'AI Mode ON' : 'Fast Mode'}</span>
            </button>
          </div>

          {/* Source Tag & Sample Fill Button */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1">
              <label className="block text-[11px] font-mono font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                Source Channel / Community Name
              </label>
              <input
                type="text"
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                placeholder="e.g. WhatsApp Hyderabad Jobs / Telegram Offcampus"
                className="w-full px-3.5 py-2 bg-[#18181b] border border-[#27272a] rounded-xl text-xs text-white focus:outline-none focus:border-zinc-400"
              />
            </div>
            {ingestMode === 'whatsapp' && (
              <div className="pt-4">
                <button
                  type="button"
                  onClick={handleFillSample}
                  className="text-xs font-bold px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 rounded-xl transition"
                >
                  Load Sample Dump
                </button>
              </div>
            )}
          </div>

          {/* Text Input Area */}
          <div>
            <label className="block text-[11px] font-mono font-semibold text-zinc-400 uppercase tracking-wider mb-1">
              {ingestMode === 'whatsapp' ? 'Paste Multi-Job Chat Dump Text' : 'Paste Job Text or JD Link'}
            </label>
            <textarea
              required
              rows={7}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                ingestMode === 'whatsapp'
                  ? 'Paste raw WhatsApp messages containing multiple job postings. The engine will automatically split and extract each posting...'
                  : 'Paste a full job description or URL here...'
              }
              className="w-full p-4 bg-[#18181b] border border-[#27272a] rounded-2xl text-xs text-zinc-200 font-mono focus:outline-none focus:border-zinc-400 leading-relaxed resize-none"
            />
          </div>

          {/* Status feedback */}
          {resultMsg && (
            <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-800 text-xs font-mono text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{resultMsg}</span>
            </div>
          )}

          {/* Submit Action */}
          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-zinc-400 hover:text-white rounded-full transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={processing || !inputText.trim()}
              className="flex items-center space-x-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-black font-extrabold text-xs transition hover:brightness-110 shadow-lg disabled:opacity-50"
            >
              {processing && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{processing ? 'Processing AI Pipeline...' : 'Run Ingestion Pipeline'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
