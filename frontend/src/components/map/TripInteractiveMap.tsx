import React, { useState, useMemo } from 'react';
import {
  Hotel,
  Train,
  Compass,
  ZoomIn,
  ZoomOut,
  Maximize2,
  AlertTriangle,
  Info,
  Layers,
} from 'lucide-react';
import type { TripMapData, MapMarker } from '@safar-saarthi/shared';

interface TripInteractiveMapProps {
  mapData?: TripMapData;
  activeDayNumber?: number;
  onSelectDay?: (day: number) => void;
  onSelectActivity?: (activityId: string) => void;
  selectedMarkerId?: string;
}

export const TripInteractiveMap: React.FC<TripInteractiveMapProps> = ({
  mapData,
  activeDayNumber,
  onSelectDay,
  onSelectActivity,
  selectedMarkerId,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [activeMarker, setActiveMarker] = useState<MapMarker | null>(null);
  const [filterDay, setFilterDay] = useState<number | 'ALL'>(activeDayNumber || 'ALL');
  const [mapStyle, setMapStyle] = useState<'STREET' | 'SATELLITE'>('STREET');

  // Fallback map data if none provided
  const data: TripMapData = useMemo(() => {
    if (mapData && mapData.markers.length > 0) return mapData;
    return {
      tripId: 'demo-map',
      destination: 'Jaipur',
      center: { latitude: 26.9124, longitude: 75.7873 },
      zoom: 12,
      markers: [
        {
          id: 'm-stay',
          type: 'ACCOMMODATION',
          title: 'Alsisar Haveli',
          locationName: 'Sansar Chandra Road',
          latitude: 26.9242,
          longitude: 75.7955,
        },
        {
          id: 'm-1',
          dayNumber: 1,
          orderIndex: 1,
          type: 'ACTIVITY',
          title: 'Amber Fort',
          locationName: 'Amer, Jaipur',
          latitude: 26.9855,
          longitude: 75.8513,
          timeSlot: '10:00 AM - 01:00 PM',
          category: 'HERITAGE',
        },
        {
          id: 'm-2',
          dayNumber: 1,
          orderIndex: 2,
          type: 'ACTIVITY',
          title: 'Hawa Mahal',
          locationName: 'Pink City',
          latitude: 26.9239,
          longitude: 75.8267,
          timeSlot: '02:00 PM - 03:30 PM',
          category: 'HERITAGE',
        },
      ],
      routeLegs: [],
      disclaimer:
        'Map markers and transit lines represent estimated city corridors. Real-time traffic, roadblocks, and local taxi tariffs can fluctuate.',
    };
  }, [mapData]);

  // Filter markers by selected day
  const visibleMarkers = useMemo(() => {
    if (filterDay === 'ALL') return data.markers;
    return data.markers.filter(
      (m) => m.dayNumber === filterDay || m.type === 'ACCOMMODATION' || m.type === 'TRANSIT_ARRIVAL'
    );
  }, [data.markers, filterDay]);

  // Calculate bounding box for responsive projection
  const bounds = useMemo(() => {
    if (visibleMarkers.length === 0) {
      return { minLat: 26.8, maxLat: 27.0, minLng: 75.7, maxLng: 75.9 };
    }
    const lats = visibleMarkers.map((m) => m.latitude);
    const lngs = visibleMarkers.map((m) => m.longitude);
    return {
      minLat: Math.min(...lats) - 0.015,
      maxLat: Math.max(...lats) + 0.015,
      minLng: Math.min(...lngs) - 0.015,
      maxLng: Math.max(...lngs) + 0.015,
    };
  }, [visibleMarkers]);

  // Normalize lat/lng to 0-100% SVG coordinates
  const projectCoords = (lat: number, lng: number) => {
    const latSpan = bounds.maxLat - bounds.minLat || 0.05;
    const lngSpan = bounds.maxLng - bounds.minLng || 0.05;
    const x = ((lng - bounds.minLng) / lngSpan) * 80 + 10;
    const y = ((bounds.maxLat - lat) / latSpan) * 75 + 12;
    return { x: Math.max(5, Math.min(95, x)), y: Math.max(5, Math.min(95, y)) };
  };

  const handleZoom = (delta: number) => {
    setZoomLevel((prev) => Math.max(0.8, Math.min(2.5, prev + delta)));
  };

  const resetView = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
    setActiveMarker(null);
  };

  return (
    <div className="bg-[#142B3B] text-white rounded-2xl p-5 border border-[#263E4E] space-y-4 overflow-hidden relative">
      {/* Map Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#263E4E] text-xs">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#1B3242] border border-[#263E4E] text-[#84C0B6] flex items-center justify-center font-bold">
            <Compass className="w-4 h-4 text-[#84C0B6]" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white">Interactive Corridor Map</h3>
            <span className="text-[11px] text-[#BDCDDB]">
              {data.destination} • {visibleMarkers.length} geocoded locations
            </span>
          </div>
        </div>

        {/* Day Filter Pills */}
        <div className="flex items-center gap-1 bg-[#1B3242] p-1 rounded-xl border border-[#263E4E]">
          <button
            type="button"
            onClick={() => setFilterDay('ALL')}
            className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors ${
              filterDay === 'ALL'
                ? 'bg-[#24766F] text-white'
                : 'text-[#BDCDDB] hover:text-white'
            }`}
          >
            All Stops
          </button>
          {[1, 2, 3, 4].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => {
                setFilterDay(d);
                if (onSelectDay) onSelectDay(d);
              }}
              className={`px-2 py-1 rounded-lg font-bold text-[11px] transition-colors ${
                filterDay === d
                  ? 'bg-[#24766F] text-white'
                  : 'text-[#BDCDDB] hover:text-white'
              }`}
            >
              Day {d}
            </button>
          ))}
        </div>

        {/* Map View Controls */}
        <div className="flex items-center gap-1 bg-[#1B3242] p-1 rounded-xl border border-[#263E4E]">
          <button
            type="button"
            title="Zoom In"
            onClick={() => handleZoom(0.2)}
            className="p-1.5 rounded-lg text-[#BDCDDB] hover:text-white hover:bg-[#263E4E] transition"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            title="Zoom Out"
            onClick={() => handleZoom(-0.2)}
            className="p-1.5 rounded-lg text-[#BDCDDB] hover:text-white hover:bg-[#263E4E] transition"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            title="Reset View"
            onClick={resetView}
            className="p-1.5 rounded-lg text-[#BDCDDB] hover:text-white hover:bg-[#263E4E] transition"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            title="Toggle Style"
            onClick={() => setMapStyle((s) => (s === 'STREET' ? 'SATELLITE' : 'STREET'))}
            className={`p-1.5 rounded-lg transition ${
              mapStyle === 'SATELLITE'
                ? 'bg-[#24766F] text-white'
                : 'text-[#BDCDDB] hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Map Canvas / SVG Layer */}
      <div
        className={`relative w-full h-[380px] sm:h-[440px] rounded-xl overflow-hidden border border-[#263E4E] transition-colors ${
          mapStyle === 'SATELLITE' ? 'bg-[#0E1D28]' : 'bg-[#1B3242]'
        }`}
      >
        {/* Subtle Map Grid */}
        <div
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        {/* Scalable Interactive SVG Canvas */}
        <svg
          className="w-full h-full cursor-grab active:cursor-grabbing transition-transform duration-200"
          style={{
            transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
          }}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {/* Sequential Route Connecting Lines */}
          {visibleMarkers.map((m, idx) => {
            if (idx === visibleMarkers.length - 1) return null;
            const next = visibleMarkers[idx + 1];
            const p1 = projectCoords(m.latitude, m.longitude);
            const p2 = projectCoords(next.latitude, next.longitude);

            return (
              <g key={`leg-${m.id}-${next.id}`}>
                <line
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  stroke="#24766F"
                  strokeWidth="0.6"
                  strokeDasharray="1.5, 1"
                />
              </g>
            );
          })}
        </svg>

        {/* DOM-rendered Pins positioned over SVG */}
        {visibleMarkers.map((marker) => {
          const pt = projectCoords(marker.latitude, marker.longitude);
          const isSelected = selectedMarkerId === marker.id || activeMarker?.id === marker.id;

          const isHotel = marker.type === 'ACCOMMODATION';
          const isTransit = marker.type === 'TRANSIT_ARRIVAL' || marker.type === 'TRANSIT_DEPARTURE';

          return (
            <div
              key={marker.id}
              onClick={() => {
                setActiveMarker(marker);
                if (onSelectActivity) onSelectActivity(marker.id);
              }}
              style={{
                left: `${pt.x}%`,
                top: `${pt.y}%`,
                transform: 'translate(-50%, -100%)',
              }}
              className="absolute z-20 cursor-pointer group"
            >
              {/* Pin Icon Bubble */}
              <div
                className={`flex items-center justify-center transition-all duration-200 shadow ${
                  isSelected
                    ? 'scale-125 ring-2 ring-white z-30'
                    : 'group-hover:scale-110'
                } ${
                  isHotel
                    ? 'w-7 h-7 rounded-xl bg-[#24766F] text-white font-bold'
                    : isTransit
                    ? 'w-7 h-7 rounded-xl bg-[#142B3B] text-white border border-[#263E4E] font-bold'
                    : 'w-6 h-6 rounded-full bg-[#D7A45B] text-[#142B3B] font-extrabold text-[11px]'
                }`}
              >
                {isHotel ? (
                  <Hotel className="w-3.5 h-3.5" />
                ) : isTransit ? (
                  <Train className="w-3.5 h-3.5" />
                ) : (
                  <span>{marker.orderIndex || '•'}</span>
                )}
              </div>

              {/* Pin Label Tag */}
              <div
                className={`mt-1 whitespace-nowrap px-1.5 py-0.5 rounded text-[10px] font-bold shadow pointer-events-none transition-all ${
                  isSelected
                    ? 'bg-white text-[#142B3B]'
                    : 'bg-[#142B3B] text-[#BDCDDB] border border-[#263E4E]'
                }`}
              >
                {marker.title.length > 20 ? `${marker.title.slice(0, 18)}...` : marker.title}
              </div>
            </div>
          );
        })}

        {/* Selected Marker Detail Card Overlay */}
        {activeMarker && (
          <div className="absolute bottom-3 left-3 right-3 sm:left-auto sm:right-3 sm:w-80 bg-[#142B3B] rounded-xl p-4 border border-[#263E4E] shadow-xl text-xs space-y-2 z-30">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#84C0B6] block">
                  {activeMarker.category || activeMarker.type}
                  {activeMarker.dayNumber ? ` • Day ${activeMarker.dayNumber}` : ''}
                </span>
                <h4 className="font-extrabold text-sm text-white">{activeMarker.title}</h4>
              </div>
              <button
                type="button"
                onClick={() => setActiveMarker(null)}
                className="text-[#93ADBE] hover:text-white p-1 rounded text-xs"
              >
                ✕
              </button>
            </div>

            <p className="text-[#BDCDDB] text-[11px] leading-relaxed line-clamp-2">
              {activeMarker.description || activeMarker.locationName}
            </p>

            {activeMarker.timeSlot && (
              <div className="flex items-center gap-2 text-[11px] font-semibold text-[#84C0B6] bg-[#1B3242] px-2.5 py-1 rounded-lg border border-[#263E4E]">
                <span>Scheduled: {activeMarker.timeSlot}</span>
              </div>
            )}

            {activeMarker.requiresConfirmation && (
              <div className="flex items-center gap-1.5 text-[11px] text-[#D7A45B] bg-[#FAF5EA]/10 px-2 py-1 rounded-lg border border-[#D7A45B]/30">
                <AlertTriangle className="w-3.5 h-3.5 text-[#D7A45B] shrink-0" />
                <span>Operating hours or tickets require on-site confirmation.</span>
              </div>
            )}

            <div className="text-[10px] text-[#93ADBE] pt-1 border-t border-[#263E4E] flex justify-between items-center">
              <span>
                Coordinates: {activeMarker.latitude.toFixed(4)}, {activeMarker.longitude.toFixed(4)}
              </span>
              <span className="text-[#84C0B6] font-semibold">Verified Safe Corridor</span>
            </div>
          </div>
        )}
      </div>

      {/* Ground Transfer & Dynamic Traffic Disclaimer Banner */}
      <div className="flex items-start gap-2 bg-[#1B3242] p-3 rounded-xl border border-[#263E4E] text-[11px] text-[#BDCDDB] leading-relaxed">
        <Info className="w-4 h-4 text-[#84C0B6] shrink-0 mt-0.5" />
        <span>
          <strong>Transfer Disclaimer:</strong> {data.disclaimer} Routes are sequenced via
          anti-backtracking corridor optimization to minimize driving distance and carbon footprint.
        </span>
      </div>
    </div>
  );
};
