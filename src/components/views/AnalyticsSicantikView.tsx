// DIPTA - Analitik SICANTIK Cloud (PRD Section 13)
import React, { useState, useMemo, useEffect } from 'react';
import { DiptaRecord, StatusDIPTA } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { Pagination } from '../common/Pagination';
import { DiptaStorageService } from '../../services/dataStorage';
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
  Clock,
  CheckCircle2,
  FileText,
  Timer,
  AlertCircle,
  Search,
  Download,
  MapPin,
  XCircle,
  Filter,
  TrendingUp,
  Layers,
  Award,
  Activity
} from 'lucide-react';

interface AnalyticsSicantikViewProps {
  records: DiptaRecord[];
}

const PIE_COLORS = ['#059669', '#0284c7', '#e11d48', '#d97706', '#64748b'];

export const AnalyticsSicantikView: React.FC<AnalyticsSicantikViewProps> = ({ records }) => {
  const sicantikRecords = useMemo(
    () => records.filter(r => r.sumber_aplikasi === 'SICANTIK'),
    [records]
  );

  // Local Filters & Search for Analytics Table & Drilldown
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'SEMUA' | StatusDIPTA>('SEMUA');
  const [kecamatanFilter, setKecamatanFilter] = useState<string>('SEMUA');
  const [slaFilter, setSlaFilter] = useState<'SEMUA' | 'CEPAT' | 'STANDAR' | 'LAMBAT' | 'ANOMALI'>('SEMUA');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Unique Kecamatan list in SICANTIK records
  const availableKecamatan = useMemo(() => {
    const set = new Set<string>();
    sicantikRecords.forEach(r => {
      if (r.kecamatan?.trim()) set.add(r.kecamatan.trim());
    });
    return Array.from(set).sort();
  }, [sicantikRecords]);

  // Filtered records for table & export
  const filteredSicantikRecords = useMemo(() => {
    return sicantikRecords.filter(r => {
      if (statusFilter !== 'SEMUA' && r.status_dipta !== statusFilter) return false;
      if (kecamatanFilter !== 'SEMUA' && (r.kecamatan || '') !== kecamatanFilter) return false;

      if (slaFilter !== 'SEMUA') {
        const d = r.durasi_hari;
        if (slaFilter === 'ANOMALI' && (d === undefined || d >= 0)) return false;
        if (slaFilter === 'CEPAT' && (d === undefined || d < 0 || d > 3)) return false;
        if (slaFilter === 'STANDAR' && (d === undefined || d < 4 || d > 7)) return false;
        if (slaFilter === 'LAMBAT' && (d === undefined || d <= 7)) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchId = r.id_record_sumber?.toLowerCase().includes(q);
        const matchNo = r.nomor_permohonan?.toLowerCase().includes(q);
        const matchPemohon = r.nama_pemohon_usaha?.toLowerCase().includes(q);
        const matchJenis = r.jenis_layanan?.toLowerCase().includes(q);
        const matchDok = r.nomor_dokumen?.toLowerCase().includes(q);
        const matchKec = r.kecamatan?.toLowerCase().includes(q);
        if (!matchId && !matchNo && !matchPemohon && !matchJenis && !matchDok && !matchKec) {
          return false;
        }
      }
      return true;
    });
  }, [sicantikRecords, statusFilter, kecamatanFilter, slaFilter, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [records, statusFilter, kecamatanFilter, slaFilter, searchQuery]);

  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSicantikRecords.slice(start, start + pageSize);
  }, [filteredSicantikRecords, currentPage, pageSize]);

  // KPIs
  const totalLayanan = sicantikRecords.length;
  const uniqueJenis = useMemo(
    () => new Set(sicantikRecords.map(r => r.jenis_layanan).filter(Boolean)).size,
    [sicantikRecords]
  );
  const produkDitetapkan = sicantikRecords.filter(r => r.status_dipta === 'SELESAI_TERBIT').length;
  const dalamProses = sicantikRecords.filter(r => r.status_dipta === 'DALAM_PROSES').length;
  const ditolak = sicantikRecords.filter(r => r.status_dipta === 'DITOLAK').length;
  const anomaliCount = sicantikRecords.filter(r => r.durasi_hari !== undefined && r.durasi_hari < 0).length;

  const rasioTerbit = totalLayanan > 0 ? ((produkDitetapkan / totalLayanan) * 100).toFixed(1) : '0.0';

  // SLA Duration Calculation (hanya untuk data yang tervalidasi dan durasi >= 0)
  const validDurations = useMemo(
    () =>
      sicantikRecords
        .filter(r => r.durasi_hari !== undefined && r.durasi_hari >= 0)
        .map(r => r.durasi_hari!),
    [sicantikRecords]
  );

  const rataRataSLA =
    validDurations.length > 0
      ? (validDurations.reduce((a, b) => a + b, 0) / validDurations.length).toFixed(1)
      : '0';

  const medianSLA = useMemo(() => {
    if (validDurations.length === 0) return 0;
    const sorted = [...validDurations].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  }, [validDurations]);

  const slaFastCount = validDurations.filter(d => d <= 3).length;
  const slaStandardCount = validDurations.filter(d => d >= 4 && d <= 7).length;
  const slaSlowCount = validDurations.filter(d => d > 7).length;

  // Visualisasi 1: Tren Permohonan & Penetapan Berdasarkan Periode
  const trendData = useMemo(() => {
    const trendMap: Record<string, { periode: string; total: number; selesai: number; proses: number }> = {};
    sicantikRecords.forEach(r => {
      const p = r.periode_data || '2026-09';
      if (!trendMap[p]) {
        trendMap[p] = { periode: p, total: 0, selesai: 0, proses: 0 };
      }
      trendMap[p].total += 1;
      if (r.status_dipta === 'SELESAI_TERBIT') trendMap[p].selesai += 1;
      else if (r.status_dipta === 'DALAM_PROSES') trendMap[p].proses += 1;
    });
    return Object.values(trendMap).sort((a, b) => a.periode.localeCompare(b.periode));
  }, [sicantikRecords]);

  // Visualisasi 2: Top Jenis Izin SICANTIK (Horizontal Bar)
  const jenisData = useMemo(() => {
    const jenisMap: Record<string, { total: number; selesai: number; proses: number }> = {};
    sicantikRecords.forEach(r => {
      const j = r.jenis_layanan || 'Lainnya';
      if (!jenisMap[j]) jenisMap[j] = { total: 0, selesai: 0, proses: 0 };
      jenisMap[j].total += 1;
      if (r.status_dipta === 'SELESAI_TERBIT') jenisMap[j].selesai += 1;
      else if (r.status_dipta === 'DALAM_PROSES') jenisMap[j].proses += 1;
    });

    return Object.entries(jenisMap)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 8)
      .map(([jenis, stats]) => ({
        shortJenis: jenis.length > 26 ? jenis.substring(0, 24) + '...' : jenis,
        fullJenis: jenis,
        total: stats.total,
        selesai: stats.selesai,
        proses: stats.proses
      }));
  }, [sicantikRecords]);

  // Visualisasi 3: Sebaran Wilayah Kecamatan (SICANTIK)
  const lokasiData = useMemo(() => {
    const lokasiMap: Record<string, { total: number; selesai: number }> = {};
    sicantikRecords.forEach(r => {
      const l = r.kecamatan?.trim() || 'Belum Terdata';
      if (!lokasiMap[l]) lokasiMap[l] = { total: 0, selesai: 0 };
      lokasiMap[l].total += 1;
      if (r.status_dipta === 'SELESAI_TERBIT') lokasiMap[l].selesai += 1;
    });
    return Object.entries(lokasiMap)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 10)
      .map(([lokasi, s]) => ({
        lokasi,
        total: s.total,
        selesai: s.selesai
      }));
  }, [sicantikRecords]);

  // Visualisasi 4: Distribusi Status & Klasifikasi Kecepatan SLA
  const slaDistributionData = useMemo(() => {
    return [
      { name: 'Cepat (≤ 3 Hari)', value: slaFastCount, color: '#059669' },
      { name: 'Standar (4–7 Hari)', value: slaStandardCount, color: '#0284c7' },
      { name: 'Lambat (> 7 Hari)', value: slaSlowCount, color: '#d97706' },
      { name: 'Anomali Tanggal', value: anomaliCount, color: '#e11d48' }
    ].filter(d => d.value > 0);
  }, [slaFastCount, slaStandardCount, slaSlowCount, anomaliCount]);

  const statusDistributionData = useMemo(() => {
    return [
      { name: 'Selesai / Terbit', value: produkDitetapkan, color: '#059669' },
      { name: 'Dalam Proses', value: dalamProses, color: '#0284c7' },
      { name: 'Ditolak', value: ditolak, color: '#e11d48' }
    ].filter(d => d.value > 0);
  }, [produkDitetapkan, dalamProses, ditolak]);

  const handleExportExcel = () => {
    DiptaStorageService.exportToExcel(filteredSicantikRecords, 'Analitik_SICANTIK_Cloud_OKI');
  };

  return (
    <div id="analytics-sicantik-view" className="space-y-6">
      {/* Header & Top Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-sky-900 via-sky-800 to-indigo-900 text-white p-5 rounded-2xl shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-sky-400/20 text-sky-200 border border-sky-400/30">
              SICANTIK Cloud DPMPTSP OKI
            </span>
            <span className="text-xs text-sky-200">• Layanan Perizinan & Non-Perizinan Daerah</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight">
            Analitik Layanan Perizinan & Non-Perizinan (SICANTIK Cloud)
          </h2>
          <p className="text-xs text-sky-100/80">
            Evaluasi kinerja SLA, sebaran izin tenaga kesehatan, reklame, pendidikan, dan layanan daerah terintegrasi di Kabupaten Ogan Komering Ilir.
          </p>
        </div>

        <button
          onClick={handleExportExcel}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white text-sky-900 hover:bg-sky-50 text-xs font-bold shadow-xs transition-all self-start sm:self-auto shrink-0"
        >
          <Download className="w-4 h-4 text-sky-700" />
          <span>Unduh Data SICANTIK (.XLSX)</span>
        </button>
      </div>

      {/* 6 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Total Permohonan</span>
            <div className="w-7 h-7 rounded-lg bg-sky-50 flex items-center justify-center text-sky-600">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{totalLayanan}</div>
          <div className="text-[11px] text-slate-400 mt-1">Total berkas SICANTIK</div>
        </div>

        <div className="bg-white border border-emerald-200 rounded-xl p-4 shadow-xs bg-gradient-to-b from-white to-emerald-50/30">
          <div className="flex items-center justify-between">
            <span className="text-xs text-emerald-800 font-medium">Telah Ditetapkan</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-700 mt-2">{produkDitetapkan}</div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1">
            {rasioTerbit}% rasio penyelesaian
          </div>
        </div>

        <div className="bg-white border border-sky-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-sky-800 font-medium">Dalam Proses</span>
            <div className="w-7 h-7 rounded-lg bg-sky-100 flex items-center justify-center text-sky-700">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-sky-700 mt-2">{dalamProses}</div>
          <div className="text-[11px] text-slate-400 mt-1">Verifikasi / kajian teknis</div>
        </div>

        <div className="bg-white border border-rose-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-rose-800 font-medium">Ditolak</span>
            <div className="w-7 h-7 rounded-lg bg-rose-100 flex items-center justify-center text-rose-700">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-700 mt-2">{ditolak}</div>
          <div className="text-[11px] text-slate-400 mt-1">Berkas dikembalikan</div>
        </div>

        <div className="bg-white border border-indigo-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-indigo-800 font-medium">Variasi Layanan</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-indigo-700 mt-2">{uniqueJenis}</div>
          <div className="text-[11px] text-slate-400 mt-1">Jenis perizinan daerah</div>
        </div>

        <div className="bg-white border border-amber-200 rounded-xl p-4 shadow-xs bg-amber-50/10">
          <div className="flex items-center justify-between">
            <span className="text-xs text-amber-900 font-medium">Rata-rata SLA</span>
            <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700">
              <Timer className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-700 mt-2">
            {rataRataSLA} <span className="text-xs font-normal text-slate-600">Hari</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Median: <strong>{medianSLA} Hari</strong>
          </div>
        </div>
      </div>

      {/* SLA Performance Summary Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50/70 border border-emerald-200">
          <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
            {slaFastCount}
          </div>
          <div>
            <div className="text-xs font-bold text-emerald-950">SLA Cepat (≤ 3 Hari Kerja)</div>
            <div className="text-[11px] text-emerald-700">Penerbitan izin sangat responsif</div>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-xl bg-sky-50/70 border border-sky-200">
          <div className="w-9 h-9 rounded-lg bg-sky-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
            {slaStandardCount}
          </div>
          <div>
            <div className="text-xs font-bold text-sky-950">SLA Standar (4 – 7 Hari Kerja)</div>
            <div className="text-[11px] text-sky-700">Sesuai SOP pelayanan terpadu</div>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50/70 border border-amber-200">
          <div className="w-9 h-9 rounded-lg bg-amber-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
            {slaSlowCount}
          </div>
          <div>
            <div className="text-xs font-bold text-amber-950">SLA Di Atas 7 Hari (&gt; 7 Hari)</div>
            <div className="text-[11px] text-amber-700">Memerlukan rekomendasi teknis OPD</div>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-xl bg-rose-50/70 border border-rose-200">
          <div className="w-9 h-9 rounded-lg bg-rose-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
            {anomaliCount}
          </div>
          <div>
            <div className="text-xs font-bold text-rose-950">Anomali Durasi Negatif</div>
            <div className="text-[11px] text-rose-700">Tgl penetapan &lt; tgl permohonan</div>
          </div>
        </div>
      </div>

      {/* 4 Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Tren Permohonan vs Selesai */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-sky-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Tren Permohonan & Penetapan Izin</h3>
                <p className="text-[11px] text-slate-500">Perbandingan berkas masuk dan izin selesai per periode</p>
              </div>
            </div>
          </div>
          <div className="h-64 w-full">
            {trendData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Belum ada data tren periode SICANTIK
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="periode" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Line type="monotone" dataKey="total" name="Total Permohonan" stroke="#0284c7" strokeWidth={2.5} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="selesai" name="Telah Ditetapkan (Terbit)" stroke="#059669" strokeWidth={2} dot={{ r: 3.5 }} />
                  <Line type="monotone" dataKey="proses" name="Dalam Proses" stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 2: Top Jenis Izin Daerah (Horizontal Bar) */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-indigo-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Sebaran Jenis Izin Daerah Terbanyak</h3>
                <p className="text-[11px] text-slate-500">Peringkat volume permohonan berdasarkan jenis layanan</p>
              </div>
            </div>
          </div>
          <div className="h-64 w-full">
            {jenisData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Belum ada data jenis izin SICANTIK
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={jenisData}
                  margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} allowDecimals={false} />
                  <YAxis
                    dataKey="shortJenis"
                    type="category"
                    width={145}
                    tick={{ fontSize: 10, fill: '#334155' }}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                    formatter={(v: any, name: any, item: any) => [`${v} Berkas`, `${item.payload.fullJenis} (${name})`]}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="selesai" name="Selesai Terbit" stackId="a" fill="#059669" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="proses" name="Dalam Proses" stackId="a" fill="#0284c7" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 3: Sebaran Wilayah Kecamatan */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Distribusi Wilayah Kecamatan (SICANTIK)</h3>
                <p className="text-[11px] text-slate-500">Volume layanan perizinan daerah per kecamatan di Kab. OKI</p>
              </div>
            </div>
          </div>
          <div className="h-64 w-full">
            {lokasiData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Belum ada data kecamatan SICANTIK
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={lokasiData} margin={{ top: 10, right: 10, left: -15, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="lokasi"
                    tick={{ fontSize: 10, fill: '#475569' }}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="total" name="Total Berkas" fill="#0284c7" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="selesai" name="Selesai / Terbit" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 4: Proporsi Kecepatan SLA & Status */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Distribusi Kinerja Durasi Penyelesaian (SLA)</h3>
                <p className="text-[11px] text-slate-500">Proporsi berkas berdasarkan lama hari pemrosesan</p>
              </div>
            </div>
          </div>
          <div className="h-64 w-full flex items-center justify-center">
            {slaDistributionData.length === 0 && statusDistributionData.length === 0 ? (
              <div className="text-xs text-slate-400">Belum ada data evaluasi SLA</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={slaDistributionData.length > 0 ? slaDistributionData : statusDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={82}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {(slaDistributionData.length > 0 ? slaDistributionData : statusDistributionData).map((entry, i) => (
                      <Cell key={`cell-sla-${i}`} fill={entry.color || PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                    formatter={(val: any, name: any) => [`${val} Berkas`, name]}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Tabel Detail SICANTIK (PRD Section 13) dengan Filter Interaktif */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Daftar Rincian Berkas Pelayanan SICANTIK Cloud ({filteredSicantikRecords.length} dari {sicantikRecords.length} Data)
              </h3>
              <p className="text-[11px] text-slate-500">
                Dilengkapi nama pemohon, wilayah kecamatan, nomor izin, dan indikator kecepatan SLA (Privasi NIK & No HP terlindungi)
              </p>
            </div>
            <span className="text-[11px] text-sky-800 bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-200 font-semibold self-start sm:self-auto">
              Layanan Daerah Terpadu
            </span>
          </div>

          {/* Table Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
            {/* Search input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari pemohon, no permohonan, jenis izin..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="SEMUA">Semua Status DIPTA</option>
                <option value="SELESAI_TERBIT">Selesai / Terbit</option>
                <option value="DALAM_PROSES">Dalam Proses</option>
                <option value="DITOLAK">Ditolak</option>
              </select>
            </div>

            {/* Kecamatan Filter */}
            <div>
              <select
                value={kecamatanFilter}
                onChange={e => setKecamatanFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="SEMUA">Semua Kecamatan ({availableKecamatan.length})</option>
                {availableKecamatan.map(k => (
                  <option key={k} value={k}>
                    Kec. {k}
                  </option>
                ))}
              </select>
            </div>

            {/* SLA Filter */}
            <div>
              <select
                value={slaFilter}
                onChange={e => setSlaFilter(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="SEMUA">Semua Kategori Durasi SLA</option>
                <option value="CEPAT">SLA Cepat (≤ 3 Hari)</option>
                <option value="STANDAR">SLA Standar (4 – 7 Hari)</option>
                <option value="LAMBAT">SLA Lambat (&gt; 7 Hari)</option>
                <option value="ANOMALI">Anomali Tanggal (&lt; 0 Hari)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Mobile Card List */}
        <div className="block md:hidden p-4 space-y-3">
          {paginatedRecords.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">
              Tidak ada data SICANTIK yang sesuai dengan pencarian/filter.
            </div>
          ) : (
            paginatedRecords.map(rec => (
              <div
                key={rec.id_dipta}
                className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs space-y-2.5 hover:border-sky-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-[11px] font-bold text-sky-700">{rec.id_record_sumber}</span>
                    <div className="font-bold text-slate-900 text-xs mt-0.5">{rec.nama_pemohon_usaha || '-'}</div>
                    <div className="text-[11px] text-slate-600">{rec.jenis_layanan}</div>
                  </div>
                  <StatusBadge status={rec.status_dipta} type="dipta" size="sm" />
                </div>

                <div className="bg-slate-50 p-2.5 rounded-lg text-[11px] grid grid-cols-2 gap-2 text-slate-600">
                  <div>
                    <span className="text-slate-400 block text-[10px]">No Permohonan:</span>
                    <span className="font-mono font-medium text-slate-800">{rec.nomor_permohonan || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Kecamatan:</span>
                    <span className="font-medium text-slate-800">{rec.kecamatan || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Tgl Permohonan:</span>
                    <span>{rec.tanggal_permohonan || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Tgl Penetapan:</span>
                    <span className="text-emerald-700 font-medium">{rec.tanggal_penetapan_terbit || '-'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 block text-[10px]">Nomor Izin / SK:</span>
                    <span className="font-mono text-slate-800 truncate block">{rec.nomor_dokumen || '-'}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                  <span className="text-slate-400 text-[11px]">Durasi Pemrosesan (SLA):</span>
                  {rec.durasi_hari !== undefined ? (
                    rec.durasi_hari < 0 ? (
                      <span className="inline-flex items-center gap-1 text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200 text-[10px]">
                        <AlertCircle className="w-3 h-3" />
                        Anomali ({rec.durasi_hari}h)
                      </span>
                    ) : (
                      <span
                        className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                          rec.durasi_hari <= 3
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : rec.durasi_hari <= 7
                            ? 'bg-sky-50 text-sky-700 border border-sky-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {rec.durasi_hari} Hari
                      </span>
                    )
                  ) : (
                    <span className="text-slate-400 text-[11px]">Dalam proses</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full min-w-[1000px] text-xs text-left text-slate-700">
            <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 whitespace-nowrap">ID / No. Permohonan</th>
                <th className="px-4 py-3">Pemohon / Pelaku Usaha</th>
                <th className="px-4 py-3">Jenis Izin Layanan</th>
                <th className="px-4 py-3 whitespace-nowrap">Kecamatan</th>
                <th className="px-4 py-3 whitespace-nowrap">Tgl Permohonan</th>
                <th className="px-4 py-3 whitespace-nowrap">Tgl Penetapan</th>
                <th className="px-4 py-3">Nomor Izin / SK</th>
                <th className="px-4 py-3 text-center whitespace-nowrap">Durasi (SLA)</th>
                <th className="px-4 py-3 whitespace-nowrap">Status DIPTA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                    Tidak ada data SICANTIK yang sesuai dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                paginatedRecords.map(rec => (
                  <tr key={rec.id_dipta} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <div className="font-semibold text-slate-900">{rec.id_record_sumber}</div>
                      <div className="font-mono text-[10px] text-slate-500">{rec.nomor_permohonan || '-'}</div>
                    </td>
                    <td className="px-4 py-2.5 font-semibold text-slate-900 max-w-[180px] truncate" title={rec.nama_pemohon_usaha}>
                      {rec.nama_pemohon_usaha || '-'}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-slate-800 max-w-[230px] truncate" title={rec.jenis_layanan}>
                      {rec.jenis_layanan}
                    </td>
                    <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap">
                      {rec.kecamatan || '-'}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">{rec.tanggal_permohonan || '-'}</td>
                    <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">{rec.tanggal_penetapan_terbit || '-'}</td>
                    <td className="px-4 py-2.5 font-mono text-[11px] text-slate-800 max-w-[180px] truncate" title={rec.nomor_dokumen || '-'}>
                      {rec.nomor_dokumen || '-'}
                    </td>
                    <td className="px-4 py-2.5 text-center whitespace-nowrap">
                      {rec.durasi_hari !== undefined ? (
                        rec.durasi_hari < 0 ? (
                          <span className="inline-flex items-center gap-1 text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200 text-[10px]">
                            <AlertCircle className="w-3 h-3" />
                            Anomali ({rec.durasi_hari}h)
                          </span>
                        ) : (
                          <span
                            className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                              rec.durasi_hari <= 3
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : rec.durasi_hari <= 7
                                ? 'bg-sky-50 text-sky-700 border border-sky-200'
                                : 'bg-amber-50 text-amber-800 border border-amber-200'
                            }`}
                          >
                            {rec.durasi_hari} Hari
                          </span>
                        )
                      ) : (
                        <span className="text-slate-400 text-[11px]">Dalam proses</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <StatusBadge status={rec.status_dipta} type="dipta" size="sm" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <Pagination
          currentPage={currentPage}
          totalItems={filteredSicantikRecords.length}
          itemsPerPage={pageSize}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setPageSize}
          pageSizeOptions={[5, 10, 20, 50]}
        />
      </div>
    </div>
  );
};
