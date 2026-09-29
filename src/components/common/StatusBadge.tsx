// DIPTA - Standard Status Badge Component
import React from 'react';
import { StatusDIPTA, StatusValidasi } from '../../types';
import { CheckCircle2, Clock, XCircle, HelpCircle, AlertTriangle, Copy, AlertOctagon } from 'lucide-react';

interface StatusBadgeProps {
  status: StatusDIPTA | StatusValidasi | string;
  type?: 'dipta' | 'validasi';
  className?: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  type = 'dipta',
  className = '',
  size = 'md'
}) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-medium';

  if (type === 'validasi') {
    switch (status) {
      case 'VALID':
        return (
          <span
            id={`badge-valid-${status}`}
            className={`inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 ${sizeClasses} ${className}`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="whitespace-nowrap">Valid</span>
          </span>
        );
      case 'PERLU_VERIFIKASI':
        return (
          <span
            id={`badge-verify-${status}`}
            className={`inline-flex items-center gap-1.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 ${sizeClasses} ${className}`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="whitespace-nowrap">Perlu Verifikasi</span>
          </span>
        );
      case 'DUPLIKAT':
        return (
          <span
            id={`badge-duplicate-${status}`}
            className={`inline-flex items-center gap-1.5 rounded-full bg-orange-50 text-orange-800 border border-orange-300 ${sizeClasses} ${className}`}
          >
            <Copy className="w-3.5 h-3.5 text-orange-600 shrink-0" />
            <span className="whitespace-nowrap">Potensi Duplikat</span>
          </span>
        );
      case 'ERROR_IMPORT':
        return (
          <span
            id={`badge-error-${status}`}
            className={`inline-flex items-center gap-1.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 ${sizeClasses} ${className}`}
          >
            <AlertOctagon className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <span className="whitespace-nowrap">Error Import</span>
          </span>
        );
      default:
        return (
          <span className={`inline-flex items-center gap-1 rounded-full bg-gray-100 text-gray-700 ${sizeClasses} ${className}`}>
            <span>{status}</span>
          </span>
        );
    }
  }

  // Default: Status DIPTA
  switch (status) {
    case 'SELESAI_TERBIT':
      return (
        <span
          id={`badge-dipta-selesai`}
          className={`inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 ${sizeClasses} ${className}`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span className="whitespace-nowrap">Selesai / Terbit</span>
        </span>
      );
    case 'DALAM_PROSES':
      return (
        <span
          id={`badge-dipta-proses`}
          className={`inline-flex items-center gap-1.5 rounded-full bg-sky-50 text-sky-800 border border-sky-200 ${sizeClasses} ${className}`}
        >
          <Clock className="w-3.5 h-3.5 text-sky-600 shrink-0" />
          <span className="whitespace-nowrap">Dalam Proses</span>
        </span>
      );
    case 'DITOLAK':
      return (
        <span
          id={`badge-dipta-ditolak`}
          className={`inline-flex items-center gap-1.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200 ${sizeClasses} ${className}`}
        >
          <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
          <span className="whitespace-nowrap">Ditolak</span>
        </span>
      );
    case 'BELUM_DIKLASIFIKASIKAN':
    default:
      return (
        <span
          id={`badge-dipta-unclassified`}
          className={`inline-flex items-center gap-1.5 rounded-full bg-slate-100 text-slate-700 border border-slate-300 ${sizeClasses} ${className}`}
        >
          <HelpCircle className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span className="whitespace-nowrap">Belum Diklasifikasikan</span>
        </span>
      );
  }
};
