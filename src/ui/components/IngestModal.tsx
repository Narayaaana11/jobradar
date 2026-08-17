import React, { useState } from 'react';
import { processIngestion } from '../../app-core/pipeline';
import { Sparkles, X, MessageSquare, Globe, CheckCircle2, Loader2 } from 'lucide-react';

interface IngestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const sampleWhatsAppDump = `*Amazon Recruitment 2026 Drive* 🔥
💼 *Job Role:* Software Development Engineer - I (Frontend & Fullstack)
📍 *Location:* Hyderabad / Bengaluru
💰 *Package:* ₹18,00,000 - ₹24,00,000 LPA
🎓 *Eligibility:* MCA / B.Tech / M.Tech (2025/2026 Batch)
👉 *Apply Link:* https://amazon.jobs/en/jobs/2849102/sde-1
*Skills:* React, TypeScript, Node.js, Data Structures, Algorithms, REST APIs, AWS.

---------------------------------------------------

*Deloitte Off-Campus Hiring 2026* 🔥
💼 *Job Role:* Associate Analyst - Cloud & Full Stack Development
📍 *Location:* Hyderabad
🎓 *Experience:* Freshers (MCA / B.Sc / B.Tech 2025/2026)
👉 *Apply Link:* https://jobs2.deloitte.com/in/en/job/DELA01923
*Skills Required:* JavaScript, React.js, Express.js, MongoDB, SQL, Git, Problem Solving.

---------------------------------------------------

*Swiggy Engineering Hiring 2026* 🔥
💼 *Job Role:* Software Engineer - Core Platform & Consumer Apps
📍 *Location:* Remote / Bengaluru / Hyderabad
💰 *CTC:* ₹14 - 18 LPA
👉 *Apply Link:* https://careers.swiggy.com/jobs/swe-fresher-2026
*Skills:* MERN Stack, React, TypeScript, Next.js, Redux, Microservices.`;

export function IngestModal({ isOpen, onClose, onSuccess }: IngestModalProps) {
  const [ingestMode, setIngestMode] = useState<'whatsapp' | 'single'>('whatsapp');
  const [inputText, setInputText] = useState('');
  const [channelName, setChannelName] = useState('WhatsApp Hyderabad Jobs');
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
      const result = await processIngestion(inputText, channelName, platform);

      setResultMsg(`Successfully parsed & queued ${result.totalExtracted} job postings with AI scoring!`);
      setInputText('');
      setTimeout(() => {
        onSuccess();
        onClose();
        setResultMsg('');
      }, 1800);
    } catch (err: any) {
      console.error('Ingestion failed:', err);
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
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#121215] border border-[#27272a] rounded-[24px] w-full max-w-2xl p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            <span>AI Job Ingestion Engine</span>
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Ingest Mode Switcher */}
        <div className="flex items-center space-x-2 bg-[#18181b] p-1 rounded-full border border-zinc-800">
          <button
            type="button"
            onClick={() => setIngestMode('whatsapp')}
            className={`flex-1 py-1.5 px-4 text-xs font-bold rounded-full transition flex items-center justify-center gap-1.5 ${
              ingestMode === 'whatsapp' ? 'bg-white text-black shadow-md' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <MessageSquare className="w-4 h-4 text-emerald-600" />
            <span>WhatsApp / Telegram Bulk Dump</span>
          </button>
          <button
            type="button"
            onClick={() => setIngestMode('single')}
            className={`flex-1 py-1.5 px-4 text-xs font-bold rounded-full transition flex items-center justify-center gap-1.5 ${
              ingestMode === 'single' ? 'bg-white text-black shadow-md' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Globe className="w-4 h-4 text-blue-500" />
            <span>Single Job Description / URL</span>
          </button>
        </div>

        <form onSubmit={handleProcess} className="space-y-4">
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
              rows={8}
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
              className="flex items-center space-x-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white font-extrabold text-xs transition hover:brightness-110 shadow-lg disabled:opacity-50"
            >
              {processing && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{processing ? 'Splitting & Extracting...' : 'Run Ingestion Pipeline'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
