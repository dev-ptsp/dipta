// DIPTA - Monitoring Pelayanan View (PRD Sections 9, 22, 23, 25)
import React, { useState, useMemo, useEffect } from 'react';
import { DiptaRecord, GlobalFilter, SourceApp, User, StatusDIPTA } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { Pagination } from '../common/Pagination';
import { DiptaStorageService } from '../../services/dataStorage';
import {
  Download,
  Search,
  Eye,
  X,
  ShieldAlert,
  CheckCircle2,
  Building2,
  LayoutGrid,
  Table as TableIcon,
  Calendar,
  MapPin,
  Tag,
  Edit3,
  Clock,
  XCircle,
  AlertCircle,
  HelpCircle,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  Check,
  FileText
} from 'lucide-react';

interface MonitoringPelayananViewProps {
  records: DiptaRecord[];
  filterSource?: SourceApp;
  title: string;
  subtitle: string;
  currentUser: User;
  onDataRefresh?: () => void;
}

export const MonitoringPelayananView: React.FC<MonitoringPelayananViewProps> = ({
  records,
  filterSource,
  title,
  subtitle,
  currentUser,
  onDataRefresh
}) => {
  const [selectedRecord, setSelectedRecord] = useState<DiptaRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'auto' | 'table' | 'cards'>('auto');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Status Change Modal State
  const [statusModalRecord, setStatusModalRecord] = useState<DiptaRecord | null>(null);
  const [targetStatus, setTargetStatus] = useState<StatusDIPTA>('SELESAI_TERBIT');
  const [alasanPerubahan, setAlasanPerubahan] = useState<string>('');
  const [nomorDokumenInput, setNomorDokumenInput] = useState<string>('');
  const [tanggalTerbitInput, setTanggalTerbitInput] = useState<string>('');
  const [catatanValidasiInput, setCatatanValidasiInput] = useState<string>('');
  const [statusChangeFeedback, setStatusChangeFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSubmittingStatus, setIsSubmittingStatus] = useState<boolean>(false);

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

  // Check RBAC permission for modifying record
  const canUserChangeRecord = (rec: DiptaRecord) => {
    const role = currentUser.role_code;
    if (role === 'SYSTEM_ADMIN' || role === 'PROJECT_LEADER' || role === 'DATA_ADMIN') return true;
    if (role === 'OPERATOR_OSS' && rec.sumber_aplikasi === 'OSS-RBA') return true;
    if (role === 'OPERATOR_SICANTIK' && rec.sumber_aplikasi === 'SICANTIK') return true;
    if (role === 'OPERATOR_SIMBG' && rec.sumber_aplikasi === 'SIMBG') return true;
    return false;
  };

  const handleOpenStatusModal = (rec: DiptaRecord) => {
    setStatusModalRecord(rec);
    setTargetStatus(rec.status_dipta);
    setAlasanPerubahan('');
    setNomorDokumenInput(rec.nomor_dokumen || '');
    setTanggalTerbitInput(rec.tanggal_penetapan_terbit || new Date().toISOString().substring(0, 10));
    setCatatanValidasiInput(rec.catatan_validasi || '');
    setStatusChangeFeedback(null);
  };

  const handleSaveStatusChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusModalRecord) return;

    if (!alasanPerubahan.trim()) {
      setStatusChangeFeedback({
        type: 'error',
        message: 'Alasan perubahan status wajib diisi agar akuntabilitas audit trail terjamin.'
      });
      return;
    }

    setIsSubmittingStatus(true);
    setStatusChangeFeedback(null);

    setTimeout(() => {
      const result = DiptaStorageService.updateRecordStatusDipta(
        statusModalRecord.id_dipta,
        targetStatus,
        currentUser,
        {
          alasanPerubahan: alasanPerubahan.trim(),
          nomorDokumen: nomorDokumenInput.trim() || undefined,
          tanggalPenetapanTerbit: targetStatus === 'SELESAI_TERBIT' ? (tanggalTerbitInput || undefined) : undefined,
          catatanValidasi: catatanValidasiInput.trim() || undefined
        }
      );

      setIsSubmittingStatus(false);

      if (result.success && result.record) {
        setStatusChangeFeedback({
          type: 'success',
          message: `Status DIPTA berhasil diubah menjadi "${result.record.status_dipta}". Data riwayat tersimpan ke Audit Trail.`
        });

        // Update selectedRecord if open in detail modal
        if (selectedRecord && selectedRecord.id_dipta === statusModalRecord.id_dipta) {
          setSelectedRecord(result.record);
        }

        // Trigger parent dataset reload
        if (onDataRefresh) {
          onDataRefresh();
        }

        setTimeout(() => {
          setStatusModalRecord(null);
          setStatusChangeFeedback(null);
        }, 1100);
      } else {
        setStatusChangeFeedback({
          type: 'error',
          message: result.error || 'Gagal mengubah status DIPTA.'
        });
      }
    }, 300);
  };

  // Preset reason recommendations
  const REASON_PRESETS: { [key in StatusDIPTA]?: string[] } = {
    SELESAI_TERBIT: [
      'SK Izin telah ditandatangani Kepala Dinas dan diterbitkan resmi',
      'Verifikasi teknis OPD telah disetujui & Sertifikat Standar diverifikasi',
      'Persetujuan Bangunan Gedung (PBG) telah terbit setelah sidang TPA',
      'Koreksi status hasil rekonsiliasi data dengan portal kementerian'
    ],
    DALAM_PROSES: [
      'Berkas masuk tahap verifikasi teknis perangkat daerah pengampu',
      'Pemohon telah melengkapi kekurangan berkas persyaratan',
      'Penjadwalan survei dan peninjauan lokasi lapangan',
      'Menunggu konfirmasi validasi pembayaran retribusi'
    ],
    DITOLAK: [
      'Persyaratan teknis dan persetujuan tata ruang (KKPR) tidak terpenuhi',
      'Pemohon tidak melengkapi perbaikan dalam batas waktu SLA',
      'Rencana konstruksi bangunan tidak memenuhi standar keselamatan PUPR',
      'Permohonan dibatalkan atas permintaan pemohon'
    ],
    BELUM_DIKLASIFIKASIKAN: [
      'Memerlukan penelaahan master status mapping',
      'Status belum dipetakan dalam standardisasi baku DIPTA'
    ]
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
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
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
            <div className="text-[11px] text-slate-400 mt-0.5">
              Klik <strong>Ubah Status</strong> pada baris permohonan untuk memperbarui status DIPTA dan mencatat alasan perubahan.
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="input-search-monitoring"
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari ID, pemohon, izin..."
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* View Mode Switcher */}
            <div className="flex items-center border border-slate-200 rounded-lg bg-white p-0.5 shrink-0">
              <button
                onClick={() => setViewMode('auto')}
                className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
                  viewMode === 'auto' ? 'bg-slate-100 text-slate-800 font-semibold' : 'text-slate-500 hover:text-slate-700'
                }`}
                title="Tampilan Otomatis (Tabel di Layar Lebar, Kartu di HP)"
              >
                Auto
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded transition-colors ${
                  viewMode === 'table' ? 'bg-slate-100 text-slate-800' : 'text-slate-400 hover:text-slate-600'
                }`}
                title="Paksa Tampilan Tabel"
              >
                <TableIcon className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded transition-colors ${
                  viewMode === 'cards' ? 'bg-slate-100 text-slate-800' : 'text-slate-400 hover:text-slate-600'
                }`}
                title="Paksa Tampilan Kartu"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* 1. Mobile Cards View */}
        <div
          className={`p-4 grid grid-cols-1 sm:grid-cols-2 gap-3.5 ${
            viewMode === 'cards'
              ? 'block'
              : viewMode === 'table'
              ? 'hidden'
              : 'block md:hidden'
          }`}
        >
          {paginatedRecords.length === 0 ? (
            <div className="col-span-full py-8 text-center text-xs text-slate-400">
              Tidak ada data berkas yang sesuai dengan pencarian atau filter.
            </div>
          ) : (
            paginatedRecords.map(rec => (
              <div
                key={rec.id_dipta}
                className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs hover:border-slate-300 transition-all space-y-2.5"
              >
                {/* Card Header: Source & Status */}
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

                {/* Card Footer: Status Asli & Action Buttons */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                      Asli: {rec.status_asli}
                    </span>
                    <StatusBadge status={rec.status_validasi} type="validasi" size="sm" />
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      id={`btn-card-view-${rec.id_dipta}`}
                      onClick={() => setSelectedRecord(rec)}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-500" />
                      <span>Detail</span>
                    </button>

                    <button
                      id={`btn-card-change-status-${rec.id_dipta}`}
                      onClick={() => handleOpenStatusModal(rec)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Ubah Status</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 2. Desktop Table View */}
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
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          id={`btn-view-${rec.id_dipta}`}
                          onClick={() => setSelectedRecord(rec)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                          title="Lihat Detail Lengkap Berkas"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-500" />
                          <span>Detail</span>
                        </button>

                        <button
                          id={`btn-change-status-${rec.id_dipta}`}
                          onClick={() => handleOpenStatusModal(rec)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/60 rounded-md transition-colors cursor-pointer"
                          title="Ubah Status DIPTA Berkas Ini"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Ubah Status</span>
                        </button>
                      </div>
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
              {/* Action Banner to Change Status */}
              <div className="p-3.5 bg-gradient-to-r from-indigo-50 to-sky-50 border border-indigo-200/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div>
                  <div className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span>Aksi Pembaruan Status DIPTA</span>
                  </div>
                  <div className="text-[11px] text-indigo-800/80 mt-0.5">
                    Status saat ini: <strong className="text-indigo-950">{selectedRecord.status_dipta}</strong>. Klik tombol untuk memperbarui status dan menambahkan alasan ke audit log.
                  </div>
                </div>

                <button
                  type="button"
                  id={`btn-modal-change-status-${selectedRecord.id_dipta}`}
                  onClick={() => handleOpenStatusModal(selectedRecord)}
                  className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors shrink-0 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Ubah Status DIPTA</span>
                </button>
              </div>

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

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2 rounded-b-2xl">
              <button
                type="button"
                onClick={() => handleOpenStatusModal(selectedRecord)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Ubah Status DIPTA</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-semibold hover:bg-slate-900 transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: UBAH STATUS DIPTA */}
      {statusModalRecord && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div
            id="modal-change-status-dipta"
            className="bg-white rounded-2xl max-w-xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 flex flex-col"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/80 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">
                    Ubah Status DIPTA
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Aksi penyesuaian status standar berkas pelayanan publik
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStatusModalRecord(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveStatusChange} className="p-6 space-y-4 text-xs">
              {/* Feedback Alert */}
              {statusChangeFeedback && (
                <div
                  className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 animate-in fade-in duration-200 ${
                    statusChangeFeedback.type === 'success'
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                      : 'bg-rose-50 border border-rose-200 text-rose-900'
                  }`}
                >
                  {statusChangeFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <strong className="font-semibold block">
                      {statusChangeFeedback.type === 'success' ? 'Sukses' : 'Perhatian'}
                    </strong>
                    <span>{statusChangeFeedback.message}</span>
                  </div>
                </div>
              )}

              {/* Record Summary Strip */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        statusModalRecord.sumber_aplikasi === 'OSS-RBA'
                          ? 'bg-emerald-100 text-emerald-800'
                          : statusModalRecord.sumber_aplikasi === 'SICANTIK'
                          ? 'bg-sky-100 text-sky-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {statusModalRecord.sumber_aplikasi}
                    </span>
                    <span className="font-mono text-slate-600 text-[11px] font-semibold">
                      {statusModalRecord.id_record_sumber}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px]">
                    <span className="text-slate-400">Status Saat Ini:</span>
                    <StatusBadge status={statusModalRecord.status_dipta} type="dipta" size="sm" />
                  </div>
                </div>

                <div className="text-slate-800 font-bold text-xs truncate">
                  {statusModalRecord.nama_pemohon_usaha}
                </div>
                <div className="text-slate-500 text-[11px] truncate">
                  {statusModalRecord.jenis_layanan} • Kec. {statusModalRecord.kecamatan || '-'}
                </div>
                <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-200/60 flex justify-between">
                  <span>Status Asli Sumber: <strong>{statusModalRecord.status_asli}</strong></span>
                  <span>No. Permohonan: <strong>{statusModalRecord.nomor_permohonan || '-'}</strong></span>
                </div>
              </div>

              {/* Status Target Selection Cards (4 Pillars) */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  Pilih Status Standar DIPTA Baru:
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Option 1: SELESAI_TERBIT */}
                  <div
                    onClick={() => {
                      setTargetStatus('SELESAI_TERBIT');
                      if (!tanggalTerbitInput) {
                        setTanggalTerbitInput(new Date().toISOString().substring(0, 10));
                      }
                    }}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      targetStatus === 'SELESAI_TERBIT'
                        ? 'bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className={`w-4 h-4 ${targetStatus === 'SELESAI_TERBIT' ? 'text-emerald-600' : 'text-slate-400'}`} />
                        <span className="font-bold text-xs text-slate-900">Selesai / Terbit</span>
                      </div>
                      {targetStatus === 'SELESAI_TERBIT' && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                      Dokumen/SK izin resmi telah disahkan dan terbit bagi pemohon.
                    </p>
                  </div>

                  {/* Option 2: DALAM_PROSES */}
                  <div
                    onClick={() => setTargetStatus('DALAM_PROSES')}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      targetStatus === 'DALAM_PROSES'
                        ? 'bg-amber-50/70 border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className={`w-4 h-4 ${targetStatus === 'DALAM_PROSES' ? 'text-amber-600' : 'text-slate-400'}`} />
                        <span className="font-bold text-xs text-slate-900">Dalam Proses</span>
                      </div>
                      {targetStatus === 'DALAM_PROSES' && (
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                      Tahap verifikasi berkas, kajian teknis OPD, atau survei lokasi.
                    </p>
                  </div>

                  {/* Option 3: DITOLAK */}
                  <div
                    onClick={() => setTargetStatus('DITOLAK')}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      targetStatus === 'DITOLAK'
                        ? 'bg-rose-50/70 border-rose-500 ring-2 ring-rose-500/20 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <XCircle className={`w-4 h-4 ${targetStatus === 'DITOLAK' ? 'text-rose-600' : 'text-slate-400'}`} />
                        <span className="font-bold text-xs text-slate-900">Ditolak</span>
                      </div>
                      {targetStatus === 'DITOLAK' && (
                        <span className="w-2 h-2 rounded-full bg-rose-500" />
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                      Persyaratan teknis atau tata ruang tidak terpenuhi / dibatalkan.
                    </p>
                  </div>

                  {/* Option 4: BELUM_DIKLASIFIKASIKAN */}
                  <div
                    onClick={() => setTargetStatus('BELUM_DIKLASIFIKASIKAN')}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      targetStatus === 'BELUM_DIKLASIFIKASIKAN'
                        ? 'bg-slate-100 border-slate-400 ring-2 ring-slate-400/20 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <HelpCircle className={`w-4 h-4 ${targetStatus === 'BELUM_DIKLASIFIKASIKAN' ? 'text-slate-700' : 'text-slate-400'}`} />
                        <span className="font-bold text-xs text-slate-900">Belum Diklasifikasikan</span>
                      </div>
                      {targetStatus === 'BELUM_DIKLASIFIKASIKAN' && (
                        <span className="w-2 h-2 rounded-full bg-slate-600" />
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                      Menunggu standardisasi pemetaan atau klarifikasi petugas.
                    </p>
                  </div>
                </div>
              </div>

              {/* Conditional Extra Fields for SELESAI_TERBIT */}
              {targetStatus === 'SELESAI_TERBIT' && (
                <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-3 animate-in fade-in duration-150">
                  <div className="font-semibold text-emerald-950 flex items-center gap-1.5 text-xs">
                    <FileText className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Data Legalitas Dokumen / Izin Terbit:</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Nomor Dokumen / SK Izin / Sertifikat:
                      </label>
                      <input
                        type="text"
                        value={nomorDokumenInput}
                        onChange={e => setNomorDokumenInput(e.target.value)}
                        placeholder="contoh: 503/024/DPMPTSP/2026"
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Tanggal Penetapan / Terbit:
                      </label>
                      <input
                        type="date"
                        value={tanggalTerbitInput}
                        onChange={e => setTanggalTerbitInput(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Mandatory Reason Box for Audit Trail */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Alasan / Dasar Pertimbangan Perubahan Status <span className="text-rose-500">*</span>:
                </label>
                <textarea
                  required
                  rows={2}
                  value={alasanPerubahan}
                  onChange={e => setAlasanPerubahan(e.target.value)}
                  placeholder="Ketikkan alasan atau pilih rekomendasi cepat di bawah..."
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors"
                />

                {/* Quick Preset Reason Chips */}
                <div className="mt-2 space-y-1">
                  <span className="text-[10px] text-slate-400 font-medium block">
                    Pilihan Cepat Alasan Perubahan:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {(REASON_PRESETS[targetStatus] || []).map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setAlasanPerubahan(preset)}
                        className="text-[10px] px-2 py-1 rounded-md bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 transition-colors text-left"
                      >
                        + {preset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Optional Validation Notes */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Catatan Validasi Petugas (Opsional):
                </label>
                <input
                  type="text"
                  value={catatanValidasiInput}
                  onChange={e => setCatatanValidasiInput(e.target.value)}
                  placeholder="Catatan tambahan untuk tim verifikator..."
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* RBAC Authority Notice */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <span className="text-slate-500">Petugas Pembaru: </span>
                    <strong className="text-slate-800">{currentUser.full_name}</strong>
                    <span className="text-slate-400"> ({currentUser.role_name})</span>
                  </div>
                </div>

                {canUserChangeRecord(statusModalRecord) ? (
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[10px]">
                    <Check className="w-3 h-3" />
                    <span>Otorisasi Sah</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-rose-700 font-semibold bg-rose-50 px-2 py-0.5 rounded border border-rose-200 text-[10px]">
                    <X className="w-3 h-3" />
                    <span>Akses Dibatasi</span>
                  </span>
                )}
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStatusModalRecord(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={isSubmittingStatus || !canUserChangeRecord(statusModalRecord)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingStatus ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Simpan Perubahan Status DIPTA</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
