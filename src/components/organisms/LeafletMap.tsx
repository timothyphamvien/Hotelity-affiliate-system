import React, { useEffect, useRef, useState } from 'react';
import { Property, Room } from '@/src/types';

interface LeafletMapProps {
  properties: Property[];
  rooms: Room[];
}

export const LeafletMap: React.FC<LeafletMapProps> = ({ properties, rooms }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [libLoaded, setLibLoaded] = useState(false);

  useEffect(() => {
    // Check if leaflet is already loaded in window
    if ((window as any).L) {
      setLibLoaded(true);
      return;
    }

    // Load Leaflet CSS from CDN
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    link.crossOrigin = '';
    document.head.appendChild(link);

    // Load Leaflet JS from CDN
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.crossOrigin = '';
    script.onload = () => {
      setLibLoaded(true);
    };
    document.head.appendChild(script);

    return () => {
      // Cleanup links or scripts is not strictly necessary and sometimes counter-productive
    };
  }, []);

  useEffect(() => {
    if (!libLoaded || !mapContainerRef.current) return;

    const L = (window as any).L;
    if (!L) return;

    // Destroy existing map instance to avoid container issues on re-renders
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    // Center coordinates: Da Lat (Vietnam) or first available with location
    const validPins = properties.filter(p => p.latitude && p.longitude);
    const centerLat = validPins.length > 0 ? Number(validPins[0].latitude) : 11.9404;
    const centerLng = validPins.length > 0 ? Number(validPins[0].longitude) : 108.4418;

    const map = L.map(mapContainerRef.current).setView([centerLat, centerLng], 12);
    mapRef.current = map;

    // Load OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Clear old markers from state
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Pin each property with custom popup
    properties.forEach(prop => {
      const lat = Number(prop.latitude);
      const lng = Number(prop.longitude);
      if (isNaN(lat) || isNaN(lng) || !lat || !lng) return;

      const propRooms = rooms.filter(r => r.propertyId === prop.id);
      const roomsInfo = propRooms.map(r => 
        `<div style="margin-top: 4px; padding-top: 4px; border-top: 1px solid #f1f5f9; font-size: 11px;">
          <b>🏠 ${r.name}</b><br/>
          <span style="color: #4f46e5; font-weight: 700;">CTV: ${Number(r.ctvPrice).toLocaleString('vi-VN')} đ</span> | 
          <span style="color: #059669; font-weight: 700;">Khách: ${Number(r.clientPrice).toLocaleString('vi-VN')} đ</span>
         </div>`
      ).join('');

      const popupContent = `
        <div style="font-family: inherit; font-size: 12px; min-width: 190px; color: #1e293b;">
          <h4 style="margin: 0 0 2px 0; font-weight: 850; color: #4f46e5; font-size: 13px;">${prop.name}</h4>
          <span style="display:inline-block; font-size:9px; background:#e0e7ff; color:#4338ca; padding:1px 6px; border-radius:4px; font-weight:700; text-transform:uppercase; margin-bottom:4px;">${prop.type}</span>
          <p style="margin: 0; color: #64748b; font-size: 11px;">📍 ${prop.location}</p>
          <div style="margin-top: 6px;">
            ${roomsInfo || '<span style="color: #94a3b8; font-size: 11px;"><i>Chưa thiết kế phòng chi tiết</i></span>'}
          </div>
        </div>
      `;

      const marker = L.marker([lat, lng]).addTo(map).bindPopup(popupContent);
      markersRef.current.push(marker);
    });

    // Fit map bounds to encompass all pins
    if (validPins.length > 1) {
      const bounds = validPins.map(p => [Number(p.latitude), Number(p.longitude)]);
      map.fitBounds(bounds, { padding: [50, 50] });
    }

  }, [libLoaded, properties, rooms]);

  return (
    <div className="relative bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden shadow-xs h-[350px] w-full" id="property-leaflet-map">
      {!libLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100/60 backdrop-blur-xs z-10">
          <div className="flex flex-col items-center space-y-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className="text-xs font-bold text-slate-500 font-mono">Đang tải bản đồ vệ tinh...</p>
          </div>
        </div>
      )}
      <div ref={mapContainerRef} className="h-full w-full" style={{ zIndex: 1 }} />
    </div>
  );
};
