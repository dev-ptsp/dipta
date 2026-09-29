// DIPTA - Data Quality Module (PRD Sections 17, 18, 19, 20)
import React, { useState, useEffect, useMemo } from 'react';
import { DiptaRecord, DataQualityIssue, User } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { Pagination } from '../common/Pagination';
import { DiptaStorageService } from '../../services/dataStorage';
import {
  CheckCircle,
  AlertTriangle,
  Copy,
  AlertOctagon,
  FileCheck2,
  Edit,
  Eye,
  Check,
  MessageSquare,
  X,
  Layers,
  Search,
  ShieldCheck
} from 'lucide-react';

interface DataQualityViewProps {
  records: DiptaRecord[];
  issues: DataQualityIssue[];
  currentUser: User;
  onRefresh: () => void;
}

export const DataQualityView: React.FC<DataQualityViewProps> = ({
  records,
  issues,
  currentUser,
  onRefresh
}) => {
  const [activeTab, setActiveTab] = useState<'ALL_ISSUES' | 'PERLU_VERIFIKASI' | 'DUPLIKAT' | 'VALID' | 'ERROR_IMPORT'>('PERLU_VERIFIKASI');
  const [selectedIssue, setSelectedIssue] = useState<DataQualityIssue | null>(null);
  const [actionModalType, setActionModalType] = useState<'VIEW' | 'VALIDATE' | 'CORRECT' | 'NOTE' | null>(null);

  // Form states for correction modal
  const [correctionNote, setCorrectionNote] = useState('');
  const [correctedDatePermohonan, setCorrectedDatePermohonan] = useState('');
  const [correctedDatePenetapan, setCorrectedDatePenetapan] = useState('');
  const [correctedStatusDipta, setCorrectedStatusDipta] = useState('SELESAI_TERBIT');

  // KPIs (PRD Section 20)
  const totalData = records.length;
  const validCount = records.filter(r => r.status_validasi === 'VALID').length;
  const perluVerifikasiCount = records.filter(r => r.status_validasi === 'PERLU_VERIFIKASI').length;
  const duplicateCount = records.filter(r => r.status_validasi === 'DUPLIKAT').length;
  const errorImportCount = records.filter(r => r.status_validasi === 'ERROR_IMPORT').length;

  const handleOpenAction = (issue: DataQualityIssue, type: 'VIEW' | 'VALIDATE' | 'CORRECT' | 'NOTE') => {
    setSelectedIssue(issue);
    setActionModalType(type);
    const rec = records.find(r => r.id_dipta === issue.id_dipta);
    if (rec) {
      setCorrectedDatePermohonan(rec.tanggal_permohonan || '');
      setCorrectedDatePenetapan(rec.tanggal_penetapan_terbit || '');
      setCorrectedStatusDipta(rec.status_dipta);
    }
    setCorrectionNote('');
  };

  const handleApplyResolution = (actionType: 'TANDAI_VALID' | 'KOREKSI' | 'ABAIKAN') => {
    if (!selectedIssue) return;

    let koreksiData: Partial<DiptaRecord> | undefined = undefined;
    if (actionType === 'KOREKSI') {
      koreksiData = {
        tanggal_permohonan: correctedDatePermohonan || undefined,
        tanggal_penetapan_terbit: correctedDatePenetapan || undefined,
        status_dipta: correctedStatusDipta as any
      };
    }

    DiptaStorageService.resolveIssue(
      selectedIssue.issue_id,
      actionType,
      currentUser,
      correctionNote,
      koreksiData
    );

    setSelectedIssue(null);
    setActionModalType(null);
    onRefresh();
  };

  // Filtered issues or records
  const displayedIssues = useMemo(() => {
    if (activeTab === 'PERLU_VERIFIKASI') {
      return issues.filter(i => i.jenis_error !== 'DUPLIKASI' && i.status_isu === 'TERBUKA');
    } else if (activeTab === 'DUPLIKAT') {
      return issues.filter(i => i.jenis_error === 'DUPLIKASI');
    }
    return issues;
  }, [issues, activeTab]);

  // Pagination for Issues table
  const [currentIssuePage, setCurrentIssuePage] = useState(1);
  const [issuePageSize, setIssuePageSize] = useState(10);

  useEffect(() => {
    setCurrentIssuePage(1);
  }, [activeTab, issues]);

  const paginatedIssues = useMemo(() => {
    const start = (currentIssuePage - 1) * issuePageSize;
    return displayedIssues.slice(start, start + issuePageSize);
  }, [displayedIssues, currentIssuePage, issuePageSize]);

  return (
    <div id="data-quality-view" className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Data Quality & Verifikasi</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Pusat pengendalian mutu data perizinan, deteksi duplikasi, dan harmonisasi status lintas sumber.
        </p>
      </div>

      {/* 5 KPIs (PRD Section 20) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Total Data Konsolidasi</span>
          <div className="text-2xl font-bold text-slate-900 mt-2">{totalData}</div>
          <div className="text-[11px] text-slate-400 mt-1">Seluruh sumber data</div>
        </div>

        <div className="bg-white border border-emerald-200 rounded-xl p-4 shadow-xs bg-emerald-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs text-emerald-800 font-medium">Data Valid</span>
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-700 mt-2">{validCount}</div>
          <div className="text-[11px] text-emerald-600 mt-1">
            {totalData > 0 ? ((validCount / totalData) * 100).toFixed(1) : 0}% integritas
          </div>
        </div>

        <div className="bg-white border border-amber-300 rounded-xl p-4 shadow-xs bg-amber-50/30">
          <div className="flex items-center justify-between">
            <span className="text-xs text-amber-800 font-medium">Perlu Verifikasi</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-700 mt-2">{perluVerifikasiCount}</div>
          <div className="text-[11px] text-amber-600 mt-1">Anomali & unmapped status</div>
        </div>

        <div className="bg-white border border-orange-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-orange-800 font-medium">Duplikat Terdeteksi</span>
            <Copy className="w-4 h-4 text-orange-600" />
          </div>
          <div className="text-2xl font-bold text-orange-700 mt-2">{duplicateCount}</div>
          <div className="text-[11px] text-slate-400 mt-1">Butuh tinjau perbedaan</div>
        </div>

        <div className="bg-white border border-rose-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-rose-800 font-medium">Gagal Import</span>
            <AlertOctagon className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-rose-700 mt-2">{errorImportCount}</div>
          <div className="text-[11px] text-slate-400 mt-1">Format / identitas kosong</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          id="tab-quality-verify"
          onClick={() => setActiveTab('PERLU_VERIFIKASI')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
            activeTab === 'PERLU_VERIFIKASI'
              ? 'border-amber-500 text-amber-800 bg-amber-50/40'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Perlu Verifikasi ({perluVerifikasiCount})</span>
        </button>

        <button
          id="tab-quality-duplicate"
          onClick={() => setActiveTab('DUPLIKAT')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
            activeTab === 'DUPLIKAT'
              ? 'border-orange-500 text-orange-800 bg-orange-50/40'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Copy className="w-3.5 h-3.5" />
          <span>Duplikat Terdeteksi ({duplicateCount})</span>
        </button>

        <button
          id="tab-quality-all"
          onClick={() => setActiveTab('ALL_ISSUES')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
            activeTab === 'ALL_ISSUES'
              ? 'border-emerald-600 text-emerald-800 bg-emerald-50/40'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Semua Catatan Isu ({issues.length})</span>
        </button>

        <button
          id="tab-quality-valid"
          onClick={() => setActiveTab('VALID')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
            activeTab === 'VALID'
              ? 'border-emerald-600 text-emerald-800 bg-emerald-50/40'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CheckCircle className="w-3.5 h-3.5" />
          <span>Data Valid ({validCount})</span>
        </button>
      </div>

      {/* Tabel Masalah (PRD Section 20) */}
      {/* Kolom: Sumber, ID, Jenis Error, Nilai, Status, Aksi */}
      {activeTab !== 'VALID' ? (
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-bold text-slate-900">
                Tabel Daftar Masalah Kualitas Data ({displayedIssues.length})
              </h3>
              <span className="text-[11px] text-slate-400">
                Setiap koreksi akan dicatat pada Audit Trail
              </span>
            </div>
            <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded self-start sm:self-auto">
              Mode: {activeTab === 'PERLU_VERIFIKASI' ? 'Verifikasi' : activeTab === 'DUPLIKAT' ? 'Duplikasi' : 'Semua Isu'}
            </span>
          </div>

          {/* Mobile Issue Cards */}
          <div className="block md:hidden p-4 space-y-3">
            {paginatedIssues.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                Tidak ada catatan masalah pada kategori ini.
              </div>
            ) : (
              paginatedIssues.map(issue => (
                <div
                  key={issue.issue_id}
                  className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs space-y-3 hover:border-amber-300 transition-colors"
                >
                  {/* Top Bar */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-800">
                        {issue.sumber_aplikasi}
                      </span>
                      <span className="font-mono text-xs font-bold text-slate-900">
                        {issue.id_record_sumber}
                      </span>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium shrink-0 ${
                        issue.status_isu === 'TERBUKA'
                          ? 'bg-amber-50 text-amber-800 border border-amber-300'
                          : 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                      }`}
                    >
                      {issue.status_isu}
                    </span>
                  </div>

                  {/* Problem Details */}
                  <div className="space-y-1">
                    <div className="font-semibold text-slate-900 text-xs">
                      {issue.jenis_error === 'ANOMALI_TANGGAL'
                        ? 'Anomali Tanggal (UAT-05)'
                        : issue.jenis_error === 'STATUS_BELUM_TERPETAKAN'
                        ? 'Status Belum Terpetakan'
                        : issue.jenis_error === 'DUPLIKASI'
                        ? 'Deteksi Duplikasi (UAT-02)'
                        : issue.jenis_error}
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      {issue.deskripsi}
                    </p>
                  </div>

                  {/* Current Value Box */}
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-[11px]">
                    <span className="text-slate-400 block text-[10px]">Nilai Saat Ini:</span>
                    <span className="font-mono font-medium text-slate-800 break-all">
                      {issue.nilai_saat_ini || '-'}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2 flex-wrap">
                    <button
                      id={`btn-issue-view-mob-${issue.issue_id}`}
                      onClick={() => handleOpenAction(issue, 'VIEW')}
                      className="px-2.5 py-1.5 text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1 font-medium"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Detail</span>
                    </button>

                    <button
                      id={`btn-issue-correct-mob-${issue.issue_id}`}
                      onClick={() => handleOpenAction(issue, 'CORRECT')}
                      className="px-2.5 py-1.5 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Koreksi</span>
                    </button>

                    <button
                      id={`btn-issue-valid-mob-${issue.issue_id}`}
                      onClick={() => handleOpenAction(issue, 'VALIDATE')}
                      className="px-2.5 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Tandai Valid</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-[850px] text-xs text-left text-slate-700">
              <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 whitespace-nowrap">Sumber</th>
                  <th className="px-4 py-3 whitespace-nowrap">ID Sumber</th>
                  <th className="px-4 py-3">Jenis Error / Masalah</th>
                  <th className="px-4 py-3">Nilai Saat Ini</th>
                  <th className="px-4 py-3 whitespace-nowrap">Status Isu</th>
                  <th className="px-4 py-3 text-center whitespace-nowrap">Aksi (Workflow)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedIssues.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      Tidak ada catatan masalah pada kategori ini.
                    </td>
                  </tr>
                ) : (
                  paginatedIssues.map(issue => (
                    <tr key={issue.issue_id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-800">
                          {issue.sumber_aplikasi}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono font-semibold text-slate-900 whitespace-nowrap">
                        {issue.id_record_sumber}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">
                          {issue.jenis_error === 'ANOMALI_TANGGAL'
                            ? 'Anomali Tanggal (UAT-05)'
                            : issue.jenis_error === 'STATUS_BELUM_TERPETAKAN'
                            ? 'Status Belum Terpetakan'
                            : issue.jenis_error === 'DUPLIKASI'
                            ? 'Deteksi Duplikasi (UAT-02)'
                            : issue.jenis_error}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{issue.deskripsi}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-700 max-w-xs break-all">
                        {issue.nilai_saat_ini}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                            issue.status_isu === 'TERBUKA'
                              ? 'bg-amber-50 text-amber-800 border border-amber-300'
                              : 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                          }`}
                        >
                          {issue.status_isu}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Aksi: Lihat, Validasi, Koreksi, Tandai Valid, Beri Catatan */}
                          <button
                            id={`btn-issue-view-${issue.issue_id}`}
                            onClick={() => handleOpenAction(issue, 'VIEW')}
                            title="Lihat Detail"
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <button
                            id={`btn-issue-correct-${issue.issue_id}`}
                            onClick={() => handleOpenAction(issue, 'CORRECT')}
                            title="Koreksi Data"
                            className="px-2 py-1 text-[11px] font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-md transition-colors inline-flex items-center gap-1"
                          >
                            <Edit className="w-3 h-3" />
                            <span>Koreksi</span>
                          </button>

                          <button
                            id={`btn-issue-valid-${issue.issue_id}`}
                            onClick={() => handleOpenAction(issue, 'VALIDATE')}
                            title="Tandai Valid"
                            className="px-2 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors inline-flex items-center gap-1"
                          >
                            <Check className="w-3 h-3" />
                            <span>Tandai Valid</span>
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
            currentPage={currentIssuePage}
            totalItems={displayedIssues.length}
            itemsPerPage={issuePageSize}
            onPageChange={setCurrentIssuePage}
            onItemsPerPageChange={setIssuePageSize}
            pageSizeOptions={[10, 20, 50]}
          />
        </div>
      ) : (
        /* Tab Data Valid */
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center gap-2 mb-3 text-emerald-800 font-semibold text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Seluruh data berstatus VALID telah memenuhi kriteria kelengkapan dan konsistensi tanggal.</span>
          </div>
          <p className="text-xs text-slate-500">
            Sebanyak {validCount} transaksi terbebas dari anomali tanggal, memiliki identifier unik, dan statusnya telah terpetakan sempurna ke dalam status standar DIPTA.
          </p>
        </div>
      )}

      {/* Action / Correction Modal */}
      {selectedIssue && actionModalType && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-900">
                {actionModalType === 'CORRECT' && 'Koreksi Data Pelayanan'}
                {actionModalType === 'VALIDATE' && 'Konfirmasi Tandai Valid'}
                {actionModalType === 'VIEW' && 'Detail Isu Kualitas Data'}
              </h3>
              <button
                onClick={() => {
                  setSelectedIssue(null);
                  setActionModalType(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5">
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                <span className="font-semibold text-amber-900 block mb-0.5">Isu Terdeteksi:</span>
                <span className="text-amber-800">{selectedIssue.deskripsi}</span>
              </div>

              {actionModalType === 'CORRECT' && (
                <div className="space-y-3 pt-2">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Tanggal Permohonan:</label>
                    <input
                      type="date"
                      value={correctedDatePermohonan}
                      onChange={e => setCorrectedDatePermohonan(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Tanggal Penetapan / Terbit (Harus &ge; Permohonan):
                    </label>
                    <input
                      type="date"
                      value={correctedDatePenetapan}
                      onChange={e => setCorrectedDatePenetapan(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Status Standar DIPTA:</label>
                    <select
                      value={correctedStatusDipta}
                      onChange={e => setCorrectedStatusDipta(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs"
                    >
                      <option value="SELESAI_TERBIT">SELESAI_TERBIT</option>
                      <option value="DALAM_PROSES">DALAM_PROSES</option>
                      <option value="DITOLAK">DITOLAK</option>
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Catatan Petugas / Alasan Tindakan:
                </label>
                <textarea
                  value={correctionNote}
                  onChange={e => setCorrectionNote(e.target.value)}
                  placeholder="Masukkan penjelasan koreksi atau hasil verifikasi fisik..."
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-emerald-500 focus:bg-white"
                />
              </div>

              {/* PRD Section 19: Duplication Options */}
              {selectedIssue.jenis_error === 'DUPLIKASI' && (
                <div className="p-3 bg-slate-100 rounded-lg space-y-2">
                  <span className="font-semibold text-slate-800 block">Pilihan Penanganan Duplikasi:</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApplyResolution('ABAIKAN')}
                      className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-md font-semibold text-[11px]"
                    >
                      Abaikan Record Baru
                    </button>
                    <button
                      onClick={() => handleApplyResolution('KOREKSI')}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-semibold text-[11px]"
                    >
                      Perbarui Record Lama
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2.5 pt-4 mt-4 border-t border-slate-100">
              <button
                onClick={() => {
                  setSelectedIssue(null);
                  setActionModalType(null);
                }}
                className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 font-semibold"
              >
                Batal
              </button>

              {actionModalType === 'VALIDATE' && (
                <button
                  id="btn-confirm-validate"
                  onClick={() => handleApplyResolution('TANDAI_VALID')}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold"
                >
                  Tandai Valid
                </button>
              )}

              {actionModalType === 'CORRECT' && (
                <button
                  id="btn-confirm-correction"
                  onClick={() => handleApplyResolution('KOREKSI')}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-semibold"
                >
                  Simpan Koreksi
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
