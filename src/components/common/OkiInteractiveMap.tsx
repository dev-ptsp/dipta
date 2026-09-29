// DIPTA - Peta Interaktif Kabupaten Ogan Komering Ilir
// Mendukung Google Maps Platform & OpenStreetMap (OSM) dengan Batas Wilayah 18 Kecamatan & Layer Heatmap Kerapatan
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { DiptaRecord } from '../../types';
import { OKI_KECAMATAN_GEO, OKI_MAP_CENTER, OKI_DEFAULT_ZOOM, KecamatanGeo } from '../../data/okiGeodata';
import {
  Layers,
  MapPin,
  ExternalLink,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Flame,
  Navigation,
  Globe2,
  Sliders,
  Filter,
  Eye,
  EyeOff
} from 'lucide-react';
import L from 'leaflet';

declare global {
  interface Window {
    google?: any;
    L?: any;
    __googleMapsLoaded?: boolean;
    __googleMapsCallbacks?: Array<(google: any) => void>;
  }
}

// Ensure Leaflet is attached globally for leaflet-heat plugin
if (typeof window !== 'undefined') {
  window.L = L;
}

function loadGoogleMapsScript(apiKey: string): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject(new Error('Window not available'));
  if (window.google?.maps?.visualization) {
    return Promise.resolve(window.google);
  }

  if (window.__googleMapsLoaded && window.google?.maps) {
    return Promise.resolve(window.google);
  }

  if (!window.__googleMapsCallbacks) {
    window.__googleMapsCallbacks = [];
  }

  return new Promise((resolve, reject) => {
    window.__googleMapsCallbacks!.push(resolve);

    const existingScript = document.getElementById('google-maps-api-script');
    if (existingScript) {
      if (window.google?.maps) {
        resolve(window.google);
      }
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-maps-api-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry,visualization`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      window.__googleMapsLoaded = true;
      const g = window.google;
      if (window.__googleMapsCallbacks) {
        window.__googleMapsCallbacks.forEach(cb => cb(g));
        window.__googleMapsCallbacks = [];
      }
    };
    script.onerror = () => {
      reject(new Error('Failed to load Google Maps script'));
    };
    document.head.appendChild(script);
  });
}

interface OkiInteractiveMapProps {
  records: DiptaRecord[];
  onSelectKecamatan?: (kecamatan: string) => void;
  selectedKecamatan?: string;
}

type MapProvider = 'google' | 'osm';
type GoogleMapType = 'roadmap' | 'satellite' | 'hybrid' | 'terrain';
type OsmTileStyle = 'standard' | 'humanitarian' | 'carto';
type HeatmapDatasetFilter = 'ALL' | 'OSS-RBA' | 'SICANTIK' | 'SIMBG';

interface HeatPoint {
  lat: number;
  lng: number;
  weight: number;
  kecamatan: string;
  source?: string;
}

const GOOGLE_MAPS_KEY =
  (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) ||
  'AIzaSyDFidUy4YRt1Ymrb0pSf1P25wyEd-vniHY';

export const OkiInteractiveMap: React.FC<OkiInteractiveMapProps> = ({
  records,
  onSelectKecamatan,
  selectedKecamatan
}) => {
  const [provider, setProvider] = useState<MapProvider>('osm');
  const [googleType, setGoogleType] = useState<GoogleMapType>('roadmap');
  const [osmStyle, setOsmStyle] = useState<OsmTileStyle>('standard');
  const [activeKecamatan, setActiveKecamatan] = useState<KecamatanGeo | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [_googleLoadError, setGoogleLoadError] = useState<string | null>(null);

  // Heatmap State Controls
  const [showHeatmap, setShowHeatmap] = useState<boolean>(true);
  const [showPolygons, setShowPolygons] = useState<boolean>(true);
  const [heatmapRadius, setHeatmapRadius] = useState<number>(28);
  const [heatmapDataset, setHeatmapDataset] = useState<HeatmapDatasetFilter>('ALL');
  const [showHeatmapSettings, setShowHeatmapSettings] = useState<boolean>(false);

  // Map container refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const leafletLayersRef = useRef<{ [key: string]: L.Polygon }>({});
  const leafletMarkersRef = useRef<L.Marker[]>([]);
  const leafletHeatmapRef = useRef<any>(null);

  const googleMapRef = useRef<any>(null);
  const googlePolygonsRef = useRef<any[]>([]);
  const googleMarkersRef = useRef<any[]>([]);
  const googleInfoWindowRef = useRef<any>(null);
  const googleHeatmapRef = useRef<any>(null);

  // Aggregate stats per kecamatan
  const statsByKecamatan = useMemo(() => {
    const stats: Record<
      string,
      {
        total: number;
        oss: number;
        sicantik: number;
        simbg: number;
        selesai: number;
        proses: number;
        ditolak: number;
      }
    > = {};

    OKI_KECAMATAN_GEO.forEach(k => {
      stats[k.name] = {
        total: 0,
        oss: 0,
        sicantik: 0,
        simbg: 0,
        selesai: 0,
        proses: 0,
        ditolak: 0
      };
    });

    records.forEach(r => {
      const kec = r.kecamatan?.trim();
      if (kec && stats[kec]) {
        stats[kec].total += 1;
        if (r.sumber_aplikasi === 'OSS-RBA') stats[kec].oss += 1;
        else if (r.sumber_aplikasi === 'SICANTIK') stats[kec].sicantik += 1;
        else if (r.sumber_aplikasi === 'SIMBG') stats[kec].simbg += 1;

        if (r.status_dipta === 'SELESAI_TERBIT') stats[kec].selesai += 1;
        else if (r.status_dipta === 'DALAM_PROSES') stats[kec].proses += 1;
        else if (r.status_dipta === 'DITOLAK') stats[kec].ditolak += 1;
      }
    });

    return stats;
  }, [records]);

  // Max value for color scaling
  const maxTotal = useMemo(() => {
    const vals = Object.values(statsByKecamatan).map(s => s.total);
    return Math.max(...vals, 1);
  }, [statsByKecamatan]);

  // Color generator for Choropleth polygon fill
  const getColor = (total: number, isSelected: boolean) => {
    if (isSelected) return '#059669'; // Emerald dark when selected
    const ratio = total / maxTotal;
    if (ratio > 0.75) return '#047857'; // Deep emerald
    if (ratio > 0.50) return '#059669'; // Emerald
    if (ratio > 0.25) return '#10b981'; // Mint
    if (ratio > 0.05) return '#34d399'; // Light green
    return '#a7f3d0'; // Very pale green
  };

  // Generate Heatmap points based on real records data across OKI Kecamatan
  const heatmapPoints = useMemo<HeatPoint[]>(() => {
    const points: HeatPoint[] = [];

    // Filter by selected source application if needed
    const targetRecords = records.filter(r => {
      if (heatmapDataset === 'ALL') return true;
      return r.sumber_aplikasi === heatmapDataset;
    });

    // 1. Generate geospatial coordinates for each actual service record
    targetRecords.forEach((r, idx) => {
      const kecName = r.kecamatan?.trim();
      const geo =
        OKI_KECAMATAN_GEO.find(g => g.name.toLowerCase() === kecName?.toLowerCase()) ||
        OKI_KECAMATAN_GEO[0]; // fallback to Kayu Agung

      // Stable deterministic pseudo-random offset within kecamatan geographic extent
      const str = `${r.id_dipta || ''}-${r.id_record_sumber || ''}-${idx}-${geo.name}`;
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0;
      }
      const positiveHash = Math.abs(hash);
      const angle = (positiveHash % 360) * (Math.PI / 180);

      // Radial dispersion based on kecamatan surface area
      const maxRadiusDeg = geo.areaKm2 > 3000 ? 0.065 : geo.areaKm2 > 1000 ? 0.042 : 0.022;
      const distRatio = Math.sqrt(((positiveHash >> 4) % 1000) / 1000);
      const radius = distRatio * maxRadiusDeg;

      const lat = geo.center[0] + radius * Math.cos(angle);
      const lng = geo.center[1] + radius * Math.sin(angle);

      // Weight based on transaction complexity
      let weight = 1.0;
      if (r.investasi_rupiah && r.investasi_rupiah > 100000000) {
        weight += 0.5;
      }
      if (r.status_dipta === 'DALAM_PROSES') {
        weight += 0.2;
      }

      points.push({
        lat,
        lng,
        weight,
        kecamatan: geo.name,
        source: r.sumber_aplikasi
      });
    });

    // 2. Add concentrated core cluster points at each kecamatan capital proportional to total volume
    OKI_KECAMATAN_GEO.forEach(geo => {
      const stats = statsByKecamatan[geo.name];
      if (stats && stats.total > 0) {
        const count =
          heatmapDataset === 'ALL'
            ? stats.total
            : heatmapDataset === 'OSS-RBA'
            ? stats.oss
            : heatmapDataset === 'SICANTIK'
            ? stats.sicantik
            : stats.simbg;

        if (count > 0) {
          points.push({
            lat: geo.center[0],
            lng: geo.center[1],
            weight: Math.min(count * 0.7, 4.5),
            kecamatan: geo.name
          });
        }
      }
    });

    return points;
  }, [records, heatmapDataset, statsByKecamatan]);

  // -------------------------------------------------------------
  // OPENSTREETMAP (LEAFLET) IMPLEMENTATION
  // -------------------------------------------------------------
  useEffect(() => {
    if (provider !== 'osm' || !mapContainerRef.current) return;

    // Clean up any existing map
    if (leafletMapRef.current) {
      leafletMapRef.current.remove();
      leafletMapRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: OKI_MAP_CENTER,
      zoom: OKI_DEFAULT_ZOOM,
      zoomControl: false
    });

    leafletMapRef.current = map;

    // Tile URLs
    let tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    let attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

    if (osmStyle === 'humanitarian') {
      tileUrl = 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png';
      attribution = '&copy; OpenStreetMap contributors, Tiles style by Humanitarian OpenStreetMap Team';
    } else if (osmStyle === 'carto') {
      tileUrl = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
      attribution = '&copy; OpenStreetMap contributors &copy; CARTO';
    }

    L.tileLayer(tileUrl, {
      maxZoom: 18,
      attribution
    }).addTo(map);

    leafletLayersRef.current = {};
    leafletMarkersRef.current = [];
    leafletHeatmapRef.current = null;

    // 1. Draw Heatmap Layer on Leaflet if enabled
    if (showHeatmap && heatmapPoints.length > 0) {
      const heatFactory = (window as any).L?.heatLayer || (L as any).heatLayer;
      if (typeof heatFactory === 'function') {
        const lPoints = heatmapPoints.map(p => [p.lat, p.lng, p.weight]);
        const heatLayer = heatFactory(lPoints, {
          radius: heatmapRadius,
          blur: Math.round(heatmapRadius * 0.65),
          maxZoom: 14,
          max: 2.2,
          minOpacity: 0.25,
          gradient: {
            0.15: '#06b6d4',
            0.35: '#10b981',
            0.55: '#facc15',
            0.75: '#f97316',
            1.0: '#ef4444'
          }
        });
        heatLayer.addTo(map);
        leafletHeatmapRef.current = heatLayer;
      }
    }

    // 2. Draw polygons for 18 kecamatan (opacity adjusts when heatmap is on)
    if (showPolygons) {
      OKI_KECAMATAN_GEO.forEach(kec => {
        const stats = statsByKecamatan[kec.name] || { total: 0, oss: 0, sicantik: 0, simbg: 0 };
        const isSelected = selectedKecamatan === kec.name;
        const fillColor = getColor(stats.total, isSelected);

        const polygon = L.polygon(kec.bounds, {
          color: isSelected ? '#047857' : showHeatmap ? '#064e3b' : '#065f46',
          weight: isSelected ? 3 : showHeatmap ? 1.2 : 1.5,
          opacity: showHeatmap ? 0.65 : 0.9,
          fillColor: fillColor,
          fillOpacity: isSelected ? (showHeatmap ? 0.35 : 0.65) : showHeatmap ? 0.12 : 0.45,
          dashArray: isSelected ? '' : '3'
        }).addTo(map);

        // Popup content
        const popupContent = `
          <div style="font-family: system-ui, sans-serif; min-width: 190px; padding: 2px;">
            <div style="font-weight: 700; color: #0f172a; font-size: 13px;">Kec. ${kec.name}</div>
            <div style="font-size: 11px; color: #64748b; margin-bottom: 6px;">Ibu kota: ${kec.capital}</div>
            <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 2px;">
              <span>Total Pelayanan:</span>
              <strong style="color: #047857;">${stats.total} berkas</strong>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 10px; color: #475569;">
              <span>OSS-RBA: ${stats.oss}</span>
              <span>SICANTIK: ${stats.sicantik}</span>
              <span>SIMBG: ${stats.simbg}</span>
            </div>
            <div style="margin-top: 6px; padding-top: 4px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #64748b;">
              Luas: ${kec.areaKm2} km²
            </div>
          </div>
        `;

        polygon.bindPopup(popupContent);

        polygon.on('mouseover', () => {
          polygon.setStyle({
            weight: 3,
            fillOpacity: showHeatmap ? 0.4 : 0.75,
            color: '#047857'
          });
          setActiveKecamatan(kec);
        });

        polygon.on('mouseout', () => {
          polygon.setStyle({
            weight: isSelected ? 3 : showHeatmap ? 1.2 : 1.5,
            fillOpacity: isSelected ? (showHeatmap ? 0.35 : 0.65) : showHeatmap ? 0.12 : 0.45,
            color: isSelected ? '#047857' : showHeatmap ? '#064e3b' : '#065f46'
          });
        });

        polygon.on('click', () => {
          setActiveKecamatan(kec);
          if (onSelectKecamatan) {
            onSelectKecamatan(kec.name);
          }
        });

        leafletLayersRef.current[kec.name] = polygon;

        // Label Marker at centroid
        const customIcon = L.divIcon({
          className: 'custom-map-label',
          html: `
            <div style="
              background: rgba(255, 255, 255, 0.94);
              border: 1px solid #cbd5e1;
              border-radius: 6px;
              padding: 2px 6px;
              font-size: 10px;
              font-weight: 600;
              color: #1e293b;
              box-shadow: 0 1px 3px rgba(0,0,0,0.12);
              white-space: nowrap;
              display: flex;
              align-items: center;
              gap: 4px;
            ">
              <span>${kec.name}</span>
              <span style="
                background: #059669;
                color: #ffffff;
                padding: 1px 4px;
                border-radius: 4px;
                font-size: 9px;
                font-weight: 700;
              ">${stats.total}</span>
            </div>
          `,
          iconSize: [80, 20],
          iconAnchor: [40, 10]
        });

        const marker = L.marker(kec.center, { icon: customIcon }).addTo(map);
        marker.on('click', () => {
          setActiveKecamatan(kec);
          polygon.openPopup();
          if (onSelectKecamatan) {
            onSelectKecamatan(kec.name);
          }
        });

        leafletMarkersRef.current.push(marker);
      });
    }

    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [
    provider,
    osmStyle,
    statsByKecamatan,
    selectedKecamatan,
    onSelectKecamatan,
    showHeatmap,
    showPolygons,
    heatmapRadius,
    heatmapPoints
  ]);

  // -------------------------------------------------------------
  // GOOGLE MAPS IMPLEMENTATION
  // -------------------------------------------------------------
  useEffect(() => {
    if (provider !== 'google' || !mapContainerRef.current) return;

    let isMounted = true;
    setIsGoogleLoading(true);
    setGoogleLoadError(null);

    loadGoogleMapsScript(GOOGLE_MAPS_KEY)
      .then((google: any) => {
        if (!isMounted || !mapContainerRef.current) return;

        setIsGoogleLoading(false);

        const gmap = new google.maps.Map(mapContainerRef.current, {
          center: { lat: OKI_MAP_CENTER[0], lng: OKI_MAP_CENTER[1] },
          zoom: OKI_DEFAULT_ZOOM,
          mapTypeId: googleType,
          disableDefaultUI: true,
          zoomControl: false,
          gestureHandling: 'cooperative'
        });

        googleMapRef.current = gmap;
        googlePolygonsRef.current = [];
        googleMarkersRef.current = [];
        googleHeatmapRef.current = null;

        const infoWindow = new google.maps.InfoWindow();
        googleInfoWindowRef.current = infoWindow;

        // 1. Google Maps Heatmap Layer
        if (showHeatmap && heatmapPoints.length > 0 && google.maps.visualization?.HeatmapLayer) {
          const gPoints = heatmapPoints.map(p => ({
            location: new google.maps.LatLng(p.lat, p.lng),
            weight: p.weight
          }));

          const heatmap = new google.maps.visualization.HeatmapLayer({
            data: gPoints,
            map: gmap,
            radius: heatmapRadius,
            opacity: 0.8,
            gradient: [
              'rgba(0, 255, 255, 0)',
              'rgba(0, 255, 255, 1)',
              'rgba(0, 191, 255, 1)',
              'rgba(0, 255, 127, 1)',
              'rgba(255, 255, 0, 1)',
              'rgba(255, 140, 0, 1)',
              'rgba(255, 69, 0, 1)',
              'rgba(255, 0, 0, 1)'
            ]
          });
          googleHeatmapRef.current = heatmap;
        }

        // 2. Render 18 Kecamatan Polygons on Google Maps
        if (showPolygons) {
          OKI_KECAMATAN_GEO.forEach(kec => {
            const stats = statsByKecamatan[kec.name] || { total: 0, oss: 0, sicantik: 0, simbg: 0 };
            const isSelected = selectedKecamatan === kec.name;
            const fillColor = getColor(stats.total, isSelected);

            const paths = kec.bounds.map(coord => ({
              lat: coord[0],
              lng: coord[1]
            }));

            const polygon = new google.maps.Polygon({
              paths,
              strokeColor: isSelected ? '#047857' : showHeatmap ? '#064e3b' : '#065f46',
              strokeOpacity: showHeatmap ? 0.7 : 0.9,
              strokeWeight: isSelected ? 3 : showHeatmap ? 1.2 : 1.5,
              fillColor: fillColor,
              fillOpacity: isSelected ? (showHeatmap ? 0.35 : 0.65) : showHeatmap ? 0.12 : 0.45,
              map: gmap
            });

            googlePolygonsRef.current.push(polygon);

            polygon.addListener('mouseover', () => {
              polygon.setOptions({
                strokeWeight: 3,
                fillOpacity: showHeatmap ? 0.4 : 0.75,
                strokeColor: '#047857'
              });
              setActiveKecamatan(kec);
            });

            polygon.addListener('mouseout', () => {
              polygon.setOptions({
                strokeWeight: isSelected ? 3 : showHeatmap ? 1.2 : 1.5,
                fillOpacity: isSelected ? (showHeatmap ? 0.35 : 0.65) : showHeatmap ? 0.12 : 0.45,
                strokeColor: isSelected ? '#047857' : showHeatmap ? '#064e3b' : '#065f46'
              });
            });

            polygon.addListener('click', (e: any) => {
              setActiveKecamatan(kec);
              if (onSelectKecamatan) {
                onSelectKecamatan(kec.name);
              }

              const content = `
                <div style="font-family: system-ui, sans-serif; min-width: 190px; padding: 4px;">
                  <div style="font-weight: 700; color: #0f172a; font-size: 13px;">Kecamatan ${kec.name}</div>
                  <div style="font-size: 11px; color: #64748b; margin-bottom: 6px;">Ibu kota: ${kec.capital}</div>
                  <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 2px;">
                    <span>Total Pelayanan:</span>
                    <strong style="color: #047857;">${stats.total} berkas</strong>
                  </div>
                  <div style="display: flex; justify-content: space-between; font-size: 10px; color: #475569;">
                    <span>OSS: ${stats.oss}</span>
                    <span>SICANTIK: ${stats.sicantik}</span>
                    <span>SIMBG: ${stats.simbg}</span>
                  </div>
                  <div style="margin-top: 6px; padding-top: 4px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #64748b;">
                    Luas Wilayah: ${kec.areaKm2} km²
                  </div>
                </div>
              `;

              infoWindow.setContent(content);
              infoWindow.setPosition(e.latLng || { lat: kec.center[0], lng: kec.center[1] });
              infoWindow.open(gmap);
            });

            // Label Marker
            const marker = new google.maps.Marker({
              position: { lat: kec.center[0], lng: kec.center[1] },
              map: gmap,
              title: `${kec.name} (${stats.total} berkas)`,
              label: {
                text: `${kec.name}`,
                color: '#0f172a',
                fontSize: '10px',
                fontWeight: 'bold',
                className: 'google-maps-kec-label'
              },
              icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 6,
                fillColor: '#059669',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 2
              }
            });

            marker.addListener('click', () => {
              setActiveKecamatan(kec);
              if (onSelectKecamatan) {
                onSelectKecamatan(kec.name);
              }
            });

            googleMarkersRef.current.push(marker);
          });
        }
      })
      .catch((_err: any) => {
        if (!isMounted) return;
        setIsGoogleLoading(false);
        setGoogleLoadError('Gagal memuat Google Maps SDK. Beralih ke OpenStreetMap.');
        setProvider('osm');
      });

    return () => {
      isMounted = false;
    };
  }, [
    provider,
    googleType,
    statsByKecamatan,
    selectedKecamatan,
    onSelectKecamatan,
    showHeatmap,
    showPolygons,
    heatmapRadius,
    heatmapPoints
  ]);

  // Zoom handlers
  const handleZoomIn = () => {
    if (provider === 'osm' && leafletMapRef.current) {
      leafletMapRef.current.zoomIn();
    } else if (provider === 'google' && googleMapRef.current) {
      googleMapRef.current.setZoom((googleMapRef.current.getZoom() || OKI_DEFAULT_ZOOM) + 1);
    }
  };

  const handleZoomOut = () => {
    if (provider === 'osm' && leafletMapRef.current) {
      leafletMapRef.current.zoomOut();
    } else if (provider === 'google' && googleMapRef.current) {
      googleMapRef.current.setZoom((googleMapRef.current.getZoom() || OKI_DEFAULT_ZOOM) - 1);
    }
  };

  const handleResetCenter = () => {
    if (provider === 'osm' && leafletMapRef.current) {
      leafletMapRef.current.setView(OKI_MAP_CENTER, OKI_DEFAULT_ZOOM);
    } else if (provider === 'google' && googleMapRef.current) {
      googleMapRef.current.setCenter({ lat: OKI_MAP_CENTER[0], lng: OKI_MAP_CENTER[1] });
      googleMapRef.current.setZoom(OKI_DEFAULT_ZOOM);
    }
  };

  const activeStats = activeKecamatan
    ? statsByKecamatan[activeKecamatan.name]
    : null;

  return (
    <div className="space-y-3">
      {/* Top Header & Map Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/80 p-3 rounded-xl border border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
            <Globe2 className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">
              Peta Geospasial Kabupaten Ogan Komering Ilir
            </h4>
            <p className="text-[11px] text-slate-500">
              Visualisasi batas 18 kecamatan & layer Heatmap kerapatan permohonan layanan
            </p>
          </div>
        </div>

        {/* Engine Switcher & Provider */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Provider Toggle: Google Maps vs OSM */}
          <div className="flex items-center bg-white border border-slate-300 rounded-lg p-0.5 text-[11px]">
            <button
              id="btn-map-osm"
              onClick={() => setProvider('osm')}
              className={`px-3 py-1 rounded-md font-semibold transition-all ${
                provider === 'osm'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              OpenStreetMap (OSM)
            </button>
            <button
              id="btn-map-google"
              onClick={() => setProvider('google')}
              className={`px-3 py-1 rounded-md font-semibold transition-all ${
                provider === 'google'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Google Maps
            </button>
          </div>

          {/* Sub-layers for OSM */}
          {provider === 'osm' && (
            <select
              value={osmStyle}
              onChange={e => setOsmStyle(e.target.value as OsmTileStyle)}
              className="bg-white border border-slate-300 text-slate-700 text-[11px] font-medium rounded-lg px-2.5 py-1.5 focus:outline-none"
            >
              <option value="standard">OSM Standar</option>
              <option value="humanitarian">OSM Humanitarian</option>
              <option value="carto">CartoDB Positron</option>
            </select>
          )}

          {/* Sub-layers for Google Maps */}
          {provider === 'google' && (
            <select
              value={googleType}
              onChange={e => setGoogleType(e.target.value as GoogleMapType)}
              className="bg-white border border-slate-300 text-slate-700 text-[11px] font-medium rounded-lg px-2.5 py-1.5 focus:outline-none"
            >
              <option value="roadmap">Google Roadmap (Jalan)</option>
              <option value="satellite">Citra Satelit</option>
              <option value="hybrid">Hibrida (Satelit + Label)</option>
              <option value="terrain">Terrain (Relief Kontur)</option>
            </select>
          )}

          {/* Google Maps External Place Link */}
          <a
            href="https://www.google.com/maps/place/Kabupaten+Ogan+Komering+Ilir,+Sumatera+Selatan/@-3.3068054,104.9174473,9.11z/data=!4m6!3m5!1s0x2e3c0d6d1a62ce07:0x3039d80b220d0e0!8m2!3d-3.4559744!4d105.2194808!16s%2Fm%2F0gg6c6n?entry=ttu"
            target="_blank"
            rel="noopener noreferrer"
            title="Buka Peta Kabupaten OKI di Google Maps Resmi"
            className="flex items-center gap-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors"
          >
            <ExternalLink className="w-3 h-3 text-slate-500" />
            <span className="hidden md:inline">Buka di Google Maps</span>
          </a>
        </div>
      </div>

      {/* HEATMAP INTERACTIVE TOOLBAR & CONTROLS */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        {/* Heatmap Toggle & Status */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
              showHeatmap
                ? 'bg-gradient-to-r from-amber-500 to-rose-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
            }`}
          >
            <Flame className={`w-4 h-4 ${showHeatmap ? 'text-yellow-200 animate-pulse' : 'text-slate-500'}`} />
            <span>Heatmap Kerapatan {showHeatmap ? 'Aktif' : 'Non-Aktif'}</span>
          </button>

          {/* Polygon Boundary Toggle */}
          <button
            onClick={() => setShowPolygons(!showPolygons)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              showPolygons
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 font-semibold'
                : 'bg-slate-100 text-slate-600 border border-slate-300'
            }`}
          >
            {showPolygons ? <Eye className="w-3.5 h-3.5 text-emerald-600" /> : <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
            <span>Batas Wilayah Kecamatan</span>
          </button>

          {/* Heatmap Density Points Counter */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200 text-[11px] text-slate-600">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
            <span>
              <strong>{heatmapPoints.length}</strong> titik sebaran ({records.length} berkas)
            </span>
          </div>
        </div>

        {/* Heatmap Dataset & Radius Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Source Application Filter for Heatmap */}
          <div className="flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={heatmapDataset}
              onChange={e => setHeatmapDataset(e.target.value as HeatmapDatasetFilter)}
              className="bg-slate-50 border border-slate-300 text-slate-800 font-medium rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="ALL">Kerapatan: Semua Layanan</option>
              <option value="OSS-RBA">Kerapatan: OSS-RBA Saja</option>
              <option value="SICANTIK">Kerapatan: SICANTIK Saja</option>
              <option value="SIMBG">Kerapatan: SIMBG Saja</option>
            </select>
          </div>

          {/* Heatmap Radius Tuning Button */}
          <button
            onClick={() => setShowHeatmapSettings(!showHeatmapSettings)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors ${
              showHeatmapSettings
                ? 'bg-emerald-100 border-emerald-400 text-emerald-900 font-semibold'
                : 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Radius: {heatmapRadius}px</span>
          </button>
        </div>
      </div>

      {/* Collapsible Radius Adjuster */}
      {showHeatmapSettings && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-600" />
            <span className="font-semibold text-amber-900">
              Pengaturan Radius Sebaran Termal Heatmap:
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-amber-800">Fokus (15px)</span>
            <input
              type="range"
              min="15"
              max="50"
              step="3"
              value={heatmapRadius}
              onChange={e => setHeatmapRadius(Number(e.target.value))}
              className="w-36 accent-amber-600 cursor-pointer"
            />
            <span className="text-[11px] text-amber-800">Luas (50px)</span>
            <span className="font-mono font-bold text-amber-900 bg-white px-2 py-0.5 rounded border border-amber-300">
              {heatmapRadius}px
            </span>
          </div>
        </div>
      )}

      {/* Map Display & Canvas */}
      <div className="relative w-full h-[450px] rounded-xl overflow-hidden border border-slate-300 shadow-inner bg-slate-100">
        {/* Loading Indicator for Google Maps */}
        {isGoogleLoading && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex items-center justify-center z-30">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 bg-white px-4 py-2.5 rounded-lg shadow-md border border-slate-200">
              <span className="w-3.5 h-3.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></span>
              Memuat Peta Google Maps Kabupaten OKI...
            </div>
          </div>
        )}

        {/* Map Container */}
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Custom Zoom & Reset Controls */}
        <div className="absolute top-3 right-3 z-20 flex flex-col gap-1.5 bg-white rounded-lg shadow-md border border-slate-200 p-1">
          <button
            onClick={handleZoomIn}
            title="Perbesar Peta"
            className="p-1.5 hover:bg-slate-100 text-slate-700 rounded transition-colors"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            title="Perkecil Peta"
            className="p-1.5 hover:bg-slate-100 text-slate-700 rounded transition-colors"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <div className="h-[1px] bg-slate-200 my-0.5" />
          <button
            onClick={handleResetCenter}
            title="Pusatkan ke Kabupaten OKI"
            className="p-1.5 hover:bg-slate-100 text-emerald-700 rounded transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Legend Overlay at Bottom-Left */}
        <div className="absolute bottom-3 left-3 z-20 bg-white/95 backdrop-blur-xs p-3 rounded-xl shadow-lg border border-slate-200 text-[10px] text-slate-700 space-y-2 max-w-[240px]">
          {showHeatmap ? (
            <div>
              <div className="font-bold text-slate-900 flex items-center justify-between mb-1.5">
                <span className="flex items-center gap-1 text-rose-700 font-bold">
                  <Flame className="w-3.5 h-3.5" />
                  Kerapatan Pelayanan
                </span>
                <span className="text-[9px] bg-rose-100 text-rose-800 px-1.5 py-0.2 rounded font-semibold">
                  Heatmap
                </span>
              </div>
              {/* Heatmap Gradient Bar */}
              <div className="h-3 w-full rounded-md bg-gradient-to-r from-cyan-400 via-emerald-400 via-yellow-400 via-orange-500 to-rose-600 shadow-xs border border-slate-300 mb-1"></div>
              <div className="flex justify-between text-[9px] text-slate-600 font-medium">
                <span>Rendah</span>
                <span>Sedang</span>
                <span>Padat / Tinggi</span>
              </div>
              <div className="pt-1.5 border-t border-slate-200 text-[9px] text-slate-500 leading-tight">
                Konsentrasi tertinggi di <strong className="text-slate-800">Kayu Agung</strong>,{' '}
                <strong className="text-slate-800">Lempuing</strong>, &{' '}
                <strong className="text-slate-800">Teluk Gelam</strong>.
              </div>
            </div>
          ) : (
            <div>
              <div className="font-bold text-slate-900 flex items-center justify-between mb-1.5">
                <span>Intensitas Pelayanan</span>
                <span className="text-[9px] text-slate-400 font-normal">Choropleth</span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded bg-[#a7f3d0] border border-slate-300"></span>
                  <span>Rendah (&lt; 5 berkas)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded bg-[#34d399] border border-slate-300"></span>
                  <span>Sedang (5 - 15 berkas)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded bg-[#059669] border border-slate-300"></span>
                  <span>Tinggi (&gt; 15 berkas)</span>
                </div>
              </div>
            </div>
          )}

          {showPolygons && (
            <div className="pt-1 border-t border-slate-200 text-[9px] text-slate-500 flex items-center gap-1">
              <span className="w-3 h-0.5 bg-emerald-700 border border-dashed border-emerald-900"></span>
              <span>Garis putus-putus: Batas 18 Kecamatan</span>
            </div>
          )}
        </div>

        {/* Active Kecamatan Quick Card (Hover/Click Detail) at Bottom-Right */}
        {activeKecamatan && activeStats && (
          <div className="absolute bottom-3 right-3 z-20 bg-white/95 backdrop-blur-xs p-3.5 rounded-xl shadow-lg border border-slate-200 text-xs text-slate-800 max-w-xs animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 mb-2">
              <div>
                <span className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider">
                  Kecamatan Terpilih
                </span>
                <h5 className="font-bold text-slate-900 text-sm">
                  {activeKecamatan.name}
                </h5>
              </div>
              <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[11px]">
                {activeStats.total} Berkas
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 text-center text-[10px] mb-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
              <div>
                <span className="text-slate-500 block">OSS-RBA</span>
                <strong className="text-slate-900">{activeStats.oss}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">SICANTIK</span>
                <strong className="text-slate-900">{activeStats.sicantik}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">SIMBG</span>
                <strong className="text-slate-900">{activeStats.simbg}</strong>
              </div>
            </div>

            <div className="text-[10px] text-slate-500 space-y-0.5">
              <div>Ibu kota: <strong className="text-slate-700">{activeKecamatan.capital}</strong></div>
              <div>Luas: <strong className="text-slate-700">{activeKecamatan.areaKm2} km²</strong></div>
              <div className="line-clamp-2 pt-1 text-slate-600 italic">
                "{activeKecamatan.description}"
              </div>
            </div>

            {onSelectKecamatan && (
              <button
                onClick={() => onSelectKecamatan(activeKecamatan.name)}
                className="w-full mt-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-[11px] transition-colors flex items-center justify-center gap-1"
              >
                <Navigation className="w-3 h-3" />
                <span>Filter Dashboard Kecamatan Ini</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Grid of 18 Kecamatan Chips for Quick Navigation */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-800">
            Daftar 18 Kecamatan Kabupaten Ogan Komering Ilir (Klik untuk sorot peta)
          </span>
          <span className="text-[11px] text-slate-500">
            Terpusat di Kayu Agung (-3.4559744, 105.2194808)
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1.5 text-xs">
          {OKI_KECAMATAN_GEO.map(k => {
            const stats = statsByKecamatan[k.name] || { total: 0 };
            const isSelected = selectedKecamatan === k.name;
            return (
              <button
                key={k.id}
                onClick={() => {
                  setActiveKecamatan(k);
                  if (provider === 'osm' && leafletMapRef.current) {
                    leafletMapRef.current.setView(k.center, 11);
                    const poly = leafletLayersRef.current[k.name];
                    if (poly) poly.openPopup();
                  } else if (provider === 'google' && googleMapRef.current) {
                    googleMapRef.current.setCenter({ lat: k.center[0], lng: k.center[1] });
                    googleMapRef.current.setZoom(11);
                  }
                  if (onSelectKecamatan) {
                    onSelectKecamatan(k.name);
                  }
                }}
                className={`p-1.5 rounded-lg border text-left transition-all flex items-center justify-between ${
                  isSelected
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <span className="truncate pr-1 text-[11px]">{k.name}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                    stats.total > 0
                      ? 'bg-emerald-200 text-emerald-800 font-bold'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {stats.total}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
