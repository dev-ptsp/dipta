// DIPTA - Master Reference & Initial Configurations for DPMPTSP Kabupaten Ogan Komering Ilir
import {
  User,
  StatusMappingRule,
  DiptaRecord,
  ImportBatch,
  DataQualityIssue,
  AuditLog
} from '../types';

export const OKI_KECAMATAN_LIST = [
  'Kayu Agung',
  'Pedamaran',
  'Pedamaran Timur',
  'Sirah Pulau Padang',
  'Pampangan',
  'Pangkalan Lampam',
  'Air Sugihan',
  'Tulung Selapan',
  'Cengal',
  'Sungai Menang',
  'Lempuing',
  'Lempuing Jaya',
  'Mesuji',
  'Mesuji Raya',
  'Mesuji Makmur',
  'Tanjung Lubuk',
  'Teluk Gelam',
  'Jejawi'
];

export const INITIAL_USERS: User[] = [
  {
    user_id: 1,
    username: 'pimpinan.dpmptsp',
    password: 'dipta2026',
    full_name: 'Drs. H. M. Husni, M.Si',
    nip: '196805141993031004',
    email: 'kadin.dpmptsp@okikab.go.id',
    unit_kerja: 'DPMPTSP Kabupaten Ogan Komering Ilir',
    jabatan: 'Kepala Dinas PMPTSP Kab. OKI',
    role_code: 'PIMPINAN',
    role_name: 'Pimpinan',
    is_active: true,
    last_login_at: '2026-09-21 08:30:00'
  },
  {
    user_id: 2,
    username: 'eva.kaparina',
    password: 'dipta2026',
    full_name: 'Eva Kaparina, S.Sos',
    nip: '197904122006042018',
    email: 'eva.kaparina@okikab.go.id',
    unit_kerja: 'DPMPTSP Kabupaten Ogan Komering Ilir',
    jabatan: 'Project Leader / Pengelola Monitoring',
    role_code: 'PROJECT_LEADER',
    role_name: 'Project Leader',
    is_active: true,
    last_login_at: '2026-09-21 09:15:00'
  },
  {
    user_id: 3,
    username: 'data.admin',
    password: 'dipta2026',
    full_name: 'Rahmat Hidayat, S.Kom',
    nip: '198811202011011007',
    email: 'rahmat.h@okikab.go.id',
    unit_kerja: 'Bidang Penyelenggaraan Pelayanan Perizinan',
    jabatan: 'Data Administrator / Pengolah Data',
    role_code: 'DATA_ADMIN',
    role_name: 'Data Administrator',
    is_active: true,
    last_login_at: '2026-09-21 09:45:00'
  },
  {
    user_id: 4,
    username: 'operator.oss',
    password: 'dipta2026',
    full_name: 'Siti Rahmawati, A.Md',
    nip: '199402152019032009',
    email: 'siti.rahma@okikab.go.id',
    unit_kerja: 'Seksi Pelayanan Perizinan Usaha',
    jabatan: 'Operator OSS-RBA',
    role_code: 'OPERATOR_OSS',
    role_name: 'Operator OSS-RBA',
    is_active: true,
    last_login_at: '2026-09-21 07:50:00'
  },
  {
    user_id: 5,
    username: 'operator.sicantik',
    password: 'dipta2026',
    full_name: 'Dedi Kurniawan, S.AP',
    nip: '199106182015031003',
    email: 'dedi.k@okikab.go.id',
    unit_kerja: 'Seksi Pelayanan Non-Perizinan',
    jabatan: 'Operator SICANTIK Cloud',
    role_code: 'OPERATOR_SICANTIK',
    role_name: 'Operator SICANTIK',
    is_active: true,
    last_login_at: '2026-09-20 16:20:00'
  },
  {
    user_id: 6,
    username: 'operator.simbg',
    password: 'dipta2026',
    full_name: 'Ahmad Faisal, S.T',
    nip: '199208222019021006',
    email: 'ahmad.faisal@okikab.go.id',
    unit_kerja: 'Seksi Pelayanan Bangunan Gedung',
    jabatan: 'Operator SIMBG',
    role_code: 'OPERATOR_SIMBG',
    role_name: 'Operator SIMBG',
    is_active: true,
    last_login_at: '2026-09-21 08:10:00'
  },
  {
    user_id: 7,
    username: 'penyusun.laporan',
    password: 'dipta2026',
    full_name: 'Maya Sartika, S.E',
    nip: '198703102010012015',
    email: 'maya.s@okikab.go.id',
    unit_kerja: 'Sub Bagian Program dan Pelaporan',
    jabatan: 'Penyusun Laporan Pelayanan',
    role_code: 'VIEWER',
    role_name: 'Viewer / Penyusun Laporan',
    is_active: true,
    last_login_at: '2026-09-20 14:00:00'
  },
  {
    user_id: 8,
    username: 'sysadmin',
    password: 'dipta2026',
    full_name: 'Admin IT DPMPTSP OKI',
    nip: '198509152009021004',
    email: 'it.dpmptsp@okikab.go.id',
    unit_kerja: 'Bidang TI & Pengolahan Data',
    jabatan: 'Administrator Sistem',
    role_code: 'SYSTEM_ADMIN',
    role_name: 'System Administrator',
    is_active: true,
    last_login_at: '2026-09-21 09:00:00'
  }
];

export const INITIAL_STATUS_MAPPINGS: StatusMappingRule[] = [
  // OSS-RBA
  {
    mapping_id: 'MAP-OSS-01',
    source_app: 'OSS-RBA',
    source_status: 'Terbit otomatis',
    target_status_dipta: 'SELESAI_TERBIT',
    description: 'NIB / Sertifikat Standar otomatis terbit oleh sistem OSS',
    is_active: true,
    validated_by_user_id: 2,
    validated_by_name: 'Eva Kaparina, S.Sos',
    updated_at: '2026-09-18 10:00:00'
  },
  {
    mapping_id: 'MAP-OSS-02',
    source_app: 'OSS-RBA',
    source_status: 'Izin terbit / SS terverifikasi',
    target_status_dipta: 'SELESAI_TERBIT',
    description: 'Izin berusaha telah terbit setelah diverifikasi teknis',
    is_active: true,
    validated_by_user_id: 2,
    validated_by_name: 'Eva Kaparina, S.Sos',
    updated_at: '2026-09-18 10:00:00'
  },
  {
    mapping_id: 'MAP-OSS-03',
    source_app: 'OSS-RBA',
    source_status: 'Menunggu Verifikasi',
    target_status_dipta: 'DALAM_PROSES',
    description: 'Menunggu verifikasi persyaratan teknis oleh dinas teknis',
    is_active: true,
    validated_by_user_id: 2,
    validated_by_name: 'Eva Kaparina, S.Sos',
    updated_at: '2026-09-18 10:00:00'
  },
  {
    mapping_id: 'MAP-OSS-04',
    source_app: 'OSS-RBA',
    source_status: 'Ditolak',
    target_status_dipta: 'DITOLAK',
    description: 'Berkas permohonan ditolak karena tidak memenuhi ketentuan',
    is_active: true,
    validated_by_user_id: 2,
    validated_by_name: 'Eva Kaparina, S.Sos',
    updated_at: '2026-09-18 10:00:00'
  },

  // SIMBG
  {
    mapping_id: 'MAP-SIMBG-01',
    source_app: 'SIMBG',
    source_status: 'SK PBG Terbit',
    target_status_dipta: 'SELESAI_TERBIT',
    description: 'Surat Keputusan PBG telah terbit dan ditandatangani',
    is_active: true,
    validated_by_user_id: 2,
    validated_by_name: 'Eva Kaparina, S.Sos',
    updated_at: '2026-09-18 10:00:00'
  },
  {
    mapping_id: 'MAP-SIMBG-02',
    source_app: 'SIMBG',
    source_status: 'Sertifikat PBG & SLF Terbit',
    target_status_dipta: 'SELESAI_TERBIT',
    description: 'Sertifikat PBG dan SLF telah terbit',
    is_active: true,
    validated_by_user_id: 2,
    validated_by_name: 'Eva Kaparina, S.Sos',
    updated_at: '2026-09-18 10:00:00'
  },
  {
    mapping_id: 'MAP-SIMBG-03',
    source_app: 'SIMBG',
    source_status: 'Sertifikat SLF Terbit',
    target_status_dipta: 'SELESAI_TERBIT',
    description: 'Sertifikat Laik Fungsi bangunan gedung telah terbit',
    is_active: true,
    validated_by_user_id: 2,
    validated_by_name: 'Eva Kaparina, S.Sos',
    updated_at: '2026-09-18 10:00:00'
  },
  {
    mapping_id: 'MAP-SIMBG-04',
    source_app: 'SIMBG',
    source_status: 'Permohonan Ditolak',
    target_status_dipta: 'DITOLAK',
    description: 'Permohonan PBG/SLF ditolak Tim Profesi Ahli / Dinas PUPR',
    is_active: true,
    validated_by_user_id: 2,
    validated_by_name: 'Eva Kaparina, S.Sos',
    updated_at: '2026-09-18 10:00:00'
  },
  {
    mapping_id: 'MAP-SIMBG-05',
    source_app: 'SIMBG',
    source_status: 'Perbaikan Dokumen',
    target_status_dipta: 'DALAM_PROSES',
    description: 'Pemohon diminta melengkapi berkas teknis rancangan arsitektur/struktur',
    is_active: true,
    validated_by_user_id: 2,
    validated_by_name: 'Eva Kaparina, S.Sos',
    updated_at: '2026-09-18 10:00:00'
  },
  {
    mapping_id: 'MAP-SIMBG-06',
    source_app: 'SIMBG',
    source_status: 'Pelaksanaan Konsultasi',
    target_status_dipta: 'DALAM_PROSES',
    description: 'Jadwal konsultasi bersama TPA/TPT',
    is_active: true,
    validated_by_user_id: 2,
    validated_by_name: 'Eva Kaparina, S.Sos',
    updated_at: '2026-09-18 10:00:00'
  },
  {
    mapping_id: 'MAP-SIMBG-07',
    source_app: 'SIMBG',
    source_status: 'Menunggu Penugasan Penilik',
    target_status_dipta: 'DALAM_PROSES',
    description: 'Tahap penugasan tim penilik lapangan',
    is_active: true,
    validated_by_user_id: 2,
    validated_by_name: 'Eva Kaparina, S.Sos',
    updated_at: '2026-09-18 10:00:00'
  },

  // SICANTIK Cloud
  {
    mapping_id: 'MAP-SIC-01',
    source_app: 'SICANTIK',
    source_status: 'Selesai Ditetapkan',
    target_status_dipta: 'SELESAI_TERBIT',
    description: 'SK Izin non-berusaha telah diterbitkan Kepala DPMPTSP',
    is_active: true,
    validated_by_user_id: 2,
    validated_by_name: 'Eva Kaparina, S.Sos',
    updated_at: '2026-09-18 10:00:00'
  },
  {
    mapping_id: 'MAP-SIC-02',
    source_app: 'SICANTIK',
    source_status: 'Verifikasi Berkas',
    target_status_dipta: 'DALAM_PROSES',
    description: 'Sedang diverifikasi oleh petugas front office / teknis dinas',
    is_active: true,
    validated_by_user_id: 2,
    validated_by_name: 'Eva Kaparina, S.Sos',
    updated_at: '2026-09-18 10:00:00'
  },
  {
    mapping_id: 'MAP-SIC-03',
    source_app: 'SICANTIK',
    source_status: 'Ditolak',
    target_status_dipta: 'DITOLAK',
    description: 'Permohonan ditolak',
    is_active: true,
    validated_by_user_id: 2,
    validated_by_name: 'Eva Kaparina, S.Sos',
    updated_at: '2026-09-18 10:00:00'
  },
  {
    mapping_id: 'MAP-SIC-04',
    source_app: 'SICANTIK',
    source_status: 'Belum Terkonfirmasi',
    target_status_dipta: 'BELUM_DIKLASIFIKASIKAN',
    description: 'Menunggu validasi mapping oleh operator SICANTIK',
    is_active: true,
    validated_by_user_id: 2,
    validated_by_name: 'Eva Kaparina, S.Sos',
    updated_at: '2026-09-18 10:00:00'
  }
];

// Data Dummy telah dihapus: Inisialisasi awal kosong bersih untuk produksi
export const INITIAL_IMPORT_BATCHES: ImportBatch[] = [];

export const INITIAL_DIPTA_RECORDS: DiptaRecord[] = [];

export const INITIAL_DATA_QUALITY_ISSUES: DataQualityIssue[] = [];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [];

// Sample raw dataset templates matching original export headers from each application (for template download)
export const SAMPLE_RAW_DATASETS: Record<string, any[]> = {
  OSS_NIB: [
    {
      nib: '1909260012345',
      nama_perusahaan: 'PT OKI AGRO PALMA LESTARI',
      status_penanaman_modal: 'PMDN',
      jenis_perusahaan: 'Perseroan Terbatas (PT)',
      skala_usaha: 'Besar',
      kab_kota: 'KAB. OGAN KOMERING ILIR',
      kecamatan: 'Mesuji Raya',
      kelurahan: 'Karya Mukti',
      tanggal_terbit_oss: '2026-09-02',
      status_perizinan: 'Terbit OSS'
    }
  ],
  OSS_KEGIATAN: [
    {
      id_proyek: 'PRJ-OKI-2026-001',
      nib: '1909260012345',
      nama_usaha: 'Perkebunan Kelapa Sawit & CPO',
      kbli: '01262',
      judul_kbli: 'Perkebunan Buah Kelapa Sawit',
      sektor: 'Pertanian & Perkebunan',
      risiko: 'Tinggi',
      investasi: 35000000000,
      tki: 145,
      kecamatan: 'Mesuji Raya',
      tanggal_pengajuan: '2026-09-01',
      status_kegiatan: 'Terverifikasi Teknis'
    }
  ],
  OSS_IZIN: [
    {
      id_perizinan: 'IZN-OSS-2026-088',
      nib: '1909260012345',
      nama_perusahaan: 'PT OKI AGRO PALMA LESTARI',
      jenis_dokumen: 'Sertifikat Standar Pengolahan CPO',
      kategori_dokumen: 'Sertifikat Standar',
      sektor: 'Perindustrian',
      tanggal_pengajuan: '2026-09-03',
      tanggal_terbit: '2026-09-12',
      status: 'Telah Terverifikasi Teknis',
      nomor_dokumen: 'SS-912/DPMPTSP-OKI/2026'
    }
  ],
  SICANTIK: [
    {
      id_permohonan: 'SC-2026-09-001',
      nomor_permohonan: '090/PERM/SICANTIK/IX/2026',
      nama_pemohon: 'dr. H. Hendra Saputra, Sp.B',
      jenis_layanan: 'Surat Izin Praktik Dokter Spesialis (SIP)',
      kecamatan: 'Kayu Agung',
      tanggal_permohonan: '2026-09-03',
      tgl_penetapan: '2026-09-07',
      nomor_izin: '503/014/SIP-DR/DPMPTSP-OKI/2026',
      status: 'Selesai Ditetapkan'
    }
  ],
  SIMBG: [
    {
      nomor_registrasi: 'PBG-160201-15092026-001',
      nama_pemohon: 'H. Anwar Sadat',
      jenis_permohonan: 'Persetujuan Bangunan Gedung (PBG)',
      fungsi_bangunan: 'Usaha',
      subfungsi_bangunan: 'Ruko / Pertokoan 2 Pintu',
      luas_m2: 240,
      jumlah_lantai: 2,
      kecamatan: 'Kayu Agung',
      tanggal_permohonan: '2026-09-02',
      tanggal_terbit: '2026-09-15',
      nomor_dokumen: 'SK-PBG-160201-15092026-001',
      status: 'SK PBG Terbit'
    }
  ]
};
