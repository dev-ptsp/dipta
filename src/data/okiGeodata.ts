// GeoData & Polygons for 18 Kecamatan di Kabupaten Ogan Komering Ilir, Sumatera Selatan
// Center: Lat -3.4559744, Lng 105.2194808 (Google Maps OKI Reference)

export interface KecamatanGeo {
  id: string;
  name: string;
  capital: string;
  center: [number, number]; // [lat, lng]
  bounds: [number, number][]; // Polygon coordinates [[lat, lng], ...]
  areaKm2: number;
  description: string;
}

export const OKI_MAP_CENTER: [number, number] = [-3.4559744, 105.2194808];
export const OKI_DEFAULT_ZOOM = 9;

// Approximate polygon boundaries covering the 18 kecamatan across OKI
export const OKI_KECAMATAN_GEO: KecamatanGeo[] = [
  {
    id: 'KEC-01',
    name: 'Kayu Agung',
    capital: 'Kutaraya / Cintaraja',
    center: [-3.3850, 104.8500],
    areaKm2: 224.6,
    description: 'Ibu kota dan pusat administrasi pemerintahan Kabupaten Ogan Komering Ilir.',
    bounds: [
      [-3.32, 104.80],
      [-3.31, 104.89],
      [-3.36, 104.93],
      [-3.44, 104.89],
      [-3.44, 104.81],
      [-3.38, 104.79],
      [-3.32, 104.80]
    ]
  },
  {
    id: 'KEC-02',
    name: 'Sirah Pulau Padang',
    capital: 'Terate',
    center: [-3.2800, 104.9100],
    areaKm2: 110.4,
    description: 'Kecamatan di sepanjang aliran Sungai Komering, sebelah utara Kayu Agung.',
    bounds: [
      [-3.21, 104.85],
      [-3.20, 104.94],
      [-3.27, 104.98],
      [-3.34, 104.94],
      [-3.33, 104.86],
      [-3.26, 104.84],
      [-3.21, 104.85]
    ]
  },
  {
    id: 'KEC-03',
    name: 'Pampangan',
    capital: 'Pampangan',
    center: [-3.1900, 105.0200],
    areaKm2: 485.2,
    description: 'Sentra peternakan kerbau rawa pampangan dan pertanian lebak lebung.',
    bounds: [
      [-3.11, 104.96],
      [-3.10, 105.09],
      [-3.18, 105.14],
      [-3.28, 105.08],
      [-3.27, 104.98],
      [-3.19, 104.96],
      [-3.11, 104.96]
    ]
  },
  {
    id: 'KEC-04',
    name: 'Pangkalan Lampam',
    capital: 'Pangkalan Lampam',
    center: [-3.0500, 105.1500],
    areaKm2: 1092.3,
    description: 'Wilayah ekosistem rawa gambut dan perikanan air tawar di utara OKI.',
    bounds: [
      [-2.92, 105.08],
      [-2.89, 105.24],
      [-3.06, 105.28],
      [-3.17, 105.19],
      [-3.15, 105.08],
      [-3.03, 105.05],
      [-2.92, 105.08]
    ]
  },
  {
    id: 'KEC-05',
    name: 'Air Sugihan',
    capital: 'Kertamukti',
    center: [-2.6800, 105.2500],
    areaKm2: 1928.0,
    description: 'Kecamatan pesisir dan muara perairan yang berbatasan langsung dengan Selat Bangka.',
    bounds: [
      [-2.45, 105.10],
      [-2.42, 105.38],
      [-2.72, 105.45],
      [-2.89, 105.34],
      [-2.89, 105.15],
      [-2.65, 105.08],
      [-2.45, 105.10]
    ]
  },
  {
    id: 'KEC-06',
    name: 'Tulung Selapan',
    capital: 'Tulung Selapan',
    center: [-3.2500, 105.4500],
    areaKm2: 4853.4,
    description: 'Salah satu kecamatan terluas di OKI dengan potensi perkebunan dan perikanan tambak laut.',
    bounds: [
      [-2.89, 105.34],
      [-2.92, 105.65],
      [-3.38, 105.80],
      [-3.48, 105.52],
      [-3.32, 105.32],
      [-3.06, 105.28],
      [-2.89, 105.34]
    ]
  },
  {
    id: 'KEC-07',
    name: 'Cengal',
    capital: 'Cengal',
    center: [-3.5500, 105.6500],
    areaKm2: 3223.7,
    description: 'Wilayah timur OKI dengan peninggalan sejarah Sriwijaya dan potensi perkebunan sawit.',
    bounds: [
      [-3.38, 105.55],
      [-3.38, 105.80],
      [-3.68, 105.95],
      [-3.80, 105.75],
      [-3.72, 105.45],
      [-3.52, 105.48],
      [-3.38, 105.55]
    ]
  },
  {
    id: 'KEC-08',
    name: 'Sungai Menang',
    capital: 'Sungai Menang',
    center: [-3.8500, 105.5500],
    areaKm2: 1993.4,
    description: 'Kecamatan pesisir tenggara OKI, sentra perikanan laut dan perkebunan.',
    bounds: [
      [-3.70, 105.42],
      [-3.68, 105.78],
      [-3.85, 105.90],
      [-4.08, 105.72],
      [-4.05, 105.40],
      [-3.85, 105.32],
      [-3.70, 105.42]
    ]
  },
  {
    id: 'KEC-09',
    name: 'Pedamaran',
    capital: 'Menang Raya',
    center: [-3.4500, 104.8400],
    areaKm2: 381.6,
    description: 'Kecamatan perajin anyaman tikar purun dan penyangga kota Kayu Agung.',
    bounds: [
      [-3.40, 104.78],
      [-3.41, 104.91],
      [-3.48, 104.95],
      [-3.53, 104.86],
      [-3.52, 104.76],
      [-3.44, 104.75],
      [-3.40, 104.78]
    ]
  },
  {
    id: 'KEC-10',
    name: 'Pedamaran Timur',
    capital: 'Sumber Hidup',
    center: [-3.5200, 105.0200],
    areaKm2: 667.8,
    description: 'Pemekaran Pedamaran dengan pertumbuhan sentra agrobisnis dan perkebunan.',
    bounds: [
      [-3.42, 104.92],
      [-3.40, 105.12],
      [-3.58, 105.18],
      [-3.64, 105.05],
      [-3.58, 104.94],
      [-3.48, 104.92],
      [-3.42, 104.92]
    ]
  },
  {
    id: 'KEC-11',
    name: 'Tanjung Lubuk',
    capital: 'Tanjung Lubuk',
    center: [-3.6500, 104.8000],
    areaKm2: 221.2,
    description: 'Kecamatan lintas Komering di selatan, perbatasan dengan Ogan Ilir dan OKU Timur.',
    bounds: [
      [-3.58, 104.72],
      [-3.56, 104.84],
      [-3.68, 104.88],
      [-3.75, 104.82],
      [-3.73, 104.70],
      [-3.63, 104.70],
      [-3.58, 104.72]
    ]
  },
  {
    id: 'KEC-12',
    name: 'Teluk Gelam',
    capital: 'Serapek',
    center: [-3.5400, 104.8600],
    areaKm2: 151.1,
    description: 'Kawasan wisata Danau Teluk Gelam dan jalur transit utama Jalan Lintas Timur Sumatera.',
    bounds: [
      [-3.48, 104.82],
      [-3.48, 104.92],
      [-3.60, 104.93],
      [-3.63, 104.85],
      [-3.58, 104.81],
      [-3.48, 104.82]
    ]
  },
  {
    id: 'KEC-13',
    name: 'Lempuing',
    capital: 'Tugumulyo',
    center: [-3.7800, 104.9800],
    areaKm2: 295.6,
    description: 'Kawasan ekonomi agropolitan dan perdagangan terpadu Tugumulyo yang sangat pesat.',
    bounds: [
      [-3.70, 104.90],
      [-3.69, 105.05],
      [-3.85, 105.10],
      [-3.90, 104.96],
      [-3.84, 104.89],
      [-3.70, 104.90]
    ]
  },
  {
    id: 'KEC-14',
    name: 'Lempuing Jaya',
    capital: 'Lubuk Seberuk',
    center: [-3.7200, 104.9300],
    areaKm2: 504.6,
    description: 'Sentra persawahan padi, peternakan, dan UMKM di jalur penghubung lintas timur.',
    bounds: [
      [-3.62, 104.86],
      [-3.62, 104.98],
      [-3.76, 105.00],
      [-3.80, 104.88],
      [-3.72, 104.84],
      [-3.62, 104.86]
    ]
  },
  {
    id: 'KEC-15',
    name: 'Mesuji',
    capital: 'Surya Adi',
    center: [-3.9800, 105.1800],
    areaKm2: 673.8,
    description: 'Kecamatan di perbatasan Provinsi Lampung dengan komoditas kelapa sawit dan karet.',
    bounds: [
      [-3.88, 105.10],
      [-3.86, 105.28],
      [-4.08, 105.32],
      [-4.15, 105.18],
      [-4.05, 105.08],
      [-3.88, 105.10]
    ]
  },
  {
    id: 'KEC-16',
    name: 'Mesuji Raya',
    capital: 'Sukamaju',
    center: [-3.8200, 105.2500],
    areaKm2: 521.5,
    description: 'Kawasan perkebunan besar kelapa sawit swasta dan plasma di wilayah tengah selatan OKI.',
    bounds: [
      [-3.68, 105.16],
      [-3.68, 105.38],
      [-3.88, 105.42],
      [-3.95, 105.22],
      [-3.85, 105.15],
      [-3.68, 105.16]
    ]
  },
  {
    id: 'KEC-17',
    name: 'Mesuji Makmur',
    capital: 'Bina Karsa',
    center: [-3.9500, 105.0200],
    areaKm2: 512.4,
    description: 'Kawasan transmigrasi sukses dengan produksi perkebunan karet, sawit, dan palawija.',
    bounds: [
      [-3.86, 104.94],
      [-3.86, 105.12],
      [-4.06, 105.15],
      [-4.10, 105.00],
      [-4.00, 104.92],
      [-3.86, 104.94]
    ]
  },
  {
    id: 'KEC-18',
    name: 'Jejawi',
    capital: 'Jejawi',
    center: [-3.1800, 104.8900],
    areaKm2: 227.6,
    description: 'Kecamatan di bagian barat laut OKI yang berbatasan langsung dengan Kota Palembang.',
    bounds: [
      [-3.09, 104.82],
      [-3.08, 104.94],
      [-3.21, 104.95],
      [-3.26, 104.86],
      [-3.18, 104.80],
      [-3.09, 104.82]
    ]
  }
];
