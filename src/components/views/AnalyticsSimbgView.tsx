// DIPTA - Analitik SIMBG (PRD Section 14)
import React, { useState, useMemo, useEffect } from 'react';
import { DiptaRecord } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { Pagination } from '../common/Pagination';
import {
  BarChart,
  Bar,
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
import { Building2, Home, CheckCircle2, Clock, XCircle, FileCheck, Layers } from 'lucide-react';

interface AnalyticsSimbgViewProps {
  records: DiptaRecord[];
}

const PIE_COLORS = ['#d97706', '#059669', '#0284c7', '#8b5cf6', '#ec4899', '#64748b'];

export const AnalyticsSimbgView: React.FC<AnalyticsSimbgViewProps> = ({ records }) => {
  const simbgRecords = records.filter(r => r.sumber_aplikasi === 'SIMBG');

  // Chart breakdown mode ('layanan' | 'kategori' | 'status')
  const [chartBreakdown, setChartBreakdown] = useState<'layanan' | 'kategori' | 'status'>('layanan');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [records]);

  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return simbgRecords.slice(start, start + pageSize);
  }, [simbgRecords, currentPage, pageSize]);

  // 7 KPIs (PRD Section 14)
  const totalPermohonan = simbgRecords.length;
  const countPbg = simbgRecords.filter(r => r.jenis_permohonan_simbg === 'PBG' || (r.jenis_layanan && r.jenis_layanan.toLowerCase().includes('pbg'))).length;
  const countSlfBaru = simbgRecords.filter(r => r.jenis_permohonan_simbg === 'SLF Baru' || (r.jenis_layanan && r.jenis_layanan.toLowerCase().includes('slf baru'))).length;
  const countSlfExisting = simbgRecords.filter(r => r.jenis_permohonan_simbg === 'SLF Existing' || (r.jenis_layanan && (r.jenis_layanan.toLowerCase().includes('slf existing') || (r.jenis_layanan.toLowerCase().includes('slf') && !r.jenis_layanan.toLowerCase().includes('baru'))))).length;
  const countSelesai = simbgRecords.filter(r => r.status_dipta === 'SELESAI_TERBIT').length;
  const countProses = simbgRecords.filter(r => r.status_dipta === 'DALAM_PROSES').length;
  const countDitolak = simbgRecords.filter(r => r.status_dipta === 'DITOLAK').length;

  // Breakdown 1: Sesuai data Jenis Layanan riil pada tabel SIMBG
  const layananBreakdownData = useMemo(() => {
    const layananMap: { [key: string]: { count: number; category: string } } = {};
    simbgRecords.forEach(r => {
      const j = r.jenis_layanan || 'PBG Bangunan Gedung';
      if (!layananMap[j]) {
        const lower = j.toLowerCase();
        let cat = 'PBG';
        if (lower.includes('slf baru')) cat = 'SLF Baru';
        else if (lower.includes('slf')) cat = 'SLF Existing';
        layananMap[j] = { count: 0, category: cat };
      }
      layananMap[j].count += 1;
    });

    return Object.entries(layananMap)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([jenis, data]) => ({
        fullName: jenis,
        shortName: jenis.length > 20 ? jenis.substring(0, 18) + '...' : jenis,
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

  // Chart data aktif sesuai tab breakdown
  const currentChartData = useMemo(() => {
    if (chartBreakdown === 'kategori') return kategoriBreakdownData;
    if (chartBreakdown === 'status') return statusBreakdownData;
    return layananBreakdownData;
  }, [chartBreakdown, layananBreakdownData, kategoriBreakdownData, statusBreakdownData]);

  // Visualisasi 2: Fungsi Bangunan Gedung
  const activeFungsiData = useMemo(() => {
    const fungsiMap: { [key: string]: number } = {};
    simbgRecords.forEach(r => {
      const f = r.fungsi_bangunan || 'Lainnya';
      fungsiMap[f] = (fungsiMap[f] || 0) + 1;
    });
    return Object.entries(fungsiMap)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({ name, value }));
  }, [simbgRecords]);

  // Visualisasi 3: Kecamatan
  const kecamatanData = useMemo(() => {
    const kecMap: { [key: string]: number } = {};
    simbgRecords.forEach(r => {
      const k = r.kecamatan || 'Belum Terdata';
      kecMap[k] = (kecMap[k] || 0) + 1;
    });
    return Object.entries(kecMap).map(([kecamatan, total]) => ({ kecamatan, total }));
  }, [simbgRecords]);

  return (
    <div id="analytics-simbg-view" className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          Analitik Persetujuan Bangunan Gedung & SLF (SIMBG)
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Monitoring persetujuan teknis arsitektur, struktur, dan keandalan bangunan gedung di Kabupaten Ogan Komering Ilir.
        </p>
      </div>

      {/* 7 KPIs (PRD Section 14) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
          <span className="text-[11px] text-slate-500 font-medium">Total Permohonan</span>
          <div className="text-xl font-bold text-slate-900 mt-1">{totalPermohonan}</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
          <span className="text-[11px] text-amber-700 font-medium">PBG</span>
          <div className="text-xl font-bold text-amber-700 mt-1">{countPbg}</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
          <span className="text-[11px] text-teal-700 font-medium">SLF Baru</span>
          <div className="text-xl font-bold text-teal-700 mt-1">{countSlfBaru}</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
          <span className="text-[11px] text-indigo-700 font-medium">SLF Existing</span>
          <div className="text-xl font-bold text-indigo-700 mt-1">{countSlfExisting}</div>
        </div>

        <div className="bg-white border border-emerald-200 rounded-xl p-3.5 shadow-xs bg-emerald-50/20">
          <span className="text-[11px] text-emerald-800 font-medium">Selesai / Terbit</span>
          <div className="text-xl font-bold text-emerald-700 mt-1">{countSelesai}</div>
        </div>

        <div className="bg-white border border-sky-200 rounded-xl p-3.5 shadow-xs">
          <span className="text-[11px] text-sky-800 font-medium">Dalam Proses</span>
          <div className="text-xl font-bold text-sky-700 mt-1">{countProses}</div>
        </div>

        <div className="bg-white border border-rose-200 rounded-xl p-3.5 shadow-xs">
          <span className="text-[11px] text-rose-800 font-medium">Ditolak</span>
          <div className="text-xl font-bold text-rose-700 mt-1">{countDitolak}</div>
        </div>
      </div>

      {/* Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fungsi Bangunan */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div className="mb-3">
            <h3 className="text-sm font-bold text-slate-900">Distribusi Fungsi Bangunan Gedung</h3>
            <p className="text-[11px] text-slate-500">Klasifikasi pemanfaatan gedung sesuai data SIMBG OKI</p>
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
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, value }) => `${name} (${value})`}
                  >
                    {activeFungsiData.map((_, i) => (
                      <Cell key={`cell-fungsi-${i}`} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                    formatter={(val: any, name: any) => [`${val} Gedung`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Jenis Pelayanan SIMBG (Selected in Focus Mode) */}
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
      </div>

      {/* Tabel Detail SIMBG (PRD Section 14) */}
      {/* Kolom: nomor registrasi, jenis permohonan, tanggal, status asli, status DIPTA, nomor dokumen, fungsi bangunan, kecamatan */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-bold text-slate-900">
              Tabel Detail Pelayanan SIMBG PBG / SLF ({simbgRecords.length} Data)
            </h3>
            <span className="text-[11px] text-slate-500">
              Termasuk penanganan harmonisasi Status SLF (UAT-04)
            </span>
          </div>
          <span className="text-[11px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-medium self-start sm:self-auto">
            SIMBG Tata Bangunan OKI
          </span>
        </div>

        {/* Mobile Card List */}
        <div className="block md:hidden p-4 space-y-3">
          {paginatedRecords.map(rec => (
            <div
              key={rec.id_dipta}
              className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs space-y-2.5 hover:border-emerald-300 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="font-mono text-xs font-bold text-slate-900">{rec.id_record_sumber}</span>
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
                  <span className="text-slate-400 block text-[10px]">Tanggal:</span>
                  <span>{rec.tanggal_permohonan || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Status Asli SIMBG:</span>
                  <span className="text-slate-700">{rec.status_asli}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 block text-[10px]">Fungsi Bangunan:</span>
                  <span className="text-slate-800 font-medium">
                    {rec.fungsi_bangunan || '-'} {rec.luas_m2 ? `(${rec.luas_m2} m²)` : ''}
                  </span>
                </div>
                {rec.nomor_dokumen && (
                  <div className="col-span-2">
                    <span className="text-slate-400 block text-[10px]">No Dokumen / SK PBG:</span>
                    <span className="font-mono text-slate-800 text-[11px] truncate block">{rec.nomor_dokumen}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full min-w-[900px] text-xs text-left text-slate-700">
            <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 whitespace-nowrap">Nomor Registrasi</th>
                <th className="px-4 py-3">Jenis Permohonan</th>
                <th className="px-4 py-3">Pemohon</th>
                <th className="px-4 py-3 whitespace-nowrap">Tanggal</th>
                <th className="px-4 py-3 whitespace-nowrap">Status Asli Sumber</th>
                <th className="px-4 py-3 whitespace-nowrap">Status DIPTA</th>
                <th className="px-4 py-3">No Dokumen / SK</th>
                <th className="px-4 py-3">Fungsi Bangunan</th>
                <th className="px-4 py-3 whitespace-nowrap">Kecamatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedRecords.map(rec => (
                <tr key={rec.id_dipta} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-2.5 font-mono font-semibold text-slate-900 whitespace-nowrap">
                    {rec.id_record_sumber}
                  </td>
                  <td className="px-4 py-2.5 font-medium text-slate-800">
                    {rec.jenis_layanan}
                  </td>
                  <td className="px-4 py-2.5 text-slate-900 max-w-[180px] truncate" title={rec.nama_pemohon_usaha}>
                    {rec.nama_pemohon_usaha}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">
                    {rec.tanggal_permohonan || '-'}
                  </td>
                  <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap">
                    {rec.status_asli}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <StatusBadge status={rec.status_dipta} type="dipta" size="sm" />
                  </td>
                  <td className="px-4 py-2.5 font-mono text-[11px] text-slate-700 max-w-xs truncate" title={rec.nomor_dokumen || '-'}>
                    {rec.nomor_dokumen || '-'}
                  </td>
                  <td className="px-4 py-2.5 text-slate-700">
                    {rec.fungsi_bangunan || '-'} {rec.luas_m2 ? `(${rec.luas_m2} m²)` : ''}
                  </td>
                  <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap">
                    {rec.kecamatan || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <Pagination
          currentPage={currentPage}
          totalItems={simbgRecords.length}
          itemsPerPage={pageSize}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setPageSize}
          pageSizeOptions={[5, 10, 20, 50]}
        />
      </div>
    </div>
  );
};
