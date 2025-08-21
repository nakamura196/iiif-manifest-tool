'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/leaflet/marker-icon-2x.png',
  iconUrl: '/leaflet/marker-icon.png',
  shadowUrl: '/leaflet/marker-shadow.png',
});

interface ItemLocationMapProps {
  latitude: number;
  longitude: number;
  label?: string;
  onChange?: (lat: number, lng: number) => void;
}

export default function ItemLocationMap({ latitude, longitude, label, onChange }: ItemLocationMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize map
    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current).setView([latitude, longitude], 13);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(mapRef.current);

      // Add marker
      markerRef.current = L.marker([latitude, longitude], {
        draggable: !!onChange,
      }).addTo(mapRef.current);

      if (label) {
        markerRef.current.bindPopup(label).openPopup();
      }

      // Handle marker drag
      if (onChange && markerRef.current) {
        markerRef.current.on('dragend', (e) => {
          const marker = e.target;
          const position = marker.getLatLng();
          onChange(position.lat, position.lng);
        });
      }

      // Handle map click to move marker
      if (onChange) {
        mapRef.current.on('click', (e) => {
          const { lat, lng } = e.latlng;
          if (markerRef.current) {
            markerRef.current.setLatLng([lat, lng]);
            onChange(lat, lng);
          }
        });
      }
    } else {
      // Update existing map
      mapRef.current.setView([latitude, longitude], mapRef.current.getZoom());
      if (markerRef.current) {
        markerRef.current.setLatLng([latitude, longitude]);
        if (label) {
          markerRef.current.bindPopup(label);
        }
      }
    }

    return () => {
      // Don't destroy the map on every render
    };
  }, [latitude, longitude, label, onChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, []);

  return (
    <div className="relative h-full w-full">
      <div ref={mapContainerRef} className="h-full w-full" />
      {onChange && (
        <div className="absolute bottom-4 left-4 bg-white dark:bg-gray-800 px-3 py-2 rounded-lg shadow-lg text-sm z-[1000]">
          <p className="text-gray-600 dark:text-gray-400">
            地図をクリックまたはマーカーをドラッグして位置を変更
          </p>
        </div>
      )}
    </div>
  );
}