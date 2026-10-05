// GeoData untuk 18 Kecamatan di Kabupaten Ogan Komering Ilir, Sumatera Selatan
// Center: Lat -3.4559744, Lng 105.2194808 (Google Maps OKI Reference)
// Catatan: Batas wilayah kecamatan (ADMINISTRATIVE_AREA_LEVEL_3 / LOCALITY) dirender langsung dari tile dasar resmi Google Maps Platform (tanpa poligon buatan).

export interface KecamatanGeo {
  id: string;
  name: string;
  capital: string;
  center: [number, number]; // [lat, lng]
  areaKm2: number;
  description: string;
}

export const OKI_MAP_CENTER: [number, number] = [-3.4559744, 105.2194808];
export const OKI_DEFAULT_ZOOM = 9;

export const OKI_KECAMATAN_GEO: KecamatanGeo[] = [
  {
    id: 'KEC-01',
    name: 'Kayu Agung',
    capital: 'Kutaraya / Cintaraja',
    center: [-3.3850, 104.8500],
    areaKm2: 224.6,
    description: 'Ibu kota dan pusat administrasi pemerintahan Kabupaten Ogan Komering Ilir.'
  },
  {
    id: 'KEC-02',
    name: 'Sirah Pulau Padang',
    capital: 'Terate',
    center: [-3.2800, 104.9100],
    areaKm2: 110.4,
    description: 'Kecamatan di sepanjang aliran Sungai Komering, sebelah utara Kayu Agung.'
  },
  {
    id: 'KEC-03',
    name: 'Pampangan',
    capital: 'Pampangan',
    center: [-3.1900, 105.0200],
    areaKm2: 485.2,
    description: 'Sentra peternakan kerbau rawa pampangan dan pertanian lebak lebung.'
  },
  {
    id: 'KEC-04',
    name: 'Pangkalan Lampam',
    capital: 'Pangkalan Lampam',
    center: [-3.0500, 105.1500],
    areaKm2: 1092.3,
    description: 'Wilayah ekosistem rawa gambut dan perikanan air tawar di utara OKI.'
  },
  {
    id: 'KEC-05',
    name: 'Air Sugihan',
    capital: 'Kertamukti',
    center: [-2.6800, 105.2500],
    areaKm2: 1928.0,
    description: 'Kecamatan pesisir dan muara perairan yang berbatasan langsung dengan Selat Bangka.'
  },
  {
    id: 'KEC-06',
    name: 'Tulung Selapan',
    capital: 'Tulung Selapan',
    center: [-3.2500, 105.4500],
    areaKm2: 4853.4,
    description: 'Salah satu kecamatan terluas di OKI dengan potensi perkebunan dan perikanan tambak laut.'
  },
  {
    id: 'KEC-07',
    name: 'Cengal',
    capital: 'Cengal',
    center: [-3.5500, 105.6500],
    areaKm2: 3223.7,
    description: 'Wilayah timur OKI dengan peninggalan sejarah Sriwijaya dan potensi perkebunan sawit.'
  },
  {
    id: 'KEC-08',
    name: 'Sungai Menang',
    capital: 'Sungai Menang',
    center: [-3.8500, 105.5500],
    areaKm2: 1993.4,
    description: 'Kecamatan pesisir tenggara OKI, sentra perikanan laut dan perkebunan.'
  },
  {
    id: 'KEC-09',
    name: 'Pedamaran',
    capital: 'Menang Raya',
    center: [-3.4500, 104.8400],
    areaKm2: 381.6,
    description: 'Kecamatan perajin anyaman tikar purun dan penyangga kota Kayu Agung.'
  },
  {
    id: 'KEC-10',
    name: 'Pedamaran Timur',
    capital: 'Sumber Hidup',
    center: [-3.5200, 105.0200],
    areaKm2: 667.8,
    description: 'Pemekaran Pedamaran dengan pertumbuhan sentra agrobisnis dan perkebunan.'
  },
  {
    id: 'KEC-11',
    name: 'Tanjung Lubuk',
    capital: 'Tanjung Lubuk',
    center: [-3.6500, 104.8000],
    areaKm2: 221.2,
    description: 'Kecamatan lintas Komering di selatan, perbatasan dengan Ogan Ilir dan OKU Timur.'
  },
  {
    id: 'KEC-12',
    name: 'Teluk Gelam',
    capital: 'Serapek',
    center: [-3.5400, 104.8600],
    areaKm2: 151.1,
    description: 'Kawasan wisata Danau Teluk Gelam dan jalur transit utama Jalan Lintas Timur Sumatera.'
  },
  {
    id: 'KEC-13',
    name: 'Lempuing',
    capital: 'Tugumulyo',
    center: [-3.7800, 104.9800],
    areaKm2: 295.6,
    description: 'Kawasan ekonomi agropolitan dan perdagangan terpadu Tugumulyo yang sangat pesat.'
  },
  {
    id: 'KEC-14',
    name: 'Lempuing Jaya',
    capital: 'Lubuk Seberuk',
    center: [-3.7200, 104.9300],
    areaKm2: 504.6,
    description: 'Sentra persawahan padi, peternakan, dan UMKM di jalur penghubung lintas timur.'
  },
  {
    id: 'KEC-15',
    name: 'Mesuji',
    capital: 'Surya Adi',
    center: [-3.9800, 105.1800],
    areaKm2: 673.8,
    description: 'Kecamatan di perbatasan Provinsi Lampung dengan komoditas kelapa sawit dan karet.'
  },
  {
    id: 'KEC-16',
    name: 'Mesuji Raya',
    capital: 'Sukamaju',
    center: [-3.8200, 105.2500],
    areaKm2: 521.5,
    description: 'Kawasan perkebunan besar kelapa sawit swasta dan plasma di wilayah tengah selatan OKI.'
  },
  {
    id: 'KEC-17',
    name: 'Mesuji Makmur',
    capital: 'Bina Karsa',
    center: [-3.9500, 105.0200],
    areaKm2: 512.4,
    description: 'Kawasan transmigrasi sukses dengan produksi perkebunan karet, sawit, dan palawija.'
  },
  {
    id: 'KEC-18',
    name: 'Jejawi',
    capital: 'Jejawi',
    center: [-3.1800, 104.8900],
    areaKm2: 227.6,
    description: 'Kecamatan di bagian barat laut OKI yang berbatasan langsung dengan Kota Palembang.'
  }
];
