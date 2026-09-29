// DIPTA - Analitik SICANTIK Cloud (PRD Section 13)
import React, { useState, useMemo, useEffect } from 'react';
import { DiptaRecord } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { Pagination } from '../common/Pagination';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { Clock, CheckCircle2, FileText, Timer, AlertCircle } from 'lucide-react';

interface AnalyticsSicantikViewProps {
  records: DiptaRecord[];
}

export const AnalyticsSicantikView: React.FC<AnalyticsSicantikViewProps> = ({ records }) => {
  const sicantikRecords = records.filter(r => r.sumber_aplikasi === 'SICANTIK');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [records]);

  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sicantikRecords.slice(start, start + pageSize);
  }, [sicantikRecords, currentPage, pageSize]);

  // KPIs
  const totalLayanan = sicantikRecords.length;
  const uniqueJenis = Array.from(new Set(sicantikRecords.map(r => r.jenis_layanan))).length;
  const produkDitetapkan = sicantikRecords.filter(r => r.status_dipta === 'SELESAI_TERBIT').length;

  // SLA Duration Calculation (hanya untuk data yang tervalidasi dan durasi >= 0)
  const validDurations = sicantikRecords
    .filter(r => r.durasi_hari !== undefined && r.durasi_hari >= 0)
    .map(r => r.durasi_hari!);

  const rataRataSLA = validDurations.length > 0
    ? (validDurations.reduce((a, b) => a + b, 0) / validDurations.length).toFixed(1)
    : '0';

  // Sort for median
  let medianSLA = 0;
  if (validDurations.length > 0) {
    const sorted = [...validDurations].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    medianSLA = sorted.length % 2 !== 0 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  }

  // Visualisasi 1: Tren Permohonan
  const trendMap: { [key: string]: number } = {};
  sicantikRecords.forEach(r => {
    const p = r.periode_data || '2026-09';
    trendMap[p] = (trendMap[p] || 0) + 1;
  });
  const trendData = Object.entries(trendMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([periode, total]) => ({ periode, total }));

  // Visualisasi 2: Jenis Izin SICANTIK
  const jenisMap: { [key: string]: number } = {};
  sicantikRecords.forEach(r => {
    const j = r.jenis_layanan || 'Lainnya';
    jenisMap[j] = (jenisMap[j] || 0) + 1;
  });
  const jenisData = Object.entries(jenisMap).map(([jenis, total]) => ({
    shortJenis: jenis.length > 25 ? jenis.substring(0, 22) + '...' : jenis,
    fullJenis: jenis,
    total
  }));

  // Visualisasi 3: Lokasi / Kecamatan
  const lokasiMap: { [key: string]: number } = {};
  sicantikRecords.forEach(r => {
    const l = r.kecamatan || 'Belum Terdata';
    lokasiMap[l] = (lokasiMap[l] || 0) + 1;
  });
  const lokasiData = Object.entries(lokasiMap).map(([lokasi, total]) => ({ lokasi, total }));

  return (
    <div id="analytics-sicantik-view" className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          Analitik Layanan Non-Perizinan (SICANTIK Cloud)
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Monitoring perizinan kesehatan, reklame, dan layanan daerah terintegrasi dari SICANTIK Cloud DPMPTSP OKI.
        </p>
      </div>

      {/* 4 KPIs (PRD Section 13) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Jumlah Layanan</span>
            <FileText className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{totalLayanan}</div>
          <div className="text-[11px] text-slate-400 mt-1">Total berkas SICANTIK</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Jumlah Jenis Pelayanan</span>
            <FileText className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-indigo-700 mt-2">{uniqueJenis}</div>
          <div className="text-[11px] text-slate-400 mt-1">Variasi izin daerah</div>
        </div>

        <div className="bg-white border border-emerald-200 rounded-xl p-4 shadow-xs bg-emerald-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs text-emerald-800 font-medium">Produk Telah Ditetapkan</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-700 mt-2">{produkDitetapkan}</div>
          <div className="text-[11px] text-emerald-600 mt-1">SK / Izin selesai terbit</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Rata-rata Waktu SLA</span>
            <Timer className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-700 mt-2">
            {rataRataSLA} <span className="text-sm font-normal text-slate-600">Hari</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Median penyelesaian: {medianSLA} Hari</div>
        </div>
      </div>

      {/* Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-3">Tren Permohonan Berdasarkan Periode</h3>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="periode" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="total" name="Total Permohonan" stroke="#0284c7" strokeWidth={2.5} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-3">Sebaran Jenis Izin Daerah</h3>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={jenisData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="shortJenis" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip formatter={(v: any, name: any, item: any) => [v, item.payload.fullJenis]} />
                <Bar dataKey="total" name="Jumlah Permohonan" fill="#0284c7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tabel Detail SICANTIK (PRD Section 13) */}
      {/* Kolom: ID, nomor permohonan, jenis izin, tanggal permohonan, tanggal penetapan, nomor izin, durasi */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-bold text-slate-900">
              Tabel Detail Pelayanan SICANTIK Cloud ({sicantikRecords.length} Data)
            </h3>
            <span className="text-[11px] text-slate-500">
              Privasi terlindungi: NIK dan nomor kontak disaring keluar
            </span>
          </div>
          <span className="text-[11px] text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200 font-medium self-start sm:self-auto">
            Layanan Daerah Terpadu
          </span>
        </div>

        {/* Mobile Card List */}
        <div className="block md:hidden p-4 space-y-3">
          {paginatedRecords.map(rec => (
            <div
              key={rec.id_dipta}
              className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs space-y-2.5 hover:border-sky-300 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="font-mono text-xs font-bold text-slate-900">{rec.id_record_sumber}</span>
                  <div className="font-semibold text-slate-900 text-xs mt-1">{rec.jenis_layanan}</div>
                </div>
                <StatusBadge status={rec.status_dipta} type="dipta" size="sm" />
              </div>

              <div className="bg-slate-50 p-2.5 rounded-lg text-[11px] grid grid-cols-2 gap-2 text-slate-600">
                <div>
                  <span className="text-slate-400 block text-[10px]">No Permohonan:</span>
                  <span className="font-mono">{rec.nomor_permohonan || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">No Dokumen / Izin:</span>
                  <span className="font-mono text-slate-800 truncate block">{rec.nomor_dokumen || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Tgl Permohonan:</span>
                  <span>{rec.tanggal_permohonan || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Tgl Penetapan:</span>
                  <span className="text-emerald-700 font-medium">{rec.tanggal_penetapan_terbit || '-'}</span>
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
                    <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                      {rec.durasi_hari} Hari
                    </span>
                  )
                ) : (
                  <span className="text-slate-400">Dalam proses</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full min-w-[850px] text-xs text-left text-slate-700">
            <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 whitespace-nowrap">ID SICANTIK</th>
                <th className="px-4 py-3 whitespace-nowrap">Nomor Permohonan</th>
                <th className="px-4 py-3">Jenis Izin</th>
                <th className="px-4 py-3 whitespace-nowrap">Tgl Permohonan</th>
                <th className="px-4 py-3 whitespace-nowrap">Tgl Penetapan</th>
                <th className="px-4 py-3">Nomor Izin</th>
                <th className="px-4 py-3 text-center whitespace-nowrap">Durasi (SLA)</th>
                <th className="px-4 py-3 whitespace-nowrap">Status DIPTA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedRecords.map(rec => (
                <tr key={rec.id_dipta} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-2.5 font-semibold text-slate-900 whitespace-nowrap">{rec.id_record_sumber}</td>
                  <td className="px-4 py-2.5 font-mono text-slate-700 whitespace-nowrap">{rec.nomor_permohonan || '-'}</td>
                  <td className="px-4 py-2.5 font-medium text-slate-800 max-w-xs truncate" title={rec.jenis_layanan}>{rec.jenis_layanan}</td>
                  <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">{rec.tanggal_permohonan || '-'}</td>
                  <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">{rec.tanggal_penetapan_terbit || '-'}</td>
                  <td className="px-4 py-2.5 font-mono text-[11px] text-slate-800 max-w-xs truncate" title={rec.nomor_dokumen || '-'}>{rec.nomor_dokumen || '-'}</td>
                  <td className="px-4 py-2.5 text-center whitespace-nowrap">
                    {rec.durasi_hari !== undefined ? (
                      rec.durasi_hari < 0 ? (
                        <span className="inline-flex items-center gap-1 text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200 text-[10px]">
                          <AlertCircle className="w-3 h-3" />
                          Anomali ({rec.durasi_hari}h)
                        </span>
                      ) : (
                        <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                          {rec.durasi_hari} Hari
                        </span>
                      )
                    ) : (
                      <span className="text-slate-400">Dalam proses</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <StatusBadge status={rec.status_dipta} type="dipta" size="sm" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <Pagination
          currentPage={currentPage}
          totalItems={sicantikRecords.length}
          itemsPerPage={pageSize}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setPageSize}
          pageSizeOptions={[5, 10, 20, 50]}
        />
      </div>
    </div>
  );
};
