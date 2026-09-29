// DIPTA - Halaman Khusus AI Insight Eksekutif (Dedicated View)
import React from 'react';
import { DiptaRecord, GlobalFilter, User } from '../../types';
import { ExecutiveAiInsight } from './ExecutiveAiInsight';
import {
  Sparkles,
  Layers,
  MapPin,
  Clock,
  TrendingUp,
  FileCheck2,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  ShieldCheck,
  Building2
} from 'lucide-react';

interface ExecutiveAiInsightViewProps {
  records: DiptaRecord[];
  allRecordsCount: number;
  filters: GlobalFilter;
  currentUser: User;
  onNavigateToDashboard?: () => void;
  onNavigateToQuality?: () => void;
}

export const ExecutiveAiInsightView: React.FC<ExecutiveAiInsightViewProps> = ({
  records,
  allRecordsCount,
  filters,
  currentUser,
  onNavigateToDashboard,
  onNavigateToQuality
}) => {
  // Quick overview stats of analyzed subset
  const total = records.length;
  const selesai = records.filter(r => r.status_dipta === 'SELESAI_TERBIT').length;
  const proses = records.filter(r => r.status_dipta === 'DALAM_PROSES').length;
  const ditolak = records.filter(r => r.status_dipta === 'DITOLAK').length;
  const rate = total > 0 ? ((selesai / total) * 100).toFixed(1) : '0';

  const filterKecamatan = filters.kecamatan !== 'SEMUA' ? filters.kecamatan : '18 Kecamatan OKI';
  const filterSumber = filters.sumber_aplikasi !== 'SEMUA' ? filters.sumber_aplikasi : '3 Aplikasi (OSS, SICANTIK, SIMBG)';

  return (
    <div id="executive-ai-insight-view" className="space-y-6">
      {/* Page Title & Context Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-md border border-indigo-900/50 relative overflow-hidden">
        {/* Background decorative glow */}
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  Kecerdasan Buatan Terintegrasi (Gemini & DIPTA Engine)
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-400/20">
                  Aktif • Realtime Data
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                AI Insight Eksekutif — Analisis Strategis Pelayanan Terpadu
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
                Asisten Analis Kinerja dan Perencanaan Kebijakan DPMPTSP Kabupaten Ogan Komering Ilir. Menyajikan rangkuman eksekutif, identifikasi kendala pelayanan (*bottlenecks*), disparitas wilayah, dan rekomendasi tindak lanjut kebijakan bagi Pimpinan.
              </p>
            </div>

            {/* Current Snapshot Badges */}
            <div className="flex flex-wrap md:flex-col items-start md:items-end gap-2 shrink-0">
              <div className="px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-xs border border-white/10 text-right">
                <div className="text-[10px] text-slate-300">Data Sampel Dianalisis:</div>
                <div className="text-sm font-bold text-white">
                  {total} <span className="text-xs font-normal text-slate-300">dari {allRecordsCount} total berkas</span>
                </div>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-right">
                <div className="text-[10px] text-emerald-200">Completion Rate:</div>
                <div className="text-sm font-bold text-emerald-300">{rate}% Selesai</div>
              </div>
            </div>
          </div>

          {/* Quick Context Filter Indicators */}
          <div className="mt-5 pt-4 border-t border-indigo-800/40 flex flex-wrap items-center gap-3 text-xs">
            <span className="text-slate-400 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              Cakupan Analisis Saat Ini:
            </span>
            <span className="px-2.5 py-0.5 rounded-md bg-indigo-900/60 text-indigo-200 border border-indigo-700/60 font-medium">
              Sumber: {filterSumber}
            </span>
            <span className="px-2.5 py-0.5 rounded-md bg-indigo-900/60 text-indigo-200 border border-indigo-700/60 font-medium">
              Wilayah: {filterKecamatan}
            </span>
            {filters.jenis_layanan !== 'SEMUA' && (
              <span className="px-2.5 py-0.5 rounded-md bg-indigo-900/60 text-indigo-200 border border-indigo-700/60 font-medium">
                Layanan: {filters.jenis_layanan}
              </span>
            )}
            <span className="text-slate-400 text-[11px] ml-auto">
              Gunakan Filter Bar di atas untuk mengubah parameter analisis secara instan.
            </span>
          </div>
        </div>
      </div>

      {/* KPI Mini Summary Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 font-medium">Izin Terbit / Selesai</div>
            <div className="text-lg font-bold text-slate-900">{selesai} <span className="text-xs font-normal text-emerald-600 font-medium">({rate}%)</span></div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 font-medium">Sedang Diproses</div>
            <div className="text-lg font-bold text-slate-900">{proses} <span className="text-xs font-normal text-sky-600 font-medium">berkas</span></div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 font-medium">Permohonan Ditolak</div>
            <div className="text-lg font-bold text-slate-900">{ditolak} <span className="text-xs font-normal text-rose-600 font-medium">berkas</span></div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 font-medium">Pusat Transaksi</div>
            <div className="text-sm font-bold text-slate-900 truncate">Kayu Agung & Lempuing</div>
          </div>
        </div>
      </div>

      {/* Main Core Component: The Executive AI Insight Panel */}
      <ExecutiveAiInsight
        records={records}
        filters={filters}
        allRecordsCount={allRecordsCount}
      />

      {/* Strategic Guidance & Policy Framework Information */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs uppercase mb-2">
            <Lightbulb className="w-4 h-4" />
            <span>Fokus 1: Kecepatan Layanan & SLA</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            AI memantau berkas yang tertahan pada tahapan "Dalam Proses" di OPD teknis pengampu, mendeteksi permohonan yang melebihi standar waktu pelayanan, serta memprioritaskan rekomendasi akselerasi perizinan berusaha UMK.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs uppercase mb-2">
            <MapPin className="w-4 h-4" />
            <span>Fokus 2: Pemerataan 18 Kecamatan</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Menganalisis ketimpangan sebaran pelayanan antara sentra perkotaan (Kayu Agung) dengan kecamatan perairan (Air Sugihan, Tulung Selapan, Cengal) guna mendukung kebijakan pelayanan keliling jemput bola.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center gap-2 text-cyan-700 font-bold text-xs uppercase mb-2">
            <ShieldCheck className="w-4 h-4" />
            <span>Fokus 3: Akurasi & Harmonisasi Data</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Mengharmonisasikan status asli dari OSS-RBA (BKPM), SICANTIK Cloud (Kominfo), dan SIMBG (PUPR) ke dalam status standar DIPTA untuk menjamin akurasi laporan bagi Kepala Dinas dan Bupati OKI.
          </p>
        </div>
      </div>
    </div>
  );
};
