// DIPTA - Analitik SIMBG (PRD Section 14)
import React, { useState, useMemo, useEffect } from 'react';
import { DiptaRecord, StatusDIPTA } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { Pagination } from '../common/Pagination';
import { DiptaStorageService } from '../../services/dataStorage';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import {
  Building2,
  CheckCircle2,
  Clock,
  XCircle,
  FileCheck,
  Layers,
  MapPin,
  Search,
  Filter,
  Download,
  Maximize2,
  TrendingUp
} from 'lucide-react';

interface AnalyticsSimbgViewProps {
  records: DiptaRecord[];
}

const PIE_COLORS = ['#d97706', '#059669', '#0284c7', '#8b5cf6', '#ec4899', '#64748b'];

export const AnalyticsSimbgView: React.FC<AnalyticsSimbgViewProps> = ({ records }) => {
  const simbgRecords = useMemo(
    () => records.filter(r => r.sumber_aplikasi === 'SIMBG'),
    [records]
  );

  // Chart breakdown mode ('layanan' | 'kategori' | 'status')
  const [chartBreakdown, setChartBreakdown] = useState<'layanan' | 'kategori' | 'status'>('layanan');

  // Interactive Table Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [kategoriFilter, setKategoriFilter] = useState<'SEMUA' | 'PBG' | 'SLF Baru' | 'SLF Existing'>('SEMUA');
  const [fungsiFilter, setFungsiFilter] = useState<string>('SEMUA');
  const [statusFilter, setStatusFilter] = useState<'SEMUA' | StatusDIPTA>('SEMUA');
  const [kecamatanFilter, setKecamatanFilter] = useState<string>('SEMUA');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Helper to classify SIMBG record category
  const getSimbgCategory = (r: DiptaRecord): 'PBG' | 'SLF Baru' | 'SLF Existing' => {
    if (r.jenis_permohonan_simbg === 'SLF Baru') return 'SLF Baru';
    if (r.jenis_permohonan_simbg === 'SLF Existing') return 'SLF Existing';
    if (r.jenis_permohonan_simbg === 'PBG') return 'PBG';
    const lower = (r.jenis_layanan || '').toLowerCase();
    if (lower.includes('slf baru')) return 'SLF Baru';
    if (lower.includes('slf')) return 'SLF Existing';
    return 'PBG';
  };

  // Available Fungsi Bangunan & Kecamatan for filter dropdowns
  const availableFungsi = useMemo(() => {
    const set = new Set<string>();
    simbgRecords.forEach(r => {
      if (r.fungsi_bangunan?.trim()) set.add(r.fungsi_bangunan.trim());
    });
    return Array.from(set).sort();
  }, [simbgRecords]);

  const availableKecamatan = useMemo(() => {
    const set = new Set<string>();
    simbgRecords.forEach(r => {
      if (r.kecamatan?.trim()) set.add(r.kecamatan.trim());
    });
    return Array.from(set).sort();
  }, [simbgRecords]);

  // Filtered records for table & export
  const filteredSimbgRecords = useMemo(() => {
    return simbgRecords.filter(r => {
      if (kategoriFilter !== 'SEMUA' && getSimbgCategory(r) !== kategoriFilter) return false;
      if (fungsiFilter !== 'SEMUA' && (r.fungsi_bangunan || '') !== fungsiFilter) return false;
      if (statusFilter !== 'SEMUA' && r.status_dipta !== statusFilter) return false;
      if (kecamatanFilter !== 'SEMUA' && (r.kecamatan || '') !== kecamatanFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchReg = r.id_record_sumber?.toLowerCase().includes(q);
        const matchPemohon = r.nama_pemohon_usaha?.toLowerCase().includes(q);
        const matchJenis = r.jenis_layanan?.toLowerCase().includes(q);
        const matchDok = r.nomor_dokumen?.toLowerCase().includes(q);
        const matchFungsi = r.fungsi_bangunan?.toLowerCase().includes(q);
        const matchKec = r.kecamatan?.toLowerCase().includes(q);
        if (!matchReg && !matchPemohon && !matchJenis && !matchDok && !matchFungsi && !matchKec) {
          return false;
        }
      }
      return true;
    });
  }, [simbgRecords, kategoriFilter, fungsiFilter, statusFilter, kecamatanFilter, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [records, kategoriFilter, fungsiFilter, statusFilter, kecamatanFilter, searchQuery]);

  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSimbgRecords.slice(start, start + pageSize);
  }, [filteredSimbgRecords, currentPage, pageSize]);

  // KPIs (PRD Section 14 + Total Luas Bangunan)
  const totalPermohonan = simbgRecords.length;
  const countPbg = simbgRecords.filter(r => getSimbgCategory(r) === 'PBG').length;
  const countSlfBaru = simbgRecords.filter(r => getSimbgCategory(r) === 'SLF Baru').length;
  const countSlfExisting = simbgRecords.filter(r => getSimbgCategory(r) === 'SLF Existing').length;
  const countSelesai = simbgRecords.filter(r => r.status_dipta === 'SELESAI_TERBIT').length;
  const countProses = simbgRecords.filter(r => r.status_dipta === 'DALAM_PROSES').length;
  const countDitolak = simbgRecords.filter(r => r.status_dipta === 'DITOLAK').length;
  const totalLuasBangunan = simbgRecords.reduce((acc, r) => acc + (r.luas_m2 || 0), 0);

  // Breakdown 1: Sesuai data Jenis Layanan riil pada tabel SIMBG
  const layananBreakdownData = useMemo(() => {
    const layananMap: { [key: string]: { count: number; category: string } } = {};
    simbgRecords.forEach(r => {
      const j = r.jenis_layanan || 'PBG Bangunan Gedung';
      if (!layananMap[j]) {
        const cat = getSimbgCategory(r);
        layananMap[j] = { count: 0, category: cat };
      }
      layananMap[j].count += 1;
    });

    return Object.entries(layananMap)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([jenis, data]) => ({
        fullName: jenis,
        shortName: jenis.length > 22 ? jenis.substring(0, 20) + '...' : jenis,
        total: data.count,
        color: data.category === 'PBG' ? '#d97706' : data.category === 'SLF Baru' ? '#0d9488' : '#4f46e5'
      }));
  }, [simbgRecords]);

  // Breakdown 2: Berdasarkan Kategori Dokumen (PBG vs SLF Baru vs SLF Existing)
  const kategoriBreakdownData = useMemo(() => {
    return [
      { fullName: 'Persetujuan Bangunan Gedung (PBG)', shortName: 'PBG', total: countPbg, color: '#d97706' },
      { fullName: 'Sertifikat Laik Fungsi Baru (SLF Baru)', shortName: 'SLF Baru', total: countSlfBaru, color: '#0d9488' },
      { fullName: 'Sertifikat Laik Fungsi Existing (SLF Existing)', shortName: 'SLF Existing', total: countSlfExisting, color: '#4f46e5' }
    ].filter(d => d.total > 0 || simbgRecords.length === 0);
  }, [countPbg, countSlfBaru, countSlfExisting, simbgRecords.length]);

  // Breakdown 3: Berdasarkan Status Hasil Konsolidasi DIPTA
  const statusBreakdownData = useMemo(() => {
    return [
      { fullName: 'Selesai / Terbit (SK / Sertifikat Terbit)', shortName: 'Selesai / Terbit', total: countSelesai, color: '#059669' },
      { fullName: 'Dalam Proses (Konsultasi / Perbaikan)', shortName: 'Dalam Proses', total: countProses, color: '#0284c7' },
      { fullName: 'Ditolak (Tidak Memenuhi Syarat Teknis)', shortName: 'Ditolak', total: countDitolak, color: '#e11d48' }
    ].filter(d => d.total > 0 || simbgRecords.length === 0);
  }, [countSelesai, countProses, countDitolak, simbgRecords.length]);

  const currentChartData = useMemo(() => {
    if (chartBreakdown === 'kategori') return kategoriBreakdownData;
    if (chartBreakdown === 'status') return statusBreakdownData;
    return layananBreakdownData;
  }, [chartBreakdown, layananBreakdownData, kategoriBreakdownData, statusBreakdownData]);

  // Visualisasi 2: Fungsi Bangunan Gedung (Pie + Luas m2)
  const activeFungsiData = useMemo(() => {
    const fungsiMap: Record<string, { value: number; luas: number }> = {};
    simbgRecords.forEach(r => {
      const f = r.fungsi_bangunan || 'Lainnya';
      if (!fungsiMap[f]) fungsiMap[f] = { value: 0, luas: 0 };
      fungsiMap[f].value += 1;
      fungsiMap[f].luas += r.luas_m2 || 0;
    });
    return Object.entries(fungsiMap)
      .filter(([_, d]) => d.value > 0)
      .sort((a, b) => b[1].value - a[1].value)
      .map(([name, d]) => ({ name, value: d.value, luas: d.luas }));
  }, [simbgRecords]);

  // Visualisasi 3: Distribusi Wilayah Kecamatan SIMBG
  const kecamatanData = useMemo(() => {
    const kecMap: Record<string, { total: number; pbg: number; slf: number }> = {};
    simbgRecords.forEach(r => {
      const k = r.kecamatan?.trim() || 'Belum Terdata';
      if (!kecMap[k]) kecMap[k] = { total: 0, pbg: 0, slf: 0 };
      kecMap[k].total += 1;
      if (getSimbgCategory(r) === 'PBG') kecMap[k].pbg += 1;
      else kecMap[k].slf += 1;
    });
    return Object.entries(kecMap)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 10)
      .map(([kecamatan, d]) => ({
        kecamatan,
        total: d.total,
        pbg: d.pbg,
        slf: d.slf
      }));
  }, [simbgRecords]);

  // Visualisasi 4: Tren Bulanan Permohonan SIMBG
  const trendSimbgData = useMemo(() => {
    const map: Record<string, { periode: string; total: number; selesai: number; proses: number }> = {};
    simbgRecords.forEach(r => {
      const p = r.periode_data || '2026-09';
      if (!map[p]) map[p] = { periode: p, total: 0, selesai: 0, proses: 0 };
      map[p].total += 1;
      if (r.status_dipta === 'SELESAI_TERBIT') map[p].selesai += 1;
      else if (r.status_dipta === 'DALAM_PROSES') map[p].proses += 1;
    });
    return Object.values(map).sort((a, b) => a.periode.localeCompare(b.periode));
  }, [simbgRecords]);

  const handleExportExcel = () => {
    DiptaStorageService.exportToExcel(filteredSimbgRecords, 'Analitik_SIMBG_PBG_SLF_OKI');
  };

  return (
    <div id="analytics-simbg-view" className="space-y-6">
      {/* Header & Top Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-amber-900 via-amber-800 to-emerald-950 text-white p-5 rounded-2xl shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-400/20 text-amber-200 border border-amber-400/30">
              SIMBG Tata Bangunan OKI
            </span>
            <span className="text-xs text-amber-200">• PBG & Sertifikat Laik Fungsi (SLF)</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight">
            Analitik Persetujuan Bangunan Gedung & SLF (SIMBG)
          </h2>
          <p className="text-xs text-amber-100/80">
            Monitoring persetujuan teknis arsitektur, struktur, luas bangunan, dan kelaikan fungsi gedung di Kabupaten Ogan Komering Ilir.
          </p>
        </div>

        <button
          onClick={handleExportExcel}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white text-amber-950 hover:bg-amber-50 text-xs font-bold shadow-xs transition-all self-start sm:self-auto shrink-0"
        >
          <Download className="w-4 h-4 text-amber-700" />
          <span>Unduh Data SIMBG (.XLSX)</span>
        </button>
      </div>

      {/* 8 KPIs (7 PRD KPIs + Total Luas Bangunan m2) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
          <span className="text-[11px] text-slate-500 font-medium block">Total Berkas</span>
          <div className="text-xl font-bold text-slate-900 mt-1">{totalPermohonan}</div>
          <span className="text-[10px] text-slate-400">Permohonan</span>
        </div>

        <div className="bg-white border border-amber-200 rounded-xl p-3.5 shadow-xs bg-amber-50/20">
          <span className="text-[11px] text-amber-800 font-medium block">PBG</span>
          <div className="text-xl font-bold text-amber-700 mt-1">{countPbg}</div>
          <span className="text-[10px] text-amber-600">Persetujuan Gedung</span>
        </div>

        <div className="bg-white border border-teal-200 rounded-xl p-3.5 shadow-xs">
          <span className="text-[11px] text-teal-800 font-medium block">SLF Baru</span>
          <div className="text-xl font-bold text-teal-700 mt-1">{countSlfBaru}</div>
          <span className="text-[10px] text-slate-400">Bangunan Baru</span>
        </div>

        <div className="bg-white border border-indigo-200 rounded-xl p-3.5 shadow-xs">
          <span className="text-[11px] text-indigo-800 font-medium block">SLF Existing</span>
          <div className="text-xl font-bold text-indigo-700 mt-1">{countSlfExisting}</div>
          <span className="text-[10px] text-slate-400">Gedung Eksisting</span>
        </div>

        <div className="bg-white border border-emerald-200 rounded-xl p-3.5 shadow-xs bg-emerald-50/20">
          <span className="text-[11px] text-emerald-800 font-medium block">Selesai / Terbit</span>
          <div className="text-xl font-bold text-emerald-700 mt-1">{countSelesai}</div>
          <span className="text-[10px] text-emerald-600">
            {totalPermohonan > 0 ? ((countSelesai / totalPermohonan) * 100).toFixed(0) : 0}% Terbit
          </span>
        </div>

        <div className="bg-white border border-sky-200 rounded-xl p-3.5 shadow-xs">
          <span className="text-[11px] text-sky-800 font-medium block">Dalam Proses</span>
          <div className="text-xl font-bold text-sky-700 mt-1">{countProses}</div>
          <span className="text-[10px] text-slate-400">Kajian Teknis TPA</span>
        </div>

        <div className="bg-white border border-rose-200 rounded-xl p-3.5 shadow-xs">
          <span className="text-[11px] text-rose-800 font-medium block">Ditolak</span>
          <div className="text-xl font-bold text-rose-700 mt-1">{countDitolak}</div>
          <span className="text-[10px] text-slate-400">Perbaikan / Tolak</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
          <span className="text-[11px] text-slate-600 font-medium block">Total Luas</span>
          <div className="text-lg font-bold text-slate-900 mt-1 truncate" title={`${totalLuasBangunan.toLocaleString('id-ID')} m²`}>
            {totalLuasBangunan.toLocaleString('id-ID')}
          </div>
          <span className="text-[10px] text-slate-400">Meter Persegi (m²)</span>
        </div>
      </div>

      {/* 4 Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Visualisasi 1: Fungsi Bangunan Gedung */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-amber-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Distribusi Fungsi Bangunan Gedung</h3>
                <p className="text-[11px] text-slate-500">Klasifikasi peruntukan bangunan gedung sesuai data SIMBG OKI</p>
              </div>
            </div>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            {activeFungsiData.length === 0 ? (
              <div className="text-xs text-slate-400">Belum ada data fungsi bangunan</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={activeFungsiData}
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, value }) => `${name} (${value})`}
                  >
                    {activeFungsiData.map((_, i) => (
                      <Cell key={`cell-fungsi-${i}`} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                    formatter={(val: any, name: any, item: any) => [
                      `${val} Gedung (${(item?.payload?.luas || 0).toLocaleString('id-ID')} m²)`,
                      name
                    ]}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Visualisasi 2: Jenis Pelayanan / Kategori / Status SIMBG */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {chartBreakdown === 'layanan'
                  ? 'Distribusi Jenis Pelayanan SIMBG'
                  : chartBreakdown === 'kategori'
                  ? 'Distribusi Kategori PBG & SLF'
                  : 'Distribusi Status Pelayanan SIMBG'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {chartBreakdown === 'layanan'
                  ? 'Data riil per jenis permohonan gedung di OKI'
                  : chartBreakdown === 'kategori'
                  ? 'Klasifikasi permohonan izin PBG & SLF'
                  : 'Progres penyelesaian berkas SIMBG'}
              </p>
            </div>
            {/* Toggle Breakdown Options */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg self-start sm:self-auto shrink-0">
              <button
                type="button"
                onClick={() => setChartBreakdown('layanan')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                  chartBreakdown === 'layanan'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Jenis Layanan
              </button>
              <button
                type="button"
                onClick={() => setChartBreakdown('kategori')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                  chartBreakdown === 'kategori'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Kategori
              </button>
              <button
                type="button"
                onClick={() => setChartBreakdown('status')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                  chartBreakdown === 'status'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Status
              </button>
            </div>
          </div>

          <div className="h-64 w-full">
            {currentChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Belum ada data permohonan SIMBG untuk filter ini
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={currentChartData} margin={{ top: 12, right: 10, left: -20, bottom: chartBreakdown === 'layanan' ? 28 : 12 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="shortName"
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    interval={0}
                    angle={chartBreakdown === 'layanan' ? -18 : 0}
                    textAnchor={chartBreakdown === 'layanan' ? 'end' : 'middle'}
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                    formatter={(val: any, _name: any, item: any) => [`${val} Permohonan`, item.payload.fullName]}
                  />
                  <Bar dataKey="total" name="Jumlah Permohonan" radius={[4, 4, 0, 0]}>
                    {currentChartData.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Visualisasi 3: Sebaran Wilayah Kecamatan (PBG vs SLF) */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Sebaran Permohonan PBG & SLF per Kecamatan</h3>
                <p className="text-[11px] text-slate-500">Distribusi lokasi pembangunan gedung di Kabupaten OKI</p>
              </div>
            </div>
          </div>
          <div className="h-64 w-full">
            {kecamatanData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Belum ada data kecamatan SIMBG
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={kecamatanData} margin={{ top: 10, right: 10, left: -15, bottom: 22 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="kecamatan"
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
                  <Bar dataKey="pbg" name="PBG" stackId="a" fill="#d97706" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="slf" name="SLF (Baru & Existing)" stackId="a" fill="#0d9488" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Visualisasi 4: Tren Periode Permohonan & Penerbitan SIMBG */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-teal-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Tren Bulanan Permohonan & Penerbitan SIMBG</h3>
                <p className="text-[11px] text-slate-500">Perkembangan berkas PBG/SLF masuk dan terbit per periode</p>
              </div>
            </div>
          </div>
          <div className="h-64 w-full">
            {trendSimbgData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Belum ada data tren periode SIMBG
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendSimbgData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="periode" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Line type="monotone" dataKey="total" name="Total Permohonan" stroke="#d97706" strokeWidth={2.5} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="selesai" name="Selesai / Terbit" stroke="#059669" strokeWidth={2} dot={{ r: 3.5 }} />
                  <Line type="monotone" dataKey="proses" name="Dalam Proses" stroke="#0284c7" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Tabel Detail SIMBG (PRD Section 14) dengan Filter Interaktif */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Daftar Rincian Pelayanan SIMBG PBG / SLF ({filteredSimbgRecords.length} dari {simbgRecords.length} Data)
              </h3>
              <span className="text-[11px] text-slate-500">
                Termasuk harmonisasi status asli SIMBG ke standar DIPTA serta rincian fungsi dan luas bangunan (m²)
              </span>
            </div>
            <span className="text-[11px] text-amber-900 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 font-semibold self-start sm:self-auto">
              SIMBG Tata Bangunan OKI
            </span>
          </div>

          {/* Interactive Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-1">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari no registrasi, pemohon, SK..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
              />
            </div>

            {/* Kategori PBG / SLF */}
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={kategoriFilter}
                onChange={e => setKategoriFilter(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="SEMUA">Semua Kategori (PBG & SLF)</option>
                <option value="PBG">PBG (Persetujuan Bangunan)</option>
                <option value="SLF Baru">SLF Baru</option>
                <option value="SLF Existing">SLF Existing</option>
              </select>
            </div>

            {/* Fungsi Bangunan */}
            <div>
              <select
                value={fungsiFilter}
                onChange={e => setFungsiFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="SEMUA">Semua Fungsi Bangunan</option>
                {availableFungsi.map(f => (
                  <option key={f} value={f}>
                    Fungsi: {f}
                  </option>
                ))}
              </select>
            </div>

            {/* Kecamatan */}
            <div>
              <select
                value={kecamatanFilter}
                onChange={e => setKecamatanFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="SEMUA">Semua Kecamatan ({availableKecamatan.length})</option>
                {availableKecamatan.map(k => (
                  <option key={k} value={k}>
                    Kec. {k}
                  </option>
                ))}
              </select>
            </div>

            {/* Status DIPTA */}
            <div>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="SEMUA">Semua Status DIPTA</option>
                <option value="SELESAI_TERBIT">Selesai / Terbit</option>
                <option value="DALAM_PROSES">Dalam Proses</option>
                <option value="DITOLAK">Ditolak</option>
              </select>
            </div>
          </div>
        </div>

        {/* Mobile Card List */}
        <div className="block md:hidden p-4 space-y-3">
          {paginatedRecords.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">
              Tidak ada data SIMBG yang sesuai dengan filter pencarian.
            </div>
          ) : (
            paginatedRecords.map(rec => {
              const cat = getSimbgCategory(rec);
              return (
                <div
                  key={rec.id_dipta}
                  className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs space-y-2.5 hover:border-amber-300 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-slate-900">{rec.id_record_sumber}</span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                            cat === 'PBG'
                              ? 'bg-amber-100 text-amber-800'
                              : cat === 'SLF Baru'
                              ? 'bg-teal-100 text-teal-800'
                              : 'bg-indigo-100 text-indigo-800'
                          }`}
                        >
                          {cat}
                        </span>
                      </div>
                      <div className="font-semibold text-slate-900 text-xs mt-1">{rec.nama_pemohon_usaha}</div>
                    </div>
                    <StatusBadge status={rec.status_dipta} type="dipta" size="sm" />
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-lg text-[11px] grid grid-cols-2 gap-2 text-slate-600">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Jenis Permohonan:</span>
                      <span className="font-medium text-slate-800">{rec.jenis_layanan}</span>
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
                      <span className="text-slate-400 block text-[10px]">Status Asli SIMBG:</span>
                      <span className="text-slate-700">{rec.status_asli}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-400 block text-[10px]">Fungsi & Luas Bangunan:</span>
                      <span className="text-slate-800 font-medium">
                        {rec.fungsi_bangunan || '-'} {rec.luas_m2 ? `• ${rec.luas_m2.toLocaleString('id-ID')} m²` : ''}
                      </span>
                    </div>
                    {rec.nomor_dokumen && (
                      <div className="col-span-2">
                        <span className="text-slate-400 block text-[10px]">No Dokumen / SK PBG-SLF:</span>
                        <span className="font-mono text-slate-800 text-[11px] truncate block">{rec.nomor_dokumen}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full min-w-[1000px] text-xs text-left text-slate-700">
            <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 whitespace-nowrap">Nomor Registrasi</th>
                <th className="px-4 py-3 whitespace-nowrap">Kategori</th>
                <th className="px-4 py-3">Jenis Permohonan</th>
                <th className="px-4 py-3">Pemohon / Pemilik</th>
                <th className="px-4 py-3">Fungsi & Luas Gedung</th>
                <th className="px-4 py-3 whitespace-nowrap">Kecamatan</th>
                <th className="px-4 py-3 whitespace-nowrap">Tgl Permohonan</th>
                <th className="px-4 py-3 whitespace-nowrap">Status Asli Sumber</th>
                <th className="px-4 py-3 whitespace-nowrap">Status DIPTA</th>
                <th className="px-4 py-3">No Dokumen / SK</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-slate-400">
                    Tidak ada data SIMBG yang sesuai dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                paginatedRecords.map(rec => {
                  const cat = getSimbgCategory(rec);
                  return (
                    <tr key={rec.id_dipta} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-2.5 font-mono font-semibold text-slate-900 whitespace-nowrap">
                        {rec.id_record_sumber}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            cat === 'PBG'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : cat === 'SLF Baru'
                              ? 'bg-teal-50 text-teal-800 border border-teal-200'
                              : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                          }`}
                        >
                          {cat}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-medium text-slate-800 max-w-[200px] truncate" title={rec.jenis_layanan}>
                        {rec.jenis_layanan}
                      </td>
                      <td className="px-4 py-2.5 font-semibold text-slate-900 max-w-[180px] truncate" title={rec.nama_pemohon_usaha}>
                        {rec.nama_pemohon_usaha}
                      </td>
                      <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap">
                        <div className="font-medium text-slate-900">{rec.fungsi_bangunan || '-'}</div>
                        {rec.luas_m2 !== undefined && rec.luas_m2 > 0 && (
                          <div className="text-[10px] text-slate-500 font-mono">
                            Luas: {rec.luas_m2.toLocaleString('id-ID')} m²
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap">
                        {rec.kecamatan || '-'}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">
                        {rec.tanggal_permohonan || '-'}
                      </td>
                      <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap">
                        <span className="px-2 py-0.5 bg-slate-100 rounded text-[11px] font-medium">
                          {rec.status_asli}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <StatusBadge status={rec.status_dipta} type="dipta" size="sm" />
                      </td>
                      <td className="px-4 py-2.5 font-mono text-[11px] text-slate-700 max-w-[170px] truncate" title={rec.nomor_dokumen || '-'}>
                        {rec.nomor_dokumen || '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <Pagination
          currentPage={currentPage}
          totalItems={filteredSimbgRecords.length}
          itemsPerPage={pageSize}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setPageSize}
          pageSizeOptions={[5, 10, 20, 50]}
        />
      </div>
    </div>
  );
};
