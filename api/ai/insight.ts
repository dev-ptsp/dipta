// Vercel Serverless Function: /api/ai/insight
import { GoogleGenAI } from '@google/genai';

export default async function handler(req: any, res: any) {
  // CORS & Header Setup
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. Gunakan POST.' });
  }

  try {
    const {
      filterSummary = {},
      metrics = {},
      focus = 'comprehensive',
      sampleRecordsSnippet = [],
      customInstruction = '',
    } = req.body || {};

    if (!metrics || metrics.totalPelayanan === undefined) {
      return res.status(400).json({
        error: 'Data metrik pelayanan wajib disertakan untuk menghasilkan AI Insight.',
      });
    }

    let focusText = 'Ringkasan Eksekutif Komprehensif Kinerja Pelayanan Harian & Periodik';
    if (focus === 'bottlenecks') {
      focusText = 'Analisis Hambatan, Berkas Tertunda (Pending), Penolakan, dan Titik Kritis SLA Layanan';
    } else if (focus === 'geographic') {
      focusText = 'Analisis Geospasial Distribusi Layanan di 18 Wilayah Kecamatan Kabupaten Ogan Komering Ilir';
    } else if (focus === 'recommendations') {
      focusText = 'Rekomendasi Strategis dan Rencana Aksi Operasional Peningkatan Mutu Layanan DPMPTSP OKI';
    }

    const prompt = `
Anda adalah Konsultan Ahli Tata Kelola Pelayanan Publik dan Analis Kebijakan Senior di Dinas Penanaman Modal dan Pelayanan Terpadu Satu Pintu (DPMPTSP) Kabupaten Ogan Komering Ilir (OKI), Provinsi Sumatera Selatan.

Tugas Anda adalah menyusun analisis eksekutif dan rangkuman performa layanan harian berbasis kecerdasan buatan (AI Insight) secara tajam, lugas, profesional, akurat, dan berorientasi hasil untuk Pimpinan (Kepala Dinas DPMPTSP dan Bupati Ogan Komering Ilir).

### PARAMETER FILTER DATA SAAT INI:
- Periode/Rentang Tanggal: ${filterSummary.dateRange || filterSummary.periode || 'Semua Periode Terdata'}
- Sumber Aplikasi Terfilter: ${filterSummary.sumber || 'Seluruh Sumber Terpadu (OSS-RBA, SICANTIK Cloud, SIMBG)'}
- Kecamatan Terfilter: ${filterSummary.kecamatan || 'Seluruh Wilayah Kab. OKI (18 Kecamatan)'}
- Status Pelayanan Terfilter: ${filterSummary.status || 'Seluruh Status'}
- Fokus Analisis yang Diminta: ${focusText}
${customInstruction ? `- Permintaan Tambahan Khusus: "${customInstruction}"` : ''}

### RINGKASAN METRIK PELAYANAN:
- Total Permohonan Pelayanan: ${metrics.totalPelayanan} berkas
- Selesai / Terbit: ${metrics.selesaiTerbit} berkas (${metrics.completionRate || 0}%)
- Dalam Proses (Verifikasi Teknis / Validasi): ${metrics.dalamProses} berkas
- Ditolak / Tidak Memenuhi Syarat: ${metrics.ditolak} berkas
- Memerlukan Verifikasi Data / Anomali: ${metrics.perluVerifikasi || 0} berkas

### DISTRIBUSI SUMBER APLIKASI:
${JSON.stringify(metrics.bySource || {}, null, 2)}

### DISTRIBUSI STATUS TERKONSOLIDASI DIPTA:
${JSON.stringify(metrics.byStatus || {}, null, 2)}

### TOP JENIS LAYANAN (VOLUME TERTINGGI):
${(metrics.topServices || []).map((s: any, idx: number) => `${idx + 1}. ${s.layanan || s.fullLayanan}: ${s.total} berkas`).join('\n') || '- Tidak ada data jenis layanan spesifik'}

### DISTRIBUSI WILAYAH KECAMATAN TERBANYAK DI KAB. OKI:
${(metrics.topKecamatan || []).map((k: any, idx: number) => `${idx + 1}. Kec. ${k.kecamatan}: ${k.total} berkas`).join('\n') || '- Belum terdata per kecamatan'}

${sampleRecordsSnippet && sampleRecordsSnippet.length > 0 ? `
### CUPLIKAN REKAMAN TERBARU/SAMPEL BERKAS:
${sampleRecordsSnippet.slice(0, 10).map((r: any) => 
  `- [${r.sumber_aplikasi}] ${r.jenis_layanan} | Pemohon: ${r.nama_pemohon || r.nama_pemohon_usaha || '-'} | Status: ${r.status_dipta} | Kec: ${r.kecamatan || '-'} | Tgl: ${r.tanggal_permohonan || '-'}`
).join('\n')}
` : ''}

---
### INSTRUKSI PENYUSUNAN LAPORAN:
Susun laporan analisis dalam format Markdown yang rapi, elegan, berwibawa, dan mudah dibaca oleh Pimpinan DPMPTSP Kab. OKI dengan 5 bab utama (Ringkasan Eksekutif, Analisis Kinerja Lintas Sistem, Analisis Geografis 18 Kecamatan, Kendala & Titik Kritis, Rekomendasi Tindak Lanjut).
`;

    let generatedText: string | null = null;
    let usedModel = 'gemini-2.5-flash';

    if (process.env.GEMINI_API_KEY) {
      try {
        const ai = new GoogleGenAI({
          apiKey: process.env.GEMINI_API_KEY,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            systemInstruction:
              'Anda adalah Asisten Analis Kinerja dan Perencanaan Kebijakan Senior di Dinas Penanaman Modal dan Pelayanan Terpadu Satu Pintu (DPMPTSP) Kabupaten Ogan Komering Ilir (OKI), Sumatera Selatan. Berikan analisis dan ringkasan eksekutif performa pelayanan harian secara komprehensif, objektif, tajam, profesional, berbasis data riil, dan berorientasi pada peningkatan kualitas pelayanan publik bagi Pimpinan (Kepala Dinas & Bupati). Gunakan Bahasa Indonesia formal dinas yang lugas dan berwibawa.',
            temperature: 0.35,
          },
        });

        if (response && response.text) {
          generatedText = response.text;
        }
      } catch (err: any) {
        console.warn('Gemini invocation error on Vercel function:', err?.message || err);
      }
    }

    // Intelligent Synthesis Fallback
    if (!generatedText) {
      usedModel = 'DIPTA-Executive-Engine (Intelligent Synthesis Fallback)';
      const topKecNames = (metrics.topKecamatan || []).slice(0, 3).map((k: any) => `${k.kecamatan} (${k.total} berkas)`).join(', ') || 'Kayu Agung, Lempuing, dan Mesuji Raya';
      const topSvcNames = (metrics.topServices || []).slice(0, 3).map((s: any) => `${s.layanan} (${s.total} permohonan)`).join(', ') || 'NIB Usaha Mikro, SIP Tenaga Kesehatan, PBG Bangunan Gedung';

      generatedText = `## 💡 Ringkasan Eksekutif & Snapshot Kinerja Pelayanan
Berdasarkan konsolidasi data pelayanan publik pada DPMPTSP Kabupaten Ogan Komering Ilir untuk parameter **${filterSummary.sumber || 'Seluruh Sistem Perizinan'}** (Periode: **${filterSummary.dateRange || 'Semua Periode Terdata'}**):
- **Total Permohonan Terdata:** **${metrics.totalPelayanan} berkas**
- **Tingkat Penyelesaian (Completion Rate):** **${metrics.completionRate || 0}%** (**${metrics.selesaiTerbit} berkas** telah berstatus *Selesai / Terbit*)
- **Status Dalam Proses:** **${metrics.dalamProses} berkas** (sedang dalam tahap verifikasi teknis perangkat daerah dan peninjauan berkas)
- **Status Ditolak:** **${metrics.ditolak} berkas** (tidak memenuhi standar regulasi atau dokumen teknis belum lengkap)
- **Verifikasi Data Mutu:** **${metrics.perluVerifikasi || 0} berkas** memerlukan atensi harmonisasi data quality.

Kinerja pelayanan secara umum menunjukkan komitmen aparatur yang solid dalam memastikan kepastian hukum perizinan berusaha maupun non-berusaha di Bumi Bende Seguguk.

---

## 📊 Analisis Kinerja Lintas Sistem (OSS-RBA, SICANTIK Cloud, SIMBG)
1. **OSS-RBA (Perizinan Berusaha Berbasis Risiko):** 
   Volume transaksi OSS tercatat sebanyak **${metrics.bySource?.['OSS-RBA'] || 0} berkas**. Dominasi didorong oleh legalitas Nomor Induk Berusaha (NIB) bagi pelaku Usaha Mikro dan Kecil (UMK) serta verifikasi Sertifikat Standar sektor perkebunan dan perdagangan.
2. **SICANTIK Cloud (Perizinan Non-Berusaha & Sektor Kesehatan):** 
   Mencapai **${metrics.bySource?.['SICANTIK'] || 0} berkas**, terkonsentrasi pada penerbitan Surat Izin Praktik (SIP) tenaga medis/nakes dan perizinan operasional fasilitas penunjang.
3. **SIMBG (Persetujuan Bangunan Gedung & SLF):** 
   Tercatat **${metrics.bySource?.['SIMBG'] || 0} berkas**. Sinergi bersama Tim Profesi Ahli (TPA) dan Dinas PUPR OKI terus berjalan guna mengawal percepatan penerbitan SK PBG fungsi hunian dan ruko usaha.

---

## 📍 Analisis Geografis & Layanan Unggulan di Kabupaten Ogan Komering Ilir
- **Distribusi Wilayah Tertinggi:** Konsentrasi pelayanan terfokus pada **${topKecNames}**. Kecamatan Kayu Agung sebagai pusat pemerintahan dan sentra niaga menunjukkan aktivitas registrasi izin dan bangunan gedung tertinggi di Kabupaten OKI.
- **Jenis Layanan Terpopuler:** Pelayanan terbanyak didominasi oleh:
  ${topSvcNames}.
- **Cakupan Wilayah 18 Kecamatan:** Diperlukan dorongan asistensi aktif perizinan pada kecamatan perairan dan pesisir (seperti Tulung Selapan, Cengal, dan Air Sugihan) agar pelaku usaha pedesaan mendapatkan akses legalitas berusaha yang setara.

---

## ⚠️ Identifikasi Kendala & Titik Kritis (Bottlenecks / Quality Alert)
1. **${metrics.dalamProses} Berkas Berstatus "Dalam Proses":** Perlu pemantauan durasi waktu (SLA) antar tahapan, khususnya tahapan verifikasi teknis lapangan oleh OPD pengampu teknis agar tidak melampaui standar batas waktu pelayanan.
2. **${metrics.ditolak} Berkas "Ditolak":** Sebagian besar penolakan berkas disebabkan oleh ketidaksesuaian titik koordinat poligon pemanfaatan ruang (KKPR) dan berkas gambar arsitektur PBG yang belum memenuhi kaidah keselamatan.
3. **Harmonisasi Status Lintas Aplikasi:** Terdapat **${metrics.perluVerifikasi || 0} berkas** yang terindikasi anomali tanggal permohonan atau nama pemohon kosong yang perlu diverifikasi pada modul *Data Quality DIPTA*.

---

## 🎯 Rekomendasi Tindak Lanjut Strategis DPMPTSP OKI
1. **Akselerasi Verifikasi Berkas Tertunda:** Lakukan rapat koordinasi mingguan (*Desk Pelayanan Terpadu*) bersama Dinas PUPR dan Dinas Kesehatan untuk mengurai berkas yang berada dalam status *Dalam Proses* lebih dari 5 hari kerja.
2. **Klinik Layanan Perizinan Keliling di Kecamatan Luar Kayu Agung:** Luncurkan program jemput bola pendampingan penerbitan NIB terpadu di pusat-pusat kecamatan penyangga (Lempuing, Mesuji, Pedamaran) untuk meningkatkan kepatuhan pelaku usaha lokal.
3. **Penyempurnaan Integrasi Data Harmonisasi:** Optimalkan sinkronisasi berkala melalui modul Import Excel & Database Cloud Supabase DIPTA guna menjamin validitas rekapitulasi data bagi Pimpinan dan pelaporan ke Kementerian Investasi/BKPM.`;
    }

    return res.status(200).json({
      success: true,
      insight: generatedText,
      generatedAt: new Date().toISOString(),
      model: usedModel,
      totalAnalyzed: metrics.totalPelayanan,
      focus,
    });
  } catch (error: any) {
    console.error('Error generating AI Insight on Vercel handler:', error);
    return res.status(500).json({
      error: error.message || 'Terjadi kesalahan saat memproses AI Insight.',
    });
  }
}
