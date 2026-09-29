// DIPTA - Riwayat Pembaruan & Audit Trail (PRD Section 21 & PostgreSQL Schema)
import React, { useState, useMemo, useEffect } from 'react';
import { ImportBatch, AuditLog } from '../../types';
import { Pagination } from '../common/Pagination';
import { History, FileSpreadsheet, ShieldCheck, UserCheck, Calendar, Filter } from 'lucide-react';

interface AuditTrailViewProps {
  batches: ImportBatch[];
  auditLogs: AuditLog[];
}

export const AuditTrailView: React.FC<AuditTrailViewProps> = ({ batches, auditLogs }) => {
  const [activeTab, setActiveTab] = useState<'BATCH' | 'AUDIT'>('BATCH');

  // Pagination for Batches (Tab 1)
  const [currentBatchPage, setCurrentBatchPage] = useState(1);
  const [batchPageSize, setBatchPageSize] = useState(10);

  useEffect(() => {
    setCurrentBatchPage(1);
  }, [batches]);

  const paginatedBatches = useMemo(() => {
    const start = (currentBatchPage - 1) * batchPageSize;
    return batches.slice(start, start + batchPageSize);
  }, [batches, currentBatchPage, batchPageSize]);

  // Pagination for Audit Logs (Tab 2)
  const [currentAuditPage, setCurrentAuditPage] = useState(1);
  const [auditPageSize, setAuditPageSize] = useState(10);

  useEffect(() => {
    setCurrentAuditPage(1);
  }, [auditLogs]);

  const paginatedAuditLogs = useMemo(() => {
    const start = (currentAuditPage - 1) * auditPageSize;
    return auditLogs.slice(start, start + auditPageSize);
  }, [auditLogs, currentAuditPage, auditPageSize]);

  return (
    <div id="audit-trail-view" className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          Riwayat Pembaruan & Audit Trail
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Rekaman transparansi seluruh riwayat batch import data serta jejak perubahan (audit log) sistem DIPTA.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          id="tab-history-batches"
          onClick={() => setActiveTab('BATCH')}
          className={`flex items-center gap-2 px-5 py-2.5 text-xs font-semibold border-b-2 transition-all ${
            activeTab === 'BATCH'
              ? 'border-emerald-600 text-emerald-800 bg-emerald-50/40'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Riwayat Batch Import ({batches.length})</span>
        </button>

        <button
          id="tab-history-audit"
          onClick={() => setActiveTab('AUDIT')}
          className={`flex items-center gap-2 px-5 py-2.5 text-xs font-semibold border-b-2 transition-all ${
            activeTab === 'AUDIT'
              ? 'border-emerald-600 text-emerald-800 bg-emerald-50/40'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Log Audit Trail Perubahan ({auditLogs.length})</span>
        </button>
      </div>

      {/* TAB 1: BATCH IMPORT HISTORY */}
      {activeTab === 'BATCH' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className="text-xs font-bold text-slate-900">
              Daftar Batch Import Data (View: vw_import_history_v2)
            </h3>
            <span className="text-[11px] text-slate-400">
              Mencatat riwayat eksekusi upload berkas ({batches.length} Batch)
            </span>
          </div>

          {/* Mobile Card List */}
          <div className="block md:hidden p-4 space-y-3">
            {paginatedBatches.map(b => (
              <div
                key={b.batch_id}
                className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-xs font-bold text-slate-900">{b.batch_id}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-800">
                        {b.source_app}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono block mt-0.5">{b.dataset_code}</span>
                  </div>
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                      b.import_status === 'BERHASIL'
                        ? 'bg-emerald-100 text-emerald-800'
                        : b.import_status === 'SEBAGIAN'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {b.import_status}
                  </span>
                </div>

                <div className="text-xs text-slate-700 bg-slate-50 p-2 rounded-lg space-y-1">
                  <div className="font-medium text-slate-900 truncate">File: {b.file_name}</div>
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>Petugas: {b.imported_by_name}</span>
                    <span>{b.imported_at}</span>
                  </div>
                </div>

                {/* 4 Metrics Grid */}
                <div className="grid grid-cols-4 gap-1.5 text-center text-[11px] pt-1 border-t border-slate-100">
                  <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 block">Total</span>
                    <span className="font-bold text-slate-900">{b.row_total}</span>
                  </div>
                  <div className="bg-emerald-50 p-1.5 rounded-lg border border-emerald-200">
                    <span className="text-[10px] text-emerald-600 block">Valid</span>
                    <span className="font-bold text-emerald-700">{b.row_valid}</span>
                  </div>
                  <div className="bg-amber-50 p-1.5 rounded-lg border border-amber-200">
                    <span className="text-[10px] text-amber-600 block">Invalid</span>
                    <span className="font-bold text-amber-700">{b.row_invalid}</span>
                  </div>
                  <div className="bg-orange-50 p-1.5 rounded-lg border border-orange-200">
                    <span className="text-[10px] text-orange-600 block">Duplikat</span>
                    <span className="font-bold text-orange-700">{b.row_duplicate}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-[950px] text-xs text-left text-slate-700">
              <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[10px] border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 whitespace-nowrap">Batch ID</th>
                  <th className="px-4 py-3 whitespace-nowrap">Sumber & Dataset</th>
                  <th className="px-4 py-3">Nama Berkas</th>
                  <th className="px-4 py-3 whitespace-nowrap">Waktu Import</th>
                  <th className="px-4 py-3 whitespace-nowrap">Petugas</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">Total Baris</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap text-emerald-700">Valid</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap text-amber-700">Invalid</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap text-orange-700">Duplikat</th>
                  <th className="px-4 py-3 text-center whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedBatches.map(b => (
                  <tr key={b.batch_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold text-slate-900 whitespace-nowrap">{b.batch_id}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-semibold text-slate-900">{b.source_app}</span>
                      <span className="text-slate-400 block text-[10px]">{b.dataset_code}</span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800 max-w-xs truncate" title={b.file_name}>{b.file_name}</td>
                    <td className="px-4 py-3 text-slate-600 text-[11px] whitespace-nowrap">{b.imported_at}</td>
                    <td className="px-4 py-3 text-slate-800 whitespace-nowrap">{b.imported_by_name}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900 whitespace-nowrap">{b.row_total}</td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-700 whitespace-nowrap">{b.row_valid}</td>
                    <td className="px-4 py-3 text-right font-semibold text-amber-700 whitespace-nowrap">{b.row_invalid}</td>
                    <td className="px-4 py-3 text-right font-semibold text-orange-700 whitespace-nowrap">{b.row_duplicate}</td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          b.import_status === 'BERHASIL'
                            ? 'bg-emerald-100 text-emerald-800'
                            : b.import_status === 'SEBAGIAN'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {b.import_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <Pagination
            currentPage={currentBatchPage}
            totalItems={batches.length}
            itemsPerPage={batchPageSize}
            onPageChange={setCurrentBatchPage}
            onItemsPerPageChange={setBatchPageSize}
            pageSizeOptions={[5, 10, 20]}
          />
        </div>
      )}

      {/* TAB 2: AUDIT LOGS */}
      {activeTab === 'AUDIT' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className="text-xs font-bold text-slate-900">
              Catatan Audit Trail (Tabel: audit_logs)
            </h3>
            <span className="text-[11px] text-slate-400">
              Merekam setiap aksi verifikasi, koreksi, dan intervensi operator ({auditLogs.length} Log)
            </span>
          </div>

          {/* Mobile Card List */}
          <div className="block md:hidden p-4 space-y-3">
            {paginatedAuditLogs.map(log => (
              <div
                key={log.log_id}
                className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-[10px] font-semibold">
                      {log.action_type}
                    </span>
                    <div className="font-semibold text-slate-900 text-xs mt-1">{log.actor}</div>
                  </div>
                  <span className="font-mono text-[10px] text-slate-500">{log.waktu}</span>
                </div>

                <div className="text-[11px] space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <div className="text-slate-500">
                    Target: <span className="font-mono font-semibold text-emerald-800">{log.entity_id}</span>
                  </div>
                  {(log.nilai_lama || log.nilai_baru) && (
                    <div className="pt-1 text-[10px] space-y-0.5 border-t border-slate-200/60">
                      {log.nilai_lama && (
                        <div className="text-rose-700 truncate">
                          <span className="font-semibold">Lama:</span> {log.nilai_lama}
                        </div>
                      )}
                      {log.nilai_baru && (
                        <div className="text-emerald-700 font-medium truncate">
                          <span className="font-semibold">Baru:</span> {log.nilai_baru}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {log.alasan && (
                  <div className="text-[11px] text-slate-600">
                    <span className="text-slate-400 block text-[10px]">Alasan / Catatan:</span>
                    {log.alasan}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-[850px] text-xs text-left text-slate-700">
              <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[10px] border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 whitespace-nowrap">Waktu Log</th>
                  <th className="px-4 py-3 whitespace-nowrap">Petugas</th>
                  <th className="px-4 py-3 whitespace-nowrap">Jenis Tindakan</th>
                  <th className="px-4 py-3 whitespace-nowrap">Entitas / Record ID</th>
                  <th className="px-4 py-3">Nilai Lama</th>
                  <th className="px-4 py-3">Nilai Baru</th>
                  <th className="px-4 py-3">Alasan / Catatan Koreksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedAuditLogs.map(log => (
                  <tr key={log.log_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-600 whitespace-nowrap">{log.waktu}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">{log.actor}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-[10px] font-semibold">
                        {log.action_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-emerald-800 whitespace-nowrap">{log.entity_id}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-500 max-w-xs truncate" title={log.nilai_lama || '-'}>
                      {log.nilai_lama || '-'}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-emerald-700 font-semibold max-w-xs truncate" title={log.nilai_baru || '-'}>
                      {log.nilai_baru || '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-700 max-w-sm">{log.alasan || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <Pagination
            currentPage={currentAuditPage}
            totalItems={auditLogs.length}
            itemsPerPage={auditPageSize}
            onPageChange={setCurrentAuditPage}
            onItemsPerPageChange={setAuditPageSize}
            pageSizeOptions={[5, 10, 20]}
          />
        </div>
      )}
    </div>
  );
};
