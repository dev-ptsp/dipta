// DIPTA - Dashboard Integrasi Pelayanan Terpadu DPMPTSP Kab. OKI
// Data Types & Interfaces

export type SourceApp = 'OSS-RBA' | 'SICANTIK' | 'SIMBG';

export type DatasetCode =
  | 'OSS_NIB'
  | 'OSS_KEGIATAN'
  | 'OSS_IZIN'
  | 'SICANTIK'
  | 'SIMBG';

export type StatusDIPTA =
  | 'SELESAI_TERBIT'
  | 'DALAM_PROSES'
  | 'DITOLAK'
  | 'BELUM_DIKLASIFIKASIKAN';

export type StatusValidasi =
  | 'VALID'
  | 'PERLU_VERIFIKASI'
  | 'DUPLIKAT'
  | 'ERROR_IMPORT';

export type RoleCode =
  | 'PIMPINAN'
  | 'PROJECT_LEADER'
  | 'DATA_ADMIN'
  | 'OPERATOR_OSS'
  | 'OPERATOR_SICANTIK'
  | 'OPERATOR_SIMBG'
  | 'VIEWER'
  | 'SYSTEM_ADMIN';

export interface User {
  user_id: number;
  username: string;
  password?: string;
  full_name: string;
  nip?: string;
  email?: string;
  unit_kerja: string;
  jabatan: string;
  role_code: RoleCode;
  role_name: string;
  is_active: boolean;
  last_login_at?: string;
}

export interface Permission {
  permission_code: string;
  permission_name: string;
  module_name: string;
}

export interface StatusMappingRule {
  mapping_id: string;
  source_app: SourceApp;
  source_status: string;
  target_status_dipta: StatusDIPTA;
  description?: string;
  is_active: boolean;
  validated_by_user_id?: number;
  validated_by_name?: string;
  updated_at: string;
}

// Core Dipta Consolidated Data Model (PRD Section 7 & 8)
export interface DiptaRecord {
  id_dipta: string; // UUID/ID sistem
  sumber_aplikasi: SourceApp; // Wajib
  jenis_dataset: DatasetCode; // Wajib
  id_record_sumber: string; // Wajib (ID asli: NIB / Id Proyek / Id Permohonan / ID Sicantik / No Registrasi)
  nomor_permohonan?: string; // Kondisional
  nib?: string; // Khusus OSS
  id_proyek?: string; // Khusus OSS Kegiatan & Izin
  nama_pemohon_usaha: string; // Jika tersedia
  kelompok_layanan: string; // Wajib (Perizinan Usaha, Non-Perizinan Daerah, PBG/SLF)
  jenis_layanan: string; // Wajib (nama izin / jenis permohonan)
  tanggal_permohonan?: string; // YYYY-MM-DD
  tanggal_penetapan_terbit?: string; // YYYY-MM-DD
  nomor_dokumen?: string; // No Izin / No SK / No Sertifikat
  status_asli: string; // Status asli dari aplikasi sumber
  status_dipta: StatusDIPTA; // Status standar hasil mapping
  kecamatan?: string; // Kecamatan di Kab. OKI
  kelurahan?: string; // Kelurahan/Desa
  periode_data: string; // YYYY-MM
  status_validasi: StatusValidasi; // VALID, PERLU_VERIFIKASI, DUPLIKAT, ERROR_IMPORT
  catatan_validasi?: string;
  tanggal_update_dipta: string; // ISO datetime
  operator_update: string; // Nama user
  batch_id?: string;

  // Specific extensions per dataset for rich analytics
  // OSS Kegiatan:
  investasi_rupiah?: number;
  tki_count?: number;
  kbli_code?: string;
  kbli_title?: string;
  sektor?: string;
  risiko_usaha?: 'Rendah' | 'Menengah Rendah' | 'Menengah Tinggi' | 'Tinggi';
  skala_usaha?: 'Mikro' | 'Kecil' | 'Menengah' | 'Besar';
  jenis_perusahaan?: 'PT' | 'CV' | 'Perorangan' | 'Koperasi' | 'BUMD';
  status_penanaman_modal?: 'PMDN' | 'PMA';

  // OSS Produk / Izin:
  kategori_dokumen_oss?: 'Persyaratan Dasar' | 'Sertifikat Standar' | 'Izin' | 'UMKU';

  // SICANTIK:
  durasi_hari?: number;

  // SIMBG:
  jenis_permohonan_simbg?: 'PBG' | 'SLF Baru' | 'SLF Existing' | 'SBKBG';
  status_slf?: string;
  fungsi_bangunan?: 'Hunian' | 'Usaha' | 'Campuran' | 'Keagamaan' | 'Sosial & Budaya' | 'Khusus';
  subfungsi_bangunan?: string;
  luas_m2?: number;
  jumlah_lantai?: number;
  jumlah_unit?: number;
}

export interface ImportBatch {
  batch_id: string;
  source_app: SourceApp;
  dataset_code: DatasetCode;
  file_name: string;
  imported_at: string;
  imported_by_user_id: number;
  imported_by_name: string;
  row_total: number;
  row_valid: number;
  row_invalid: number;
  row_duplicate: number;
  import_status: 'BERHASIL' | 'SEBAGIAN' | 'GAGAL';
  notes?: string;
}

export interface DataQualityIssue {
  issue_id: string;
  id_dipta: string;
  sumber_aplikasi: SourceApp;
  dataset_code: DatasetCode;
  id_record_sumber: string;
  jenis_error: 'ANOMALI_TANGGAL' | 'STATUS_BELUM_TERPETAKAN' | 'MISSING_IDENTIFIER' | 'DUPLIKASI' | 'KECAMATAN_TIDAK_VALID';
  deskripsi: string;
  nilai_saat_ini: string;
  status_isu: 'TERBUKA' | 'TERVERIFIKASI' | 'DIKOREKSI' | 'DIABAIKAN';
  catatan_petugas?: string;
  created_at: string;
  resolved_at?: string;
  resolved_by_name?: string;
}

export interface AuditLog {
  log_id: string;
  waktu: string;
  actor: string;
  actor_user_id: number;
  action_type: 'IMPORT' | 'KOREKSI' | 'VALIDASI' | 'MAPPING_UPDATE' | 'STATUS_UPDATE';
  entity_type: 'RECORD' | 'BATCH' | 'MAPPING' | 'USER';
  entity_id: string;
  sumber_aplikasi?: SourceApp;
  field_name?: string;
  nilai_lama?: string;
  nilai_baru?: string;
  alasan?: string;
  ip_address?: string;
}

export interface GlobalFilter {
  periode_start?: string; // YYYY-MM
  periode_end?: string; // YYYY-MM
  sumber_aplikasi: string; // 'SEMUA' | SourceApp
  jenis_layanan: string; // 'SEMUA' | specific service
  status_dipta: string; // 'SEMUA' | StatusDIPTA
  kecamatan: string; // 'SEMUA' | kecamatan name
  search_query?: string;
}
