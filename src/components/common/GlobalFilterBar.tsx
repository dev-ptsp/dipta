// DIPTA - Unified Global Filter Bar
import React from 'react';
import { GlobalFilter, SourceApp, StatusDIPTA } from '../../types';
import { OKI_KECAMATAN_LIST } from '../../data/initialData';
import { Filter, Search, RotateCcw, Calendar, Layers, Activity, MapPin } from 'lucide-react';

interface GlobalFilterBarProps {
  filters: GlobalFilter;
  onFilterChange: (newFilters: GlobalFilter) => void;
  availableServices?: string[];
  totalFilteredCount: number;
  totalAllCount: number;
}

export const GlobalFilterBar: React.FC<GlobalFilterBarProps> = ({
  filters,
  onFilterChange,
  availableServices = [],
  totalFilteredCount,
  totalAllCount
}) => {
  const handleReset = () => {
    onFilterChange({
      periode_start: '',
      periode_end: '',
      sumber_aplikasi: 'SEMUA',
      jenis_layanan: 'SEMUA',
      status_dipta: 'SEMUA',
      kecamatan: 'SEMUA',
      search_query: ''
    });
  };

  const isFiltered =
    filters.sumber_aplikasi !== 'SEMUA' ||
    filters.status_dipta !== 'SEMUA' ||
    filters.jenis_layanan !== 'SEMUA' ||
    filters.kecamatan !== 'SEMUA' ||
    Boolean(filters.periode_start) ||
    Boolean(filters.periode_end) ||
    Boolean(filters.search_query);

  return (
    <div
      id="global-filter-container"
      className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs mb-6 transition-all"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
          <Filter className="w-4 h-4 text-emerald-600" />
          <span>Filter Data Konsolidasi</span>
          {isFiltered && (
            <span className="ml-2 text-xs font-normal text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Menampilkan {totalFilteredCount} dari {totalAllCount} transaksi
            </span>
          )}
        </div>

        {isFiltered && (
          <button
            id="btn-reset-filters"
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors font-medium px-2.5 py-1 rounded-md hover:bg-slate-100"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Filter</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 pt-3">
        {/* Periode Bulan */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 mb-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>Periode Data</span>
          </label>
          <div className="flex gap-1.5">
            <input
              id="filter-periode-start"
              type="month"
              value={filters.periode_start || ''}
              onChange={e => onFilterChange({ ...filters, periode_start: e.target.value })}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white text-slate-700"
              placeholder="Dari"
            />
          </div>
        </div>

        {/* Sumber Aplikasi */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 mb-1">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <span>Sumber Aplikasi</span>
          </label>
          <select
            id="filter-sumber-aplikasi"
            value={filters.sumber_aplikasi}
            onChange={e => onFilterChange({ ...filters, sumber_aplikasi: e.target.value })}
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white text-slate-700"
          >
            <option value="SEMUA">Semua Sumber</option>
            <option value="OSS-RBA">OSS-RBA</option>
            <option value="SICANTIK">SICANTIK Cloud</option>
            <option value="SIMBG">SIMBG PBG/SLF</option>
          </select>
        </div>

        {/* Status DIPTA */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 mb-1">
            <Activity className="w-3.5 h-3.5 text-slate-400" />
            <span>Status DIPTA</span>
          </label>
          <select
            id="filter-status-dipta"
            value={filters.status_dipta}
            onChange={e => onFilterChange({ ...filters, status_dipta: e.target.value })}
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white text-slate-700"
          >
            <option value="SEMUA">Semua Status</option>
            <option value="SELESAI_TERBIT">Selesai / Terbit</option>
            <option value="DALAM_PROSES">Dalam Proses</option>
            <option value="DITOLAK">Ditolak</option>
            <option value="BELUM_DIKLASIFIKASIKAN">Belum Diklasifikasikan</option>
          </select>
        </div>

        {/* Kecamatan di OKI */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 mb-1">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            <span>Kecamatan (OKI)</span>
          </label>
          <select
            id="filter-kecamatan"
            value={filters.kecamatan}
            onChange={e => onFilterChange({ ...filters, kecamatan: e.target.value })}
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white text-slate-700"
          >
            <option value="SEMUA">Semua Kecamatan</option>
            {OKI_KECAMATAN_LIST.map(kec => (
              <option key={kec} value={kec}>
                {kec}
              </option>
            ))}
          </select>
        </div>

        {/* Jenis Layanan */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 mb-1">
            <span>Jenis Layanan</span>
          </label>
          <select
            id="filter-jenis-layanan"
            value={filters.jenis_layanan}
            onChange={e => onFilterChange({ ...filters, jenis_layanan: e.target.value })}
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white text-slate-700 truncate"
          >
            <option value="SEMUA">Semua Jenis Layanan</option>
            {availableServices.map(srv => (
              <option key={srv} value={srv}>
                {srv}
              </option>
            ))}
          </select>
        </div>

        {/* Pencarian Teks */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 mb-1">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span>Cari ID / Nama / No</span>
          </label>
          <div className="relative">
            <input
              id="filter-search-query"
              type="text"
              value={filters.search_query || ''}
              onChange={e => onFilterChange({ ...filters, search_query: e.target.value })}
              placeholder="Cari NIB, ID, nama..."
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white text-slate-700"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
