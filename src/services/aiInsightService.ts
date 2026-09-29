// DIPTA - AI Insight Client Service
import { DiptaRecord, GlobalFilter } from '../types';

export type AiInsightFocus = 'comprehensive' | 'bottlenecks' | 'geographic' | 'recommendations';

export interface AiInsightRequestPayload {
  filterSummary: {
    periode?: string;
    dateRange?: string;
    sumber?: string;
    kecamatan?: string;
    status?: string;
    jenisLayanan?: string;
    searchQuery?: string;
  };
  metrics: {
    totalPelayanan: number;
    selesaiTerbit: number;
    dalamProses: number;
    ditolak: number;
    perluVerifikasi: number;
    completionRate: number;
    bySource: { [key: string]: number };
    byStatus: { [key: string]: number };
    topServices: { layanan: string; fullLayanan?: string; total: number }[];
    topKecamatan: { kecamatan: string; total: number }[];
    dailyTrend?: { date: string; total: number; selesai: number }[];
  };
  focus: AiInsightFocus;
  sampleRecordsSnippet?: {
    sumber_aplikasi: string;
    jenis_layanan: string;
    nama_pemohon_usaha: string;
    status_dipta: string;
    kecamatan?: string;
    tanggal_permohonan?: string;
  }[];
  customInstruction?: string;
}

export interface AiInsightResponse {
  success: boolean;
  insight: string;
  generatedAt: string;
  model: string;
  totalAnalyzed: number;
  focus: string;
  error?: string;
}

export class AiInsightService {
  /**
   * Request automated executive insight from Gemini API through server endpoint
   */
  static async generateInsight(payload: AiInsightRequestPayload): Promise<AiInsightResponse> {
    const response = await fetch('/api/ai/insight', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Gagal menghasilkan AI Insight (HTTP ${response.status})`);
    }

    return await response.json();
  }

  /**
   * Prepare request payload from filtered records and active filter state
   */
  static preparePayload(
    records: DiptaRecord[],
    filters: GlobalFilter,
    focus: AiInsightFocus = 'comprehensive',
    customInstruction = ''
  ): AiInsightRequestPayload {
    const totalPelayanan = records.length;
    const selesaiTerbit = records.filter(r => r.status_dipta === 'SELESAI_TERBIT').length;
    const dalamProses = records.filter(r => r.status_dipta === 'DALAM_PROSES').length;
    const ditolak = records.filter(r => r.status_dipta === 'DITOLAK').length;
    const perluVerifikasi = records.filter(r => r.status_validasi === 'PERLU_VERIFIKASI').length;
    const completionRate = totalPelayanan > 0 ? Number(((selesaiTerbit / totalPelayanan) * 100).toFixed(1)) : 0;

    // Sumber breakdown
    const bySource: { [key: string]: number } = { 'OSS-RBA': 0, SICANTIK: 0, SIMBG: 0 };
    records.forEach(r => {
      if (bySource[r.sumber_aplikasi] !== undefined) {
        bySource[r.sumber_aplikasi] += 1;
      }
    });

    // Status breakdown
    const byStatus: { [key: string]: number } = {
      'Selesai / Terbit': selesaiTerbit,
      'Dalam Proses': dalamProses,
      Ditolak: ditolak,
      'Belum Terklasifikasi': records.filter(r => r.status_dipta === 'BELUM_DIKLASIFIKASIKAN').length,
    };

    // Top services
    const serviceMap: { [key: string]: number } = {};
    records.forEach(r => {
      const s = r.jenis_layanan || 'Lainnya';
      serviceMap[s] = (serviceMap[s] || 0) + 1;
    });
    const topServices = Object.entries(serviceMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([layanan, total]) => ({ layanan, total }));

    // Top Kecamatan
    const kecMap: { [key: string]: number } = {};
    records.forEach(r => {
      const k = r.kecamatan || 'Belum Terdata';
      kecMap[k] = (kecMap[k] || 0) + 1;
    });
    const topKecamatan = Object.entries(kecMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([kecamatan, total]) => ({ kecamatan, total }));

    // Sample records snippet (up to 10 latest)
    const sampleRecordsSnippet = records.slice(0, 10).map(r => ({
      sumber_aplikasi: r.sumber_aplikasi,
      jenis_layanan: r.jenis_layanan,
      nama_pemohon_usaha: r.nama_pemohon_usaha || 'Pemohon Terdata',
      status_dipta: r.status_dipta,
      kecamatan: r.kecamatan || 'Kab. OKI',
      tanggal_permohonan: r.tanggal_permohonan || r.periode_data || '',
    }));

    // Filter Summary string
    const filterSummary = {
      dateRange: filters.periode_start && filters.periode_end
        ? `${filters.periode_start} s/d ${filters.periode_end}`
        : filters.periode_start || 'Semua Periode',
      sumber: filters.sumber_aplikasi !== 'SEMUA' ? filters.sumber_aplikasi : 'Seluruh Sumber (OSS, SICANTIK, SIMBG)',
      kecamatan: filters.kecamatan !== 'SEMUA' ? `Kec. ${filters.kecamatan}` : 'Seluruh 18 Kecamatan Kab. OKI',
      status: filters.status_dipta !== 'SEMUA' ? filters.status_dipta : 'Semua Status Pelayanan',
      jenisLayanan: filters.jenis_layanan !== 'SEMUA' ? filters.jenis_layanan : undefined,
      searchQuery: filters.search_query ? filters.search_query : undefined,
    };

    return {
      filterSummary,
      metrics: {
        totalPelayanan,
        selesaiTerbit,
        dalamProses,
        ditolak,
        perluVerifikasi,
        completionRate,
        bySource,
        byStatus,
        topServices,
        topKecamatan,
      },
      focus,
      sampleRecordsSnippet,
      customInstruction,
    };
  }
}
