// DIPTA - Supabase Cloud Database Client & Synchronization Service
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { DiptaRecord, ImportBatch, DataQualityIssue, AuditLog, StatusMappingRule } from '../types';

const STORAGE_KEYS = {
  SUPABASE_URL: 'dipta_supabase_url',
  SUPABASE_ANON_KEY: 'dipta_supabase_anon_key',
  LAST_SYNC: 'dipta_supabase_last_sync'
};

const DEFAULT_SUPABASE_URL = 'https://lajhgapanricrzlxlniq.supabase.co';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConfigured: boolean;
}

export interface SupabaseConnectionStatus {
  connected: boolean;
  statusText: string;
  statusCode?: number;
  latencyMs?: number;
  error?: string;
  availableTables?: string[];
}

export class DiptaSupabaseService {
  private static client: SupabaseClient | null = null;
  private static cachedUrl: string = '';
  private static cachedKey: string = '';

  /**
   * Get current configuration
   */
  static getConfig(): SupabaseConfig {
    const url = localStorage.getItem(STORAGE_KEYS.SUPABASE_URL) ||
      (import.meta.env.VITE_SUPABASE_URL as string) ||
      DEFAULT_SUPABASE_URL;

    const anonKey = localStorage.getItem(STORAGE_KEYS.SUPABASE_ANON_KEY) ||
      (import.meta.env.VITE_SUPABASE_ANON_KEY as string) ||
      '';

    return {
      url: url.trim(),
      anonKey: anonKey.trim(),
      isConfigured: Boolean(url && anonKey)
    };
  }

  /**
   * Save configuration to localStorage
   */
  static saveConfig(url: string, anonKey: string): void {
    const cleanUrl = url.trim() || DEFAULT_SUPABASE_URL;
    const cleanKey = anonKey.trim();

    localStorage.setItem(STORAGE_KEYS.SUPABASE_URL, cleanUrl);
    localStorage.setItem(STORAGE_KEYS.SUPABASE_ANON_KEY, cleanKey);

    // Reset client to reinitialize with new credentials
    this.client = null;
    this.cachedUrl = '';
    this.cachedKey = '';
  }

  /**
   * Reset configuration to default URL with empty key
   */
  static resetConfig(): void {
    localStorage.removeItem(STORAGE_KEYS.SUPABASE_URL);
    localStorage.removeItem(STORAGE_KEYS.SUPABASE_ANON_KEY);
    this.client = null;
    this.cachedUrl = '';
    this.cachedKey = '';
  }

  /**
   * Get or instantiate the Supabase client
   */
  static getClient(): SupabaseClient | null {
    const { url, anonKey, isConfigured } = this.getConfig();

    if (!isConfigured) {
      return null;
    }

    if (!this.client || this.cachedUrl !== url || this.cachedKey !== anonKey) {
      this.cachedUrl = url;
      this.cachedKey = anonKey;
      this.client = createClient(url, anonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      });
    }

    return this.client;
  }

  /**
   * Test connection to Supabase endpoint and database
   */
  static async testConnection(): Promise<SupabaseConnectionStatus> {
    const { url, anonKey, isConfigured } = this.getConfig();

    if (!url) {
      return {
        connected: false,
        statusText: 'URL Supabase belum diatur'
      };
    }

    if (!anonKey) {
      return {
        connected: false,
        statusText: 'Kunci API (Anon Key) belum diisi. Masukkan anon public key dari Supabase Dashboard.'
      };
    }

    const startTime = performance.now();

    try {
      const client = this.getClient();
      if (!client) {
        return {
          connected: false,
          statusText: 'Gagal menginisialisasi klien Supabase'
        };
      }

      // Check if dipta_records table exists or test connection via REST query
      const { data, error, status } = await client
        .from('dipta_records')
        .select('id_dipta')
        .limit(1);

      const latencyMs = Math.round(performance.now() - startTime);

      if (error) {
        // Code 'PGRST205' or 404 indicates table hasn't been created yet, but connection & auth succeed!
        if (error.code === 'PGRST205' || error.message?.includes('does not exist') || error.code === '42P01') {
          return {
            connected: true,
            statusText: 'Terhubung ke Supabase! Tabel belum dibuat. Jalankan skrip SQL migrasi untuk membuat tabel.',
            statusCode: status,
            latencyMs,
            availableTables: []
          };
        }

        // Authentication failure
        if (status === 401 || status === 403 || error.message?.includes('JWT') || error.message?.includes('apikey')) {
          return {
            connected: false,
            statusText: 'Kunci Anon Key tidak valid atau kedaluwarsa. Periksa kembali di Supabase Project Settings > API.',
            statusCode: status,
            latencyMs,
            error: error.message
          };
        }

        return {
          connected: false,
          statusText: `Kesalahan query Supabase: ${error.message}`,
          statusCode: status,
          latencyMs,
          error: error.message
        };
      }

      return {
        connected: true,
        statusText: 'Koneksi ke Supabase aktif dan tabel dipta_records siap digunakan.',
        statusCode: status || 200,
        latencyMs,
        availableTables: ['dipta_records']
      };
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - startTime);
      return {
        connected: false,
        statusText: `Gagal menghubungi server Supabase: ${err?.message || 'Network Error'}`,
        latencyMs,
        error: err?.message
      };
    }
  }

  /**
   * Upload all local records to Supabase dipta_records table
   */
  static async uploadRecordsToSupabase(records: DiptaRecord[]): Promise<{ success: boolean; count: number; error?: string }> {
    const client = this.getClient();
    if (!client) {
      return { success: false, count: 0, error: 'Supabase client belum terkonfigurasi' };
    }

    try {
      // Upsert in batches of 50 to avoid payload limits
      const batchSize = 50;
      let totalUpserted = 0;

      for (let i = 0; i < records.length; i += batchSize) {
        const chunk = records.slice(i, i + batchSize);
        const { error } = await client
          .from('dipta_records')
          .upsert(chunk, { onConflict: 'id_dipta' });

        if (error) {
          throw new Error(error.message);
        }
        totalUpserted += chunk.length;
      }

      localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toLocaleString('id-ID') + ' WIB');
      return { success: true, count: totalUpserted };
    } catch (err: any) {
      return { success: false, count: 0, error: err?.message || 'Gagal mengupload data' };
    }
  }

  /**
   * Fetch all records from Supabase dipta_records table
   */
  static async fetchRecordsFromSupabase(): Promise<{ success: boolean; data: DiptaRecord[]; error?: string }> {
    const client = this.getClient();
    if (!client) {
      return { success: false, data: [], error: 'Supabase client belum terkonfigurasi' };
    }

    try {
      const { data, error } = await client
        .from('dipta_records')
        .select('*')
        .order('tanggal_update_dipta', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toLocaleString('id-ID') + ' WIB');
      return { success: true, data: (data as DiptaRecord[]) || [] };
    } catch (err: any) {
      return { success: false, data: [], error: err?.message || 'Gagal mengambil data dari Supabase' };
    }
  }

  /**
   * Upload batches to Supabase
   */
  static async uploadBatchesToSupabase(batches: ImportBatch[]): Promise<{ success: boolean; count: number; error?: string }> {
    const client = this.getClient();
    if (!client) return { success: false, count: 0, error: 'Client not configured' };

    try {
      const { error } = await client
        .from('dipta_batches')
        .upsert(batches, { onConflict: 'batch_id' });

      if (error) throw new Error(error.message);
      return { success: true, count: batches.length };
    } catch (err: any) {
      return { success: false, count: 0, error: err?.message };
    }
  }

  /**
   * Upload quality issues to Supabase
   */
  static async uploadIssuesToSupabase(issues: DataQualityIssue[]): Promise<{ success: boolean; count: number; error?: string }> {
    const client = this.getClient();
    if (!client) return { success: false, count: 0, error: 'Client not configured' };

    try {
      const { error } = await client
        .from('dipta_issues')
        .upsert(issues, { onConflict: 'issue_id' });

      if (error) throw new Error(error.message);
      return { success: true, count: issues.length };
    } catch (err: any) {
      return { success: false, count: 0, error: err?.message };
    }
  }

  /**
   * Upload audit logs to Supabase
   */
  static async uploadAuditLogsToSupabase(logs: AuditLog[]): Promise<{ success: boolean; count: number; error?: string }> {
    const client = this.getClient();
    if (!client) return { success: false, count: 0, error: 'Client not configured' };

    try {
      const { error } = await client
        .from('dipta_audit_logs')
        .upsert(logs, { onConflict: 'log_id' });

      if (error) throw new Error(error.message);
      return { success: true, count: logs.length };
    } catch (err: any) {
      return { success: false, count: 0, error: err?.message };
    }
  }

  /**
   * Upload status mapping rules to Supabase
   */
  static async uploadMappingsToSupabase(rules: StatusMappingRule[]): Promise<{ success: boolean; count: number; error?: string }> {
    const client = this.getClient();
    if (!client) return { success: false, count: 0, error: 'Client not configured' };

    try {
      const { error } = await client
        .from('dipta_status_mappings')
        .upsert(rules, { onConflict: 'mapping_id' });

      if (error) throw new Error(error.message);
      return { success: true, count: rules.length };
    } catch (err: any) {
      return { success: false, count: 0, error: err?.message };
    }
  }

  /**
   * Clear all records, batches, issues, and audit logs from Supabase
   */
  static async clearAllCloudData(): Promise<{ success: boolean; error?: string }> {
    const client = this.getClient();
    if (!client) {
      return { success: false, error: 'Klien Supabase belum terkonfigurasi' };
    }

    try {
      await Promise.allSettled([
        client.from('dipta_records').delete().neq('id_dipta', '___DUMMY_NEQ___'),
        client.from('dipta_batches').delete().neq('batch_id', '___DUMMY_NEQ___'),
        client.from('dipta_issues').delete().neq('issue_id', '___DUMMY_NEQ___'),
        client.from('dipta_audit_logs').delete().neq('log_id', '___DUMMY_NEQ___')
      ]);

      localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toLocaleString('id-ID') + ' WIB (Dikosongkan)');
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Gagal membersihkan data di Supabase' };
    }
  }

  /**
   * Get last synchronization timestamp
   */
  static getLastSync(): string {
    return localStorage.getItem(STORAGE_KEYS.LAST_SYNC) || 'Belum pernah disinkronkan';
  }

  /**
   * Get ready-to-run PostgreSQL schema script for Supabase SQL Editor
   */
  static getMigrationSQL(): string {
    return `-- ==============================================================
-- DIPTA (Dashboard Integrasi Pelayanan Terpadu) DPMPTSP OKI
-- Skema Database Supabase PostgreSQL
-- ==============================================================

-- 1. TABEL UTAMA: dipta_records (Konsolidasi OSS, SICANTIK, SIMBG)
CREATE TABLE IF NOT EXISTS public.dipta_records (
    id_dipta TEXT PRIMARY KEY,
    sumber_aplikasi TEXT NOT NULL,
    jenis_dataset TEXT NOT NULL,
    id_record_sumber TEXT NOT NULL,
    nomor_permohonan TEXT,
    nib TEXT,
    id_proyek TEXT,
    nama_pemohon_usaha TEXT NOT NULL,
    kelompok_layanan TEXT NOT NULL,
    jenis_layanan TEXT NOT NULL,
    tanggal_permohonan TEXT,
    tanggal_penetapan_terbit TEXT,
    nomor_dokumen TEXT,
    status_asli TEXT NOT NULL,
    status_dipta TEXT NOT NULL,
    kecamatan TEXT,
    kelurahan TEXT,
    periode_data TEXT NOT NULL,
    status_validasi TEXT NOT NULL,
    catatan_validasi TEXT,
    tanggal_update_dipta TEXT NOT NULL,
    operator_update TEXT NOT NULL,
    batch_id TEXT,
    
    -- Kolom analitik OSS
    investasi_rupiah NUMERIC,
    tki_count INTEGER,
    kbli_code TEXT,
    kbli_title TEXT,
    sektor TEXT,
    risiko_usaha TEXT,
    skala_usaha TEXT,
    jenis_perusahaan TEXT,
    status_penanaman_modal TEXT,
    kategori_dokumen_oss TEXT,
    
    -- Kolom analitik SICANTIK
    durasi_hari INTEGER,
    
    -- Kolom analitik SIMBG
    jenis_permohonan_simbg TEXT,
    status_slf TEXT,
    fungsi_bangunan TEXT,
    subfungsi_bangunan TEXT,
    luas_m2 NUMERIC,
    jumlah_lantai INTEGER,
    jumlah_unit INTEGER,
    
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indeks untuk pencarian dan pemfilteran cepat
CREATE INDEX IF NOT EXISTS idx_dipta_sumber ON public.dipta_records(sumber_aplikasi);
CREATE INDEX IF NOT EXISTS idx_dipta_status ON public.dipta_records(status_dipta);
CREATE INDEX IF NOT EXISTS idx_dipta_kecamatan ON public.dipta_records(kecamatan);
CREATE INDEX IF NOT EXISTS idx_dipta_periode ON public.dipta_records(periode_data);

-- 2. TABEL BATCH IMPORT: dipta_batches
CREATE TABLE IF NOT EXISTS public.dipta_batches (
    batch_id TEXT PRIMARY KEY,
    nama_file TEXT NOT NULL,
    sumber_aplikasi TEXT NOT NULL,
    jenis_dataset TEXT NOT NULL,
    periode_data TEXT NOT NULL,
    total_baris INTEGER NOT NULL,
    baris_sukses INTEGER NOT NULL,
    baris_error INTEGER NOT NULL,
    duplikat INTEGER NOT NULL,
    waktu_import TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    operator_name TEXT NOT NULL,
    status_batch TEXT NOT NULL,
    catatan TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. TABEL DATA QUALITY ISSUES: dipta_issues
CREATE TABLE IF NOT EXISTS public.dipta_issues (
    issue_id TEXT PRIMARY KEY,
    id_dipta TEXT NOT NULL,
    jenis_error TEXT NOT NULL,
    pesan_error TEXT NOT NULL,
    status_isu TEXT NOT NULL,
    tanggal_ditemukan TEXT NOT NULL,
    tanggal_diselesaikan TEXT,
    diselesaikan_oleh TEXT,
    catatan_resolusi TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. TABEL AUDIT LOG: dipta_audit_logs
CREATE TABLE IF NOT EXISTS public.dipta_audit_logs (
    log_id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    user_name TEXT NOT NULL,
    role_name TEXT NOT NULL,
    action_type TEXT NOT NULL,
    entity_name TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. TABEL ATURAN MAPPING: dipta_status_mappings
CREATE TABLE IF NOT EXISTS public.dipta_status_mappings (
    mapping_id TEXT PRIMARY KEY,
    source_app TEXT NOT NULL,
    source_status TEXT NOT NULL,
    target_status_dipta TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    updated_at TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Kebijakan Keamanan Row Level Security (RLS)
-- Aktifkan RLS untuk keamanan data
ALTER TABLE public.dipta_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dipta_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dipta_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dipta_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dipta_status_mappings ENABLE ROW LEVEL SECURITY;

-- Kebijakan Akses: Izinkan Baca & Tulis dengan Kunci Publik (Anon Key)
CREATE POLICY "Akses Baca Anonim" ON public.dipta_records FOR SELECT USING (true);
CREATE POLICY "Akses Tulis Anonim" ON public.dipta_records FOR ALL USING (true);

CREATE POLICY "Akses Baca Batches" ON public.dipta_batches FOR SELECT USING (true);
CREATE POLICY "Akses Tulis Batches" ON public.dipta_batches FOR ALL USING (true);

CREATE POLICY "Akses Baca Issues" ON public.dipta_issues FOR SELECT USING (true);
CREATE POLICY "Akses Tulis Issues" ON public.dipta_issues FOR ALL USING (true);

CREATE POLICY "Akses Baca Audit" ON public.dipta_audit_logs FOR SELECT USING (true);
CREATE POLICY "Akses Tulis Audit" ON public.dipta_audit_logs FOR ALL USING (true);

CREATE POLICY "Akses Baca Mappings" ON public.dipta_status_mappings FOR SELECT USING (true);
CREATE POLICY "Akses Tulis Mappings" ON public.dipta_status_mappings FOR ALL USING (true);
`;
  }
}
