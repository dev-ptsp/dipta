// DIPTA - Executive AI Insight Component powered by Gemini API
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { DiptaRecord, GlobalFilter } from '../../types';
import { AiInsightService, AiInsightFocus, AiInsightResponse } from '../../services/aiInsightService';
import {
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  Download,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Sliders,
  Send,
  Building,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  MapPin,
  HelpCircle,
  Zap,
  ExternalLink,
  X
} from 'lucide-react';

interface ExecutiveAiInsightProps {
  records: DiptaRecord[];
  filters: GlobalFilter;
  allRecordsCount: number;
  onOpenFullPage?: () => void;
  onClose?: () => void;
}

const PRESET_PROMPTS = [
  'Analisis tingkat kepatuhan durasi SLA dan potensi hambatan layanan',
  'Evaluasi kesiapan legalitas NIB Usaha Mikro di kecamatan luar ibukota',
  'Soroti perizinan PBG/SIMBG dan koordinasi teknis bersama dinas terkait',
  'Rumuskan langkah percepatan untuk berkas yang berstatus Dalam Proses',
];

export const ExecutiveAiInsight: React.FC<ExecutiveAiInsightProps> = ({
  records,
  filters,
  allRecordsCount,
  onOpenFullPage,
  onClose,
}) => {
  const [insightData, setInsightData] = useState<AiInsightResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [focus, setFocus] = useState<AiInsightFocus>('comprehensive');
  const [copied, setCopied] = useState<boolean>(false);
  const [showCustomPrompt, setShowCustomPrompt] = useState<boolean>(false);
  const [customInput, setCustomInput] = useState<string>('');
  const [activeInstruction, setActiveInstruction] = useState<string>('');
  const [isFilterStale, setIsFilterStale] = useState<boolean>(false);
  
  // Track last payload fingerprint to detect filter changes
  const lastAnalyzedHash = useRef<string>('');

  // Key metrics calculation
  const metrics = useMemo(() => {
    const total = records.length;
    const selesai = records.filter(r => r.status_dipta === 'SELESAI_TERBIT').length;
    const proses = records.filter(r => r.status_dipta === 'DALAM_PROSES').length;
    const ditolak = records.filter(r => r.status_dipta === 'DITOLAK').length;
    const rate = total > 0 ? ((selesai / total) * 100).toFixed(1) : '0';

    // Source breakdown
    const ossCount = records.filter(r => r.sumber_aplikasi === 'OSS-RBA').length;
    const sicantikCount = records.filter(r => r.sumber_aplikasi === 'SICANTIK').length;
    const simbgCount = records.filter(r => r.sumber_aplikasi === 'SIMBG').length;

    let dominantSource = 'Seimbang';
    if (ossCount > sicantikCount && ossCount > simbgCount) dominantSource = `OSS-RBA (${ossCount})`;
    else if (sicantikCount > ossCount && sicantikCount > simbgCount) dominantSource = `SICANTIK (${sicantikCount})`;
    else if (simbgCount > ossCount && simbgCount > sicantikCount) dominantSource = `SIMBG (${simbgCount})`;

    return { total, selesai, proses, ditolak, rate, dominantSource };
  }, [records]);

  // Unique hash of current filter & records state
  const currentHash = useMemo(() => {
    return `${records.length}-${metrics.selesai}-${metrics.proses}-${metrics.ditolak}-${filters.sumber_aplikasi}-${filters.kecamatan}-${filters.status_dipta}-${filters.periode_start}-${filters.periode_end}-${focus}-${activeInstruction}`;
  }, [records, metrics, filters, focus, activeInstruction]);

  // Generate Insight function
  const handleGenerate = async (instructionToUse = activeInstruction, focusToUse = focus) => {
    if (records.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const payload = AiInsightService.preparePayload(
        records,
        filters,
        focusToUse,
        instructionToUse
      );

      const response = await AiInsightService.generateInsight(payload);
      setInsightData(response);
      lastAnalyzedHash.current = currentHash;
      setIsFilterStale(false);
    } catch (err: any) {
      console.error('Failed to generate AI insight:', err);
      setError(err.message || 'Gagal menghasilkan AI Insight dari Gemini.');
    } finally {
      setLoading(false);
    }
  };

  // Auto-generate on first mount when records exist, or flag when filter is stale
  useEffect(() => {
    if (records.length > 0) {
      if (!insightData) {
        // Auto trigger initial generation
        handleGenerate(activeInstruction, focus);
      } else if (lastAnalyzedHash.current && lastAnalyzedHash.current !== currentHash) {
        setIsFilterStale(true);
      }
    } else {
      setIsFilterStale(false);
    }
  }, [currentHash, records.length]);

  // Handle focus tab change
  const handleFocusChange = (newFocus: AiInsightFocus) => {
    setFocus(newFocus);
    handleGenerate(activeInstruction, newFocus);
  };

  // Handle custom prompt submit
  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInput.trim()) return;
    setActiveInstruction(customInput.trim());
    handleGenerate(customInput.trim(), focus);
  };

  // Handle preset chip click
  const handlePresetClick = (preset: string) => {
    setCustomInput(preset);
    setActiveInstruction(preset);
    handleGenerate(preset, focus);
  };

  // Handle copy insight
  const handleCopy = () => {
    if (!insightData?.insight) return;
    navigator.clipboard.writeText(insightData.insight);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Handle download insight report
  const handleDownload = () => {
    if (!insightData?.insight) return;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `AI_Insight_Eksekutif_DIPTA_OKI_${timestamp}.txt`;
    const element = document.createElement('a');
    const file = new Blob([
      `========================================================================\n` +
      `DIPTA - DASHBOARD INTEGRASI PELAYANAN TERPADU\n` +
      `DPMPTSP KABUPATEN OGAN KOMERING ILIR, SUMATERA SELATAN\n` +
      `LAPORAN EKSEKUTIF BERBASIS KECERDASAN BUATAN (GEMINI 3.8 FLASH)\n` +
      `========================================================================\n\n` +
      `Dihasilkan Pada: ${new Date(insightData.generatedAt).toLocaleString('id-ID')}\n` +
      `Model AI       : ${insightData.model}\n` +
      `Total Berkas   : ${insightData.totalAnalyzed} berkas terfilter\n` +
      `Fokus Analisis : ${insightData.focus}\n` +
      (activeInstruction ? `Arahan Tambahan: "${activeInstruction}"\n` : '') +
      `\n------------------------------------------------------------------------\n\n` +
      insightData.insight +
      `\n\n------------------------------------------------------------------------\n` +
      `Dokumen ini dirangkum secara otomatis oleh Sistem DIPTA terintegrasi Gemini API.\n`
    ], { type: 'text/plain;charset=utf-8' });

    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Custom markdown formatter to render styled executive memo
  const renderFormattedMarkdown = (text: string) => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];

    lines.forEach((line, idx) => {
      const trimmed = line.trim();

      // Heading 1 & 2
      if (trimmed.startsWith('# ') || trimmed.startsWith('## ')) {
        const title = trimmed.replace(/^#+\s*/, '');
        elements.push(
          <h3 key={idx} className="text-base font-bold text-slate-900 mt-4 mb-2 pb-1 border-b border-slate-200/80 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-indigo-600 rounded-full inline-block"></span>
            {title}
          </h3>
        );
        return;
      }

      // Heading 3
      if (trimmed.startsWith('### ')) {
        const title = trimmed.replace(/^###\s*/, '');
        elements.push(
          <h4 key={idx} className="text-sm font-bold text-indigo-950 mt-4 mb-1.5 flex items-center gap-1.5">
            {title}
          </h4>
        );
        return;
      }

      // Blockquotes
      if (trimmed.startsWith('>')) {
        const quote = trimmed.replace(/^>\s*/, '');
        elements.push(
          <div key={idx} className="my-2.5 p-3 rounded-xl bg-gradient-to-r from-indigo-50/80 to-emerald-50/50 border-l-4 border-indigo-600 text-xs text-indigo-950 font-medium leading-relaxed italic shadow-xs">
            {renderInlineMarkdown(quote)}
          </div>
        );
        return;
      }

      // Horizontal dividers
      if (trimmed === '---' || trimmed === '***') {
        elements.push(<hr key={idx} className="my-3 border-slate-200" />);
        return;
      }

      // Bullet points (* or -)
      if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
        const bulletText = trimmed.replace(/^[\*\-]\s+/, '');
        elements.push(
          <div key={idx} className="flex items-start gap-2 text-xs text-slate-700 leading-relaxed my-1 pl-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0"></span>
            <div className="flex-1">{renderInlineMarkdown(bulletText)}</div>
          </div>
        );
        return;
      }

      // Numbered lists (1., 2., etc.)
      const numberedMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
      if (numberedMatch) {
        elements.push(
          <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 leading-relaxed my-1.5 pl-1">
            <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
              {numberedMatch[1]}
            </span>
            <div className="flex-1">{renderInlineMarkdown(numberedMatch[2])}</div>
          </div>
        );
        return;
      }

      // Table formatting or preformatted boxes
      if (trimmed.startsWith('│') || trimmed.startsWith('┌') || trimmed.startsWith('├') || trimmed.startsWith('└') || trimmed.startsWith('|')) {
        elements.push(
          <pre key={idx} className="font-mono text-[11px] text-slate-700 bg-slate-100/80 p-2 rounded-lg overflow-x-auto my-1 border border-slate-200/60 leading-tight">
            {trimmed}
          </pre>
        );
        return;
      }

      // Regular paragraph
      if (trimmed.length > 0) {
        elements.push(
          <p key={idx} className="text-xs text-slate-700 leading-relaxed my-1.5">
            {renderInlineMarkdown(trimmed)}
          </p>
        );
      }
    });

    return elements;
  };

  // Parse inline markdown bold (**bold**) and code (`code`)
  const renderInlineMarkdown = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-semibold text-slate-900">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={i} className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 text-indigo-700 rounded text-[11px] font-mono">{part.slice(1, -1)}</code>;
      }
      return part;
    });
  };

  // If no data exists in application at all, don't show the card
  if (allRecordsCount === 0) {
    return null;
  }

  // Active filter label for header
  const filterLabel = useMemo(() => {
    const parts: string[] = [];
    if (filters.sumber_aplikasi && filters.sumber_aplikasi !== 'SEMUA') {
      parts.push(`Sumber: ${filters.sumber_aplikasi}`);
    }
    if (filters.kecamatan && filters.kecamatan !== 'SEMUA') {
      parts.push(`Kecamatan: ${filters.kecamatan}`);
    }
    if (filters.status_dipta && filters.status_dipta !== 'SEMUA') {
      parts.push(`Status: ${filters.status_dipta}`);
    }
    if (filters.periode_start) {
      parts.push(`Periode: ${filters.periode_start}`);
    }
    return parts.length > 0 ? parts.join(' • ') : 'Seluruh Data Terpadu (OSS, SICANTIK, SIMBG)';
  }, [filters]);

  return (
    <div
      id="executive-ai-insight-panel"
      className="bg-white border-2 border-indigo-200/90 rounded-2xl shadow-sm overflow-hidden transition-all duration-200"
    >
      {/* Top Banner Accent Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-5 py-4 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Left: Branding & Model Tag */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-emerald-400 p-0.5 shadow-md shrink-0 flex items-center justify-center">
              <div className="w-full h-full bg-slate-900/40 rounded-[10px] flex items-center justify-center backdrop-blur-xs">
                <Sparkles className="w-5 h-5 text-indigo-200 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
                  AI Insight Eksekutif Pelayanan
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  <Zap className="w-2.5 h-2.5 text-amber-300" />
                  Gemini 3.8 Flash
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-400/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  Rangkuman Otomatis
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Rangkuman performa layanan harian otomatis berbasis analisis prediktif dan komparatif data terfilter.
              </p>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
            {onOpenFullPage && (
              <button
                id="btn-open-fullpage-ai"
                onClick={onOpenFullPage}
                title="Buka Halaman Penuh AI Insight Eksekutif"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-500/30 hover:bg-indigo-500/50 text-indigo-100 border border-indigo-400/40 transition-colors shadow-xs"
              >
                <ExternalLink className="w-3.5 h-3.5 text-amber-300" />
                <span className="hidden sm:inline">Buka Halaman Penuh</span>
              </button>
            )}

            <button
              id="btn-refresh-ai-insight"
              onClick={() => handleGenerate(activeInstruction, focus)}
              disabled={loading || records.length === 0}
              title="Perbarui analisis AI berdasarkan filter saat ini"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-all ${
                loading
                  ? 'bg-indigo-900/60 text-indigo-300 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white hover:shadow-indigo-500/20'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Menganalisis...' : 'Perbarui Analisis'}</span>
            </button>

            {insightData && (
              <>
                <button
                  id="btn-copy-ai-insight"
                  onClick={handleCopy}
                  title="Salin hasil analisis ke clipboard"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-300">Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-300" />
                      <span>Salin</span>
                    </>
                  )}
                </button>

                <button
                  id="btn-download-ai-insight"
                  onClick={handleDownload}
                  title="Unduh laporan eksekutif teks resmi"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-slate-300" />
                  <span>Unduh Memo</span>
                </button>
              </>
            )}

            <button
              id="btn-toggle-custom-ai-prompt"
              onClick={() => setShowCustomPrompt(!showCustomPrompt)}
              title="Buka arahan analisis kustom / pertanyaan khusus"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                showCustomPrompt
                  ? 'bg-amber-500/20 border-amber-400/40 text-amber-300'
                  : 'bg-white/5 border-white/10 hover:bg-white/15 text-slate-300'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Instruksi Khusus</span>
              {showCustomPrompt ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {onClose && (
              <button
                id="btn-close-ai-insight-panel"
                type="button"
                onClick={onClose}
                title="Tutup Panel AI Insight"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-rose-500/30 text-slate-200 hover:text-white border border-white/10 hover:border-rose-400/40 transition-colors ml-1"
              >
                <X className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tutup</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Context Bar */}
        <div className="mt-3 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <span className="text-indigo-300 font-semibold">Cakupan Data:</span>
            <span className="bg-white/10 px-2 py-0.5 rounded text-[11px] font-medium text-white border border-white/10">
              {filterLabel}
            </span>
            <span className="text-slate-400">({records.length} berkas terfilter)</span>
          </div>

          {isFilterStale && (
            <div className="flex items-center gap-1.5 text-amber-300 text-[11px] bg-amber-500/20 px-2.5 py-1 rounded-md border border-amber-400/30 animate-pulse">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>Filter telah berubah. Klik 'Perbarui Analisis' untuk meregenerasi.</span>
            </div>
          )}
        </div>
      </div>

      {/* Focus Mode Tabs Bar */}
      <div className="bg-slate-50 border-b border-slate-200 px-5 py-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 overflow-x-auto py-0.5 max-w-full">
          <span className="text-xs font-semibold text-slate-500 mr-1.5 shrink-0">Fokus Laporan:</span>
          
          <button
            id="tab-focus-comprehensive"
            onClick={() => handleFocusChange('comprehensive')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
              focus === 'comprehensive'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Ringkasan Eksekutif</span>
          </button>

          <button
            id="tab-focus-bottlenecks"
            onClick={() => handleFocusChange('bottlenecks')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
              focus === 'bottlenecks'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Hambatan & Titik Kritis</span>
          </button>

          <button
            id="tab-focus-geographic"
            onClick={() => handleFocusChange('geographic')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
              focus === 'geographic'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Sebaran 18 Kecamatan</span>
          </button>

          <button
            id="tab-focus-recommendations"
            onClick={() => handleFocusChange('recommendations')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
              focus === 'recommendations'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Rekomendasi Kebijakan</span>
          </button>
        </div>

        {/* Quick Snapshot KPIs */}
        <div className="hidden sm:flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1 text-slate-600">
            <span className="text-slate-400">Total:</span>
            <span className="font-bold text-slate-900">{metrics.total}</span>
          </div>
          <div className="flex items-center gap-1 text-emerald-700">
            <span className="text-slate-400">Terbit:</span>
            <span className="font-bold">{metrics.selesai} ({metrics.rate}%)</span>
          </div>
          <div className="flex items-center gap-1 text-sky-700">
            <span className="text-slate-400">Proses:</span>
            <span className="font-bold">{metrics.proses}</span>
          </div>
          <div className="flex items-center gap-1 text-rose-700">
            <span className="text-slate-400">Ditolak:</span>
            <span className="font-bold">{metrics.ditolak}</span>
          </div>
        </div>
      </div>

      {/* Expandable Custom Instruction / Prompt Drawer */}
      {showCustomPrompt && (
        <div className="bg-amber-50/50 border-b border-amber-200/80 p-4 transition-all">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
              <Sliders className="w-3.5 h-3.5 text-amber-700" />
              <span>Instruksi Khusus untuk Analisis Gemini AI</span>
            </div>
            {activeInstruction && (
              <button
                onClick={() => {
                  setActiveInstruction('');
                  setCustomInput('');
                  handleGenerate('', focus);
                }}
                className="text-[11px] text-amber-800 hover:text-rose-600 underline font-medium"
              >
                Reset Arahan Khusus
              </button>
            )}
          </div>

          <form onSubmit={handleCustomSubmit} className="flex gap-2">
            <input
              type="text"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="Contoh: Fokuskan telaah pada perizinan sektor kesehatan di SICANTIK dan permohonan dari Kec. Lempuing..."
              className="flex-1 px-3 py-2 text-xs bg-white border border-amber-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-slate-800"
            />
            <button
              type="submit"
              disabled={loading || !customInput.trim()}
              className="flex items-center gap-1 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Terapkan</span>
            </button>
          </form>

          {/* Quick preset chips */}
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-amber-800 mr-1">Rekomendasi Arahan Cepat:</span>
            {PRESET_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handlePresetClick(prompt)}
                className="text-[10px] px-2 py-1 bg-white hover:bg-amber-100/80 border border-amber-200 rounded-md text-amber-900 transition-colors text-left font-medium"
              >
                + {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="p-5 sm:p-6 min-h-[220px]">
        {/* Loading State */}
        {loading && (
          <div id="ai-insight-loading" className="py-12 flex flex-col items-center justify-center text-center space-y-4">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-sm animate-pulse">
                <Sparkles className="w-7 h-7 text-indigo-600 animate-spin" />
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white animate-ping"></div>
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Gemini 3.8 Flash Sedang Menganalisis...</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
                Mengintegrasikan agregasi {records.length} berkas terfilter, komparasi lintas aplikasi (OSS, SICANTIK, SIMBG), evaluasi sebaran wilayah, dan menyusun memo eksekutif...
              </p>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-indigo-700 bg-indigo-50/80 px-3 py-1.5 rounded-full border border-indigo-200 font-medium">
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping"></span>
              <span>Memproses analisis statistik & inferensi kebijakan</span>
            </div>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div id="ai-insight-error" className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-bold text-rose-900 text-sm">Gagal Menyusun AI Insight</h4>
                <p className="mt-1 text-rose-700 leading-relaxed">{error}</p>
                <button
                  onClick={() => handleGenerate(activeInstruction, focus)}
                  className="mt-3 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-colors inline-flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Coba Lagi</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Empty Records for Filter */}
        {!loading && !error && records.length === 0 && (
          <div className="py-8 text-center text-slate-500">
            <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-slate-800">Tidak Ada Data yang Cocok dengan Filter</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Silakan sesuaikan pilihan filter (sumber aplikasi, kecamatan, atau rentang tanggal) untuk mengaktifkan AI Insight.
            </p>
          </div>
        )}

        {/* Success / Rendered AI Memo */}
        {!loading && !error && insightData && records.length > 0 && (
          <div id="ai-insight-content" className="space-y-4">
            {/* Quick Metrics Bar inside content */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pb-3 border-b border-slate-100">
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                <span className="text-[10px] font-medium text-slate-500 block">Tingkat Penerbitan</span>
                <span className="text-sm font-bold text-emerald-700">{metrics.rate}% Selesai</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                <span className="text-[10px] font-medium text-slate-500 block">Permohonan Aktif</span>
                <span className="text-sm font-bold text-sky-700">{metrics.proses} Berkas Proses</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                <span className="text-[10px] font-medium text-slate-500 block">Sistem Terbanyak</span>
                <span className="text-sm font-bold text-indigo-700">{metrics.dominantSource}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                <span className="text-[10px] font-medium text-slate-500 block">Status Penolakan</span>
                <span className="text-sm font-bold text-rose-700">{metrics.ditolak} Berkas Ditolak</span>
              </div>
            </div>

            {/* Structured Text Render */}
            <div className="prose prose-slate max-w-none text-slate-800 leading-relaxed">
              {renderFormattedMarkdown(insightData.insight)}
            </div>

            {/* Footer Metadata */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-400">
              <div className="flex items-center gap-3">
                <span>Dihasilkan: {new Date(insightData.generatedAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })} WIB</span>
                <span>•</span>
                <span>{insightData.totalAnalyzed} Berkas Dianalisis</span>
                {activeInstruction && (
                  <>
                    <span>•</span>
                    <span className="text-indigo-600 font-medium">Instruksi: "{activeInstruction}"</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-1 text-slate-500 font-medium">
                <span>Mesin AI:</span>
                <span className="text-indigo-700 font-semibold">Google Gemini 3.8 Flash (Server-Side Proxy)</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
