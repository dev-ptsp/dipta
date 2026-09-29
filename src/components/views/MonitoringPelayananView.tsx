// DIPTA - Monitoring Pelayanan View (PRD Sections 9, 22, 23, 25)
import React, { useState, useMemo, useEffect } from 'react';
import { DiptaRecord, GlobalFilter, SourceApp, User } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { Pagination } from '../common/Pagination';
import { DiptaStorageService } from '../../services/dataStorage';
import { Download, Search, Eye, X, ShieldAlert, CheckCircle2, Building2, LayoutGrid, Table as TableIcon, Calendar, MapPin, Tag } from 'lucide-react';

interface MonitoringPelayananViewProps {
  records: DiptaRecord[];
  filterSource?: SourceApp;
  title: string;
  subtitle: string;
  currentUser: User;
}

export const MonitoringPelayananView: React.FC<MonitoringPelayananViewProps> = ({
  records,
  filterSource,
  title,
  subtitle,
  currentUser
}) => {
  const [selectedRecord, setSelectedRecord] = useState<DiptaRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'auto' | 'table' | 'cards'>('auto');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filter if scoped to a specific source application
  const baseRecords = filterSource
    ? records.filter(r => r.sumber_aplikasi === filterSource)
    : records;

  const displayRecords = useMemo(() => {
    if (!searchQuery.trim()) return baseRecords;
    const q = searchQuery.toLowerCase().trim();
    return baseRecords.filter(r =>
      r.id_record_sumber.toLowerCase().includes(q) ||
      r.nama_pemohon_usaha.toLowerCase().includes(q) ||
      r.jenis_layanan.toLowerCase().includes(q) ||
      (r.kecamatan && r.kecamatan.toLowerCase().includes(q)) ||
      r.sumber_aplikasi.toLowerCase().includes(q) ||
      (r.nomor_permohonan && r.nomor_permohonan.toLowerCase().includes(q))
    );
  }, [baseRecords, searchQuery]);

  // Reset to page 1 whenever filters or search query change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterSource, records]);

  // Paginated slice
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return displayRecords.slice(start, start + pageSize);
  }, [displayRecords, currentPage, pageSize]);

  const handleExport = () => {
    const reportName = filterSource ? `Monitoring_${filterSource.replace(/[^a-zA-Z0-9]/g, '_')}` : 'Monitoring_Seluruh_Sumber';
    DiptaStorageService.exportToExcel(displayRecords, reportName);
  };

  return (
    <div id="monitoring-pelayanan-view" className="space-y-6">
      {/* View Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h2>
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="btn-export-monitoring"
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Ekspor Data (XLSX)</span>
          </button>
        </div>
      </div>

      {/* Data Minimization Notice (PRD Section 25) */}
      <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
        <ShieldAlert className="w-4 h-4 text-emerald-600 shrink-0" />
        <span>
          <strong>Prinsip Data Minimization Aktif:</strong> Sesuai PRD Bagian 25, data pribadi warga (NIK, nomor HP, email) tidak dimuat ke dalam layer analitik dan monitoring publik.
        </span>
      </div>

      {/* Data Table / Cards Container */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        {/* Controls Bar: Search & View Switcher */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <div className="text-xs font-semibold text-slate-800">
              Daftar Berkas Pelayanan ({displayRecords.length} Data)
            </div>
            <div className="text-[11px] text-slate-500">
              Menampilkan identitas asli sumber dan status terstandarisasi DIPTA
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari ID, pemohon, layanan..."
                className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 w-44 sm:w-56"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* View Mode Toggle (Table / Card) */}
            <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg border border-slate-300/60">
              <button
                type="button"
                onClick={() => setViewMode(viewMode === 'cards' ? 'auto' : 'cards')}
                title="Tampilan Kartu (Mobile Friendly)"
                className={`p-1.5 rounded-md text-xs transition-colors ${
                  viewMode === 'cards'
                    ? 'bg-white text-emerald-700 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode(viewMode === 'table' ? 'auto' : 'table')}
                title="Tampilan Tabel Lengkap"
                className={`p-1.5 rounded-md text-xs transition-colors ${
                  viewMode === 'table'
                    ? 'bg-white text-emerald-700 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* 1. Mobile Card View (shown on mobile when 'auto', or explicitly when viewMode === 'cards') */}
        <div
          className={`p-4 space-y-3 ${
            viewMode === 'cards'
              ? 'block'
              : viewMode === 'table'
              ? 'hidden'
              : 'block md:hidden'
          }`}
        >
          {paginatedRecords.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              Tidak ada data yang sesuai dengan pencarian atau filter.
            </div>
          ) : (
            paginatedRecords.map(rec => (
              <div
                key={rec.id_dipta}
                className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs hover:border-emerald-300 transition-colors space-y-3"
              >
                {/* Card Top: Source badge + ID + DIPTA status */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          rec.sumber_aplikasi === 'OSS-RBA'
                            ? 'bg-emerald-100 text-emerald-800'
                            : rec.sumber_aplikasi === 'SICANTIK'
                            ? 'bg-sky-100 text-sky-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {rec.sumber_aplikasi}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {rec.id_record_sumber}
                      </span>
                    </div>
                    <div className="font-semibold text-slate-900 text-xs mt-1">
                      {rec.nama_pemohon_usaha}
                    </div>
                  </div>
                  <div className="shrink-0">
                    <StatusBadge status={rec.status_dipta} type="dipta" size="sm" />
                  </div>
                </div>

                {/* Card Info Grid */}
                <div className="bg-slate-50 rounded-lg p-2.5 text-[11px] grid grid-cols-2 gap-2 text-slate-600">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Jenis Layanan:</span>
                    <span className="font-medium text-slate-800 line-clamp-1">{rec.jenis_layanan}</span>
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
                    <span className="text-slate-400 block text-[10px]">Tgl Penetapan / Terbit:</span>
                    <span className="text-emerald-700 font-medium">{rec.tanggal_penetapan_terbit || '-'}</span>
                  </div>
                </div>

                {/* Card Footer: Status Asli & Validasi & Button */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                      Asli: {rec.status_asli}
                    </span>
                    <StatusBadge status={rec.status_validasi} type="validasi" size="sm" />
                  </div>

                  <button
                    id={`btn-card-view-${rec.id_dipta}`}
                    onClick={() => setSelectedRecord(rec)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors shrink-0"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Detail</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 2. Desktop Table View (shown on desktop when 'auto', or explicitly when viewMode === 'table') */}
        <div
          className={`overflow-x-auto ${
            viewMode === 'table'
              ? 'block'
              : viewMode === 'cards'
              ? 'hidden'
              : 'hidden md:block'
          }`}
        >
          <table className="w-full min-w-[960px] text-xs text-left text-slate-700">
            <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200">
              <tr>
                <th className="px-3.5 py-3 whitespace-nowrap">Sumber / ID Asli</th>
                <th className="px-3.5 py-3">Pemohon / Perusahaan</th>
                <th className="px-3.5 py-3">Jenis Layanan</th>
                <th className="px-3.5 py-3 whitespace-nowrap">Kecamatan</th>
                <th className="px-3.5 py-3 whitespace-nowrap">Tgl Masuk / Terbit</th>
                <th className="px-3.5 py-3 whitespace-nowrap">Status Asli Sumber</th>
                <th className="px-3.5 py-3 whitespace-nowrap">Status DIPTA</th>
                <th className="px-3.5 py-3 whitespace-nowrap">Validasi</th>
                <th className="px-3.5 py-3 text-center whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                    Tidak ada data yang sesuai dengan pencarian atau filter.
                  </td>
                </tr>
              ) : (
                paginatedRecords.map(rec => (
                  <tr key={rec.id_dipta} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-3.5 py-2.5 whitespace-nowrap">
                      <div className="font-semibold text-slate-900">{rec.id_record_sumber}</div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1">
                        <span className="font-medium text-emerald-700">{rec.sumber_aplikasi}</span>
                        <span>•</span>
                        <span>{rec.jenis_dataset}</span>
                      </div>
                    </td>
                    <td className="px-3.5 py-2.5 max-w-[200px] truncate font-medium text-slate-900" title={rec.nama_pemohon_usaha}>
                      {rec.nama_pemohon_usaha}
                    </td>
                    <td className="px-3.5 py-2.5 max-w-[220px] truncate text-slate-800" title={rec.jenis_layanan}>
                      {rec.jenis_layanan}
                    </td>
                    <td className="px-3.5 py-2.5 whitespace-nowrap text-slate-700">
                      {rec.kecamatan || '-'}
                    </td>
                    <td className="px-3.5 py-2.5 whitespace-nowrap text-[11px] text-slate-600">
                      <div>P: {rec.tanggal_permohonan || '-'}</div>
                      <div className="text-emerald-700 font-medium">T: {rec.tanggal_penetapan_terbit || '-'}</div>
                    </td>
                    <td className="px-3.5 py-2.5 whitespace-nowrap text-slate-600 text-[11px]">
                      {rec.status_asli}
                    </td>
                    <td className="px-3.5 py-2.5 whitespace-nowrap">
                      <StatusBadge status={rec.status_dipta} type="dipta" size="sm" />
                    </td>
                    <td className="px-3.5 py-2.5 whitespace-nowrap">
                      <StatusBadge status={rec.status_validasi} type="validasi" size="sm" />
                    </td>
                    <td className="px-3.5 py-2.5 text-center whitespace-nowrap">
                      <button
                        id={`btn-view-${rec.id_dipta}`}
                        onClick={() => setSelectedRecord(rec)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Detail</span>
                      </button>
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
          totalItems={displayRecords.length}
          itemsPerPage={pageSize}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setPageSize}
          pageSizeOptions={[10, 20, 50, 100]}
        />
      </div>

      {/* Record Detail Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div
            id="modal-record-detail"
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200"
          >
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/60 rounded-t-2xl">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                  {selectedRecord.sumber_aplikasi.substring(0, 3)}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Detail Berkas Pelayanan
                  </h3>
                  <p className="text-xs text-slate-500">ID Konsolidasi: {selectedRecord.id_dipta}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-100">
                <div>
                  <span className="text-slate-400 text-[11px] block">Aplikasi Sumber</span>
                  <span className="font-semibold text-slate-800 text-sm">{selectedRecord.sumber_aplikasi}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Jenis Dataset</span>
                  <span className="font-semibold text-slate-800 text-sm">{selectedRecord.jenis_dataset}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">ID Record Sumber (Asli)</span>
                  <span className="font-semibold text-slate-900 text-sm font-mono">{selectedRecord.id_record_sumber}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Nomor Permohonan</span>
                  <span className="font-semibold text-slate-900">{selectedRecord.nomor_permohonan || '-'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-100">
                <div className="col-span-2">
                  <span className="text-slate-400 text-[11px] block">Nama Pemohon / Perusahaan</span>
                  <span className="font-semibold text-slate-900 text-sm">{selectedRecord.nama_pemohon_usaha}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Kelompok Layanan</span>
                  <span className="font-medium text-slate-800">{selectedRecord.kelompok_layanan}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Jenis Layanan</span>
                  <span className="font-medium text-slate-800">{selectedRecord.jenis_layanan}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Kecamatan</span>
                  <span className="font-medium text-slate-800">{selectedRecord.kecamatan || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Kelurahan / Desa</span>
                  <span className="font-medium text-slate-800">{selectedRecord.kelurahan || '-'}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 pb-4 border-b border-slate-100">
                <div>
                  <span className="text-slate-400 text-[11px] block">Tgl Permohonan</span>
                  <span className="font-medium text-slate-800">{selectedRecord.tanggal_permohonan || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Tgl Penetapan / Terbit</span>
                  <span className="font-medium text-slate-800">{selectedRecord.tanggal_penetapan_terbit || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">No Dokumen / Izin / SK</span>
                  <span className="font-medium text-slate-800">{selectedRecord.nomor_dokumen || '-'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-100">
                <div>
                  <span className="text-slate-400 text-[11px] block mb-1">Status Asli Sumber</span>
                  <span className="font-medium text-slate-700 bg-slate-100 px-2.5 py-1 rounded">
                    {selectedRecord.status_asli}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block mb-1">Status Standar DIPTA</span>
                  <StatusBadge status={selectedRecord.status_dipta} type="dipta" />
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block mb-1">Status Validasi</span>
                  <StatusBadge status={selectedRecord.status_validasi} type="validasi" />
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block mb-1">Catatan Validasi</span>
                  <span className="text-slate-600">{selectedRecord.catatan_validasi || 'Lolos validasi sistem'}</span>
                </div>
              </div>

              {/* Dataset Specific Info */}
              {selectedRecord.investasi_rupiah && (
                <div className="p-3 bg-emerald-50/60 rounded-lg border border-emerald-100 space-y-1">
                  <div className="font-semibold text-emerald-900">Data Investasi & Tenaga Kerja (OSS):</div>
                  <div>Nilai Investasi: <strong>Rp {selectedRecord.investasi_rupiah.toLocaleString('id-ID')}</strong></div>
                  <div>Tenaga Kerja Indonesia (TKI): <strong>{selectedRecord.tki_count} Orang</strong></div>
                  {selectedRecord.kbli_code && (
                    <div>KBLI: {selectedRecord.kbli_code} — {selectedRecord.kbli_title}</div>
                  )}
                </div>
              )}

              {selectedRecord.fungsi_bangunan && (
                <div className="p-3 bg-amber-50/60 rounded-lg border border-amber-100 space-y-1">
                  <div className="font-semibold text-amber-900">Data Bangunan Gedung (SIMBG):</div>
                  <div>Fungsi: <strong>{selectedRecord.fungsi_bangunan}</strong> ({selectedRecord.subfungsi_bangunan})</div>
                  <div>Luas: {selectedRecord.luas_m2} m² • Lantai: {selectedRecord.jumlah_lantai}</div>
                </div>
              )}

              {selectedRecord.durasi_hari !== undefined && (
                <div className="p-3 bg-sky-50/60 rounded-lg border border-sky-100">
                  <span className="font-semibold text-sky-900">Durasi Layanan SICANTIK: </span>
                  <strong>{selectedRecord.durasi_hari} Hari Kalender</strong>
                </div>
              )}

              <div className="pt-2 text-[11px] text-slate-400 flex justify-between">
                <span>Diperbarui: {selectedRecord.tanggal_update_dipta}</span>
                <span>Operator: {selectedRecord.operator_update}</span>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end rounded-b-2xl">
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-semibold hover:bg-slate-900 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
