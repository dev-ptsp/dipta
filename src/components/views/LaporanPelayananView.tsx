// DIPTA - Modul Laporan Pelayanan Terpadu (Bulanan, Mingguan, & Rentang Tanggal Kustom)
import React, { useState, useMemo, useEffect } from 'react';
import { DiptaRecord, SourceApp, StatusDIPTA, User } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { Pagination } from '../common/Pagination';
import { DiptaStorageService } from '../../services/dataStorage';
import { OKI_KECAMATAN_LIST } from '../../data/initialData';
import * as XLSX from 'xlsx';
import {
  FileSpreadsheet,
  Calendar,
  Download,
  Printer,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Building2,
  MapPin,
  Search,
  RefreshCw,
  FileText,
  Layers,
  ChevronRight,
  BarChart3,
  TrendingUp,
  Users
} from 'lucide-react';

interface LaporanPelayananViewProps {
  records: DiptaRecord[];
  currentUser: User;
  initialMode?: 'BULANAN' | 'MINGGUAN' | 'RENTANG_TANGGAL';
}

// Helper to get Monday and Sunday of a given date
function getWeekBounds(dateStr: string): { start: string; end: string; label: string } {
  const d = new Date(dateStr || new Date().toISOString().substring(0, 10));
  if (isNaN(d.getTime())) {
    const today = new Date().toISOString().substring(0, 10);
    return { start: today, end: today, label: today };
  }
  const day = d.getDay(); // 0 (Sun) to 6 (Sat)
  const diffToMonday = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const start = monday.toISOString().substring(0, 10);
  const end = sunday.toISOString().substring(0, 10);
  return {
    start,
    end,
    label: `${start} s/d ${end}`
  };
}

export const LaporanPelayananView: React.FC<LaporanPelayananViewProps> = ({
  records,
  currentUser,
  initialMode = 'BULANAN'
}) => {
  // Mode Periode Laporan: BULANAN | MINGGUAN | RENTANG_TANGGAL
  const [reportMode, setReportMode] = useState<'BULANAN' | 'MINGGUAN' | 'RENTANG_TANGGAL'>(initialMode);

  useEffect(() => {
    if (initialMode) {
      setReportMode(initialMode);
    }
  }, [initialMode]);

  // Basis Tanggal Acuan: 'PERMOHONAN' (Tanggal Masuk) | 'TERBIT' (Tanggal Penetapan/Terbit) | 'SEMUA_TANGGAL'
  const [dateBasis, setDateBasis] = useState<'PERMOHONAN' | 'TERBIT' | 'SEMUA_TANGGAL'>('PERMOHONAN');

  // Filter Bulan (YYYY-MM)
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    // Default to latest month in records or current month
    if (records.length > 0) {
      const months = records.map(r => r.periode_data).filter(Boolean).sort();
      if (months.length > 0) return months[months.length - 1];
    }
    return new Date().toISOString().substring(0, 7);
  });

  // Filter Minggu (Pilih tanggal mana saja di minggu tersebut, atau pilih minggu ke-1..5 dalam bulan)
  const [weekSelectionType, setWeekSelectionType] = useState<'PILIH_TANGGAL' | 'MINGGU_BULAN'>('PILIH_TANGGAL');
  const [selectedWeekAnchorDate, setSelectedWeekAnchorDate] = useState<string>(() => {
    if (records.length > 0) {
      const dates = records
        .map(r => r.tanggal_permohonan || r.tanggal_penetapan_terbit)
        .filter(Boolean)
        .sort() as string[];
      if (dates.length > 0) return dates[dates.length - 1];
    }
    return new Date().toISOString().substring(0, 10);
  });
  const [selectedWeekOfMonth, setSelectedWeekOfMonth] = useState<number>(1); // 1, 2, 3, 4, 5

  // Filter Rentang Tanggal Kustom (Start Date s/d End Date)
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const ym = selectedMonth || new Date().toISOString().substring(0, 7);
    return `${ym}-01`;
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    const ym = selectedMonth || new Date().toISOString().substring(0, 7);
    return `${ym}-30`;
  });

  // Filter Tambahan Laporan
  const [filterSource, setFilterSource] = useState<'SEMUA' | SourceApp>('SEMUA');
  const [filterStatus, setFilterStatus] = useState<'SEMUA' | StatusDIPTA>('SEMUA');
  const [filterKecamatan, setFilterKecamatan] = useState<string>('SEMUA');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Tab Tampilan Laporan: 'RINGKASAN' | 'RINCIAN' | 'KECAMATAN'
  const [activeReportTab, setActiveReportTab] = useState<'RINGKASAN' | 'RINCIAN' | 'KECAMATAN'>('RINGKASAN');

  // Pagination untuk tabel rincian
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Hitung rentang tanggal efektif (effectiveStartDate & effectiveEndDate) berdasarkan mode
  const effectiveDateRange = useMemo(() => {
    if (reportMode === 'BULANAN') {
      if (!selectedMonth) {
        return { start: '', end: '', label: 'Semua Bulan' };
      }
      const [yearStr, monthStr] = selectedMonth.split('-');
      const year = Number(yearStr);
      const month = Number(monthStr);
      const lastDay = new Date(year, month, 0).getDate();
      const start = `${selectedMonth}-01`;
      const end = `${selectedMonth}-${String(lastDay).padStart(2, '0')}`;

      const monthNames = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      const mLabel = monthNames[month - 1] || monthStr;
      return {
        start,
        end,
        label: `Periode Bulanan: ${mLabel} ${yearStr} (${start} s/d ${end})`
      };
    } else if (reportMode === 'MINGGUAN') {
      if (weekSelectionType === 'PILIH_TANGGAL') {
        const bounds = getWeekBounds(selectedWeekAnchorDate);
        return {
          start: bounds.start,
          end: bounds.end,
          label: `Periode Mingguan: ${bounds.start} s/d ${bounds.end}`
        };
      } else {
        // Minggu ke-N dalam selectedMonth
        const [yearStr, monthStr] = (selectedMonth || '2026-09').split('-');
        const year = Number(yearStr);
        const month = Number(monthStr);
        const lastDay = new Date(year, month, 0).getDate();
        const startDay = (selectedWeekOfMonth - 1) * 7 + 1;
        const endDay = Math.min(selectedWeekOfMonth * 7, lastDay);
        const start = `${selectedMonth}-${String(startDay).padStart(2, '0')}`;
        const end = `${selectedMonth}-${String(endDay).padStart(2, '0')}`;
        return {
          start,
          end,
          label: `Minggu Ke-${selectedWeekOfMonth} Bulan ${selectedMonth} (${start} s/d ${end})`
        };
      }
    } else {
      // RENTANG_TANGGAL
      return {
        start: customStartDate,
        end: customEndDate,
        label: `Filter Tanggal: ${customStartDate || 'Awal'} s/d ${customEndDate || 'Akhir'}`
      };
    }
  }, [reportMode, selectedMonth, weekSelectionType, selectedWeekAnchorDate, selectedWeekOfMonth, customStartDate, customEndDate]);

  // Filter data berdasarkan periode & kriteria
  const reportRecords = useMemo(() => {
    return records.filter(rec => {
      // 1. Filter Sumber Aplikasi
      if (filterSource !== 'SEMUA' && rec.sumber_aplikasi !== filterSource) {
        return false;
      }

      // 2. Filter Status DIPTA
      if (filterStatus !== 'SEMUA' && rec.status_dipta !== filterStatus) {
        return false;
      }

      // 3. Filter Kecamatan
      if (filterKecamatan !== 'SEMUA' && rec.kecamatan !== filterKecamatan) {
        return false;
      }

      // 4. Filter Pencarian Kata Kunci
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase().trim();
        const match =
          rec.id_record_sumber.toLowerCase().includes(q) ||
          rec.nama_pemohon_usaha.toLowerCase().includes(q) ||
          rec.jenis_layanan.toLowerCase().includes(q) ||
          (rec.nomor_permohonan && rec.nomor_permohonan.toLowerCase().includes(q)) ||
          (rec.nomor_dokumen && rec.nomor_dokumen.toLowerCase().includes(q)) ||
          (rec.nib && rec.nib.toLowerCase().includes(q));
        if (!match) return false;
      }

      // 5. Filter Periode (Bulanan, Mingguan, atau Rentang Tanggal)
      const { start, end } = effectiveDateRange;
      if (!start && !end) return true;

      // Untuk mode BULANAN, cocokkan juga dengan rec.periode_data jika tanggal spesifik kosong
      const tglMohon = rec.tanggal_permohonan || '';
      const tglTerbit = rec.tanggal_penetapan_terbit || '';
      const fallbackDate = rec.periode_data ? `${rec.periode_data}-01` : '';

      let targetDate = '';
      if (dateBasis === 'PERMOHONAN') {
        targetDate = tglMohon || tglTerbit || fallbackDate;
      } else if (dateBasis === 'TERBIT') {
        targetDate = tglTerbit || tglMohon || fallbackDate;
      } else {
        // SEMUA_TANGGAL: lolos jika salah satu tanggal berada di dalam rentang
        const d1In = tglMohon && (!start || tglMohon >= start) && (!end || tglMohon <= end);
        const d2In = tglTerbit && (!start || tglTerbit >= start) && (!end || tglTerbit <= end);
        const pIn = !tglMohon && !tglTerbit && fallbackDate && (!start || fallbackDate >= start) && (!end || fallbackDate <= end);
        return Boolean(d1In || d2In || pIn);
      }

      if (!targetDate) return false;
      if (start && targetDate < start) return false;
      if (end && targetDate > end) return false;

      return true;
    });
  }, [records, filterSource, filterStatus, filterKecamatan, searchQuery, effectiveDateRange, dateBasis]);

  useEffect(() => {
    setCurrentPage(1);
  }, [reportRecords]);

  // Statistik Eksekutif Laporan
  const stats = useMemo(() => {
    const total = reportRecords.length;
    const selesai = reportRecords.filter(r => r.status_dipta === 'SELESAI_TERBIT').length;
    const proses = reportRecords.filter(r => r.status_dipta === 'DALAM_PROSES').length;
    const ditolak = reportRecords.filter(r => r.status_dipta === 'DITOLAK').length;
    const belumKlasifikasi = reportRecords.filter(r => r.status_dipta === 'BELUM_DIKLASIFIKASIKAN').length;

    const ossCount = reportRecords.filter(r => r.sumber_aplikasi === 'OSS-RBA').length;
    const sicantikCount = reportRecords.filter(r => r.sumber_aplikasi === 'SICANTIK').length;
    const simbgCount = reportRecords.filter(r => r.sumber_aplikasi === 'SIMBG').length;

    const totalInvestasi = reportRecords.reduce((acc, r) => acc + (r.investasi_rupiah || 0), 0);
    const totalTki = reportRecords.reduce((acc, r) => acc + (r.tki_count || 0), 0);

    return {
      total,
      selesai,
      proses,
      ditolak,
      belumKlasifikasi,
      ossCount,
      sicantikCount,
      simbgCount,
      totalInvestasi,
      totalTki,
      completionRate: total > 0 ? ((selesai / total) * 100).toFixed(1) : '0.0'
    };
  }, [reportRecords]);

  // Rekapitulasi per Sumber & Dataset
  const summaryBySource = useMemo(() => {
    const sources: { code: SourceApp; name: string; badge: string }[] = [
      { code: 'OSS-RBA', name: 'OSS-RBA (Perizinan Berusaha Berbasis Risiko)', badge: 'bg-emerald-100 text-emerald-800' },
      { code: 'SICANTIK', name: 'SICANTIK Cloud (Perizinan & Non-Perizinan Daerah)', badge: 'bg-sky-100 text-sky-800' },
      { code: 'SIMBG', name: 'SIMBG (Persetujuan Bangunan Gedung & SLF)', badge: 'bg-amber-100 text-amber-800' }
    ];

    return sources.map(src => {
      const subset = reportRecords.filter(r => r.sumber_aplikasi === src.code);
      const total = subset.length;
      const selesai = subset.filter(r => r.status_dipta === 'SELESAI_TERBIT').length;
      const proses = subset.filter(r => r.status_dipta === 'DALAM_PROSES').length;
      const ditolak = subset.filter(r => r.status_dipta === 'DITOLAK').length;
      const rasio = total > 0 ? ((selesai / total) * 100).toFixed(1) : '0.0';
      return {
        ...src,
        total,
        selesai,
        proses,
        ditolak,
        rasio
      };
    });
  }, [reportRecords]);

  // Rekapitulasi per Kecamatan (18 Kecamatan Kab. OKI)
  const summaryByKecamatan = useMemo(() => {
    const map = new Map<string, {
      kecamatan: string;
      oss: number;
      sicantik: number;
      simbg: number;
      selesai: number;
      proses: number;
      ditolak: number;
      total: number;
      investasi: number;
    }>();

    OKI_KECAMATAN_LIST.forEach(kec => {
      map.set(kec, {
        kecamatan: kec,
        oss: 0,
        sicantik: 0,
        simbg: 0,
        selesai: 0,
        proses: 0,
        ditolak: 0,
        total: 0,
        investasi: 0
      });
    });

    reportRecords.forEach(r => {
      const kecName = r.kecamatan || 'Kayu Agung';
      const existing = map.get(kecName) || {
        kecamatan: kecName,
        oss: 0,
        sicantik: 0,
        simbg: 0,
        selesai: 0,
        proses: 0,
        ditolak: 0,
        total: 0,
        investasi: 0
      };

      if (r.sumber_aplikasi === 'OSS-RBA') existing.oss++;
      else if (r.sumber_aplikasi === 'SICANTIK') existing.sicantik++;
      else if (r.sumber_aplikasi === 'SIMBG') existing.simbg++;

      if (r.status_dipta === 'SELESAI_TERBIT') existing.selesai++;
      else if (r.status_dipta === 'DALAM_PROSES') existing.proses++;
      else if (r.status_dipta === 'DITOLAK') existing.ditolak++;

      existing.total++;
      existing.investasi += r.investasi_rupiah || 0;
      map.set(kecName, existing);
    });

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [reportRecords]);

  // Paginated records for Rincian tab
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return reportRecords.slice(start, start + pageSize);
  }, [reportRecords, currentPage, pageSize]);

  // Export Laporan Lengkap Multi-Sheet Excel (.xlsx)
  const handleExportFullReportExcel = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Ringkasan Eksekutif & Per Sumber
    const summarySheetRows = [
      ['LAPORAN PELAYANAN TERPADU DPMPTSP KABUPATEN OGAN KOMERING ILIR'],
      ['Sistem Dashboard Integrasi Pelayanan Terpadu (DIPTA)'],
      [effectiveDateRange.label],
      [`Dicetak Oleh: ${currentUser.full_name} (${currentUser.role_name}) pada ${new Date().toLocaleString('id-ID')} WIB`],
      [''],
      ['A. RINGKASAN EKSEKUTIF PELAYANAN'],
      ['Indikator', 'Nilai'],
      ['Total Permohonan Pelayanan', stats.total],
      ['Selesai / Izin Terbit', stats.selesai],
      ['Dalam Proses Verifikasi', stats.proses],
      ['Permohonan Ditolak', stats.ditolak],
      ['Rasio Penyelesaian (%)', `${stats.completionRate}%`],
      ['Total Nilai Investasi (Rp)', stats.totalInvestasi],
      ['Total Serapan Tenaga Kerja (TKI)', stats.totalTki],
      [''],
      ['B. REKAPITULASI PER SUMBER APLIKASI'],
      ['Sumber Aplikasi', 'Total Berkas', 'Selesai / Terbit', 'Dalam Proses', 'Ditolak', 'Rasio Selesai (%)'],
      ...summaryBySource.map(s => [s.name, s.total, s.selesai, s.proses, s.ditolak, `${s.rasio}%`])
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summarySheetRows);
    wsSummary['!cols'] = [{ wch: 48 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 15 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, '1_Ringkasan_Laporan');

    // Sheet 2: Rekapitulasi 18 Kecamatan
    const kecRows = summaryByKecamatan.map((k, idx) => ({
      No: idx + 1,
      Kecamatan: k.kecamatan,
      OSS_RBA: k.oss,
      SICANTIK_Cloud: k.sicantik,
      SIMBG_PBG_SLF: k.simbg,
      Selesai_Terbit: k.selesai,
      Dalam_Proses: k.proses,
      Ditolak: k.ditolak,
      Total_Pelayanan: k.total,
      Total_Investasi_Rp: k.investasi
    }));
    const wsKec = XLSX.utils.json_to_sheet(kecRows);
    XLSX.utils.book_append_sheet(wb, wsKec, '2_Rekap_Kecamatan');

    // Sheet 3: Rincian Transaksi Berkas
    const detailRows = reportRecords.map((r, i) => ({
      No: i + 1,
      ID_DIPTA: r.id_dipta,
      Sumber_Aplikasi: r.sumber_aplikasi,
      Dataset: r.jenis_dataset,
      ID_Sumber: r.id_record_sumber,
      Nomor_Permohonan: r.nomor_permohonan || '-',
      NIB: r.nib || '-',
      Nama_Pemohon_Perusahaan: r.nama_pemohon_usaha,
      Jenis_Layanan: r.jenis_layanan,
      Tanggal_Permohonan: r.tanggal_permohonan || '-',
      Tanggal_Penetapan_Terbit: r.tanggal_penetapan_terbit || '-',
      Nomor_Dokumen_SK: r.nomor_dokumen || '-',
      Status_Asli: r.status_asli,
      Status_DIPTA: r.status_dipta,
      Kecamatan: r.kecamatan || '-',
      Kelurahan: r.kelurahan || '-',
      Periode_Bulan: r.periode_data,
      Investasi_Rp: r.investasi_rupiah || 0,
      Tenaga_Kerja_TKI: r.tki_count || 0
    }));
    const wsDetail = XLSX.utils.json_to_sheet(
      detailRows.length > 0 ? detailRows : [{ Keterangan: 'Tidak ada data pada periode yang dipilih' }]
    );
    XLSX.utils.book_append_sheet(wb, wsDetail, '3_Rincian_Berkas');

    const modeTag =
      reportMode === 'BULANAN'
        ? `Bulanan_${selectedMonth}`
        : reportMode === 'MINGGUAN'
        ? `Mingguan_${effectiveDateRange.start}_sd_${effectiveDateRange.end}`
        : `Tanggal_${effectiveDateRange.start}_sd_${effectiveDateRange.end}`;

    XLSX.writeFile(wb, `Laporan_DIPTA_${modeTag}.xlsx`);
  };

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div id="laporan-pelayanan-view" className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                Pusat Laporan Pelayanan Terpadu (Bulanan & Mingguan)
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                DPMPTSP Kab. OKI
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Susun dan unduh laporan eksekutif periode <strong>Bulanan</strong>, <strong>Mingguan</strong>, atau <strong>Filter Rentang Tanggal</strong> lintas aplikasi OSS-RBA, SICANTIK Cloud, dan SIMBG.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            id="btn-print-report"
            type="button"
            onClick={handlePrintReport}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Cetak Laporan</span>
          </button>

          <button
            id="btn-export-report-xlsx"
            type="button"
            onClick={handleExportFullReportExcel}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Unduh Laporan Lengkap (.XLSX)</span>
          </button>
        </div>
      </div>

      {/* Panel Pemilihan Jenis Periode & Filter Tanggal */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-5">
        {/* Baris 1: Pilihan Tab Jenis Periode (Bulanan / Mingguan / Filter Tanggal) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span>Pilih Mode Periode Laporan</span>
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Gunakan tombol di samping untuk mengganti laporan periode bulanan, mingguan, atau memilih berdasarkan tanggal tertentu.
            </p>
          </div>

          <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200 self-start">
            <button
              id="btn-mode-bulanan"
              type="button"
              onClick={() => setReportMode('BULANAN')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                reportMode === 'BULANAN'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Laporan Bulanan
            </button>
            <button
              id="btn-mode-mingguan"
              type="button"
              onClick={() => setReportMode('MINGGUAN')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                reportMode === 'MINGGUAN'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Laporan Mingguan
            </button>
            <button
              id="btn-mode-rentang-tanggal"
              type="button"
              onClick={() => setReportMode('RENTANG_TANGGAL')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                reportMode === 'RENTANG_TANGGAL'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Filter Berdasarkan Tanggal
            </button>
          </div>
        </div>

        {/* Baris 2: Kontrol Spesifik Sesuai Mode Periode */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          {/* KONTROL MODE BULANAN */}
          {reportMode === 'BULANAN' && (
            <>
              <div className="md:col-span-4">
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Pilih Bulan & Tahun Laporan:
                </label>
                <input
                  id="input-report-month"
                  type="month"
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="md:col-span-5">
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Pintasan Bulan Cepat:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { ym: '2026-07', label: 'Juli 2026' },
                    { ym: '2026-08', label: 'Agustus 2026' },
                    { ym: '2026-09', label: 'September 2026' },
                    { ym: '2026-10', label: 'Oktober 2026' }
                  ].map(m => (
                    <button
                      key={m.ym}
                      type="button"
                      onClick={() => setSelectedMonth(m.ym)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                        selectedMonth === m.ym
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* KONTROL MODE MINGGUAN */}
          {reportMode === 'MINGGUAN' && (
            <>
              <div className="md:col-span-3">
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Metode Pilih Minggu:
                </label>
                <select
                  value={weekSelectionType}
                  onChange={e => setWeekSelectionType(e.target.value as 'PILIH_TANGGAL' | 'MINGGU_BULAN')}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800"
                >
                  <option value="PILIH_TANGGAL">Pilih Tanggal Acuan (Senin - Minggu)</option>
                  <option value="MINGGU_BULAN">Pilih Minggu Ke-1 s/d Ke-5 di Bulan</option>
                </select>
              </div>

              {weekSelectionType === 'PILIH_TANGGAL' ? (
                <div className="md:col-span-6">
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                    Pilih Tanggal di Minggu Tersebut (Otomatis Mengambil Senin s/d Minggu):
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="input-report-week-date"
                      type="date"
                      value={selectedWeekAnchorDate}
                      onChange={e => setSelectedWeekAnchorDate(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl font-medium">
                      Rentang: <strong>{effectiveDateRange.start}</strong> s/d <strong>{effectiveDateRange.end}</strong>
                    </span>
                  </div>
                </div>
              ) : (
                <>
                  <div className="md:col-span-3">
                    <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                      Pilih Bulan:
                    </label>
                    <input
                      type="month"
                      value={selectedMonth}
                      onChange={e => setSelectedMonth(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                      Pilih Minggu Ke:
                    </label>
                    <div className="grid grid-cols-5 gap-1">
                      {[1, 2, 3, 4, 5].map(w => (
                        <button
                          key={w}
                          type="button"
                          onClick={() => setSelectedWeekOfMonth(w)}
                          className={`py-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                            selectedWeekOfMonth === w
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          M-{w}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {/* KONTROL MODE FILTER BERDASARKAN TANGGAL (RENTANG TANGGAL) */}
          {reportMode === 'RENTANG_TANGGAL' && (
            <>
              <div className="md:col-span-3">
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Dari Tanggal (Mulai):
                </label>
                <input
                  id="input-report-start-date"
                  type="date"
                  value={customStartDate}
                  onChange={e => setCustomStartDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="md:col-span-3">
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Sampai Tanggal (Akhir):
                </label>
                <input
                  id="input-report-end-date"
                  type="date"
                  value={customEndDate}
                  onChange={e => setCustomEndDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="md:col-span-3">
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Pintasan Rentang Cepat:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setCustomStartDate('2026-09-01');
                      setCustomEndDate('2026-09-07');
                    }}
                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                  >
                    1–7 Sep
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomStartDate('2026-09-01');
                      setCustomEndDate('2026-09-15');
                    }}
                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                  >
                    1–15 Sep
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomStartDate('2026-09-01');
                      setCustomEndDate('2026-09-30');
                    }}
                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                  >
                    1 Bulan Penuh
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomStartDate('');
                      setCustomEndDate('');
                    }}
                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 cursor-pointer"
                  >
                    Semua Tanggal
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Basis Acuan Tanggal */}
          <div className="md:col-span-3">
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">
              Basis Acuan Tanggal:
            </label>
            <select
              value={dateBasis}
              onChange={e => setDateBasis(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800"
            >
              <option value="PERMOHONAN">Tanggal Permohonan / Pengajuan</option>
              <option value="TERBIT">Tanggal Penetapan / Terbit Izin</option>
              <option value="SEMUA_TANGGAL">Tanggal Permohonan ATAU Terbit</option>
            </select>
          </div>
        </div>

        {/* Baris 3: Filter Sumber, Status, Kecamatan, dan Pencarian */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-slate-100">
          <div>
            <label className="text-[11px] font-semibold text-slate-500 block mb-1">
              Sumber Aplikasi:
            </label>
            <select
              value={filterSource}
              onChange={e => setFilterSource(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800"
            >
              <option value="SEMUA">Seluruh Sumber (OSS, SICANTIK, SIMBG)</option>
              <option value="OSS-RBA">OSS-RBA</option>
              <option value="SICANTIK">SICANTIK Cloud</option>
              <option value="SIMBG">SIMBG (PBG/SLF)</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-500 block mb-1">
              Status Standar DIPTA:
            </label>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800"
            >
              <option value="SEMUA">Semua Status DIPTA</option>
              <option value="SELESAI_TERBIT">SELESAI / TERBIT</option>
              <option value="DALAM_PROSES">DALAM PROSES</option>
              <option value="DITOLAK">DITOLAK</option>
              <option value="BELUM_DIKLASIFIKASIKAN">BELUM DIKLASIFIKASIKAN</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-500 block mb-1">
              Kecamatan (18 Kecamatan OKI):
            </label>
            <select
              value={filterKecamatan}
              onChange={e => setFilterKecamatan(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800"
            >
              <option value="SEMUA">Seluruh Kecamatan (18 Kecamatan)</option>
              {OKI_KECAMATAN_LIST.map(k => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-500 block mb-1">
              Pencarian Berkas / Pemohon:
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari NIB, nama usaha, nomor SK..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs placeholder-slate-400"
              />
            </div>
          </div>
        </div>

        {/* Info Banner Periode Aktif */}
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-emerald-950">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Menampilkan <strong>{effectiveDateRange.label}</strong> — Ditemukan{' '}
              <strong>{reportRecords.length} berkas pelayanan</strong> dari total {records.length} data tersimpan.
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setFilterSource('SEMUA');
              setFilterStatus('SEMUA');
              setFilterKecamatan('SEMUA');
              setSearchQuery('');
              setDateBasis('SEMUA_TANGGAL');
              if (reportMode === 'RENTANG_TANGGAL') {
                setCustomStartDate('');
                setCustomEndDate('');
              }
            }}
            className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 underline self-start sm:self-auto cursor-pointer"
          >
            Tampilkan Seluruh Data Tanpa Batas Tanggal
          </button>
        </div>
      </div>

      {/* Kartu KPI Ringkasan Laporan */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Total Pelayanan</span>
            <Layers className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1.5">{stats.total}</div>
          <div className="text-[11px] text-slate-400 mt-1">
            OSS: {stats.ossCount} • SICANTIK: {stats.sicantikCount} • SIMBG: {stats.simbgCount}
          </div>
        </div>

        <div className="bg-white border border-emerald-200 rounded-xl p-4 shadow-xs bg-emerald-50/20">
          <div className="flex items-center justify-between text-xs text-emerald-800 font-medium">
            <span>Selesai / Izin Terbit</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-700 mt-1.5">{stats.selesai}</div>
          <div className="text-[11px] text-emerald-600 mt-1 font-semibold">
            {stats.completionRate}% Rasio Penyelesaian
          </div>
        </div>

        <div className="bg-white border border-amber-200 rounded-xl p-4 shadow-xs bg-amber-50/20">
          <div className="flex items-center justify-between text-xs text-amber-800 font-medium">
            <span>Dalam Proses</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-700 mt-1.5">{stats.proses}</div>
          <div className="text-[11px] text-amber-600 mt-1">Sedang diverifikasi teknis</div>
        </div>

        <div className="bg-white border border-rose-200 rounded-xl p-4 shadow-xs bg-rose-50/10">
          <div className="flex items-center justify-between text-xs text-rose-800 font-medium">
            <span>Ditolak</span>
            <XCircle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-rose-700 mt-1.5">{stats.ditolak}</div>
          <div className="text-[11px] text-slate-400 mt-1">Tidak memenuhi syarat</div>
        </div>

        <div className="bg-white border border-indigo-200 rounded-xl p-4 shadow-xs bg-indigo-50/20 col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-xs text-indigo-900 font-medium">
            <span>Realisasi Investasi</span>
            <TrendingUp className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-lg font-bold text-indigo-700 mt-1.5 truncate" title={`Rp ${stats.totalInvestasi.toLocaleString('id-ID')}`}>
            Rp {(stats.totalInvestasi / 1_000_000_000).toFixed(2)} Miliar
          </div>
          <div className="text-[11px] text-indigo-600 mt-1">
            Serapan TKI: <strong>{stats.totalTki.toLocaleString('id-ID')}</strong> orang
          </div>
        </div>
      </div>

      {/* Sub-Navigasi Tabel Laporan */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          type="button"
          onClick={() => setActiveReportTab('RINGKASAN')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeReportTab === 'RINGKASAN'
              ? 'border-emerald-600 text-emerald-800 bg-emerald-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>1. Rekapitulasi Per Sumber & Dataset</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveReportTab('KECAMATAN')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeReportTab === 'KECAMATAN'
              ? 'border-emerald-600 text-emerald-800 bg-emerald-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>2. Rekapitulasi 18 Kecamatan</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveReportTab('RINCIAN')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeReportTab === 'RINCIAN'
              ? 'border-emerald-600 text-emerald-800 bg-emerald-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>3. Tabel Rincian Berkas ({reportRecords.length})</span>
        </button>
      </div>

      {/* TAB 1: REKAPITULASI PER SUMBER APLIKASI */}
      {activeReportTab === 'RINGKASAN' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Tabel Rekapitulasi Kinerja Pelayanan Per Sumber Aplikasi
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">{effectiveDateRange.label}</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-700">
              <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Sumber Aplikasi</th>
                  <th className="px-4 py-3 text-right">Total Permohonan</th>
                  <th className="px-4 py-3 text-right text-emerald-700">Selesai / Terbit</th>
                  <th className="px-4 py-3 text-right text-amber-700">Dalam Proses</th>
                  <th className="px-4 py-3 text-right text-rose-700">Ditolak</th>
                  <th className="px-4 py-3 text-right">Capaian Selesai (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summaryBySource.map(row => (
                  <tr key={row.code} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold mr-2 ${row.badge}`}>
                        {row.code}
                      </span>
                      {row.name}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">{row.total}</td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-700">{row.selesai}</td>
                    <td className="px-4 py-3 text-right font-semibold text-amber-700">{row.proses}</td>
                    <td className="px-4 py-3 text-right font-semibold text-rose-700">{row.ditolak}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">{row.rasio}%</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100/80 font-bold text-slate-900 border-t border-slate-200">
                <tr>
                  <td className="px-4 py-3">TOTAL KONSOLIDASI DPMPTSP OKI</td>
                  <td className="px-4 py-3 text-right">{stats.total}</td>
                  <td className="px-4 py-3 text-right text-emerald-700">{stats.selesai}</td>
                  <td className="px-4 py-3 text-right text-amber-700">{stats.proses}</td>
                  <td className="px-4 py-3 text-right text-rose-700">{stats.ditolak}</td>
                  <td className="px-4 py-3 text-right">{stats.completionRate}%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: REKAPITULASI 18 KECAMATAN */}
      {activeReportTab === 'KECAMATAN' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Rekapitulasi Sebaran Pelayanan Per Kecamatan (18 Kecamatan Kab. OKI)
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">{effectiveDateRange.label}</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-700">
              <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 w-10">No</th>
                  <th className="px-4 py-3">Kecamatan</th>
                  <th className="px-4 py-3 text-right">OSS-RBA</th>
                  <th className="px-4 py-3 text-right">SICANTIK</th>
                  <th className="px-4 py-3 text-right">SIMBG</th>
                  <th className="px-4 py-3 text-right text-emerald-700">Selesai</th>
                  <th className="px-4 py-3 text-right text-amber-700">Proses</th>
                  <th className="px-4 py-3 text-right text-rose-700">Ditolak</th>
                  <th className="px-4 py-3 text-right font-bold">Total Berkas</th>
                  <th className="px-4 py-3 text-right">Nilai Investasi (Rp)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summaryByKecamatan.map((row, idx) => (
                  <tr key={row.kecamatan} className="hover:bg-slate-50/80">
                    <td className="px-4 py-2.5 text-slate-400 font-mono">{idx + 1}</td>
                    <td className="px-4 py-2.5 font-semibold text-slate-900">{row.kecamatan}</td>
                    <td className="px-4 py-2.5 text-right">{row.oss}</td>
                    <td className="px-4 py-2.5 text-right">{row.sicantik}</td>
                    <td className="px-4 py-2.5 text-right">{row.simbg}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-emerald-700">{row.selesai}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-amber-700">{row.proses}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-rose-700">{row.ditolak}</td>
                    <td className="px-4 py-2.5 text-right font-bold text-slate-900 bg-slate-50/60">{row.total}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-[11px]">
                      {row.investasi > 0 ? row.investasi.toLocaleString('id-ID') : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: RINCIAN BERKAS PELAYANAN */}
      {activeReportTab === 'RINCIAN' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Daftar Rincian Berkas Pelayanan ({reportRecords.length} Baris)
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">{effectiveDateRange.label}</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-xs text-left text-slate-700">
              <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200">
                <tr>
                  <th className="px-3.5 py-3">No</th>
                  <th className="px-3.5 py-3">Sumber / ID</th>
                  <th className="px-3.5 py-3">Pemohon / Perusahaan</th>
                  <th className="px-3.5 py-3">Jenis Layanan / Izin</th>
                  <th className="px-3.5 py-3">Kecamatan</th>
                  <th className="px-3.5 py-3">Tgl Permohonan</th>
                  <th className="px-3.5 py-3">Tgl Terbit / SK</th>
                  <th className="px-3.5 py-3">Nomor Dokumen</th>
                  <th className="px-3.5 py-3">Status DIPTA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedRecords.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                      Tidak ada data berkas pada rentang tanggal / periode yang dipilih.
                    </td>
                  </tr>
                ) : (
                  paginatedRecords.map((rec, idx) => (
                    <tr key={rec.id_dipta} className="hover:bg-slate-50/80">
                      <td className="px-3.5 py-2.5 text-slate-400 font-mono">
                        {(currentPage - 1) * pageSize + idx + 1}
                      </td>
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        <div className="font-semibold text-slate-900">{rec.id_record_sumber}</div>
                        <div className="text-[10px] text-slate-500">
                          {rec.sumber_aplikasi} • {rec.jenis_dataset}
                        </div>
                      </td>
                      <td className="px-3.5 py-2.5 font-medium text-slate-900 max-w-[200px] truncate" title={rec.nama_pemohon_usaha}>
                        {rec.nama_pemohon_usaha}
                      </td>
                      <td className="px-3.5 py-2.5 max-w-[220px] truncate" title={rec.jenis_layanan}>
                        {rec.jenis_layanan}
                      </td>
                      <td className="px-3.5 py-2.5 whitespace-nowrap">{rec.kecamatan || '-'}</td>
                      <td className="px-3.5 py-2.5 whitespace-nowrap font-mono text-[11px]">
                        {rec.tanggal_permohonan || '-'}
                      </td>
                      <td className="px-3.5 py-2.5 whitespace-nowrap font-mono text-[11px] text-emerald-700 font-semibold">
                        {rec.tanggal_penetapan_terbit || '-'}
                      </td>
                      <td className="px-3.5 py-2.5 whitespace-nowrap font-mono text-[11px]">
                        {rec.nomor_dokumen || '-'}
                      </td>
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        <StatusBadge status={rec.status_dipta} type="dipta" size="sm" />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={currentPage}
            totalItems={reportRecords.length}
            itemsPerPage={pageSize}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setPageSize}
            pageSizeOptions={[10, 25, 50, 100]}
          />
        </div>
      )}
    </div>
  );
};
