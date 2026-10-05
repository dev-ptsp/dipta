// DIPTA - Executive Dashboard View (PRD Sections 10, 11, 28)
import React, { useState, useEffect, useMemo } from 'react';
import { DiptaRecord, GlobalFilter, User } from '../../types';
import { DiptaStorageService } from '../../services/dataStorage';
import { OkiInteractiveMap } from '../common/OkiInteractiveMap';
import { Pagination } from '../common/Pagination';
import { ExecutiveAiInsight } from './ExecutiveAiInsight';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import {
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Download,
  Building,
  TrendingUp,
  PieChart as PieIcon,
  MapPin,
  Sparkles,
  Map as MapIcon,
  BarChart3,
  Database,
  UploadCloud,
  ChevronDown
} from 'lucide-react';

interface ExecutiveDashboardViewProps {
  records: DiptaRecord[];
  allRecordsCount: number;
  filters: GlobalFilter;
  currentUser: User;
  onNavigateToQuality: () => void;
  onSelectKecamatan?: (kecamatan: string) => void;
  onNavigateToImport?: () => void;
  onNavigateToDatabase?: () => void;
  onNavigateToAiInsight?: () => void;
}

const COLORS = {
  emerald: '#059669',
  sky: '#0284c7',
  amber: '#d97706',
  rose: '#e11d48',
  indigo: '#4f46e5',
  slate: '#64748b'
};

const PIE_COLORS = ['#059669', '#0284c7', '#e11d48', '#94a3b8'];

export const ExecutiveDashboardView: React.FC<ExecutiveDashboardViewProps> = ({
  records,
  allRecordsCount,
  filters,
  currentUser,
  onNavigateToQuality,
  onSelectKecamatan,
  onNavigateToImport,
  onNavigateToDatabase,
  onNavigateToAiInsight
}) => {
  const [kecamatanViewMode, setKecamatanViewMode] = useState<'map' | 'chart'>('map');
  const [showAiInsight, setShowAiInsight] = useState<boolean>(false);
  const [currentSummaryPage, setCurrentSummaryPage] = useState(1);
  const [summaryPageSize, setSummaryPageSize] = useState(5);

  useEffect(() => {
    setCurrentSummaryPage(1);
  }, [records]);

  // Tabel Ringkas (PRD Section 11)
  // Kolom: Sumber, Jenis Pelayanan, Total, Selesai, Proses, Ditolak
  const summaryList = useMemo(() => {
    const summaryGrouping: {
      [key: string]: {
        sumber: string;
        jenis: string;
        total: number;
        selesai: number;
        proses: number;
        ditolak: number;
      };
    } = {};

    records.forEach(r => {
      const key = `${r.sumber_aplikasi}___${r.jenis_layanan}`;
      if (!summaryGrouping[key]) {
        summaryGrouping[key] = {
          sumber: r.sumber_aplikasi,
          jenis: r.jenis_layanan,
          total: 0,
          selesai: 0,
          proses: 0,
          ditolak: 0
        };
      }
      summaryGrouping[key].total += 1;
      if (r.status_dipta === 'SELESAI_TERBIT') summaryGrouping[key].selesai += 1;
      else if (r.status_dipta === 'DALAM_PROSES') summaryGrouping[key].proses += 1;
      else if (r.status_dipta === 'DITOLAK') summaryGrouping[key].ditolak += 1;
    });

    return Object.values(summaryGrouping).sort((a, b) => b.total - a.total);
  }, [records]);

  const paginatedSummaryList = useMemo(() => {
    const start = (currentSummaryPage - 1) * summaryPageSize;
    return summaryList.slice(start, start + summaryPageSize);
  }, [summaryList, currentSummaryPage, summaryPageSize]);

  // Empty State Check (PRD Section 27)
  if (allRecordsCount === 0) {
    return (
      <div id="empty-state-dashboard" className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center my-6 shadow-xs max-w-2xl mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-4 text-emerald-600">
          <Database className="w-8 h-8" />
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 mb-3">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Data Dummy Berhasil Dihapus</span>
        </div>
        <h3 className="text-lg font-bold text-slate-900">Database Bersih & Siap Digunakan</h3>
        <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto mt-2 mb-6 leading-relaxed">
          Seluruh rekaman data simulasi/dummy awal telah dibersihkan. Sistem saat ini dalam keadaan bersih (0 data) dan siap memproses data operasional riil dari DPMPTSP Kabupaten Ogan Komering Ilir.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {onNavigateToImport && (
            <button
              id="btn-empty-import"
              onClick={onNavigateToImport}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Import Dataset (OSS / SICANTIK / SIMBG)</span>
            </button>
          )}
          {onNavigateToDatabase && (
            <button
              id="btn-empty-database"
              onClick={onNavigateToDatabase}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <Database className="w-4 h-4 text-emerald-400" />
              <span>Sinkronisasi Supabase Cloud</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // 5 KPIs (PRD Section 10)
  const totalPelayanan = records.length;
  const selesaiTerbit = records.filter(r => r.status_dipta === 'SELESAI_TERBIT').length;
  const dalamProses = records.filter(r => r.status_dipta === 'DALAM_PROSES').length;
  const ditolak = records.filter(r => r.status_dipta === 'DITOLAK').length;
  const perluVerifikasi = records.filter(r => r.status_validasi === 'PERLU_VERIFIKASI').length;

  // Chart 1: Tren Pelayanan per Periode (Bulan)
  const monthlyMap: { [key: string]: { periode: string; total: number; selesai: number; proses: number } } = {};
  records.forEach(r => {
    const p = r.periode_data || '2026-09';
    if (!monthlyMap[p]) {
      monthlyMap[p] = { periode: p, total: 0, selesai: 0, proses: 0 };
    }
    monthlyMap[p].total += 1;
    if (r.status_dipta === 'SELESAI_TERBIT') monthlyMap[p].selesai += 1;
    if (r.status_dipta === 'DALAM_PROSES') monthlyMap[p].proses += 1;
  });
  const trendData = Object.values(monthlyMap).sort((a, b) => a.periode.localeCompare(b.periode));

  // Chart 2: Sumber Aplikasi
  const sourceMap: { [key: string]: number } = { 'OSS-RBA': 0, SICANTIK: 0, SIMBG: 0 };
  records.forEach(r => {
    if (sourceMap[r.sumber_aplikasi] !== undefined) {
      sourceMap[r.sumber_aplikasi] += 1;
    }
  });
  const sourceData = Object.entries(sourceMap).map(([name, count]) => ({
    name,
    count
  }));

  // Chart 3: Status Pelayanan
  const statusMap: { [key: string]: number } = {
    'Selesai / Terbit': selesaiTerbit,
    'Dalam Proses': dalamProses,
    Ditolak: ditolak,
    'Belum Diklasifikasikan': records.filter(r => r.status_dipta === 'BELUM_DIKLASIFIKASIKAN').length
  };
  const statusData = Object.entries(statusMap).map(([name, value]) => ({
    name,
    value
  }));

  // Chart 4: Top Jenis Layanan
  const serviceMap: { [key: string]: number } = {};
  records.forEach(r => {
    const s = r.jenis_layanan || 'Lainnya';
    serviceMap[s] = (serviceMap[s] || 0) + 1;
  });
  const topServicesData = Object.entries(serviceMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([layanan, total]) => ({
      layanan: layanan.length > 25 ? layanan.substring(0, 22) + '...' : layanan,
      fullLayanan: layanan,
      total
    }));

  // Chart 5: Distribusi Kecamatan di OKI
  const kecMap: { [key: string]: number } = {};
  records.forEach(r => {
    const k = r.kecamatan || 'Belum Terdata';
    kecMap[k] = (kecMap[k] || 0) + 1;
  });
  const kecamatanData = Object.entries(kecMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([kecamatan, total]) => ({
      kecamatan,
      total
    }));

  const handleExport = () => {
    DiptaStorageService.exportToExcel(records, 'Eksekutif_Rekapitulasi');
  };

  return (
    <div id="executive-dashboard-view" className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Dashboard Eksekutif Pelayanan</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Konsolidasi kinerja pelayanan lintas aplikasi DPMPTSP Kabupaten Ogan Komering Ilir.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            id="btn-jump-ai-insight"
            onClick={() => {
              const nextState = !showAiInsight;
              setShowAiInsight(nextState);
              if (nextState) {
                setTimeout(() => {
                  document.getElementById('executive-ai-insight-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold shadow-xs transition-all ${
              showAiInsight
                ? 'bg-indigo-600 text-white hover:bg-indigo-700 ring-2 ring-indigo-300'
                : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
            }`}
            title={showAiInsight ? 'Sembunyikan panel AI Insight Pelayanan' : 'Tampilkan panel analisis AI Insight Pelayanan'}
          >
            <Sparkles className={`w-3.5 h-3.5 ${showAiInsight ? 'text-amber-300' : 'text-indigo-600 animate-pulse'}`} />
            <span>{showAiInsight ? 'Tutup AI Insight' : 'AI Insight Pelayanan'}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showAiInsight ? 'rotate-180' : ''}`} />
          </button>

          <button
            id="btn-export-executive-excel"
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Ekspor Rekap (XLSX)</span>
          </button>
        </div>
      </div>

      {/* 5 KPI Cards (PRD Section 10) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* KPI 1: Total Pelayanan */}
        <div id="kpi-total-pelayanan" className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Pelayanan</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{totalPelayanan}</div>
          <div className="text-[11px] text-slate-400 mt-1">Seluruh sumber terfilter</div>
        </div>

        {/* KPI 2: Selesai / Terbit */}
        <div id="kpi-selesai-terbit" className="bg-white border border-emerald-200 rounded-xl p-4 shadow-xs bg-gradient-to-b from-white to-emerald-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-800">Selesai / Terbit</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-700 mt-2">{selesaiTerbit}</div>
          <div className="text-[11px] text-emerald-600 mt-1">
            {totalPelayanan > 0 ? ((selesaiTerbit / totalPelayanan) * 100).toFixed(1) : 0}% rasio selesai
          </div>
        </div>

        {/* KPI 3: Dalam Proses */}
        <div id="kpi-dalam-proses" className="bg-white border border-sky-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-sky-800">Dalam Proses</span>
            <div className="w-8 h-8 rounded-lg bg-sky-100 flex items-center justify-center text-sky-700">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-sky-700 mt-2">{dalamProses}</div>
          <div className="text-[11px] text-slate-400 mt-1">Tahap verifikasi / teknis</div>
        </div>

        {/* KPI 4: Ditolak */}
        <div id="kpi-ditolak" className="bg-white border border-rose-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-rose-800">Ditolak</span>
            <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center text-rose-700">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-700 mt-2">{ditolak}</div>
          <div className="text-[11px] text-slate-400 mt-1">Tidak memenuhi syarat</div>
        </div>

        {/* KPI 5: Data Perlu Verifikasi */}
        <div
          id="kpi-perlu-verifikasi"
          onClick={onNavigateToQuality}
          className="bg-white border border-amber-300 rounded-xl p-4 shadow-xs cursor-pointer hover:bg-amber-50/40 transition-colors"
          title="Klik untuk membuka modul Data Quality"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-800">Perlu Verifikasi</span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-700 mt-2">{perluVerifikasi}</div>
          <div className="text-[11px] text-amber-600 mt-1 underline">Tinjau anomali data →</div>
        </div>
      </div>

      {/* AI Insight Section - Ditampilkan setelah user mengklik tombol "AI Insight Pelayanan" */}
      {showAiInsight && (
        <div className="animate-in fade-in slide-in-from-top-3 duration-300">
          <ExecutiveAiInsight
            records={records}
            filters={filters}
            allRecordsCount={allRecordsCount}
            onOpenFullPage={onNavigateToAiInsight}
            onClose={() => setShowAiInsight(false)}
          />
        </div>
      )}

      {/* 5 Visualisasi Sesuai PRD Section 11 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Grafik 1: Tren Pelayanan Bulanan */}
        <div id="chart-tren-pelayanan" className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">Grafik 1 — Tren Pelayanan</h3>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">Bulan vs Jumlah Transaksi</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="periode" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Line type="monotone" dataKey="total" name="Total Transaksi" stroke={COLORS.indigo} strokeWidth={2.5} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="selesai" name="Selesai/Terbit" stroke={COLORS.emerald} strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="proses" name="Dalam Proses" stroke={COLORS.sky} strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Grafik 2: Sumber Aplikasi (OSS vs SICANTIK vs SIMBG) */}
        <div id="chart-sumber-aplikasi" className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-sky-600" />
              <h3 className="text-sm font-bold text-slate-900">Grafik 2 — Sumber Aplikasi</h3>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">OSS-RBA vs SICANTIK vs SIMBG</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sourceData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                />
                <Bar dataKey="count" name="Jumlah Transaksi" fill={COLORS.sky} radius={[6, 6, 0, 0]}>
                  {sourceData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.name === 'OSS-RBA' ? '#059669' : entry.name === 'SICANTIK' ? '#0284c7' : '#d97706'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Grafik 3: Status Pelayanan */}
        <div id="chart-status-pelayanan" className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-amber-600" />
              <h3 className="text-sm font-bold text-slate-900">Grafik 3 — Status Pelayanan Konsolidasi</h3>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">Standardisasi Status DIPTA</span>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData.filter(d => d.value > 0)}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, percent }: { name?: string; percent?: number }) =>
                    percent !== undefined ? `${name} (${(percent * 100).toFixed(0)}%)` : (name || '')
                  }
                  labelLine={false}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Grafik 4: Top Jenis Layanan */}
        <div id="chart-jenis-layanan" className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">Grafik 4 — Top Jenis Layanan</h3>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">Volume Tertinggi</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={topServicesData} margin={{ left: 10, right: 20, top: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} allowDecimals={false} />
                <YAxis dataKey="layanan" type="category" width={110} tick={{ fontSize: 10, fill: '#334155' }} />
                <Tooltip
                  formatter={(val: any, name: any, item: any) => [val, item.payload.fullLayanan]}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '11px' }}
                />
                <Bar dataKey="total" name="Total Berkas" fill={COLORS.indigo} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Grafik 5: Distribusi Kecamatan di Ogan Komering Ilir dengan Google Maps */}
      <div id="chart-distribusi-kecamatan" className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  Distribusi Geospasial Pelayanan per Wilayah Kecamatan Kab. OKI
                </h3>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                  18 Kecamatan
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Peta geospasial interaktif Google Maps dengan batas teritori 18 kecamatan di Kab. Ogan Komering Ilir
              </p>
            </div>
          </div>

          {/* View Mode Toggle: Peta vs Grafik */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 self-start sm:self-auto text-xs">
            <button
              onClick={() => setKecamatanViewMode('map')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all ${
                kecamatanViewMode === 'map'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>Peta Wilayah (Google Maps)</span>
            </button>
            <button
              onClick={() => setKecamatanViewMode('chart')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all ${
                kecamatanViewMode === 'chart'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Grafik Batang</span>
            </button>
          </div>
        </div>

        {/* Content based on view mode */}
        {kecamatanViewMode === 'map' ? (
          <OkiInteractiveMap
            records={records}
            onSelectKecamatan={onSelectKecamatan}
            selectedKecamatan={filters.kecamatan}
          />
        ) : (
          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={kecamatanData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="kecamatan" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12px'
                  }}
                />
                <Bar
                  dataKey="total"
                  name="Jumlah Berkas Pelayanan"
                  fill="#0d9488"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Tabel Ringkas Sesuai PRD Section 11 */}
      {/* Kolom: sumber, jenis pelayanan, total, selesai, proses, ditolak */}
      <div id="tabel-ringkas-eksekutif" className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Tabel Ringkas Pelayanan Terpadu</h3>
            <p className="text-xs text-slate-500">
              Rekapitulasi per sumber aplikasi dan klasifikasi status hasil konsolidasi.
            </p>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            {summaryList.length} Kelompok Layanan
          </span>
        </div>

        {/* Mobile Card List (shown on small screens) */}
        <div className="block md:hidden space-y-3">
          {paginatedSummaryList.map((item, idx) => {
            const completionPct = item.total > 0 ? Math.round((item.selesai / item.total) * 100) : 0;
            return (
              <div key={idx} className="p-3.5 bg-slate-50/80 border border-slate-200 rounded-xl space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.sumber === 'OSS-RBA'
                          ? 'bg-emerald-100 text-emerald-800'
                          : item.sumber === 'SICANTIK'
                          ? 'bg-sky-100 text-sky-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {item.sumber}
                    </span>
                    <h4 className="text-xs font-semibold text-slate-900">{item.jenis}</h4>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400 block">Total</span>
                    <span className="text-sm font-bold text-slate-900">{item.total}</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                    <span>Tingkat Penyelesaian</span>
                    <span className="font-semibold text-emerald-700">{completionPct}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${completionPct}%` }}></div>
                  </div>
                </div>

                {/* Status Breakdowns */}
                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-200/60 text-center">
                  <div className="bg-white p-1.5 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">Selesai</span>
                    <span className="text-xs font-bold text-emerald-700">{item.selesai}</span>
                  </div>
                  <div className="bg-white p-1.5 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">Proses</span>
                    <span className="text-xs font-bold text-sky-700">{item.proses}</span>
                  </div>
                  <div className="bg-white p-1.5 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">Ditolak</span>
                    <span className="text-xs font-bold text-rose-700">{item.ditolak}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop Table (shown on medium and larger screens) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full min-w-[700px] text-xs text-left text-slate-700">
            <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[11px] border-y border-slate-200">
              <tr>
                <th className="px-4 py-3 whitespace-nowrap">Sumber Aplikasi</th>
                <th className="px-4 py-3">Jenis Pelayanan</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">Total Transaksi</th>
                <th className="px-4 py-3 text-right whitespace-nowrap text-emerald-700">Selesai / Terbit</th>
                <th className="px-4 py-3 text-right whitespace-nowrap text-sky-700">Dalam Proses</th>
                <th className="px-4 py-3 text-right whitespace-nowrap text-rose-700">Ditolak</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedSummaryList.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-2.5 font-semibold text-slate-800 whitespace-nowrap">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium ${
                        item.sumber === 'OSS-RBA'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : item.sumber === 'SICANTIK'
                          ? 'bg-sky-50 text-sky-800 border border-sky-200'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {item.sumber}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-medium text-slate-900">{item.jenis}</td>
                  <td className="px-4 py-2.5 text-right font-bold text-slate-900 whitespace-nowrap">{item.total}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-emerald-700 whitespace-nowrap">{item.selesai}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-sky-700 whitespace-nowrap">{item.proses}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-rose-700 whitespace-nowrap">{item.ditolak}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <Pagination
          currentPage={currentSummaryPage}
          totalItems={summaryList.length}
          itemsPerPage={summaryPageSize}
          onPageChange={setCurrentSummaryPage}
          onItemsPerPageChange={setSummaryPageSize}
          pageSizeOptions={[5, 10, 20]}
        />
      </div>
    </div>
  );
};
