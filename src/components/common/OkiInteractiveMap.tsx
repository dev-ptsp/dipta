// DIPTA - Peta Interaktif Kabupaten Ogan Komering Ilir
// Menggunakan @vis.gl/react-google-maps dengan Batas Wilayah Asli Google Maps, Places API (New) Viewport Fitting, AdvancedMarker, & Layer Kerapatan Layanan
import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
  useMap,
  useMapsLibrary
} from '@vis.gl/react-google-maps';
import { DiptaRecord } from '../../types';
import { OKI_KECAMATAN_GEO, OKI_MAP_CENTER, OKI_DEFAULT_ZOOM, KecamatanGeo } from '../../data/okiGeodata';
import {
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
  EyeOff,
  MapPin
} from 'lucide-react';

interface OkiInteractiveMapProps {
  records: DiptaRecord[];
  onSelectKecamatan?: (kecamatan: string) => void;
  selectedKecamatan?: string;
}

type GoogleMapType = 'roadmap' | 'satellite' | 'hybrid' | 'terrain';
type HeatmapDatasetFilter = 'ALL' | 'OSS-RBA' | 'SICANTIK' | 'SIMBG';

interface HeatPoint {
  lat: number;
  lng: number;
  weight: number;
  kecamatan: string;
  source?: string;
}

const GOOGLE_MAPS_API_KEY = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) || '';

interface MapOverlaysProps {
  googleType: GoogleMapType;
  showHeatmap: boolean;
  heatmapRadius: number;
  heatmapPoints: HeatPoint[];
  onPlaceViewportResolved: (kecName: string, centerPos: { lat: number; lng: number }, formattedAddress?: string) => void;
  mapActionRef: React.MutableRefObject<{
    zoomIn: () => void;
    zoomOut: () => void;
    resetCenter: () => void;
    focusKecamatanByGoogleMaps: (kec: KecamatanGeo) => void;
  } | null>;
}

const OkiMapOverlays: React.FC<MapOverlaysProps> = ({
  googleType,
  showHeatmap,
  heatmapRadius,
  heatmapPoints,
  onPlaceViewportResolved,
  mapActionRef
}) => {
  const map = useMap();
  const placesLib = useMapsLibrary('places');
  const circlesRef = useRef<google.maps.Circle[]>([]);
  const viewportCacheRef = useRef<
    Record<
      string,
      {
        viewport?: google.maps.LatLngBounds;
        location: { lat: number; lng: number };
        formattedAddress?: string;
      }
    >
  >({});

  // Look up official Google Maps Kecamatan viewport & boundary extent using Places API (New)
  const focusKecamatanByGoogleMaps = useCallback(
    async (kec: KecamatanGeo) => {
      if (!map) return;

      const cached = viewportCacheRef.current[kec.name];
      if (cached) {
        if (cached.viewport) {
          map.fitBounds(cached.viewport, 40);
        } else {
          map.setCenter(cached.location);
          map.setZoom(12);
        }
        onPlaceViewportResolved(kec.name, cached.location, cached.formattedAddress);
        return;
      }

      if (placesLib && (placesLib as any).Place?.searchByText) {
        try {
          const { places } = await (placesLib as any).Place.searchByText({
            textQuery: `Kecamatan ${kec.name}, Kabupaten Ogan Komering Ilir, Sumatera Selatan`,
            fields: ['displayName', 'location', 'viewport', 'formattedAddress'],
            language: 'id',
            region: 'ID'
          });

          const place = places?.[0];
          if (place) {
            const loc = place.location
              ? { lat: place.location.lat(), lng: place.location.lng() }
              : { lat: kec.center[0], lng: kec.center[1] };

            viewportCacheRef.current[kec.name] = {
              viewport: place.viewport || undefined,
              location: loc,
              formattedAddress: place.formattedAddress || undefined
            };

            if (place.viewport) {
              map.fitBounds(place.viewport, 40);
            } else {
              map.setCenter(loc);
              map.setZoom(12);
            }

            onPlaceViewportResolved(kec.name, loc, place.formattedAddress || undefined);
            return;
          }
        } catch (err: any) {
          const msg = String(err?.message || err || '');
          if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('OVER_QUERY_LIMIT')) {
            window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
          }
        }
      }

      // Fallback to official center coordinate if Places lookup is unavailable
      const fallbackPos = { lat: kec.center[0], lng: kec.center[1] };
      map.setCenter(fallbackPos);
      map.setZoom(12);
      onPlaceViewportResolved(kec.name, fallbackPos);
    },
    [map, placesLib, onPlaceViewportResolved]
  );

  // Expose map camera controls to parent toolbar
  useEffect(() => {
    if (!map) return;
    mapActionRef.current = {
      zoomIn: () => {
        const currentZoom = map.getZoom() ?? OKI_DEFAULT_ZOOM;
        map.setZoom(currentZoom + 1);
      },
      zoomOut: () => {
        const currentZoom = map.getZoom() ?? OKI_DEFAULT_ZOOM;
        map.setZoom(currentZoom - 1);
      },
      resetCenter: () => {
        map.setCenter({ lat: OKI_MAP_CENTER[0], lng: OKI_MAP_CENTER[1] });
        map.setZoom(OKI_DEFAULT_ZOOM);
      },
      focusKecamatanByGoogleMaps
    };
  }, [map, mapActionRef, focusKecamatanByGoogleMaps]);

  // Synchronize mapTypeId & administrative boundary feature layers when available
  useEffect(() => {
    if (!map) return;
    map.setMapTypeId(googleType);

    // Attempt to style Google Maps native administrative boundaries if enabled on the Map ID
    try {
      const featureTypeObj = (google.maps as any)?.FeatureType;
      if (featureTypeObj && typeof map.getFeatureLayer === 'function') {
        const adminLayer = map.getFeatureLayer(featureTypeObj.ADMINISTRATIVE_AREA_LEVEL_2);
        if (adminLayer && adminLayer.isAvailable) {
          adminLayer.style = {
            strokeColor: '#047857',
            strokeOpacity: 0.85,
            strokeWeight: 2,
            fillColor: '#10b981',
            fillOpacity: 0.06
          };
        }
      }
    } catch {
      // Ignore if vector FeatureLayer is not enabled on DEMO_MAP_ID
    }
  }, [map, googleType]);

  // Render thermal density circles
  useEffect(() => {
    circlesRef.current.forEach(c => c.setMap(null));
    circlesRef.current = [];

    if (!map || !showHeatmap || heatmapPoints.length === 0 || typeof google === 'undefined' || !google.maps?.Circle) {
      return;
    }

    const radiusMeters = heatmapRadius * 135;

    heatmapPoints.forEach(pt => {
      const normalized = Math.min(pt.weight / 3.5, 1);
      const color =
        normalized > 0.75
          ? '#ef4444'
          : normalized > 0.5
          ? '#f97316'
          : normalized > 0.3
          ? '#facc15'
          : '#10b981';

      const circle = new google.maps.Circle({
        center: { lat: pt.lat, lng: pt.lng },
        radius: radiusMeters * (0.7 + normalized * 0.6),
        strokeWeight: 0,
        fillColor: color,
        fillOpacity: 0.24 + normalized * 0.22,
        clickable: false,
        map
      });

      circlesRef.current.push(circle);
    });

    return () => {
      circlesRef.current.forEach(c => c.setMap(null));
      circlesRef.current = [];
    };
  }, [map, showHeatmap, heatmapPoints, heatmapRadius]);

  return null;
};

export const OkiInteractiveMap: React.FC<OkiInteractiveMapProps> = ({
  records,
  onSelectKecamatan,
  selectedKecamatan
}) => {
  const [googleType, setGoogleType] = useState<GoogleMapType>('roadmap');
  const [activeKecamatan, setActiveKecamatan] = useState<KecamatanGeo | null>(null);
  const [infoWindowState, setInfoWindowState] = useState<{
    kec: KecamatanGeo;
    position: { lat: number; lng: number };
    formattedAddress?: string;
  } | null>(null);

  // Controls for Heatmap & Kecamatan Markers
  const [showHeatmap, setShowHeatmap] = useState<boolean>(true);
  const [showMarkers, setShowMarkers] = useState<boolean>(true);
  const [heatmapRadius, setHeatmapRadius] = useState<number>(28);
  const [heatmapDataset, setHeatmapDataset] = useState<HeatmapDatasetFilter>('ALL');
  const [showHeatmapSettings, setShowHeatmapSettings] = useState<boolean>(false);

  const mapActionRef = useRef<{
    zoomIn: () => void;
    zoomOut: () => void;
    resetCenter: () => void;
    focusKecamatanByGoogleMaps: (kec: KecamatanGeo) => void;
  } | null>(null);

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

  // Generate density points based on real records data across OKI Kecamatan
  const heatmapPoints = useMemo<HeatPoint[]>(() => {
    const points: HeatPoint[] = [];

    const targetRecords = records.filter(r => {
      if (heatmapDataset === 'ALL') return true;
      return r.sumber_aplikasi === heatmapDataset;
    });

    targetRecords.forEach((r, idx) => {
      const kecName = r.kecamatan?.trim();
      const geo =
        OKI_KECAMATAN_GEO.find(g => g.name.toLowerCase() === kecName?.toLowerCase()) ||
        OKI_KECAMATAN_GEO[0];

      const str = `${r.id_dipta || ''}-${r.id_record_sumber || ''}-${idx}-${geo.name}`;
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0;
      }
      const positiveHash = Math.abs(hash);
      const angle = (positiveHash % 360) * (Math.PI / 180);

      const maxRadiusDeg = geo.areaKm2 > 3000 ? 0.065 : geo.areaKm2 > 1000 ? 0.042 : 0.022;
      const distRatio = Math.sqrt(((positiveHash >> 4) % 1000) / 1000);
      const radius = distRatio * maxRadiusDeg;

      const lat = geo.center[0] + radius * Math.cos(angle);
      const lng = geo.center[1] + radius * Math.sin(angle);

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

  const handlePlaceViewportResolved = useCallback(
    (kecName: string, centerPos: { lat: number; lng: number }, formattedAddress?: string) => {
      const kec = OKI_KECAMATAN_GEO.find(k => k.name === kecName);
      if (!kec) return;
      setInfoWindowState({
        kec,
        position: centerPos,
        formattedAddress
      });
    },
    []
  );

  const handleKecamatanSelect = (kec: KecamatanGeo) => {
    setActiveKecamatan(kec);
    mapActionRef.current?.focusKecamatanByGoogleMaps(kec);
    if (onSelectKecamatan) {
      onSelectKecamatan(kec.name);
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
              Peta Geospasial Google Maps — Kabupaten Ogan Komering Ilir
            </h4>
            <p className="text-[11px] text-slate-500">
              Menggunakan batas wilayah kecamatan resmi dari Google Maps Platform & layer kerapatan permohonan layanan
            </p>
          </div>
        </div>

        {/* Google Maps Layer Switcher */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2.5 py-1 rounded-md bg-emerald-600 text-white text-[11px] font-semibold shadow-xs">
            Google Maps Platform
          </span>

          {/* Sub-layers for Google Maps */}
          <select
            value={googleType}
            onChange={e => setGoogleType(e.target.value as GoogleMapType)}
            className="bg-white border border-slate-300 text-slate-700 text-[11px] font-medium rounded-lg px-2.5 py-1.5 focus:outline-none"
          >
            <option value="roadmap">Google Roadmap (Batas Administrasi)</option>
            <option value="terrain">Terrain (Batas Wilayah & Kontur)</option>
            <option value="hybrid">Hibrida (Satelit + Batas Wilayah)</option>
            <option value="satellite">Citra Satelit Murni</option>
          </select>

          {/* Google Maps External Place Link */}
          <a
            href={
              activeKecamatan
                ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    `Kecamatan ${activeKecamatan.name}, Kabupaten Ogan Komering Ilir, Sumatera Selatan`
                  )}`
                : 'https://www.google.com/maps/place/Kabupaten+Ogan+Komering+Ilir,+Sumatera+Selatan/@-3.3068054,104.9174473,9.11z/data=!4m6!3m5!1s0x2e3c0d6d1a62ce07:0x3039d80b220d0e0!8m2!3d-3.4559744!4d105.2194808!16s%2Fm%2F0gg6c6n?entry=ttu'
            }
            target="_blank"
            rel="noopener noreferrer"
            title="Lihat Batas Wilayah Resmi di Google Maps"
            className="flex items-center gap-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors"
          >
            <ExternalLink className="w-3 h-3 text-slate-500" />
            <span className="hidden md:inline">
              {activeKecamatan ? `Batas Kec. ${activeKecamatan.name}` : 'Buka di Google Maps'}
            </span>
          </a>
        </div>
      </div>

      {/* HEATMAP & MARKER INTERACTIVE TOOLBAR */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
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
            <span>Zona Kerapatan {showHeatmap ? 'Aktif' : 'Non-Aktif'}</span>
          </button>

          <button
            onClick={() => setShowMarkers(!showMarkers)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              showMarkers
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 font-semibold'
                : 'bg-slate-100 text-slate-600 border border-slate-300'
            }`}
          >
            {showMarkers ? <Eye className="w-3.5 h-3.5 text-emerald-600" /> : <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
            <span>Penanda 18 Kecamatan</span>
          </button>

          <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200 text-[11px] text-slate-600">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
            <span>
              <strong>{heatmapPoints.length}</strong> titik sebaran ({records.length} berkas)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
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
              Pengaturan Radius Sebaran Termal:
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

      {/* Map Display & Canvas (Explicit height required per CF2) */}
      <div className="relative w-full h-[460px] rounded-xl overflow-hidden border border-slate-300 shadow-inner bg-slate-100">
        <APIProvider apiKey={GOOGLE_MAPS_API_KEY} libraries={['marker', 'places']} language="id" region="ID">
          <Map
            mapId="DEMO_MAP_ID"
            defaultCenter={{ lat: OKI_MAP_CENTER[0], lng: OKI_MAP_CENTER[1] }}
            defaultZoom={OKI_DEFAULT_ZOOM}
            mapTypeId={googleType}
            gestureHandling="cooperative"
            disableDefaultUI={true}
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            className="w-full h-full"
          >
            <OkiMapOverlays
              googleType={googleType}
              showHeatmap={showHeatmap}
              heatmapRadius={heatmapRadius}
              heatmapPoints={heatmapPoints}
              onPlaceViewportResolved={handlePlaceViewportResolved}
              mapActionRef={mapActionRef}
            />

            {/* Modern AdvancedMarker for each of the 18 Kecamatan */}
            {showMarkers &&
              OKI_KECAMATAN_GEO.map(kec => {
                const stats = statsByKecamatan[kec.name] || {
                  total: 0,
                  oss: 0,
                  sicantik: 0,
                  simbg: 0
                };
                const isSelected = selectedKecamatan === kec.name || activeKecamatan?.name === kec.name;

                return (
                  <AdvancedMarker
                    key={kec.id}
                    position={{ lat: kec.center[0], lng: kec.center[1] }}
                    title={`Kecamatan ${kec.name} (${stats.total} berkas) — Klik untuk fokus ke batas wilayah Google Maps`}
                    onClick={() => handleKecamatanSelect(kec)}
                  >
                    <div
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-semibold shadow-sm whitespace-nowrap transition-transform cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-700 text-white border-emerald-900 scale-110 ring-2 ring-emerald-300'
                          : 'bg-white/95 text-slate-800 border-slate-300 hover:scale-105'
                      }`}
                    >
                      <MapPin className={`w-2.5 h-2.5 ${isSelected ? 'text-emerald-200' : 'text-emerald-600'}`} />
                      <span>{kec.name}</span>
                      <span
                        className={`px-1 py-0.2 rounded text-[9px] font-bold ${
                          isSelected
                            ? 'bg-white text-emerald-800'
                            : 'bg-emerald-600 text-white'
                        }`}
                      >
                        {stats.total}
                      </span>
                    </div>
                  </AdvancedMarker>
                );
              })}

            {/* InfoWindow when a Kecamatan is clicked */}
            {infoWindowState && (
              <InfoWindow
                position={infoWindowState.position}
                onCloseClick={() => setInfoWindowState(null)}
              >
                <div className="min-w-[205px] p-1 text-slate-800">
                  <div className="font-bold text-slate-900 text-xs">
                    Kecamatan {infoWindowState.kec.name}
                  </div>
                  <div className="text-[10px] text-slate-500 mb-1.5">
                    {infoWindowState.formattedAddress || `Ibu kota: ${infoWindowState.kec.capital}, Kab. OKI`}
                  </div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span>Total Pelayanan:</span>
                    <strong className="text-emerald-700">
                      {statsByKecamatan[infoWindowState.kec.name]?.total || 0} berkas
                    </strong>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-600 gap-2">
                    <span>OSS: {statsByKecamatan[infoWindowState.kec.name]?.oss || 0}</span>
                    <span>SICANTIK: {statsByKecamatan[infoWindowState.kec.name]?.sicantik || 0}</span>
                    <span>SIMBG: {statsByKecamatan[infoWindowState.kec.name]?.simbg || 0}</span>
                  </div>
                  <div className="mt-1.5 pt-1 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500">
                    <span>Luas: {infoWindowState.kec.areaKm2} km²</span>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        `Kecamatan ${infoWindowState.kec.name}, Kabupaten Ogan Komering Ilir, Sumatera Selatan`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-700 hover:underline font-semibold flex items-center gap-0.5"
                    >
                      <span>Batas Google Maps</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                </div>
              </InfoWindow>
            )}
          </Map>
        </APIProvider>

        {/* Custom Zoom & Reset Controls */}
        <div className="absolute top-3 right-3 z-20 flex flex-col gap-1.5 bg-white rounded-lg shadow-md border border-slate-200 p-1">
          <button
            onClick={() => mapActionRef.current?.zoomIn()}
            title="Perbesar Peta"
            className="p-1.5 hover:bg-slate-100 text-slate-700 rounded transition-colors"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => mapActionRef.current?.zoomOut()}
            title="Perkecil Peta"
            className="p-1.5 hover:bg-slate-100 text-slate-700 rounded transition-colors"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <div className="h-[1px] bg-slate-200 my-0.5" />
          <button
            onClick={() => {
              setActiveKecamatan(null);
              setInfoWindowState(null);
              mapActionRef.current?.resetCenter();
              if (onSelectKecamatan) {
                onSelectKecamatan('SEMUA');
              }
            }}
            title="Pusatkan ke Kabupaten OKI"
            className="p-1.5 hover:bg-slate-100 text-emerald-700 rounded transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Legend Overlay at Bottom-Left */}
        <div className="absolute bottom-3 left-3 z-20 bg-white/95 backdrop-blur-xs p-3 rounded-xl shadow-lg border border-slate-200 text-[10px] text-slate-700 space-y-2 max-w-[240px]">
          {showHeatmap && (
            <div>
              <div className="font-bold text-slate-900 flex items-center justify-between mb-1.5">
                <span className="flex items-center gap-1 text-rose-700 font-bold">
                  <Flame className="w-3.5 h-3.5" />
                  Kerapatan Pelayanan
                </span>
                <span className="text-[9px] bg-rose-100 text-rose-800 px-1.5 py-0.2 rounded font-semibold">
                  Density
                </span>
              </div>
              <div className="h-3 w-full rounded-md bg-gradient-to-r from-emerald-400 via-yellow-400 via-orange-500 to-rose-600 shadow-xs border border-slate-300 mb-1"></div>
              <div className="flex justify-between text-[9px] text-slate-600 font-medium">
                <span>Rendah</span>
                <span>Sedang</span>
                <span>Padat / Tinggi</span>
              </div>
            </div>
          )}

          <div className="pt-1 border-t border-slate-200 text-[9px] text-slate-600 leading-tight">
            Batas wilayah menggunakan peta administrasi resmi <strong>Google Maps</strong>. Klik salah satu kecamatan untuk menyesuaikan cakupan wilayah (<em>viewport</em>).
          </div>
        </div>

        {/* Active Kecamatan Quick Card (Click Detail) at Bottom-Right */}
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
            Daftar 18 Kecamatan Kabupaten Ogan Komering Ilir (Klik untuk fokus ke batas wilayah Google Maps)
          </span>
          <span className="text-[11px] text-slate-500">
            Terpusat di Kayu Agung (-3.4559744, 105.2194808)
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1.5 text-xs">
          {OKI_KECAMATAN_GEO.map(k => {
            const stats = statsByKecamatan[k.name] || { total: 0 };
            const isSelected = selectedKecamatan === k.name || activeKecamatan?.name === k.name;
            return (
              <button
                key={k.id}
                onClick={() => handleKecamatanSelect(k)}
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
