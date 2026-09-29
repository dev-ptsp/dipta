// DIPTA - Layanan Pembuatan & Ekspor Template Excel untuk 5 Dataset (PRD Section 15, 16)
import * as XLSX from 'xlsx';
import { DatasetCode, SourceApp } from '../types';
import { OKI_KECAMATAN_LIST } from '../data/initialData';

export interface DatasetTemplateMeta {
  code: DatasetCode;
  sourceApp: SourceApp;
  title: string;
  shortName: string;
  fileName: string;
  description: string;
  badgeClass: string;
  columns: {
    key: string;
    label: string;
    mandatory: boolean;
    format: string;
    description: string;
  }[];
  sampleData: Record<string, any>[];
}

export const DATASET_TEMPLATES: Record<DatasetCode, DatasetTemplateMeta> = {
  OSS_NIB: {
    code: 'OSS_NIB',
    sourceApp: 'OSS-RBA',
    title: 'OSS-RBA — Master Data Penerbitan NIB Pelaku Usaha',
    shortName: '1. OSS - NIB',
    fileName: 'Template_Import_OSS_NIB_DPMPTSP_OKI.xlsx',
    description: 'Format data pelaku usaha dan nomor induk berusaha (NIB) terbit dari sistem OSS-RBA Kementerian Investasi/BKPM.',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    columns: [
      { key: 'nib', label: 'NIB (Nomor Induk Berusaha)', mandatory: true, format: 'Teks (13 digit)', description: 'Nomor unik NIB pelaku usaha (contoh: 1909260012345)' },
      { key: 'nama_perusahaan', label: 'Nama Perusahaan / Usaha', mandatory: true, format: 'Teks', description: 'Nama resmi badan usaha atau perorangan' },
      { key: 'nama_pemohon', label: 'Nama Pemohon / Penanggung Jawab', mandatory: false, format: 'Teks', description: 'Nama pemilik / direktur / penanggung jawab' },
      { key: 'status_penanaman_modal', label: 'Status Penanaman Modal', mandatory: false, format: 'PMDN / PMA', description: 'Status modal perusahaan (PMDN atau PMA)' },
      { key: 'jenis_perusahaan', label: 'Jenis Perusahaan', mandatory: false, format: 'Teks', description: 'PT, CV, Perorangan, Koperasi, Firma' },
      { key: 'skala_usaha', label: 'Skala Usaha', mandatory: false, format: 'Teks', description: 'Mikro, Kecil, Menengah, atau Besar' },
      { key: 'kab_kota', label: 'Kabupaten / Kota', mandatory: true, format: 'Teks', description: 'KAB. OGAN KOMERING ILIR' },
      { key: 'kecamatan', label: 'Kecamatan', mandatory: true, format: 'Teks', description: 'Salah satu dari 18 Kecamatan resmi Kab. OKI' },
      { key: 'kelurahan', label: 'Kelurahan / Desa', mandatory: false, format: 'Teks', description: 'Desa atau kelurahan lokasi usaha' },
      { key: 'tanggal_terbit_oss', label: 'Tanggal Terbit OSS', mandatory: true, format: 'YYYY-MM-DD', description: 'Tanggal NIB diterbitkan oleh sistem OSS (contoh: 2026-09-02)' },
      { key: 'status_perizinan', label: 'Status Perizinan Asli', mandatory: true, format: 'Teks', description: 'Terbit otomatis / Terbit OSS / Menunggu Verifikasi' },
    ],
    sampleData: [
      {
        nib: '1909260012345',
        nama_perusahaan: 'PT OKI AGRO PALMA LESTARI',
        nama_pemohon: 'Ir. Budi Santoso, M.M',
        status_penanaman_modal: 'PMDN',
        jenis_perusahaan: 'Perseroan Terbatas (PT)',
        skala_usaha: 'Besar',
        kab_kota: 'KAB. OGAN KOMERING ILIR',
        kecamatan: 'Kayu Agung',
        kelurahan: 'Kutaraya',
        tanggal_terbit_oss: '2026-09-02',
        status_perizinan: 'Terbit OSS'
      },
      {
        nib: '9120008889902',
        nama_perusahaan: 'CV BERKAH KAYU AGUNG MANDIRI',
        nama_pemohon: 'Hj. Zubaidah',
        status_penanaman_modal: 'PMDN',
        jenis_perusahaan: 'CV',
        skala_usaha: 'Kecil',
        kab_kota: 'KAB. OGAN KOMERING ILIR',
        kecamatan: 'Kayu Agung',
        kelurahan: 'Kedaton',
        tanggal_terbit_oss: '2026-09-10',
        status_perizinan: 'Terbit otomatis'
      },
      {
        nib: '1205260034112',
        nama_perusahaan: 'UD TANI JAYA MAKMUR',
        nama_pemohon: 'Wayan Subagio',
        status_penanaman_modal: 'PMDN',
        jenis_perusahaan: 'Perorangan',
        skala_usaha: 'Mikro',
        kab_kota: 'KAB. OGAN KOMERING ILIR',
        kecamatan: 'Lempuing',
        kelurahan: 'Tugu Mulyo',
        tanggal_terbit_oss: '2026-09-14',
        status_perizinan: 'Terbit otomatis'
      },
      {
        nib: '1406260077221',
        nama_perusahaan: 'KOPERASI SIMPAN PINJAM BUMI SEGUGUK',
        nama_pemohon: 'Ahmad Ridwan, S.E',
        status_penanaman_modal: 'PMDN',
        jenis_perusahaan: 'Koperasi',
        skala_usaha: 'Menengah',
        kab_kota: 'KAB. OGAN KOMERING ILIR',
        kecamatan: 'Pedamaran',
        kelurahan: 'Menang Raya',
        tanggal_terbit_oss: '2026-09-18',
        status_perizinan: 'Terbit otomatis'
      }
    ]
  },

  OSS_KEGIATAN: {
    code: 'OSS_KEGIATAN',
    sourceApp: 'OSS-RBA',
    title: 'OSS-RBA — Data Proyek, Kegiatan Usaha & Investasi',
    shortName: '2. OSS - Kegiatan Usaha',
    fileName: 'Template_Import_OSS_Kegiatan_Usaha_DPMPTSP_OKI.xlsx',
    description: 'Format data kegiatan berusaha berbasis KBLI, tingkat risiko usaha, nilai rencana investasi, dan penyerapan tenaga kerja (TKI).',
    badgeClass: 'bg-teal-50 text-teal-800 border-teal-200',
    columns: [
      { key: 'id_proyek', label: 'ID Proyek OSS', mandatory: true, format: 'Teks', description: 'Kode unik kegiatan usaha/proyek (contoh: PRJ-OKI-2026-001)' },
      { key: 'nib', label: 'NIB Induk', mandatory: true, format: 'Teks (13 digit)', description: 'Nomor NIB pemilik kegiatan usaha' },
      { key: 'nama_usaha', label: 'Nama Usaha / Kegiatan', mandatory: true, format: 'Teks', description: 'Nama operasional kegiatan usaha' },
      { key: 'kbli', label: 'Kode KBLI 5 Digit', mandatory: true, format: 'Angka/Teks (5 digit)', description: 'Kode Klasifikasi Baku Lapangan Usaha Indonesia (contoh: 01262)' },
      { key: 'judul_kbli', label: 'Judul KBLI', mandatory: true, format: 'Teks', description: 'Deskripsi nama sektor KBLI' },
      { key: 'sektor', label: 'Sektor Usaha', mandatory: false, format: 'Teks', description: 'Pertanian & Perkebunan, Perdagangan, Perindustrian, dll' },
      { key: 'risiko', label: 'Tingkat Risiko', mandatory: true, format: 'Teks', description: 'Rendah, Menengah Rendah, Menengah Tinggi, Tinggi' },
      { key: 'investasi', label: 'Nilai Investasi (Rupiah)', mandatory: false, format: 'Angka Murni', description: 'Total nilai investasi dalam angka bulat Rupiah' },
      { key: 'tki', label: 'Jumlah Tenaga Kerja (TKI)', mandatory: false, format: 'Angka', description: 'Perkiraan jumlah tenaga kerja lokal Indonesia' },
      { key: 'kecamatan', label: 'Kecamatan Lokasi Usaha', mandatory: true, format: 'Teks', description: 'Salah satu dari 18 Kecamatan Kab. OKI' },
      { key: 'kelurahan', label: 'Kelurahan / Desa', mandatory: false, format: 'Teks', description: 'Desa lokasi usaha' },
      { key: 'tanggal_pengajuan', label: 'Tanggal Pengajuan', mandatory: true, format: 'YYYY-MM-DD', description: 'Tanggal pengajuan permohonan proyek' },
      { key: 'status_kegiatan', label: 'Status Kegiatan Asli', mandatory: true, format: 'Teks', description: 'Terverifikasi Teknis / Terbit otomatis / Menunggu Verifikasi' },
    ],
    sampleData: [
      {
        id_proyek: 'PRJ-OKI-2026-001',
        nib: '1909260012345',
        nama_usaha: 'Perkebunan Buah Kelapa Sawit & Pengolahan CPO',
        kbli: '01262',
        judul_kbli: 'Perkebunan Buah Kelapa Sawit',
        sektor: 'Pertanian & Perkebunan',
        risiko: 'Tinggi',
        investasi: 35000000000,
        tki: 145,
        kecamatan: 'Mesuji Raya',
        kelurahan: 'Karya Mukti',
        tanggal_pengajuan: '2026-09-01',
        status_kegiatan: 'Terverifikasi Teknis'
      },
      {
        id_proyek: 'PRJ-OKI-2026-002',
        nib: '9120008889902',
        nama_usaha: 'Distribusi Sembako & Pergudangan Pangan',
        kbli: '46312',
        judul_kbli: 'Perdagangan Besar Beras',
        sektor: 'Perdagangan',
        risiko: 'Menengah Rendah',
        investasi: 1200000000,
        tki: 18,
        kecamatan: 'Kayu Agung',
        kelurahan: 'Kutaraya',
        tanggal_pengajuan: '2026-09-05',
        status_kegiatan: 'Terbit otomatis'
      },
      {
        id_proyek: 'PRJ-OKI-2026-003',
        nib: '1205260034112',
        nama_usaha: 'Budidaya Ikan Air Tawar & Kolam Terpal',
        kbli: '03221',
        judul_kbli: 'Budidaya Ikan Air Tawar di Kolam Air Tenang',
        sektor: 'Kelautan & Perikanan',
        risiko: 'Rendah',
        investasi: 85000000,
        tki: 4,
        kecamatan: 'Pedamaran',
        kelurahan: 'Menang Raya',
        tanggal_pengajuan: '2026-09-12',
        status_kegiatan: 'Terbit otomatis'
      }
    ]
  },

  OSS_IZIN: {
    code: 'OSS_IZIN',
    sourceApp: 'OSS-RBA',
    title: 'OSS-RBA — Produk & Dokumen Perizinan (Izin / Sertifikat Standar)',
    shortName: '3. OSS - Produk Perizinan',
    fileName: 'Template_Import_OSS_Izin_Dokumen_DPMPTSP_OKI.xlsx',
    description: 'Format data dokumen perizinan berusaha seperti Sertifikat Standar (SS) dan Izin Usaha terverifikasi teknis.',
    badgeClass: 'bg-cyan-50 text-cyan-800 border-cyan-200',
    columns: [
      { key: 'id_perizinan', label: 'ID Perizinan OSS', mandatory: true, format: 'Teks', description: 'Kode unik dokumen izin OSS (contoh: IZN-OSS-2026-088)' },
      { key: 'nib', label: 'NIB Pelaku Usaha', mandatory: true, format: 'Teks (13 digit)', description: 'NIB pemilik dokumen izin' },
      { key: 'nama_perusahaan', label: 'Nama Perusahaan', mandatory: true, format: 'Teks', description: 'Nama badan usaha pemegang izin' },
      { key: 'jenis_dokumen', label: 'Nama Produk / Jenis Dokumen', mandatory: true, format: 'Teks', description: 'Nama izin atau sertifikat standar' },
      { key: 'kategori_dokumen', label: 'Kategori Dokumen', mandatory: false, format: 'Teks', description: 'Sertifikat Standar / Izin / PB UMKU' },
      { key: 'sektor', label: 'Sektor Pembina', mandatory: false, format: 'Teks', description: 'Perindustrian, Kesehatan, Perhubungan, dll' },
      { key: 'kecamatan', label: 'Kecamatan Lokasi', mandatory: true, format: 'Teks', description: 'Salah satu dari 18 Kecamatan Kab. OKI' },
      { key: 'tanggal_pengajuan', label: 'Tanggal Pengajuan', mandatory: true, format: 'YYYY-MM-DD', description: 'Tanggal pengajuan izin' },
      { key: 'tanggal_terbit', label: 'Tanggal Terbit Izin', mandatory: false, format: 'YYYY-MM-DD', description: 'Tanggal SK/Sertifikat diterbitkan' },
      { key: 'nomor_dokumen', label: 'Nomor Dokumen / SK Izin', mandatory: false, format: 'Teks', description: 'Nomor resmi dokumen (contoh: SS-912/DPMPTSP-OKI/2026)' },
      { key: 'status', label: 'Status Dokumen Asli', mandatory: true, format: 'Teks', description: 'Izin terbit / SS terverifikasi, Menunggu Verifikasi, Ditolak' },
    ],
    sampleData: [
      {
        id_perizinan: 'IZN-OSS-2026-088',
        nib: '1909260012345',
        nama_perusahaan: 'PT OKI AGRO PALMA LESTARI',
        jenis_dokumen: 'Sertifikat Standar Pengolahan Kelapa Sawit',
        kategori_dokumen: 'Sertifikat Standar',
        sektor: 'Perindustrian',
        kecamatan: 'Mesuji Raya',
        tanggal_pengajuan: '2026-09-03',
        tanggal_terbit: '2026-09-12',
        nomor_dokumen: 'SS-912/DPMPTSP-OKI/2026',
        status: 'Izin terbit / SS terverifikasi'
      },
      {
        id_perizinan: 'IZN-OSS-2026-089',
        nib: '9120008889902',
        nama_perusahaan: 'CV BERKAH KAYU AGUNG MANDIRI',
        jenis_dokumen: 'Izin Operasional Angkutan Barang Khusus',
        kategori_dokumen: 'Izin',
        sektor: 'Perhubungan',
        kecamatan: 'Kayu Agung',
        tanggal_pengajuan: '2026-09-06',
        tanggal_terbit: '2026-09-18',
        nomor_dokumen: '503/089/IZN-TRANS/OKI/2026',
        status: 'Izin terbit / SS terverifikasi'
      },
      {
        id_perizinan: 'IZN-OSS-2026-090',
        nib: '1406260077221',
        nama_perusahaan: 'KLINIK MEDIKA SEHAT SEJAHTERA',
        jenis_dokumen: 'Sertifikat Standar Klinik Pratama',
        kategori_dokumen: 'Sertifikat Standar',
        sektor: 'Kesehatan',
        kecamatan: 'Lempuing Jaya',
        tanggal_pengajuan: '2026-09-15',
        tanggal_terbit: '',
        nomor_dokumen: '',
        status: 'Menunggu Verifikasi'
      }
    ]
  },

  SICANTIK: {
    code: 'SICANTIK',
    sourceApp: 'SICANTIK',
    title: 'SICANTIK Cloud — Pelayanan Perizinan Non-Berusaha Daerah',
    shortName: '4. SICANTIK Cloud',
    fileName: 'Template_Import_SICANTIK_Pelayanan_DPMPTSP_OKI.xlsx',
    description: 'Format data perizinan non-berusaha kewenangan daerah, seperti Surat Izin Praktik (SIP) dokter, bidan, perawat, apotek, dan izin operasional.',
    badgeClass: 'bg-sky-50 text-sky-800 border-sky-200',
    columns: [
      { key: 'id_permohonan', label: 'ID Permohonan SICANTIK', mandatory: true, format: 'Teks', description: 'Kode registrasi unik sistem SICANTIK (contoh: SC-2026-09-001)' },
      { key: 'nomor_permohonan', label: 'Nomor Register Berkas', mandatory: true, format: 'Teks', description: 'Nomor berkas masuk (contoh: 090/PERM/SICANTIK/IX/2026)' },
      { key: 'nama_pemohon', label: 'Nama Pemohon / Tenaga Kesehatan', mandatory: true, format: 'Teks', description: 'Nama lengkap tenaga medis / pemohon izin' },
      { key: 'jenis_layanan', label: 'Jenis Layanan / Izin', mandatory: true, format: 'Teks', description: 'Surat Izin Praktik Dokter, Apoteker, Bidan, dll' },
      { key: 'kecamatan', label: 'Kecamatan Praktik / Lokasi', mandatory: true, format: 'Teks', description: 'Salah satu dari 18 Kecamatan Kab. OKI' },
      { key: 'kelurahan', label: 'Kelurahan / Desa', mandatory: false, format: 'Teks', description: 'Kelurahan atau desa lokasi praktik' },
      { key: 'tanggal_permohonan', label: 'Tanggal Permohonan Masuk', mandatory: true, format: 'YYYY-MM-DD', description: 'Tanggal pemohon mendaftar' },
      { key: 'tgl_penetapan', label: 'Tanggal Penetapan SK', mandatory: false, format: 'YYYY-MM-DD', description: 'Tanggal SK ditandatangani Kepala Dinas' },
      { key: 'nomor_izin', label: 'Nomor SK Izin Terbit', mandatory: false, format: 'Teks', description: 'Nomor izin resmi (contoh: 503/014/SIP-DR/DPMPTSP-OKI/2026)' },
      { key: 'status', label: 'Status Pelayanan Asli', mandatory: true, format: 'Teks', description: 'Selesai Ditetapkan / Verifikasi Berkas / Ditolak' },
    ],
    sampleData: [
      {
        id_permohonan: 'SC-2026-09-001',
        nomor_permohonan: '090/PERM/SICANTIK/IX/2026',
        nama_pemohon: 'dr. H. Hendra Saputra, Sp.B',
        jenis_layanan: 'Surat Izin Praktik Dokter Spesialis (SIP)',
        kecamatan: 'Kayu Agung',
        kelurahan: 'Cintaraja',
        tanggal_permohonan: '2026-09-03',
        tgl_penetapan: '2026-09-07',
        nomor_izin: '503/014/SIP-DR/DPMPTSP-OKI/2026',
        status: 'Selesai Ditetapkan'
      },
      {
        id_permohonan: 'SC-2026-09-002',
        nomor_permohonan: '091/PERM/SICANTIK/IX/2026',
        nama_pemohon: 'Apt. Rina Marlina, S.Farm',
        jenis_layanan: 'Surat Izin Praktik Apoteker (SIPA)',
        kecamatan: 'Lempuing',
        kelurahan: 'Tugu Mulyo',
        tanggal_permohonan: '2026-09-08',
        tgl_penetapan: '2026-09-11',
        nomor_izin: '503/028/SIPA/DPMPTSP-OKI/2026',
        status: 'Selesai Ditetapkan'
      },
      {
        id_permohonan: 'SC-2026-09-003',
        nomor_permohonan: '092/PERM/SICANTIK/IX/2026',
        nama_pemohon: 'Bidan Nani Suryani, A.Md.Keb',
        jenis_layanan: 'Surat Izin Praktik Bidan (SIPB)',
        kecamatan: 'Tulung Selapan',
        kelurahan: 'Ujung Tanjung',
        tanggal_permohonan: '2026-09-16',
        tgl_penetapan: '',
        nomor_izin: '',
        status: 'Verifikasi Berkas'
      },
      {
        id_permohonan: 'SC-2026-09-004',
        nomor_permohonan: '093/PERM/SICANTIK/IX/2026',
        nama_pemohon: 'Ns. Joko Prasetyo, S.Kep',
        jenis_layanan: 'Surat Izin Praktik Perawat (SIPP)',
        kecamatan: 'Mesuji',
        kelurahan: 'Pematang Jaya',
        tanggal_permohonan: '2026-09-18',
        tgl_penetapan: '2026-09-22',
        nomor_izin: '503/041/SIPP/DPMPTSP-OKI/2026',
        status: 'Selesai Ditetapkan'
      }
    ]
  },

  SIMBG: {
    code: 'SIMBG',
    sourceApp: 'SIMBG',
    title: 'SIMBG — Persetujuan Bangunan Gedung (PBG) & Sertifikat Laik Fungsi (SLF)',
    shortName: '5. SIMBG - Bangunan Gedung',
    fileName: 'Template_Import_SIMBG_PBG_SLF_DPMPTSP_OKI.xlsx',
    description: 'Format data pelayanan bangunan gedung Kementerian PUPR: Persetujuan Bangunan Gedung (PBG) dan Sertifikat Laik Fungsi (SLF).',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    columns: [
      { key: 'nomor_registrasi', label: 'Nomor Registrasi SIMBG', mandatory: true, format: 'Teks', description: 'Nomor pendaftaran gedung (contoh: PBG-160201-15092026-001)' },
      { key: 'nama_pemohon', label: 'Nama Pemohon / Pemilik Bangunan', mandatory: true, format: 'Teks', description: 'Nama pemohon izin PBG/SLF' },
      { key: 'jenis_permohonan', label: 'Jenis Permohonan', mandatory: true, format: 'Teks', description: 'Persetujuan Bangunan Gedung (PBG) atau Sertifikat Laik Fungsi (SLF)' },
      { key: 'fungsi_bangunan', label: 'Fungsi Bangunan', mandatory: false, format: 'Teks', description: 'Usaha / Hunian / Sosial Budaya / Khusus' },
      { key: 'subfungsi_bangunan', label: 'Sub-Fungsi Bangunan', mandatory: false, format: 'Teks', description: 'Ruko, Rumah Tinggal, Gudang, Kantor, dll' },
      { key: 'luas_m2', label: 'Luas Bangunan (m²)', mandatory: false, format: 'Angka', description: 'Total luas lantai bangunan dalam meter persegi' },
      { key: 'jumlah_lantai', label: 'Jumlah Lantai', mandatory: false, format: 'Angka', description: 'Jumlah lantai gedung (contoh: 1 atau 2)' },
      { key: 'kecamatan', label: 'Kecamatan Lokasi Bangunan', mandatory: true, format: 'Teks', description: 'Salah satu dari 18 Kecamatan Kab. OKI' },
      { key: 'tanggal_permohonan', label: 'Tanggal Permohonan', mandatory: true, format: 'YYYY-MM-DD', description: 'Tanggal pengajuan berkas di SIMBG' },
      { key: 'tanggal_terbit', label: 'Tanggal Terbit SK PBG', mandatory: false, format: 'YYYY-MM-DD', description: 'Tanggal penerbitan SK PBG/SLF' },
      { key: 'nomor_dokumen', label: 'Nomor Dokumen SK PBG / SLF', mandatory: false, format: 'Teks', description: 'Nomor SK (contoh: SK-PBG-160201-15092026-001)' },
      { key: 'status', label: 'Status Pelayanan Asli', mandatory: true, format: 'Teks', description: 'SK PBG Terbit / Sertifikat PBG & SLF Terbit / Pelaksanaan Konsultasi / Permohonan Ditolak' },
    ],
    sampleData: [
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
      },
      {
        nomor_registrasi: 'PBG-160202-18092026-002',
        nama_pemohon: 'Ir. Bambang Wijaya',
        jenis_permohonan: 'Persetujuan Bangunan Gedung (PBG)',
        fungsi_bangunan: 'Hunian',
        subfungsi_bangunan: 'Rumah Tinggal Tunggal',
        luas_m2: 180,
        jumlah_lantai: 1,
        kecamatan: 'Teluk Gelam',
        tanggal_permohonan: '2026-09-08',
        tanggal_terbit: '2026-09-20',
        nomor_dokumen: 'SK-PBG-160202-18092026-002',
        status: 'SK PBG Terbit'
      },
      {
        nomor_registrasi: 'PBG-160203-22092026-003',
        nama_pemohon: 'CV SENTOSA ABADI OKI',
        jenis_permohonan: 'Sertifikat Laik Fungsi (SLF)',
        fungsi_bangunan: 'Usaha',
        subfungsi_bangunan: 'Gudang Penyimpanan Sawit & Karet',
        luas_m2: 650,
        jumlah_lantai: 1,
        kecamatan: 'Mesuji Makmur',
        tanggal_permohonan: '2026-09-14',
        tanggal_terbit: '',
        nomor_dokumen: '',
        status: 'Pelaksanaan Konsultasi'
      }
    ]
  }
};

/**
 * Service to build and trigger instant download of XLSX template files
 */
export class DiptaTemplateExcelService {
  /**
   * Create Reference Guidance worksheet
   */
  private static createGuidanceSheet(meta?: DatasetTemplateMeta): XLSX.WorkSheet {
    const rows = [
      ['PANDUAN PENGISIAN & REFERENSI IMPORT DATASET DIPTA DPMPTSP KABUPATEN OGAN KOMERING ILIR'],
      ['Sistem Harmonisasi & Monitoring Pelayanan Terpadu (PRD Section 15, 16)'],
      [''],
      ['1. DAFTAR 18 KECAMATAN RESMI KABUPATEN OGAN KOMERING ILIR (WAJIB SESUAI):'],
      ...OKI_KECAMATAN_LIST.map((kec, idx) => [`   ${idx + 1}. ${kec}`]),
      [''],
      ['2. KETENTUAN FORMAT KOLOM & PENGISIAN:'],
      ['   - Format Tanggal: Gunakan format standar YYYY-MM-DD (contoh: 2026-09-02) atau DD/MM/YYYY.'],
      ['   - Nilai Investasi & Luas: Gunakan angka murni tanpa titik koma atau simbol mata uang (contoh: 35000000000).'],
      ['   - Kolom ID (NIB, ID Proyek, Nomor Registrasi, ID Permohonan): Wajib diisi sebagai pengenal unik data.'],
      ['   - Status Layanan: Sesuaikan dengan status asli aplikasi sumber agar otomatis terpetakan ke status harmonisasi DIPTA.'],
      [''],
      ['3. KORESPONDENSI HARMONISASI STATUS DIPTA:'],
      ['   - Selesai / Terbit: "Terbit otomatis", "Terbit OSS", "Izin terbit / SS terverifikasi", "Selesai Ditetapkan", "SK PBG Terbit", "Sertifikat SLF Terbit"'],
      ['   - Dalam Proses: "Menunggu Verifikasi", "Verifikasi Berkas", "Pelaksanaan Konsultasi", "Perbaikan Dokumen", "Menunggu Penugasan Penilik"'],
      ['   - Ditolak: "Ditolak", "Permohonan Ditolak"'],
      [''],
      ['Diproduksi oleh: DPMPTSP Kabupaten Ogan Komering Ilir | Proyek Perubahan DIPTA 2026']
    ];

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 85 }];
    return ws;
  }

  /**
   * Download a single dataset template as an Excel file
   */
  static downloadSingleTemplate(code: DatasetCode): void {
    const meta = DATASET_TEMPLATES[code];
    if (!meta) return;

    const wb = XLSX.utils.book_new();

    // 1. Data Sheet with sample rows
    const wsData = XLSX.utils.json_to_sheet(meta.sampleData);
    
    // Set auto width for data columns
    const colKeys = Object.keys(meta.sampleData[0] || {});
    wsData['!cols'] = colKeys.map(k => {
      const colMeta = meta.columns.find(c => c.key === k);
      const headerLen = (colMeta?.label || k).length;
      return { wch: Math.max(headerLen + 4, 18) };
    });

    const sheetName = code.length > 25 ? code.substring(0, 25) : code;
    XLSX.utils.book_append_sheet(wb, wsData, `DATA_${sheetName}`);

    // 2. Guidance & Reference Sheet
    const wsGuide = this.createGuidanceSheet(meta);
    XLSX.utils.book_append_sheet(wb, wsGuide, 'PANDUAN_KECAMATAN');

    // Trigger download
    XLSX.writeFile(wb, meta.fileName);
  }

  /**
   * Download all 5 dataset templates in a single master multi-sheet Excel workbook
   */
  static downloadAllTemplatesBundle(): void {
    const wb = XLSX.utils.book_new();

    const order: DatasetCode[] = ['OSS_NIB', 'OSS_KEGIATAN', 'OSS_IZIN', 'SICANTIK', 'SIMBG'];
    const sheetLabels: Record<DatasetCode, string> = {
      OSS_NIB: '1_OSS_NIB',
      OSS_KEGIATAN: '2_OSS_KEGIATAN',
      OSS_IZIN: '3_OSS_IZIN',
      SICANTIK: '4_SICANTIK_CLOUD',
      SIMBG: '5_SIMBG_BANGUNAN'
    };

    order.forEach(code => {
      const meta = DATASET_TEMPLATES[code];
      const ws = XLSX.utils.json_to_sheet(meta.sampleData);
      
      const colKeys = Object.keys(meta.sampleData[0] || {});
      ws['!cols'] = colKeys.map(k => {
        const colMeta = meta.columns.find(c => c.key === k);
        const headerLen = (colMeta?.label || k).length;
        return { wch: Math.max(headerLen + 4, 18) };
      });

      XLSX.utils.book_append_sheet(wb, ws, sheetLabels[code]);
    });

    // Reference Sheet
    const wsGuide = this.createGuidanceSheet();
    XLSX.utils.book_append_sheet(wb, wsGuide, 'PANDUAN_18_KECAMATAN');

    XLSX.writeFile(wb, 'Template_Import_DIPTA_5_Dataset_Lengkap_Kab_OKI.xlsx');
  }
}
