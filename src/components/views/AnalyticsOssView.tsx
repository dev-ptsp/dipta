// DIPTA - Analitik OSS-RBA (PRD Section 12)
import React, { useState } from 'react';
import { DiptaRecord } from '../../types';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import {
  FileSpreadsheet,
  Briefcase,
  Award,
  DollarSign,
  Users,
  Building,
  TrendingUp,
  ShieldAlert
} from 'lucide-react';

interface AnalyticsOssViewProps {
  records: DiptaRecord[];
}

const PIE_COLORS = ['#059669', '#0284c7', '#d97706', '#8b5cf6', '#ec4899', '#64748b'];

export const AnalyticsOssView: React.FC<AnalyticsOssViewProps> = ({ records }) => {
  const [activeTab, setActiveTab] = useState<'NIB' | 'KEGIATAN' | 'IZIN'>('NIB');

  const ossRecords = records.filter(r => r.sumber_aplikasi === 'OSS-RBA');
  const nibRecords = ossRecords.filter(r => r.jenis_dataset === 'OSS_NIB');
  const kegiatanRecords = ossRecords.filter(r => r.jenis_dataset === 'OSS_KEGIATAN');
  const izinRecords = ossRecords.filter(r => r.jenis_dataset === 'OSS_IZIN');

  // Tab A: NIB
  const totalNib = nibRecords.length;
  const pmdnCount = nibRecords.filter(r => r.status_penanaman_modal === 'PMDN').length;
  const pmaCount = nibRecords.filter(r => r.status_penanaman_modal === 'PMA').length;

  const skalaMap: { [key: string]: number } = {};
  nibRecords.forEach(r => {
    const s = r.skala_usaha || 'Mikro';
    skalaMap[s] = (skalaMap[s] || 0) + 1;
  });
  const skalaData = Object.entries(skalaMap).map(([name, value]) => ({ name, value }));

  const badanUsahaMap: { [key: string]: number } = {};
  nibRecords.forEach(r => {
    const j = r.jenis_perusahaan || 'Perorangan';
    badanUsahaMap[j] = (badanUsahaMap[j] || 0) + 1;
  });
  const badanUsahaData = Object.entries(badanUsahaMap).map(([name, total]) => ({ name, total }));

  // Tab B: Kegiatan Usaha (Investasi, TKI, Risiko, Sektor)
  const totalProyek = kegiatanRecords.length;
  const totalInvestasi = kegiatanRecords.reduce((acc, cur) => acc + (cur.investasi_rupiah || 0), 0);
  const totalTki = kegiatanRecords.reduce((acc, cur) => acc + (cur.tki_count || 0), 0);

  const sektorMap: { [key: string]: { sektor: string; investasi: number; tki: number; proyek: number } } = {};
  kegiatanRecords.forEach(r => {
    const s = r.sektor || 'Lainnya';
    if (!sektorMap[s]) sektorMap[s] = { sektor: s, investasi: 0, tki: 0, proyek: 0 };
    sektorMap[s].proyek += 1;
    sektorMap[s].investasi += (r.investasi_rupiah || 0) / 1000000000; // in Milyar Rp
    sektorMap[s].tki += r.tki_count || 0;
  });
  const sektorData = Object.values(sektorMap);

  const risikoMap: { [key: string]: number } = {};
  kegiatanRecords.forEach(r => {
    const rsk = r.risiko_usaha || 'Rendah';
    risikoMap[rsk] = (risikoMap[rsk] || 0) + 1;
  });
  const risikoData = Object.entries(risikoMap).map(([name, value]) => ({ name, value }));

  // Tab C: Produk / Dokumen Perizinan OSS
  const totalIzinProduk = izinRecords.length;
  const kategoriMap: { [key: string]: number } = {
    'Persyaratan Dasar': 0,
    'Sertifikat Standar': 0,
    Izin: 0,
    UMKU: 0
  };
  izinRecords.forEach(r => {
    const k = r.kategori_dokumen_oss || 'Sertifikat Standar';
    kategoriMap[k] = (kategoriMap[k] || 0) + 1;
  });
  const kategoriData = Object.entries(kategoriMap).map(([name, total]) => ({ name, total }));

  return (
    <div id="analytics-oss-view" className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Analitik Data OSS-RBA</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Eksplorasi mendalam perizinan berusaha berbasis risiko di Kabupaten Ogan Komering Ilir.
        </p>
      </div>

      {/* 3 Tabs (PRD Section 12) */}
      <div className="flex border-b border-slate-200">
        <button
          id="tab-oss-nib"
          onClick={() => setActiveTab('NIB')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-semibold border-b-2 transition-all ${
            activeTab === 'NIB'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/40'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Tab A — NIB Pelaku Usaha ({nibRecords.length})</span>
        </button>

        <button
          id="tab-oss-kegiatan"
          onClick={() => setActiveTab('KEGIATAN')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-semibold border-b-2 transition-all ${
            activeTab === 'KEGIATAN'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/40'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>Tab B — Kegiatan Usaha & Investasi ({kegiatanRecords.length})</span>
        </button>

        <button
          id="tab-oss-izin"
          onClick={() => setActiveTab('IZIN')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-semibold border-b-2 transition-all ${
            activeTab === 'IZIN'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/40'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Tab C — Produk & Dokumen Perizinan ({izinRecords.length})</span>
        </button>
      </div>

      {/* TAB A: NIB */}
      {activeTab === 'NIB' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <span className="text-xs text-slate-500 font-medium">Total NIB Terbit</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">{totalNib}</div>
              <div className="text-[11px] text-emerald-600 mt-1">Pelaku usaha terdaftar</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <span className="text-xs text-slate-500 font-medium">Status Modal PMDN</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">{pmdnCount}</div>
              <div className="text-[11px] text-slate-400 mt-1">Penanaman Modal Dalam Negeri</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <span className="text-xs text-slate-500 font-medium">Status Modal PMA</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">{pmaCount}</div>
              <div className="text-[11px] text-slate-400 mt-1">Penanaman Modal Asing</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <span className="text-xs text-slate-500 font-medium">Skala Usaha Dominan</span>
              <div className="text-2xl font-bold text-emerald-700 mt-1">
                {skalaData.sort((a, b) => b.value - a.value)[0]?.name || 'Mikro'}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">UMKM & Korporasi</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Distribusi Skala Usaha (NIB)</h3>
              <div className="h-60 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={skalaData}
                      cx="50%"
                      cy="50%"
                      outerRadius={75}
                      dataKey="value"
                      label={({ name, value }) => `${name} (${value})`}
                    >
                      {skalaData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Jenis Badan Usaha</h3>
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={badanUsahaData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="total" name="Jumlah NIB" fill="#059669" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB B: KEGIATAN USAHA & INVESTASI */}
      {activeTab === 'KEGIATAN' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <span className="text-xs text-slate-500 font-medium">Jumlah Kegiatan / Proyek</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">{totalProyek}</div>
              <div className="text-[11px] text-slate-400 mt-1">Kegiatan usaha beroperasi</div>
            </div>
            <div className="bg-white border border-emerald-200 rounded-xl p-4 shadow-xs bg-emerald-50/20">
              <span className="text-xs text-emerald-800 font-medium">Total Realisasi Investasi</span>
              <div className="text-2xl font-bold text-emerald-700 mt-1">
                Rp {(totalInvestasi / 1000000000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} Milyar
              </div>
              <div className="text-[11px] text-emerald-600 mt-1">Akumulasi komitmen investasi</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <span className="text-xs text-slate-500 font-medium">Penyerapan Tenaga Kerja (TKI)</span>
              <div className="text-2xl font-bold text-sky-700 mt-1">
                {totalTki.toLocaleString('id-ID')} Orang
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Tenaga kerja lokal terserap</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Investasi per Sektor (Milyar Rp)</h3>
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sektorData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="sektor" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} unit=" M" />
                    <Tooltip formatter={(v: any) => `Rp ${v.toFixed(1)} Milyar`} />
                    <Bar dataKey="investasi" name="Investasi (Milyar Rp)" fill="#0284c7" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Distribusi Tingkat Risiko Usaha</h3>
              <div className="h-60 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={risikoData}
                      cx="50%"
                      cy="50%"
                      outerRadius={75}
                      dataKey="value"
                      label={({ name, value }) => `${name} (${value})`}
                    >
                      {risikoData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB C: PRODUK & DOKUMEN PERIZINAN */}
      {activeTab === 'IZIN' && (
        <div className="space-y-6">
          <div className="p-4 bg-sky-50 border border-sky-200 rounded-xl text-xs text-sky-900 leading-relaxed">
            <strong>Terminologi Produk (PRD Section 6.3 & 12):</strong> Disebut sebagai{' '}
            <em>"Produk/Dokumen Perizinan OSS"</em> dan bukan sekadar "Jumlah Izin", karena data sumber mencakup
            Persyaratan Dasar, Sertifikat Standar, Izin Teknis, dan UMKU.
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 mb-3">
                Kategori Dokumen Perizinan OSS
              </h3>
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={kategoriData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="total" name="Jumlah Dokumen" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Status Produk Perizinan OSS</h3>
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                  <span className="font-semibold text-emerald-900 text-xs">Selesai / SS Terverifikasi</span>
                  <span className="text-sm font-bold text-emerald-700">
                    {izinRecords.filter(r => r.status_dipta === 'SELESAI_TERBIT').length} Dokumen
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-sky-50 border border-sky-200">
                  <span className="font-semibold text-sky-900 text-xs">Dalam Proses Verifikasi</span>
                  <span className="text-sm font-bold text-sky-700">
                    {izinRecords.filter(r => r.status_dipta === 'DALAM_PROSES').length} Dokumen
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="font-semibold text-slate-700 text-xs">Total Dokumen / Produk</span>
                  <span className="text-sm font-bold text-slate-900">{totalIzinProduk} Dokumen</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
