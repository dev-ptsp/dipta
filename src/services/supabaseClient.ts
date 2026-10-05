// DIPTA - Supabase Cloud Database Client & Real-Time Synchronization Service
import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { DiptaRecord, ImportBatch, DataQualityIssue, AuditLog, StatusMappingRule, User } from '../types';

const STORAGE_KEYS = {
  SUPABASE_URL: 'dipta_supabase_url',
  SUPABASE_ANON_KEY: 'dipta_supabase_anon_key',
  LAST_SYNC: 'dipta_supabase_last_sync'
};

const DEFAULT_SUPABASE_URL = 'https://lajhgapanricrzlxlniq.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhamhnYXBhbnJpY3J6bHhsbmlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzOTI3NTAsImV4cCI6MjEwNTk2ODc1MH0.cSDJ3VkhqJmQJ5toTpkHiQvA_UB2cD3-PbY1nL4ELe0';

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

/**
 * Helper to strip undefined fields from objects before sending to Supabase PostgREST
 */
function sanitizePayload<T extends Record<string, any>>(items: T[]): Record<string, any>[] {
  return items.map(item => {
    const clean: Record<string, any> = {};
    for (const [k, v] of Object.entries(item)) {
      if (v !== undefined) {
        clean[k] = v;
      }
    }
    return clean;
  });
}

export class DiptaSupabaseService {
  private static client: SupabaseClient | null = null;
  private static cachedUrl: string = '';
  private static cachedKey: string = '';
  private static realtimeChannel: RealtimeChannel | null = null;
  private static isRealtimeConnected: boolean = false;

  /**
   * Get current configuration
   */
  static getConfig(): SupabaseConfig {
    let rawUrl =
      localStorage.getItem(STORAGE_KEYS.SUPABASE_URL) ||
      (import.meta.env.VITE_SUPABASE_URL as string) ||
      DEFAULT_SUPABASE_URL;

    let rawKey =
      localStorage.getItem(STORAGE_KEYS.SUPABASE_ANON_KEY) ||
      (import.meta.env.VITE_SUPABASE_ANON_KEY as string) ||
      DEFAULT_SUPABASE_ANON_KEY;

    // Ensure rawUrl is a valid http(s) URL (in case VITE_SUPABASE_URL was accidentally set to a JWT token)
    if (!rawUrl.trim().startsWith('http://') && !rawUrl.trim().startsWith('https://')) {
      if (rawUrl.trim().startsWith('eyJ') && !rawKey.trim()) {
        rawKey = rawUrl.trim();
      }
      rawUrl = DEFAULT_SUPABASE_URL;
      try {
        localStorage.setItem(STORAGE_KEYS.SUPABASE_URL, DEFAULT_SUPABASE_URL);
      } catch {
        // Ignore storage error
      }
    }

    if (!rawKey.trim()) {
      rawKey = DEFAULT_SUPABASE_ANON_KEY;
    }

    return {
      url: rawUrl.trim(),
      anonKey: rawKey.trim(),
      isConfigured: Boolean(rawUrl.trim() && rawKey.trim())
    };
  }

  /**
   * Save configuration to localStorage
   */
  static saveConfig(url: string, anonKey: string): void {
    let cleanUrl = url.trim() || DEFAULT_SUPABASE_URL;
    let cleanKey = anonKey.trim() || DEFAULT_SUPABASE_ANON_KEY;

    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      if (cleanUrl.startsWith('eyJ')) {
        cleanKey = cleanUrl;
      }
      cleanUrl = DEFAULT_SUPABASE_URL;
    }

    try {
      localStorage.setItem(STORAGE_KEYS.SUPABASE_URL, cleanUrl);
      localStorage.setItem(STORAGE_KEYS.SUPABASE_ANON_KEY, cleanKey);
    } catch {
      // Ignore storage quota errors
    }

    // Reset client to reinitialize with new credentials
    if (this.realtimeChannel && this.client) {
      this.client.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
      this.isRealtimeConnected = false;
    }
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
    if (this.realtimeChannel && this.client) {
      this.client.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
      this.isRealtimeConnected = false;
    }
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
        },
        realtime: {
          params: {
            eventsPerSecond: 10
          }
        }
      });
    }

    return this.client;
  }

  /**
   * Subscribe to real-time Postgres changes across all DIPTA tables
   */
  static subscribeToRealtime(onRemoteChange: (table: string, payload: any) => void): () => void {
    const client = this.getClient();
    if (!client) {
      this.isRealtimeConnected = false;
      return () => {};
    }

    if (this.realtimeChannel) {
      client.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }

    const channel = client
      .channel('dipta-realtime-all')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'dipta_records' },
        (payload) => onRemoteChange('dipta_records', payload)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'dipta_batches' },
        (payload) => onRemoteChange('dipta_batches', payload)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'dipta_issues' },
        (payload) => onRemoteChange('dipta_issues', payload)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'dipta_audit_logs' },
        (payload) => onRemoteChange('dipta_audit_logs', payload)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'dipta_status_mappings' },
        (payload) => onRemoteChange('dipta_status_mappings', payload)
      )
      .subscribe((status) => {
        this.isRealtimeConnected = status === 'SUBSCRIBED';
        window.dispatchEvent(
          new CustomEvent('dipta-supabase-status', {
            detail: { connected: this.isRealtimeConnected, status }
          })
        );
      });

    this.realtimeChannel = channel;

    return () => {
      if (this.realtimeChannel && this.client) {
        this.client.removeChannel(this.realtimeChannel);
        this.realtimeChannel = null;
        this.isRealtimeConnected = false;
      }
    };
  }

  static getRealtimeStatus(): boolean {
    return this.isRealtimeConnected;
  }

  /**
   * Update last sync time and notify listeners
   */
  static touchSyncTimestamp(suffix: string = ''): void {
    const ts = new Date().toLocaleString('id-ID') + ' WIB' + (suffix ? ` ${suffix}` : '');
    try {
      localStorage.setItem(STORAGE_KEYS.LAST_SYNC, ts);
    } catch {
      // Ignore quota errors
    }
    window.dispatchEvent(new CustomEvent('dipta-supabase-synced', { detail: { timestamp: ts } }));
  }

  /**
   * Test connection to Supabase endpoint and database
   */
  static async testConnection(): Promise<SupabaseConnectionStatus> {
    const { url, anonKey } = this.getConfig();

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

      const { error, status } = await client
        .from('dipta_records')
        .select('id_dipta')
        .limit(1);

      const latencyMs = Math.round(performance.now() - startTime);

      if (error) {
        if (error.code === 'PGRST205' || error.message?.includes('does not exist') || error.code === '42P01') {
          return {
            connected: true,
            statusText: 'Terhubung ke Supabase! Tabel belum dibuat. Jalankan skrip SQL migrasi di bawah pada SQL Editor Supabase.',
            statusCode: status,
            latencyMs,
            availableTables: []
          };
        }

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
        statusText: 'Koneksi Real-Time ke Supabase aktif dan seluruh tabel siap digunakan.',
        statusCode: status || 200,
        latencyMs,
        availableTables: ['dipta_records', 'dipta_batches', 'dipta_issues', 'dipta_audit_logs', 'dipta_status_mappings']
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
   * Upload records to Supabase dipta_records table
   */
  static async uploadRecordsToSupabase(records: DiptaRecord[]): Promise<{ success: boolean; count: number; error?: string }> {
    const client = this.getClient();
    if (!client) {
      return { success: false, count: 0, error: 'Supabase client belum terkonfigurasi' };
    }
    if (records.length === 0) {
      return { success: true, count: 0 };
    }

    try {
      const batchSize = 100;
      let totalUpserted = 0;
      const cleanRecords = sanitizePayload(records);

      for (let i = 0; i < cleanRecords.length; i += batchSize) {
        const chunk = cleanRecords.slice(i, i + batchSize);
        const { error } = await client
          .from('dipta_records')
          .upsert(chunk, { onConflict: 'id_dipta' });

        if (error) {
          if (error.code === 'PGRST205' || error.message?.includes('schema cache') || error.message?.includes('does not exist')) {
            throw new Error(
              'Tabel database belum dibuat di proyek Supabase Anda. Klik tombol "Salin SQL Lengkap (Skema + Data)" di bawah lalu jalankan (Run) di Supabase SQL Editor.'
            );
          }
          throw new Error(error.message);
        }
        totalUpserted += chunk.length;
      }

      this.touchSyncTimestamp('(Real-Time)');
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

      this.touchSyncTimestamp();
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
    if (batches.length === 0) return { success: true, count: 0 };

    try {
      const clean = sanitizePayload(batches);
      const { error } = await client
        .from('dipta_batches')
        .upsert(clean, { onConflict: 'batch_id' });

      if (error) throw new Error(error.message);
      this.touchSyncTimestamp('(Real-Time)');
      return { success: true, count: batches.length };
    } catch (err: any) {
      return { success: false, count: 0, error: err?.message };
    }
  }

  /**
   * Fetch batches from Supabase
   */
  static async fetchBatchesFromSupabase(): Promise<{ success: boolean; data: ImportBatch[]; error?: string }> {
    const client = this.getClient();
    if (!client) return { success: false, data: [], error: 'Client not configured' };

    try {
      const { data, error } = await client
        .from('dipta_batches')
        .select('*')
        .order('imported_at', { ascending: false });

      if (error) throw new Error(error.message);
      return { success: true, data: (data as ImportBatch[]) || [] };
    } catch (err: any) {
      return { success: false, data: [], error: err?.message };
    }
  }

  /**
   * Upload quality issues to Supabase
   */
  static async uploadIssuesToSupabase(issues: DataQualityIssue[]): Promise<{ success: boolean; count: number; error?: string }> {
    const client = this.getClient();
    if (!client) return { success: false, count: 0, error: 'Client not configured' };
    if (issues.length === 0) return { success: true, count: 0 };

    try {
      const clean = sanitizePayload(issues);
      const { error } = await client
        .from('dipta_issues')
        .upsert(clean, { onConflict: 'issue_id' });

      if (error) throw new Error(error.message);
      this.touchSyncTimestamp('(Real-Time)');
      return { success: true, count: issues.length };
    } catch (err: any) {
      return { success: false, count: 0, error: err?.message };
    }
  }

  /**
   * Fetch quality issues from Supabase
   */
  static async fetchIssuesFromSupabase(): Promise<{ success: boolean; data: DataQualityIssue[]; error?: string }> {
    const client = this.getClient();
    if (!client) return { success: false, data: [], error: 'Client not configured' };

    try {
      const { data, error } = await client
        .from('dipta_issues')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);
      return { success: true, data: (data as DataQualityIssue[]) || [] };
    } catch (err: any) {
      return { success: false, data: [], error: err?.message };
    }
  }

  /**
   * Upload audit logs to Supabase
   */
  static async uploadAuditLogsToSupabase(logs: AuditLog[]): Promise<{ success: boolean; count: number; error?: string }> {
    const client = this.getClient();
    if (!client) return { success: false, count: 0, error: 'Client not configured' };
    if (logs.length === 0) return { success: true, count: 0 };

    try {
      const clean = sanitizePayload(logs);
      const { error } = await client
        .from('dipta_audit_logs')
        .upsert(clean, { onConflict: 'log_id' });

      if (error) throw new Error(error.message);
      this.touchSyncTimestamp('(Real-Time)');
      return { success: true, count: logs.length };
    } catch (err: any) {
      return { success: false, count: 0, error: err?.message };
    }
  }

  /**
   * Fetch audit logs from Supabase
   */
  static async fetchAuditLogsFromSupabase(): Promise<{ success: boolean; data: AuditLog[]; error?: string }> {
    const client = this.getClient();
    if (!client) return { success: false, data: [], error: 'Client not configured' };

    try {
      const { data, error } = await client
        .from('dipta_audit_logs')
        .select('*')
        .order('waktu', { ascending: false });

      if (error) throw new Error(error.message);
      return { success: true, data: (data as AuditLog[]) || [] };
    } catch (err: any) {
      return { success: false, data: [], error: err?.message };
    }
  }

  /**
   * Upload status mapping rules to Supabase
   */
  static async uploadMappingsToSupabase(rules: StatusMappingRule[]): Promise<{ success: boolean; count: number; error?: string }> {
    const client = this.getClient();
    if (!client) return { success: false, count: 0, error: 'Client not configured' };
    if (rules.length === 0) return { success: true, count: 0 };

    try {
      const clean = sanitizePayload(rules);
      const { error } = await client
        .from('dipta_status_mappings')
        .upsert(clean, { onConflict: 'mapping_id' });

      if (error) throw new Error(error.message);
      this.touchSyncTimestamp('(Real-Time)');
      return { success: true, count: rules.length };
    } catch (err: any) {
      return { success: false, count: 0, error: err?.message };
    }
  }

  /**
   * Fetch status mapping rules from Supabase
   */
  static async fetchMappingsFromSupabase(): Promise<{ success: boolean; data: StatusMappingRule[]; error?: string }> {
    const client = this.getClient();
    if (!client) return { success: false, data: [], error: 'Client not configured' };

    try {
      const { data, error } = await client
        .from('dipta_status_mappings')
        .select('*');

      if (error) throw new Error(error.message);
      return { success: true, data: (data as StatusMappingRule[]) || [] };
    } catch (err: any) {
      return { success: false, data: [], error: err?.message };
    }
  }

  /**
   * Upload users to Supabase
   */
  static async uploadUsersToSupabase(users: User[]): Promise<{ success: boolean; count: number; error?: string }> {
    const client = this.getClient();
    if (!client) return { success: false, count: 0, error: 'Client not configured' };
    if (users.length === 0) return { success: true, count: 0 };

    try {
      const clean = sanitizePayload(users);
      const { error } = await client
        .from('dipta_users')
        .upsert(clean, { onConflict: 'user_id' });

      if (error) throw new Error(error.message);
      return { success: true, count: users.length };
    } catch (err: any) {
      return { success: false, count: 0, error: err?.message };
    }
  }

  /**
   * Fetch users from Supabase
   */
  static async fetchUsersFromSupabase(): Promise<{ success: boolean; data: User[]; error?: string }> {
    const client = this.getClient();
    if (!client) return { success: false, data: [], error: 'Client not configured' };

    try {
      const { data, error } = await client
        .from('dipta_users')
        .select('*')
        .order('user_id', { ascending: true });

      if (error) throw new Error(error.message);
      return { success: true, data: (data as User[]) || [] };
    } catch (err: any) {
      return { success: false, data: [], error: err?.message };
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

      this.touchSyncTimestamp('(Dikosongkan)');
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
-- Skema Database Supabase PostgreSQL (Real-Time Sync & Full History)
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

CREATE INDEX IF NOT EXISTS idx_dipta_sumber ON public.dipta_records(sumber_aplikasi);
CREATE INDEX IF NOT EXISTS idx_dipta_status ON public.dipta_records(status_dipta);
CREATE INDEX IF NOT EXISTS idx_dipta_kecamatan ON public.dipta_records(kecamatan);
CREATE INDEX IF NOT EXISTS idx_dipta_periode ON public.dipta_records(periode_data);

-- 2. TABEL RIWAYAT BATCH IMPORT: dipta_batches
CREATE TABLE IF NOT EXISTS public.dipta_batches (
    batch_id TEXT PRIMARY KEY,
    source_app TEXT,
    dataset_code TEXT,
    file_name TEXT,
    imported_at TEXT,
    imported_by_user_id INTEGER,
    imported_by_name TEXT,
    row_total INTEGER DEFAULT 0,
    row_valid INTEGER DEFAULT 0,
    row_invalid INTEGER DEFAULT 0,
    row_duplicate INTEGER DEFAULT 0,
    import_status TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Pastikan kolom sesuai jika tabel sudah pernah dibuat sebelumnya
ALTER TABLE public.dipta_batches ADD COLUMN IF NOT EXISTS source_app TEXT;
ALTER TABLE public.dipta_batches ADD COLUMN IF NOT EXISTS dataset_code TEXT;
ALTER TABLE public.dipta_batches ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE public.dipta_batches ADD COLUMN IF NOT EXISTS imported_at TEXT;
ALTER TABLE public.dipta_batches ADD COLUMN IF NOT EXISTS imported_by_user_id INTEGER;
ALTER TABLE public.dipta_batches ADD COLUMN IF NOT EXISTS imported_by_name TEXT;
ALTER TABLE public.dipta_batches ADD COLUMN IF NOT EXISTS row_total INTEGER DEFAULT 0;
ALTER TABLE public.dipta_batches ADD COLUMN IF NOT EXISTS row_valid INTEGER DEFAULT 0;
ALTER TABLE public.dipta_batches ADD COLUMN IF NOT EXISTS row_invalid INTEGER DEFAULT 0;
ALTER TABLE public.dipta_batches ADD COLUMN IF NOT EXISTS row_duplicate INTEGER DEFAULT 0;
ALTER TABLE public.dipta_batches ADD COLUMN IF NOT EXISTS import_status TEXT;
ALTER TABLE public.dipta_batches ADD COLUMN IF NOT EXISTS notes TEXT;

-- 3. TABEL DATA QUALITY ISSUES: dipta_issues
CREATE TABLE IF NOT EXISTS public.dipta_issues (
    issue_id TEXT PRIMARY KEY,
    id_dipta TEXT NOT NULL,
    sumber_aplikasi TEXT,
    dataset_code TEXT,
    id_record_sumber TEXT,
    jenis_error TEXT NOT NULL,
    deskripsi TEXT,
    nilai_saat_ini TEXT,
    status_isu TEXT NOT NULL,
    catatan_petugas TEXT,
    created_at TEXT,
    resolved_at TEXT,
    resolved_by_name TEXT
);

ALTER TABLE public.dipta_issues ADD COLUMN IF NOT EXISTS sumber_aplikasi TEXT;
ALTER TABLE public.dipta_issues ADD COLUMN IF NOT EXISTS dataset_code TEXT;
ALTER TABLE public.dipta_issues ADD COLUMN IF NOT EXISTS id_record_sumber TEXT;
ALTER TABLE public.dipta_issues ADD COLUMN IF NOT EXISTS deskripsi TEXT;
ALTER TABLE public.dipta_issues ADD COLUMN IF NOT EXISTS nilai_saat_ini TEXT;
ALTER TABLE public.dipta_issues ADD COLUMN IF NOT EXISTS catatan_petugas TEXT;
ALTER TABLE public.dipta_issues ADD COLUMN IF NOT EXISTS resolved_at TEXT;
ALTER TABLE public.dipta_issues ADD COLUMN IF NOT EXISTS resolved_by_name TEXT;

-- 4. TABEL RIWAYAT AUDIT TRAIL: dipta_audit_logs
CREATE TABLE IF NOT EXISTS public.dipta_audit_logs (
    log_id TEXT PRIMARY KEY,
    waktu TEXT NOT NULL,
    actor TEXT NOT NULL,
    actor_user_id INTEGER,
    action_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    sumber_aplikasi TEXT,
    field_name TEXT,
    nilai_lama TEXT,
    nilai_baru TEXT,
    alasan TEXT,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.dipta_audit_logs ADD COLUMN IF NOT EXISTS waktu TEXT;
ALTER TABLE public.dipta_audit_logs ADD COLUMN IF NOT EXISTS actor TEXT;
ALTER TABLE public.dipta_audit_logs ADD COLUMN IF NOT EXISTS actor_user_id INTEGER;
ALTER TABLE public.dipta_audit_logs ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE public.dipta_audit_logs ADD COLUMN IF NOT EXISTS sumber_aplikasi TEXT;
ALTER TABLE public.dipta_audit_logs ADD COLUMN IF NOT EXISTS field_name TEXT;
ALTER TABLE public.dipta_audit_logs ADD COLUMN IF NOT EXISTS nilai_lama TEXT;
ALTER TABLE public.dipta_audit_logs ADD COLUMN IF NOT EXISTS nilai_baru TEXT;
ALTER TABLE public.dipta_audit_logs ADD COLUMN IF NOT EXISTS alasan TEXT;
ALTER TABLE public.dipta_audit_logs ADD COLUMN IF NOT EXISTS ip_address TEXT;

-- 5. TABEL ATURAN MAPPING: dipta_status_mappings
CREATE TABLE IF NOT EXISTS public.dipta_status_mappings (
    mapping_id TEXT PRIMARY KEY,
    source_app TEXT NOT NULL,
    source_status TEXT NOT NULL,
    target_status_dipta TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    validated_by_user_id INTEGER,
    validated_by_name TEXT,
    updated_at TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.dipta_status_mappings ADD COLUMN IF NOT EXISTS validated_by_user_id INTEGER;
ALTER TABLE public.dipta_status_mappings ADD COLUMN IF NOT EXISTS validated_by_name TEXT;

-- 6. TABEL PENGGUNA SISTEM: dipta_users
CREATE TABLE IF NOT EXISTS public.dipta_users (
    user_id INTEGER PRIMARY KEY,
    username TEXT NOT NULL,
    password TEXT,
    full_name TEXT NOT NULL,
    nip TEXT,
    email TEXT,
    unit_kerja TEXT,
    jabatan TEXT,
    role_code TEXT NOT NULL,
    role_name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    last_login_at TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Kebijakan Keamanan Row Level Security (RLS)
ALTER TABLE public.dipta_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dipta_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dipta_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dipta_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dipta_status_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dipta_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Akses Penuh Records" ON public.dipta_records;
CREATE POLICY "Akses Penuh Records" ON public.dipta_records FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Akses Penuh Batches" ON public.dipta_batches;
CREATE POLICY "Akses Penuh Batches" ON public.dipta_batches FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Akses Penuh Issues" ON public.dipta_issues;
CREATE POLICY "Akses Penuh Issues" ON public.dipta_issues FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Akses Penuh Audit" ON public.dipta_audit_logs;
CREATE POLICY "Akses Penuh Audit" ON public.dipta_audit_logs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Akses Penuh Mappings" ON public.dipta_status_mappings;
CREATE POLICY "Akses Penuh Mappings" ON public.dipta_status_mappings FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Akses Penuh Users" ON public.dipta_users;
CREATE POLICY "Akses Penuh Users" ON public.dipta_users FOR ALL USING (true) WITH CHECK (true);
`;
  }

  /**
   * Generate a complete SQL script with Schema DDL + INSERT statements for all current application data
   */
  static getFullSeedSQL(data: {
    users: User[];
    mappings: StatusMappingRule[];
    records: DiptaRecord[];
    batches: ImportBatch[];
  }): string {
    const esc = (val: any): string => {
      if (val === null || val === undefined) return 'NULL';
      if (typeof val === 'number') return Number.isFinite(val) ? String(val) : 'NULL';
      if (typeof val === 'boolean') return val ? 'true' : 'false';
      return `'${String(val).replace(/'/g, "''")}'`;
    };

    let sql = this.getMigrationSQL();

    if (data.users && data.users.length > 0) {
      sql += `\n-- ==============================================================\n`;
      sql += `-- 8. SEED DATA: PENGGUNA SISTEM & RBAC (${data.users.length} Akun)\n`;
      sql += `-- ==============================================================\n`;
      const values = data.users
        .map(
          (u) =>
            `(${esc(u.user_id)}, ${esc(u.username)}, ${esc(u.password || 'dipta2026')}, ${esc(u.full_name)}, ${esc(u.nip)}, ${esc(u.email)}, ${esc(u.unit_kerja)}, ${esc(u.jabatan)}, ${esc(u.role_code)}, ${esc(u.role_name)}, ${esc(u.is_active !== false)}, ${esc(u.last_login_at)})`
        )
        .join(',\n');
      sql += `INSERT INTO public.dipta_users (user_id, username, password, full_name, nip, email, unit_kerja, jabatan, role_code, role_name, is_active, last_login_at)\nVALUES\n${values}\nON CONFLICT (user_id) DO UPDATE SET\n  username = EXCLUDED.username,\n  password = EXCLUDED.password,\n  full_name = EXCLUDED.full_name,\n  nip = EXCLUDED.nip,\n  email = EXCLUDED.email,\n  unit_kerja = EXCLUDED.unit_kerja,\n  jabatan = EXCLUDED.jabatan,\n  role_code = EXCLUDED.role_code,\n  role_name = EXCLUDED.role_name,\n  is_active = EXCLUDED.is_active;\n`;
    }

    if (data.mappings && data.mappings.length > 0) {
      sql += `\n-- ==============================================================\n`;
      sql += `-- 9. SEED DATA: MASTER PEMETAAN STATUS (${data.mappings.length} Aturan)\n`;
      sql += `-- ==============================================================\n`;
      const values = data.mappings
        .map(
          (m) =>
            `(${esc(m.mapping_id)}, ${esc(m.source_app)}, ${esc(m.source_status)}, ${esc(m.target_status_dipta)}, ${esc(m.description)}, ${esc(m.is_active !== false)}, ${esc(m.validated_by_user_id)}, ${esc(m.validated_by_name)}, ${esc(m.updated_at)})`
        )
        .join(',\n');
      sql += `INSERT INTO public.dipta_status_mappings (mapping_id, source_app, source_status, target_status_dipta, description, is_active, validated_by_user_id, validated_by_name, updated_at)\nVALUES\n${values}\nON CONFLICT (mapping_id) DO UPDATE SET\n  source_app = EXCLUDED.source_app,\n  source_status = EXCLUDED.source_status,\n  target_status_dipta = EXCLUDED.target_status_dipta,\n  description = EXCLUDED.description,\n  is_active = EXCLUDED.is_active,\n  updated_at = EXCLUDED.updated_at;\n`;
    }

    if (data.records && data.records.length > 0) {
      sql += `\n-- ==============================================================\n`;
      sql += `-- 10. SEED DATA: REKAMAN KONSOLIDASI PELAYANAN (${data.records.length} Baris)\n`;
      sql += `-- ==============================================================\n`;
      const values = data.records
        .slice(0, 500)
        .map(
          (r) =>
            `(${esc(r.id_dipta)}, ${esc(r.sumber_aplikasi)}, ${esc(r.jenis_dataset)}, ${esc(r.id_record_sumber)}, ${esc(r.nomor_permohonan)}, ${esc(r.nib)}, ${esc(r.id_proyek)}, ${esc(r.nama_pemohon_usaha)}, ${esc(r.kelompok_layanan)}, ${esc(r.jenis_layanan)}, ${esc(r.tanggal_permohonan)}, ${esc(r.tanggal_penetapan_terbit)}, ${esc(r.nomor_dokumen)}, ${esc(r.status_asli)}, ${esc(r.status_dipta)}, ${esc(r.kecamatan)}, ${esc(r.kelurahan)}, ${esc(r.periode_data)}, ${esc(r.status_validasi)}, ${esc(r.catatan_validasi)}, ${esc(r.tanggal_update_dipta)}, ${esc(r.operator_update)}, ${esc(r.batch_id)}, ${esc(r.investasi_rupiah)}, ${esc(r.tki_count)}, ${esc(r.kbli_code)}, ${esc(r.kbli_title)}, ${esc(r.sektor)}, ${esc(r.risiko_usaha)}, ${esc(r.skala_usaha)}, ${esc(r.jenis_perusahaan)}, ${esc(r.status_penanaman_modal)}, ${esc(r.kategori_dokumen_oss)}, ${esc(r.durasi_hari)}, ${esc(r.jenis_permohonan_simbg)}, ${esc(r.status_slf)}, ${esc(r.fungsi_bangunan)}, ${esc(r.subfungsi_bangunan)}, ${esc(r.luas_m2)}, ${esc(r.jumlah_lantai)}, ${esc(r.jumlah_unit)})`
        )
        .join(',\n');
      sql += `INSERT INTO public.dipta_records (id_dipta, sumber_aplikasi, jenis_dataset, id_record_sumber, nomor_permohonan, nib, id_proyek, nama_pemohon_usaha, kelompok_layanan, jenis_layanan, tanggal_permohonan, tanggal_penetapan_terbit, nomor_dokumen, status_asli, status_dipta, kecamatan, kelurahan, periode_data, status_validasi, catatan_validasi, tanggal_update_dipta, operator_update, batch_id, investasi_rupiah, tki_count, kbli_code, kbli_title, sektor, risiko_usaha, skala_usaha, jenis_perusahaan, status_penanaman_modal, kategori_dokumen_oss, durasi_hari, jenis_permohonan_simbg, status_slf, fungsi_bangunan, subfungsi_bangunan, luas_m2, jumlah_lantai, jumlah_unit)\nVALUES\n${values}\nON CONFLICT (id_dipta) DO UPDATE SET\n  status_dipta = EXCLUDED.status_dipta,\n  status_validasi = EXCLUDED.status_validasi,\n  tanggal_update_dipta = EXCLUDED.tanggal_update_dipta;\n`;
    }

    return sql;
  }
}
